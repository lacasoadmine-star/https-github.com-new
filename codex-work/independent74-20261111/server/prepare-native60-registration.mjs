// Offline exact-source patch preparation; never deploys or evaluates the host.
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hash=value=>createHash('sha256').update(value).digest('hex');
const ORIGINAL="export default addition.installRemaining(existing,app.existingLibraryDependencies,{ASSETS:client.ASSETS,ART:artwork.ART});";
const PREVIOUS="const native60ExistingApp=addition.installRemaining(existing,app.existingLibraryDependencies,{ASSETS:client.ASSETS,ART:artwork.ART});";
const MARKER='// NATIVE60_EXISTING_INSTANCE_REGISTRATION_V1';
export function prepareNative60Registration({source,installer,expectedSourceSha256,expectedInstallerSha256}={}){
  // A deployment caller must supply the previously verified private pin. Never
  // derive the expected hash from the candidate input or a published fallback.
  if(!/^[a-f0-9]{64}$/.test(expectedSourceSha256??'')||typeof source!=='string'||hash(source)!==expectedSourceSha256||source.includes(MARKER)||source.split(ORIGINAL).length!==2)throw Error('EXACT_CURRENT_NATIVE_BOOTSTRAP_REQUIRED');
  if(typeof installer!=='string'||!expectedInstallerSha256||hash(installer)!==expectedInstallerSha256||!installer.includes('installNative60Registration'))throw Error('VERIFIED_NATIVE60_INSTALLER_REQUIRED');
  const compressed=gzipSync(Buffer.from(installer),{level:9});
  const suffix=`\n${MARKER}\nimport {gunzipSync as native60Gunzip} from 'node:zlib';\nlet native60App=native60ExistingApp;\ntry {\n const native60Bytes=native60Gunzip(Buffer.from('${compressed.toString('base64')}','base64'),{maxOutputLength:${Buffer.byteLength(installer)}});\n if(native60Bytes.length!==${Buffer.byteLength(installer)}||createHash('sha256').update(native60Bytes).digest('hex')!=='${expectedInstallerSha256}')throw Error('NATIVE60_INSTALLER_INTEGRITY_REQUIRED');\n const native60Module=await import('data:text/javascript;base64,'+native60Bytes.toString('base64'));\n const native60Dependencies=app.existingLibraryDependencies;\n const native60Audit=await native60Module.auditExistingNative60Sql(native60Dependencies);\n const native60Installed=native60Module.installNative60Registration(native60ExistingApp,native60Dependencies,{auditProof:native60Audit});\n native60App=native60Installed.app;\n // A prefix keeps this bounded metadata visible even when the log collector\n // moves JSON event properties into structured attributes. No amounts/rows.\n console.info('NATIVE60_REGISTRATION_V1 '+JSON.stringify({release:native60Module.NATIVE60_RELEASE,installerSha256:'${expectedInstallerSha256}',models:60,new_rounds_enabled:false,sqlAuditSuccess:native60Audit.report.success===true,databaseIdentitySha256:native60Audit.report.databaseIdentitySha256??null,readOnly:true,writes:0,balanceAmountsReturned:0,individualAccountRowsReturned:0}));\n}catch{console.error('NATIVE60_REGISTRATION_UNAVAILABLE legacy_preserved=true new_rounds_enabled=false');}\nexport default native60App;\n`;
  const candidate=source.replace(ORIGINAL,PREVIOUS)+suffix;
  const restored=candidate.slice(0,-suffix.length).replace(PREVIOUS,ORIGINAL);
  if(restored!==source)throw Error('NATIVE60_BOOTSTRAP_PRESERVATION_FAILED');
  return{source:candidate,manifest:{format:'native60-closed-additive-carrier-v1',originalSha256:hash(source),candidateSha256:hash(candidate),restoredOriginalSha256:hash(restored),originalBytes:Buffer.byteLength(source),candidateBytes:Buffer.byteLength(candidate),installerSha256:expectedInstallerSha256,installerBytes:Buffer.byteLength(installer),installerGzipBytes:compressed.length,
    defaultNewRoundsEnabled:false,originalBytesOutsideFinalExportPreserved:true,createsFinancialClass:false,createsDatabase:false,createsPool:false,createsMigration:false,createsScheduler:false,changesProtected14Routes:false,
    audit:'Exact existing shared.sql; read-only metadata, hashed DB identity and aggregate booleans/counts; no monetary amounts or account rows',
    registration:'Exact60 adapters on app.existingLibraryDependencies.service; old registry delegates preserved',
    productionApplied:false}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const[sourcePath,outputPath,privatePinsPath]=process.argv.slice(2);if(!privatePinsPath)throw Error('Usage: node server/prepare-native60-registration.mjs PRIVATE_CURRENT_SOURCE PRIVATE_CANDIDATE PRIVATE_VERIFIED_PINS_JSON');
  const installerUrl=new URL('./artifacts/native60-registration-installer.mjs',import.meta.url),manifest=JSON.parse(await readFile(new URL('./artifacts/native60-registration-installer.mjs.manifest.json',import.meta.url),'utf8'));
  const pins=JSON.parse(await readFile(privatePinsPath,'utf8'));
  if(pins?.format!=='private-native60-deployment-pins-v1')throw Error('PRIVATE_VERIFIED_DEPLOYMENT_PINS_REQUIRED');
  const result=prepareNative60Registration({source:await readFile(sourcePath,'utf8'),installer:await readFile(installerUrl,'utf8'),expectedSourceSha256:pins.hostProvenance?.bootstrapSha256,expectedInstallerSha256:manifest.sha256});
  await writeFile(outputPath,result.source,{mode:0o600});await writeFile(outputPath+'.manifest.json',JSON.stringify(result.manifest,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({candidate:outputPath,privateManifest:outputPath+'.manifest.json',defaultNewRoundsEnabled:false,originalBytesOutsideFinalExportPreserved:true,privateFingerprintsPrinted:false}));
}
