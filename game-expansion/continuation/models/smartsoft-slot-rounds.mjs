import sourceModels from './smartsoft-slots.data.json' with {type:'json'};
import {NATIVE_PROFILES} from './smartsoft-slot-profiles.mjs';
import {
 publicGameConfigs as previousConfigs,
 createReferenceSlotKernel
} from './smartsoft-slots.mjs';

// New immutable versions add the observed Take Win / X2 flow. Each title keeps
// its own public geometry, coefficient table, scatter and feature evaluator.
// The v1 auto-settlement module and the separate MultiHot40 v2 stay untouched.
const clone=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=(code,status=422)=>{throw Object.assign(new Error(code),{status});};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const money=value=>typeof value==='string'&&/^(0|[1-9]\d{0,14})$/.test(value);
const time=value=>Number.isSafeInteger(value)&&value>=0;
const decimalMinor=value=>{if(typeof value!=='string'||!/^(0|[1-9]\d*)\.\d{1,2}$/.test(value))fail('INVALID_MODEL_MONEY',500);const [whole,fraction]=value.split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));};
const byId=freeze(Object.fromEntries(sourceModels.filter(model=>model.id!=='multihot40_native').map(model=>[model.id,clone(model)])));
export const GAME_IDS=freeze(Object.keys(byId));
export const COLLECTION_MS=30*60*1000;
export const MULTIHOT100_MULTIPLIER_TICKETS=freeze([1,2,2,3,3,3,4,4,4,4,5,5,5,5,5,5]);
const SUITS=freeze([{suit:'clubs',color:'black'},{suit:'diamonds',color:'red'},{suit:'hearts',color:'red'},{suit:'spades',color:'black'}]);
const getModel=id=>byId[id]??fail('GAME_NOT_FOUND',404);
const versionOf=model=>model.version.replace(/-1$/,'-2');
const SCATTER_REVIEWS=freeze({
 burningice_native:{divisor:5,sourceStake:'0.05',cashDollar:'0.15/1.00/3.00',normalizedDollar:'3/20/60',pot:'Pot on reels1,3,5 pays20 times total stake (1.00 DMO at0.05).'},
 burningice10_native:{divisor:10,sourceStake:'0.10',cashDollar:'0.30/2.00/6.00',normalizedDollar:'3/20/60',pot:'Pot on reels1,3,5 pays20 times total stake (2.00 DMO at0.10).'},
 burningice40_native:{divisor:40,sourceStake:'0.40',cashDollar:'1.20/8.00/40.00',normalizedDollar:'3/20/100',pot:''}
});
const kernels=Object.fromEntries(Object.values(byId).map(model=>[model.id,createReferenceSlotKernel(model.id,{
 version:versionOf(model),
 ...(NATIVE_PROFILES[model.id]?{nativeProfile:NATIVE_PROFILES[model.id]}:{}),
 ...(SCATTER_REVIEWS[model.id]?{scatterCoefficientBasis:'line-stake'}:{}),
 ...(model.id==='multihot5superwilds_native'?{payoutStakeDivisor:10}:{})
})]));
const limitsOf=model=>({attempts:Number(model.referenceLimits.DoublingMaxCount),maximumCurrentWin:decimalMinor(model.referenceLimits.DoublingMaxWin),absolute:decimalMinor(model.maxWin)});
for(const model of Object.values(byId)){
 const limits=limitsOf(model);
 if(!Number.isInteger(limits.attempts)||limits.attempts!==5||limits.maximumCurrentWin!==50000n||versionOf(model)===model.version)throw Error('UNREVIEWED_SMARTSOFT_INTERACTIVE_REFERENCE');
}
const hundred=getModel('multihot100_native');
if(hundred.columns!==5||hundred.rows!==4||hundred.paths.length!==100||hundred.symbols.length!==8||hundred.wildSymbols.length||hundred.scatters.length||hundred.mechanic!=='multiplier'||hundred.sampling.some(reel=>JSON.stringify(reel)!=='[0,1,2,3,4,5,6,7]'))throw Error('MULTIHOT100_REFERENCE_CONTRACT_CHANGED');

export const MULTIHOT100_MATH=freeze({
 kind:'independent-zplay',version:'superwin-multihot100-2',officialPrivateMathVerified:false,publicPayoutCoefficientsScaled:false,
 symbolWeights:[1,1,1,1,1,1,1,1],multiplierWeights:[1,2,3,4,6],multiplierWeightTotal:16,
 nativeReturn:{numerator:'31425',denominator:'32768',value:31425/32768,percent:'95.9014892578125',method:'Exact enumeration of the 8^5 symbol sequences on each public line, linearity over the 100 fixed paths, and independent wheel mean 15/4.'},
 maximum:'2500 times total stake, attained by five sevens on all100 lines and5x. No coefficient scaling or payout clipping is required by this model.',
 randomness:'Eight symbol buckets and sixteen wheel tickets exactly divide the canonical53-bit uniform RNG space. The fixed profile does not depend on player, stake, balance or history.',
 rounding:'Every allowed reference stake gives exact whole-santim prizes.',
 description:'Independent ZPLAY probability law: exact theoretical RTP95.9014892578125%; raw public prizes and100-line geometry are retained. This is not the provider-private RNG.'
});

function configFor(model){
 const prior=clone(previousConfigs[model.id]),limits=limitsOf(model);
 const profile=NATIVE_PROFILES[model.id];
 const math=model.id==='multihot100_native'?clone(MULTIHOT100_MATH):profile?{
  kind:profile.kind,version:profile.version,officialPrivateMathVerified:false,publicPayoutCoefficientsScaled:false,
  nativeReturn:clone(profile.nativeReturn),...(profile.attainedMaximumStakeMultiplier?{attainedMaximumStakeMultiplier:profile.attainedMaximumStakeMultiplier}:{maximumStakeMultiplierBound:profile.maximumStakeMultiplierBound}),
  probabilityEvidence:'models/smartsoft-slot-profiles.mjs',diagnosticEvidence:'models/smartsoft-slots.v2-audit.json',
  method:profile.method,randomness:profile.randomness,
  ...(profile.reelWindows?{reelWindows:clone(profile.reelWindows)}:{symbolWeights:[8,...Array(8).fill(31)],addedWildProbability:{numerator:'1',denominator:String(profile.addWildChanceDenominator)}}),
  ...(profile.multiplierTickets?{multiplierWeights:[1,2,3,4,5].map(value=>profile.multiplierTickets.filter(ticket=>ticket===value).length),multiplierWeightTotal:profile.multiplierTickets.length}:{}),
  ...(profile.frozenProof?{frozenProof:clone(profile.frozenProof),coinProbability:profile.coinTickets?{numerator:String(profile.coinTickets.filter(value=>value!==null).length),denominator:String(profile.coinTickets.length)}:{numerator:'0',denominator:'1'}}:{}),
  description:`Independent ZPLAY distribution: exact theoretical return ${(profile.nativeReturn.value*100).toFixed(9)}%. Public coefficients stay unchanged; the fixed native support pays every accepted prize in full ${profile.attainedMaximumStakeMultiplier?`and attains the published ${profile.attainedMaximumStakeMultiplier}x maximum`:`within a ${profile.maximumStakeMultiplierBound}x mathematical bound`} without clipping. This is not the provider's private probability law.`
 }:clone(prior.math);
 const scatterReview=SCATTER_REVIEWS[model.id],correctedScatter=Boolean(scatterReview);
 const correctedSuperWild=model.id==='multihot5superwilds_native';
 if(correctedScatter&&!profile){
  // The official live help at total stake0.40 displays Dollar3/4/5 prizes
  //1.20/8.00/40.00. Raw120/800/4000 uses the0.01 line stake; normalized
  //total-stake coefficients are3/20/100. Preserve the original source values.
  delete math.independentDraftDiagnostic;
  math.calibrationStatus='pending_corrected_scatter_profile';
  math.description=`Raw public prizes are preserved. Dollar3/4/5 pays${scatterReview.normalizedDollar} times total stake, confirmed by official live help at${scatterReview.sourceStake} DMO. ${scatterReview.pot} Historical raw-field interpretation multiplied scatter by${scatterReview.divisor} incorrectly; those diagnostics do not apply to this version. Independent sampling and respin recurrence remain under review.`;
 }
 if(correctedSuperWild&&!profile){
  delete math.independentDraftDiagnostic;
  math.calibrationStatus='pending_corrected_public_prize_profile';
  math.description='Raw public coefficients are preserved against one tenth of total stake. Official live help at0.10 DMO shows Seven/Wild3/4/5 prizes0.30/1.00/4.00. There are five fixed paths, but the source coefficient basis is total stake divided by10. Historical diagnostics that divided by5 do not apply. Independent sampling and added-Wild probabilities remain under review.';
 }
 const paytable=clone(prior.paytable).map(entry=>correctedScatter&&model.scatters.some(scatter=>String(scatter.symbol)===entry.symbol)?{
  ...entry,basis:'total stake',rawReferenceBasis:`total stake divided by${scatterReview.divisor}`,rawReferenceCounts:clone(entry.counts),
  counts:Object.fromEntries(Object.entries(entry.counts).map(([count,value])=>[count,{numerator:value.numerator,denominator:String(BigInt(value.denominator)*BigInt(scatterReview.divisor)),value:value.value/scatterReview.divisor}]))
 }:correctedSuperWild?{...entry,basis:'stake divided by 10'}:entry);
 return {
  ...prior,version:versionOf(model),launchable:false,actions:['collect','gamble'],math,paytable,
  controls:{manualCollection:true,automaticCollectionOption:'autoCollect',gambleColors:['red','black']},
  gamble:{maximumAttempts:limits.attempts,maximumCurrentWinMinor:String(limits.maximumCurrentWin),maximumPossibleWinMinor:String(limits.maximumCurrentWin*2n),chance:{numerator:'1',denominator:'2'},payoffMultiplier:2,referenceLimitSemanticsVerified:false,
   limitMeaning:'Independent ETB rule: a current win up to500.00 may be doubled, up to five attempts, within the reserved liability. A larger current win is collection-only. The raw public500 DMO field does not verify the provider pre/post-double eligibility boundary.'},
  collection:{expiresAfterMs:COLLECTION_MS,expiryReturnsCurrentWin:true,policy:'ZPLAY30-minute disconnect safeguard; not a claim about the provider timeout.'},
  releaseGate:{...clone(prior.releaseGate),status:'interactive_draft_pending_individual_release',productionLaunchable:false,referenceParityClaim:false},
  currencyAdaptation:{...clone(prior.currencyAdaptation),productionLaunchable:false},
  referenceNotes:[...prior.referenceNotes,'Take Win, red/black doubling and the public five-attempt/500 fields are recorded in first11-optional-controls.json. The ETB boundary is an explicit independent rule, not a verified provider boundary.',...(correctedScatter?[`Official live demo help, 2026-11-09: at${scatterReview.sourceStake} DMO total stake, Dollar3/4/5 displays${scatterReview.cashDollar}. Normalized total-stake coefficients are${scatterReview.normalizedDollar}; raw fields are retained as reference metadata. ${scatterReview.pot}`]:[]),...(correctedSuperWild?['Official live demo help, 2026-11-09, spin1961125852.1: the actual spin debits0.10 DMO and the help selector remains0.10. Seven/Wild3/4/5 cash prizes0.30/1.00/4.00 establish a coefficient basis of one tenth of total stake, despite five fixed paths.']:[])],
  rules:[...prior.rules.filter(rule=>!rule.includes('All results resolve on the server in one accepted round.')&&!((model.id==='multihot100_native'||profile)&&(rule.includes('equally likely')||rule.includes('draft payout ceiling')||rule.includes('disabled pending')||rule.includes('Official help states a maximum')||rule.includes('Prior adaptation')||rule.startsWith('Unverified draft')||rule.startsWith('Independent draft reel tickets')||rule.startsWith('The isolated Super Wild draft')||rule.startsWith('Fractional santim')||rule.startsWith('Clover expands'))) &&!(correctedScatter&&(rule.startsWith('Highest left-to-right regular')||rule.startsWith('Pot additionally')))),
   ...(profile?[`This independent native probability profile has an exact theoretical return of ${(profile.nativeReturn.value*100).toFixed(9)}%. Its fixed weighted reel windows or cells and feature probabilities do not depend on the player, balance, stake or history. They are not the provider's private probabilities.`,
    `The complete native outcome support pays the public coefficients in full ${profile.attainedMaximumStakeMultiplier?`and attains ${profile.attainedMaximumStakeMultiplier} times total stake`:`within a proved bound of ${profile.maximumStakeMultiplierBound} times total stake`}. No supported win is reduced by a payout ceiling.`]:[]),
   ...(profile?.frozenProof?['A newly paid or improved winning combination freezes the participating reels; only the remaining reels respin. Previously paid line/scatter amounts are retained, and only increases are added. The native sequence ends when there is no improvement or all reels are frozen. Each continuation adds a frozen reel, making the existing five-frame bound redundant. This payment recurrence is an explicit independent native rule.',
    `Clover expands on reels ${model.expandingReels.map(reel=>reel+1).join(', ')}, preserving every Dollar${model.scatters.some(scatter=>scatter.symbol===9)?' and Pot':''} scatter.`,
    ...(profile.coinTickets?['Each of the three eligible coin reels has one initial trigger ticket out of256. A lit coin replaces every non-scatter symbol on its reel with Wilds; no coin draw occurs during respins.']:['This40-line variant has no assumed lucky-coin effect.'])]:[]),
   ...(correctedSuperWild?['After the initial grid, every cell has an independent one-in-256 chance to become Wild. The presentation shows the initial grid before applying every added Wild and evaluating the final prize. These are fixed native probabilities, not provider trigger odds.']:[]),
   'Every supported stake and public prize is an exact whole-santim amount. Payouts are neither scaled nor clipped.',
   ...(correctedScatter?[`Highest left-to-right regular award per line. Dollar scatter pays${scatterReview.normalizedDollar} times total stake for3/4/5 or more symbols anywhere; one highest scatter award adds to line wins. ${scatterReview.pot} The raw reference scatter coefficients multiply total stake divided by${scatterReview.divisor}.`]:[]),
   ...(correctedSuperWild?['This title has five fixed paths. Its public prize coefficients multiply one tenth of total stake, as confirmed by live cash prizes at the selected stake; they do not multiply one fifth. All-Wild lines take the highest eligible substituted Seven prize. Five full Seven lines with a5x wheel attain the published1000x maximum without truncation.']:[]),
   'The complete slot outcome and automatic respin/extra-Wild sequence are resolved by the server from one stake. A manual winning round waits for Take Win; paid autoplay may request autoCollect when the round starts.',
   'The next paid Spin first collects an accepted pending win. Collection and optional red/black doubling never debit a second stake.',
   'A current win of at most500.00 ETB may be risked on red or black up to five times. A fair independent attempt doubles it or loses it. No successful doubled win is clipped. Availability also respects the fixed round liability reserved before the outcome.',
   'A disconnected pending win is automatically collected after30 minutes. Reloading restores the same accepted round and does not draw again.',
   ...(model.id==='multihot100_native'?['Each symbol is equally likely. Wheel weights for1x–5x are1,2,3,4,6 out of16; the exact independent theoretical return is95.9014892578125%.']:[])]
 };
}
export const publicGames=freeze(Object.values(byId).map(configFor));
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
 if(state.modelVersion!==versionOf(model)||state.family!=='slots'||!['active','settled'].includes(state.status)||!time(now)||!time(state.startedAt)||now<state.startedAt||!time(state.startedAt+COLLECTION_MS)||!time(state.expiresAt)||!money(state.stakeMinor)||!model.stakeMinorValues.includes(state.stakeMinor)||state.liabilityMinor!==maximumPayoutMinor(model.id,state.stakeMinor)||!money(state.baseWinMinor)||!money(state.currentCashoutMinor)||BigInt(state.currentCashoutMinor)>BigInt(state.liabilityMinor)||!Number.isInteger(state.gambleAttempts)||state.gambleAttempts<0||state.gambleAttempts>limits.attempts||!Array.isArray(state.gambleHistory)||state.gambleHistory.length!==state.gambleAttempts)fail('INVALID_SMARTSOFT_ROUND_STATE',500);
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
 const state={gameId,modelVersion:versionOf(model),family:'slots',status:'active',stakeMinor:options.stakeMinor,startedAt:now,expiresAt:now+COLLECTION_MS,liabilityMinor,
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
 const view={gameId,modelVersion,family,status,stakeMinor,startedAt,expiresAt,payoutMinor,baseWinMinor,currentCashoutMinor,grid,wins,frames,feature,gambleAttempts,gambleHistory,reason,
  actions:status==='active'?['collect',...(canGamble(state)?['gamble']:[])]:[],gambleAvailable:canGamble(state),gambleAttemptsRemaining:limits.attempts-gambleAttempts};
 if(status==='settled')view.settledAt=settledAt;
 return clone(view);
}
export default {definitions,start,act,expire,publicState};
