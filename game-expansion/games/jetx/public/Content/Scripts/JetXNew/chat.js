// Chat START
const CHAT = {
    messages: '.chat-messages',
    input: '#chat-message',
    send: '#send-chat',
    active: 'active',
    visualActive: 'chat-input-send-active',
    timer: 'timer',
    cooldown: 60,
    maxMessages: 200,
};

let chatVersion = 0;
let reloadVersion = 0;
let chatRequestPending = false;
let chatPollTimer = null;
let chatPendingOwnScroll = false;

const chatEl = (selector) => document.querySelector(selector);
const chatInput = () => chatEl(CHAT.input);
const chatSendButton = () => chatEl(CHAT.send);
const chatText = () => (chatInput() ? chatInput().value : '');
const chatPopup = () => document.getElementById('popup-chat');
const chatIsOpen = () => {
    const popup = chatPopup();
    return !!popup && !popup.hidden && popup.getAttribute('aria-hidden') !== 'true';
};
const chatEscape = (value) => String(value || '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
}[ch]));

window.addEventListener('load', function () {
    const input = chatInput();

    document.addEventListener(clickEvent, function (event) {
        if (!event.target.closest(CHAT.send) || !chatCanSend()) return;
        SendChatMessage();
        chatSetActive(false);
    });

    if (!input) return;

    input.addEventListener('input', chatSyncActive);
    input.addEventListener('keyup', function (event) {
        chatSyncActive();
        if (event.which !== 13 && event.key !== 'Enter') return;

        event.preventDefault();
        if (!chatCanSend()) return false;

        SendChatMessage();
        chatSetActive(false);
        return false;
    });
});

function chatSetActive(active) {
    const button = chatSendButton();
    if (!button) return;

    button.classList.toggle(CHAT.active, active);
    button.classList.toggle(CHAT.visualActive, active);
}

function chatSyncActive() {
    chatSetActive(chatText() !== '');
}

function chatCanSend() {
    const button = chatSendButton();
    return !!button && button.classList.contains(CHAT.active) && !button.classList.contains(CHAT.timer);
}

function chatIsOwnMessage(name) {
    return isCurrentClientName(name);
}

function chatMessageHtml(message) {
    const isOwn = chatIsOwnMessage(message.name);
    return `
        <article class="chat-message${isOwn ? ' chat-message--own' : ''}">
          <span class="chat-avatar avatar avatar-${getAvatar(message.name, isOwn)}"></span>
          <div class="chat-message__bubble">
            <div class="chat-message__meta">
              <span class="chat-message__name">${chatEscape(formatClientName(message.name || '', isOwn))}</span>
              <span class="chat-message__time">${chatEscape(changeTime(message.time || '', 'timeFull'))}</span>
            </div>
            <p class="chat-message__text">${chatEscape(message.text)}</p>
          </div>
        </article>`;
}

function chatScrollToBottom() {
    const container = chatEl(CHAT.messages);
    if (!container) return;
    container.scrollTop = container.scrollHeight;
}

function chatTrimMessages(container, shouldScroll) {
    const max = CHAT.maxMessages;
    if (!container || !max || container.children.length <= max) return;

    const prevHeight = container.scrollHeight;
    const prevTop = container.scrollTop;
    while (container.children.length > max) {
        container.removeChild(container.firstElementChild);
    }
    if (shouldScroll) {
        container.scrollTop = container.scrollHeight;
    } else {
        container.scrollTop = Math.max(0, prevTop - (prevHeight - container.scrollHeight));
    }
}

function chatAppend(messages, forceScroll = false) {
    const container = chatEl(CHAT.messages);
    if (!container || !Array.isArray(messages) || !messages.length) return;

    const shouldScroll = forceScroll || container.scrollTop + container.clientHeight + 10 >= container.scrollHeight;
    container.insertAdjacentHTML('beforeend', messages.map(chatMessageHtml).join(''));
    chatTrimMessages(container, shouldScroll);
    if (shouldScroll) container.scrollTop = container.scrollHeight;
}

function chatClear() {
    const container = chatEl(CHAT.messages);
    if (container) container.textContent = '';
}

async function chatRequest(url, options) {
    const response = await fetch(url, Object.assign({ credentials: 'same-origin' }, options));
    const responseText = await response.text();
    let body = responseText;

    try {
        body = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
    }

    if (!response.ok) {
        throw {
            status: response.status,
            statusText: response.statusText,
            responseJSON: body && typeof body === 'object' ? body : null,
            responseText: responseText,
        };
    }

    return body;
}

function chatRequestFail(error) {
    const jqXHR = typeof error.status === 'number'
        ? error
        : { status: 0, statusText: 'error', responseJSON: null, responseText: '' };

    //OnMessageRequestFail(jqXHR, jqXHR.statusText || 'error', error, null);
}

function loadChat(ClientChatKey) {
    if (IsJetXNewChatEnabled && ClientChatKey) {
        window.parent.postMessage({ name: 'chat-load', key: ClientChatKey }, '*');
    }
}

if (IsJetXNewChatEnabled) {
    window.addEventListener('message', function (event) {
        const message = event.data;
        if (!message) return;

        if (message.name === 'chat-receive-message') {
            AddChatMessages([message.data]);
        } else if (message.name === 'chat-receive-messages') {
            AddChatMessages(message.data, true);
        }
    });
} else if (!visualConfig.disableChat) {
    chatSchedulePolling(0);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) chatSchedulePolling(0);
    });
    document.addEventListener('click', (event) => {
        if (event.target.closest('[data-popup-open="chat"]')) {
            mixpanelFirstUsage('firstChatTime');
            chatSchedulePolling(0);
        }
    });
}

if (!visualConfig.disableChat) {
    document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-popup-open="chat"]')) return;
        mixpanelFirstUsage('firstChatTime');
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(chatScrollToBottom);
        });
    });
}

function LoadChatMessages() {
    if (chatRequestPending || document.hidden) return Promise.resolve();
    chatRequestPending = true;

    const url = `${urlHolder.Chat.MessagesUrl}/${token}?currentVersion=${chatVersion}&reloadVersion=${reloadVersion}`;
    return chatRequest(url)
        .then((data) => {
            HideInternetLost();
            AddChatMessages(data);
        })
        .catch(chatRequestFail)
        .then(() => {
            chatRequestPending = false;
        });
}

function chatPollingDelay() {
    if (document.hidden) return 15000;
    return chatIsOpen() ? 1000 : 5000;
}

function chatSchedulePolling(delay = chatPollingDelay()) {
    if (chatPollTimer !== null) {
        clearTimeout(chatPollTimer);
    }

    chatPollTimer = setTimeout(() => {
        LoadChatMessages().then(() => {
            chatSchedulePolling();
        });
    }, delay);
}

function AddChatMessages(data, reload = false) {
    if (IsJetXNewChatEnabled) {
        if (reload) chatClear();
        const messages = (Array.isArray(data) ? data : []).map((message) => ({
            name: message.senderName,
            time: message.sendTime,
            text: message.message,
        }));
        const forceScroll = reload || chatPendingOwnScroll;
        chatAppend(messages, forceScroll);
        if (messages.length && forceScroll) chatPendingOwnScroll = false;
        return;
    }

    if (!Array.isArray(data)) return;

    const newVersion = data[0];
    const messages = Array.isArray(data[1]) ? data[1] : [];
    const newReloadVersion = data[2];
    const didReload = newReloadVersion !== reloadVersion;

    if (didReload) chatClear();

    const forceScroll = chatPendingOwnScroll || didReload || (typeof mobile !== 'undefined' && mobile);
    chatAppend(messages.map((message) => ({
        name: message.SenderName,
        time: message.SendTimeParsed,
        text: message.Message,
    })), forceScroll);
    if (messages.length && (chatPendingOwnScroll || didReload)) chatPendingOwnScroll = false;

    chatVersion = newVersion;
    reloadVersion = newReloadVersion;
}

function SendChatMessage() {
    const message = chatText();
    if (message === '') return false;

    if (IsJetXNewChatEnabled) {
        window.parent.postMessage({ name: 'chat-send', message: message }, '*');
        chatTimeSet();
    } else {
        chatRequest(`${urlHolder.Chat.SendMessageUrl}/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: new URLSearchParams(new ChatMessage(message)).toString(),
        }).then(chatTimeSet).catch(chatRequestFail);
    }

    if (chatInput()) chatInput().value = '';
    chatSetActive(false);
    chatPendingOwnScroll = true;
    chatScrollToBottom();
    return true;
}

function ChatMessage(message) {
    this.Message = message;
}

function chatTimeSet() {
    if (!localStorageAllow || !player.displayName) return false;
    localStorage.setItem(`jetxnew-chat-time-${player.displayName}`, Date.now());
    return true;
}

function chatTimeGet() {
    if (!localStorageAllow || !player.displayName) return CHAT.cooldown;

    let raw = localStorage.getItem(`jetxnew-chat-time-${player.displayName}`);
    if (raw === null) {
        raw = localStorage.getItem(`chat-time-${player.displayName}`);
        if (raw !== null) {
            localStorage.setItem(`jetxnew-chat-time-${player.displayName}`, raw);
        }
    }
    const time = parseInt(raw, 10);
    return Number.isFinite(time) ? parseInt((Date.now() - time) / 1000, 10) : CHAT.cooldown;
}

function chatTimerTimer() {
    if (document.hidden) return;

    const button = chatSendButton();
    if (!button) return;

    let left = chatTimeGet();
    button.classList.remove(CHAT.timer);
    button.parentElement.classList.toggle('disabled', left < CHAT.cooldown);

    if (left >= CHAT.cooldown) return;

    left = Math.max(CHAT.cooldown - left, 0);
    const time = left === CHAT.cooldown ? '01:00' : `00:${left < 10 ? '0' : ''}${left}`;

    const timerText = button.querySelector('span');
    if (timerText && timerText.textContent !== time) {
        timerText.textContent = time;
    }
    button.classList.add(CHAT.timer);
}

setInterval(chatTimerTimer, 1000);

// Chat END


window.parent.postMessage({name: "chat"}, "*");