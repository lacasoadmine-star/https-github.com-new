// The existing ETB backend owns every balance and transaction.
export class ApiError extends Error {constructor(message,status=0,code=''){super(message);this.status=status;this.code=code;}}
export class WalletAdapter {
 constructor({fetcher=(...args)=>globalThis.fetch(...args),storage=globalThis.sessionStorage,timeout=22000}={}){this.fetcher=fetcher;this.storage=storage;this.timeout=timeout;this.controllers=new Set();this.closed=false;this.busy=false;}
 async request(path,body){if(this.closed)throw new ApiError('Game closed');const controller=new AbortController();this.controllers.add(controller);const timer=setTimeout(()=>controller.abort(),this.timeout);
  try{const response=await this.fetcher(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{accept:'application/json',...(body?{'content-type':'application/json','X-Zplay-Machine-Session':this.sessionId}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal});let data;try{data=await response.json();}catch{throw new ApiError('The server response was interrupted. Confirm the saved round.');}if(!response.ok)throw new ApiError(typeof data.detail==='string'?data.detail:'Service unavailable',response.status,data.detail||data.error||'');return data;}
  catch(e){if(e.name==='AbortError')throw new ApiError('Connection timed out. Confirm the saved round.');throw e;}finally{clearTimeout(timer);this.controllers.delete(controller);}
 }
 session(){return this.request('/api/machine-session');}
 model(id){return this.request('/api/slots/games/'+encodeURIComponent(id));}
 state(id){return this.request('/api/slots/state/'+encodeURIComponent(id));}
 balance(){return this.request('/api/slots/balance');}
 history(){return this.request('/api/slots/rounds');}
 round(id){return this.request('/api/slots/rounds/'+encodeURIComponent(id));}
 bind(sessionId,id){if(!/^[a-f0-9]{64}$/.test(sessionId))throw Error('INVALID_SESSION_ID');this.sessionId=sessionId;this.game=id;this.key='zplay.machine.pending.'+sessionId+'.'+id;this.actionKey=this.key+'.gamble';}
 pending(key=this.key){if(!key)return null;const raw=this.storage.getItem(key);if(!raw)return null;let p;try{p=JSON.parse(raw);}catch{throw Error('SAVED_ROUND_UNREADABLE');}if(!p||p.sessionId!==this.sessionId||p.gameId!==this.game||typeof p.bet!=='string'||typeof p.roundToken!=='string'||!/^[a-f0-9-]{36}$/.test(p.roundToken))throw Error('SAVED_ROUND_INVALID');return p;}
 legacyPending(){const keys=['superwin.nine.spin.'+this.game,...(this.game==='multi_hot_5_video'?['mh5-video.pending','mh5-video.gamble']:[])];return keys.some(k=>this.storage.getItem(k)!==null);}
 async spin(bet,model=null){if(this.busy)throw new ApiError('A round is already being confirmed.');let pending=this.pending();if(pending&&pending.bet!==bet)throw Error('PENDING_BET_CONFLICT');if(!pending){pending={gameId:this.game,bet,roundToken:crypto.randomUUID(),sessionId:this.sessionId,...(model?{mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:model.mathSha256}:{})};this.storage.setItem(this.key,JSON.stringify(pending));}
  // Old tokens deliberately remain unmodified. The server checks replay before
  // the current paid-model guard, so an old settled receipt keeps its own rules.
  const version=pending.mathVersion||model?.mathVersion;
  this.busy=true;try{return await this.request('/api/slots/spin',{gameId:pending.gameId,bet:pending.bet,roundToken:pending.roundToken,...(version?{mathVersion:version}:{})});}finally{this.busy=false;}
 }
 complete(){this.storage.removeItem(this.key);}
 async gamble(round,choice,expected={}){if(round?.gameId!==undefined&&round.gameId!==this.game)throw Error('GAMBLE_GAME_MISMATCH');if(this.busy)throw new ApiError('A round is already being confirmed.');let p=this.pending(this.actionKey);if(p&&(p.roundId!==round.roundId||p.choice!==choice))throw Error('PENDING_GAMBLE_CONFLICT');if(!p){p={gameId:this.game,bet:round.bet,roundId:round.roundId,choice,roundToken:crypto.randomUUID(),sessionId:this.sessionId,...expected};this.storage.setItem(this.actionKey,JSON.stringify(p));}this.busy=true;try{return await this.request('/api/slots/gamble',{roundId:p.roundId,choice:p.choice,roundToken:p.roundToken,...(p.expectedStake!==undefined?{expectedStake:p.expectedStake}:{}),...(p.expectedAttempt!==undefined?{expectedAttempt:p.expectedAttempt}:{}),...(p.expectedStake===undefined||p.expectedAttempt===undefined?{replayOnly:true}:{})});}finally{this.busy=false;}}
 completeAction(){this.storage.removeItem(this.actionKey);}
 close(){this.closed=true;for(const c of this.controllers)c.abort();this.controllers.clear();}
}
export function definitelyRejected(e){return ([400,402,422].includes(e.status)&&['GAME_BET_OR_TOKEN_INVALID','INVALID_AMOUNT','INSUFFICIENT_FUNDS','INVALID_CHOICE','INVALID_ACTION'].includes(e.code))||(e.status===409&&['GAMBLE_NOT_AVAILABLE','GAMBLE_EXPIRED','GAMBLE_LIMIT','GAMBLE_STAKE_LIMIT','GAMBLE_STATE_CHANGED','NO_GAMBLE_WINNINGS','COLLECT_BONUS_FIRST','GAME_RULES_UPDATED_RELOAD'].includes(e.code))||(e.status===404&&e.code==='ROUND_NOT_FOUND');}
