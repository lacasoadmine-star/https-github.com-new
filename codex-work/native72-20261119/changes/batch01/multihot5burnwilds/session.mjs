// Multi Hot 5 Burn Wilds: dedicated connector for the EXISTING ZPLAY Player session and wallet ledger.
// No independent backend, RNG, bonus balance, settlement or cross-game session sharing.
// /api/slots/fresh-state and /api/slots/spin are existing routes; operator math
// gates remain authoritative. A rejected model MUST remain unlaunchable.
import {GAME_ID,validateModel,validateReceipt} from './controller.mjs';
const fail=(code,status=null)=>Object.assign(new Error(code),{code,status});
const exactMoney=v=>{if(typeof v!=='string'||!/^(0|[1-9]\\d{0,12})\\.\\d{2}$/.test(v))throw fail('INVALID_SERVER_ETB');return BigInt(v.replace('.',''))};
const uuidPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const STORAGE_KEY='zplay.player.pending.multihot5burnwilds.v1';
export function transport(fetcher=globalThis.fetch,timeoutMs=20000){
 return async(path,body)=>{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
   const r=await fetcher(path,{method:body?'POST':'GET',cache:'no-store',credentials:'same-origin',redirect:'error',signal:ctrl.signal,headers:{accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
   let data;try{data=await r.json()}catch{throw fail('INVALID_SERVER_RESPONSE',r.status)}
   if(!r.ok)throw fail(typeof data?.code==='string'?data.code:typeof data?.error==='string'?data.error:'HTTP_'+r.status,r.status);
   return data;
  }finally{clearTimeout(timer)}
 };
}
export class Session {
 constructor({request=transport(),storage=globalThis.sessionStorage,uuid=()=>globalThis.crypto.randomUUID()}={}){
  if(typeof request!=='function'||!storage||typeof storage.getItem!=='function'||typeof uuid!=='function')throw fail('SESSION_DEPENDENCIES_REQUIRED');
  this.request=request;this.storage=storage;this.uuid=uuid;
  this.account=null;this.pending=null;this.phase='DISCONNECTED';this.busy=false;this.generation=0;this.result=null;
 }
 _active(version,guard){
  return this.generation===version&&this.account?.sessionGuard===guard;
 }
 async connect(){
  if(this.busy)throw fail('SESSION_BUSY');
  this.busy=true;const version=++this.generation;
  this.account=null;this.pending=null;this.result=null;this.phase='DISCONNECTED';
  try{
   const s=await this.request('/api/slots/fresh-state');
   if(this.generation!==version)throw fail('STALE_SESSION_RESPONSE');
   if(!s?.authenticated||s.currency!=='ETB'||s.game?.id!==GAME_ID||!/^[a-f0-9]{64}$/i.test(s.sessionGuard||'')){
    // Guard is an opaque, fixed-length per-session hash, not a user credential.
    if(!s?.authenticated)throw fail('LOGIN_REQUIRED');
    if(s.game?.id!==GAME_ID)throw fail('GAME_NOT_REGISTERED_IN_EXISTING_ZPLAY');
    if(!/^[a-f0-9]{64}$/i.test(s.sessionGuard||''))throw fail('INVALID_SESSION_GUARD');
    throw fail('INVALID_PLAYER_STATE');
   }
   validateModel(s.game);
   exactMoney(s.balance);
   const stored=this.storage.getItem(STORAGE_KEY);
   const action=stored?JSON.parse(stored):null;
   if(action&&(action.gameId!==GAME_ID||action.sessionGuard!==s.sessionGuard||!uuidPattern.test(action.roundToken||'')))throw fail('SAVED_ROUND_BELONGS_TO_ANOTHER_SESSION');
   if(action&&(!(s.game.betLevels||[]).includes(action.bet)))throw fail('SAVED_ROUND_STAKE_MISMATCH');
   this.account=s;this.pending=action;this.result=null;
   this.phase=action?'WAITING_FOR_RESULT':s.game.enabled&&s.game.freshReleaseReady&&!s.blockedByActiveGame&&s.game.wagerAvailability!=='house_capacity'?'READY':'UNAVAILABLE';
   return s;
  }catch(e){if(this.generation===version)this.phase='DISCONNECTED';throw e}
  finally{if(this.generation===version)this.busy=false}
 }
 async spin(bet){
  if(this.busy||this.phase!=='READY'||this.pending)throw fail('ROUND_NOT_READY');
  if(this.storage.getItem(STORAGE_KEY))throw fail('PERSISTED_ROUND_REQUIRES_RECOVERY');
  const a=this.account;
  if(!a?.authenticated||a.game?.id!==GAME_ID)throw fail('LOGIN_REQUIRED');
  if(!a.game.betLevels.includes(bet))throw fail('INVALID_BET');
  if(exactMoney(bet)>exactMoney(a.balance))throw fail('INSUFFICIENT_FUNDS',402);
  const token=this.uuid();
  if(!uuidPattern.test(token))throw fail('INVALID_ROUND_TOKEN');
  const action={gameId:GAME_ID,bet,roundToken:token,sessionGuard:a.sessionGuard,mathVersion:a.game.mathVersion,engineVersion:a.game.engineVersion,mathSha256:a.game.mathSha256};
  this.storage.setItem(STORAGE_KEY,JSON.stringify(action));
  this.pending=action;
  return this._send(false);
 }
 async recover(){
  if(this.busy||!this.pending||!this.account||this.phase!=='WAITING_FOR_RESULT')throw fail('ROUND_NOT_RECOVERABLE');
  return this._send(true);
 }
 async _send(replayOnly){
  if(this.busy||!this.pending||!this.account)throw fail('NO_PENDING_ROUND');
  this.busy=true;this.phase='REQUESTING_RESULT';
  const token=this.pending,guard=this.account.sessionGuard,gen=this.generation;
  try{
   const response=await this.request('/api/slots/spin',{...token,...(replayOnly?{replayOnly:true}:{})});
   if(!this._active(gen,guard)||this.pending!==token)throw fail('STALE_SESSION_RESPONSE');
   // A malformed receipt is ambiguous after submission: keep the persisted
   // token so the existing server can replay/reconcile without double charging.
   const result=validateReceipt(response,this.account.game,token.bet);
   this.storage.removeItem(STORAGE_KEY);this.pending=null;this.result=result;
   this.account.balance=result.walletReceipt.balanceAfter;
   this.phase='SHOWING_RESULT';return result;
  }catch(e){
   if(this._active(gen,guard)&&this.pending===token){
    if([400,402,422].includes(e?.status)&&e.code!=='INVALID_SERVER_RESPONSE'){
     // Explicit rejection has no round to recover. Never reuse its token.
     this.storage.removeItem(STORAGE_KEY);this.pending=null;
     this.phase='READY';
    }else this.phase='WAITING_FOR_RESULT';
   }
   throw e;
  }finally{if(this.generation===gen)this.busy=false}
 }
 async finish(){
  if(this.busy||!['SHOWING_RESULT','WAITING_FOR_RESULT'].includes(this.phase)||!this.account||this.pending||!this.result)throw fail('ROUND_NOT_REVEALING');
  this.busy=true;const gen=this.generation,guard=this.account.sessionGuard;
  try{
   const s=await this.request('/api/slots/fresh-state');
   if(!this._active(gen,guard))throw fail('STALE_SESSION_RESPONSE');
   if(!s.authenticated||s.sessionGuard!==guard||s.currency!=='ETB'||s.game?.id!==GAME_ID)throw fail('SESSION_CHANGED');
   validateModel(s.game);exactMoney(s.balance);
   // The fresh ledger may reflect a later concurrently committed round.
   // Never replace it with the older displayed receipt or client-calculated money.
   this.account=s;this.phase=s.game.enabled&&s.game.freshReleaseReady&&!s.blockedByActiveGame&&s.game.wagerAvailability!=='house_capacity'?'READY':'UNAVAILABLE';
   return s;
  }catch(e){if(this.generation===gen)this.phase='WAITING_FOR_RESULT';throw e}
  finally{if(this.generation===gen)this.busy=false}
 }
 logout(){
  ++this.generation;this.account=null;this.pending=null;this.result=null;this.busy=false;this.phase='DISCONNECTED';
  // Do NOT erase persisted rounds here; they still need reconciliation under
  // the original signed-in Player, not a new account.
 }
}
