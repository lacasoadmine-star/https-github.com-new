window.addEventListener("message", function (event) {
    let message = event.data;
    if (message.name === 'jackpot-size') {
        let height = event.data.height;
        const counter = document.querySelector('iframe#jackpotCounter');
        if (counter) counter.style.height = typeof height === 'number' ? `${height}px` : height;
    } else if (message.name === 'prize-drop-jackpot-start') {
        for (let buttonIndex = 0; buttonIndex < player.bets.length; buttonIndex++) {
            if (hasClassSelector('#bet-' + buttonIndex, 'cancel-bet')) {
                PostCustomEvent(token, 'jetx.undo.bet', buttonIndex)
            }
        }
        if (typeof stopAllAutoplay === 'function') {
            stopAllAutoplay();
        } else {
            for (let autoBetIndex = 0; autoBetIndex < 4; autoBetIndex++) {
                setChecked('auto-bet-' + autoBetIndex, false);
            }
        }
        checkboxCheck();
    }
});

window.addEventListener('scroll', function () {
    promoPrizeIcon(true);
});

function isPromoTextInput(el) {
    if (!el || typeof el.matches !== 'function') return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName !== 'INPUT') return false;
    const type = (el.type || 'text').toLowerCase();
    return type === 'text' || type === 'number' || type === 'search' || type === 'tel'
        || type === 'email' || type === 'url' || type === 'password';
}

function isMobilePromoContext() {
    return (typeof mobile !== 'undefined' && mobile)
        || (typeof isMobileLikeViewport === 'function' && isMobileLikeViewport());
}

function isMobilePromoInputFocused() {
    return isMobilePromoContext() && isPromoTextInput(document.activeElement);
}

const promoHideChecks = [
    () => window.scrollY >= 2,
    () => document.querySelectorAll('.game-modal.is-open').length > 0,
    () => document.body.classList.contains('collect-modal-open')
        || document.querySelector('.collect-mobile-modal.is-open'),
    () => {
        const panel = document.querySelector('#menu-pop');
        return panel && panel.hidden === false;
    },
    () => document.querySelector('[data-multipliers-panel]')?.classList.contains('is-multipliers-expanded'),
    () => document.querySelector('[data-version-switch]')?.classList.contains('is-open'),
    () => isMobilePromoInputFocused(),
];

const promoIcons = {
    prizeDrop: {
        show() {
            window.parent.postMessage({ name: 'prize-drop-show-icon' }, '*');
        },
        hide() {
            window.parent.postMessage({ name: 'prize-drop-hide-icon' }, '*');
        },
    },
};

function shouldHidePromos() {
    return promoHideChecks.some((check) => {
        try {
            return Boolean(check());
        } catch (e) {
            return false;
        }
    });
}

function updatePromoIcons(forceHide = false) {
    const hide = forceHide || shouldHidePromos();
    Object.keys(promoIcons).forEach((key) => {
        const promo = promoIcons[key];
        if (hide) promo.hide();
        else promo.show();
    });
}

function promoPrizeIcon(show = false, timeout = 1) {
    setTimeout(function () {
        updatePromoIcons(!show);
    }, timeout + (show ? 50 : 0));
}

document.addEventListener('focusin', function (event) {
    if (!isMobilePromoContext() || !isPromoTextInput(event.target)) return;
    promoPrizeIcon();
});

document.addEventListener('focusout', function (event) {
    if (!isMobilePromoContext() || !isPromoTextInput(event.target)) return;
    promoPrizeIcon(true);
});
