// Offline-only artifact generator. It opens no network connection or wallet.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {INDEPENDENT_DESIGNS,REJECTED_BURN_DRAFT,auditIndependentDesign,enumerateIndependentReturns,deriveExactWheelWeights} from './independent-profiles.mjs';

export async function generateIndependentAudit(){
  const source=await readFile(new URL('./official-math.mjs',import.meta.url));
  const evaluatorSha256=createHash('sha256').update(source).digest('hex');
  const results=Object.fromEntries(Object.keys(INDEPENDENT_DESIGNS).map(gameId=>[gameId,auditIndependentDesign(gameId,{evaluatorSha256})]));
  const enumeration=enumerateIndependentReturns(REJECTED_BURN_DRAFT);
  const rejectedDraft={reason:'uniform_8_9_stop_proposal_exceeds_target_even_at_wheel_one',
    reelStrips:REJECTED_BURN_DRAFT.reelStrips,enumeration,
    mixture:deriveExactWheelWeights(enumeration,INDEPENDENT_DESIGNS.fresh_multihot5burnwilds.target)};
  return {schema:'zplay-independent-operator-designs-v1',evaluatorSha256,
    productionApproved:false,providerRngReproduced:false,results,rejectedDraft};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  const artifact=await generateIndependentAudit();
  await writeFile(new URL('./independent-operator-audit.json',import.meta.url),JSON.stringify(artifact,null,2)+'\n');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(artifact.results).map(([id,{audit,profile}])=>[id,{
    boards:audit.enumeration.boardCount,feasible:audit.mixture.feasible,
    ...(profile?{wheelWeights:profile.wheelWeights,returnFraction:profile.targetReturn}:{reason:audit.mixture.reason,bounds:audit.mixture.bounds}),
    productionApproved:false,providerRngReproduced:false}]))));
}
