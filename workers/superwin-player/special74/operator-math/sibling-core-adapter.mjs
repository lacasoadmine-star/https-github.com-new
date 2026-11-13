// Additive, server-only draft models. Existing ledger transactions still own all
// account locks, reserve checks, request-token replay and credit/debit operations.
import * as mh10 from './multi-hot-10.mjs';
import * as mh40 from './multi-hot-40.mjs';
import {deepFreeze} from './five-reel-model.mjs';

export const SIBLING_ENGINE_VERSION='special74-operator-five-reel-v1';
export const siblingEngines=Object.freeze({[mh10.model.id]:mh10,[mh40.model.id]:mh40});
const cash=minor=>{const n=BigInt(minor);if(n<0n)throw Error('INVALID_AMOUNT');return `${n/100n}.${String(n%100n).padStart(2,'0')}`;};
const minor=value=>{if(typeof value!=='string'||!/^(?:0|[1-9]\d{0,5})\.\d{2}$/.test(value))throw Error('INVALID_AMOUNT');return Number(value.replace('.',''));};
const lineStakes=[1,2,3,4,5,6,8,10,15,20,30,40,50,60,80,100,150,200,250,300,400,500,600,800,1000,1500,2000];
export function siblingBetLevels(id){const {model}=siblingEngines[id]??{};if(!model)throw Error('UNKNOWN_OPERATOR_MODEL');return lineStakes.map(value=>value*model.paylines.length).filter(value=>value>=model.betMinor.min&&value<=model.betMinor.max).map(cash);}
export function siblingGambleDraw(id,choice,amount,attempt,nextUint32){
 const engine=siblingEngines[id];if(!engine||!['RED','BLACK'].includes(choice))throw Error('INVALID_OPERATOR_GAMBLE');
 const result=engine.gamble({choice:choice.toLowerCase(),amountMinor:minor(amount),attempt},nextUint32);
 return {choice,revealed:result.color.toUpperCase(),won:result.color===result.choice,payout:cash(result.payoutMinor),probabilityModel:'independent-fair-color',claimsProviderMath:false};
}
export function createSiblingOperatorCore(existing,{sources,enabled=false,uuid=()=>crypto.randomUUID(),nextUint32}={}){
 if(!existing?.MATH?.games||!existing?.MATH?.lines||['getGame','modelIdentity','receiptGame','spin','publicGames'].some(key=>typeof existing[key]!=='function'))throw Error('EXISTING_SLOT_CORE_REQUIRED');
 if(!sources||typeof sources!=='object'||Array.isArray(sources)||!Object.keys(sources).length)throw Error('OPERATOR_SOURCE_HASH_REQUIRED');
 if(typeof enabled!=='boolean')throw Error('INVALID_RELEASE_FLAG');
 const games={},identities={},lines={};
 for(const [id,sha256]of Object.entries(sources)){
  const engine=siblingEngines[id];if(!engine)throw Error('UNKNOWN_OPERATOR_MODEL');if(Object.hasOwn(existing.MATH.games,id))throw Error('OPERATOR_MODEL_CONFLICT');
  if(typeof sha256!=='string'||!/^[a-f0-9]{64}$/.test(sha256))throw Error('OPERATOR_SOURCE_HASH_REQUIRED');
  const {model}=engine,identity=Object.freeze({mathVersion:model.version,engineVersion:SIBLING_ENGINE_VERSION,mathSha256:sha256});identities[id]=identity;
  const lineSet=`${id}_lines`;
  games[id]=deepFreeze({id,name:`Multi Hot ${model.paylines.length}`,currency:'ETB',reels:5,rows:model.rows,paylines:model.paylines.length,
   lineSet,symbols:[...model.symbols],paytable:structuredClone(model.paytable),linePaths:model.paylines.map(line=>[...line]),betLevels:enabled?siblingBetLevels(id):[],
   ...identity,maxWinMultiplier:model.maxBaseWinTimesStake,
   features:{freeSpins:{trigger:100,spins:0,retrigger:false,winMultiplier:1},gambleRounds:model.gamble.maxAttempts,gambleMaxStake:cash(model.gamble.maxAmountMinor),cascadeLimit:0,maxStackMultiplier:0,wildStack:false,jackpots:{},bonusPick:false},
   wheel:{position:'left',values:[...model.multipliers],weights:[...model.multiplierWeights]},
   rules:{lineDirection:'left_to_right',minimumMatch:3,lineWin:'longest_match_only',betAllocation:'total_bet_divided_by_lines',settlement:{walletDecimals:2,rounding:'exact_minor_units'},
    gamble:{choices:['RED','BLACK'],winProbability:0.5,winMultiplier:2,maxRounds:5,maxStake:'500.00'}},
   freshRegistration:true,freshReleaseReady:enabled,enabled,buildStatus:enabled?'ready':'draft',providerRtpReproduced:false,claimsProviderMath:false,rtp:'96.00',
   theoreticalRtp:{...model.theoreticalRtp},probabilityModel:'independent-uniform-per-cell-weighted-multiplier',disclosure:model.disclosure,observedSource:model.reference.page});
  lines[lineSet]=games[id].linePaths;
 }
 const has=id=>Object.hasOwn(games,id);
 return {...existing,MATH:Object.freeze({...existing.MATH,games:Object.freeze({...existing.MATH.games,...games}),lines:Object.freeze({...existing.MATH.lines,...lines})}),
  getGame:(id,...args)=>has(id)?games[id]:existing.getGame(id,...args),
  modelIdentity:(id,...args)=>has(id)?{...identities[id]}:existing.modelIdentity(id,...args),
  receiptGame:(id,receipt)=>has(id)?(receipt?.gameId===id&&Object.entries(identities[id]).every(([key,value])=>receipt[key]===value)?games[id]:null):existing.receiptGame(id,receipt),
  publicGames:()=>[...existing.publicGames(),...Object.values(games).map(game=>structuredClone(game))],
  spin(id,bet,options={}){
   if(!has(id))return existing.spin(id,bet,options);if(!enabled)throw Error('OPERATOR_RELEASE_NOT_ENABLED');if(options.isFree===true)throw Error('INVALID_OPERATOR_FREE_SPIN');
   if(!games[id].betLevels.includes(bet))throw Error('INVALID_BET');
   const result=siblingEngines[id].spin(minor(bet),nextUint32),roundId=uuid();
   if(typeof roundId!=='string'||!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(roundId))throw Error('INVALID_ROUND_ID');
   return {roundId,gameId:id,bet,baseBet:bet,...identities[id],grid:result.grid,gridOrientation:'rows',wheelMultiplier:result.multiplier,
    winLines:result.wins.map(win=>({line:win.line,symbol:win.symbol,matched:win.matched,positions:win.cells,win:cash(BigInt(win.amountMinor)/BigInt(result.multiplier)),payout:cash(win.amountMinor)})),
    finalWin:cash(result.payoutMinor),baseWin:cash(BigInt(result.payoutMinor)/BigInt(result.multiplier)),bonusSpinsAwarded:0,pendingBonusPick:false,isFree:false,providerRtpReproduced:false,claimsProviderMath:false};
  }
 };
}
