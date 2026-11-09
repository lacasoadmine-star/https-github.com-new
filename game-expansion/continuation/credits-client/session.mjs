// Presentation never calculates a result or changes a wallet balance.
const MONEY=/^(0|[1-9]\d{0,18})\.\d{2}$/;
const UNSIGNED=/^(0|[1-9]\d{0,18})$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const cleanError=(code,retryable=false)=>Object.assign(new Error(code),{retryable});
const storagePrefix='zplay-remaining20:pending:v1:';
const definitiveUnavailable=new Set(['LIBRARY_NEW_ROUNDS_DISABLED','NATIVE_ENGINE_ORIGIN_UNAVAILABLE','GAME_REFERENCE_PENDING']);
export function moneyMinor(value){return typeof value==='string'&&MONEY.test(value)?BigInt(value.replace('.','')):null;}
export function formatMoney(value){
 if(typeof value!=='string'||!MONEY.test(value))return '—';
 const [whole,fraction]=value.split('.');return whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+fraction;
}
export function fromMinor(value){
 if(typeof value!=='string'||!/^(0|[1-9]\d*)$/.test(value))return '—';
 const n=BigInt(value);return formatMoney(`${n/100n}.${String(n%100n).padStart(2,'0')}`);
}
export function errorMessage(value){
 const code=String(value||'CONNECTION_FAILED').split(':')[0];
 if(code==='DEMO_SESSION_CHANGED')return 'This demo session ended. Refresh to begin a new credits-only session.';
 if(code==='DEMO_SESSION_LIMIT')return 'This demo session has reached its play limit. Your player balance is unaffected.';
 if(code==='DEMO_CAPACITY_REACHED')return 'Demo sessions are busy. Try again shortly.';
 return ({UNAUTHORIZED:'Sign in to your ZPLAY account to play.',PLAYER_LOGIN_REQUIRED:'Sign in to your ZPLAY account to play.',INSUFFICIENT_FUNDS:'Your balance is below this stake.',LIBRARY_NEW_ROUNDS_DISABLED:'New rounds are temporarily paused.',GAME_REFERENCE_PENDING:'This game is still being prepared.',FINISH_ACTIVE_ROUND:'Finish your active game before starting this one.',ROUND_VERSION_CHANGED:'The round has changed. Review its latest state before continuing.',ROUND_ALREADY_SETTLED:'Your round has already finished.',GAME_RULES_UPDATED_RELOAD:'Game settings changed. Refresh before starting.',LIBRARY_SESSION_CHANGED:'Your player session changed. Refresh to continue.',REQUEST_TIMEOUT:'The connection timed out.',PENDING_STORAGE_UNAVAILABLE:'The browser could not save this action safely. Enable browser storage and refresh.',ACTION_PENDING:'Your previous action needs confirmation. Use Retry.',INVALID_SERVER_RESPONSE:'The game could not confirm the server response.',STATE_REFRESH_REQUIRED:'Refreshing the latest round. New wagers stay paused.',BANKROLL_CAPACITY_UNAVAILABLE:'This stake is temporarily unavailable. Try a smaller stake.',POTENTIAL_PAYOUT_EXCEEDS_ACCOUNT_LIMIT:'This stake exceeds your account limit.',INVALID_STAKE:'Choose a valid stake.'})[code]||'Connection interrupted. Refresh to check your round.';
}
export function getRoundActions(round,game){
 if(round?.status!=='active')return [];
 const supplied=round.actions??game?.actions??game?.controls?.actions??[];
 const values=Array.isArray(supplied)?supplied:Object.keys(supplied||{});
 return values.map(action=>typeof action==='string'?action:action?.id??action?.action??action?.type).filter(value=>typeof value==='string');
}
export class ExpansionSession {
 constructor({gameId,demo=false,fetchImpl=globalThis.fetch?.bind(globalThis),storage=globalThis.sessionStorage,uuid=()=>crypto.randomUUID(),now=Date.now,onChange=()=>{},timeoutMs=7000,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
  if(!/^[a-z0-9_]{1,64}$/.test(gameId||''))throw Error('INVALID_GAME_ID');
  this.gameId=gameId;this.fetch=fetchImpl;this.storage=storage;this.uuid=uuid;this.now=now;this.onChange=onChange;this.timeoutMs=timeoutMs;this.pause=pause;
  if(demo!==false&&!(demo===true&&["multihotwildways_native","multihot5wild_native","multihot5superwilds_native","multihotdeluxe_native","burningice_native","burningice10_native","burningice40_native"].includes(gameId)))throw Error('INVALID_DEMO_MODE');
  this.demo=demo;this.currency=demo?'CREDITS':'ETB';
  this.epoch=0;this.readSequence=0;this.pending=null;this.catalogGame=null;
  this.state={connected:false,authenticated:false,sessionId:'',game:null,balance:null,currency:this.currency,demo,demoCreditsOnly:demo,round:null,accepting:false,otherActiveGame:null,busy:false,confirming:false,recoveryBlocked:false,pending:false,offset:0,message:demo?'Connecting to your demo session…':'Connecting to your player account…',error:false};
 }
 emit(){this.state.pending=!!this.pending;this.onChange({...this.state});}
 setGame(game){if(game?.id!==this.gameId)throw Error('INVALID_GAME_CONFIG');this.catalogGame=game;this.state.game=game;this.emit();}
 key(sessionId){return storagePrefix+this.gameId+':'+sessionId;}
 disconnect(message){
  this.epoch++;this.readSequence++;
  this.state={...this.state,connected:false,authenticated:false,sessionId:'',balance:null,round:null,game:this.catalogGame,accepting:false,otherActiveGame:null,confirming:false,recoveryBlocked:false,message,error:true};
  // Keep the original account's persisted intent. Never attach it to another session.
  this.pending=null;this.emit();
 }
 restorePending(sessionId){
  let saved;try{saved=this.storage?.getItem(this.key(sessionId));}catch{return;}
  if(!saved)return;
  try{
   const entry=JSON.parse(saved),body=JSON.parse(entry.body);
   if(typeof entry.body!=='string'||entry.body.length>8192||entry.sessionId!==sessionId||entry.gameId!==this.gameId||body.game_id!==this.gameId||body.request_id!==entry.requestId||!UUID.test(entry.requestId)||!['start','action'].includes(body.type)||typeof body.model_version!=='string'||entry.type!==body.type||body.type==='start'&&(moneyMinor(body.stake)===null||!body.options||typeof body.options!=='object'||Array.isArray(body.options))||body.type==='action'&&(!UUID.test(body.round_id)||entry.roundId!==body.round_id||!Number.isSafeInteger(body.expected_version)||body.expected_version<0||typeof body.action!=='string'))throw Error();
   this.pending=Object.freeze(entry);
  }catch{this.state.recoveryBlocked=true;this.state.confirming=true;this.state.message='A saved action needs attention. Refresh your player account before playing.';this.state.error=true;}
 }
 savePending(pending){
  try{
   if(!this.storage)throw Error();
   const value=JSON.stringify(pending);this.storage.setItem(this.key(pending.sessionId),value);
   if(this.storage.getItem(this.key(pending.sessionId))!==value)throw Error();
  }catch{throw cleanError('PENDING_STORAGE_UNAVAILABLE');}
  this.pending=Object.freeze(pending);this.emit();
 }
 clearPending(pending){
  if(this.pending!==pending)return;
  try{this.storage?.removeItem(this.key(pending.sessionId));}catch{
   // Retaining an already confirmed receipt only causes another exact replay.
  }
  this.pending=null;
 }
 apply(data){
  if(!this.matchesMode(data)||data.authenticated!==true||data.game?.id!==this.gameId||typeof data.game.version!=='string'||!data.game.version||typeof data.sessionId!=='string'||!data.sessionId||moneyMinor(data.balance)===null)throw cleanError('INVALID_SERVER_RESPONSE',true);
  const next=data.round;
  if(next!==null&&(!next||next.game_id!==this.gameId||typeof next.round_id!=='string'||!['active','settled'].includes(next.status)||!Number.isSafeInteger(next.version)||next.version<0||typeof next.model_version!=='string'||!next.model_version||!UNSIGNED.test(next.stakeMinor)||typeof next.stakeMinor!=='string'||next.status==='settled'&&(typeof next.payoutMinor!=='string'||!UNSIGNED.test(next.payoutMinor))))throw cleanError('INVALID_SERVER_RESPONSE',true);
  const changed=this.state.sessionId!==data.sessionId;
  if(changed){this.pending=null;this.state.round=null;this.state.confirming=false;this.state.recoveryBlocked=false;}
  const previous=this.state.round;
  this.state={...this.state,connected:true,authenticated:true,sessionId:data.sessionId,game:{...this.catalogGame,...data.game.publicConfig,...data.game,math:typeof data.game.math==='object'?data.game.math:data.game.model??data.game.publicConfig?.math??this.catalogGame?.math},balance:data.balance,currency:data.currency,accepting:data.accepting===true,otherActiveGame:typeof data.other_active_game==='string'?data.other_active_game:null,offset:typeof data.server_now==='number'?data.server_now-this.now():this.state.offset,error:false};
  if(next===null||!previous||previous.round_id!==next.round_id||next.version>=previous.version)this.state.round=next;
  if(changed)this.restorePending(data.sessionId);
  this.emit();
 }
 matchesMode(data){return !!data&&data.currency===this.currency&&(this.demo?data.demo===true&&data.demoCreditsOnly===true:data.demo!==true&&data.demoCreditsOnly!==true);}
 async http(url,options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.timeoutMs);
  try{
   const response=await this.fetch(url,{credentials:'same-origin',cache:'no-store',...options,signal:controller.signal});
   let data;try{data=await response.json();}catch{throw cleanError('INVALID_SERVER_RESPONSE',true);}
   if(!response.ok){const code=typeof data?.error==='string'?data.error:'HTTP_'+response.status;throw Object.assign(cleanError(code,!definitiveUnavailable.has(code)&&(response.status>=500||[408,425,429].includes(response.status))),{status:response.status});}
   return data;
  }catch(error){
   if(typeof error.retryable==='boolean')throw error;
   throw cleanError(error.name==='AbortError'?'REQUEST_TIMEOUT':error.message||'CONNECTION_FAILED',true);
  }finally{clearTimeout(timer);}
 }
 async refresh({internal=false,quiet=false}={}){
  if(this.state.busy&&!internal)return null;
  const epoch=this.epoch,sequence=++this.readSequence;
  const current=()=>this.epoch===epoch&&this.readSequence===sequence&&(!this.state.busy||internal);
  try{
   const data=await this.http('/api/remaining20/state?game_id='+encodeURIComponent(this.gameId));
   if(!current())return null;
   this.apply(data);this.state.confirming=this.state.recoveryBlocked;
   if(this.pending){this.state.message='Your last action needs confirmation. Use Retry.';this.state.error=true;}
   else this.setReadyMessage();
   this.emit();return data;
  }catch(error){
   if(!current())return null;
   if(['UNAUTHORIZED','PLAYER_LOGIN_REQUIRED','LIBRARY_SESSION_CHANGED'].includes(error.message))this.disconnect(errorMessage(error.message));
   else {this.state.connected=false;this.state.message=this.pending?'Your last action needs confirmation. Use Retry.':errorMessage(error.message);this.state.error=true;this.emit();}
   return null;
  }
 }
 setReadyMessage(){
  this.state.error=!!this.state.recoveryBlocked;
  this.state.message=this.state.recoveryBlocked?'A saved action could not be verified. Open your player account for help before playing.':this.pending?'Your last action needs confirmation. Use Retry.':this.state.otherActiveGame?'Finish your other active game to play here.':this.state.round?.status==='active'?'Your round is active. Choose your next action.':!this.state.accepting?'New rounds are temporarily paused.':this.state.game?.launchable===false?'This game is still being prepared.':'Choose your stake and play.';
 }
 canStart(){const s=this.state;return !!(s.connected&&s.authenticated&&s.sessionId&&typeof s.game?.version==='string'&&s.game.version&&moneyMinor(s.game.minStake)!==null&&moneyMinor(s.game.maxStake)!==null&&s.game.launchable!==false&&s.accepting&&!s.otherActiveGame&&s.round?.status!=='active'&&!s.busy&&!s.confirming&&!s.recoveryBlocked&&!this.pending);}
 canAct(action){const s=this.state;return !!(s.connected&&s.authenticated&&s.sessionId&&s.round?.status==='active'&&!s.busy&&!s.confirming&&!s.recoveryBlocked&&!this.pending&&getRoundActions(s.round,s.game).includes(action));}
 async start(stake,options={}){
  if(!this.canStart())return false;
  const amount=moneyMinor(stake),minimum=moneyMinor(this.state.game.minStake),maximum=moneyMinor(this.state.game.maxStake);
  if(amount===null||amount<=0n||minimum!==null&&amount<minimum||maximum!==null&&amount>maximum){this.state.message=errorMessage('INVALID_STAKE');this.state.error=true;this.emit();return false;}
  if(moneyMinor(this.state.balance)<amount){this.state.message=errorMessage('INSUFFICIENT_FUNDS');this.state.error=true;this.emit();return false;}
  return this.run({request_id:this.uuid(),type:'start',game_id:this.gameId,model_version:this.state.game.version,stake,options});
 }
 async act(action,input={}){
  if(!this.canAct(action))return false;
  const round=this.state.round;
  return this.run({request_id:this.uuid(),type:'action',game_id:this.gameId,model_version:round.model_version,round_id:round.round_id,expected_version:round.version,action,input});
 }
 async retry(){
  if(this.state.busy||!this.pending)return false;
  const pending=this.pending;
  // Read identity first. A pending wager can only be retried in its original account.
  if(!await this.refresh({quiet:true})||this.pending!==pending||this.state.sessionId!==pending.sessionId)return false;
  return this.run();
 }
 async submit(pending){
  for(let attempt=0;attempt<3;attempt++){
   if(this.pending!==pending||this.state.sessionId!==pending.sessionId)throw cleanError('LIBRARY_SESSION_CHANGED');
   try{
    const data=await this.http('/api/remaining20/action',{method:'POST',headers:{'content-type':'application/json','X-Zplay-Library-Session':pending.sessionId},body:pending.body});
    if(!this.matchesMode(data)||data.status!=='SUCCESS'||data.request_id!==pending.requestId||data.game_id!==this.gameId||data.sessionId!==pending.sessionId||data.authenticated!==true)throw cleanError('INVALID_SERVER_RESPONSE',true);
    return data;
   }catch(error){if(!error.retryable||attempt===2)throw error;await this.pause(attempt===0?160:400);}
  }
 }
 async run(body){
  if(this.state.busy||body&&this.pending)return false;
  let pending=this.pending;
  if(body){
   try{this.savePending({body:JSON.stringify(body),requestId:body.request_id,sessionId:this.state.sessionId,gameId:this.gameId,type:body.type,roundId:body.round_id??null,createdAt:this.now()});pending=this.pending;}
   catch(error){this.state.message=errorMessage(error.message);this.state.error=true;this.emit();return false;}
  }
  if(!pending||pending.sessionId!==this.state.sessionId)return false;
  this.epoch++;this.state.busy=true;this.state.message='Confirming your action…';this.state.error=false;this.emit();
  try{
   const data=await this.submit(pending);
   if(this.state.sessionId!==pending.sessionId)throw cleanError('LIBRARY_SESSION_CHANGED');
   if(data.replayed){
    this.state.confirming=true;
    const latest=await this.refresh({internal:true,quiet:true});
    if(!latest||latest.sessionId!==pending.sessionId){this.state.confirming=true;this.state.message=errorMessage('STATE_REFRESH_REQUIRED');this.state.error=true;return false;}
   }else this.apply(data);
   this.clearPending(pending);this.state.confirming=false;this.setReadyMessage();return true;
  }catch(error){
   if(!error.retryable&&!['UNAUTHORIZED','PLAYER_LOGIN_REQUIRED','LIBRARY_SESSION_CHANGED'].includes(error.message))this.clearPending(pending);
   if(['UNAUTHORIZED','PLAYER_LOGIN_REQUIRED','LIBRARY_SESSION_CHANGED'].includes(error.message))this.disconnect(errorMessage(error.message));
   else {this.state.confirming=!this.pending;await this.refresh({internal:true,quiet:true});this.state.message=this.pending?'Your last action needs confirmation. Use Retry.':errorMessage(error.message);this.state.error=true;}
   return false;
  }finally{this.state.busy=false;this.epoch++;this.emit();}
 }
}

// Existing player presence events invalidate identity immediately.
export function bindPlayerEvents(target,client){
 if(client.demo===true)return()=>{};
 const listeners={
  'zplay:logout':()=>client.disconnect('Sign in to your ZPLAY account to play.'),
  'zplay:session-expired':()=>client.disconnect('Your session expired. Sign in to continue.'),
  'zplay:session-changing':()=>client.disconnect('Your player session is changing. Please wait.'),
  'zplay:session-ready':()=>{void client.refresh({quiet:true});}
 };
 for(const [name,handler]of Object.entries(listeners))target.addEventListener(name,handler);
 return ()=>{for(const [name,handler]of Object.entries(listeners))target.removeEventListener(name,handler);};
}
