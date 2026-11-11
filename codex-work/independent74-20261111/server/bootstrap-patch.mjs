// Prepares an additive source-only function update. Never applies a Railway
// staged change, deploys, starts a DB, creates a wallet, or changes live money.
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const checksum=value=>createHash('sha256').update(value).digest('hex');
export const ORIGINAL_EXPORT="export default addition.installRemaining(existing,app.existingLibraryDependencies,{ASSETS:client.ASSETS,ART:artwork.ART});";
const PREVIOUS="const independent74PreviousApp=addition.installRemaining(existing,app.existingLibraryDependencies,{ASSETS:client.ASSETS,ART:artwork.ART});";
const MARKER='// INDEPENDENT74_EXISTING_ACCOUNT_INSTALLER_V1';
export function prepareBootstrapPatch({source,installer,expectedSourceSha256,expectedInstallerSha256}={}){
 if(typeof source!=='string'||typeof installer!=='string')throw new TypeError('Existing deployed bootstrap and verified installer source required.');
 const sourceSha256=checksum(source),installerSha256=checksum(installer);
 if(expectedSourceSha256&&sourceSha256!==expectedSourceSha256)throw Error('DEPLOYED_BOOTSTRAP_CHANGED');
 if(expectedInstallerSha256&&installerSha256!==expectedInstallerSha256)throw Error('INSTALLER_ARTIFACT_CHANGED');
 if(source.includes(MARKER)||source.split(ORIGINAL_EXPORT).length!==2)throw Error('EXACT_EXISTING_EXPORT_REQUIRED');
 const compressed=gzipSync(Buffer.from(installer),{level:9}),encoded=compressed.toString('base64');
 const appended=`
${MARKER}
import {gunzipSync as independent74Gunzip} from 'node:zlib';
import {createHash as independent74CreateHash} from 'node:crypto';
let independent74InstalledApp=independent74PreviousApp;
try {
 const dependencies=app.existingLibraryDependencies;
 if(!dependencies||typeof dependencies.service?.state!=='function'||typeof dependencies.service?.action!=='function'||typeof dependencies.service?.shared?.transaction!=='function'||typeof dependencies.verifyNative!=='function'||typeof dependencies.readNativeBody!=='function'||typeof dependencies.resolveSessionUser!=='function'||typeof dependencies.engineSecret!=='string'||!dependencies.engineSecret)throw Error('INDEPENDENT74_EXISTING_DEPENDENCIES_UNAVAILABLE');
 // This audit uses the EXISTING SQL driver and a read-only transaction.
 // It exposes no player IDs, names, sessions, individual balances or secrets.
 try {
  const sql=dependencies.service.sql;
  if(typeof sql?.begin!=='function')throw Error('EXISTING_SQL_UNAVAILABLE');
  const audit=await sql.begin(async tx=>{
   await tx.unsafe('SET TRANSACTION READ ONLY');
   await tx.unsafe("SET LOCAL statement_timeout = '5s'");
   const house=await tx.unsafe("SELECT count(*)::int AS wallets,COALESCE(sum(balance),0)::text AS available_minor FROM sw_rebuild.wallets WHERE id='house'");
   const accountCaps=await tx.unsafe('SELECT count(*)::int AS configured_accounts,count(max_balance)::int AS capped_accounts,min(max_balance)::text AS min_cap_minor,max(max_balance)::text AS max_cap_minor FROM sw_rebuild.account_limits');
   const reserves=await tx.unsafe("SELECT count(*)::int AS active_rounds,COALESCE(sum(liability),0)::text AS reserved_minor FROM sw_native_library.rounds WHERE status='active'");
   const policy=await tx.unsafe("SELECT name,jsonb_typeof(value) AS value_type,value->>'enabled' AS enabled,jsonb_typeof(value->'gameLimits') AS limit_type FROM sw_rebuild.settings WHERE name='independent74_operator_policy_v1'");
   return {house:house[0],account_caps:accountCaps[0],existing_active_reserves:reserves[0],independent74_policy_metadata:policy};
  });
  console.info(JSON.stringify({event:'independent74_existing_account_readonly_audit',readOnly:true,writes:0,individualAccountRowsRead:0,...audit}));
 }catch{console.info(JSON.stringify({event:'independent74_existing_account_readonly_audit_unavailable',readOnly:true,writes:0}));}
 const bytes=independent74Gunzip(Buffer.from('${encoded}','base64'),{maxOutputLength:${Buffer.byteLength(installer)}});
 if(bytes.length!==${Buffer.byteLength(installer)}||independent74CreateHash('sha256').update(bytes).digest('hex')!=='${installerSha256}')throw Error('INDEPENDENT74_INSTALLER_HASH_MISMATCH');
 const installer=await import('data:text/javascript;base64,'+bytes.toString('base64'));
 // Read-only account/state/history integration first. An audited, explicitly
 // configured game policy is required before any new independent wager opens.
 const facade=installer.installExistingLibrary74({service:dependencies.service,reviewedGameIds:[],allowNewRounds:false,gameLimits:{}});
 independent74InstalledApp=installer.installExistingLibrary74Http(independent74PreviousApp,{...dependencies,facade});
 console.info(JSON.stringify({event:'independent74_existing_account_routes_installed',installerSha256:'${installerSha256}',models:facade.definitions().length,new_rounds_enabled:false,existing_service_ready:dependencies.service.ready===true,uses_existing_shared_wallet:true,creates_infrastructure:false}));
}catch{
 // Failure in the additive integration must never take down legacy games.
 console.error(JSON.stringify({event:'independent74_existing_account_installation_failed',legacy_preserved:true,new_rounds_enabled:false}));
}
export default independent74InstalledApp;
`;
 const patched=source.replace(ORIGINAL_EXPORT,PREVIOUS)+appended;
 // Verify every byte outside the one final export and additive suffix.
 const restored=patched.slice(0,patched.length-appended.length).replace(PREVIOUS,ORIGINAL_EXPORT);
 if(restored!==source)throw Error('LEGACY_BOOTSTRAP_PRESERVATION_FAILED');
 return {source:patched,manifest:{schemaVersion:1,method:'Exact final-export replacement plus additive verified gzip installer',originalSha256:sourceSha256,patchedSha256:checksum(patched),installerSha256,originalBytes:Buffer.byteLength(source),patchedBytes:Buffer.byteLength(patched),installerBytes:Buffer.byteLength(installer),installerGzipBytes:compressed.length,defaultNewRoundsEnabled:false,createsInfrastructure:false,createsFinancialService:false,runsMigrations:false,changesBalances:false,legacyRestorationSha256:checksum(restored),legacyBytesOutsideFinalExportPreserved:true,exposesRealAccountStateAndHistory:true,readonlyAudit:'Existing shared SQL connection; house aggregate, account cap aggregate, existing active liability aggregate, exact policy key metadata; no individual account rows'}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const sourcePath=process.argv[2],outputPath=process.argv[3];
 if(!sourcePath||!outputPath)throw Error('Usage: node server/bootstrap-patch.mjs /path/deployed-bootstrap.mjs /path/candidate-bootstrap.mjs');
 const installerPath=fileURLToPath(new URL('./artifacts/existing-library74-installer.mjs',import.meta.url));
 const expected=JSON.parse(await readFile(new URL('./artifacts/existing-library74-installer.manifest.json',import.meta.url)));
 const result=prepareBootstrapPatch({source:await readFile(sourcePath,'utf8'),installer:await readFile(installerPath,'utf8'),expectedInstallerSha256:expected.sha256});
 await writeFile(outputPath,result.source,{mode:0o600});await writeFile(outputPath+'.manifest.json',JSON.stringify(result.manifest,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({candidate:outputPath,manifest:outputPath+'.manifest.json',...result.manifest}));
}
