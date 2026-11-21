import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createIndependentRegistry} from './independent-registry.mjs';

const artifactBytes=await readFile(new URL('./independent-operator-audit.json',import.meta.url));
const evaluatorBytes=await readFile(new URL('./official-math.mjs',import.meta.url));
const pins=JSON.parse(await readFile(new URL('./independent-release-pins.json',import.meta.url)));
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=v=>Buffer.from(JSON.stringify(v));
const copy=()=>JSON.parse(artifactBytes);
const load=(b=artifactBytes,e=evaluatorBytes,pin=hash(b))=>createIndependentRegistry({artifactBytes:b,evaluatorBytes:e,expectedArtifactSha256:pin});

test('loads both immutable candidates with exact independent RTP and no production approval',()=>{
  const registry=load();
  assert.equal(registry.artifactSha256,pins.artifactSha256);
  assert.equal(registry.evaluatorSha256,pins.evaluatorSha256);
  assert.equal(registry.evaluatorSha256,hash(evaluatorBytes));
  for(const id of ['fresh_multihot20','fresh_multihot5burnwilds']){
    const p=registry.profileForGame(id);
    assert.equal(p.mathSha256,pins.profileSha256[id]);
    assert.equal(p.productionApproved,false);assert.equal(p.probabilityModelAudited,false);
    assert.equal(p.providerRngReproduced,false);assert.ok(Object.isFrozen(p.reelStrips[0]));
    assert.throws(()=>{p.reelStrips[0][0]='wild'},TypeError);
  }
  assert.deepEqual(registry.profileForGame('fresh_multihot20').targetReturn,{numerator:'9663',denominator:'10000'});
  assert.deepEqual(registry.profileForGame('fresh_multihot5burnwilds').targetReturn,{numerator:'1931',denominator:'2000'});
  assert.throws(()=>registry.profileForGame('fresh_multihot10'),/NOT_REGISTERED/);
});
test('rejects artifact and evaluator byte corruption before exposing any profile',()=>{
  assert.throws(()=>load(Buffer.concat([artifactBytes,Buffer.from(' ')]),evaluatorBytes,hash(artifactBytes)),/ARTIFACT_HASH_MISMATCH/);
  assert.throws(()=>load(artifactBytes,Buffer.concat([evaluatorBytes,Buffer.from(' ')])),/EVALUATOR_HASH_MISMATCH/);
});
test('a repinned artifact cannot smuggle approvals into production',()=>{
  for(const edit of [a=>a.productionApproved=true,a=>a.results.fresh_multihot20.profile.productionApproved=true,
    a=>a.results.fresh_multihot20.profile.providerRngReproduced=true]){
    const a=copy();edit(a);assert.throws(()=>load(bytes(a)),/CANNOT_ENABLE_PRODUCTION|APPROVAL_INVALID/);
  }
});
test('a repinned artifact cannot silently change strip frequencies or wheel weights',()=>{
  for(const edit of [p=>p.reelStrips[0].push('seven'),p=>p.wheelWeights[0]++]){
    const a=copy();edit(a.results.fresh_multihot20.profile);
    assert.throws(()=>load(bytes(a)),/PROFILE_HASH_MISMATCH/);
  }
});
test('rejects a claimed expected-return proof with altered payout sums',()=>{
  const a=copy();a.results.fresh_multihot5burnwilds.audit.enumeration.perWheel[0].payoutSumCents='1';
  assert.throws(()=>load(bytes(a)),/RETURN_PROOF_INVALID/);
});
test('rejects incomplete or cross-game artifact sets',()=>{
  const a=copy();delete a.results.fresh_multihot20;assert.throws(()=>load(bytes(a)),/GAME_SET_MISMATCH/);
  const b=copy();b.results.fresh_multihot20.profile.gameId='fresh_multihot5burnwilds';
  assert.throws(()=>load(bytes(b)),/PROFILE_INVALID/);
});
