import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,createHmac} from 'node:crypto';
import {prepareBootstrapPatch,ORIGINAL_EXPORT} from '../bootstrap-patch.mjs';
import {createRetainedLibrary74Fixture} from './support/retained-library-fixture.mjs';
import {createRegistry} from './support/retained-library/library-service.mjs';
const installer=await readFile(new URL('../artifacts/existing-library74-installer.mjs',import.meta.url),'utf8');
const checksum=value=>createHash('sha256').update(value).digest('hex');
const sourcePrefix='const app={existingLibraryDependencies:globalThis.__independent74BootstrapTestDependencies};const existing=globalThis.__independent74BootstrapPrevious;const addition={installRemaining:previous=>previous};const client={ASSETS:{}};const artwork={ART:{}};\n';
test('bootstrap patch preserves all originalbytes outside exact finalexport, verifies embeddedartifact and defaults stakesclosed',()=>{
 const source=sourcePrefix+ORIGINAL_EXPORT+'\n';const result=prepareBootstrapPatch({source,installer,expectedSourceSha256:checksum(source),expectedInstallerSha256:checksum(installer)});
 assert.equal(result.manifest.legacyRestorationSha256,checksum(source));assert.equal(result.manifest.defaultNewRoundsEnabled,false);assert.equal(result.manifest.createsFinancialService,false);assert.equal(result.manifest.runsMigrations,false);
 assert(result.source.startsWith(sourcePrefix));assert.match(result.source,/reviewedGameIds:\[\],allowNewRounds:false,gameLimits:\{\}/);
 assert.throws(()=>prepareBootstrapPatch({source,installer,expectedSourceSha256:'0'.repeat(64)}),/DEPLOYED_BOOTSTRAP_CHANGED/);
 assert.throws(()=>prepareBootstrapPatch({source,installer,expectedInstallerSha256:'0'.repeat(64)}),/INSTALLER_ARTIFACT_CHANGED/);
 assert.throws(()=>prepareBootstrapPatch({source:result.source,installer}),/EXACT_EXISTING_EXPORT_REQUIRED/);
 assert.throws(()=>prepareBootstrapPatch({source:source+ORIGINAL_EXPORT,installer}),/EXACT_EXISTING_EXPORT_REQUIRED/);
});
test('additive bootstrap importsverifiedinstaller, readsrealretainedfixturewallet and routeslegacyunchanged with newstakesclosed',async()=>{
 const fixture=await createRetainedLibrary74Fixture({isolated:true});
 const priorInfo=console.info,priorError=console.error,events=[];
 console.info=text=>events.push(JSON.parse(text));console.error=text=>events.push(JSON.parse(text));
 try{
 fixture.service.registry=createRegistry([]);
 const secret='test-only-bootstrap-secret-'+ 'x'.repeat(32),subject='@session:'+'a'.repeat(64);
 globalThis.__independent74BootstrapTestDependencies={service:fixture.service,verifyNative:fixture.verifyNative,readNativeBody:fixture.readNativeBody,engineSecret:secret,resolveSessionUser:async(shared,value)=>{assert.equal(shared,fixture.shared);assert.equal(value,subject);return fixture.fixtureUserId;}};
 globalThis.__independent74BootstrapPrevious={fetch:()=>new Response('legacy-preserved',{status:200})};
 const before=await fixture.sql.unsafe('SELECT id,balance FROM sw_rebuild.wallets ORDER BY id');
 const {source}=prepareBootstrapPatch({source:sourcePrefix+ORIGINAL_EXPORT,installer});
 const installed=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
 const health=await installed.fetch(new Request('http://fixture/v2/independent74/health'));assert.equal(health.status,200);const catalog=await health.json();assert.equal(catalog.games.length,72);assert.equal(catalog.accepting,false);
 const game=catalog.games[0];
 const signed=(path,body)=>{const raw=body?JSON.stringify(body):'',method=body?'POST':'GET',time=String(Date.now());const payload=[method,path,time,subject,checksum(raw)].join('\n');return new Request('http://fixture'+path,{method,headers:{'x-native-user':subject,'x-native-time':time,'x-native-signature':createHmac('sha256',secret).update(payload).digest('hex'),...(body?{'content-type':'application/json'}:{})},...(body?{body:raw}:{})});};
 const state=await installed.fetch(signed('/v2/independent74/state?game_id='+game.id));assert.equal(state.status,200);const account=await state.json();assert.equal(account.authenticated,true);assert.equal(account.currency,'ETB');assert.equal(account.accepting,false);assert.equal(account.balance,'100000000.00');assert.equal(account.user_id,undefined);
 const history=await installed.fetch(signed('/v2/independent74/history?game_id='+game.id));assert.equal(history.status,200);assert.deepEqual((await history.json()).history,[]);
 const action=await installed.fetch(signed('/v2/independent74/action',{request_id:crypto.randomUUID(),type:'start',game_id:game.id,model_version:game.version,stake:'1.00',options:{}}));assert.equal(action.status,503);
 assert.deepEqual(await fixture.sql.unsafe('SELECT id,balance FROM sw_rebuild.wallets ORDER BY id'),before);
 const legacy=await installed.fetch(new Request('http://fixture/old-machine'));assert.equal(await legacy.text(),'legacy-preserved');assert(events.some(e=>e.event==='independent74_existing_account_routes_installed'));
 }finally{console.info=priorInfo;console.error=priorError;delete globalThis.__independent74BootstrapTestDependencies;delete globalThis.__independent74BootstrapPrevious;await fixture.close();}
});
test('missingactualdependencies preserves the originalapp and failsclosed without requiringnewsecrets',async()=>{
 const priorError=console.error;const events=[];console.error=text=>events.push(JSON.parse(text));
 try{
 globalThis.__independent74BootstrapTestDependencies={};globalThis.__independent74BootstrapPrevious={fetch:()=>new Response('legacy-up')};
 const {source}=prepareBootstrapPatch({source:sourcePrefix+ORIGINAL_EXPORT+'\n// distinct import\n',installer});
 const app=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
 assert.equal(await (await app.fetch(new Request('http://fixture/old'))).text(),'legacy-up');assert(events.some(e=>e.event==='independent74_existing_account_installation_failed'&&e.legacy_preserved===true));
 }finally{console.error=priorError;delete globalThis.__independent74BootstrapTestDependencies;delete globalThis.__independent74BootstrapPrevious;}
});
