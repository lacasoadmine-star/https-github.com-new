// TEST FIXTURES ONLY. These generated attestations are synthetic inputs used to
// test rejection/activation paths; they are NOT evidence or release approval.
// Never copy them into m20-release-acceptance.json or a deployable release record.
import {readFile} from 'node:fs/promises';
import {createIndependentRegistry} from './independent-registry.mjs';
import {M20_GAME_ID,M20_RELEASE,M20_ARTIFACT_SHA256,M20_EVALUATOR_SHA256,M20_MATH_SHA256,
  RETAINED_BASELINE_SHA256,EVIDENCE_KINDS,REQUIRED_SOURCE_PATHS,REQUIRED_CHECKS,
  releaseSha256,sourceSnapshotSha256} from './m20-release-policy.mjs';
const encode=value=>Buffer.from(JSON.stringify(value));
export async function createReleaseTestFixture(){
  const sourceBytes=Object.fromEntries(await Promise.all(REQUIRED_SOURCE_PATHS.map(async path=>
    [path,await readFile(new URL('../'+path,import.meta.url))])));
  const sources=Object.fromEntries(Object.entries(sourceBytes).map(([path,bytes])=>[path,releaseSha256(bytes)]));
  const record={schema:'zplay-m20-release-acceptance-v1',release:M20_RELEASE,gameId:M20_GAME_ID,
    decision:'ACCEPTED',enabledGames:[M20_GAME_ID],modelKind:'independent_operator_probability_model',
    providerRngReproduced:false,providerCertified:false,artifactSha256:M20_ARTIFACT_SHA256,
    evaluatorSha256:M20_EVALUATOR_SHA256,mathSha256:M20_MATH_SHA256,sourceCommit:'f'.repeat(40),
    sources,sourceSha256:sourceSnapshotSha256(sources),evidence:{},
    acceptedAt:'2026-11-21T00:02:00Z',acceptedBy:'TEST FIXTURE ONLY'};
  const inputs={sourceBytes,evidenceBytes:{},rawEvidenceBytes:{}},reports={};
  for(const kind of EVIDENCE_KINDS){
    const raw=Buffer.from('TEST FIXTURE ONLY: synthetic '+kind+' input, not actual acceptance evidence.\n');
    const report={schema:'zplay-m20-release-evidence-v1',kind,gameId:M20_GAME_ID,status:'PASS',
      sourceCommit:record.sourceCommit,sourceSha256:record.sourceSha256,mathSha256:M20_MATH_SHA256,
      rawSha256:releaseSha256(raw),reference:'TEST_FIXTURE_ONLY/'+kind,recordedAt:'2026-11-21T00:01:00Z',
      checks:Object.fromEntries(REQUIRED_CHECKS[kind].map(key=>[key,true]))};
    if(['unit','real-postgres'].includes(kind))report.tests={passed:1,failed:0,skipped:0,cancelled:0};
    if(kind==='real-postgres')Object.assign(report,{database:'PostgreSQL',disposable:true,productionWagers:0});
    if(kind==='browser')Object.assign(report,{mode:'LOOPBACK_QA_FIXTURE',productionWagers:0,mediaVerified:19,criticalErrors:0,
      viewports:[[390,844],[768,1024],[1440,900],[844,390]].map(([width,height])=>({width,height,status:'PASS'}))});
    if(kind==='source')Object.assign(report,{baselineSha256:RETAINED_BASELINE_SHA256,
      newServices:0,newDatabases:0,newTables:0,enabledGames:[M20_GAME_ID],environmentVariablesChanged:[]});
    if(kind==='operator-policy')Object.assign(report,{authorizationReference:'TEST FIXTURE ONLY: no release authorization',
      acceptedBy:'TEST FIXTURE ONLY',modelKind:'independent_operator_probability_model',providerRngReproduced:false,
      providerCertified:false,currency:'ETB',targetReturn:{numerator:'9663',denominator:'10000'},maxWinX:1000,
      gamble:{redNumerator:1,denominator:2,maxAttempts:5,maxStake:'500.00',takeWinAddsCredit:false}});
    inputs.rawEvidenceBytes[kind]=raw;reports[kind]=report;
    record.evidence[kind]={sha256:releaseSha256(encode(report)),rawSha256:report.rawSha256,reference:report.reference};
    inputs.evidenceBytes[kind]=encode(report);
  }
  const repinRecord=()=>{inputs.recordBytes=encode(record);inputs.expectedRecordSha256=releaseSha256(inputs.recordBytes)};
  const repinEvidence=kind=>{inputs.evidenceBytes[kind]=encode(reports[kind]);record.evidence[kind].sha256=releaseSha256(inputs.evidenceBytes[kind]);repinRecord()};
  repinRecord();
  const registry=createIndependentRegistry({artifactBytes:sourceBytes['server/independent-operator-audit.json'],
    evaluatorBytes:sourceBytes['server/official-math.mjs'],expectedArtifactSha256:M20_ARTIFACT_SHA256});
  return {record,inputs,reports,registry,repinRecord,repinEvidence};
}
