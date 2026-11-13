// Server-only adapter for the existing versioned slot core. Wallets and receipts
// remain the responsibility of the retained transaction/ledger service.
import {model,spin as drawSpin,gamble as drawGamble,validateBetMinor} from './multi-hot-5.mjs';

export const OPERATOR_ID=model.id;
export const OPERATOR_ENGINE_VERSION='special74-operator-v1';
// Operator stake schedule. It is not a statement about the provider schedule.
export const BET_MINOR=Object.freeze([5,10,15,20,25,30,40,50,75,100,150,200,300,400,500,600,800,1000,1500,2000,3000,4000,5000,6000,8000,10000,15000,20000,30000,40000]);
export function cash(minor){const n=BigInt(minor);if(n<0n)throw Error('INVALID_AMOUNT');return `${n/100n}.${String(n%100n).padStart(2,'0')}`;}
export function betMinor(bet){
 if(typeof bet!=='string'||!/^(?:0|[1-9]\d{0,5})\.\d{2}$/.test(bet))throw Error('INVALID_BET');
 const minor=Number(bet.replace('.',''));validateBetMinor(minor);
 if(!BET_MINOR.includes(minor))throw Error('INVALID_BET');
 return minor;
}
export function operatorGambleDraw(choice,amount,attempt,nextUint32){
 if(!['RED','BLACK'].includes(choice)||typeof amount!=='string'||!/^(?:0|[1-9]\d{0,5})\.\d{2}$/.test(amount))throw Error('INVALID_OPERATOR_GAMBLE');
 const result=drawGamble({choice:choice.toLowerCase(),amountMinor:Number(amount.replace('.','')),attempt},nextUint32);
 return {choice,revealed:result.color.toUpperCase(),won:result.color===result.choice,payout:cash(result.payoutMinor),probabilityModel:'independent-fair-color',claimsProviderMath:false};
}
const deepFreeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;};

export function createOperatorSlotCore(existing,{sha256,enabled=false,uuid=()=>crypto.randomUUID(),nextUint32}={}){
 if(!existing?.MATH?.games||!existing?.MATH?.lines||['getGame','modelIdentity','receiptGame','spin','publicGames'].some(key=>typeof existing[key]!=='function'))throw Error('EXISTING_SLOT_CORE_REQUIRED');
 if(Object.hasOwn(existing.MATH.games,OPERATOR_ID))throw Error('OPERATOR_MODEL_CONFLICT');
 if(!/^[a-f0-9]{64}$/.test(sha256??''))throw Error('OPERATOR_SOURCE_HASH_REQUIRED');
 const identity=Object.freeze({mathVersion:model.version,engineVersion:OPERATOR_ENGINE_VERSION,mathSha256:sha256});
 const game=deepFreeze({
  id:OPERATOR_ID,name:'Multi Hot 5',currency:'ETB',reels:model.columns,rows:model.rows,paylines:model.paylines.length,
  lineSet:'special74_operator_mh5_five',symbols:[...model.symbols],
  paytable:Object.fromEntries(model.symbols.map((symbol,index)=>[symbol,{'3':model.linePays[index]}])),
  linePaths:model.paylines.map(line=>[...line]),betLevels:enabled?BET_MINOR.map(cash):[],
  ...identity,maxWinMultiplier:model.maxBaseWinTimesStake,
  features:{freeSpins:{trigger:100,spins:0,retrigger:false,winMultiplier:1},gambleRounds:model.gamble.maxAttempts,
   gambleMaxStake:cash(model.gamble.maxAmountMinor),cascadeLimit:0,maxStackMultiplier:0,wildStack:false,jackpots:{},bonusPick:false},
  wheel:{position:'left',values:[...model.multipliers],weights:[...model.multiplierWeights]},
  rules:{lineDirection:'left_to_right',minimumMatch:3,betAllocation:'total_bet_divided_by_lines',
   settlement:{walletDecimals:2,rounding:'exact_minor_units'},
   gamble:{choices:['RED','BLACK'],winProbability:0.5,winMultiplier:2,maxRounds:5,maxStake:'500.00'}},
  freshRegistration:true,freshReleaseReady:enabled,enabled,buildStatus:enabled?'ready':'draft',
  providerRtpReproduced:false,claimsProviderMath:false,rtp:'96.00',
  theoreticalRtp:{...model.theoreticalRtp},probabilityModel:'independent-uniform-per-cell-weighted-multiplier',
  disclosure:model.disclosure,observedSource:'https://www.smartsoftgaming.com/games/multi-hot-5'
 });
 const matches=receipt=>receipt?.gameId===OPERATOR_ID&&Object.entries(identity).every(([key,value])=>receipt[key]===value);
 return {
  ...existing,
  MATH:Object.freeze({...existing.MATH,games:Object.freeze({...existing.MATH.games,[OPERATOR_ID]:game}),lines:Object.freeze({...existing.MATH.lines,[game.lineSet]:game.linePaths})}),
  getGame:(id,...args)=>id===OPERATOR_ID?game:existing.getGame(id,...args),
  modelIdentity:(id,...args)=>id===OPERATOR_ID?{...identity}:existing.modelIdentity(id,...args),
  receiptGame:(id,receipt)=>id===OPERATOR_ID?(matches(receipt)?game:null):existing.receiptGame(id,receipt),
  publicGames:()=>[...existing.publicGames(),structuredClone(game)],
  spin(id,bet,options={}){
   if(id!==OPERATOR_ID)return existing.spin(id,bet,options);
   if(!enabled)throw Error('OPERATOR_RELEASE_NOT_ENABLED');
   if(options.isFree===true)throw Error('INVALID_OPERATOR_FREE_SPIN');
   const result=drawSpin(betMinor(bet),nextUint32),roundId=uuid();
   if(!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(roundId))throw Error('INVALID_ROUND_ID');
   return {roundId,gameId:id,bet,baseBet:bet,...identity,grid:result.grid,gridOrientation:'rows',
    wheelMultiplier:result.multiplier,
    winLines:result.wins.map(win=>({line:win.line,symbol:win.symbol,matched:3,positions:win.cells,
     win:cash(BigInt(win.amountMinor)/BigInt(result.multiplier)),payout:cash(win.amountMinor)})),
    finalWin:cash(result.payoutMinor),baseWin:cash(BigInt(result.payoutMinor)/BigInt(result.multiplier)),
    bonusSpinsAwarded:0,pendingBonusPick:false,isFree:false,providerRtpReproduced:false,claimsProviderMath:false};
  }
 };
}
