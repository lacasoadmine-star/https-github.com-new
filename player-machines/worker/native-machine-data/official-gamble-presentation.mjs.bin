// Presentation only. Choices and money are supplied by the existing controller;
// this module never requests a wager, settles a receipt or draws an outcome.
import {decimal, money, units} from './contract.mjs';

const selectedGames = new Set(['multi_hot_5_video', 'hot_foxy_20']);
const packs = new Map();
const histories = new Map();
const instruction = 'Choose Red or Black gamble, or take the win!';

export function gambleAmounts(stake) {
  if (typeof stake !== 'string') return {amount: '—', toWin: '—'};
  try { return {amount: money(stake), toWin: decimal(units(stake) * 2n / 100n)}; }
  catch { return {amount: '—', toWin: '—'}; }
}

export function gambleCard(result) {
  if (!result || !['RED', 'BLACK'].includes(result.cardColor) ||
      !['RED', 'BLACK'].includes(result.choice) || typeof result.won !== 'boolean' ||
      result.won !== (result.choice === result.cardColor)) return null;
  // The receipt has a colour, not a suit. These original aces consistently
  // represent that colour; a second random card outcome is never generated.
  return result.cardColor === 'RED' ? 'red-card' : 'black-card';
}

function loadPack(id) {
  if (!packs.has(id)) packs.set(id, (id === 'hot_foxy_20'
    ? import('./official-foxy-gamble-assets.mjs')
    : import('./official-mh5-gamble-assets.mjs')).catch(error => {
      packs.delete(id); throw error;
    }));
  return packs.get(id);
}

function ensureStyles(doc) {
  if (doc.querySelector('link[data-official-gamble-css]')) return;
  const css = doc.createElement('link'); css.rel = 'stylesheet';
  css.href = new URL('./official-gamble.css', import.meta.url).href;
  css.dataset.officialGambleCss = ''; doc.head.append(css);
}

export function createOfficialGamblePresentation({gameId, document, audio, onCollect} = {}) {
  if (!selectedGames.has(gameId) || !document?.getElementById('gamble-dialog')) return null;
  return new OfficialGamblePresentation(gameId, document, audio, onCollect);
}

class OfficialGamblePresentation {
  constructor(gameId, document, audio, onCollect) {
    this.gameId = gameId; this.document = document; this.audio = audio; this.onCollect = onCollect;
    this.dialog = document.getElementById('gamble-dialog');
    this.abort = new AbortController(); this.version = 0; this.timer = 0; this.revealTimer = 0;
    this.revealing = false; this.disposed = false; this.opened = false;
    this.state = {}; this.lastReceipt = ''; this.history = histories.get(gameId) || [];
    // A queued close event can arrive after a fast reopen; it belongs to the
    // previous view and must not cancel the current receipt presentation.
    this.dialog.addEventListener('close', () => { if (!this.dialog.open) this.close(); }, {signal: this.abort.signal});
    this.dialog.addEventListener('click', event => {
      if (this.revealing && event.target.closest?.('[data-choice]')) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    }, {capture: true, signal: this.abort.signal});
    this.dialog.addEventListener('cancel', () => this.close(), {signal: this.abort.signal});
    document.defaultView?.addEventListener('resize', () => this.position(), {signal: this.abort.signal});
    void this.prepareControls();
  }

  async prepareControls() {
    const doc = this.document, collect = doc.getElementById('collect'), gamble = doc.getElementById('gamble');
    if (!collect || !gamble) return;
    try {
      const foxy = this.gameId === 'hot_foxy_20';
      const pack = await (foxy ? import('./official-foxy-art.mjs') : import('./official-mh5-collect-art.mjs'));
      if (this.disposed) return;
      const mapping = foxy ? {double:'Buttons/Double','double-hover':'Buttons/DoubleHover',take:'Buttons/DoubleTake','take-hover':'Buttons/DoubleTakeHover1'}
        : {take:'take','take-hover':'take-hover','take-disabled':'take-disabled'};
      for (const [name, key] of Object.entries(mapping)) if (pack.sprites[key])
        doc.body.style.setProperty('--gamble-cabinet-' + name, 'url("' + pack.sprites[key] + '")');
      collect.style.removeProperty('background-image');
      if (foxy) gamble.style.removeProperty('background-image');
      ensureStyles(doc); doc.body.dataset.nativeGambleControls = foxy ? 'foxy' : 'mh5';
    } catch { /* Existing accessible cabinet controls remain usable. */ }
  }

  async prepare() {
    if (this.stage || this.disposed) return !!this.stage;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const pack = await loadPack(this.gameId);
      if (this.disposed) return false;
      const doc = this.document;
      ensureStyles(doc);
      const make = (tag, className, text) => {
        const node = doc.createElement(tag); node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };
      const stage = make('div', 'native-gamble-stage');
      stage.setAttribute('aria-label', 'Red or black gamble');
      const previous = make('p', 'native-gamble-previous', 'Previous Cards');
      this.historyNode = make('div', 'native-gamble-history');
      this.historyNode.setAttribute('aria-label', 'Previous gamble colours');
      const counter = (className, label) => {
        const node = make('div', className);
        node.append(make('span', 'native-gamble-label', label));
        const value = make('strong', 'native-gamble-value'); node.append(value);
        stage.append(node); return value;
      };
      this.amountNode = counter('native-gamble-amount', 'GAMBLE AMOUNT');
      this.toWinNode = counter('native-gamble-to-win', 'GAMBLE TO WIN');
      this.card = make('img', 'native-gamble-card'); this.card.alt = 'Face-down card';
      this.card.draggable = false;
      const glows = make('div', 'native-gamble-glows'); glows.setAttribute('aria-hidden', 'true');
      for (const name of ['red', 'black', 'card-red', 'card-black']) glows.append(make('i', 'native-gamble-glow-' + name));
      this.red = doc.getElementById('red'); this.black = doc.getElementById('black');
      this.closeButton = this.dialog.querySelector('[data-close="gamble-dialog"]');
      this.closeButton.classList.add('native-gamble-close');
      this.take = make('button', 'native-gamble-take', 'TAKE WIN'); this.take.type = 'button';
      this.take.setAttribute('aria-label', 'Take win; close gamble. Winnings are already credited.');
      this.take.addEventListener('click', () => {
        if (this.state.busy) return;
        if (!this.state.savedChoice && !this.state.recover) this.onCollect?.();
        this.playSound('take'); this.dialog.close();
      }, {signal: this.abort.signal});
      this.closeButton.addEventListener('click', () => {
        if (!this.state.busy && !this.state.savedChoice && !this.state.recover) this.onCollect?.();
        this.playSound('take');
      }, {capture: true, signal: this.abort.signal});
      stage.append(previous, this.historyNode, glows, this.card, this.red, this.black,
        this.take, this.closeButton, make('p', 'native-gamble-instruction', instruction));
      this.dialog.prepend(stage);
      this.stage = stage; this.sprites = pack.sprites;
      for (const [name, src] of Object.entries(pack.sprites)) stage.style.setProperty('--gamble-' + name, 'url("' + src + '")');
      this.dialog.dataset.officialGamble = this.gameId === 'hot_foxy_20' ? 'foxy' : 'mh5';
      this.card.src = pack.sprites.hidden;
      this.renderHistory(); this.render(); this.position();
      return true;
    })().catch(() => { this.loading = null; return false; });
    return this.loading;
  }

  open(state = {}) {
    if (this.disposed) return;
    this.clearReveal(); this.opened = true; this.version++;
    this.state = {...state, error: false}; this.lastReceipt = '';
    void this.prepare().then(() => { if (this.opened && !this.disposed) { this.hideCard(); this.renderHistory(); this.render(); this.position(); } });
    void this.prepareAudio();
  }

  update(state = {}) {
    if (this.disposed) return;
    this.state = {...this.state, ...state}; this.render();
  }

  render() {
    if (!this.stage || this.disposed) return;
    const values = gambleAmounts(this.revealing ? this.revealStake : this.state.stake);
    this.amountNode.textContent = values.amount + (values.amount === '—' ? '' : ' ETB');
    this.toWinNode.textContent = values.toWin + (values.toWin === '—' ? '' : ' ETB');
    this.stage.dataset.phase = this.revealing ? 'revealed' : this.state.busy ? 'pending' : 'ready';
    this.stage.dataset.recover = String(!!this.state.savedChoice || !!this.state.recover);
    this.stage.dataset.error = String(!!this.state.error);
    this.take.disabled = !!this.state.busy || this.revealing;
    for (const button of [this.red, this.black]) button.setAttribute('aria-disabled', String(this.revealing || button.disabled));
  }

  pending(choice) {
    if (this.disposed) return false;
    this.clearReveal(); this.hideCard(); this.state.busy = true; this.state.error = false; this.render();
    this.playSound(choice === 'RED' ? 'red' : 'black');
    return true;
  }

  outcome(result, {canGamble} = {}) {
    const card = gambleCard(result);
    if (this.disposed || !card) return false;
    const key = result.roundId + ':' + result.attempt;
    if (key === this.lastReceipt) return true;
    this.lastReceipt = key; this.clearReveal();
    this.state = {...this.state, stake: result.payout, attempt: result.attempt,
      maxAttempts: result.maxAttempts, savedChoice: null, recover: false, busy: false, error: false};
    const version = this.version;
    this.revealing = true; this.revealStake = result.stake;
    const revealDelay = this.gameId === 'multi_hot_5_video' ? 850 : 0;
    const hold = this.gameId === 'multi_hot_5_video' ? 1684 : 2000;
    this.render();
    this.revealTimer = setTimeout(() => {
      if (this.disposed || !this.opened || version !== this.version) return;
      void this.prepare().then(ready => {
        if (!ready || this.disposed || !this.opened || version !== this.version) return;
        this.card.src = this.sprites[card]; this.card.alt = result.cardColor + ' card colour';
        this.stage.dataset.result = result.won ? 'win' : 'lose'; this.render();
        this.playSound(result.won ? 'win' : 'lose');
      });
    }, revealDelay);
    this.history.unshift(result.cardColor); this.history = this.history.slice(0, 5);
    histories.set(this.gameId, this.history);
    this.timer = setTimeout(() => {
      if (this.disposed || version !== this.version || !this.opened) return;
      this.clearReveal(); this.hideCard(); this.renderHistory(); this.render();
      if (!result.won || result.attempt >= result.maxAttempts || canGamble === false) {
        if (result.won) this.onCollect?.();
        this.dialog.close();
      }
    }, revealDelay + hold);
    return true;
  }

  hideCard() {
    if (!this.card) return;
    this.card.src = this.sprites.hidden; this.card.alt = 'Face-down card';
    delete this.stage.dataset.result;
  }

  renderHistory() {
    if (!this.historyNode) return;
    this.historyNode.replaceChildren();
    for (const colour of this.history) {
      const card = this.document.createElement('img');
      card.src = this.sprites[colour === 'RED' ? 'red-card' : 'black-card'];
      card.alt = colour; card.draggable = false; this.historyNode.append(card);
    }
  }

  position() {
    if (!this.stage) return;
    const machine = this.document.getElementById('machine')?.getBoundingClientRect();
    if (!machine?.width) return;
    const view = this.document.defaultView, foxy = this.gameId === 'hot_foxy_20';
    const width = Math.min(machine.width * (foxy ? .9 : .882), (view.innerHeight - 96) * (foxy ? 511 / 864 : 499 / 857));
    const height = width * (foxy ? 864 / 511 : 857 / 499);
    this.dialog.style.width = width + 'px';
    this.dialog.style.left = machine.left + (machine.width - width) / 2 + 'px';
    this.dialog.style.top = Math.max(12, Math.min(machine.top + machine.height * (foxy ? .06 : .097), view.innerHeight - height - 60)) + 'px';
  }
  clearReveal() { clearTimeout(this.timer); clearTimeout(this.revealTimer); this.timer = 0; this.revealTimer = 0; this.revealing = false; }
  error() { this.clearReveal(); this.state.busy = false; this.state.error = true; this.hideCard(); this.render(); }
  close() { this.version++; this.opened = false; this.clearReveal(); this.sound?.stop(); }
  async prepareAudio() {
    if (this.sound || !this.audio || this.disposed) return;
    try {
      const {createGambleAudio} = await import('./official-gamble-audio.mjs');
      if (!this.disposed && !this.sound) this.sound = createGambleAudio(this.gameId, this.audio);
      if (this.opened) await this.sound?.prepare();
    } catch { /* Native gambling remains usable if optional audio fails. */ }
  }
  playSound(name) { void this.sound?.play(name); }
  dispose() { this.disposed = true; this.close(); this.abort.abort(); this.sound?.dispose(); }
}
