import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
import {test} from 'node:test';
import vm from 'node:vm';

const catalogPath='/zplay-restored/20261117-details-r1/catalog-data.mjs';
const lobbyPath='/zplay-restored/20261117-details-r1/lobby.mjs';
const fixtures=[
 {path:catalogPath,hash:'3d6c9ed4697d687b1f56bb283d01c230c9ddc47c311fdf81098836904e362192',file:'catalog-data.mjs'},
 {path:lobbyPath,hash:'db5d4d9910fdbbe68850b93a39900f87649385d9b5274c0322117bb76070e885',file:'lobby.mjs'},
];
for(const fixture of fixtures){fixture.bytes=await readFile(new URL('./fixtures/'+fixture.file,import.meta.url));fixture.key='native72/catalog/'+fixture.hash;}
const source=await readFile(process.env.CATALOG_MODULE_PATH||new URL('../modules/native72catalog/entry.mjs',import.meta.url),'utf8');
async function loadHandler({mode='normal',portal='player'}={}){
 const calls=[],fallbackCalls=[];
 const previous={fetch:async(...args)=>{fallbackCalls.push(args);return new Response('preserved previous response',{status:209});},scheduled:()=>42};
 const context=vm.createContext({URL,Response,Request,crypto:webcrypto});
 const module=new vm.SourceTextModule(source,{context});
 const imported=new vm.SyntheticModule(['default','preservedExport'],function(){this.setExport('default',previous);this.setExport('preservedExport','retained');},{context});
 await module.link(specifier=>{assert.equal(specifier,'../native72deluxe/entry.mjs');return imported;});
 await module.evaluate();
 const env={PORTAL:portal,SSG_OFFICIAL_REFERENCES:{async get(key,type){calls.push({key,type});assert.equal(type,'arrayBuffer');if(mode==='missing')return null;const fixture=fixtures.find(x=>x.key===key);assert.ok(fixture,'Unexpected KV key '+key);const bytes=mode==='corrupt'?Buffer.from('corrupt catalog bytes'):fixture.bytes;return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);}}};
 return {handler:module.namespace.default,exports:module.namespace,env,calls,fallbackCalls};
}
test('production catalog and lobby fixtures have distinct verified SHA-256 digests',()=>{
 for(const f of fixtures)assert.equal(createHash('sha256').update(f.bytes).digest('hex'),f.hash);
 assert.notEqual(fixtures[0].hash,fixtures[1].hash);
});
for(const fixture of fixtures){
 test('GET '+fixture.file+' serves exactly its own verified KV value',async()=>{
  const {handler,env,calls}=await loadHandler();
  const response=await handler.fetch(new Request('https://player.test'+fixture.path),env,{});
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('content-type'),'text/javascript; charset=utf-8');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),fixture.bytes);
  assert.deepEqual(calls,[{key:fixture.key,type:'arrayBuffer'}]);
 });
 test('HEAD '+fixture.file+' verifies the right KV value without a response body',async()=>{
  const {handler,env,calls}=await loadHandler();
  const response=await handler.fetch(new Request('https://player.test'+fixture.path,{method:'HEAD'}),env,{});
  assert.equal(response.status,200);assert.equal(await response.text(),'');
  assert.deepEqual(calls,[{key:fixture.key,type:'arrayBuffer'}]);
 });
 test('missing '+fixture.file+' returns an uncached 503',async()=>{
  const {handler,env,calls}=await loadHandler({mode:'missing'});
  const response=await handler.fetch(new Request('https://player.test'+fixture.path),env,{});
  assert.equal(response.status,503);assert.equal(await response.text(),'Catalogue temporarily unavailable');
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(calls,[{key:fixture.key,type:'arrayBuffer'}]);
 });
 test('corrupt '+fixture.file+' fails its integrity check without serving source',async()=>{
  const {handler,env,calls}=await loadHandler({mode:'corrupt'});
  const response=await handler.fetch(new Request('https://player.test'+fixture.path),env,{});
  assert.equal(response.status,503);assert.equal(await response.text(),'Catalogue integrity check failed');
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(calls,[{key:fixture.key,type:'arrayBuffer'}]);
 });
}
test('retired promotion and old game aliases require no KV reads',async()=>{
 const {handler,env,calls}=await loadHandler();
 const retired=await handler.fetch(new Request('https://player.test/native-new/20261118-r1/lobby-v445.mjs'),env,{});
 assert.equal(retired.status,200);assert.match(await retired.text(),/Retired separate test-wallet promotion/);
 for(const [from,to] of [['habeshafortune5_native','habesha_fortune_5_native'],['multihotdeluxe_native','multi_hot_5_deluxe_native']]){
  const response=await handler.fetch(new Request('https://player.test/games/'+from),env,{});
  assert.equal(response.status,307);assert.equal(response.headers.get('location'),'/games/'+to);
 }
 assert.deepEqual(calls,[]);
});
test('non-player, mutation and unrelated requests retain the previous handler',async()=>{
 for(const [portal,path,method] of [['agent',lobbyPath,'GET'],['player',lobbyPath,'POST'],['player','/api/account','GET']]){
  const {handler,env,calls,fallbackCalls,exports}=await loadHandler({portal});
  const request=new Request('https://player.test'+path,{method});
  const response=await handler.fetch(request,env,{});
  assert.equal(response.status,209);assert.equal(await response.text(),'preserved previous response');
  assert.deepEqual(calls,[]);assert.equal(fallbackCalls[0][0],request);
  assert.equal(handler.scheduled(),42);assert.equal(exports.preservedExport,'retained');
 }
});
