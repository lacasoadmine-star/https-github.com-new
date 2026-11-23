import { GAME_ID } from './presentation-quote.mjs';
import { EXISTING_M20_GAME_ID, createHostPresentation, restoreHostPresentation, createHostGamblePresentation, hostMinor, validateHostModel } from './host-presentation.mjs';

export const EXISTING_M20_PENDING_KEY = 'zplay.player.pending.multihot20.v1';
export const EXISTING_M20_GAMBLE_KEY = 'zplay.player.pending.multihot20.gamble.v1';
const STATE_PATH = '/api/slots/fresh-state?gameId=' + EXISTING_M20_GAME_ID;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const mathKeys = ['mathVersion','engineVersion','mathSha256'];
const fail = (code,status) => Object.assign(new Error(code),{code,status});

export function createExistingM20Transport({fetcher = globalThis.fetch, storage = globalThis.sessionStorage, timeoutMs = 20000} = {}) {
  if (typeof fetcher !== 'function' || !storage?.getItem || !storage?.setItem || !storage?.removeItem ||
    !Number.isFinite(timeoutMs) || timeoutMs < 1) throw fail('M20_HOST_DEPENDENCIES');
  let account = null, pending = null, pendingAction = null, last = null, lastAction = null, takenRoundId = null, busy = false, generation = 0;
  const rejected = code => Object.assign(fail(code),{definitiveRejection:true});
  async function request(path,body) {
    const abort = new AbortController(), timer = setTimeout(() => abort.abort(),timeoutMs);
    try {
      const response = await fetcher(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',redirect:'error',
        headers:{accept:'application/json',...(body?{'content-type':'application/json'}:{})},signal:abort.signal,...(body?{body:JSON.stringify(body)}:{})});
      if (response.redirected) throw fail('M20_HOST_REDIRECT_REJECTED');
      let data;try{data=await response.json();}catch{throw fail('M20_INVALID_SERVER_RESPONSE',response.status);}
      if (!response.ok) throw fail(data?.code || data?.error || data?.detail || 'M20_HOST_HTTP_'+response.status,response.status);
      return data;
    } finally {clearTimeout(timer);}
  }
  function validateState(state,guard = null) {
    if (!state?.authenticated || state.currency !== 'ETB' || !/^[a-f0-9]{64}$/i.test(state.sessionGuard || '') ||
      (guard && state.sessionGuard !== guard)) throw fail('M20_PLAYER_SESSION_CHANGED',403);
    validateHostModel(state.game);hostMinor(state.balance);return structuredClone(state);
  }
  function validatePending(value,guard) {
    if (!value || value.gameId !== EXISTING_M20_GAME_ID || value.sessionGuard !== guard || !uuid.test(value.roundToken || '') ||
      !mathKeys.every(key => typeof value[key] === 'string' && value[key]) || !/^[a-f0-9]{64}$/i.test(value.mathSha256 || '')) throw fail('M20_PENDING_SESSION_MISMATCH',403);
    const bet = hostMinor(value.bet);if(bet<100||bet>4000000||bet%20)throw fail('M20_PENDING_BET_INVALID');return value;
  }
  function validatePendingGamble(value,guard) {
    if (!value || value.gameId!==EXISTING_M20_GAME_ID || value.sessionGuard!==guard || !uuid.test(value.roundToken||'') ||
      !uuid.test(value.roundId||'') || !['RED','BLACK'].includes(value.choice) || !Number.isInteger(value.expectedAttempt) ||
      value.expectedAttempt<1 || value.expectedAttempt>5 || !mathKeys.every(key=>typeof value[key]==='string'&&value[key]) ||
      !/^[a-f0-9]{64}$/i.test(value.mathSha256||'')) throw fail('M20_PENDING_GAMBLE_SESSION_MISMATCH',403);
    const stake=hostMinor(value.expectedStake);if(stake<=0||stake>50000)throw fail('M20_PENDING_GAMBLE_STAKE');return value;
  }
  const ownGamble = action => Object.freeze({action:'GAMBLE',gameId:GAME_ID,requestKey:action.roundToken,roundId:action.roundId,
    choice:action.choice,expectedAttempt:action.expectedAttempt,expectedStake:action.expectedStake});
  function gambleState() {
    const g=account?.round?.gamble;if(!g||account.round.result?.roundId!==last?.roundId)return null;
    if(typeof g.available!=='boolean'||!Number.isInteger(g.attempt)||g.attempt<0||g.attempt>5||g.maxAttempts!==5||g.maxStake!=='500.00')throw fail('M20_HOST_GAMBLE_STATE');
    hostMinor(g.stake);
    return Object.freeze({...structuredClone(g),roundId:last.roundId,available:g.available&&takenRoundId!==last.roundId&&playable()});
  }
  const currentWin = () => lastAction?.roundId===last?.roundId?lastAction.payout:last?.winAmount;
  const playable = () => !!account && account.game.enabled === true && account.game.freshReleaseReady === true &&
    account.game.productionApproved === true && account.game.probabilityModelAudited === true &&
    !account.blockedByActiveGame && account.game.wagerAvailability !== 'house_capacity';
  const eligible = action => playable() && account.game.betLevels.includes(action.bet) &&
    (!Array.isArray(account.game.availableBetLevels) || account.game.availableBetLevels.includes(action.bet)) &&
    mathKeys.every(key=>account.game[key]===action[key]) && hostMinor(action.bet)<=hostMinor(account.balance);
  const ownIntent = action => Object.freeze({action:'SPIN',gameId:GAME_ID,requestKey:action.roundToken,bet:action.bet,collectRoundId:null});
  async function connect() {
    if (busy) throw fail('M20_HOST_BUSY');busy=true;const version=++generation;
    account=null;last=null;lastAction=null;pending=null;pendingAction=null;takenRoundId=null;
    try {
      const next=validateState(await request(STATE_PATH));if(version!==generation)throw fail('M20_STALE_SESSION_RESPONSE');
      const saved=storage.getItem(EXISTING_M20_PENDING_KEY);const restored=saved?validatePending(JSON.parse(saved),next.sessionGuard):null;
      const savedAction=storage.getItem(EXISTING_M20_GAMBLE_KEY),restoredAction=savedAction?validatePendingGamble(JSON.parse(savedAction),next.sessionGuard):null;
      if(restored&&restoredAction)throw fail('M20_PERSISTED_ACTION_CONFLICT');
      const historical=next.round?.result?restoreHostPresentation(next.round.result,next.game):null;
      if(restoredAction&&historical?.roundId!==restoredAction.roundId)throw fail('M20_GAMBLE_PARENT_UNAVAILABLE');
      account=next;pending=restored;pendingAction=restoredAction;last=historical;
      const actionResult=next.round?.gamble?.lastResult;
      if(actionResult&&historical){lastAction=createHostGamblePresentation(actionResult,{...actionResult,expectedAttempt:actionResult.attempt,expectedStake:actionResult.stake});}
      return snapshot();
    } finally {busy=false;}
  }
  function snapshot() {return Object.freeze({authenticated:!!account,currency:'ETB',backendGameId:EXISTING_M20_GAME_ID,
    gameId:GAME_ID,canPlay:playable(),balance:account?.balance ?? null,betLevels:Object.freeze([...(account?.game.betLevels || [])]),
    pendingIntent:pending?ownIntent(pending):pendingAction?ownGamble(pendingAction):null,lastPresentation:last,lastAction,gamble:gambleState(),settlementMode:'SERVER_IMMEDIATE'});}
  async function send(action,replayOnly) {
    const version=generation,guard=account.sessionGuard;let raw;
    try {raw=await request('/api/slots/spin',{...action,...(replayOnly?{replayOnly:true}:{})});}
    catch(error) {
      if(!replayOnly||error.status!==404||error.code!=='ROUND_NOT_FOUND_FOR_REPLAY'||version!==generation||account?.sessionGuard!==guard)throw error;
      account=validateState(await request(STATE_PATH),guard);
      if(!eligible(action))throw fail('M20_SAVED_ROUND_REPLAY_ONLY');
      raw=await request('/api/slots/spin',{...action});
    }
    if(version!==generation||account?.sessionGuard!==guard)throw fail('M20_STALE_SESSION_RESPONSE');
    const view=createHostPresentation(raw,{model:account.game,action});
    storage.removeItem(EXISTING_M20_PENDING_KEY);pending=null;last=view;lastAction=null;takenRoundId=null;account.balance=view.balance;account.round=null;return view;
  }
  async function submit(intent) {
    if(busy||!account||intent?.gameId!==GAME_ID||!uuid.test(intent.requestKey||''))throw fail('M20_HOST_ACTION_INVALID');
    if(pending||pendingAction||storage.getItem(EXISTING_M20_PENDING_KEY)||storage.getItem(EXISTING_M20_GAMBLE_KEY))throw fail('M20_PENDING_ROUND_REQUIRES_RECOVERY');
    if(intent.action==='GAMBLE')return submitGamble(intent);
    if(intent.action==='TAKE') {
      if(!last||intent.roundId!==last.roundId)throw rejected('M20_TAKE_ROUND_MISMATCH');
      busy=true;const version=generation,guard=account.sessionGuard;
      try {
        const next=validateState(await request(STATE_PATH),guard);if(version!==generation)throw fail('M20_STALE_SESSION_RESPONSE');account=next;takenRoundId=last.roundId;
        return Object.freeze({gameId:GAME_ID,requestKey:intent.requestKey,roundId:last.roundId,collected:true,amount:currentWin(),balance:account.balance,
          settlementMode:'SERVER_IMMEDIATE',creditedByTake:false});
      } finally {busy=false;}
    }
    if(intent.action!=='SPIN'||!playable())throw rejected('M20_HOST_WAGER_UNAVAILABLE');
    const action=Object.freeze({gameId:EXISTING_M20_GAME_ID,bet:intent.bet,roundToken:intent.requestKey,sessionGuard:account.sessionGuard,
      ...Object.fromEntries(mathKeys.map(key=>[key,account.game[key]]))});
    if(!eligible(action))throw rejected('M20_HOST_BET_UNAVAILABLE');
    storage.setItem(EXISTING_M20_PENDING_KEY,JSON.stringify(action));pending=action;busy=true;
    try{return await send(action,false);}
    catch(error){
      if([400,402,422].includes(error?.status)&&error?.code!=='M20_INVALID_SERVER_RESPONSE'){
        storage.removeItem(EXISTING_M20_PENDING_KEY);pending=null;error.definitiveRejection=true;
      }
      throw error;
    }finally{busy=false;}
  }
  async function refreshGamble() {
    if(busy||pending||pendingAction||!account||!last)throw fail('M20_HOST_BUSY');
    busy=true;const version=generation,guard=account.sessionGuard;
    try{const next=validateState(await request(STATE_PATH),guard);if(version!==generation)throw fail('M20_STALE_SESSION_RESPONSE');account=next;return gambleState();}
    finally{busy=false;}
  }
  const gambleEligible = action => {const g=gambleState();return g?.available===true&&g.roundId===action.roundId&&g.attempt+1===action.expectedAttempt&&
    g.stake===action.expectedStake&&mathKeys.every(key=>account.game[key]===action[key])&&hostMinor(g.stake)<=hostMinor(account.balance);};
  function definitiveGamble(error) {return error?.code!=='M20_INVALID_SERVER_RESPONSE'&&([400,402,422].includes(error?.status)||
    error?.status===404&&error.code==='ROUND_NOT_FOUND'||error?.status===409&&['GAMBLE_STATE_CHANGED','GAMBLE_LIMIT','GAMBLE_STAKE_LIMIT',
    'NO_GAMBLE_WINNINGS','GAMBLE_EXPIRED','GAME_RULES_UPDATED_RELOAD'].includes(error.code));}
  async function sendGamble(action,replayOnly) {
    const version=generation,guard=account.sessionGuard;
    try {
      let raw;
      try{raw=await request('/api/slots/gamble',{...action,...(replayOnly?{replayOnly:true}:{})});}
      catch(error){
        if(!replayOnly||error.status!==404||error.code!=='ROUND_NOT_FOUND_FOR_REPLAY'||version!==generation||account?.sessionGuard!==guard)throw error;
        account=validateState(await request(STATE_PATH),guard);
        if(!gambleEligible(action))throw fail('M20_SAVED_GAMBLE_REPLAY_ONLY');
        raw=await request('/api/slots/gamble',{...action});
      }
      if(version!==generation||account?.sessionGuard!==guard)throw fail('M20_STALE_SESSION_RESPONSE');
      const result=createHostGamblePresentation(raw,action);
      storage.removeItem(EXISTING_M20_GAMBLE_KEY);pendingAction=null;lastAction=result;account.balance=result.balance;
      if(account.round?.result?.roundId===result.roundId)account.round.gamble={...account.round.gamble,attempt:result.attempt,stake:result.payout,
        available:false,lastResult:raw};
      return result;
    }catch(error){if(definitiveGamble(error)){storage.removeItem(EXISTING_M20_GAMBLE_KEY);pendingAction=null;error.definitiveRejection=true;}throw error;}
  }
  async function submitGamble(intent) {
    const action={gameId:EXISTING_M20_GAME_ID,roundId:intent.roundId,roundToken:intent.requestKey,sessionGuard:account.sessionGuard,
      choice:intent.choice,expectedAttempt:intent.expectedAttempt,expectedStake:intent.expectedStake,...Object.fromEntries(mathKeys.map(key=>[key,account.game[key]]))};
    try{validatePendingGamble(action,account.sessionGuard);}catch(error){error.definitiveRejection=true;throw error;}if(!gambleEligible(action))throw rejected('M20_HOST_GAMBLE_UNAVAILABLE');
    storage.setItem(EXISTING_M20_GAMBLE_KEY,JSON.stringify(action));pendingAction=action;busy=true;
    try{return await sendGamble(action,false);}finally{busy=false;}
  }
  async function recover(intent) {
    // TAKE is a read-only authenticated refresh; repeating it cannot credit money.
    if(intent?.action==='TAKE')return submit(intent);
    if(intent?.action==='GAMBLE'){
      if(busy||!pendingAction||!account||!Object.entries(ownGamble(pendingAction)).every(([key,value])=>intent[key]===value))throw fail('M20_HOST_GAMBLE_RECOVERY_MISMATCH');
      busy=true;try{return await sendGamble(pendingAction,true);}finally{busy=false;}
    }
    if(busy||!pending||!account||intent?.gameId!==GAME_ID||intent.requestKey!==pending.roundToken||intent.bet!==pending.bet)throw fail('M20_HOST_RECOVERY_MISMATCH');
    busy=true;try{return await send(pending,true);}finally{busy=false;}
  }
  return Object.freeze({currency:'ETB',serverAuthoritative:true,settlementMode:'SERVER_IMMEDIATE',get canPlay(){return playable();},
    connect,snapshot,submit,recover,refreshGamble,disconnect(){generation++;account=null;last=null;lastAction=null;pending=null;pendingAction=null;},
    pendingIntent(){return pending?ownIntent(pending):pendingAction?ownGamble(pendingAction):null;}});
}
