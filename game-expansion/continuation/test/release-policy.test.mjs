import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isMachineReleased,releasedAdapter,releaseReadiness,requiredChecks} from '../release-policy.mjs';
import {createRegistry} from '../backend-baseline/library-service.mjs';
import * as balloon from '../backend-baseline/balloon-rules.mjs';
import * as slots from '../models/smartsoft-slots.mjs';
import remaining from '../models/remaining-games.mjs';

test('the stricter A-to-Z release inventory covers exactly the latest23 requested identities',async()=>{
 const scope=JSON.parse(await readFile(new URL('../requested-list.json',import.meta.url),'utf8'));
 assert.equal(scope.requested.length,23);
 assert.deepEqual(Object.keys(releaseReadiness.machines).sort(),scope.requested.map(game=>game.id).sort());
 for(const entry of Object.values(releaseReadiness.machines))assert.deepEqual(Object.keys(entry.checks).sort(),[...requiredChecks].sort());
});
test('a built model or a launchable flag alone cannot publish an unfinished official-reference machine',()=>{
 for(const [id,entry]of Object.entries(releaseReadiness.machines)){
  assert.notEqual(entry.status,'verified');assert.equal(isMachineReleased({id,version:'anything',launchable:true}),false);
 }
 assert.equal(isMachineReleased({id:'unrequested_game',version:'v1',launchable:true}),false);
});
test('production retains the exact Balloon model while incomplete new models remain outside the wager registry',()=>{
 const registry=createRegistry([balloon,releasedAdapter(slots),releasedAdapter(remaining)]);
 assert.deepEqual(Object.keys(registry.definitions()),['balloon_native']);
 assert.equal(registry.get('balloon_native','superwin-balloon-1').adapter,balloon);
 for(const id of Object.keys(releaseReadiness.machines))assert.throws(()=>registry.get(id),/GAME_MODEL_UNAVAILABLE/);
});
