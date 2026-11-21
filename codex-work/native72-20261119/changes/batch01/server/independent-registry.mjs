// Server-only integrity boundary for independently designed operator profiles.
// This loads candidates; it cannot turn on production wagering or sign off parity.
import {createHash} from 'node:crypto';
import {GAME_REFERENCE,OFFICIAL_LINE_PATHS,GameMathError} from './official-math.mjs';

const fail=code=>{throw new GameMathError(code,503)};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const integer=value=>typeof value==='string'&&/^(0|[1-9]\d*)$/.test(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
const mathFields=['schema','gameId','mathVersion','engineVersion','evaluatorSha256','reelStrips','linePaths','wheelWeights','targetReturn','foundationBet','maxWinX','paytable'];

export function createIndependentRegistry({artifactBytes,evaluatorBytes,expectedArtifactSha256}){
  if(!/^[a-f0-9]{64}$/.test(expectedArtifactSha256??'')||
     sha(artifactBytes)!==expectedArtifactSha256)fail('OPERATOR_ARTIFACT_HASH_MISMATCH');
  let artifact;
  try{artifact=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(artifactBytes))}
  catch{fail('OPERATOR_ARTIFACT_INVALID')}
  const evaluatorSha256=sha(evaluatorBytes);
  if(artifact.schema!=='zplay-independent-operator-designs-v1'||
     artifact.evaluatorSha256!==evaluatorSha256)fail('OPERATOR_EVALUATOR_HASH_MISMATCH');
  if(artifact.productionApproved!==false||artifact.providerRngReproduced!==false)
    fail('OPERATOR_ARTIFACT_CANNOT_ENABLE_PRODUCTION');
  const profiles={};
  if(!same(Object.keys(artifact.results??{}).sort(),Object.keys(GAME_REFERENCE).sort()))
    fail('OPERATOR_ARTIFACT_GAME_SET_MISMATCH');
  for(const [gameId,{profile:p,audit:a}] of Object.entries(artifact.results)){
    const ref=GAME_REFERENCE[gameId];
    if(!p||!a||p.gameId!==gameId||p.schema!=='zplay-independent-operator-profile-v1'||
       p.evaluatorSha256!==evaluatorSha256||a.evaluatorSha256!==evaluatorSha256)
      fail('OPERATOR_PROFILE_INVALID');
    if(p.productionApproved!==false||p.probabilityModelAudited!==false||
       p.providerRngReproduced!==false||p.providerCertified!==false||p.offlineExactEnumerationVerified!==true)
      fail('OPERATOR_CANDIDATE_APPROVAL_INVALID');
    if(sha(JSON.stringify(Object.fromEntries(mathFields.map(k=>[k,p[k]]))))!==p.mathSha256)
      fail('OPERATOR_PROFILE_HASH_MISMATCH');
    if(!same(p.linePaths,OFFICIAL_LINE_PATHS[gameId])||!same(p.paytable,ref.paytable)||
       p.foundationBet!==ref.foundationBet||p.maxWinX!==ref.maxWinX)
      fail('OPERATOR_REFERENCE_RULES_MISMATCH');
    if(!Array.isArray(p.reelStrips)||p.reelStrips.length!==5||p.reelStrips.some((strip,c)=>
      !Array.isArray(strip)||strip.length<3||strip.some(s=>!Object.hasOwn(ref.paytable,s)||s==='wild'&&(c===0||c===4))))
      fail('OPERATOR_STRIPS_INVALID');
    const weights=p.wheelWeights;
    if(!Array.isArray(weights)||weights.length!==5||weights.some(w=>!Number.isSafeInteger(w)||w<=0)||
       weights.reduce((s,w)=>s+w,0)>0xFFFFFFFF)fail('OPERATOR_WHEEL_WEIGHTS_INVALID');
    const e=a.enumeration,m=a.mixture,t=p.targetReturn;
    if(!t||![t.numerator,t.denominator].every(integer)||BigInt(t.numerator)<=0n||BigInt(t.denominator)<=0n||
       !e||!Array.isArray(e.perWheel)||e.perWheel.length!==5||!integer(e.returnDenominator)||
       !e.perWheel.every((row,i)=>row.wheel===i+1&&integer(row.payoutSumCents))||
       e.boardCount!==p.reelStrips.reduce((s,strip)=>s*strip.length,1)||
       BigInt(e.returnDenominator)!==BigInt(e.boardCount)*100n||m?.feasible!==true||!same(m.wheelWeights,weights))
      fail('OPERATOR_RETURN_PROOF_INVALID');
    const payout=e.perWheel.reduce((sum,row,i)=>sum+BigInt(row.payoutSumCents)*BigInt(weights[i]),0n);
    const denominator=BigInt(e.returnDenominator)*BigInt(weights.reduce((s,w)=>s+w,0));
    if(payout*BigInt(t.denominator)!==denominator*BigInt(t.numerator)||!same(t,m.expectedReturn))
      fail('OPERATOR_RETURN_PROOF_INVALID');
    profiles[gameId]=freeze(structuredClone(p));
  }
  freeze(profiles);
  return Object.freeze({artifactSha256:expectedArtifactSha256,evaluatorSha256,
    profileForGame(gameId){if(!Object.hasOwn(profiles,gameId))fail('OPERATOR_PROFILE_NOT_REGISTERED');return profiles[gameId]}});
}
