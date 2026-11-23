import test from 'node:test';
import assert from 'node:assert/strict';
import {WheelAnimator} from '../slots/js/wheel-motion.mjs';
let queued=new Map(),next=0;
globalThis.requestAnimationFrame=f=>{queued.set(++next,f);return next;};
globalThis.cancelAnimationFrame=id=>queued.delete(id);
globalThis.matchMedia=()=>({matches:false});
function fixture(values){
 const cells=values.map((n,i)=>({dataset:{multiplier:String(n),center:String(i===0)},style:{setProperty(k,v){this[k]=v;}},classList:{remove(){},toggle(k,v){this[k]=v;}}}));
 return {dataset:{},querySelectorAll:()=>cells,setAttribute(k,v){this[k]=v;},cells};
}
test('wheel lands on every authoritative multiplier and STOP preserves the target',async()=>{
 for(const values of [[1,2,3,4,5],[2,3,5]])for(const value of values)for(const early of [true,false]){
  const el=fixture(values),wheel=new WheelAnimator(el);wheel.begin();
  if(early)wheel.requestStop();
  const done=wheel.finish(value,820),end=wheel.plan.to;
  if(!early){const before=wheel.motion(performance.now()).position;wheel.requestStop();assert.ok(wheel.plan.from>=before);assert.equal(wheel.plan.to,end);}
  wheel.render(wheel.plan.start+wheel.plan.duration);await done;
  assert.equal(el.cells.find(c=>c.classList.active).dataset.multiplier,String(value));
  assert.equal(el.dataset.animating,'false');assert.equal(wheel.running,false);wheel.cancel();
 }
});
test('wheel cleanup cancels animation and cannot leave settlement waiting',async()=>{
 const wheel=new WheelAnimator(fixture([1,2,3,4,5]));wheel.begin();const id=wheel.frame;
 const done=wheel.finish(3);wheel.cancel();await done;assert.equal(queued.has(id),false);assert.equal(wheel.running,false);
 wheel.begin();assert.throws(()=>wheel.finish(99),/INVALID_WHEEL_RESULT/);wheel.cancel();
});
