import sourceModels from './smartsoft-slots.data.json' with {type:'json'};
import {publicGameConfigs as previousPublicConfigs} from './smartsoft-slots.mjs';

// An independent, immutable ZPLAY model. The provider's public award table and
// line geometry are retained; its private probability law is not reproduced.
export const ID='multihot40_native';
export const VERSION='superwin-multihot40-2';
const clone=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=(code,status=422)=>{throw Object.assign(new Error(code),{status});};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const canonical=value=>Array.isArray(value)?value.map(canonical):object(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const sameJson=(left,right)=>JSON.stringify(canonical(left))===JSON.stringify(canonical(right));
const money=value=>typeof value==='string'&&/^(0|[1-9]\d{0,14})$/.test(value);
const time=value=>Number.isSafeInteger(value)&&value>=0;
const model=freeze(clone(sourceModels.find(item=>item.id===ID)));
if(!model||model.rows!==4||model.columns!==5||model.paths.length!==40||model.wildSymbols.length||model.scatters.length)throw Error('MULTIHOT40_REFERENCE_CONTRACT_CHANGED');

export const LIMITS=freeze({
 minStakeMinor:'40',maxStakeMinor:'10000',maxPayoutMinor:'25000000',
 maxStakeMultiplier:2500,collectionMs:30*60*1000,
 gambleAttempts:5,gambleMaximumCurrentWinMinor:'50000'
});
export const MULTIPLIER_TICKETS=freeze([1,2,2,3,3,3,4,4,4,4,5,5,5,5,5,5]);
const SUITS=freeze([
 {suit:'clubs',color:'black'},{suit:'diamonds',color:'red'},
 {suit:'hearts',color:'red'},{suit:'spades',color:'black'}
]);

export const MATH_PROFILE=freeze({
 kind:'independent-zplay',version:VERSION,
 officialPrivateMathVerified:false,publicPayoutCoefficientsScaled:false,
 grid:{columns:5,rows:4,independentCells:true,symbolWeights:[1,1,1,1,1,1,1,1],weightTotal:8},
 wheel:{multipliers:[1,2,3,4,5],weights:[1,2,3,4,6],weightTotal:16,mean:{numerator:'15',denominator:'4'}},
 nativeReturn:{numerator:'31425',denominator:'32768',value:31425/32768,percent:'95.9014892578125',method:'Exact enumeration of all 8^5 symbol sequences on a payline, linearity over the 40 verified paths, and independent mean wheel multiplier 15/4.'},
 observedProviderReturnPercent:'96.58',
 providerReturnMeaning:'Displayed by the official reference demo; it is not the return of this independent model.',
 rounding:'Every supported stake and public coefficient produces an exact whole-santim award. No stochastic rounding or payout scaling is used.',
 maximum:'2500 times the total stake is an attained mathematical bound: 40 lines of five sevens, each paying 500 times its line stake, with a 5x wheel. No payout clipping is needed.',
 randomness:'The existing canonical service supplies a secret-seed HMAC stream of uniform 53-bit fractions. Symbol, wheel and suit selections use 8, 16 and 4 equiprobable buckets, all exact divisors of 2^53.',
 gamble:{
  chance:{numerator:'1',denominator:'2'},payoffMultiplier:2,
  suits:['clubs','diamonds','hearts','spades'],maximumAttempts:5,
  maximumCurrentWinMinor:'50000',maximumPossibleGambleWinMinor:'100000',
  referenceLimitSemanticsVerified:false,
  limitMeaning:'The independent ETB profile permits gambling a current win of at most 500.00 ETB. A successful attempt doubles it without clipping; a win above 500.00 ETB can only be collected. The reference source contains the number 500, but its exact pre/post-double boundary remains unverified.',
  expectedReturn:'Fair independent red/black choices preserve the expected slot payout for any strategy bounded by the five-attempt and eligibility limits; collection and disconnection expiry return the full remaining amount.'
 }
});

const prior=clone(previousPublicConfigs[ID]);
export const publicConfig=freeze({
 ...prior,version:VERSION,launchable:false,
 actions:['collect','gamble'],
 featureDescription:'40 fixed paylines, a 1x–5x multiplier, Take Win and optional red/black doubling.',
 controls:{manualCollection:true,automaticCollectionOption:'autoCollect',gambleColors:['red','black']},
 currencyAdaptation:{source:'DMO',draft:'ETB',method:'The independently authored ZPLAY ETB profile uses the same numerical stake schedule as the public reference. This is not a provider-approved currency integration.',productionLaunchable:false},
 referenceNotes:[
  'The public 40 paths, eight symbols, line coefficients and numerical stake schedule are unchanged.',
  'The native probability profile is independent. Its exact theoretical RTP is 95.9014892578125%; the provider demo displays 96.58%.',
  'Red/black and Take Win are reference controls. The exact provider interpretation of the public doubling boundary remains unverified; the native ETB rule is stated explicitly.'
 ],
 releaseGate:{status:'pending_complete_player_verification',productionLaunchable:false,required:['presentation_audio','browser_integration','reference_gamble_boundary'],manifest:'release-readiness.json'},
 math:{...clone(MATH_PROFILE),description:'Independent ZPLAY model: exact theoretical RTP 95.9014892578125% (31425/32768), unchanged public line prizes, fixed probability weights, and no payout clipping. This is not the provider probability law.'},
 gamble:clone(MATH_PROFILE.gamble),
 rules:[
  'The game has five reels, four rows and 40 fixed paylines. Matching symbols pay consecutively from the leftmost reel. The highest win on each line is paid; simultaneous winning lines add.',
  'A line stake is the total stake divided by 40. The line prize is the displayed coefficient multiplied by the line stake and the server-selected 1x–5x multiplier.',
  'This independent ZPLAY model draws each of the eight symbols equally in each cell. Wheel probabilities for 1x, 2x, 3x, 4x and 5x are 1/16, 2/16, 3/16, 4/16 and 6/16. They do not depend on account, balance, stake, history or player action.',
  'The exact theoretical return is 95.9014892578125%. This long-run average does not predict a session result. The official reference demo displays a different, provider-specific return of 96.58%.',
  'A manual winning round waits for Take Win. The next Spin collects the previous confirmed win before placing a new wager. Autoplay can request automatic collection when the paid round starts.',
  'A current win of at most 500.00 ETB can be risked on red or black, up to five attempts. Each fair attempt doubles the whole current win or loses it. A win above 500.00 ETB, or after five attempts, can only be collected. No second wallet stake is taken.',
  'A pending win is automatically collected after 30 minutes, including after disconnection. Reloading restores the same accepted round. Collection does not draw a new result.',
  'The maximum slot win is 2500 times the total stake, up to 250000.00 ETB at the maximum stake. All eligible gamble results also fit inside the already reserved round maximum.',
  'Only the displayed fixed ETB stakes are accepted. Outcomes, line prizes, current wins and credits come from the authenticated server.'
 ]
});
export const publicGames=freeze([publicConfig]);
export const publicGameConfigs=freeze({[ID]:publicConfig});
export const definitions=freeze({[ID]:{...publicConfig,math:publicConfig.math.description}});

function draw(rng,buckets){
 const value=rng();
 if(!Number.isFinite(value)||value<0||value>=1)fail('INVALID_SERVER_RANDOM',500);
 return Math.floor(value*buckets);
}
function stakeAmount(value){
 if(!money(value)||!model.stakeMinorValues.includes(value))fail('STAKE_NOT_IN_REFERENCE_SCHEDULE');
 return BigInt(value);
}
export function maximumPayoutMinor(stakeMinor){
 const stake=stakeAmount(stakeMinor),maximum=stake*BigInt(LIMITS.maxStakeMultiplier);
 // At every accepted stake this mathematical bound is within the absolute cap.
 if(maximum>BigInt(LIMITS.maxPayoutMinor))fail('MULTIHOT40_REFERENCE_LIMIT_CHANGED',500);
 return String(maximum);
}

// This evaluator is deterministic and contains no wallet or randomness. It is
// shared by the runtime and the independent analytical/boundary test fixtures.
export function evaluateGrid(grid,multiplier,stakeMinor){
 const stake=stakeAmount(stakeMinor);
 if(!Array.isArray(grid)||grid.length!==5||grid.some(reel=>!Array.isArray(reel)||reel.length!==4||reel.some(symbol=>!Number.isInteger(symbol)||symbol<0||symbol>=8))||!Number.isInteger(multiplier)||multiplier<1||multiplier>5)fail('INVALID_MULTIHOT40_RESULT',500);
 const wins=[];
 for(let line=0;line<model.paths.length;line++){
  const path=model.paths[line],symbol=grid[0][path[0]];let count=1;
  while(count<5&&grid[count][path[count]]===symbol)count++;
  const coefficient=model.coefficients[symbol][count]??0;
  if(!coefficient)continue;
  const numerator=stake*BigInt(coefficient)*BigInt(multiplier);
  if(numerator%400n!==0n)fail('NONINTEGRAL_REFERENCE_PRIZE',500);
  wins.push({line:line+1,symbol:String(symbol),count,cells:path.slice(0,count).map((row,reel)=>[reel,row]),frame:0,payoutMinor:String(numerator/400n)});
 }
 const payoutMinor=String(wins.reduce((sum,win)=>sum+BigInt(win.payoutMinor),0n));
 if(BigInt(payoutMinor)>BigInt(maximumPayoutMinor(stakeMinor)))fail('PAYOUT_EXCEEDS_MODEL_BOUND',500);
 const publicGrid=grid.map(reel=>reel.map(String));
 const feature={type:'multiplier',multiplier,capped:false};
 const frames=[{grid:clone(publicGrid),wins:clone(wins),feature:clone(feature),payoutMinor}];
 return {payoutMinor,grid:publicGrid,wins,frames,feature};
}

export function sampleOutcome(rng,stakeMinor){
 // Validate stake before drawing. There are exactly 21 draws, and stopping the
 // client animation never changes this server result or consumes another wager.
 stakeAmount(stakeMinor);
 const grid=Array.from({length:5},()=>Array.from({length:4},()=>draw(rng,8)));
 return evaluateGrid(grid,MULTIPLIER_TICKETS[draw(rng,16)],stakeMinor);
}

function canGamble(state){
 return state.status==='active'&&state.gambleAttempts<LIMITS.gambleAttempts&&
  BigInt(state.currentCashoutMinor)>0n&&BigInt(state.currentCashoutMinor)<=BigInt(LIMITS.gambleMaximumCurrentWinMinor)&&
  2n*BigInt(state.currentCashoutMinor)<=BigInt(state.liabilityMinor);
}
const transition=(state,debitMinor='0')=>({state,debitMinor,maxPayoutMinor:state.liabilityMinor,payoutMinor:state.status==='settled'?state.payoutMinor:null});
function settle(state,now,reason){
 return transition({...clone(state),status:'settled',settledAt:now,expiresAt:now,payoutMinor:state.currentCashoutMinor,reason});
}
function checkedState(state,now){
 if(!object(state)||state.gameId!==ID||state.modelVersion!==VERSION||!['active','settled'].includes(state.status)||!time(now)||!time(state.startedAt)||now<state.startedAt||!time(state.expiresAt)||!money(state.stakeMinor)||!model.stakeMinorValues.includes(state.stakeMinor)||state.liabilityMinor!==maximumPayoutMinor(state.stakeMinor)||!money(state.currentCashoutMinor)||!money(state.baseWinMinor)||BigInt(state.currentCashoutMinor)>BigInt(state.liabilityMinor)||!Number.isInteger(state.gambleAttempts)||state.gambleAttempts<0||state.gambleAttempts>LIMITS.gambleAttempts||!Array.isArray(state.gambleHistory)||state.gambleHistory.length!==state.gambleAttempts)fail('INVALID_MULTIHOT40_STATE',500);
 if(!Array.isArray(state.grid)||state.grid.length!==5||state.grid.some(reel=>!Array.isArray(reel)||reel.length!==4||reel.some(symbol=>typeof symbol!=='string'||!/^[0-7]$/.test(symbol)))||!object(state.feature)||state.feature.type!=='multiplier'||state.feature.capped!==false)fail('INVALID_MULTIHOT40_STATE',500);
 const original=evaluateGrid(state.grid.map(reel=>reel.map(Number)),state.feature.multiplier,state.stakeMinor);
 // PostgreSQL jsonb changes object key order, but not the award or frame data.
 if(original.payoutMinor!==state.baseWinMinor||!sameJson(original.wins,state.wins)||!sameJson(original.frames,state.frames))fail('INVALID_MULTIHOT40_STATE',500);
 let current=BigInt(state.baseWinMinor),lastAt=state.startedAt;
 for(let index=0;index<state.gambleHistory.length;index++){
  const item=state.gambleHistory[index],suit=object(item)?SUITS.find(value=>value.suit===item.suit):null;
  if(!suit||item.attempt!==index+1||!['red','black'].includes(item.selection)||item.rank!=='A'||item.color!==suit.color||item.won!==(item.selection===suit.color)||item.amountBeforeMinor!==String(current)||current<=0n||current>BigInt(LIMITS.gambleMaximumCurrentWinMinor)||!time(item.at)||item.at<lastAt||item.at>=state.startedAt+LIMITS.collectionMs||item.at>now)fail('INVALID_MULTIHOT40_STATE',500);
  current=item.won?current*2n:0n;lastAt=item.at;
  if(item.amountAfterMinor!==String(current))fail('INVALID_MULTIHOT40_STATE',500);
 }
 if(String(current)!==state.currentCashoutMinor)fail('INVALID_MULTIHOT40_STATE',500);
 if(state.status==='active'&&(state.payoutMinor!==null||state.expiresAt!==state.startedAt+LIMITS.collectionMs||BigInt(state.currentCashoutMinor)===0n))fail('INVALID_MULTIHOT40_STATE',500);
 if(state.status==='settled'&&(!time(state.settledAt)||state.settledAt<lastAt||state.settledAt>now||state.expiresAt!==state.settledAt||state.payoutMinor!==state.currentCashoutMinor))fail('INVALID_MULTIHOT40_STATE',500);
 return state;
}

export function start(gameId,options,rng,now){
 if(gameId!==ID)fail('GAME_NOT_FOUND',404);
 if(definitions[ID].launchable!==true)fail('GAME_MODEL_NOT_READY',409);
 return evaluateDraftRound(gameId,options,rng,now);
}

// Isolated verification entry point. Production registration and start() retain
// the release gate; calling this pure function neither touches nor invents money.
export function evaluateDraftRound(gameId,options,rng,now){
 if(gameId!==ID)fail('GAME_NOT_FOUND',404);
 if(!object(options)||Object.keys(options).some(key=>!['stakeMinor','autoCollect'].includes(key))||options.autoCollect!==undefined&&typeof options.autoCollect!=='boolean')fail('INVALID_MULTIHOT40_OPTIONS');
 stakeAmount(options.stakeMinor);
 if(!time(now)||!Number.isSafeInteger(now+LIMITS.collectionMs))fail('INVALID_SERVER_TIME',500);
 const paid=sampleOutcome(rng,options.stakeMinor);
 const state={gameId:ID,modelVersion:VERSION,family:'slots',status:'active',stakeMinor:options.stakeMinor,
  startedAt:now,expiresAt:now+LIMITS.collectionMs,liabilityMinor:maximumPayoutMinor(options.stakeMinor),
  grid:paid.grid,wins:paid.wins,frames:paid.frames,feature:paid.feature,baseWinMinor:paid.payoutMinor,
  currentCashoutMinor:paid.payoutMinor,payoutMinor:null,gambleAttempts:0,gambleHistory:[],reason:'PENDING_COLLECTION'};
 const result=paid.payoutMinor==='0'?settle(state,now,'NO_WIN'):options.autoCollect?settle(state,now,'AUTO_COLLECTED'):transition(state);
 result.debitMinor=options.stakeMinor;return result;
}

export function act(raw,input,rng,now){
 const state=checkedState(raw,now);
 if(state.status!=='active')fail('ROUND_ALREADY_SETTLED',409);
 if(!object(input)||!['collect','gamble'].includes(input.type)||Object.keys(input).some(key=>!['type',...(input.type==='gamble'?['color']:[])].includes(key))||input.type==='gamble'&&!['red','black'].includes(input.color))fail('INVALID_MULTIHOT40_ACTION');
 if(now>=state.expiresAt)return expire(state,rng,now);
 if(input.type==='collect')return settle(state,now,'COLLECTED');
 if(!canGamble(state))fail('GAMBLE_NOT_AVAILABLE',409);
 const card=SUITS[draw(rng,4)],won=card.color===input.color;
 const amount=won?String(2n*BigInt(state.currentCashoutMinor)):'0';
 const attempt=state.gambleAttempts+1;
 const entry={attempt,selection:input.color,rank:'A',suit:card.suit,color:card.color,won,
  amountBeforeMinor:state.currentCashoutMinor,amountAfterMinor:amount,at:now};
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
 const state=checkedState(raw,now);
 const {gameId,modelVersion,family,status,stakeMinor,startedAt,expiresAt,settledAt,payoutMinor,baseWinMinor,currentCashoutMinor,grid,wins,frames,feature,gambleAttempts,gambleHistory,reason}=state;
 const view={gameId,modelVersion,family,status,stakeMinor,startedAt,expiresAt,payoutMinor,baseWinMinor,currentCashoutMinor,grid,wins,frames,feature,gambleAttempts,gambleHistory,reason,
  actions:status==='active'?['collect',...(canGamble(state)?['gamble']:[])]:[],
  gambleAvailable:canGamble(state),gambleAttemptsRemaining:Math.max(0,LIMITS.gambleAttempts-gambleAttempts)};
 if(status==='settled')view.settledAt=settledAt;
 return clone(view);
}

export default {definitions,start,act,expire,publicState};
