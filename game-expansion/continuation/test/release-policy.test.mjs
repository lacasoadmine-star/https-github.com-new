import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isMachineReleased,releasedAdapter,releaseReadiness,requiredChecks} from '../release-policy.mjs';
import {createRegistry} from '../backend-baseline/library-service.mjs';
import * as balloon from '../backend-baseline/balloon-rules.mjs';
import * as slots from '../models/smartsoft-slots.mjs';
import remaining from '../models/remaining-games.mjs';
import * as multihot40 from '../models/multihot40-rules.mjs';

test('the stricter A-to-Z release inventory covers exactly the latest23 requested identities',async()=>{
 const scope=JSON.parse(await readFile(new URL('../requested-list.json',import.meta.url),'utf8'));
 assert.equal(scope.requested.length,23);
 assert.deepEqual(Object.keys(releaseReadiness.machines).sort(),scope.requested.map(game=>game.id).sort());
 for(const entry of Object.values(releaseReadiness.machines))assert.deepEqual(Object.keys(entry.checks).sort(),[...requiredChecks].sort());
});
test('a built model or a launchable flag alone cannot publish an unfinished official-reference machine',()=>{
 for(const [id,entry]of Object.entries(releaseReadiness.machines)){
  assert.equal(isMachineReleased({id,version:'anything',launchable:true}),false);
  if(id!=='multihot40_native')assert.notEqual(entry.status,'verified');
 }
 assert.equal(isMachineReleased({id:'unrequested_game',version:'v1',launchable:true}),false);
});
test('production retains the exact Balloon model while incomplete new models remain outside the wager registry',()=>{
 const registry=createRegistry([balloon,releasedAdapter(slots),releasedAdapter(remaining),releasedAdapter(multihot40)]);
 assert.deepEqual(Object.keys(registry.definitions()),['balloon_native','multihot40_native']);
 assert.equal(registry.get('balloon_native','superwin-balloon-1').adapter,balloon);
 assert.equal(registry.get('multihot40_native','superwin-multihot40-2').adapter.definitions.multihot40_native.version,multihot40.VERSION);
 assert.equal(releaseReadiness.machines.multihot40_native.referenceParityClaim,false);
 for(const id of Object.keys(releaseReadiness.machines).filter(id=>id!=='multihot40_native'))assert.throws(()=>registry.get(id),/GAME_MODEL_UNAVAILABLE/);
});
