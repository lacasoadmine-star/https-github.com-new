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
test('staged games retain unavailable Player routes and closed math/deployment gates',async()=>{
 const pins=JSON.parse(await readFile(new URL('./player-route-pins.json',import.meta.url),'utf8'));
 for(const key of ['multihot20','multihot5burnwilds']){
  const e=batch.entries.find(e=>e.sourceKey===key);
  assert.equal(e.observedRoute,null);
  assert.ok(e.remainingGates.includes('public_player_route_not_deployed'));
  assert.ok(e.remainingGates.includes('server_enabled_authoritative_game_model_not_verified'));
  assert.equal(e.packageType,'per-game-native-canvas-and-existing-KV-pinned-unreleased');
  assert.equal(e.kvRelease.published,false);
  assert.equal(pins.games[key].published,false);
  assert.equal(pins.games[key].path,e.requestedPlayerRoute);
  assert.equal(e.serverMathWork.liveDeployed,false);
  assert.equal(e.serverMathWork.auditedProbabilityProfileApproved,false);
 }
});
test('new first-ten game modules are not one cross-contaminated renderer',async()=>{
 // The route wrapper and pin manifest are shared deployment infrastructure;
 // each game's artwork, renderer, session and controls stay in its own package.
 const sharedInfrastructure=new Set(['./player-kv-route.mjs','./player-route-pins.json']);
 const individualFiles=new Set();
 for(const entry of batch.entries){
  const withinEntry=new Set();
  for(const path of entry.patches){
   assert.ok(!withinEntry.has(path),'Duplicate patch within game: '+path);
   withinEntry.add(path);
   if(sharedInfrastructure.has(path)){
    assert.ok(['multihot20','multihot5burnwilds'].includes(entry.sourceKey),'Unexpected shared route owner');
   }else{
    assert.ok(!individualFiles.has(path),'Duplicate package linked to two games: '+path);
    individualFiles.add(path);
    if(['multihot20','multihot5burnwilds'].includes(entry.sourceKey))assert.ok(path.startsWith('./'+entry.sourceKey+'/'),'Foreign game package: '+path);
   }
   const resolved=new URL(path,new URL('./',import.meta.url));
   const source=await readFile(resolved,'utf8');
   assert.ok(source.length>80,'Empty module '+path);
  }
 }
});
