import {createExistingLibrary74Adapter} from './existing-library74-adapter.mjs';
import {listGameDefinitions} from '../math/official72.mjs';
import {secureUnitRandom} from './demo74-rng.mjs';

const PREFIX = '/independent74-demo-internal/';
const LEDGER_KEY = 'independent74:demo:ledger:v1';
const INITIAL_MINOR = '1000000'; // 10,000 free DEMO credits; never ETB.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GUARD = /^[a-f0-9]{64}$/;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const ids = listGameDefinitions().map(game => game.id);
const adapter = createExistingLibrary74Adapter({reviewedGameIds:ids,allowNewRounds:true,
  gameLimits:Object.fromEntries(ids.map(id => [id,{maxBetMinor:'2000',maxWinMinor:'999999999999999'}]))});
const gameDefinitions = adapter.definitions;
const cash = value => {const n=BigInt(value);return `${n/100n}.${String(n%100n).padStart(2,'0')}`;};
const clone = value => structuredClone(value);
function fail(code,status=422) {throw Object.assign(new Error(code),{code,status});}
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
function canonical(value) {return Array.isArray(value)?value.map(canonical):record(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;}
const keyRound = id => 'independent74:demo:round:'+id;
const keyRequest = id => 'independent74:demo:request:'+id;
function definition(id) {
  const d=gameDefinitions[id];if(!d)fail('GAME_MODEL_UNAVAILABLE',404);
  return {...clone(d),currency:'DEMO',mode:'demo',freePlay:true,realMoney:false};
}
export function demo74Catalog() {
  return {mode:'demo',currency:'DEMO',freePlay:true,realMoney:false,initialCredits:'10000.00',games:ids.map(definition)};
}
function validate(body) {
  if(!record(body)||!UUID.test(body.request_id)||!ids.includes(body.game_id)||typeof body.model_version!=='string')fail('INVALID_LIBRARY_REQUEST');
  const allowed=body.type==='start'?['request_id','type','game_id','model_version','stake','options']
    :body.type==='action'?['request_id','type','game_id','model_version','round_id','expected_version','action','input']:[];
  if(!allowed.length||Object.keys(body).some(key=>!allowed.includes(key)))fail('INVALID_LIBRARY_REQUEST');
  if(body.type==='start') {
    if(typeof body.stake!=='string'||!/^(?:[1-9]|1[0-9]|20)\.00$/.test(body.stake))fail('INVALID_BET');
    if(body.options!==undefined&&!record(body.options))fail('INVALID_LIBRARY_OPTIONS');
    if(Object.keys(body.options??{}).some(key=>['stakeMinor','gameId','status','payoutMinor','maxPayoutMinor','expiresAt','modelVersion'].includes(key)))fail('INVALID_LIBRARY_OPTIONS');
  } else {
    if(!UUID.test(body.round_id)||!Number.isSafeInteger(body.expected_version)||body.expected_version<0||!['reveal','collect','sync','gamble'].includes(body.action)||body.input!==undefined&&!record(body.input)||Object.hasOwn(body.input??{},'type'))fail('INVALID_LIBRARY_ACTION');
  }
  return {...body,request_id:body.request_id.toLowerCase(),...(body.round_id?{round_id:body.round_id.toLowerCase()}: {})};
}

// ctx.storage belongs to an isolated ID inside the EXISTING LocalDemoWallet DO
// namespace. The real account ledger, native backend, and legacy DO keys are
// never called or read. A single storage transaction owns each credit transition.
export async function handleDemo74Request(ctx,request,{now=()=>Date.now(),random=secureUnitRandom,uuid=()=>crypto.randomUUID()}={}) {
  try {
    const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX))return json({error:{code:'NOT_FOUND'}},404);
    const route=url.pathname.slice(PREFIX.length);
    if(!['catalog','state','history','action'].includes(route))fail('NOT_FOUND',404);
    if(request.method!==(route==='action'?'POST':'GET'))fail('METHOD_NOT_ALLOWED',405);
    const sessionGuard=request.headers.get('x-demo-session-guard');
    if(!GUARD.test(sessionGuard??''))fail('DEMO_SESSION_REQUIRED',401);
    if(route==='catalog')return json({...demo74Catalog(),sessionGuard});
    let body;
    if(route==='action') {
      const length=Number(request.headers.get('content-length')??0);if(length>8192)fail('BODY_TOO_LARGE',413);
      const text=await request.text();if(new TextEncoder().encode(text).byteLength>8192)fail('BODY_TOO_LARGE',413);
      try {body=validate(JSON.parse(text));}catch(error){if(error.code)throw error;fail('INVALID_JSON',400);}
    }
    const gameId=body?.game_id??url.searchParams.get('game_id');definition(gameId);
    const fingerprint=body?JSON.stringify(canonical(body)):null;
    const response=await ctx.storage.transaction(async tx=>{
      const ledger=await tx.get(LEDGER_KEY)??{balanceMinor:INITIAL_MINOR,active:null,latest:{},history:{}};
      const at=now();if(!Number.isSafeInteger(at)||at<0)fail('INVALID_SERVER_TIME',500);
      let changed=false;
      const project = row => row?{...adapter.publicState(row.state,at),round_id:row.id,game_id:row.gameId,model_version:row.modelVersion,version:row.version,created_at:row.createdAt,settled_at:row.settledAt}:null;
      async function save(row,transition) {
        const wasSettled=row.state?.status==='settled';
        row.state=transition.state;
        if(row.state.status==='settled'&&!wasSettled) {
          const payout=BigInt(transition.payoutMinor);if(payout<0n)fail('INVALID_ENGINE_MONEY',500);
          ledger.balanceMinor=(BigInt(ledger.balanceMinor)+payout).toString();
          ledger.active=null;row.settledAt=at;
          const history=ledger.history[row.gameId]??[];ledger.history[row.gameId]=[row.id,...history.filter(id=>id!==row.id)].slice(0,20);
        }
        ledger.latest[row.gameId]=row.id;await tx.put(keyRound(row.id),row);changed=true;return row;
      }
      async function reconcile() {
        if(!ledger.active)return;
        const row=await tx.get(keyRound(ledger.active));if(!row||row.state.status!=='active')fail('INVALID_DEMO_LEDGER',500);
        let result;
        if(at>=row.state.expiresAt)result=adapter.expire(row.state,random,at);
        else if(row.state.family==='crash' && !(body?.type==='action'&&body.round_id===row.id))result=adapter.act(row.state,{type:'sync'},random,at);
        if(result&&JSON.stringify(result.state)!==JSON.stringify(row.state)){row.version++;await save(row,result);}
      }
      const snapshot=async()=>{
        const row=await tx.get(keyRound(ledger.latest[gameId]??''));
        return {authenticated:true,mode:'demo',currency:'DEMO',freePlay:true,realMoney:false,game:definition(gameId),game_id:gameId,model_version:definition(gameId).version,accepting:true,balance:cash(ledger.balanceMinor),server_now:at,sessionGuard,round:project(row),other_active_game:ledger.active&&ledger.active!==row?.id?(await tx.get(keyRound(ledger.active)))?.gameId??null:null};
      };
      // Replay lookup precedes recovery: retrying a completed request cannot
      // create a second debit or payout, even after its round expired.
      if(body) {
        const previous=await tx.get(keyRequest(body.request_id));
        if(previous) {
          if(previous.fingerprint!==fingerprint)fail('REQUEST_ID_CONFLICT',409);
          await reconcile();if(changed)await tx.put(LEDGER_KEY,ledger);
          return {...previous.result,current_balance:cash(ledger.balanceMinor),sessionGuard,replayed:true};
        }
      }
      await reconcile();
      if(body?.type==='start') {
        if(body.model_version!==definition(gameId).version)fail('GAME_RULES_UPDATED_RELOAD',409);
        if(ledger.active)fail('FINISH_ACTIVE_ROUND:'+(await tx.get(keyRound(ledger.active))).gameId,409);
        const minor=BigInt(body.stake.replace('.',''));if(BigInt(ledger.balanceMinor)<minor)fail('INSUFFICIENT_DEMO_CREDITS',409);
        const transition=adapter.start(gameId,{...body.options,stakeMinor:minor.toString()},random,at);
        ledger.balanceMinor=(BigInt(ledger.balanceMinor)-minor).toString();
        const id=uuid();if(!UUID.test(id))fail('INVALID_SERVER_ROUND_ID',500);
        const row={id,gameId,modelVersion:body.model_version,version:0,createdAt:at,settledAt:null,state:null};
        if(transition.state.status==='active')ledger.active=id;
        await save(row,transition);
      } else if(body?.type==='action') {
        const row=await tx.get(keyRound(body.round_id));
        if(!row||row.gameId!==gameId)fail('ROUND_NOT_FOUND',404);
        if(body.model_version!==row.modelVersion)fail('GAME_MODEL_UNAVAILABLE',409);
        if(row.state.status!=='active')fail('ROUND_ALREADY_SETTLED',409);
        if(row.version!==body.expected_version)fail('STALE_ROUND',409);
        const transition=adapter.act(row.state,{...body.input,type:body.action},random,at);
        if(transition.debitMinor!=='0')fail('INVALID_DEMO_DEBIT',500);
        row.version++;await save(row,transition);
      }
      let result=await snapshot();
      if(route==='history')result={...result,history:await Promise.all((ledger.history[gameId]??[]).map(async id=>project(await tx.get(keyRound(id)))))};
      if(body) {result={...result,request_id:body.request_id,replayed:false};await tx.put(keyRequest(body.request_id),{fingerprint,result:clone(result)});}
      await tx.put(LEDGER_KEY,ledger);return result;
    });
    return json(response);
  } catch(error) {
    const status=Number.isInteger(error.status)?error.status:500;
    return json({mode:'demo',currency:'DEMO',freePlay:true,error:{code:error.code??'DEMO_UNAVAILABLE',message:error.code??'DEMO_UNAVAILABLE'},retryable:status>=500},status);
  }
}
