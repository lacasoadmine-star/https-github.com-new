import test from 'node:test';
import assert from 'node:assert/strict';
import { runtime, legacy } from '../artifacts/versioned-core.mjs';
import { bindState } from '../artifacts/state-endpoint.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const read=async(gameId,free)=>{
 const calls=[];
 const endpoint=bindState({...runtime,fail,json:x=>x,cash:x=>(Number(x)/100).toFixed(2),pool:{query:async(sql,args)=>{calls.push({sql,args});return {rows:free?[free]:[]};}}});
 const result=await endpoint({method:'GET'},'/api/state/'+gameId,'synthetic-user');return {result,calls};
};
test('fresh state identifies next current model without relying on recent history',async()=>{
 for(const id of ['hot_foxy_20','multi_hot_5_video']){
  const {result,calls}=await read(id);assert.equal(result.freeSpinsRemaining,0);assert.equal(result.bet,null);assert.equal(result.legacyFreeSpins,false);
  const identity=runtime.modelIdentity(id);assert.equal(result.mathSha256,identity.mathSha256);assert.equal(result.activeMathVersion,identity.mathVersion);assert.equal(result.currentMathVersion,identity.mathVersion);
  assert.equal(calls.length,1);assert.deepEqual(calls[0].args,['synthetic-user',id]);assert.match(calls[0].sql,/sw_nine.free_spins/);
 }
});
test('legacy entitlement state exposes old locked bet and both identities',async()=>{
 const {result}=await read('hot_foxy_20',{remaining:10,bet:'20000'});assert.equal(result.legacyFreeSpins,true);assert.equal(result.bet,'200.00');assert.equal(result.mathSha256,legacy.mathSha256);assert.equal(result.activeMathSha256,legacy.mathSha256);assert.equal(result.currentMathVersion,runtime.modelIdentity('hot_foxy_20').mathVersion);
});
test('state rejects unknown game without a database query',async()=>{
 await assert.rejects(read('made_up'),e=>e.status===404&&e.message==='GAME_NOT_FOUND');
});
