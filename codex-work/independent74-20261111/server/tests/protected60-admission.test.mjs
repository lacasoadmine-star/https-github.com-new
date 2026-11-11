import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readFile} from 'node:fs/promises';
import {createProtected60AdmissionGuard} from '../protected60-admission.mjs';
import {prepareProtected60Admission,prepareProtected60ObservationCarrier} from '../prepare-protected60-admission.mjs';
import {NATIVE60_GAME_IDS} from '../native60-registration.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
const fixture=JSON.parse(await readFile(new URL('./support/protected60-admission-prefixes.json',import.meta.url)));
const acceptance="if(!accepting)fail(503,'SLOT_RELEASE_NOT_ENABLED');";
const guardCall='await independent60Admission.assertNoActive(c,uid);';
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;

test('source-pinned protected lock helper locks the same two canonical wallets in SQL order',async()=>{
 assert.equal(hash(fixture.lockWallets.source),fixture.lockWallets.sha256);
 const lock=new Function('houseFor','fail',fixture.lockWallets.source+'\nreturn lockWallets;')(()=> 'house',(status,message)=>{throw Object.assign(new Error(message),{status});});
 const calls=[];await lock({query:async(sql,args)=>{calls.push({sql,args});return {rowCount:2,rows:[{id:'house'},{id:'player'}]};}},'player');
 assert.equal(calls[0].sql,'SELECT id,balance FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE');assert.deepEqual(calls[0].args,[['player','house']]);
 await assert.rejects(lock({query:async()=>({rowCount:1,rows:[{id:'player'}]})},'player'),/PLAYER_OR_HOUSE_WALLET_MISSING/);
});

test('all three exact protected transaction prefixes replay before the new guard and retain sorted wallet locking',async()=>{
 assert.equal(fixture.privateDeploymentMetadataPublished,false);assert.equal(fixture.privateDeploymentPinsRequired,true);assert.equal(Object.hasOwn(fixture,'sourceRuntimeSha256'),false);
 assert.deepEqual(fixture.prefixes.map(p=>p.handler),['originals','settle','action']);
 for(const prefix of fixture.prefixes){
  assert.equal(hash(prefix.source),prefix.sha256);
  const code=prefix.source.replace(acceptance,guardCall+acceptance);
  const fn=new AsyncFunction('req','c','uid','roundToken','fingerprint','authenticate','lockWallets','fail','accepting','independent60Admission',code+'\nreturn "fresh";');
  const invoke=async({replay=false,collision=false,disabled=false,active=false}={})=>{
   const events=[];let queryIndex=0;
   const c={query:async()=>{events.push('query');queryIndex++;return queryIndex===1&&replay?{rowCount:1,rows:[{request_hash:'same',result_json:{receipt:'unchanged'}}]}:queryIndex===2&&collision?{rowCount:1,rows:[{}]}:{rowCount:0,rows:[]};}};
   let result,error;
   try{result=await fn({},c,'user','request','same',async()=>events.push('authenticate'),async()=>events.push('lockWallets'),(status,message)=>{throw Object.assign(new Error(message),{status});},!disabled,{assertNoActive:async()=>{events.push('guard');if(active)throw Object.assign(new Error('FINISH_ACTIVE_ROUND'),{status:409});}});}catch(e){error=e;}
   return {events,result,error};
  };
  const replay=await invoke({replay:true,disabled:true,active:true});assert.deepEqual(replay.result,{receipt:'unchanged'});assert.deepEqual(replay.events,['authenticate','lockWallets','query']);
  const fresh=await invoke();assert.equal(fresh.result,'fresh');assert.deepEqual(fresh.events,['authenticate','lockWallets','query','query','guard']);
  const collision=await invoke({collision:true});assert.equal(collision.error.status,409);assert(!collision.events.includes('guard'));
  const active=await invoke({active:true});assert.equal(active.error.message,'FINISH_ACTIVE_ROUND');
 }
});

function syntheticProtectedSource(){return [
  'export async function createSlotService({databaseUrl,redisUrl,migration,enabled=false,origin,fault=()=>{},qa=false}){',
  " let accepting=enabled;const rate=new Map();const houseFor=uid=>qa?'qa-house:'+uid:'house';",
  ...fixture.prefixes.map(p=>'// '+p.handler+'\n'+p.source),
  'const metadata={nativeSchemaCompatibility:nativeSchemaProbe.get(),activeModels:[]};\n}',
 ].join('\n');}

test('offline preparer inserts only three read checks and restores every original byte',()=>{
 const synthetic=syntheticProtectedSource();
 const result=prepareProtected60Admission({source:synthetic,expectedSourceSha256:hash(synthetic)});
 assert.equal(result.manifest.enabled,false);assert.equal(result.manifest.addedReadOnlyAdmissionCalls,3);
 assert.equal(result.manifest.restoredOriginalSha256,hash(synthetic));assert.equal(result.manifest.changesMonetaryHelperBodies,false);
 assert.equal(result.source.split(guardCall).length-1,3);assert.equal(result.manifest.newPools,0);assert.equal(result.manifest.newMigrations,0);
 assert.throws(()=>prepareProtected60Admission({source:synthetic}),/EXACT_CURRENT/);
 for(const expectedSourceSha256 of ['','a'.repeat(63),'A'.repeat(64),'f'.repeat(64)])assert.throws(()=>prepareProtected60Admission({source:synthetic,expectedSourceSha256}),/EXACT_CURRENT/);
 assert.throws(()=>prepareProtected60Admission({source:synthetic,expectedSourceSha256:hash(synthetic),enabled:true}),/REVIEWED_SHARED_DATABASE/);
});

test('closed protected carrier requires separate verified private pins and preserves every unrelated loader byte',()=>{
 const original=syntheticProtectedSource(),expectedRuntimeSha256=hash(original);
 const change=prepareProtected60Admission({source:original,expectedSourceSha256:expectedRuntimeSha256});
 const oldPayload=gzipSync(Buffer.from(original)).toString('base64');
 const loader=`const runtimeBytes=gunzipSync(Buffer.from('${oldPayload}', 'base64'));\nif(runtimeBytes.length !== ${Buffer.byteLength(original)})throw Error('length');\nif(hash(runtimeBytes)!=='${expectedRuntimeSha256}')throw Error('integrity');\nexport default importRuntime(runtimeBytes);\n`;
 const expectedCarrierSha256=hash(loader),args={loader,runtimeCandidate:change.source,changeManifest:change.manifest,expectedCarrierSha256,expectedRuntimeSha256};
 const result=prepareProtected60ObservationCarrier(args);
 assert.equal(result.manifest.enabled,false);assert.equal(result.manifest.productionApplied,false);
 assert.equal(result.manifest.originalSha256,expectedCarrierSha256);assert.equal(result.manifest.restoredOriginalSha256,expectedCarrierSha256);
 assert.equal(result.manifest.changesMonetaryHelperBodies,false);assert.equal(result.manifest.changesBalances,false);
 const encoded=result.source.match(/Buffer\.from\('([A-Za-z0-9+/=]+)',\s*'base64'\)/)[1];
 assert.equal(gunzipSync(Buffer.from(encoded,'base64')).toString(),change.source);
 assert(result.source.includes('runtimeBytes.length !== '+Buffer.byteLength(change.source)));
 assert(result.source.includes(hash(change.source)));
 for(const expectedCarrierSha256 of [undefined,'','a'.repeat(63),'A'.repeat(64),'f'.repeat(64)])assert.throws(()=>prepareProtected60ObservationCarrier({...args,expectedCarrierSha256}),/EXACT_CURRENT_PROTECTED_CARRIER/);
 for(const expectedRuntimeSha256 of [undefined,'','a'.repeat(63),'A'.repeat(64),'f'.repeat(64)])assert.throws(()=>prepareProtected60ObservationCarrier({...args,expectedRuntimeSha256}),/CLOSED_PROTECTED60_OBSERVATION_MANIFEST/);
 assert.throws(()=>prepareProtected60ObservationCarrier({...args,runtimeCandidate:change.source+'\n'}),/CLOSED_PROTECTED60_OBSERVATION_MANIFEST/);
 assert.throws(()=>prepareProtected60ObservationCarrier({...args,changeManifest:{...change.manifest,enabled:true}}),/CLOSED_PROTECTED60_OBSERVATION_MANIFEST/);
});

function poolFixture({failAt,identity='a'.repeat(64),library=true}={}){
 const queries=[];let releases=0;
 return {queries,get releases(){return releases;},pool:{connect:async()=>({query:async sql=>{queries.push(sql);if(failAt&&sql.startsWith(failAt))throw Error('private db detail');return {rows:sql.startsWith('SELECT')?[{database_identity_sha256:identity,library_rounds:library,canonical_wallets:true}]:[]};},release(){releases++;}})}};
}
test('disabled observation uses one bounded readonly transaction, rolls back and never gates existing wagers',async()=>{
 const f=poolFixture(),guard=createProtected60AdmissionGuard({pool:f.pool,gameIds:NATIVE60_GAME_IDS});
 await guard.ready;const status=guard.snapshot();assert.equal(status.enabled,false);assert.equal(status.status,'observed');assert.equal(status.rollbackConfirmed,true);assert.equal(status.databaseIdentitySha256,'a'.repeat(64));
 assert(f.queries[0].includes('READ ONLY'));assert.equal(f.queries.at(-1),'ROLLBACK');assert.equal(f.releases,1);
 assert(f.queries.every(q=>/^(BEGIN|SET|SELECT|ROLLBACK)\b/.test(q)));assert.equal(status.balanceAmountsReturned,0);
 await guard.assertNoActive({query:()=>{throw Error('disabled guard must not query');}},'user');
 assert(!JSON.stringify(status).includes('private db detail'));
});
test('enabled guard requires observed matching database proof and reads only exact60 active IDs',async()=>{
 const f=poolFixture(),guard=createProtected60AdmissionGuard({pool:f.pool,gameIds:NATIVE60_GAME_IDS,enabled:true,expectedNativeDatabaseIdentitySha256:'a'.repeat(64)});await guard.ready;
 assert.equal(guard.snapshot().enabled,true);const calls=[];
 await guard.assertNoActive({query:async(sql,args)=>{calls.push({sql,args});return {rows:[]};}},'user');
 assert.equal(calls.length,1);assert.deepEqual(calls[0].args,['user',NATIVE60_GAME_IDS]);assert(!calls[0].sql.includes('FOR UPDATE'));
 await assert.rejects(guard.assertNoActive({query:async()=>({rows:[{game_id:NATIVE60_GAME_IDS[0]}]})},'user'),/FINISH_ACTIVE_ROUND/);
 for(const config of [{identity:'b'.repeat(64)},{library:false},{failAt:'SELECT'},{failAt:'ROLLBACK'}]){
  const other=poolFixture(config),blocked=createProtected60AdmissionGuard({pool:other.pool,gameIds:NATIVE60_GAME_IDS,enabled:true,expectedNativeDatabaseIdentitySha256:'a'.repeat(64)});
  await blocked.ready;assert.equal(blocked.snapshot().enabled,false);await assert.rejects(blocked.assertNoActive({query:()=>{throw Error('must not read active rows');}},'user'),/SHARED_ADMISSION_UNVERIFIED/);assert.equal(other.releases,1);
 }
});
