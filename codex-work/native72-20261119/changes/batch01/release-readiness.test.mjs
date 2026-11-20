import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const batch=JSON.parse(await readFile(new URL('./release-readiness.json',import.meta.url),'utf8'));
test('first ten slots are each separately represented and protected originals are untouched',()=>{
 assert.equal(batch.schema,'zplay-first-ten-release-readiness-v1');
 assert.equal(batch.entries.length,10);
 assert.deepEqual(batch.entries.map(e=>e.position),[1,2,3,4,5,6,7,8,9,10]);
 assert.equal(new Set(batch.entries.map(e=>e.sourceKey)).size,10);
 assert.ok(batch.entries.every(e=>!batch.protectedOriginals.includes(e.title)));
});
test('all games reuse the existing Worker, Railway and authoritative wallet ledger only',()=>{
 assert.equal(batch.existingStack.worker,'superwin-player');
 assert.equal(batch.existingStack.railway,'superwinbet-platform');
 assert.equal(batch.existingStack.newWallets,0);
 assert.equal(batch.existingStack.newBackends,0);
 assert.ok(batch.entries.every(e=>e.realMoneyTestCharges===0));
});
test('a route and a file do not imply release: every game requires production and financial proof',()=>{
 for(const entry of batch.entries){
  assert.equal(entry.productionReady,false,entry.title);
  assert.equal(entry.authenticatedLiveSettlementVerified,false,entry.title);
  assert.ok(entry.remainingGates.length>=1,entry.title);
  assert.ok(entry.patches.length>=1,entry.title);
  assert.match(entry.officialDemo,/^https:\/\//,entry.title);
 }
});
test('missing games are never represented as live Player games without a launch route',()=>{
 for(const key of ['multihot20','multihot5burnwilds']){
  const e=batch.entries.find(e=>e.sourceKey===key);
  assert.equal(e.observedRoute,null);
  assert.ok(e.remainingGates.includes('no_live_play_now_route'));
  assert.ok(e.remainingGates.includes('server_game_model_unverified'));
  assert.equal(e.packageType,'new-controller-no-public-route');
 }
});
test('new first-ten game modules are not one cross-contaminated renderer',async()=>{
 const individualFiles=new Set();
 for(const entry of batch.entries){
  for(const path of entry.patches){
   assert.ok(!individualFiles.has(path),'Duplicate package linked to two games: '+path);
   individualFiles.add(path);
   const resolved=new URL(path,new URL('./',import.meta.url));
   const source=await readFile(resolved,'utf8');
   assert.ok(source.length>80,'Empty module '+path);
  }
 }
});
