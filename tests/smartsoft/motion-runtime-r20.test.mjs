import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {patchPendingIceMotion} from '../../deploy/smartsoft/motion-runtime-r20.mjs';
const original=await readFile(new URL('./fixtures/smartsoft-motion-r17.mjs',import.meta.url),'utf8');
const view=await readFile(new URL('./fixtures/smartsoft-remaining7-view-r17.mjs',import.meta.url),'utf8');
assert.equal(createHash('sha256').update(original).digest('hex'),'7eab134ebddf3de8f30be53ff11e3ab31ab0eff1037659ed3bfb0c893eddc45d');
async function Motion(source){
 source=source.replace("'./smartsoft-remaining7-view.mjs'",JSON.stringify('data:text/javascript;base64,'+Buffer.from(view).toString('base64')));
 return (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).SmartSoftMotion;
}
const grid=rows=>Array.from({length:5},()=>Array.from({length:rows},()=> '0'));

test('all three Ice games move before confirmation, never reveal or finish a pending outcome, then land the accepted grid',async()=>{
 const Before=await Motion(original),After=await Motion(patchPendingIceMotion(original));
 for(const id of ['burningice_native','burningice10_native','burningice40_native']){
  const rows=id==='burningice40_native'?4:3;
  const prior=new Before({id,symbols:['0','1','2']});prior.begin(0);
  assert.deepEqual(prior.sample(500).reels.map(r=>r.offset),prior.sample(2500).reels.map(r=>r.offset));
  const events=[],motion=new After({id,symbols:['0','1','2'],onEvent:e=>events.push(e)});motion.begin(0);
  const positions=[];
  for(let time=100;time<=10000;time+=100){const s=motion.sample(time);positions.push(JSON.stringify(s.reels.map(r=>[r.offset,r.entries])));assert.equal(s.pending,true);assert.equal(s.complete,false);assert.equal(s.grid,null);}
  assert.ok(new Set(positions).size>20,id);assert.ok(!events.some(e=>['reel-stop','animation-complete'].includes(e.type)),id);
  assert.equal(motion.accept(grid(rows),10000,{roundId:'confirmed-round',feature:{},finalFrame:true}),true);
  let result;
  for(let time=10001;time<16000;time+=17){result=motion.sample(time);if(result.complete)break;}
  assert.equal(result.complete,true,id);assert.deepEqual(result.grid,grid(rows));assert.equal(events.filter(e=>e.type==='animation-complete').length,1,id);
 }
});

test('speed-up never confirms a missing receipt and frozen columns remain fixed',async()=>{
 const Class=await Motion(patchPendingIceMotion(original)),motion=new Class({id:'burningice10_native',symbols:['0','1','2']});
 motion.begin(0,{previousGrid:grid(3),frozenReels:[1]});motion.speedUp(100);
 for(const t of [300,1000,5000]){const s=motion.sample(t);assert.equal(s.complete,false);assert.equal(s.reels[1].frozen,true);assert.equal(s.reels[1].offset,0);}
 motion.accept(grid(3),5000,{roundId:'only-receipt',feature:{frozenReels:[1]},finalFrame:false});
 let result;for(let t=5001;t<10000;t+=17){result=motion.sample(t);if(result.complete)break;}assert.equal(result.complete,true);
});
