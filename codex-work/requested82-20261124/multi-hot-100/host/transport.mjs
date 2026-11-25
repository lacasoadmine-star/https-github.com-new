import {VIEW_GAME_ID,BACKEND_GAME_ID,MODEL_VERSION,MODEL_SHA256,UUID,fail,frozen,clone,minor,money,validateEnvelope,hostPolicy} from './model.mjs';
import {roundFacts,spinView,collectView,gambleView} from './receipt.mjs';

export const M100_PENDING_KEY='zplay.player.pending.m100.existing-host.v1';
export const M100_STATE_PATH='/api/remaining20/state?game_id='+BACKEND_GAME_ID;
export const M100_ACTION_PATH='/api/remaining20/action';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const light=state=>({sessionId:state.sessionId,balance:state.balance,round:clone(state.round),authenticated:true,currency:'ETB',accepting:state.accepting===true,
 ...(state.status?{status:state.status,request_id:state.request_id,game_id:state.game_id}:{}),...(state.replayed===true?{replayed:true}:{})});
const normalIntent=intent=>{
 if(intent?.gameId!==VIEW_GAME_ID||intent.currency!=='ETB'||!UUID.test(intent.requestKey??'')||!['SPIN','TAKE_WIN','GAMBLE'].includes(intent.kind))throw fail('M100_HOST_INTENT');
 if(intent.kind==='SPIN'){minor(intent.bet);if(intent.collectRoundId!==null&&!UUID.test(intent.collectRoundId??''))throw fail('M100_HOST_COLLECT_INTENT');}
 else if(!UUID.test(intent.roundId??''))throw fail('M100_HOST_ACTION_ROUND');
 if(intent.kind==='GAMBLE'&&!['red','black'].includes(intent.choice))throw fail('M100_HOST_GAMBLE_CHOICE');
 return frozen(clone(intent));
};
const actionBody=(key,round,action,input={})=>({request_id:key,type:'action',game_id:BACKEND_GAME_ID,model_version:MODEL_VERSION,round_id:round.round_id,expected_version:round.version,action,input});
function plan(intent,before,collectKey=null){
 const result=[],facts=before.round?roundFacts(before.round):null;
 const rawActions=before.round?.actions??['collect','gamble'];
 const actions=(Array.isArray(rawActions)?rawActions:Object.keys(rawActions??{})).map(item=>typeof item==='string'?item:item?.id??item?.action??item?.type);
 const requireAction=action=>{if(!actions.includes(action))throw fail('M100_HOST_ACTION_UNAVAILABLE');};
 if(intent.kind==='SPIN'){
  if(facts?.round.status==='active'){
   if(intent.collectRoundId!==facts.round.round_id||!UUID.test(collectKey??'')||collectKey===intent.requestKey)throw fail('M100_HOST_FINISH_PENDING_WIN');
   requireAction('collect');result.push({kind:'PRECOLLECT',body:actionBody(collectKey,before.round,'collect')});
  }else if(intent.collectRoundId!==null&&intent.collectRoundId!==facts?.round.round_id)throw fail('M100_HOST_PRIOR_ROUND_CHANGED');
  result.push({kind:'SPIN',body:{request_id:intent.requestKey,type:'start',game_id:BACKEND_GAME_ID,model_version:MODEL_VERSION,stake:intent.bet,options:{autoCollect:false}}});
 }else{
  if(!facts||facts.round.round_id!==intent.roundId)throw fail('M100_HOST_ROUND_CHANGED');
  if(intent.kind==='TAKE_WIN'){if(facts.round.status==='active')requireAction('collect');result.push({kind:facts.round.status==='settled'?'SETTLED_TAKE':'TAKE_WIN',body:facts.round.status==='settled'?null:actionBody(intent.requestKey,before.round,'collect')});}
  else{
   if(facts.round.status!=='active'||facts.current<=0n||facts.current>50000n||facts.history.length>=5)throw fail('M100_HOST_GAMBLE_UNAVAILABLE');
   requireAction('gamble');result.push({kind:'GAMBLE',body:actionBody(intent.requestKey,before.round,'gamble',{color:intent.choice})});
  }
 }
 return result;
}

/** Current own view -> already approved native M100, with its existing account,
 * authoritative wallet, journal and collection actions. No new outcome engine. */
export function createExistingM100Transport({fetcher=globalThis.fetch,storage=globalThis.localStorage,sessionStorage=globalThis.sessionStorage,
 keyFactory=()=>crypto.randomUUID(),timeoutMs=20000}={}){
 if(typeof fetcher!=='function'||!storage?.getItem||!storage?.setItem||!storage?.removeItem||typeof keyFactory!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<1)throw fail('M100_HOST_DEPENDENCIES');
 let account=null,job=null,busy=false,generation=0,disposed=false,connected=false;
 const completed=new Map();
 function legacyPending(sessionId){const key='zplay-remaining20:pending:v1:'+BACKEND_GAME_ID+':'+sessionId;
  try{if(storage.getItem(key)||sessionStorage?.getItem(key))throw fail('M100_EXISTING_PENDING_ACTION');}catch(error){if(error?.code)throw error;throw fail('M100_HOST_STORAGE_UNAVAILABLE');}}
 async function request(path,body=null,sessionId=null){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{const response=await fetcher(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,
   headers:{accept:'application/json',...(body?{'content-type':'application/json','X-Zplay-Library-Session':sessionId}:{})},...(body?{body:JSON.stringify(body)}:{})});
   if(response.redirected)throw fail('M100_HOST_REDIRECT');
   let raw;try{raw=await response.json();}catch{throw fail('M100_HOST_INVALID_RESPONSE',response.status);}
   if(!response.ok){const error=fail(typeof raw?.error==='string'?raw.error:'M100_HOST_HTTP_'+response.status,response.status);
    error.definitiveRejection=[400,402,422].includes(response.status);throw error;}
   return raw;
  }finally{clearTimeout(timer);}
 }
 function ensureGeneration(version){if(disposed||version!==generation)throw fail('M100_HOST_STALE_SESSION');}
 function validateSnapshot(snapshot){
  if(!snapshot||snapshot.sessionId!==account?.sessionId||snapshot.currency!=='ETB'||snapshot.authenticated!==true)throw fail('M100_HOST_JOURNAL_SESSION');
  minor(snapshot.balance);if(snapshot.round!==null)roundFacts(snapshot.round);return snapshot;
 }
 function validateJob(value){
  if(value?.schema!=='zplay/m100-existing-host-operation/v1'||value.viewGameId!==VIEW_GAME_ID||value.backendGameId!==BACKEND_GAME_ID||
   value.modelVersion!==MODEL_VERSION||value.modelSha256!==MODEL_SHA256||value.sessionId!==account?.sessionId||!Array.isArray(value.checkpoints)||value.checkpoints.length>2)throw fail('M100_HOST_JOURNAL_IDENTITY');
  const intent=normalIntent(value.intent),before=validateSnapshot(value.before);
  if(intent.kind==='SPIN'&&!account.game.stakeValues.includes(intent.bet))throw fail('M100_HOST_JOURNAL_STAKE');
  const steps=plan(intent,before,value.collectKey);
  if(!same(steps,value.steps)||value.checkpoints.length>steps.length)throw fail('M100_HOST_JOURNAL_STEPS');
  let prior=before;
  value.checkpoints.forEach((checkpoint,index)=>{const step=steps[index],state=validateEnvelope({...checkpoint,game:account.game},{sessionId:account.sessionId,requestId:step.body?.request_id??null});
   verifyStep(step,state,intent,prior);prior=light(state);});
  return clone(value);
 }
 function encoded(){if(!job)return null;return JSON.stringify(job);}
 function save(){
  const value=encoded();if(!value||value.length>262144)throw fail('M100_HOST_JOURNAL_SIZE');
  try{storage.setItem(M100_PENDING_KEY,value);if(storage.getItem(M100_PENDING_KEY)!==value)throw Error();}catch{throw fail('M100_HOST_STORAGE_UNAVAILABLE');}
 }
 function assertOwnership(){try{if(storage.getItem(M100_PENDING_KEY)!==encoded())throw fail('M100_HOST_JOURNAL_CHANGED');}catch(error){if(error?.code)throw error;throw fail('M100_HOST_STORAGE_UNAVAILABLE');}}
 function clear(){assertOwnership();try{storage.removeItem(M100_PENDING_KEY);if(storage.getItem(M100_PENDING_KEY)!==null)throw Error();}catch{throw fail('M100_HOST_STORAGE_UNAVAILABLE');}job=null;}
 function restore(){let value;try{value=storage.getItem(M100_PENDING_KEY);}catch{throw fail('M100_HOST_STORAGE_UNAVAILABLE');}
  if(value!==null){if(typeof value!=='string'||value.length>262144)throw fail('M100_HOST_JOURNAL_SIZE');let parsed;try{parsed=JSON.parse(value);}catch{throw fail('M100_HOST_JOURNAL_JSON');}job=validateJob(parsed);}}
 function verifyStep(step,state,intent,before){
  if(step.kind==='SPIN')return spinView(state,intent,before);
  if(step.kind==='GAMBLE')return gambleView(state,intent,before);
  const take=step.kind==='PRECOLLECT'?{...intent,kind:'TAKE_WIN',requestKey:step.body.request_id,roundId:before.round.round_id}:intent;
  return collectView(state,take,before,{alreadySettled:step.kind==='SETTLED_TAKE'});
 }
 async function readFresh({initial=false}={}){
  const version=generation,raw=await request(M100_STATE_PATH);ensureGeneration(version);
  const next=validateEnvelope(raw,{sessionId:initial?null:account?.sessionId});
  if(next.round)roundFacts(next.round);legacyPending(next.sessionId);if(account&&account.sessionId!==next.sessionId)completed.clear();account=next;connected=true;return next;
 }
 async function connect(){
  if(busy||disposed)throw fail('M100_HOST_BUSY');busy=true;const version=++generation;
  try{await readFresh({initial:true});ensureGeneration(version);restore();}finally{busy=false;}
  return snapshot();
 }
 function snapshot(){
  const policy=account?hostPolicy(account):null,facts=account?.round?roundFacts(account.round):null;
  const restoreView=facts?{gameId:VIEW_GAME_ID,backendGameId:BACKEND_GAME_ID,currency:'ETB',requestKey:facts.round.round_id,roundId:facts.round.round_id,bet:money(facts.stake),
   winAmount:money(facts.current),grid:facts.grid,multiplier:facts.multiplier,balance:account.balance,winningLines:facts.winningLines,winTier:null,collected:facts.round.status==='settled',readOnlyRestoration:true}:null;
  return frozen({connected:connected&&!disposed,hostPolicy:policy,pendingIntent:job?clone(job.intent):null,pendingRequest:!!job,
   backendGameId:BACKEND_GAME_ID,sessionId:account?.sessionId??null,accepting:account?.accepting===true,otherActiveGame:typeof account?.other_active_game==='string'?account.other_active_game:null,canStart:!!account&&account.accepting===true&&!account.other_active_game&&!job&&!busy,
   balance:account?.balance??null,round:account?.round?clone(account.round):null,restoreView});
 }
 async function run(onDispatch=()=>{}){
  const version=generation,operation=job;if(!operation)throw fail('M100_HOST_NO_PENDING_OPERATION');
  // Persisted checkpoints are recovery hints, never proof of server acceptance.
  // Every recovery replays every original UUID, even a completed stored hint.
  let before=operation.before,result;
  for(let index=0;index<operation.steps.length;index++){
   assertOwnership();ensureGeneration(version);const step=operation.steps[index];
   if(step.body)onDispatch();
   const raw=step.body?await request(M100_ACTION_PATH,step.body,operation.sessionId):await request(M100_STATE_PATH);
   ensureGeneration(version);if(job!==operation)throw fail('M100_HOST_OPERATION_CHANGED');
   const state=validateEnvelope(raw,{sessionId:operation.sessionId,requestId:step.body?.request_id??null});
   result=verifyStep(step,state,operation.intent,before);
   const checkpoint=light(state),priorCheckpoints=clone(operation.checkpoints);operation.checkpoints[index]=checkpoint;operation.checkpoints.length=index+1;
   // Persist the accepted collection checkpoint before starting the next paid
   // spin. If storage fails, recovery replays the exact already-journaled UUID.
   try{save();}catch(error){operation.checkpoints=priorCheckpoints;throw error;}account=state;before=checkpoint;
  }
  if(!result){const index=operation.steps.length-1;result=verifyStep(operation.steps[index],{...operation.checkpoints[index],game:account.game},operation.intent,index?operation.checkpoints[index-1]:operation.before);}
  completed.set(operation.intent.requestKey,{intent:clone(operation.intent),result});clear();return result;
 }
 async function submit(input){
  const intent=normalIntent(input);
  if(disposed||busy||!account||!connected)throw fail('M100_HOST_NOT_CONNECTED');
  if(completed.has(intent.requestKey)){const old=completed.get(intent.requestKey);if(!same(old.intent,intent))throw fail('M100_HOST_REQUEST_KEY_CONFLICT');return old.result;}
  if(job||storage.getItem(M100_PENDING_KEY)!==null)throw fail('M100_HOST_RECOVERY_REQUIRED');
  busy=true;let dispatched=false,createdJob=null;
  try{
   await readFresh();
   const pendingFunds=account.round?.status==='active'&&intent.collectRoundId===account.round.round_id?roundFacts(account.round).current:0n;
   if(intent.kind==='SPIN'&&(!account.accepting||account.other_active_game||!account.game.stakeValues.includes(intent.bet)||minor(account.balance)+pendingFunds<minor(intent.bet)))throw fail('M100_HOST_WAGER_UNAVAILABLE');
   // Recheck after the asynchronous state read so a second view cannot
   // overwrite a request that was journaled while this GET was in flight.
   if(storage.getItem(M100_PENDING_KEY)!==null)throw fail('M100_HOST_RECOVERY_REQUIRED');legacyPending(account.sessionId);
   const before=light(account),collectKey=intent.kind==='SPIN'&&before.round?.status==='active'?keyFactory():null,steps=plan(intent,before,collectKey);
   job={schema:'zplay/m100-existing-host-operation/v1',viewGameId:VIEW_GAME_ID,backendGameId:BACKEND_GAME_ID,modelVersion:MODEL_VERSION,modelSha256:MODEL_SHA256,
    sessionId:account.sessionId,intent:clone(intent),before,collectKey,steps,checkpoints:[]};
   createdJob=job;save();return await run(()=>{dispatched=true;});
  }catch(error){
   if(!dispatched){
    // This is a local/no-POST failure, so the presentation intent is safely
    // cancellable. Never apply this to a possibly accepted HTTP request.
    error.safeToCancel=true;error.noWagerDispatched=true;
    if(createdJob&&job===createdJob){try{const value=storage.getItem(M100_PENDING_KEY);if(value===encoded()){storage.removeItem(M100_PENDING_KEY);if(storage.getItem(M100_PENDING_KEY)!==null)throw Error();job=null;}else if(value===null)job=null;}catch{ /* Retain the unsent journal while storage is inaccessible. */ }}
   }
   throw error;
  }finally{busy=false;}
 }
 async function recover(input){
  const intent=normalIntent(input);
  if(disposed||busy||!account||!job||!same(job.intent,intent))throw fail('M100_HOST_RECOVERY_IDENTITY');
  busy=true;const version=generation;
  try{
   // The read checks the original account/session and model, while accepted
   // action validation still uses the original journaled pre-action snapshot.
   await readFresh();ensureGeneration(version);restore();if(!job||!same(job.intent,intent))throw fail('M100_HOST_RECOVERY_IDENTITY');assertOwnership();return await run();
  }finally{busy=false;}
 }
 function disconnect(){generation++;connected=false;account=null;completed.clear();}
 function dispose(){disconnect();disposed=true;}
 return Object.freeze({connect,submit,recover,snapshot,disconnect,dispose});
}
