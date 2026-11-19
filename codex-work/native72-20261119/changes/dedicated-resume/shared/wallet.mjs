// Transport and pending-request ownership shared by isolated native games.
// The existing authenticated backend remains the only settlement authority.
export class ApiError extends Error {
 constructor(message,status=0,code=''){super(message);this.status=status;this.code=code;}
}
const tokenPattern=/^[a-f0-9-]{36}$/;
export class WalletAdapter {
 constructor({fetcher=(...args)=>globalThis.fetch(...args),storage=globalThis.sessionStorage,timeout=22000}={}){
  this.fetcher=fetcher;this.storage=storage;this.timeout=timeout;this.controllers=new Set();this.closed=false;this.generation=0;this.operation=null;
 }
 get busy(){return !!this.operation&&this.isCurrent(this.operation.binding);}
 capture(){return {sessionId:this.sessionId,gameId:this.game,key:this.key,actionKey:this.actionKey,generation:this.generation};}
 isCurrent(binding){return !!binding&&!this.closed&&binding.sessionId===this.sessionId&&binding.gameId===this.game&&binding.generation===this.generation;}
 async request(path,body,binding=this.capture()){
  if(this.closed)throw new ApiError('Game closed');
  const controller=new AbortController();this.controllers.add(controller);const timer=setTimeout(()=>controller.abort(),this.timeout);
  try{
   const response=await this.fetcher(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{accept:'application/json',...(body?{'content-type':'application/json','X-Zplay-Machine-Session':binding.sessionId}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal});
   let data;try{data=await response.json();}catch{throw new ApiError('The server response was interrupted. Confirm the saved round.');}
   if(!response.ok)throw new ApiError(typeof data.detail==='string'?data.detail:'Service unavailable',response.status,data.detail||data.error||'');
   return data;
  }catch(error){if(error.name==='AbortError')throw new ApiError('Connection timed out. Confirm the saved round.');throw error;}
  finally{clearTimeout(timer);this.controllers.delete(controller);}
 }
 session(){return this.request('/api/machine-session');}
 model(id){return this.request('/api/slots/games/'+encodeURIComponent(id));}
 state(id){return this.request('/api/slots/state/'+encodeURIComponent(id));}
 balance(){return this.request('/api/slots/balance');}
 history(){return this.request('/api/slots/rounds');}
 round(id){return this.request('/api/slots/rounds/'+encodeURIComponent(id));}
 bind(sessionId,id){
  if(!/^[a-f0-9]{64}$/.test(sessionId))throw Error('INVALID_SESSION_ID');
  if(typeof id!=='string'||!id)throw Error('INVALID_GAME_ID');
  if(sessionId!==this.sessionId||id!==this.game)this.generation++;
  this.sessionId=sessionId;this.game=id;this.key='zplay.machine.pending.'+sessionId+'.'+id;this.actionKey=this.key+'.gamble';
 }
 pending(key=this.key,binding=this.capture()){
  if(!key)return null;const raw=this.storage.getItem(key);if(!raw)return null;
  let pending;try{pending=JSON.parse(raw);}catch{throw Error('SAVED_ROUND_UNREADABLE');}
  if(!pending||pending.sessionId!==binding.sessionId||pending.gameId!==binding.gameId||typeof pending.bet!=='string'||typeof pending.roundToken!=='string'||!tokenPattern.test(pending.roundToken))throw Error('SAVED_ROUND_INVALID');
  return pending;
 }
 ownsPending(expected,key=this.key){
  if(!expected||expected.sessionId!==this.sessionId||expected.gameId!==this.game||!key)return false;
  const current=this.pending(key);return !!current&&['roundToken','sessionId','gameId','bet','roundId','choice'].every(key=>current[key]===expected[key]);
 }
 complete(expected){return this.removeOwned(expected,this.key);}
 completeAction(expected){return this.removeOwned(expected,this.actionKey);}
 removeOwned(expected,key){
  // No blanket removal: a late old response must leave a newer saved request intact.
  if(!this.ownsPending(expected,key))return false;this.storage.removeItem(key);return true;
 }
 legacyPending(){return this.storage.getItem('superwin.nine.spin.'+this.game)!==null;}
 async spin(bet,model=null){
  if(this.busy)throw new ApiError('A round is already being confirmed.');
  const binding=this.capture();if(!binding.sessionId||!binding.gameId)throw Error('MACHINE_SESSION_UNBOUND');
  let pending=this.pending(binding.key,binding);if(pending&&pending.bet!==bet)throw Error('PENDING_BET_CONFLICT');
  if(!pending){pending={gameId:binding.gameId,bet,roundToken:crypto.randomUUID(),sessionId:binding.sessionId,...(model?{mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:model.mathSha256}:{})};this.storage.setItem(binding.key,JSON.stringify(pending));}
  const version=pending.mathVersion||model?.mathVersion,operation={binding,roundToken:pending.roundToken};this.operation=operation;
  try{return await this.request('/api/slots/spin',{gameId:pending.gameId,bet:pending.bet,roundToken:pending.roundToken,...(version?{mathVersion:version}:{})},binding);}
  finally{if(this.operation===operation)this.operation=null;}
 }
 async gamble(round,choice,expected={}){
  if(round?.gameId!==undefined&&round.gameId!==this.game)throw Error('GAMBLE_GAME_MISMATCH');
  if(this.busy)throw new ApiError('A round is already being confirmed.');
  const binding=this.capture();if(!binding.sessionId||!binding.gameId)throw Error('MACHINE_SESSION_UNBOUND');
  let pending=this.pending(binding.actionKey,binding);
  if(pending&&(pending.roundId!==round.roundId||pending.choice!==choice))throw Error('PENDING_GAMBLE_CONFLICT');
  if(!pending){pending={gameId:binding.gameId,bet:round.bet,roundId:round.roundId,choice,roundToken:crypto.randomUUID(),sessionId:binding.sessionId,...expected};this.storage.setItem(binding.actionKey,JSON.stringify(pending));}
  const operation={binding,roundToken:pending.roundToken};this.operation=operation;
  try{return await this.request('/api/slots/gamble',{roundId:pending.roundId,choice:pending.choice,roundToken:pending.roundToken,...(pending.expectedStake!==undefined?{expectedStake:pending.expectedStake}:{}),...(pending.expectedAttempt!==undefined?{expectedAttempt:pending.expectedAttempt}:{}),...(pending.expectedStake===undefined||pending.expectedAttempt===undefined?{replayOnly:true}:{})},binding);}
  finally{if(this.operation===operation)this.operation=null;}
 }
 close(){this.closed=true;this.generation++;for(const controller of this.controllers)controller.abort();this.controllers.clear();}
}
// These explicit errors guarantee rejection before settlement or after rollback.
// Unclassified network/503 failures retain the original token for confirmation.
export function definitelyRejected(error){
 return ([400,402,422].includes(error.status)&&['GAME_BET_OR_TOKEN_INVALID','INVALID_AMOUNT','INSUFFICIENT_FUNDS','INVALID_CHOICE','INVALID_ACTION'].includes(error.code))||(error.status===409&&['GAMBLE_NOT_AVAILABLE','GAMBLE_EXPIRED','GAMBLE_LIMIT','GAMBLE_STAKE_LIMIT','GAMBLE_STATE_CHANGED','NO_GAMBLE_WINNINGS','COLLECT_BONUS_FIRST','GAME_RULES_UPDATED_RELOAD'].includes(error.code))||(error.status===404&&error.code==='ROUND_NOT_FOUND')||(error.status===503&&['HOUSE_RESERVE_INSUFFICIENT','GAME_UNAVAILABLE','SLOT_RELEASE_NOT_ENABLED'].includes(error.code));
}
