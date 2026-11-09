import sourceModels from './smartsoft-slots.data.json' with {type:'json'};
import {NATIVE_PROFILES} from './smartsoft-slot-profiles.mjs';
import {createReferenceSlotKernel} from './smartsoft-slots.mjs';
import {publicGameConfigs as legacyConfigs,MULTIHOT100_MULTIPLIER_TICKETS,COLLECTION_MS} from './smartsoft-slot-rounds.mjs';
import {OPERATOR_GAME_IDS,OPERATOR_WAGER_PROFILE,operatorModelVersion,operatorDefinition} from './operator-wager-profile.mjs';
export {MULTIHOT100_MULTIPLIER_TICKETS,COLLECTION_MS};

// Additive immutable versions. Original interactive versions stay registered
// for accepted receipts, including their old stake schedule and gamble state.
const clone=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=(code,status=422)=>{throw Object.assign(new Error(code),{status});};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const money=value=>typeof value==='string'&&/^(0|[1-9]\d{0,14})$/.test(value);
const time=value=>Number.isSafeInteger(value)&&value>=0;
const decimalMinor=value=>{const [whole,fraction]=value.split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));};
const byId=freeze(Object.fromEntries(sourceModels.filter(model=>OPERATOR_GAME_IDS.includes(model.id)).map(model=>[model.id,{
 ...clone(model),stakeMinorValues:[...OPERATOR_WAGER_PROFILE.stakeMinorValues],maxWin:'400000000.00',
}])));
export const GAME_IDS=freeze(Object.keys(byId));
const SUITS=freeze([{suit:'clubs',color:'black'},{suit:'diamonds',color:'red'},{suit:'hearts',color:'red'},{suit:'spades',color:'black'}]);
const getModel=id=>byId[id]??fail('GAME_NOT_FOUND',404);
const versionOf=model=>operatorModelVersion(model.version.replace(/-1$/,'-2'));
const kernels=Object.fromEntries(Object.values(byId).map(model=>[model.id,createReferenceSlotKernel(model.id,{
 version:versionOf(model),operatorWagerProfile:OPERATOR_WAGER_PROFILE,
 ...(NATIVE_PROFILES[model.id]?{nativeProfile:{...NATIVE_PROFILES[model.id],version:versionOf(model)}}:{}),
 ...(model.id.startsWith('burningice')?{scatterCoefficientBasis:'line-stake'}:{}),
 ...(model.id==='multihot5superwilds_native'?{payoutStakeDivisor:10}:{}),
})]));
const limitsOf=model=>({attempts:Number(model.referenceLimits.DoublingMaxCount),maximumCurrentWin:decimalMinor(model.referenceLimits.DoublingMaxWin),absolute:decimalMinor(model.maxWin)});
export const publicGames=freeze(GAME_IDS.map(id=>{
 const prior=clone(legacyConfigs[id]),profile=operatorDefinition(prior,maximumPayoutMinor(id,OPERATOR_WAGER_PROFILE.maxStakeMinor));
 return {...profile,
  math:{...prior.math,version:profile.version,coefficientProfileVersion:prior.version,
   rounding:'Exact BigInt coefficient total is floored once to santim; per-line largest remainders conserve the settled total. No extra RNG draw or payout clipping.',
   returnQualification:'The inherited coefficient-profile return precedes currency flooring. Newly allowed wagers with fractional santim may have a rounding difference; no provider-private RTP is claimed.',
   description:'Independent fixed native distribution, unchanged public coefficients, and the user-requested whole-ETB operator wager ladder. Exact total prizes are floored once to santim; no supported award is clipped.'},
  currencyAdaptation:{...prior.currencyAdaptation,method:'User-requested whole-ETB wager presets from1.00 through40000.00. Public coefficients are retained; these amounts are an independent operator choice, not a conversion of demo currency.',operatorWagerProfileId:OPERATOR_WAGER_PROFILE.id,currency:'ETB',productionLaunchable:false},
  referenceNotes:prior.referenceNotes.filter(note=>!note.startsWith('Removed the invented global10,000 ceiling and Burning100×cap.')),
  rules:['This operator profile accepts the displayed whole-ETB presets from1.00 through40000.00 ETB. These amounts are a local operator choice, not conversion of the demo currency.',
   ...prior.rules.filter(rule=>!rule.startsWith('Fixed demo-derived stake schedule ')&&rule!=='Every supported stake and public prize is an exact whole-santim amount. Payouts are neither scaled nor clipped.'&&!rule.startsWith('Official Deluxe help states145×maximum. This is a numerical draft ceiling;')),
   'The exact sum of all public coefficient awards is calculated before a single floor to santim. Increasing the wager scales the exact award ratio; displayed and settled minor-unit amounts account for that final rounding.',
   'The full potential liability is reserved before sampling. Insufficient house reserve rejects before debit. High wagers never invoke the former absolute monetary payout ceiling.'],
 };
}));
export const publicGameConfigs=freeze(Object.fromEntries(publicGames.map(game=>[game.id,game])));
export const definitions=freeze(Object.fromEntries(publicGames.map(game=>[game.id,{...game,math:game.math.description}])));

function random(rng){const value=rng();if(!Number.isFinite(value)||value<0||value>=1)fail('INVALID_SERVER_RANDOM',500);return value;}
function stakeAmount(model,value){if(!money(value)||!model.stakeMinorValues.includes(value))fail('STAKE_NOT_IN_REFERENCE_SCHEDULE');return BigInt(value);}
export function maximumPayoutMinor(gameId,stakeMinor){
 const model=getModel(gameId);stakeAmount(model,stakeMinor);
 const slot=BigInt(kernels[gameId].maximumPayoutMinor(stakeMinor)),limits=limitsOf(model);
 // Before sampling, reserve the largest slot obligation and a safe bound on
 // all eligible five-step doubles. No action can expand this reservation.
 let doubled=slot*(2n**BigInt(limits.attempts));
 if(doubled>limits.maximumCurrentWin*2n)doubled=limits.maximumCurrentWin*2n;
 let bound=slot>doubled?slot:doubled;
 if(bound>limits.absolute)bound=limits.absolute;
 return String(bound);
}
function canGamble(state){
 const limits=limitsOf(getModel(state.gameId)),current=BigInt(state.currentCashoutMinor);
 return state.status==='active'&&state.gambleAttempts<limits.attempts&&current>0n&&current<=limits.maximumCurrentWin&&current*2n<=BigInt(state.liabilityMinor);
}
const transition=(state,debitMinor='0')=>({state,debitMinor,maxPayoutMinor:state.liabilityMinor,payoutMinor:state.status==='settled'?state.payoutMinor:null});
const settle=(state,now,reason)=>transition({...clone(state),status:'settled',settledAt:now,expiresAt:now,payoutMinor:state.currentCashoutMinor,reason});

function checkedState(state,now){
 if(!object(state)||!Object.hasOwn(byId,state.gameId))fail('INVALID_SMARTSOFT_ROUND_STATE',500);
 const model=getModel(state.gameId),limits=limitsOf(model);
 if(state.operatorWagerProfileId!==OPERATOR_WAGER_PROFILE.id||state.modelVersion!==versionOf(model)||state.family!=='slots'||!['active','settled'].includes(state.status)||!time(now)||!time(state.startedAt)||now<state.startedAt||!time(state.startedAt+COLLECTION_MS)||!time(state.expiresAt)||!money(state.stakeMinor)||!model.stakeMinorValues.includes(state.stakeMinor)||state.liabilityMinor!==maximumPayoutMinor(model.id,state.stakeMinor)||!money(state.baseWinMinor)||!money(state.currentCashoutMinor)||BigInt(state.currentCashoutMinor)>BigInt(state.liabilityMinor)||!Number.isInteger(state.gambleAttempts)||state.gambleAttempts<0||state.gambleAttempts>limits.attempts||!Array.isArray(state.gambleHistory)||state.gambleHistory.length!==state.gambleAttempts)fail('INVALID_SMARTSOFT_ROUND_STATE',500);
 kernels[model.id].verifyReceipt(state.stakeMinor,{payoutMinor:state.baseWinMinor,grid:state.grid,wins:state.wins,frames:state.frames,feature:state.feature});
 let current=BigInt(state.baseWinMinor),lastAt=state.startedAt;
 for(let index=0;index<state.gambleHistory.length;index++){
  const item=state.gambleHistory[index],card=object(item)?SUITS.find(value=>value.suit===item.suit):null;
  if(!card||item.attempt!==index+1||!['red','black'].includes(item.selection)||item.rank!=='A'||item.color!==card.color||item.won!==(item.selection===card.color)||item.amountBeforeMinor!==String(current)||current<=0n||current>limits.maximumCurrentWin||current*2n>BigInt(state.liabilityMinor)||!time(item.at)||item.at<lastAt||item.at>=state.startedAt+COLLECTION_MS||item.at>now)fail('INVALID_SMARTSOFT_ROUND_STATE',500);
  current=item.won?current*2n:0n;lastAt=item.at;
  if(item.amountAfterMinor!==String(current))fail('INVALID_SMARTSOFT_ROUND_STATE',500);
 }
 if(state.currentCashoutMinor!==String(current))fail('INVALID_SMARTSOFT_ROUND_STATE',500);
 if(state.status==='active'&&(state.payoutMinor!==null||state.expiresAt!==state.startedAt+COLLECTION_MS||current===0n||state.settledAt!==undefined))fail('INVALID_SMARTSOFT_ROUND_STATE',500);
 if(state.status==='settled'&&(!time(state.settledAt)||state.settledAt<lastAt||state.settledAt>now||state.expiresAt!==state.settledAt||state.payoutMinor!==state.currentCashoutMinor))fail('INVALID_SMARTSOFT_ROUND_STATE',500);
 return state;
}

export function start(gameId,options,rng,now){
 getModel(gameId);
 if(definitions[gameId].launchable!==true)fail('GAME_MODEL_NOT_READY',409);
 return evaluateDraftRound(gameId,options,rng,now);
}
function samplerFor(gameId,rng){
 let draws=0;
 return gameId==='multihot100_native'?()=>{
  const value=random(rng),index=draws++;
  // The first20 draws select eight uniform symbols. The21st selects one of
  // sixteen equally likely wheel tickets, then maps to the legacy evaluator's
  // five multiplier buckets without altering any prize or resolved grid.
  if(index===20)return(MULTIHOT100_MULTIPLIER_TICKETS[Math.floor(value*16)]-1+.25)/5;
  return value;
 }:rng;
}
// Offline mathematical inspection only; this pure function has no wallet or
// production routing. The start() gate above is the authorized service path.
export function sampleDraftOutcome(gameId,rng,options){
 getModel(gameId);return kernels[gameId].sampleOutcome(samplerFor(gameId,rng),options);
}
export function evaluateDraftRound(gameId,options,rng,now){
 const model=getModel(gameId);
 if(!object(options)||Object.keys(options).some(key=>!['stakeMinor','autoCollect'].includes(key))||options.autoCollect!==undefined&&typeof options.autoCollect!=='boolean')fail('INVALID_SMARTSOFT_ROUND_OPTIONS');
 stakeAmount(model,options.stakeMinor);
 if(!time(now)||!time(now+COLLECTION_MS))fail('INVALID_SERVER_TIME',500);
 const liabilityMinor=maximumPayoutMinor(gameId,options.stakeMinor);
 const original=kernels[gameId].evaluateDraftRound({stakeMinor:options.stakeMinor},samplerFor(gameId,rng),now);
 const {grid,wins,frames,feature}=original.state;
 const state={gameId,modelVersion:versionOf(model),operatorWagerProfileId:OPERATOR_WAGER_PROFILE.id,family:'slots',status:'active',stakeMinor:options.stakeMinor,startedAt:now,expiresAt:now+COLLECTION_MS,liabilityMinor,
  grid,wins,frames,feature,baseWinMinor:original.payoutMinor,currentCashoutMinor:original.payoutMinor,payoutMinor:null,gambleAttempts:0,gambleHistory:[],reason:'PENDING_COLLECTION'};
 const result=state.baseWinMinor==='0'?settle(state,now,'NO_WIN'):options.autoCollect?settle(state,now,'AUTO_COLLECTED'):transition(state);
 result.debitMinor=options.stakeMinor;return result;
}
export function act(raw,input,rng,now){
 const state=checkedState(raw,now);
 if(state.status!=='active')fail('ROUND_ALREADY_SETTLED',409);
 if(!object(input)||!['collect','gamble'].includes(input.type)||Object.keys(input).some(key=>!['type',...(input.type==='gamble'?['color']:[])].includes(key))||input.type==='gamble'&&!['red','black'].includes(input.color))fail('INVALID_SMARTSOFT_ROUND_ACTION');
 if(now>=state.expiresAt)return expire(state,rng,now);
 if(input.type==='collect')return settle(state,now,'COLLECTED');
 if(!canGamble(state))fail('GAMBLE_NOT_AVAILABLE',409);
 const card=SUITS[Math.floor(random(rng)*4)],won=card.color===input.color,attempt=state.gambleAttempts+1;
 const amount=won?String(BigInt(state.currentCashoutMinor)*2n):'0';
 const entry={attempt,selection:input.color,rank:'A',suit:card.suit,color:card.color,won,amountBeforeMinor:state.currentCashoutMinor,amountAfterMinor:amount,at:now};
 const next={...clone(state),currentCashoutMinor:amount,gambleAttempts:attempt,gambleHistory:[...clone(state.gambleHistory),entry],reason:won?'GAMBLE_WON':'GAMBLE_LOST'};
 return won?transition(next):settle(next,now,'GAMBLE_LOST');
}
export function expire(raw,rng,now){
 const state=checkedState(raw,now);
 if(state.status==='settled')return transition(clone(state));
 if(now<state.expiresAt)fail('ROUND_NOT_EXPIRED',409);
 return settle(state,state.expiresAt,'DISCONNECTED_COLLECT');
}
export function publicState(raw,now){
 const state=checkedState(raw,now),limits=limitsOf(getModel(state.gameId));
 const {gameId,modelVersion,family,status,stakeMinor,startedAt,expiresAt,settledAt,payoutMinor,baseWinMinor,currentCashoutMinor,grid,wins,frames,feature,gambleAttempts,gambleHistory,reason}=state;
 const view={gameId,modelVersion,operatorWagerProfileId:OPERATOR_WAGER_PROFILE.id,family,status,stakeMinor,startedAt,expiresAt,payoutMinor,baseWinMinor,currentCashoutMinor,grid,wins,frames,feature,gambleAttempts,gambleHistory,reason,
  actions:status==='active'?['collect',...(canGamble(state)?['gamble']:[])]:[],gambleAvailable:canGamble(state),gambleAttemptsRemaining:limits.attempts-gambleAttempts};
 if(status==='settled')view.settledAt=settledAt;
 return clone(view);
}
export default {definitions,start,act,expire,publicState};
