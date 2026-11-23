/**
 * New Burn Wilds client input/UX controller.
 * Does not determine symbol outcomes, bet odds, win credits, or balances.
 * Every money-bearing action goes to the verified existing backend.
 */
const reject = code => { throw Object.assign(new Error(code), { code }); };
const countOK = value => Number.isSafeInteger(value) && value >= 1 && value <= 10000;
const moneyOK = value => Number.isSafeInteger(value) && value > 0;
const actionKey = value => typeof value === 'string' && value.length > 0 && value.length <= 180;
const FOCUSABLE = /^(?:BUTTON|INPUT|TEXTAREA|SELECT|A)$/;

export class BurnWildsPlayerControls {
  constructor({controller,host,audio,referenceControls,randomKey,notify=()=>{}}={}) {
    if (!controller || !['connect','spin','stop','presentationFinished','snapshot'].every(k=>typeof controller[k]==='function') ||
        !host || !['getWallet','getDashboard','getHistory'].every(k=>typeof host[k]==='function') ||
        !audio || typeof audio.setMuted!=='function' ||
        !referenceControls || !Array.isArray(referenceControls.autoplayCounts) ||
        referenceControls.autoplayCounts.length < 1 ||
        referenceControls.autoplayCounts.some(n=>!countOK(n)) ||
        new Set(referenceControls.autoplayCounts).size !== referenceControls.autoplayCounts.length ||
        typeof randomKey!=='function' || typeof notify!=='function') reject('BURN_CONTROLS_DEPENDENCIES_INVALID');
    this.controller=controller; this.host=host;this.audio=audio;this.randomKey=randomKey;this.notify=notify;
    this.allowedAuto=Object.freeze([...referenceControls.autoplayCounts]);
    this.betMinor=null;this.muted=true;this.panel=null;this.busy=false;
    this.autoRemaining=0;this.turbo=false;this.lastRound=null;this.disposed=false;
  }
  view() {
    const state=this.controller.snapshot();
    return Object.freeze({
      phase:state.phase,betMinor:this.betMinor,balanceMinor:state.balanceMinor,
      autoplayRemaining:this.autoRemaining,autoplayCounts:this.allowedAuto,
      muted:this.muted,settingsOpen:this.panel==='settings',
      paytableOpen:this.panel==='paytable',
      canBet:!this.busy && state.phase==='READY' && !state.needsRecovery,
      canSpin:!this.busy && state.canSpin && moneyOK(this.betMinor),
      roundId:state.roundId,needsRecovery:state.needsRecovery
    });
  }
  async connect() {
    if(this.disposed)reject('BURN_CONTROLS_DISPOSED');
    if(this.busy)reject('BURN_CONTROLS_BUSY');
    this.busy=true;
    try {
      const state=await this.controller.connect();
      const levels=state.betLevelsMinor;
      if(!levels?.includes(this.betMinor))this.betMinor=levels?.[0]??null;
      this.notify(this.view());
      return this.view();
    } finally {this.busy=false;this.notify(this.view());}
  }
  setBet(value) {
    const state=this.controller.snapshot();
    if(this.disposed||this.busy||state.phase!=='READY'||
       !state.betLevelsMinor.includes(value)||this.autoRemaining>0)
      reject('BURN_BET_CHANGE_LOCKED');
    this.betMinor=value;this.notify(this.view());return this.view();
  }
  async spin() {
    if(this.disposed||this.busy||!this.controller.snapshot().canSpin||
       !moneyOK(this.betMinor)||this.autoRemaining<0)
      reject('BURN_SPIN_INPUT_LOCK');
    this.busy=true;
    try {
      const receipt=await this.controller.spin(this.betMinor);
      if(receipt?.roundId)this.lastRound=receipt.roundId;
      return receipt;
    } catch(e) {
      this.autoRemaining=0;throw e;
    } finally {this.busy=false;this.notify(this.view());}
  }
  stop() {
    if(this.disposed)return false;
    const ok=this.controller.stop();
    this.notify(this.view());return ok;
  }
  startAutoplay(count) {
    if(this.disposed||this.busy||this.autoRemaining>0 ||
       !this.allowedAuto.includes(count)||!this.controller.snapshot().canSpin)
      reject('BURN_AUTOPLAY_LOCKED');
    this.autoRemaining=count;
    this.notify(this.view());
    // First accepted player action; all subsequent spins are gated by exact
    // presentationFinished callbacks, not a timer or an invented result.
    return this.spin().catch(e=>{this.autoRemaining=0;this.notify(this.view());throw e;});
  }
  cancelAutoplay() {
    this.autoRemaining=0;this.notify(this.view());return this.view();
  }
  async onRoundFinished(roundId) {
    if(this.disposed||!actionKey(roundId))return false;
    if(!this.controller.presentationFinished(roundId))return false;
    if(this.autoRemaining>0){
      this.autoRemaining-=1;
      if(this.autoRemaining>0 && this.controller.snapshot().canSpin){
        try{await this.spin();}catch{this.autoRemaining=0;}
      }else this.autoRemaining=0;
    }
    this.notify(this.view());return true;
  }
  toggleMute() {
    if(this.disposed)reject('BURN_CONTROLS_DISPOSED');
    this.muted=!this.muted;this.audio.setMuted(this.muted);
    this.notify(this.view());return this.muted;
  }
  openPanel(kind) {
    if(this.disposed || !['settings','paytable'].includes(kind))reject('BURN_PANEL_INVALID');
    this.panel=kind;this.notify(this.view());return this.view();
  }
  closePanel(){this.panel=null;this.notify(this.view());return this.view();}
  async refreshAccount(){
    if(this.disposed || this.busy)reject('BURN_CONTROLS_BUSY');
    const [wallet,dashboard,history]=await Promise.all([
      this.host.getWallet(),this.host.getDashboard(),this.host.getHistory()
    ]);
    // Read-only. The existing server is the sole source of financial truth.
    return Object.freeze({wallet,dashboard,history});
  }
  keyboard(event){
    if(this.disposed || !event || event.repeat || event.isComposing || event.defaultPrevented ||
       event.ctrlKey || event.altKey || event.metaKey || event.shiftKey)return false;
    const target=event.target;
    if(target?.isContentEditable || FOCUSABLE.test(target?.tagName??''))return false;
    if(event.code!=='Space'&&event.code!=='Enter')return false;
    if(this.controller.snapshot().phase==='ANIMATING' ||
       this.controller.snapshot().phase==='SUBMITTING') {
      event.preventDefault?.();return this.stop();
    }
    if(!this.view().canSpin)return false;
    event.preventDefault?.();
    void this.spin().catch(()=>{});
    return true;
  }
  dispose(){
    if(this.disposed)return;
    this.disposed=true;this.autoRemaining=0;this.panel=null;
  }
}
