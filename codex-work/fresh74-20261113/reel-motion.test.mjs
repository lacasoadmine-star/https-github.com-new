import test from 'node:test';
import assert from 'node:assert/strict';
import {ReelMotion} from './reel-motion.mjs';
import {createReelPainter, validateAtlas} from './canvas-reels.mjs';

function fixture() {
  let clock = 0, serial = 0; const callbacks = new Map(), frames = [];
  const motion = new ReelMotion({columns: 2, rows: 2, strips: [['a','b','c'],['a','b','c']],
    timing: {durationMs: 1000, staggerMs: 200, stopMs: 120, turns: 3},
    now: () => clock, requestFrame: fn => {callbacks.set(++serial, fn); return serial;},
    cancelFrame: id => callbacks.delete(id), render: frame => frames.push(frame)});
  return {motion, frames, callbacks, step(ms) {clock = ms; const batch = [...callbacks.values()]; callbacks.clear(); batch.forEach(fn => fn(clock));}};
}
const result = [['a','b'],['c','a']];
test('the presentation finishes on exactly the supplied server grid', async () => {
  const f = fixture(), run = f.motion.play(result);
  f.step(1000); assert.equal(f.frames.at(-1).reels[0].settled, true); assert.equal(f.frames.at(-1).reels[1].settled, false);
  f.step(1200); assert.deepEqual((await run.finished).result, result); assert.equal(f.callbacks.size, 0);
});
test('STOP accelerates remaining animation without changing result or starting another round', async () => {
  const f = fixture(), run = f.motion.play(result); f.step(300);
  const offset = f.frames.at(-1).reels[0].offset;
  assert.equal(run.stop(), true); assert.equal(run.stop(), false);
  f.step(300); assert.equal(f.frames.at(-1).reels[0].offset, offset);
  f.step(420); assert.deepEqual((await run.finished).result, result);
});
test('a second play cannot replace an active result', async () => {
  const f = fixture(), run = f.motion.play(result);
  assert.throws(() => f.motion.play(result), /already running/);
  f.motion.cancel(); assert.equal((await run.finished).cancelled, true); assert.equal(f.callbacks.size, 0);
});
test('result is copied, and malformed or unknown symbols fail before animation', () => {
  const f = fixture(); assert.throws(() => f.motion.play([['a']]), /Grid/);
  assert.throws(() => f.motion.play([['a','b'],['unknown','a']]), /Unverified/);
  const grid = structuredClone(result); f.motion.play(grid); grid[0][0] = 'changed'; f.step(1200);
  assert.deepEqual(f.frames.at(-1).result, result);
});
test('dispose cancels pending frames and prohibits new presentations', async () => {
  const f = fixture(), run = f.motion.play(result); f.motion.dispose();
  assert.equal((await run.finished).cancelled, true); assert.equal(f.callbacks.size, 0);
  assert.throws(() => f.motion.play(result), /disposed/);
});
test('new rounds start from the last supplied grid and accelerate without a first-frame jump',async()=>{
  const f=fixture(),initial=[['c','b'],['b','a']];f.motion.seed(initial);
  const run=f.motion.play(result);f.step(0);assert.deepEqual(f.frames[0].reels.map(r=>r.initial),initial);
  assert.equal(f.frames[0].reels[0].offset,0);f.step(100);const a=f.frames.at(-1).reels[0].offset;
  f.step(200);const b=f.frames.at(-1).reels[0].offset;assert.ok(b-a>a);
  assert.throws(()=>f.motion.seed(initial),/cannot change/);f.step(1200);await run.finished;
  f.motion.play(initial);f.step(1200);assert.deepEqual(f.frames.at(-1).reels.map(r=>r.initial),result);f.motion.cancel();
});
test('canvas uses the previous visible symbols at the first frame of a new spin',()=>{
  const calls=[];const context=Object.fromEntries(['setTransform','clearRect','save','beginPath','rect','clip','restore','drawImage'].map(k=>[k,(...args)=>calls.push([k,...args])]));
  const image={width:30,height:10},canvas={style:{},getContext:()=>context};
  const atlas=Object.fromEntries(['a','b','c'].map((s,i)=>[s,{image,x:i*10,y:0,width:10,height:10}]));
  const painter=createReelPainter({canvas,columns:1,rows:2,atlas});painter.resize(100,200,1);
  painter.render({reels:[{column:0,strip:['a','a','a'],initial:['c','b'],result:['a','a'],offset:0,travel:11,settled:false}]});
  const draws=calls.filter(c=>c[0]==='drawImage');assert.deepEqual(draws.slice(1,3).map(c=>c[2]),[20,10]);
});
test('atlas rejects unloaded and out-of-bounds assets', () => {
  assert.throws(() => validateAtlas({a:{image:{width:10,height:10},x:9,y:0,width:2,height:3}}), /Invalid/);
  assert.throws(() => validateAtlas({a:{image:{width:0,height:0},x:0,y:0,width:2,height:3}}), /Invalid/);
});
test('canvas uses capped DPR, per-reel masks and exact result sprites', () => {
  const calls = [];
  const ctx = Object.fromEntries(['setTransform','clearRect','save','beginPath','rect','clip','restore','drawImage'].map(key=>[key,(...args)=>calls.push([key,...args])]));
  const canvas={style:{},getContext:()=>ctx}, image={width:30,height:10};
  const atlas=Object.fromEntries(['a','b','c'].map((s,i)=>[s,{image,x:i*10,y:0,width:10,height:10}]));
  const painter=createReelPainter({canvas,columns:2,rows:2,atlas}); painter.resize(390,400,4);
  assert.equal(canvas.width,780); assert.equal(canvas.height,800);
  painter.render({reels:result.map((symbols,column)=>({column,result:symbols,settled:true}))});
  assert.equal(calls.filter(c=>c[0]==='clip').length,2);
  assert.deepEqual(calls.filter(c=>c[0]==='drawImage').map(c=>c[2]),[0,10,20,0]);
});
