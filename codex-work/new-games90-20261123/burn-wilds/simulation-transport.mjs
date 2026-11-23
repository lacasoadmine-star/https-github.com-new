import {BURN_WILDS_GAME_ID} from './expansion.mjs';

export const BURN_TEST_BASE='/api/slots/new-games90/burn-wilds/test';
export const BURN_TEST_SESSION_KEY='zplay.burn-wilds.server-test-session.v1';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tokenPattern=/^[0-9a-f]{64}$/i;
const clone=value=>structuredClone(value);
const failure=(code,status)=>Object.assign(new Error(code),{code,status});
const validMinor=value=>Number.isSafeInteger(value)&&value>=0;

/** The only balance here is the existing Railway service's explicit test
 * simulation. This transport cannot call a cash endpoint or authenticate a
 * Player. Only the opaque test-session credential is retained locally. */
export function createBurnWildsSimulationTransport({
  fetcher=globalThis.fetch,storage=globalThis.sessionStorage,timeoutMs=15000
}={}){
  if(typeof fetcher!=='function'||!storage||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)
    throw failure('BURN_TEST_DEPENDENCIES');
  let current=null;
  const savedToken=()=>{const value=storage.getItem(BURN_TEST_SESSION_KEY);return tokenPattern.test(value||'')?value:null;};
  function simulation(source){
    if(source?.mode!=='SIMULATION'||source.cashEnabled!==false)
      throw failure('BURN_TEST_RESPONSE_MODE');
    return source;
  }
  function normalizeState(source){
    simulation(source);
    if(source.gameId!==BURN_WILDS_GAME_ID||source.currency!=='ETB'||source.authenticated!==false||
      typeof source.subject!=='string'||!/^bt_[0-9a-f-]{36}$/i.test(source.subject)||
      typeof source.canPlay!=='boolean'||!validMinor(source.balanceMinor)||!validMinor(source.pendingWinMinor)||
      !Array.isArray(source.betLevelsMinor)||source.betLevelsMinor.length===0||
      source.betLevelsMinor.some(value=>!Number.isSafeInteger(value)||value<=0)||
      new Set(source.betLevelsMinor).size!==source.betLevelsMinor.length)
      throw failure('BURN_TEST_STATE_CONTRACT');
    return clone(source);
  }
  async function request(route,{body,anonymous=false}={}){
    const session=anonymous?null:savedToken();
    if(!anonymous&&!session)throw failure('BURN_TEST_SESSION_REQUIRED',401);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetcher(BURN_TEST_BASE+'/'+route,{
        method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',
        signal:controller.signal,headers:{accept:'application/json',
          ...(body===undefined?{}:{'content-type':'application/json'}),
          ...(session?{'x-burn-test-session':session}:{})},
        ...(body===undefined?{}:{body:JSON.stringify(body)})
      });
      if(response.redirected||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
        throw failure('BURN_TEST_RESPONSE_TYPE',response.status);
      const data=simulation(await response.json());
      if(!response.ok){
        const code=typeof data.code==='string'&&/^[A-Z0-9_.:-]{1,120}$/.test(data.code)?data.code:'BURN_TEST_REQUEST_FAILED';
        const error=failure(code,response.status);
        // An ambiguous disconnect must retain the original request journal.
        error.definitiveRejection=data.definitiveRejection===true&&[400,401,402,403,404,409,410,413,415,422,429].includes(response.status);
        throw error;
      }
      return data;
    }finally{clearTimeout(timer);}
  }
  async function createSession(){
    if(savedToken())throw failure('BURN_TEST_SESSION_ALREADY_EXISTS');
    const result=await request('session',{anonymous:true,body:{mode:'SIMULATION'}});
    if(!tokenPattern.test(result.testSessionToken||''))throw failure('BURN_TEST_SESSION_CONTRACT');
    const state=normalizeState(result.state);
    storage.setItem(BURN_TEST_SESSION_KEY,result.testSessionToken);
    current=state;
    return clone(current);
  }
  async function state(){
    current=null;
    current=normalizeState(await request('state'));
    return clone(current);
  }
  function prepare(intent){
    if(!current?.canPlay||intent?.gameId!==BURN_WILDS_GAME_ID||!uuid.test(intent.requestKey||'')||
      !['SPIN','TAKE','DOUBLE'].includes(intent.action))throw failure('BURN_TEST_ACTION_NOT_READY');
    if(intent.action==='SPIN'&&(!current.betLevelsMinor.includes(intent.betMinor)||typeof intent.auto!=='boolean'||
      intent.collectRoundId!==(current.pendingWinMinor>0?current.round?.roundId:null)))
      throw failure('BURN_TEST_SPIN_CONTRACT');
    if(intent.action!=='SPIN'&&(current.pendingWinMinor<=0||intent.roundId!==current.round?.roundId))
      throw failure('BURN_TEST_PENDING_WIN_REQUIRED');
    if(intent.action==='DOUBLE'&&(!current.canDouble||!['RED','BLACK'].includes(intent.choice)||
      intent.expectedStakeMinor!==current.pendingWinMinor))throw failure('BURN_TEST_DOUBLE_CONTRACT');
    return Object.freeze({...clone(intent),testSubject:current.subject});
  }
  async function send(action,replayOnly){
    if(!current||action?.gameId!==BURN_WILDS_GAME_ID||action.testSubject!==current.subject||
      !uuid.test(action.requestKey||'')||!['SPIN','TAKE','DOUBLE'].includes(action.action))
      throw failure('BURN_TEST_ACTION_IDENTITY');
    const body={...clone(action),...(replayOnly?{replayOnly:true}:{})};
    const result=await request(action.action.toLowerCase(),{body});
    if(result.gameId!==BURN_WILDS_GAME_ID||result.requestKey!==action.requestKey||
      result.subject!==current.subject||!validMinor(result.balanceMinor)||!validMinor(result.pendingWinMinor))
      throw failure('BURN_TEST_RECEIPT_CONTRACT');
    current={...current,balanceMinor:result.balanceMinor,pendingWinMinor:result.pendingWinMinor,
      canDouble:result.canDouble===true,...(action.action==='SPIN'?{round:clone(result)}:{})};
    return clone(result);
  }
  return Object.freeze({mode:'SIMULATION',cashEnabled:false,serverAuthoritative:true,
    hasSession:()=>!!savedToken(),createSession,state,prepare,
    dispatch:action=>send(action,false),recover:action=>send(action,true),
    history:()=>request('history'),logs:()=>request('logs')});
}
