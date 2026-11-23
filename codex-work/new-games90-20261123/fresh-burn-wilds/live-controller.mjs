/**
 * New Burn Wilds game-controller, independently authored for NEW90.
 * There is no client-side game RNG or wallet. Render only the server receipt.
 */
import { GAME_ID, validateSession, validateSettledRound, validateIntent } from './contract.mjs';
const fail = code => Object.assign(new Error(code), {code});
const clone = x => structuredClone(x);
export const BURN_PENDING_STORAGE_KEY = 'zplay.new90.fresh.burn-wilds.pending.v1';

export class BurnWildsLiveController {
  constructor({host,renderer,storage,symbols,keyFactory}) {
    if (!host || !['getState','spin','recover'].every(name=>typeof host[name]==='function') ||
        !renderer || !['start','accept','accelerate','finish'].every(name=>typeof renderer[name]==='function') ||
        !storage || !['getItem','setItem','removeItem'].every(name=>typeof storage[name]==='function') ||
        !Array.isArray(symbols) || !symbols.includes('wild') ||
        typeof keyFactory!=='function') throw fail('BURN_DEPENDENCIES_MISSING');
    this.host=host;this.renderer=renderer;this.storage=storage;
    this.symbols=Object.freeze([...symbols]);this.keyFactory=keyFactory;
    this.phase='IDLE';this.session=null;this.pending=null;
    this.receipt=null;this.error=null;this.lock=false;
  }
  snapshot() {
    return Object.freeze({phase:this.phase,gameId:GAME_ID,balanceMinor:this.session?.balanceMinor??null,
      betLevelsMinor:this.session?.betLevelsMinor??[],canSpin:this.phase==='READY'&&this.session?.cashReleaseApproved===true,
      roundId:this.receipt?.roundId??null,error:this.error,needsRecovery:this.phase==='RECOVERY'});
  }
  async connect() {
    if (this.lock || this.phase==='SUBMITTING') throw fail('BURN_BUSY');
    this.lock=true;this.phase='CONNECTING';this.error=null;
    try {
      const state=validateSession(await this.host.getState());
      const saved=this.storage.getItem(BURN_PENDING_STORAGE_KEY);
      let pending=null;
      if (saved) {
        try {pending=JSON.parse(saved);} catch {throw fail('BURN_SAVED_ACTION_INVALID');}
        if (pending?.gameId!==GAME_ID || pending?.subject!==state.subject ||
            typeof pending.requestKey!=='string' || !pending.requestKey ||
            pending.modelVersion===undefined || !Number.isSafeInteger(pending.betMinor) ||
            pending.betMinor<=0) throw fail('BURN_SAVED_ACTION_ACCOUNT_MISMATCH');
      }
      this.session=state;this.pending=pending;this.phase=pending?'RECOVERY':'READY';
      return this.snapshot();
    } catch(e) {
      this.phase='BLOCKED';this.session=null;this.error=e.code||e.message||'BURN_STATE_UNAVAILABLE';throw e;
    } finally {this.lock=false;}
  }
  async spin(betMinor) {
    if (this.lock || this.phase!=='READY' || this.pending) throw fail('BURN_INPUT_LOCK');
    if (!this.session?.cashReleaseApproved) throw fail('BURN_FINANCIAL_GATE_CLOSED');
    this.lock=true;
    try {
      const action=validateIntent({gameId:GAME_ID,subject:this.session.subject,
        requestKey:this.keyFactory(),modelVersion:this.session.modelVersion,betMinor},this.session);
      this.pending=clone(action);
      this.storage.setItem(BURN_PENDING_STORAGE_KEY,JSON.stringify(action));
      this.phase='SUBMITTING';this.error=null;
      // The renderer can move reels but must never fabricate symbols or payouts.
      this.renderer.start({requestKey:action.requestKey});
      return await this._receive(action,false);
    } finally {this.lock=false;}
  }
  async recover() {
    if (this.lock || this.phase!=='RECOVERY' || !this.pending || !this.session)
      throw fail('BURN_NO_RECOVERABLE_ROUND');
    this.lock=true;
    try {return await this._receive(this.pending,true);} finally {this.lock=false;}
  }
  async _receive(action,replayOnly) {
    try {
      // 'recover' is a replay-only existing-host transaction, never a new wager.
      const raw=await (replayOnly?this.host.recover(action):this.host.spin(action));
      const accepted=validateSettledRound(raw,action,this.symbols);
      // Keep the original replay token until the visual finish callback. An
      // accepted server debit must not disappear from the recovery journal.
      if (replayOnly && ['IDLE','READY'].includes(this.renderer.phase))
        this.renderer.start({requestKey:action.requestKey});
      this.renderer.accept(accepted);
      this.receipt=accepted;
      this.session=Object.freeze({...this.session,balanceMinor:accepted.balanceMinor});
      this.phase='ANIMATING';this.error=null;
      return accepted;
    } catch(e) {
      // Server may have already committed. Persist original key until the
      // original accepted receipt is recovered. No second financial request.
      this.phase='RECOVERY';this.error=e.code||e.message||'BURN_RECEIPT_UNAVAILABLE';throw e;
    }
  }
  stop() {
    if(this.phase!=='ANIMATING' && this.phase!=='SUBMITTING')return false;
    this.renderer.accelerate();return true;
  }
  presentationFinished(roundId) {
    if(this.phase!=='ANIMATING' || this.receipt?.roundId!==roundId)return false;
    if(!this.renderer.finish(roundId))return false;
    this.pending=null;this.storage.removeItem(BURN_PENDING_STORAGE_KEY);
    this.phase='READY';return true;
  }
  disconnect() {
    this.phase='BLOCKED';this.session=null;
    // Do not delete the original pending journal. Reconnect before recovery.
  }
}
