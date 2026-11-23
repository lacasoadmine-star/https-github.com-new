import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const ctx=new Proxy({}, {get:(t,p)=>t[p]??(()=>{}),set:(t,p,v)=>(t[p]=v,true)});
const canvas=()=>({dataset:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:350,height:210})});
globalThis.document={body:{dataset:{}},createElement:canvas};globalThis.devicePixelRatio=3;globalThis.matchMedia=()=>({matches:false});
globalThis.Image=class{naturalWidth=1024;naturalHeight=1024;decode(){return Promise.resolve()}set src(v){queueMicrotask(()=>this.onload?.())}};
const {ReelRenderer}=await import('../slots/js/reels-v2300.js');
const models=JSON.parse(fs.readFileSync(new URL('../slots/catalog.json',import.meta.url))).games;
test('500 renderer rounds preserve server grids and emit exactly one stop per reel',async()=>{
 for(const model of models){const stops=[];const r=new ReelRenderer(canvas(),{...model,reelStrips:model.previewReels},col=>stops.push(col));await r.ready;
  for(let i=0;i<100;i++){
   stops.length=0;r.begin();if(i%2===0)r.requestStop();
   const grid=Array.from({length:model.rows},(_,row)=>model.previewReels.map(strip=>strip[(row+i)%strip.length]));
   const done=r.finish({grid,winLines:[]});if(i%2)r.requestStop();
   r.render(performance.now()+10000);await done;
   assert.deepEqual(r.grid,grid);assert.deepEqual(stops,[...Array(model.reels).keys()]);assert.equal(r.spinning,false);
   r.render(performance.now()+20000);assert.equal(stops.length,model.reels);
  }
  r.dispose();
 }
});
test('invalid server symbols cannot become a landing target',async()=>{
 const m=models[1],r=new ReelRenderer(canvas(),{...m,reelStrips:m.previewReels});await r.ready;r.begin();
 await assert.rejects(r.finish({grid:[['fake']],winLines:[]}),/BAD_REEL_RESULT/);assert.equal(r.target,null);r.cancel();r.dispose();
});
