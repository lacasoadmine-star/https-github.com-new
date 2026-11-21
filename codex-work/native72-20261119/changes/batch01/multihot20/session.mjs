// Multi Hot 20: dedicated connector for the EXISTING ZPLAY Player session and wallet ledger.
// No independent backend, RNG, bonus balance, settlement or cross-game session sharing.
// /api/slots/fresh-state and /api/slots/spin are existing routes; operator math
// gates remain authoritative. A rejected model MUST remain unlaunchable.
import {GAME_ID,validateModel,validateReceipt,validateSavedRound,validateReplayedReceipt,validateGambleReceipt,isDefinitiveGambleRejection} from './controller.mjs';
const fail=(code,status=null)=>Object.assign(new Error(code),{code,status});
const exactMoney=v=>{if(typeof v!=='string'||!/^(0|[1-9]\d{0,12})\.\d{2}$/.test(v))throw fail('INVALID_SERVER_ETB');return BigInt(v.replace('.',''))};
const uuidPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const STORAGE_KEY='zplay.player.pending.multihot20.v1';
export const GAMBLE_STORAGE_KEY='zplay.player.pending.multihot20.gamble.v1';
const mathKeys=['mathVersion','engineVersion','mathSha256'];
function savedGamble(action,guard){
 if(!action||action.gameId!==GAME_ID||action.sessionGuard!==guard||
    !uuidPattern.test(action.roundToken||'')||!uuidPattern.test(action.roundId||'')||
    !['RED','BLACK'].includes(action.choice)||!Number.isSafeInteger(action.expectedAttempt)||
    action.expectedAttempt<1||action.expectedAttempt>5||exactMoney(action.expectedStake)<=0n||
    typeof action.mathVersion!=='string'||!action.mathVersion||typeof action.engineVersion!=='string'||
    !action.engineVersion||!/^[a-f0-9]{64}$/i.test(action.mathSha256||''))throw fail('SAVED_GAMBLE_BELONGS_TO_ANOTHER_SESSION');
 return action;
}
export function transport(fetcher=globalThis.fetch,timeoutMs=20000){
 return async(path,body)=>{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
   const r=await fetcher(path,{method:body?'POST':'GET',cache:'no-store',credentials:'same-origin',redirect:'error',signal:ctrl.signal,headers:{accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
   let data;try{data=await r.json()}catch{throw fail('INVALID_SERVER_RESPONSE',r.status)}
   if(!r.ok)throw fail(typeof data?.code==='string'?data.code:typeof data?.error==='string'?data.error:typeof data?.detail==='string'?data.detail:'HTTP_'+r.status,r.status);
   return data;
  }finally{clearTimeout(timer)}
 };
}
export class Session {
 constructor({request=transport(),storage=globalThis.sessionStorage,uuid=()=>globalThis.crypto.randomUUID()}={}){
  if(typeof request!=='function'||!storage||typeof storage.getItem!=='function'||typeof uuid!=='function')throw fail('SESSION_DEPENDENCIES_REQUIRED');
  this.request=request;this.storage=storage;this.uuid=uuid;
  this.account=null;this.pending=null;this.pendingAction=null;this.actionResult=null;
  this.phase='DISCONNECTED';this.busy=false;this.generation=0;this.result=null;
 }
 _active(version,guard){
  return this.generation===version&&this.account?.sessionGuard===guard;
 }
 async connect(){
  if(this.busy)throw fail('SESSION_BUSY');
  this.busy=true;const version=++this.generation;
  this.account=null;this.pending=null;this.pendingAction=null;this.actionResult=null;this.result=null;this.phase='DISCONNECTED';
  try{
   const s=await this.request('/api/slots/fresh-state?gameId='+encodeURIComponent(GAME_ID));
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
   const gambleStored=this.storage.getItem(GAMBLE_STORAGE_KEY);
   const pendingAction=gambleStored?savedGamble(JSON.parse(gambleStored),s.sessionGuard):null;
   if(action&&pendingAction)throw fail('PERSISTED_ACTION_CONFLICT');
   // Current bet availability can shrink after this very round settled. It
   // must never prevent a read-only replay of the original authenticated bet.
   if(action)validateSavedRound(action,s.sessionGuard);
   this.account=s;this.pending=action;this.pendingAction=pendingAction;this.result=null;
   this.phase=pendingAction?'WAITING_FOR_ACTION':action?'WAITING_FOR_RESULT':s.game.enabled&&s.game.freshReleaseReady&&!s.blockedByActiveGame&&s.game.wagerAvailability!=='house_capacity'?'READY':'UNAVAILABLE';
   return s;
  }catch(e){if(this.generation===version)this.phase='DISCONNECTED';throw e}
  finally{if(this.generation===version)this.busy=false}
 }
 async spin(bet){
  if(this.busy||this.phase!=='READY'||this.pending||this.pendingAction)throw fail('ROUND_NOT_READY');
  if(this.storage.getItem(STORAGE_KEY)||this.storage.getItem(GAMBLE_STORAGE_KEY))throw fail('PERSISTED_ROUND_REQUIRES_RECOVERY');
  const a=this.account;
  if(!a?.authenticated||a.game?.id!==GAME_ID)throw fail('LOGIN_REQUIRED');
  if(!a.game.betLevels.includes(bet))throw fail('INVALID_BET');
  if(exactMoney(bet)>exactMoney(a.balance))throw fail('INSUFFICIENT_FUNDS',402);
  const token=this.uuid();
  if(!uuidPattern.test(token))throw fail('INVALID_ROUND_TOKEN');
  const action={gameId:GAME_ID,bet,roundToken:token,sessionGuard:a.sessionGuard,mathVersion:a.game.mathVersion,engineVersion:a.game.engineVersion,mathSha256:a.game.mathSha256};
  validateSavedRound(action,a.sessionGuard);
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
   let response;
   try{response=await this.request('/api/slots/spin',{...token,...(replayOnly?{replayOnly:true}:{})})}
   catch(error){
    // A lost request may never have reached the server. Only its authenticated,
    // explicit replay miss permits resubmission, with the SAME saved token and
    // original stake/model. Existing wallet locks and idempotency cover a late
    // first request racing this retry; no new token or client result is created.
    if(!replayOnly||error?.status!==404||error?.code!=='ROUND_NOT_FOUND_FOR_REPLAY'||
       !this._active(gen,guard)||this.pending!==token)throw error;
    // An authenticated miss permits the same original request only while
    // that request is still eligible as a NEW wager. A changed model, ladder,
    // balance or release state leaves the saved token available for replay;
    // never replace it or silently submit it under the latest math instead.
    const a=this.account;
    if(!a.authenticated||!a.game.enabled||!a.game.freshReleaseReady||a.blockedByActiveGame||
       a.game.wagerAvailability==='house_capacity'||!a.game.betLevels.includes(token.bet)||
       mathKeys.some(key=>a.game[key]!==token[key])||exactMoney(token.bet)>exactMoney(a.balance))
     throw fail('SAVED_ROUND_REPLAY_ONLY');
    response=await this.request('/api/slots/spin',{...token});
   }
   if(!this._active(gen,guard)||this.pending!==token)throw fail('STALE_SESSION_RESPONSE');
   // A malformed receipt is ambiguous after submission: keep the persisted
   // token so the existing server can replay/reconcile without double charging.
   const result=validateReplayedReceipt(response,this.account.game,token,guard);
   this.storage.removeItem(STORAGE_KEY);this.pending=null;this.result=result;this.actionResult=null;
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
 async gamble(choice){
  if(this.busy||this.phase!=='READY'||this.pending||this.pendingAction)throw fail('GAMBLE_NOT_READY');
  if(this.storage.getItem(STORAGE_KEY)||this.storage.getItem(GAMBLE_STORAGE_KEY))throw fail('PERSISTED_ROUND_REQUIRES_RECOVERY');
  if(!['RED','BLACK'].includes(choice))throw fail('INVALID_CHOICE',400);
  const account=this.account,parent=account?.round?.result,state=account?.round?.gamble;
  if(!account?.authenticated||!account.game?.enabled||!account.game?.freshReleaseReady||account.blockedByActiveGame)throw fail('LOGIN_OR_GAME_UNAVAILABLE');
  if(!state?.available||!parent)throw fail(state?.reason||'GAMBLE_NOT_AVAILABLE',409);
  validateReceipt(parent,account.game,parent.bet);
  if(!Number.isSafeInteger(state.attempt)||state.attempt<0||!Number.isSafeInteger(state.maxAttempts)||
     state.attempt>=state.maxAttempts||exactMoney(state.stake)<=0n||
     exactMoney(state.stake)>exactMoney(state.maxStake))throw fail('INVALID_SERVER_GAMBLE_STATE');
  if(exactMoney(state.stake)>exactMoney(account.balance))throw fail('INSUFFICIENT_FUNDS',402);
  const action={gameId:GAME_ID,roundId:parent.roundId,roundToken:this.uuid(),
   sessionGuard:account.sessionGuard,choice,expectedAttempt:state.attempt+1,expectedStake:state.stake,
   ...Object.fromEntries(mathKeys.map(key=>[key,account.game[key]]))};
  savedGamble(action,account.sessionGuard);
  // Persist before POST; a refresh never creates another wager or choice.
  this.storage.setItem(GAMBLE_STORAGE_KEY,JSON.stringify(action));this.pendingAction=action;
  return this._sendAction(false);
 }
 async recoverAction(){
  if(this.busy||!this.pendingAction||!this.account||this.phase!=='WAITING_FOR_ACTION')throw fail('ACTION_NOT_RECOVERABLE');
  return this._sendAction(true);
 }
 async _sendAction(replayOnly){
  if(this.busy||!this.pendingAction||!this.account||this.pending)throw fail('NO_PENDING_GAMBLE');
  this.busy=true;this.phase='REQUESTING_ACTION';
  const action=this.pendingAction,guard=this.account.sessionGuard,gen=this.generation;
  try{
   let response;
   try{response=await this.request('/api/slots/gamble',{...action,...(replayOnly?{replayOnly:true}:{})})}
   catch(error){
    if(!replayOnly||error?.status!==404||error?.code!=='ROUND_NOT_FOUND_FOR_REPLAY'||
       !this._active(gen,guard)||this.pendingAction!==action)throw error;
    response=await this.request('/api/slots/gamble',{...action});
   }
   if(!this._active(gen,guard)||this.pendingAction!==action)throw fail('STALE_SESSION_RESPONSE');
   const receipt=validateGambleReceipt(response,action);
   this.storage.removeItem(GAMBLE_STORAGE_KEY);this.pendingAction=null;this.actionResult=receipt;
   this.account.balance=receipt.walletReceipt.balanceAfter;
   this.phase='SHOWING_ACTION';return receipt;
  }catch(error){
   if(this._active(gen,guard)&&this.pendingAction===action){
    if(isDefinitiveGambleRejection(error)){
     this.storage.removeItem(GAMBLE_STORAGE_KEY);this.pendingAction=null;this.phase='READY';
    }else this.phase='WAITING_FOR_ACTION';
   }
   throw error;
  }finally{if(this.generation===gen)this.busy=false}
 }
 async finish(){
  if(this.busy||!['SHOWING_RESULT','WAITING_FOR_RESULT','SHOWING_ACTION','WAITING_FOR_ACTION'].includes(this.phase)||
     !this.account||this.pending||this.pendingAction||!this.result&&!this.actionResult)throw fail('ROUND_NOT_REVEALING');
  return this.refresh();
 }
 async takeWin(){
  if(!this.account?.round?.result||!['READY','UNAVAILABLE'].includes(this.phase))throw fail('NO_SETTLED_WIN');
  // No POST, credit endpoint or second payout: the server has already settled.
  return this.refresh();
 }
 async refresh(){
  if(this.busy||!this.account||this.pending||this.pendingAction)throw fail('LEDGER_NOT_REFRESHABLE');
  this.busy=true;const gen=this.generation,guard=this.account.sessionGuard;
  try{
   const s=await this.request('/api/slots/fresh-state?gameId='+encodeURIComponent(GAME_ID));
   if(!this._active(gen,guard))throw fail('STALE_SESSION_RESPONSE');
   if(!s.authenticated||s.sessionGuard!==guard||s.currency!=='ETB'||s.game?.id!==GAME_ID)throw fail('SESSION_CHANGED');
   validateModel(s.game);exactMoney(s.balance);
   // The fresh ledger may reflect a later concurrently committed round.
   // Never replace it with the older displayed receipt or client-calculated money.
   this.account=s;this.phase=s.game.enabled&&s.game.freshReleaseReady&&!s.blockedByActiveGame&&s.game.wagerAvailability!=='house_capacity'?'READY':'UNAVAILABLE';
   return s;
  }catch(e){if(this.generation===gen)this.phase=this.actionResult?'WAITING_FOR_ACTION':'WAITING_FOR_RESULT';throw e}
  finally{if(this.generation===gen)this.busy=false}
 }
 logout(){
  ++this.generation;this.account=null;this.pending=null;this.pendingAction=null;this.actionResult=null;this.result=null;this.busy=false;this.phase='DISCONNECTED';
  // Do NOT erase persisted rounds here; they still need reconciliation under
  // the original signed-in Player, not a new account.
 }
}
