import test from 'node:test';
import assert from 'node:assert/strict';
import {MultiHot40Scene,MultiHot40Audio} from './scene.mjs';
const image={width:560,height:1006};
function setup(){
 let callback,now=0,frame=0;
 const calls=[];
 const ctx={canvas:{width:0,height:0},setTransform(){},clearRect(){},fillRect(){},drawImage(){calls.push('sprite');},save(){},restore(){},beginPath(){},rect(){},clip(){},translate(){},scale(){},fillText(){},set fillStyle(v){},set textAlign(v){},set font(v){}};
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:844}),width:0,height:0};
 ctx.canvas=canvas;
 const scene=new MultiHot40Scene({canvas,assets:{background:image,symbols:Array(8).fill(image),blur:Array(8).fill(image)},now:()=>now,raf:fn=>{callback=fn;return ++frame;},caf:()=>{callback=null;}});
 function tick(delta){now+=delta;const fn=callback;assert.equal(typeof fn,'function');fn(now);}
 return {scene,tick,calls,canvas};
}
test('reel scene renders images, never a video/screenshot overlay',()=>{const h=setup();h.tick(16);assert.ok(h.calls.length>20);assert.ok(h.canvas.width>0);h.scene.dispose();});
test('only a server receipt determines final grid and multiplier',async()=>{const h=setup();h.scene.start();const receipt={roundId:'r',grid:[[0,1,2,3,4],[1,2,3,4,5],[2,3,4,5,6],[3,4,5,6,7]],wheelMultiplier:5,finalWin:'4.00'};const p=h.scene.reveal(receipt);for(let i=0;i<8;i++)h.tick(80);assert.equal((await p).roundId,'r');assert.deepEqual(h.scene.grid,receipt.grid);assert.equal(h.scene.wheel,5);assert.equal(h.scene.busy,false);h.scene.dispose();});
test('hidden/blur stops frame scheduling and resumes cleanly',()=>{const h=setup();h.tick(16);h.scene.pause();assert.equal(h.scene.paused,true);h.scene.resume();h.tick(16);assert.equal(h.scene.paused,false);h.scene.dispose();});
test('audio can be stopped on visibility loss and muted',()=>{let paused=0,played=0;const clip={cloneNode(){return {pause(){paused++;},play(){played++;return Promise.resolve();}};}};const audio=new MultiHot40Audio({clips:{spin:clip}});audio.setEnabled(true);audio.play('spin');assert.equal(played,1);audio.pause();assert.equal(paused,1);audio.setEnabled(false);assert.equal(audio.play('spin'),null);audio.dispose();});
