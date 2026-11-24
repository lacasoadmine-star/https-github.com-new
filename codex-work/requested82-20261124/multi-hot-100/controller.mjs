import { validateM100RoundView } from './controls.mjs';

/**
 * Own Multi Hot 100 host composition. Only the supplied authoritative host may
 * return outcomes/balances. No endpoint, randomness, award or wallet is invented.
 */
export class MultiHot100Controller {
  constructor({controls,presentation,transport,keyFactory=()=>crypto.randomUUID(),onChange=()=>{},onError=()=>{}}={}) {
    if(!controls || !presentation || typeof transport?.submit!=='function' || typeof transport?.recover!=='function' ||
       typeof keyFactory!=='function' || typeof onChange!=='function' || typeof onError!=='function') throw new TypeError('M100_HOST_CONTRACT');
    this.controls=controls; this.presentation=presentation; this.transport=transport;
    this.keyFactory=keyFactory; this.onChange=onChange; this.onError=onError;
    this.inflight=null; this.hidden=false; this.disposed=false;
  }
  snapshot() { return Object.freeze({...this.controls.snapshot(),inFlight:!!this.inflight,hidden:this.hidden,disposed:this.disposed}); }
  report(error) { try { this.onError(error); } catch { /* Reporting must not change accepted financial state. */ } }
  change() { if(!this.disposed) { try { this.onChange(this.snapshot()); } catch(error) { this.report(error); } } }
  async spin() {
    if(this.disposed || this.hidden) return false;
    const state=this.controls.snapshot();
    if(['SPIN_PENDING','PRESENTING'].includes(state.phase)) return this.stop();
    if(this.inflight || state.pending || state.modal || !['IDLE','WIN_PENDING'].includes(state.phase)) return false;
    let result;
    try { result=this.controls.requestSpin(this.keyFactory()); }
    catch(error) { this.report(error); return false; }
    if(!result.accepted) return false;
    const intent=result.intents[0];
    try { this.presentation.begin(intent); }
    catch(error) {
      // No transport has been invoked. Only this locally unsent request may be cancelled.
      this.controls.cancelUnsent(intent.requestKey); this.presentation.cancelUnsent?.(intent.requestKey);
      this.report(error); this.change(); return false;
    }
    return this.send(intent);
  }
  stop() {
    if(this.disposed || this.hidden) return false;
    const result=this.controls.requestStop();
    if(!result.accepted) return false;
    this.presentation.requestStop(); this.change(); return true;
  }
  async take() {
    const state=this.controls.snapshot();
    if(this.disposed || this.hidden || this.inflight || (state.modal && state.modal!=='double') || state.phase!=='WIN_PENDING') return false;
    let result;
    try { result=this.controls.requestTakeWin(this.keyFactory()); }
    catch(error) { this.report(error); return false; }
    if(!result.accepted) return false;
    return this.send(result.intents[0]);
  }
  async gamble(choice) {
    const state=this.controls.snapshot();
    if(this.disposed || this.hidden || this.inflight || state.phase!=='WIN_PENDING' || state.modal!=='double') return false;
    let result;
    try { result=this.controls.requestGamble(this.keyFactory(),choice); }
    catch(error) { this.report(error); return false; }
    if(!result.accepted) return false;
    return this.send(result.intents[0]);
  }
  async send(intent,{recover=false}={}) {
    if(this.inflight || this.disposed) return false;
    // Capture the in-flight identity before calling even a synchronously throwing host.
    const job=Promise.resolve().then(()=>recover?this.transport.recover(intent):this.transport.submit(intent));
    this.inflight=job; this.change();
    try {
      const reply=await job;
      if(this.disposed) return false;
      let accepted;
      if(intent.kind==='SPIN') {
        const normalized=validateM100RoundView(reply,intent);
        accepted=this.controls.applyRoundView(normalized);
        if(accepted) this.presentation.accept(accepted);
      } else if(intent.kind==='TAKE_WIN') accepted=this.controls.applyTakeAcknowledgement(reply);
      else if(intent.kind==='GAMBLE') accepted=this.controls.applyGambleView(reply);
      else throw new Error('M100_UNSUPPORTED_HOST_ACTION');
      // A duplicate from a previous request cannot silently strand this pending request.
      if(!accepted && this.controls.snapshot().pending?.requestKey===intent.requestKey) throw new Error('M100_STALE_HOST_RESPONSE');
      return true;
    } catch(error) {
      if(!this.disposed && this.controls.snapshot().pending?.requestKey===intent.requestKey) {
        this.controls.markRequestUncertain(intent.requestKey); this.controls.stopAuto();
      }
      if(!this.disposed) this.report(error);
      return false;
    } finally {
      if(this.inflight===job) this.inflight=null;
      this.change();
    }
  }
  async recover() {
    if(this.disposed || this.hidden || this.inflight) return false;
    const recovery=this.controls.recoveryIntent();
    if(!recovery) return false;
    const {replayOnly,...intent}=recovery;
    return this.send(Object.freeze(intent),{recover:true});
  }
  frame({clockMs,progress}) {
    if(this.disposed) return null;
    const view=this.presentation.advance({clockMs,progress}),state=this.controls.snapshot();
    if(state.phase==='PRESENTING' && !view.moving && view.receipt?.roundId===state.round?.roundId) {
      this.controls.finishPresentation(state.round.roundId); this.change();
    }
    return view;
  }
  setHidden(hidden) {
    if(this.disposed) return false;
    this.hidden=!!hidden;
    if(this.hidden) {
      this.controls.stopAuto();
      const pending=this.controls.snapshot().pending;
      if(pending) this.controls.markRequestUncertain(pending.requestKey);
    }
    this.change(); return true;
  }
  dispose() {
    if(this.disposed) return;
    this.setHidden(true); this.disposed=true;
  }
}
