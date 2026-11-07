import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {LibraryService,createRegistry,seededRandom} from '../backend-baseline/library-service.mjs';
import * as balloon from '../backend-baseline/balloon-rules.mjs';
import {isolatedDraftAdapters,referenceStakes,ordinaryStake} from './isolated-draft-fixture.mjs';

const adapters=[balloon,...isolatedDraftAdapters()],registry=createRegistry(adapters);
const service=new LibraryService({sql:{}},{registry}),now=1700000000000;
const currentIds=Object.keys(registry.definitions()).filter(id=>id!=='balloon_native');
const rng=(id,seed)=>seededRandom(createHash('sha256').update(id+':'+seed).digest('hex'),'isolated-model-verification');
const configuredCap=model=>BigInt(model.definition.maxWin.replace('.',''));

test('the prior nine backend modules remain byte-identical, including wallet, sessions and accepted models',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../evidence/backend-baseline-manifest.json',import.meta.url),'utf8'));
 assert.equal(Object.keys(manifest).length,9);
 for(const [name,expected]of Object.entries(manifest))assert.equal(createHash('sha256').update(await readFile(new URL('../backend-baseline/'+name,import.meta.url))).digest('hex'),expected,name);
});
test('the existing Balloon version resolves unchanged and new IDs never replace the old four machines',()=>{
 assert.equal(registry.get('balloon_native','superwin-balloon-1').adapter,balloon);
 for(const id of ['multi_hot_5_video','multi_hot_5_native','hot_foxy_20','foxy_hot_20_native'])assert.throws(()=>registry.get(id),/GAME_MODEL_UNAVAILABLE/);
 assert.equal(new Set(currentIds).size,currentIds.length);assert.equal(currentIds.length,21);
 for(const id of ['darkhorus_native','assassins_native'])assert.throws(()=>registry.get(id),/GAME_MODEL_UNAVAILABLE/);
});
test('every identified draft model produces valid integer-money transitions within the unchanged ledger contract',()=>{
 for(const id of currentIds){
  const model=registry.get(id);
  for(const stake of referenceStakes(model.definition))for(let seed=0;seed<12;seed++){
   const random=rng(id,seed),raw=model.adapter.start(id,{stakeMinor:stake},random,now);
   const checked=service.transition(model,raw,{debitExpected:BigInt(stake),now});
   assert.equal(checked.debit,BigInt(stake));assert.ok(checked.liability<=configuredCap(model),id);assert.ok(Buffer.byteLength(JSON.stringify(raw.state))<=128*1024,id);
   const view=model.adapter.publicState(structuredClone(raw.state),now);
   assert.equal(Object.hasOwn(view,'_mineIndices'),false);assert.equal(Object.hasOwn(view,'secret_seed'),false);
   if(raw.state.status==='active'){
    const prior={total_stake:stake,liability:raw.maxPayoutMinor};
    const expired=model.adapter.expire(structuredClone(raw.state),random,raw.state.expiresAt+1);
    const final=service.transition(model,expired,{prior,now:raw.state.expiresAt+1});
    assert.equal(final.debit,0n);assert.equal(final.state.status,'settled');assert.ok(final.liability<=checked.liability);assert.ok(final.payout<=checked.liability);
   }else assert.ok(checked.payout<=checked.liability);
  }
 }
});
test('reservation bounds do not depend on whether a sampled start happens to win',()=>{
 for(const id of currentIds){
  const model=registry.get(id),liabilities=new Set();
  for(let seed=0;seed<30;seed++)liabilities.add(model.adapter.start(id,{stakeMinor:ordinaryStake(model.definition)},rng(id,seed),now).maxPayoutMinor);
  assert.equal(liabilities.size,1,id+' changed required bankroll based on realized prize');
 }
});
test('worst uniform RNG outcomes remain bounded, serializable and valid for the ledger',()=>{
 for(const id of currentIds){
  const model=registry.get(id);
  for(const value of [0,0.5,0.999999]){
   const stake=referenceStakes(model.definition).at(-1);
   const raw=model.adapter.start(id,{stakeMinor:stake},()=>value,now);
   const checked=service.transition(model,raw,{debitExpected:BigInt(stake),now});
   assert.ok(Buffer.byteLength(JSON.stringify(raw.state))<=128*1024,id);
   assert.ok(checked.liability<=configuredCap(model),id);
  }
 }
});
test('interactive actions and expiry cannot debit a second stake or expose hidden mines',()=>{
 for(const id of ['towerrush_native','coinminer_native']){
  const model=registry.get(id),random=rng(id,10);let raw=model.adapter.start(id,{stakeMinor:'100'},random,now);
  for(let step=0;step<5&&raw.state.status==='active';step++){
   const prior={total_stake:'100',liability:raw.maxPayoutMinor};
   const input=id==='towerrush_native'?{type:'step'}:{type:'pick',index:step};
   raw=model.adapter.act(structuredClone(raw.state),input,random,now+step+1);
   const next=service.transition(model,raw,{prior,now:now+step+1});assert.equal(next.debit,0n);assert.equal(next.state.stakeMinor,'100');
   if(raw.state.status==='active')assert.equal(model.adapter.publicState(structuredClone(raw.state),now)._mineIndices,undefined);
  }
  if(raw.state.status==='active'){
   const final=model.adapter.act(structuredClone(raw.state),{type:'cashout'},random,now+10);
   assert.equal(final.debitMinor,'0');assert.equal(final.state.status,'settled');assert.equal(final.payoutMinor,raw.state.currentCashoutMinor);
  }
 }
});
