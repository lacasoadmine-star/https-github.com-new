import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createOperatorRelease,OPERATOR_IDS,OPERATOR_RELEASE_ID} from '../../deploy/smartsoft/operator-policy-r16.mjs';
const policy=JSON.parse(await readFile(new URL('../../deploy/smartsoft/operator-policy-r16.json',import.meta.url)));
const readiness={machines:Object.fromEntries(OPERATOR_IDS.map(id=>[id,{modelVersion:policy.versions[id],status:'in_development',checks:{officialIdentity:true,paytable:true,nativeMath:true,walletSettlement:true,browserIntegration:true,visibleRules:false,controlsAndBonuses:false,presentationComparison:false}}]))};
function fixture(){
 const configs=Object.fromEntries(OPERATOR_IDS.map(id=>[id,{id,version:policy.versions[id],currency:'ETB',minStake:'1.00',maxStake:'40000.00',launchable:false,published:false,math:{kind:'independent-zplay'},currencyAdaptation:{productionLaunchable:false}}]));
 const protectedGame={id:'foxy_hot_20_native',version:'original',launchable:true,published:true};configs[protectedGame.id]=protectedGame;
 const calls=[];
 const original={definitions:configs,publicGameConfigs:configs,
  start(...args){calls.push(['old',...args]);return 'old';},
  evaluateDraftRound(...args){calls.push(['native',...args]);return 'same native result';},
  act(){return 'accepted action';},expire(){return 'accepted expiry';},publicState(){return 'accepted state';}};
 let enabled=false;
 const adapter=createOperatorRelease(original,{policy,readiness,isEnabled:()=>enabled});
 return {adapter,original,calls,setEnabled:value=>{enabled=value;}};
}
test('cash-start authorization changes no full-reference readiness or native mathematical version',()=>{
 const before=structuredClone(readiness),{adapter,original}=fixture();assert.deepEqual(readiness,before);
 for(const id of OPERATOR_IDS){assert.equal(adapter.definitions[id].version,original.definitions[id].version);assert.equal(adapter.definitions[id].launchable,true);assert.equal(adapter.definitions[id].operatorRelease.completeReferenceParityVerified,false);assert.equal(adapter.definitions[id].operatorRelease.providerPrivateMathVerified,false);assert.equal(adapter.definitions[id].math,original.definitions[id].math);}
 assert.equal(adapter.definitions.foxy_hot_20_native,original.definitions.foxy_hot_20_native);
 for(const key of ['act','expire','publicState'])assert.equal(adapter[key],original[key]);
});
test('the exact scoped flag is required for every new start while accepted operations retain their adapter',()=>{
 const f=fixture();for(const id of OPERATOR_IDS)assert.throws(()=>f.adapter.start(id,{},()=>0,123),/REMAINING_GAME_NOT_RELEASED/);
 assert.equal(f.calls.length,0);f.setEnabled(true);
 for(const id of OPERATOR_IDS){const options={stakeMinor:'100'},rng=()=>0.5;assert.equal(f.adapter.start(id,options,rng,123),'same native result');assert.deepEqual(f.calls.at(-1),['native',id,options,rng,123]);assert.equal(f.adapter.operatorCanStart(f.adapter.definitions[id]),true);}
 f.setEnabled(false);assert.equal(f.adapter.act(),'accepted action');assert.equal(f.adapter.expire(),'accepted expiry');
 assert.equal(f.adapter.start('foxy_hot_20_native'),'old');
});
test('wrong currency, limits, financial evidence, version or owner authorization cannot open starts',()=>{
 for(const change of [p=>p.releaseId='other',p=>p.authorization='unknown',p=>p.gameIds.push('coinminer_native'),p=>p.providerPrivateMathVerified=true,p=>p.completeReferenceParityVerified=true,p=>p.versions[OPERATOR_IDS[0]]='old']){
  const modified=structuredClone(policy);change(modified);assert.throws(()=>createOperatorRelease(fixture().original,{policy:modified,readiness}));
 }
 for(const check of ['officialIdentity','paytable','nativeMath','walletSettlement','browserIntegration']){
  const modified=structuredClone(readiness);modified.machines[OPERATOR_IDS[0]].checks[check]=false;
  assert.throws(()=>createOperatorRelease(fixture().original,{policy,readiness:modified}),/OPERATOR_FINANCIAL_REVIEW_INCOMPLETE/);
 }
 for(const [key,value]of [['currency','CREDITS'],['minStake','0.10'],['maxStake','100000.00']]){
  const original=fixture().original;original.definitions[OPERATOR_IDS[0]][key]=value;assert.throws(()=>createOperatorRelease(original,{policy,readiness}));
 }
});
test('unbuilt titles, protected titles and historical versions never enter this release',()=>{
 const f=fixture();f.setEnabled(true);
 for(const id of ['coinminer_native','moonstone_native','multi_hot_5_native','foxy_hot_20_native','not_built'])assert.equal(f.adapter.operatorCanStart({id,version:'any',launchable:true,operatorRelease:{id:OPERATOR_RELEASE_ID}}),false);
 assert.equal(f.adapter.operatorCanStart({...f.adapter.definitions[OPERATOR_IDS[0]],version:'older-model'}),false);
});
