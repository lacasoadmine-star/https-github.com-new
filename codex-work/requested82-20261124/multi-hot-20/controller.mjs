import {MultiHot20Controller as RetainedController} from '../../new-games90-20261123/m20/controller.mjs';

/** Distinguish a missing server reply from failure to draw its accepted reply. */
export class MultiHot20Controller extends RetainedController {
  constructor(options) {
    super(options);
    if (typeof this.controls.markPresentationUncertain !== 'function' ||
        typeof this.renderer.restoreAccepted !== 'function') throw Error('M20_LOCAL_RECOVERY_DEPENDENCIES');
    this.acceptedView = null; this.restoringPresentation = false;this.notifying=false;this.reporting=false;
  }
  report(error) { if(this.reporting)return;this.reporting=true;try { this.onError(error); } catch {} finally{this.reporting=false;} }
  change() { if (!this.disposed&&!this.notifying) {this.notifying=true;try { this.onChange(this.snapshot()); } catch (error) { this.report(error); } finally{this.notifying=false;} } }
  inputBlocked(){return this.notifying||this.reporting||this.restoringPresentation;}
  snapshot() { return Object.freeze({...super.snapshot(),presentationRecoveryRequired:!!this.controls.acceptedPresentationRecovery()}); }
  markPresentationFailure(error) {
    const state = this.controls.snapshot();
    if (this.acceptedView && !state.pending && state.phase === 'ANIMATING' &&
        state.round?.roundId === this.acceptedView.roundId) this.controls.markPresentationUncertain(this.acceptedView);
    this.invalidateScheduled(); this.controls.stopAuto(); this.report(error); this.change();
  }
  async spin(options) {
    if (this.inputBlocked()||this.controls.acceptedPresentationRecovery()) return false;
    return super.spin(options);
  }
  async take(){if(this.inputBlocked())return false;return super.take();}
  async gamble(choice){if(this.inputBlocked())return false;return super.gamble(choice);}
  startAuto(){if(this.inputBlocked())return false;return super.startAuto();}
  async send(intent,{recover=false}={}) {
    if (this.inflight || this.disposed || this.inputBlocked()) return false;
    const job=Promise.resolve().then(()=>recover?this.transport.recover(intent):this.transport.submit(intent));
    this.inflight=job;this.change();
    try {
      const reply=await job;
      if(this.disposed)return false;
      if(intent.action==='SPIN') {
        const accepted=this.controls.acceptReceipt(reply);
        if(accepted) {
          // This is the original validated immutable host receipt, not a clone
          // with lost trust provenance, replacement grid or another wager.
          this.acceptedView=this.controls.acceptedRoundForPresentation();
          try {
            const shown=this.renderer.accept(this.acceptedView,this.now());
            if(shown===false&&this.renderer.snapshot().round?.roundId!==this.acceptedView.roundId)throw Error('M20_ACCEPTED_RESULT_NOT_PRESENTED');
          } catch(error) {this.markPresentationFailure(error);return false;}
        }
      } else if(intent.action==='GAMBLE') {this.controls.acceptGamble(reply);this.renderer.applyGamble?.(reply);}
      else if(intent.action==='TAKE') {this.controls.acceptTake(reply);this.renderer.collect(intent.roundId);}
      return true;
    } catch(error) {
      if(!this.disposed) {
        if(error?.definitiveRejection===true&&this.controls.snapshot().pending?.requestKey===intent.requestKey) {
          this.controls.cancelUnsent(intent.requestKey,{definitiveRejection:true});
          if(intent.action==='SPIN')this.renderer.cancelUnsent(intent.requestKey);
        } else if(this.controls.snapshot().pending?.requestKey===intent.requestKey)this.controls.uncertain(intent.requestKey);
        else this.controls.disconnect();
        this.invalidateScheduled();this.report(error);
      }
      return false;
    } finally {if(this.inflight===job)this.inflight=null;this.change();}
  }
  recoverPresentation() {
    if(this.disposed||this.hidden||this.inflight||this.inputBlocked())return false;
    const accepted=this.controls.acceptedPresentationRecovery();
    if(!accepted)return false;
    this.restoringPresentation=true;
    try {
      this.renderer.restoreAccepted(accepted);
      const view=this.renderer.snapshot();
      if(view.phase!=='IDLE'||view.round?.roundId!==accepted.roundId||JSON.stringify(view.grid)!==JSON.stringify(accepted.grid))throw Error('M20_LOCAL_RECOVERY_DRAW_MISMATCH');
      return this.controls.finishPresentationRecovery(accepted);
    } catch(error) {this.report(error);return false;}
    finally {this.restoringPresentation=false;this.change();}
  }
  async recover() {
    if(this.inputBlocked())return false;
    if(this.controls.acceptedPresentationRecovery())return this.recoverPresentation();
    return super.recover();
  }
  frame(now=this.now()) {
    if(this.disposed||this.controls.acceptedPresentationRecovery())return;
    try {
      this.renderer.render(now);
      const state=this.controls.snapshot(),view=this.renderer.snapshot();
      if(view.presentationError)throw Error(view.presentationError);
      if(state.phase==='ANIMATING'&&view.phase==='IDLE'&&view.round?.roundId===state.round.roundId) {
        this.controls.finishPresentation(state.round.roundId);this.change();this.queueNext();
      }
    } catch(error) {this.markPresentationFailure(error);}
  }
}
