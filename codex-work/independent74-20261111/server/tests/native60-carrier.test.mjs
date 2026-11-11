import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {prepareNative60Registration} from '../prepare-native60-registration.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
const originalExport='export default addition.installRemaining(existing,app.existingLibraryDependencies,{ASSETS:client.ASSETS,ART:artwork.ART});';
function fixture({failAudit=false}={}){
 const token='native60_carrier_'+randomUUID().replaceAll('-','');
 const dependencies={service:{marker:'same-existing-service'},calls:[]};globalThis[token]=dependencies;
 const source=`import {createHash} from 'node:crypto';\nconst app={existingLibraryDependencies:globalThis[${JSON.stringify(token)}]};\nconst existing={fetch:(request,...context)=>Response.json({path:new URL(request.url).pathname,contexts:context.length,legacy:true})};\nconst addition={installRemaining:(old,deps)=>{if(deps!==app.existingLibraryDependencies)throw Error('dependency replacement');return old;}};\nconst client={ASSETS:{}},artwork={ART:{}};\n${originalExport}`;
 const installer=`export const NATIVE60_RELEASE='existing-native60-v1';\nexport async function auditExistingNative60Sql(deps){deps.calls.push(['audit',deps.service]);${failAudit?"throw Error('isolated audit failure');":"return {report:{success:true,databaseIdentitySha256:'"+'a'.repeat(64)+"'}};"}}\nexport function installNative60Registration(previous,deps,options){if(Object.hasOwn(options,'release'))throw Error('must stay closed');deps.calls.push(['install',deps.service,options.auditProof.report.success]);return {app:{fetch:(...args)=>previous.fetch(...args)}};}`;
 return{token,dependencies,source,installer,cleanup:()=>delete globalThis[token]};
}
test('native carrier changes only final export plus integrity-checked closed registration suffix',()=>{
 const f=fixture();try{
  const prepared=prepareNative60Registration({source:f.source,installer:f.installer,expectedSourceSha256:hash(f.source),expectedInstallerSha256:hash(f.installer)});
  const m=prepared.manifest;assert.equal(m.defaultNewRoundsEnabled,false);assert.equal(m.restoredOriginalSha256,hash(f.source));assert.equal(m.originalBytesOutsideFinalExportPreserved,true);
  for(const field of ['createsFinancialClass','createsDatabase','createsPool','createsMigration','createsScheduler','changesProtected14Routes'])assert.equal(m[field],false);
  const encoded=prepared.source.match(/native60Gunzip\(Buffer\.from\('([^']+)'/)[1],decoded=gunzipSync(Buffer.from(encoded,'base64')).toString();assert.equal(decoded,f.installer);assert.equal(hash(decoded),m.installerSha256);
  assert.throws(()=>prepareNative60Registration({source:f.source,installer:f.installer,expectedInstallerSha256:hash(f.installer)}),/EXACT_CURRENT_NATIVE_BOOTSTRAP_REQUIRED/);
  assert.throws(()=>prepareNative60Registration({source:f.source,installer:f.installer+'x',expectedSourceSha256:hash(f.source),expectedInstallerSha256:hash(f.installer)}),/VERIFIED_NATIVE60_INSTALLER_REQUIRED/);
 }finally{f.cleanup();}
});
test('carrier receives the identical initialized dependencies and never supplies a release switch',async()=>{
 const f=fixture(),logs=[],originalInfo=console.info;console.info=(...values)=>logs.push(values.join(' '));
 try{
  const prepared=prepareNative60Registration({source:f.source,installer:f.installer,expectedSourceSha256:hash(f.source),expectedInstallerSha256:hash(f.installer)}),module=await import('data:text/javascript;base64,'+Buffer.from(prepared.source).toString('base64'));
  assert.equal(f.dependencies.calls.length,2);assert.equal(f.dependencies.calls[0][1],f.dependencies.service);assert.equal(f.dependencies.calls[1][1],f.dependencies.service);
  const response=await module.default.fetch(new Request('https://fixture.test/preserved'),'same');assert.deepEqual(await response.json(),{path:'/preserved',contexts:1,legacy:true});
  assert(logs.some(line=>line.includes('"new_rounds_enabled":false')));assert(logs.every(line=>!line.includes('balanceMinor')));
 }finally{console.info=originalInfo;f.cleanup();}
});
test('carrier installation failure leaves the original application reachable and cannot open new stakes',async()=>{
 const f=fixture({failAudit:true}),logs=[],originalError=console.error;console.error=(...values)=>logs.push(values.join(' '));
 try{
  const prepared=prepareNative60Registration({source:f.source,installer:f.installer,expectedSourceSha256:hash(f.source),expectedInstallerSha256:hash(f.installer)}),module=await import('data:text/javascript;base64,'+Buffer.from(prepared.source).toString('base64'));
  assert.equal(f.dependencies.calls.length,1);assert.deepEqual(await(await module.default.fetch(new Request('https://fixture.test/old'))).json(),{path:'/old',contexts:0,legacy:true});
  assert.deepEqual(logs,['NATIVE60_REGISTRATION_UNAVAILABLE legacy_preserved=true new_rounds_enabled=false']);
 }finally{console.error=originalError;f.cleanup();}
});
