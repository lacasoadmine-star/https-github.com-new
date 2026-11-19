// Presentation only. Choices and money are supplied by the existing controller;
// this module never requests a wager, settles a receipt or draws an outcome.
import {decimal, money, units} from './contract.mjs';
import {habeshaGambleLayouts,habeshaGambleBounds,HabeshaGambleClock} from './habesha-gamble-layout.mjs';

const selectedGames = new Set(['habesha_fortune_5_native']);
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
  if (!packs.has(id)) packs.set(id, import('./habesha-gamble-assets.mjs').catch(error => {
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
    this.cardKey='hidden';
    {
      this.presentationClock=new HabeshaGambleClock();this.focused=document.hasFocus?.()??true;this.pageActive=true;
      const options={signal:this.abort.signal},view=document.defaultView;
      view?.addEventListener('blur',()=>{this.focused=false;this.syncPresentation();},options);
      view?.addEventListener('focus',()=>{this.focused=true;this.syncPresentation();},options);
      view?.addEventListener('pagehide',()=>{this.pageActive=false;this.syncPresentation();},options);
      view?.addEventListener('pageshow',()=>{this.pageActive=true;this.focused=document.hasFocus?.()??true;this.syncPresentation();},options);
      document.addEventListener('visibilitychange',()=>this.syncPresentation(),options);
      this.syncPresentation();
    }
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
    const doc = this.document;
    if (!doc.getElementById('collect') || !doc.getElementById('gamble')) return;
    // Cabinet buttons already come from this game's original renderer pack.
    ensureStyles(doc);
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
        if (this.state.busy || this.revealing || !this.dialog.open) return;
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
      this.stage = stage; this.sprites = pack.sprites;this.pack=pack;
      for (const [name, src] of Object.entries(pack.sprites)) stage.style.setProperty('--gamble-' + name, 'url("' + src + '")');
      this.dialog.dataset.officialGamble = 'habesha';
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
    this.audio?.stop('win');this.syncPresentation();
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
    const revealDelay = 0;
    const hold = 2000;
    this.render();
    this.scheduleReveal('reveal',() => {
      if (this.disposed || !this.opened || version !== this.version) return;
      void this.prepare().then(ready => {
        if (!ready || this.disposed || !this.opened || !this.revealing || version !== this.version) return;
        const reveal=()=>{
          if(this.disposed||!this.opened||!this.revealing||version!==this.version)return;
          this.cardKey=card;this.card.src = this.sprites[card]; this.card.alt = result.cardColor + ' card colour';
          this.stage.dataset.result = result.won ? 'win' : 'lose'; this.render();
          this.playSound(result.won ? 'win' : 'lose');
        };
        if(this.presentationClock?.paused)this.presentationClock.schedule('reveal-ready',reveal,0);else reveal();
      });
    }, revealDelay);
    this.history.unshift(result.cardColor); this.history = this.history.slice(0, 5);
    histories.set(this.gameId, this.history);
    this.scheduleReveal('complete',() => {
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
    this.cardKey='hidden';this.card.src = this.sprites.hidden; this.card.alt = 'Face-down card';
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
    this.positionHabesha(machine);
  }
  positionHabesha(machine){
    const view=this.document.defaultView,bounds=habeshaGambleBounds(machine,{height:view.innerHeight});
    const layout=habeshaGambleLayouts[bounds.variant],pack=this.pack.layouts[bounds.variant];
    Object.assign(this.dialog.style,{width:bounds.width+'px',left:bounds.left+'px',top:bounds.top+'px'});
    this.dialog.dataset.gambleLayout=bounds.variant;this.stage.style.aspectRatio=layout.width+'/'+layout.height;
    this.sprites=pack.sprites;for(const [name,src]of Object.entries(this.sprites))this.stage.style.setProperty('--gamble-'+name,'url("'+src+'")');
    const rect=(node,box,center=false)=>{if(!node)return;node.style.left=box[0]/layout.width*100+'%';node.style.top=box[1]/layout.height*100+'%';if(box.length>2){node.style.width=box[2]/layout.width*100+'%';node.style.height=box[3]/layout.height*100+'%';}if(center)node.style.transform='translateX(-50%)';};
    rect(this.red,layout.red);rect(this.black,layout.black);rect(this.take,layout.take);rect(this.closeButton,layout.close);rect(this.card,layout.card);
    rect(this.amountNode.parentElement,layout.amount,true);rect(this.toWinNode.parentElement,layout.toWin,true);
    rect(this.stage.querySelector('.native-gamble-previous'),layout.previous,true);rect(this.historyNode,layout.history,true);rect(this.stage.querySelector('.native-gamble-instruction'),layout.instruction,true);
    for(const key of ['labelSize','valueSize','previousSize','instructionSize','buttonSize'])this.stage.style.setProperty('--habesha-'+key,layout[key]/layout.width*100+'cqw');
    this.stage.style.setProperty('--habesha-history-width',layout.historyCard[0]/layout.width*100+'cqw');
    this.stage.style.setProperty('--habesha-history-gap',4/layout.width*100+'cqw');
    this.card.src=this.sprites[this.cardKey];this.renderHistory();this.syncPresentation();
  }
  syncPresentation(){if(!this.presentationClock)return;this.presentationClock.setPaused(!this.opened||!this.pageActive||!this.focused||this.document.hidden);if(this.stage)this.stage.dataset.paused=String(this.presentationClock.paused);}
  scheduleReveal(key,callback,delay){if(this.presentationClock)this.presentationClock.schedule(key,callback,delay);else if(key==='reveal')this.revealTimer=setTimeout(callback,delay);else this.timer=setTimeout(callback,delay);}
  clearReveal() { clearTimeout(this.timer); clearTimeout(this.revealTimer);this.presentationClock?.clearAll(); this.timer = 0; this.revealTimer = 0; this.revealing = false; }
  error() { this.clearReveal(); this.state.busy = false; this.state.error = true; this.hideCard(); this.render(); }
  close() { this.version++; this.opened = false; this.clearReveal();this.syncPresentation(); this.sound?.stop(); }
  async prepareAudio() {
    if (this.sound || !this.audio || this.disposed) return;
    const audio=this.audio;
    this.sound={prepare:()=>audio.unlock(),play:name=>{const sample={red:'tap',black:'tap',win:'gamble-win',lose:'gamble-lose'}[name];if(sample)audio.playSample(sample,{group:'gamble'});},stop:()=>audio.stop('gamble'),dispose:()=>audio.stop('gamble')};
    // TAKE uses the controller's existing collected() cue exactly once.
    if(this.opened)await this.sound.prepare();
  }
  playSound(name) { void this.sound?.play(name); }
  dispose() { this.disposed = true; this.close(); this.abort.abort(); this.sound?.dispose(); }
}
