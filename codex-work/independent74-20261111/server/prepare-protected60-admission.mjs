// Offline preparation only. The exact current protected source is an input;
// this script never calls Railway or executes a runtime/SQL/financial operation.
// Deployment fingerprints are explicit verified private inputs. No fingerprint
// is published here or inferred from the untrusted candidate supplied to us.
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { NATIVE60_GAME_IDS } from './native60-registration.mjs';
import { createProtected60AdmissionGuard, PROTECTED60_GUARD_VERSION } from './protected60-admission.mjs';

const hash = source => createHash('sha256').update(source).digest('hex');
const FACTORY = 'export async function createSlotService({databaseUrl,redisUrl,migration,enabled=false,origin,fault=()=>{},qa=false}){';
const ACCEPTANCE = "if(!accepting)fail(503,'SLOT_RELEASE_NOT_ENABLED');";
const INIT = " let accepting=enabled;const rate=new Map();const houseFor=uid=>qa?'qa-house:'+uid:'house';";
const HEALTH = "nativeSchemaCompatibility:nativeSchemaProbe.get(),activeModels:";
const MARKER = '// PROTECTED60_READONLY_IDENTITY_AND_ADMISSION_V1';

export function prepareProtected60Admission({ source, expectedSourceSha256,
  enabled = false, expectedNativeDatabaseIdentitySha256 = null } = {}) {
  if (!/^[a-f0-9]{64}$/.test(expectedSourceSha256 ?? '') || typeof source !== 'string' || hash(source) !== expectedSourceSha256 || source.includes(MARKER)) throw Error('EXACT_CURRENT_PROTECTED_RUNTIME_REQUIRED');
  if (typeof enabled !== 'boolean' || enabled && !/^[a-f0-9]{64}$/.test(expectedNativeDatabaseIdentitySha256 ?? '')) throw Error('REVIEWED_SHARED_DATABASE_PROOF_REQUIRED_FOR_GUARD');
  for (const [text, count] of [[FACTORY, 1], [ACCEPTANCE, 3], [INIT, 1], [HEALTH, 1]]) if (source.split(text).length !== count + 1) throw Error('EXACT_PROTECTED_GUARD_ANCHORS_REQUIRED');
  const module = `${MARKER}\nconst PROTECTED60_GUARD_VERSION=${JSON.stringify(PROTECTED60_GUARD_VERSION)};\n${createProtected60AdmissionGuard.toString()}\n`;
  const init = `${INIT}\n const independent60Admission=createProtected60AdmissionGuard({pool,gameIds:${JSON.stringify(NATIVE60_GAME_IDS)},enabled:${enabled},expectedNativeDatabaseIdentitySha256:${JSON.stringify(expectedNativeDatabaseIdentitySha256)}});`;
  const admission = 'await independent60Admission.assertNoActive(c,uid);' + ACCEPTANCE;
  const health = 'independent60Admission:independent60Admission.snapshot(),' + HEALTH;
  let candidate = source.replace(FACTORY, module + FACTORY).replace(INIT, init).replaceAll(ACCEPTANCE, admission).replace(HEALTH, health);
  const restored = candidate.replace(module, '').replace(init, INIT).replaceAll(admission, ACCEPTANCE).replace(health, HEALTH);
  if (restored !== source) throw Error('PROTECTED_GUARD_BYTE_PRESERVATION_FAILED');
  return { source: candidate, manifest: {
    format: 'protected60-admission-candidate-v1', originalSha256: hash(source), candidateSha256: hash(candidate),
    restoredOriginalSha256: hash(restored), originalBytes: Buffer.byteLength(source), candidateBytes: Buffer.byteLength(candidate),
    newGameIds: 60, enabled, databaseIdentityProofSupplied: expectedNativeDatabaseIdentitySha256 !== null,
    newFinancialClasses: 0, newPools: 0, newMigrations: 0, newWallets: 0,
    changesLegacyMath: false, changesMonetaryHelperBodies: false, changesBalanceArithmetic: false,
    changedRequestHandlers: ['originals', 'settle', 'action'], addedReadOnlyAdmissionCalls: 3,
    originalSourceRestoredByteForByte: true, replayChecksPrecedeNewGuard: true,
    guardSites: ['originals fresh spin after request replay', 'protected fresh spin after request replay', 'gamble/bonus action after request replay'],
    healthAddition: 'Readonly hashed database identity, schema presence and guard state; no financial amounts or credentials',
    disabledMode: 'All existing requests continue; only bounded existing-pool metadata observation is added',
    productionApplied: false,
  } };
}

// The first carrier is observation-only. A later enabled guard is a separate
// review after both real pool identities have been obtained and compared.
export function prepareProtected60ObservationCarrier({loader,runtimeCandidate,changeManifest,expectedCarrierSha256,expectedRuntimeSha256}={}){
  if(!/^[a-f0-9]{64}$/.test(expectedCarrierSha256??'')||typeof loader!=='string'||hash(loader)!==expectedCarrierSha256)throw Error('EXACT_CURRENT_PROTECTED_CARRIER_REQUIRED');
  if(!/^[a-f0-9]{64}$/.test(expectedRuntimeSha256??'')||changeManifest?.format!=='protected60-admission-candidate-v1'||changeManifest.enabled!==false||changeManifest.originalSha256!==expectedRuntimeSha256||changeManifest.candidateSha256!==hash(runtimeCandidate)||changeManifest.originalSourceRestoredByteForByte!==true)throw Error('CLOSED_PROTECTED60_OBSERVATION_MANIFEST_REQUIRED');
  const matches=[...loader.matchAll(/Buffer\.from\('([A-Za-z0-9+/=]+)',\s*'base64'\)/g)];
  if(matches.length!==1)throw Error('EXACT_SINGLE_PROTECTED_PAYLOAD_REQUIRED');
  const original=gunzipSync(Buffer.from(matches[0][1],'base64'),{maxOutputLength:2000000});
  if(hash(original)!==expectedRuntimeSha256)throw Error('PROTECTED_CARRIER_RUNTIME_CHANGED');
  const oldPayload=matches[0][1],payload=gzipSync(Buffer.from(runtimeCandidate),{level:9}).toString('base64'),oldLength='runtimeBytes.length !== '+original.length,newLength='runtimeBytes.length !== '+Buffer.byteLength(runtimeCandidate),nextHash=hash(runtimeCandidate);
  if(loader.split(oldLength).length!==2||loader.split(expectedRuntimeSha256).length!==2)throw Error('EXACT_PROTECTED_INTEGRITY_ANCHORS_REQUIRED');
  const source=loader.replace(oldPayload,payload).replace(oldLength,newLength).replace(expectedRuntimeSha256,nextHash);
  const restored=source.replace(payload,oldPayload).replace(newLength,oldLength).replace(nextHash,expectedRuntimeSha256);
  if(restored!==loader)throw Error('PROTECTED_CARRIER_PRESERVATION_FAILED');
  return {source,manifest:{format:'protected60-observation-carrier-v1',originalSha256:hash(loader),candidateSha256:hash(source),restoredOriginalSha256:hash(restored),originalBytes:Buffer.byteLength(loader),candidateBytes:Buffer.byteLength(source),runtimeSha256:nextHash,enabled:false,changesMonetaryHelperBodies:false,changesLegacyModels:false,changesBalances:false,changedFields:['verified runtime gzip literal','runtime length literal','runtime SHA256 literal'],sourcePreservation:changeManifest,productionApplied:false}};
}
