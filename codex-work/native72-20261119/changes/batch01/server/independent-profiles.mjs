/**
 * OFFLINE design and exact audit of OUR operator probability models.
 * Genuine captured symbol/paytable/line geometry is reused by the evaluator;
 * these reel frequencies and wheel weights are independently designed here.
 * Nothing in this module certifies or enables a production game.
 */
import {createHash} from 'node:crypto';
import {GAME_REFERENCE,OFFICIAL_LINE_PATHS,evaluateCapturedMath} from './official-math.mjs';

export const OPERATOR_SYMBOLS=Object.freeze(['seven','bell','grape','watermelon','lemon','plum','orange','cherry']);
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value};
export const INDEPENDENT_DESIGNS=freeze({
  fresh_multihot20:{target:{numerator:'9663',denominator:'10000',source:'official_claimed_RTP_target_only'},
    // Adjacent Seven on reel one makes the existing 1000x cap reachable.
    reelStrips:Array.from({length:5},(_,column)=>column===0?['seven',...OPERATOR_SYMBOLS]:[...OPERATOR_SYMBOLS])},
  fresh_multihot5burnwilds:{target:{numerator:'1931',denominator:'2000',source:'official_claimed_RTP_target_only'},
    // Our frequency choice: lower-paying fruits occur twice on each middle
    // strip, while Seven and Wild occur once. This is not a provider strip.
    reelStrips:Array.from({length:5},(_,column)=>column===0||column===4?
      ['seven','grape','watermelon','bell','lemon','plum','orange','cherry']:
      [...OPERATOR_SYMBOLS,'wild','lemon','plum','orange','cherry'])},
});
export const REJECTED_BURN_DRAFT=freeze({gameId:'fresh_multihot5burnwilds',
  reelStrips:Array.from({length:5},(_,column)=>[...OPERATOR_SYMBOLS,...(column>0&&column<4?['wild']:[])])});

const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){[a,b]=[b,a%b]}return a};
export const fraction=(numerator,denominator)=>{
  if(denominator<=0n)throw Error('INVALID_AUDIT_DENOMINATOR');
  const common=gcd(numerator,denominator);
  return {numerator:String(numerator/common),denominator:String(denominator/common)};
};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const decimal=(numerator,denominator,digits=12)=>{
  const scale=10n**BigInt(digits),units=numerator*scale/denominator;
  return `${units/scale}.${String(units%scale).padStart(digits,'0')}`;
};

export function enumerateIndependentReturns({gameId,reelStrips}){
  const ref=GAME_REFERENCE[gameId];
  if(!ref||!Array.isArray(reelStrips)||reelStrips.length!==5||reelStrips.some(strip=>!Array.isArray(strip)||strip.length<3))throw Error('INVALID_INDEPENDENT_STRIPS');
  for(const [column,strip] of reelStrips.entries())for(const symbol of strip){
    if(!Object.hasOwn(ref.paytable,symbol)||symbol==='wild'&&(gameId!=='fresh_multihot5burnwilds'||column<1||column>3))throw Error('INVALID_INDEPENDENT_SYMBOL');
  }
  const boardCount=reelStrips.reduce((n,strip)=>n*strip.length,1);
  if(!Number.isSafeInteger(boardCount)||boardCount>2000000)throw Error('AUDIT_ENUMERATION_TOO_LARGE');
  const sums=Array(5).fill(0n),maxima=Array(5).fill(0n),maxWitnesses=Array(5).fill(null),cappedBoards=Array(5).fill(0),winBoards=Array(5).fill(0);
  for(let board=0;board<boardCount;board++){
    let cursor=board;
    const stops=reelStrips.map(strip=>{const stop=cursor%strip.length;cursor=Math.floor(cursor/strip.length);return stop});
    // Same stop-to-grid projection as the existing server sampler.
    const grid=Array.from({length:3},(_,row)=>stops.map((stop,column)=>{
      const strip=reelStrips[column];return strip[(stop+row-1+strip.length)%strip.length];
    }));
    for(let wheel=1;wheel<=5;wheel++){
      // Evaluate every combination and wheel separately, including FoundationBet,
      // Burn Wild expansion and the stake-proportional liability cap.
      const result=evaluateCapturedMath({gameId,grid,bet:'1.00',wheelMultiplier:wheel});
      const win=result.finalWinCents,index=wheel-1;
      sums[index]+=win;
      if(win>maxima[index]){
        maxima[index]=win;
        maxWitnesses[index]={stops:[...stops],initialGrid:grid,finalGrid:result.grid,
          baseWin:result.baseWin,finalWin:result.finalWin,maxWinCapped:result.maxWinCapped};
      }
      if(result.maxWinCapped)cappedBoards[index]++;
      if(win>0n)winBoards[index]++;
    }
  }
  const denominator=BigInt(boardCount)*100n;
  return {boardCount,bet:'1.00',betCents:'100',returnDenominator:String(denominator),
    perWheel:sums.map((sum,index)=>({wheel:index+1,payoutSumCents:String(sum),
      returnFraction:fraction(sum,denominator),rtpPercentTruncated:decimal(sum*100n,denominator),
      maximumObservedWinCents:String(maxima[index]),maximumWitness:maxWitnesses[index],cappedBoards:cappedBoards[index],winningBoards:winBoards[index]})),
    maximumObservedWinCents:String(maxima.reduce((a,b)=>a>b?a:b)),
    evaluatorCalls:boardCount*5};
}

export function deriveExactWheelWeights({perWheel,returnDenominator},target){
  const sums=perWheel.map(row=>BigInt(row.payoutSumCents)),D=BigInt(returnDenominator);
  const p=BigInt(target.numerator),q=BigInt(target.denominator);
  if(sums.length!==5||p<=0n||q<=0n||sums.some((value,index)=>index>0&&value<sums[index-1]))throw Error('INVALID_RTP_AUDIT_INPUT');
  const targetScaled=p*D,minimum=q*sums[0],maximum=q*sums[4];
  const bounds={minimum:fraction(sums[0],D),maximum:fraction(sums[4],D)};
  // Positive probabilities on every wheel require a strict interior target,
  // unless all five outcomes have exactly the same expected return.
  if(targetScaled<minimum||targetScaled>maximum||minimum!==maximum&&(targetScaled===minimum||targetScaled===maximum)){
    return {feasible:false,reason:'TARGET_OUTSIDE_POSITIVE_WHEEL_MIXTURE',bounds,targetReturn:fraction(p,q)};
  }
  const sum=sums.reduce((a,b)=>a+b,0n),uniform=q*sum,requested=5n*targetScaled;
  let weights;
  if(uniform===requested)weights=Array(5).fill(1n);
  else{
    // Rational blend of the uniform wheel with one endpoint. All arithmetic is
    // integer; the gcd reduction preserves exact expected return.
    const low=requested<uniform;
    const K=low?targetScaled-minimum:maximum-targetScaled;
    const A=low?uniform-requested:requested-uniform;
    const common=gcd(K,A);
    weights=Array(5).fill(K/common);weights[low?0:4]+=A/common;
  }
  const total=weights.reduce((a,b)=>a+b,0n);
  if(weights.some(weight=>weight<=0n)||total>0xFFFFFFFFn)return {feasible:false,reason:'EXACT_WEIGHT_SUM_EXCEEDS_SECURE_INDEX',bounds,weightSum:String(total),targetReturn:fraction(p,q)};
  const weightedPayout=sums.reduce((sum,value,index)=>sum+value*weights[index],0n);
  const expectedDenominator=D*total;
  if(q*weightedPayout!==p*expectedDenominator)throw Error('EXACT_RTP_PROOF_FAILED');
  return {feasible:true,wheelWeights:weights.map(Number),weightSum:Number(total),bounds,
    expectedReturn:fraction(weightedPayout,expectedDenominator),targetReturn:fraction(p,q),
    proof:{weightedPayoutNumerator:String(weightedPayout),expectedReturnDenominator:String(expectedDenominator),
      left:String(q*weightedPayout),right:String(p*expectedDenominator),equal:true}};
}

export function auditIndependentDesign(gameId,{evaluatorSha256}){
  const design=INDEPENDENT_DESIGNS[gameId],reference=GAME_REFERENCE[gameId];
  if(!design||!/^[a-f0-9]{64}$/.test(evaluatorSha256??''))throw Error('INDEPENDENT_AUDIT_SOURCE_REQUIRED');
  const enumeration=enumerateIndependentReturns({gameId,reelStrips:design.reelStrips});
  const mixture=deriveExactWheelWeights(enumeration,design.target);
  const audit={schema:'zplay-independent-operator-audit-v1',gameId,
    providerRngReproduced:false,providerCertified:false,productionApproved:false,
    modelKind:'independent_operator_probability_model',target:design.target,
    evaluatorSha256,foundationBet:reference.foundationBet,paylines:reference.paylines,
    stripLengths:design.reelStrips.map(strip=>strip.length),enumeration,mixture,
    officialLiabilityCapX:reference.maxWinX,
    modeledMaximumWinX:fraction(BigInt(enumeration.maximumObservedWinCents),100n),
    validity:'exact_for_all_accepted_stakes_by_integer_denomination_homogeneity',
    requiredBeforeRelease:['operator_model_review','integration_and_authentication_acceptance','live_route_visual_audio_and_wallet_recovery_verification']};
  if(!mixture.feasible)return {audit,profile:null};
  const math={schema:'zplay-independent-operator-profile-v1',gameId,
    mathVersion:'zplay-independent-'+gameId.replace('fresh_','')+'-v1',engineVersion:'zplay-official-coefficients-integer-v1',
    evaluatorSha256,reelStrips:design.reelStrips,linePaths:OFFICIAL_LINE_PATHS[gameId],
    wheelWeights:mixture.wheelWeights,targetReturn:mixture.expectedReturn,
    foundationBet:reference.foundationBet,maxWinX:reference.maxWinX,paytable:reference.paytable};
  const profile={...math,mathSha256:hash(math),productionApproved:false,probabilityModelAudited:false,
    offlineExactEnumerationVerified:true,providerRngReproduced:false,providerCertified:false,
    auditReference:'independent-operator-audit.json#'+gameId};
  return {audit,profile};
}
