import {BURN_WILDS_GAME_ID,validateBurnWildsReceipt} from './expansion.mjs';
import {auditBurnWildsPayout} from './outcome-audit.mjs';

// This adapter uses the existing Player's authenticated API, not a new host,
// wallet or account. An absent game release stays closed to real-money wagers.
export const BURN_STATE_PATH='/api/slots/fresh-state?gameId='+BURN_WILDS_GAME_ID;
export const BURN_SPIN_PATH='/api/slots/spin';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const guard=/^[0-9a-f]{64}$/i;
const models=['mathVersion','engineVersion','mathSha256'];
const error=(code,status)=>Object.assign(new Error('BURN_HOST_'+code),{code:'BURN_HOST_'+code,status});
const amount=source=>{
  if(typeof source!=='string'||!/^(0|[1-9][0-9]{0,10})\.[0-9]{2}$/.test(source))throw error('INVALID_AMOUNT');
  const [whole,cents]=source.split('.');
  const number=Number(whole)*100+Number(cents);
  if(!Number.isSafeInteger(number)||number<0)throw error('AMOUNT_OVERFLOW');
  return number;
};
const etb=n=>{
  if(!Number.isSafeInteger(n)||n<0)throw error('INVALID_MINOR_AMOUNT');
  return Math.floor(n/100)+'.'+String(n%100).padStart(2,'0');
};
const clone=source=>structuredClone(source);
function normalizeState(raw){
  if(raw?.authenticated!==true||raw.currency!=='ETB'||!guard.test(raw.sessionGuard||''))throw error('PLAYER_SESSION',403);
  const game=raw.game;
  if(!game||game.gameId!==BURN_WILDS_GAME_ID)throw error('GAME_NOT_REGISTERED',404);
  if(!models.every(key=>typeof game[key]==='string'&&game[key].length>0)||
     !guard.test(game.mathSha256||'')||!Array.isArray(game.betLevels)||!game.betLevels.length)throw error('MODEL');
  const bets=game.betLevels.map(amount);
  if(bets.some(x=>x<=0)||new Set(bets).size!==bets.length)throw error('BET_LEVELS');
  // The existing host must explicitly approve a matching real-money release.
  // A renderable local game is not financial permission.
  const approved=game.enabled===true&&game.freshReleaseReady===true&&
    game.productionApproved===true&&game.probabilityModelAudited===true&&
    game.assetRightsVerified===true&&game.settlementMode==='SERVER_IMMEDIATE'&&
    raw.blockedByActiveGame===false&&game.wagerAvailability!=='house_capacity';
  if(raw.round!==null&&raw.round!==undefined)throw error('RESTORE_CONTRACT_NOT_VERIFIED');
  return {gameId:BURN_WILDS_GAME_ID,subject:raw.sessionGuard,
    authenticated:true,currency:'ETB',canPlay:approved,
    balanceMinor:amount(raw.balance),pendingWinMinor:0,round:null,
    betLevelsMinor:bets,canDouble:false,
    model:Object.fromEntries(models.map(key=>[key,game[key]]))};
}
export function createBurnWildsExistingHostTransport({fetcher=globalThis.fetch,timeoutMs=20000}={}){
  if(typeof fetcher!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw error('DEPENDENCIES');
  let current=null;
  async function json(path,body){
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeoutMs);
    try{
      const response=await fetcher(path,{method:body?'POST':'GET',credentials:'same-origin',
        cache:'no-store',redirect:'error',signal:abort.signal,
        headers:{accept:'application/json',...(body?{'content-type':'application/json'}:{})},
        ...(body?{body:JSON.stringify(body)}:{})});
      if(response?.redirected||response?.headers?.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw error('RESPONSE_TYPE');
      let data;try{data=await response.json();}catch{throw error('MALFORMED_RESPONSE');}
      if(!response.ok){
        const code=typeof data?.code==='string'&&/^[A-Z0-9_.:-]{1,120}$/.test(data.code)?data.code:'UNVERIFIED_REJECTION';
        const failure=error(code,response.status);
        // Unknown server failures never erase an accepted round identifier.
        failure.definitiveRejection=[400,402,422].includes(response.status)&&code!=='UNVERIFIED_REJECTION';
        throw failure;
      }
      return data;
    }finally{clearTimeout(timer);}
  }
  async function state(){
    current=normalizeState(await json(BURN_STATE_PATH));
    return clone(current);
  }
  function prepare(intent){
    if(!current?.canPlay||intent?.action!=='SPIN'||intent.gameId!==BURN_WILDS_GAME_ID||
      !uuid.test(intent.requestKey||'')||!current.betLevelsMinor.includes(intent.betMinor)||
      intent.betMinor>current.balanceMinor||intent.collectRoundId!==null||
      typeof intent.auto!=='boolean')throw error('WAGER_NOT_APPROVED');
    return Object.freeze({...clone(intent),sessionGuard:current.subject,...clone(current.model)});
  }
  async function spin(action,replayOnly){
    if(!current||action?.action!=='SPIN'||action.gameId!==BURN_WILDS_GAME_ID||
      !uuid.test(action.requestKey||'')||action.sessionGuard!==current.subject||
      !models.every(key=>action[key]===current.model[key])||
      !current.betLevelsMinor.includes(action.betMinor)||action.collectRoundId!==null)
      throw error('ACTION_CHANGED');
    if(!replayOnly&&(!current.canPlay||action.betMinor>current.balanceMinor))throw error('WAGER_NOT_APPROVED');
    // Replay-only is never converted into a new wager by this client.
    const raw=await json(BURN_SPIN_PATH,{gameId:BURN_WILDS_GAME_ID,roundToken:action.requestKey,
      bet:etb(action.betMinor),sessionGuard:action.sessionGuard,
      ...Object.fromEntries(models.map(key=>[key,action[key]])),
      ...(replayOnly?{replayOnly:true}:{})});
    if(raw?.gameId!==BURN_WILDS_GAME_ID||raw.clientToken!==action.requestKey||
      raw.betMinor!==action.betMinor||raw.settlementMode!=='SERVER_IMMEDIATE'||
      raw.balance!==etb(raw.balanceMinor)||
      !models.every(key=>raw[key]===action[key]))throw error('RECEIPT_CONTRACT');
    const receipt=validateBurnWildsReceipt(raw);
    auditBurnWildsPayout(receipt);
    current={...current,balanceMinor:receipt.balanceMinor,round:null};
    return {...clone(receipt),requestKey:action.requestKey,pendingWinMinor:0,canDouble:false};
  }
  return Object.freeze({state,prepare,dispatch:action=>spin(action,false),
    recover:action=>spin(action,true),serverAuthoritative:true,
    settlementMode:'SERVER_IMMEDIATE'});
}
