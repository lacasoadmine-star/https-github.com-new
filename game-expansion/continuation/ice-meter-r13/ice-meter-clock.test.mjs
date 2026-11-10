import test from 'node:test';
import assert from 'node:assert/strict';
import {iceMeterClock,ICE_METER_CYCLE_TICKS} from './ice-meter-clock.mjs';
const id='burningice10_native';
test('source tick accumulation selects the same icon through every frame',()=>{
 let index=0;
 for(let tick=0;Math.trunc(index/9)===0;tick++,index+=.1){
  const state=iceMeterClock(id,{elapsedMs:tick*1000/60+1e-7});
  assert.equal(state.phase,'cycling');assert.equal(state.movingSlot,Math.trunc(index)%3);
 }
 assert.equal(ICE_METER_CYCLE_TICKS,91);
});
test('accepted inner reels light and launch in source order with 200ms gaps',()=>{
 const start=ICE_METER_CYCLE_TICKS*1000/60;
 const at=ms=>iceMeterClock(id,{elapsedMs:start+ms,coinReels:[3,1]});
 assert.deepEqual(at(0).activeSlots,[0]);assert.deepEqual(at(0).columnEffects,[]);
 assert.deepEqual(at(200).activeSlots,[0,2]);assert.deepEqual(at(200).columnEffects,[{column:1,elapsedMs:0}]);
 assert.deepEqual(at(400).columnEffects,[{column:1,elapsedMs:200},{column:3,elapsedMs:0}]);
});
test('40 hides its meter but retains column effect sequence',()=>{
 const state=iceMeterClock('burningice40_native',{elapsedMs:3000,coinReels:[2]});
 assert.equal(state.visible,false);assert.equal(state.columnEffects[0].column,2);
});
test('cancellation, invalid input and protected titles cannot animate stale choices',()=>{
 const choices=[1,3];const original=JSON.stringify(choices);
 const args={elapsedMs:3000,coinReels:choices};
 assert.deepEqual(iceMeterClock(id,{...args,cancelled:true}).columnEffects,[]);
 assert.deepEqual(iceMeterClock(id,{elapsedMs:0}).activeSlots,[0]);
 for(const bad of [-1,NaN,Infinity])assert.equal(iceMeterClock(id,{elapsedMs:bad}),null);
 for(const other of ['multihot5_native','foxyhot20_native'])assert.equal(iceMeterClock(other,args),null);
 assert.equal(JSON.stringify(choices),original);
});
