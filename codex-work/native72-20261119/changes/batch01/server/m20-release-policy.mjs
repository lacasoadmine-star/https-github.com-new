// Deliberate approval boundary for the operator's own Multi Hot 20 model.
// Candidate artifact bytes stay immutable and unapproved. A separately pinned,
// reviewed acceptance record may approve only an in-memory M20 copy. This file
// does not deploy, discover credentials, read environment flags or move funds.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {GameMathError,requireApprovedProfile} from './official-math.mjs';

export const M20_GAME_ID='fresh_multihot20';
export const M20_RELEASE='native72-batch01-20261121-r3';
export const M20_ARTIFACT_SHA256='7f26851665f6a1224b6bb05400091cf8b5e3b53a4566037b544c0cdf8faf93f8';
export const M20_EVALUATOR_SHA256='776b7cd2987a5dba4ca3dfe94ba41540218d0ab4ed4505840254fe09f0ea76f0';
export const M20_MATH_SHA256='4b7af42145bca5e7aa18a6d058c7394381d8b9b252110bffc61503c0470643d8';
export const RETAINED_BASELINE_SHA256='9ed186420e58330388e96aa62c9f4dea70d82ae596bfd57060d66053b981dfa3';
export const EVIDENCE_KINDS=Object.freeze(['unit','real-postgres','browser','source','operator-policy']);
export const REQUIRED_SOURCE_PATHS=Object.freeze([
  'server/official-math.mjs','server/sw-nine-pg-adapter.mjs','server/existing-server-routes.mjs',
  'server/existing-gamble.mjs','server/independent-registry.mjs','server/independent-operator-audit.json',
  'server/independent-release-pins.json','server/railway-binding.mjs','server/m20-release-policy.mjs',
  'server/railway-release/build.mjs','multihot20/app.mjs','multihot20/controller.mjs',
  'multihot20/session.mjs','multihot20/scene.mjs','multihot20/assets.mjs',
  'multihot20/assets.json','multihot20/index.html','multihot20/style.css','player-kv-route.mjs'
]);
export const REQUIRED_CHECKS=Object.freeze({
  unit:Object.freeze(['exactReturnEnumeration','maximumWinCap','receiptIntegrity','sessionOwnership',
    'sameTokenRecovery','x2AndTakeWin','autoplayCancellationAndLimits','releasePolicy']),
  'real-postgres':Object.freeze(['existingLedgerSchema','authenticatedSpinSettlement','winningCredit',
    'sameTokenIdempotency','concurrentWalletSerialization','rollbackAfterDebit','rollbackAfterPayout',
    'x2WinLossAndReplay','reconnectRecovery','inTransactionAuthentication','reserveAndAccountCaps',
    'acceptedPolicyRouteIntegration']),
  browser:Object.freeze(['actualAppAndCsp','responsiveControls','spinAndStop','doubleTapProtection',
    'sameTokenRefreshRecovery','x2AndGetOnlyTakeWin','autoplayCancellationAndLimits',
    'audioOptInMuteAndEvents','historyAndParentRestore','noCriticalErrors','measuredAnimationCadence']),
  source:Object.freeze(['retainedRuntimeExact','existingWalletAndAuthentication','existingRoutesAndGuards',
    'm20Only','burnRemainsClosed','candidateArtifactsUnchanged','officialReferenceReviewed',
    'frontendPackageMatchesTestedSources']),
  'operator-policy':Object.freeze(['existingUserAuthorization','independentMathAcknowledged',
    'exactReturnAndLiabilityReviewed','existingEtbLedgerOnly','noBonusWallet',
    'gamblePolicyReviewed','releaseEvidenceReviewed'])
});
const digest=/^[a-f0-9]{64}$/;
const fail=code=>{throw new GameMathError(code,503)};
export const releaseSha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const iso=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)&&Number.isFinite(Date.parse(value));
const text=value=>typeof value==='string'&&value.trim().length>=8;
const json=(bytes,code)=>{try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{fail(code)}};
export const isReleaseSourcePath=path=>typeof path==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path)&&
  path.split('/').every(part=>part&&part!=='.'&&part!=='..');
export function sourceSnapshotSha256(sources){
  if(!object(sources)||Object.entries(sources).some(([path,hash])=>!isReleaseSourcePath(path)||!digest.test(hash)))
    fail('M20_RELEASE_SOURCE_MANIFEST_INVALID');
  return releaseSha256(JSON.stringify(Object.fromEntries(Object.entries(sources).sort(([a],[b])=>a<b?-1:a>b?1:0))));
}

function validateEvidence(kind,record,inputs){
  const pin=record.evidence?.[kind],bytes=inputs.evidenceBytes?.[kind],raw=inputs.rawEvidenceBytes?.[kind];
  if(!object(pin)||!digest.test(pin.sha256||'')||!digest.test(pin.rawSha256||'')||!text(pin.reference)||
     !bytes||!raw||releaseSha256(bytes)!==pin.sha256||releaseSha256(raw)!==pin.rawSha256)
    fail('M20_RELEASE_EVIDENCE_HASH_MISMATCH_'+kind);
  const e=json(bytes,'M20_RELEASE_EVIDENCE_INVALID_'+kind);
  if(e.schema!=='zplay-m20-release-evidence-v1'||e.kind!==kind||e.gameId!==M20_GAME_ID||
     e.status!=='PASS'||e.sourceCommit!==record.sourceCommit||e.sourceSha256!==record.sourceSha256||
     e.mathSha256!==M20_MATH_SHA256||e.rawSha256!==pin.rawSha256||e.reference!==pin.reference||
     !iso(e.recordedAt)||Date.parse(e.recordedAt)>Date.parse(record.acceptedAt)||
     !object(e.checks)||REQUIRED_CHECKS[kind].some(check=>e.checks[check]!==true))
    fail('M20_RELEASE_EVIDENCE_INCOMPLETE_'+kind);
  if(['unit','real-postgres'].includes(kind)&&(!Number.isSafeInteger(e.tests?.passed)||e.tests.passed<1||
     e.tests.failed!==0||e.tests.skipped!==0||e.tests.cancelled!==0))
    fail('M20_RELEASE_TESTS_NOT_PASSED_'+kind);
  if(kind==='real-postgres'&&(e.database!=='PostgreSQL'||e.disposable!==true||e.productionWagers!==0))
    fail('M20_RELEASE_POSTGRES_SCOPE_INVALID');
  if(kind==='browser'){
    if(e.mode!=='LOOPBACK_QA_FIXTURE'||e.productionWagers!==0||e.mediaVerified!==19||
       e.criticalErrors!==0||!Array.isArray(e.viewports)||e.viewports.some(v=>!Number.isSafeInteger(v.width)||
         !Number.isSafeInteger(v.height)||v.width<300||v.height<300||v.status!=='PASS')||
       !e.viewports.some(v=>v.width<=430&&v.height>v.width)||
       !e.viewports.some(v=>v.width>=700&&v.width<=1100&&v.height>v.width)||
       !e.viewports.some(v=>v.width>=1200)||!e.viewports.some(v=>v.width>v.height&&v.height<=500))
      fail('M20_RELEASE_BROWSER_SCOPE_INVALID');
  }
  if(kind==='source'&&(e.baselineSha256!==RETAINED_BASELINE_SHA256||e.newServices!==0||
     e.newDatabases!==0||e.newTables!==0||!same(e.enabledGames,[M20_GAME_ID])||
     !Array.isArray(e.environmentVariablesChanged)||e.environmentVariablesChanged.length!==0))
    fail('M20_RELEASE_SOURCE_SCOPE_INVALID');
  if(kind==='operator-policy'&&(!text(e.authorizationReference)||!text(e.acceptedBy)||
     e.modelKind!=='independent_operator_probability_model'||e.providerRngReproduced!==false||
     e.providerCertified!==false||e.currency!=='ETB'||!same(e.targetReturn,{numerator:'9663',denominator:'10000'})||
     e.maxWinX!==1000||e.gamble?.redNumerator!==1||e.gamble?.denominator!==2||
     e.gamble?.maxAttempts!==5||e.gamble?.maxStake!=='500.00'||e.gamble?.takeWinAddsCredit!==false))
    fail('M20_RELEASE_OPERATOR_POLICY_INVALID');
  return e;
}

export function createM20ReleasePolicy({registry,...inputs}){
  // Registry construction still verifies the immutable candidates separately.
  // Accept no caller-selected model digest and no browser-supplied approval.
  if(registry?.artifactSha256!==M20_ARTIFACT_SHA256||registry.evaluatorSha256!==M20_EVALUATOR_SHA256||
     typeof registry.profileForGame!=='function')fail('M20_RELEASE_CANDIDATE_IDENTITY_MISMATCH');
  const candidate=registry.profileForGame(M20_GAME_ID);
  if(candidate.mathSha256!==M20_MATH_SHA256||candidate.productionApproved!==false||
     candidate.probabilityModelAudited!==false||candidate.providerRngReproduced!==false||
     candidate.providerCertified!==false)fail('M20_RELEASE_CANDIDATE_IDENTITY_MISMATCH');
  if(!digest.test(inputs.expectedRecordSha256||'')||!inputs.recordBytes||
     releaseSha256(inputs.recordBytes)!==inputs.expectedRecordSha256)fail('M20_RELEASE_RECORD_HASH_MISMATCH');
  const record=json(inputs.recordBytes,'M20_RELEASE_RECORD_INVALID');
  if(record.decision!=='ACCEPTED')fail('M20_RELEASE_ACCEPTANCE_PENDING');
  if(record.schema!=='zplay-m20-release-acceptance-v1'||record.release!==M20_RELEASE||
     record.gameId!==M20_GAME_ID||!same(record.enabledGames,[M20_GAME_ID])||
     record.modelKind!=='independent_operator_probability_model'||record.providerRngReproduced!==false||
     record.providerCertified!==false||record.artifactSha256!==M20_ARTIFACT_SHA256||
     record.evaluatorSha256!==M20_EVALUATOR_SHA256||record.mathSha256!==M20_MATH_SHA256||
     !/^[a-f0-9]{40}$/.test(record.sourceCommit||'')||!iso(record.acceptedAt)||!text(record.acceptedBy))
    fail('M20_RELEASE_RECORD_INVALID');
  const snapshot=sourceSnapshotSha256(record.sources);
  if(snapshot!==record.sourceSha256||REQUIRED_SOURCE_PATHS.some(path=>!Object.hasOwn(record.sources,path))||
     record.sources['server/independent-operator-audit.json']!==M20_ARTIFACT_SHA256||
     record.sources['server/official-math.mjs']!==M20_EVALUATOR_SHA256)
    fail('M20_RELEASE_SOURCE_MANIFEST_INCOMPLETE');
  for(const [path,hash] of Object.entries(record.sources)){
    if(!inputs.sourceBytes?.[path]||releaseSha256(inputs.sourceBytes[path])!==hash)
      fail('M20_RELEASE_SOURCE_DRIFT_'+path);
  }
  if(!same(Object.keys(record.evidence??{}).sort(),[...EVIDENCE_KINDS].sort()))
    fail('M20_RELEASE_EVIDENCE_SET_INVALID');
  for(const kind of EVIDENCE_KINDS)validateEvidence(kind,record,inputs);
  // The mathematical identity is unchanged. Approval metadata belongs only to
  // this release copy; original candidate and Burn profiles stay frozen/false.
  const active=freeze({...structuredClone(candidate),productionApproved:true,probabilityModelAudited:true,
    auditReference:'m20-acceptance:'+inputs.expectedRecordSha256,releaseId:M20_RELEASE,
    releaseAcceptanceSha256:inputs.expectedRecordSha256,acceptedSourceSha256:snapshot});
  requireApprovedProfile(active);
  return Object.freeze({release:M20_RELEASE,recordSha256:inputs.expectedRecordSha256,sourceSha256:snapshot,
    enabled:gameId=>gameId===M20_GAME_ID,
    profileForGame:gameId=>gameId===M20_GAME_ID?active:registry.profileForGame(gameId)});
}

// The future package carries the exact reviewed reports and source snapshot.
// Re-read executable server helpers from this package; archived frontend/build
// source snapshots are evidence, not a claim to inspect a live Worker remotely.
export async function loadM20ReleaseInputs(bundleURL,expectedRecordSha256){
  const bundle=json(await readFile(bundleURL),'M20_RELEASE_BUNDLE_INVALID');
  if(bundle.schema!=='zplay-m20-release-inputs-v1'||typeof bundle.recordText!=='string'||
     !object(bundle.sourceText)||!object(bundle.evidenceText)||!object(bundle.rawEvidenceBase64))
    fail('M20_RELEASE_BUNDLE_INVALID');
  const sourceBytes={};
  for(const [path,value] of Object.entries(bundle.sourceText)){
    if(!isReleaseSourcePath(path)||typeof value!=='string')fail('M20_RELEASE_BUNDLE_INVALID');
    sourceBytes[path]=REQUIRED_SOURCE_PATHS.includes(path)&&/^server\/[a-z0-9-]+\.(mjs|json)$/.test(path)
      ?await readFile(new URL('./'+path.slice(7),import.meta.url)):Buffer.from(value,'utf8');
  }
  const evidenceBytes={},rawEvidenceBytes={};
  for(const kind of EVIDENCE_KINDS){
    if(typeof bundle.evidenceText[kind]!=='string'||typeof bundle.rawEvidenceBase64[kind]!=='string')
      fail('M20_RELEASE_BUNDLE_INVALID');
    evidenceBytes[kind]=Buffer.from(bundle.evidenceText[kind],'utf8');
    rawEvidenceBytes[kind]=Buffer.from(bundle.rawEvidenceBase64[kind],'base64');
  }
  return {recordBytes:Buffer.from(bundle.recordText,'utf8'),expectedRecordSha256,sourceBytes,evidenceBytes,rawEvidenceBytes};
}
