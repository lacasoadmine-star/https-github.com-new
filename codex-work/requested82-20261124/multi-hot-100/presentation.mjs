import { validateM100RoundView, MULTI_HOT_100_GAME_ID } from './controls.mjs';

/** Receipt-bound presentation only. Timing/progress are supplied by the measured host. */
export class MultiHot100Presentation {
  #pending=null; #receipt=null; #previous=null; #progress=1; #clock=0; #stop=false;
  constructor({initialView=null}={}) { if(initialView) this.#receipt=validateM100RoundView(initialView); }
  begin(intent) {
    if(this.#pending || this.#progress<1 || intent?.kind!=='SPIN' || intent.gameId!==MULTI_HOT_100_GAME_ID) throw new Error('M100_PRESENTATION_PENDING');
    this.#pending=structuredClone(intent); this.#previous=this.#receipt; this.#receipt=null;
    this.#progress=0; this.#clock=0; this.#stop=false;
  }
  accept(view) {
    const receipt=validateM100RoundView(view);
    if(this.#receipt) {
      if(JSON.stringify(receipt)===JSON.stringify(this.#receipt)) return false;
      throw new Error('M100_PRESENTATION_RECEIPT_CONFLICT');
    }
    if(!this.#pending) throw new Error('M100_PRESENTATION_NO_INTENT');
    this.#receipt=validateM100RoundView(receipt,this.#pending); return true;
  }
  restoreAccepted(view) {
    const receipt=validateM100RoundView(view);
    if(!this.#pending && !this.#receipt) throw new Error('M100_PRESENTATION_NO_INTENT');
    const accepted=validateM100RoundView(receipt,this.#pending??this.#receipt);
    if(this.#receipt && JSON.stringify(accepted)!==JSON.stringify(this.#receipt)) throw new Error('M100_PRESENTATION_RECEIPT_CONFLICT');
    this.#receipt=accepted; this.#pending=null; this.#progress=1; this.#stop=false;
    return accepted;
  }
  requestStop() { if(!this.#pending || this.#stop) return false; this.#stop=true; return true; }
  cancelUnsent(requestKey) {
    if(!this.#pending || this.#pending.requestKey!==requestKey || this.#receipt) return false;
    this.#pending=null; this.#receipt=this.#previous; this.#previous=null; this.#progress=1; this.#stop=false; return true;
  }
  advance({clockMs,progress}) {
    if(!Number.isFinite(clockMs) || clockMs<this.#clock) throw new RangeError('M100_PRESENTATION_CLOCK');
    if(progress!==undefined && (!Number.isFinite(progress) || progress<0 || progress>1 || progress<this.#progress)) throw new RangeError('M100_PRESENTATION_PROGRESS');
    this.#clock=clockMs;
    if(this.#receipt && progress!==undefined) this.#progress=this.#stop?1:progress;
    if(this.#receipt && this.#progress===1) this.#pending=null;
    return this.snapshot();
  }
  snapshot() {
    return Object.freeze({pending:this.#pending?Object.freeze(structuredClone(this.#pending)):null,
      receipt:this.#receipt,previous:this.#previous,moving:!!this.#pending,progress:this.#progress,
      clockMs:this.#clock,stopRequested:this.#stop,providerTimingVerified:false,outcomesGenerated:0,financiallyActionable:false});
  }
}
