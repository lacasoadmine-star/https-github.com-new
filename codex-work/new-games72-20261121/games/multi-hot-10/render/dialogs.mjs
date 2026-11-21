import { PAYLINES, quoteSymbolWin } from '../evaluator.mjs';
import { SYMBOL_FRAMES } from './renderer.mjs';

const el = (tag, className, text) => { const node = document.createElement(tag); node.className = className || ''; if (text !== undefined) node.textContent = text; return node; };
const button = (label, action, value) => { const node = el('button', '', label); node.type = 'button'; node.dataset.action = action; if (value !== undefined) node.dataset.value = value; return node; };
const amountText = minor => minor === null ? '—' : (minor / 100).toFixed(2);

export class MultiHot10Dialogs {
  constructor(container, atlas, onAction) {
    this.container = container; this.atlas = atlas; this.onAction = onAction;
    this.current = null; this.quickOpen = false; this.opener = null;
    this.click = event => {
      const target = event.target.closest('button[data-action]');
      if (target && !target.disabled) this.onAction(target.dataset.action, target.dataset.value);
    };
    this.key = event => {
      if (event.key === 'Escape') { event.preventDefault(); this.onAction('close'); }
      if (event.key !== 'Tab') return;
      const nodes = [...this.container.querySelectorAll('button:not(:disabled),input:not(:disabled)')];
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    container.addEventListener('click', this.click); container.addEventListener('keydown', this.key);
  }
  nativeButton(label, action, frame, value) {
    const node = button(label, action, value); node.style.backgroundImage = `url("${this.atlas.url(frame)}")`;
    return node;
  }
  show(state, { quick = false } = {}) {
    const name = quick ? 'quick' : state.modal;
    if (!name) { this.close(); return; }
    const same = this.current === name;
    const scroll = same ? this.container.querySelector('.m10-menu-content')?.scrollTop || 0 : 0;
    const focusAction = same ? document.activeElement?.dataset?.action : null;
    const focusValue = same ? document.activeElement?.dataset?.value : null;
    if (!same) this.opener = document.activeElement;
    this.current = name; this.container.hidden = false; this.container.replaceChildren();
    this.container.className = 'm10-dialog-layer m10-dialog-' + name;
    const modal = el('section', 'm10-dialog'); modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', name === 'quick' ? 'Quick Play' : name);
    this.container.append(modal);
    if (['rules', 'settings', 'history'].includes(name)) this.menu(modal, state);
    else if (name === 'bet') this.bets(modal, state);
    else if (name === 'auto') this.auto(modal, state);
    else this.quick(modal);
    const content = this.container.querySelector('.m10-menu-content'); if (content) content.scrollTop = scroll;
    const matching = [...this.container.querySelectorAll('button')].find(node =>
      node.dataset.action === focusAction && node.dataset.value === focusValue);
    (matching || this.container.querySelector('button'))?.focus({ preventScroll: true });
  }
  menu(modal, state) {
    const header = el('header', 'm10-menu-header');
    header.append(el('span', '', state.round ? 'Spin ID ' + state.round.roundId : 'Multi Hot 10'));
    const close = button('Close', 'close'); close.className = 'm10-close-menu'; close.setAttribute('aria-label', 'Close'); header.append(close); modal.append(header);
    const body = el('div', 'm10-menu-content'); modal.append(body);
    if (state.modal === 'rules') this.rules(body, state);
    else if (state.modal === 'settings') this.settings(body, state);
    else body.append(el('p', 'm10-history-message', 'History is unavailable.'));
    const tabs = el('nav', 'm10-menu-tabs'); tabs.setAttribute('aria-label', 'Game menu');
    for (const [name, label, symbol] of [['rules', 'Rules', '?'], ['settings', 'Settings', '⚙'], ['history', 'History', '↶']]) {
      const tab = button('', 'tab', name); tab.setAttribute('aria-label', label);
      tab.setAttribute('aria-pressed', String(state.modal === name));
      tab.append(el('span', 'm10-tab-icon', symbol));
      if (state.modal === name) tab.append(el('span', '', label));
      tabs.append(tab);
    }
    modal.append(tabs);
  }
  symbol(symbol, className = '') {
    const box = el('div', 'm10-rule-symbol ' + className);
    const image = el('img'); image.src = this.atlas.url(SYMBOL_FRAMES[symbol]); image.alt = symbol;
    box.append(image); return box;
  }
  rules(body, state) {
    const unit = state.currency; const bet = state.paytablePreviewBet;
    body.append(el('h2', 'm10-rules-heading', 'All Symbol wins are in ' + unit));
    const preview = el('div', 'm10-preview-bet');
    const index = state.paytablePreviewLevels.indexOf(bet);
    const minus = button('−', 'preview', state.paytablePreviewLevels[index - 1]); minus.disabled = index === 0; minus.setAttribute('aria-label', 'Decrease paytable preview');
    const plus = button('+', 'preview', state.paytablePreviewLevels[index + 1]); plus.disabled = index === state.paytablePreviewLevels.length - 1; plus.setAttribute('aria-label', 'Increase paytable preview');
    preview.append(minus, el('output', '', bet + ' ' + unit), plus); body.append(preview);
    const payout = symbol => {
      const table = el('table', 'm10-payout-table'); const rows = el('tbody');
      for (const count of [5, 4, 3]) {
        const row = el('tr'); row.append(el('th', '', String(count)), el('td', '', amountText(quoteSymbolWin({
          symbol, matchCount: count, totalBetMinor: Number(BigInt(bet.replace('.', ''))), multiplier: 1,
        }).base.exactMinor))); rows.append(row);
      }
      table.append(rows); return table;
    };
    const top = el('div', 'm10-top-payouts');
    for (const symbol of ['seven', 'bell', 'grapes', 'watermelon']) {
      const item = el('section', 'm10-payout-item'); item.append(this.symbol(symbol), payout(symbol)); top.append(item);
    }
    body.append(top);
    const low = el('section', 'm10-low-payout'); const group = el('div', 'm10-low-symbols');
    ['lemon', 'plum', 'orange', 'cherry'].forEach(symbol => group.append(this.symbol(symbol)));
    low.append(group, payout('lemon')); body.append(low);
    const text = (title, content) => { const section = el('section', 'm10-rules-section'); section.append(el('h3', '', title), el('p', '', content)); body.append(section); return section; };
    text('X MULTIPLIER', 'The multiplier shown with the reels multiplies a winning combination by 1, 2, 3, 4 or 5.');
    text('WIN OPTIONS', 'After a win, SPIN collects the win and starts another round. TAKE WIN collects it. X2 opens the red or black gamble choice. Automatic play credits wins automatically.');
    const gamble = text('X2 — GAMBLE', 'A correct color guess doubles the winnings. An incorrect guess loses them. TAKE WIN collects the remaining winnings.');
    const example = el('div', 'm10-gamble-help');
    for (const frame of ['Double/Red', 'Double/Card/Hidden', 'Double/Black']) {
      const image = el('img'); image.src = this.atlas.url(frame); image.alt = frame.split('/').at(-1); example.append(image);
    }
    gamble.append(example);
    text('CONTROLS', 'HOLD & SPIN starts a spin. AUTO opens automatic play choices. BET selects the stake. MENU opens Rules, Settings and History. SOUND controls sound. QUICK PLAY can be enabled from its confirmation panel.');
    text('OTHER RULES', 'Symbols pay left to right on adjacent reels, starting from the leftmost reel. The highest qualifying matching length on a winning line is paid.');
    const chart = el('div', 'm10-payline-chart');
    for (const line of PAYLINES) {
      const cell = el('div', 'm10-payline'); cell.append(el('span', '', String(line.id)));
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 120 72');
      for (let col = 0; col < 5; col++) for (let row = 0; row < 3; row++) {
        const rect = document.createElementNS(svg.namespaceURI, 'rect');
        rect.setAttribute('x', String(col * 24)); rect.setAttribute('y', String(row * 24));
        rect.setAttribute('width', '24'); rect.setAttribute('height', '24'); svg.append(rect);
      }
      const path = document.createElementNS(svg.namespaceURI, 'polyline');
      path.setAttribute('points', line.rows.map((row, reel) => `${reel * 24 + 12},${row * 24 + 12}`).join(' ')); svg.append(path); cell.append(svg); chart.append(cell);
    }
    body.append(chart);
    text('Game RTP Rules', 'Official demo: MIN BET 0.10 DMO • MAX BET 200.00 DMO • MAX X 1000 X • RTP 96.63% • Game Version v1.0.0');
    text('Disconnection', 'Accepted bets continue to their outcome if the connection is interrupted. Resulting wins are credited at the end of the round. Automatic play switches off after disconnection. The provider separately states that a malfunction voids plays and terminates unfinished rounds.');
  }
  settings(body, state) {
    const list = el('div', 'm10-settings-list');
    for (const [key, label] of [['effects', 'Sound Effects'], ['music', 'Background Music'], ['fullscreen', 'Full Screen']]) {
      const row = el('div', 'm10-setting-row'); row.append(el('label', '', label));
      const toggle = button('', 'setting', key); toggle.className = 'm10-switch';
      toggle.setAttribute('role', 'switch'); toggle.setAttribute('aria-label', label);
      toggle.setAttribute('aria-checked', String(state.settings[key])); row.append(toggle); list.append(row);
    }
    body.append(list);
  }
  bets(modal, state) {
    modal.style.backgroundImage = `url("${this.atlas.url('Bets/Popup')}")`;
    const list = el('div', 'm10-bet-choices');
    for (const value of state.betLevels) {
      const node = this.nativeButton(value + ' ' + state.currency, 'choose-bet', value === state.selectedBet ? 'Bets/ButtonActive' : 'Bets/Button', value);
      node.setAttribute('aria-label', 'Bet ' + value + ' ' + state.currency); list.append(node);
    }
    modal.append(list); const close = button('Close', 'close'); close.className = 'm10-bet-close'; modal.append(close);
  }
  auto(modal, state) {
    modal.style.backgroundImage = `url("${this.atlas.url('AutoPlay/Popup')}")`;
    const close = this.nativeButton('', 'close', 'AutoPlay/Close'); close.className = 'm10-native-close'; close.setAttribute('aria-label', 'Close autoplay'); modal.append(close);
    const choices = el('div', 'm10-auto-counts');
    for (const count of state.autoOptions.counts) {
      const node = this.nativeButton(String(count), 'auto-count', count === state.autoOptions.selectedCount ? 'AutoPlay/ButtonActive' : 'AutoPlay/Button', String(count));
      node.setAttribute('aria-pressed', String(count === state.autoOptions.selectedCount)); choices.append(node);
    }
    modal.append(choices, el('h3', '', 'STOP AUTOPLAY'));
    const options = el('div', 'm10-auto-thresholds');
    for (const label of ['If a win reaches or exceeds', 'If balance decreases', 'If balance increases']) {
      const row = el('label'); const check = el('input'); check.type = 'checkbox'; check.disabled = true;
      const amount = el('input'); amount.type = 'text'; amount.placeholder = state.currency; amount.disabled = true;
      row.append(check, el('span', '', label), amount); options.append(row);
    }
    modal.append(options); const start = this.nativeButton('START PLAY', 'auto-start', 'AutoPlay/Save'); start.className = 'm10-auto-start'; modal.append(start);
  }
  quick(modal) {
    modal.style.backgroundImage = `url("${this.atlas.url('QuickPlay/Popup')}")`;
    const close = this.nativeButton('', 'close', 'QuickPlay/Close'); close.className = 'm10-native-close'; close.setAttribute('aria-label', 'Close quick play');
    modal.append(close, el('h2', '', 'QUICK PLAY'), el('p', '', 'For faster play enable turbo mode.'), el('p', '', 'You can disable the feature from the game menu.'));
    const yes = this.nativeButton('ENABLE QUICK PLAY', 'quick-enable', 'QuickPlay/Confirm');
    const no = this.nativeButton('NO', 'close', 'QuickPlay/Cancel'); modal.append(yes, no);
  }
  close() {
    if (!this.current) return;
    this.current = null; this.container.hidden = true; this.container.replaceChildren();
    this.opener?.focus?.({ preventScroll: true }); this.opener = null;
  }
  dispose() { this.close(); this.container.removeEventListener('click', this.click); this.container.removeEventListener('keydown', this.key); }
}
