import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {core} from './fixtures.mjs';
import {DELUXE_LAYOUTS,deluxeLayoutForViewport,coverSource,multiplierAtPhase} from '../changes/dedicated-resume/games/deluxe/deluxe-layout.mjs';

// Exercise the actual renderer and shared motion/contract modules. Only the
// browser asset loader is replaced: these tests never fetch or spin remotely.
const sharedPrefix='/zplay-native-shared-20261119-r1/';
const hooks=registerHooks({resolve(specifier,context,next){
 if(specifier===sharedPrefix+'native-animation-runtime.mjs')return {url:'data:text/javascript,export function createNativeAnimation(){throw Error("Asset loading is disabled in this test")}',shortCircuit:true};
 if(specifier.startsWith(sharedPrefix))return next(new URL('../changes/dedicated-resume/shared/'+specifier.slice(sharedPrefix.length),import.meta.url).href,context);
 return next(specifier,context);
}});
const {MultiHot5DeluxeRenderer}=await import('../changes/dedicated-resume/games/deluxe/mh5deluxe-renderer.mjs');
hooks.deregister();
const model=core.getGame('multi_hot_5_deluxe_native');

function fixture(t,{width=1366,height=768,reducedMotion=false}={}){
 let now=1000,nextFrame=0;
 const frames=new Map(),draws=[],audio=[],logoTimes=[],previousGlobals=[];
 const globals={performance:{now:()=>now},devicePixelRatio:1,matchMedia:()=>({matches:reducedMotion}),requestAnimationFrame:callback=>{frames.set(++nextFrame,callback);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id)};
 for(const [key,value] of Object.entries(globals)){
  const previous=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  previousGlobals.push([key,previous]);
 }
 const context={setTransform(){},fillRect(){},save(){},restore(){},beginPath(){},rect(){},clip(){},moveTo(){},lineTo(){},stroke(){},drawImage(...args){draws.push(args);}};
 const canvas={width,height,dataset:{},getBoundingClientRect:()=>({width,height}),getContext:()=>context};
 class TestRenderer extends MultiHot5DeluxeRenderer {
  async load(){
   this.background={name:'background',width:836,height:1750};
   this.logo={draw:(_,options)=>logoTimes.push(options.timeSeconds),destroy(){}};
   const names=['Vertical/Box/Background','Multiplier/Background','Multiplier/BackgroundBorder',...Array.from({length:5},(_,i)=>'Multiplier/'+(i+1)),...Array.from({length:5},(_,i)=>'Multiplier/Active-'+(i+1)),...Array.from({length:9},(_,i)=>'Box/'+i),...Array.from({length:9},(_,i)=>'Box/Blur/'+i)];
   for(const name of names){this.sprites.set(name,{name,width:100,height:100});this.spriteBounds.set(name,{x:0,y:0,w:100,h:100});}
   for(let i=0;i<9;i++)this.atlas.set('symbol_'+i,this.sprites.get('Box/'+i));
   this.ready=true;
  }
 }
 const renderer=new TestRenderer(canvas,model,{event:(...args)=>audio.push(args),stop:name=>audio.push(['stop',name]),win:(...args)=>audio.push(['win',...args]),setSuspended:value=>audio.push(['suspended',value]),setFastStop(){},setTurbo(){}});
 t.after(()=>{renderer.dispose();for(const [key,previous]of previousGlobals)previous?Object.defineProperty(globalThis,key,previous):delete globalThis[key];});
 return {renderer,draws,audio,logoTimes,frames,step(ms=16){now+=ms;const pending=[...frames];frames.clear();for(const [,callback]of pending)callback(now);},elapse(ms){now+=ms;},resize(w,h){width=w;height=h;renderer.resize();}};
}

function receipt(wheel=5){
 const draws=[3,6,8,model.wheel.weights.slice(0,wheel-1).reduce((sum,value)=>sum+value,0)];
 return core.spin(model.id,model.betLevels[0],{draw:()=>draws.shift()});
}

test('landscape uses the observed cabinet coordinates and vertical artwork is cropped uniformly',()=>{
 const layout=deluxeLayoutForViewport(1363,1363*768/1366);
 assert.equal(layout,DELUXE_LAYOUTS.landscape);
 assert.deepEqual(layout.reels,{x:480,y:113,width:420,height:430});
 assert.deepEqual(layout.multiplier,{x:354,y:142,width:120,height:379});
 assert.equal(deluxeLayoutForViewport(420,900),DELUXE_LAYOUTS.portrait);
 const source=coverSource(836,1750,1366,768);
 assert.ok(source.y>0);assert.equal(source.width,836);
 assert.ok(Math.abs(source.width/source.height-1366/768)<1e-12);
 assert.ok(source.y+source.height<=1750);
});

test('pause freezes pending movement, the multiplier, and the active presentation clock',t=>{
 const {renderer,step,elapse,frames,logoTimes,audio}=fixture(t);
 renderer.beginPendingSpin();step(64);
 const before={clock:renderer.presentationClock,pending:renderer.pendingSpin.elapsed,phase:renderer.multiplierPhase(),logo:logoTimes.at(-1)};
 renderer.pause();elapse(30000);renderer.loop(performance.now());
 assert.equal(frames.size,0);
 assert.equal(renderer.presentationClock,before.clock);
 assert.equal(renderer.pendingSpin.elapsed,before.pending);
 assert.equal(renderer.multiplierPhase(),before.phase);
 assert.equal(logoTimes.at(-1),before.logo);
 renderer.resume();step(16);
 assert.equal(renderer.presentationClock,before.clock+16);
 assert.equal(renderer.pendingSpin.elapsed,before.pending+16);
 assert.notEqual(renderer.multiplierPhase(),before.phase);
 assert.deepEqual(audio.filter(event=>event[0]==='suspended'),[['suspended',false],['suspended',true],['suspended',false]]);
});

test('settled receipt keeps exact stops and multiplier after a paused spin and fast stop',async t=>{
 const {renderer,step,elapse,audio}=fixture(t);
 renderer.beginPendingSpin();step(70);
 const pendingPhase=renderer.multiplierPhase(),result=receipt(5),original=structuredClone(result);
 const presentation=renderer.start(result);
 assert.equal(renderer.multiplierPhase(),pendingPhase);
 step(70);
 assert.notEqual(renderer.multiplierPhase(),pendingPhase);
 const elapsed=renderer.motion.elapsed,phase=renderer.multiplierPhase(),clock=renderer.presentationClock;
 renderer.pause();elapse(60000);renderer.loop(performance.now());
 assert.equal(renderer.motion.elapsed,elapsed);assert.equal(renderer.multiplierPhase(),phase);
 renderer.resume();step(16);
 assert.equal(renderer.motion.elapsed,elapsed+16);assert.equal(renderer.presentationClock,clock+16);
 renderer.speedUp();
 for(let frame=0;renderer.motion.active&&frame<40;frame++)step(16);
 assert.equal(renderer.motion.active,false);
 assert.equal(await presentation,result);
 assert.deepEqual(renderer.motion.targets,original.stops);
 assert.deepEqual(renderer.grid,original.grid);
 assert.equal(renderer.wheel,5);assert.equal(multiplierAtPhase(renderer.multiplierPhase()),5);
 assert.equal(renderer.stats.displayedMultiplier,5);
 assert.deepEqual(result,original,'presentation must not modify the receipt');
 assert.deepEqual(audio.filter(event=>event[0]==='reel-stop'),[['reel-stop',0],['reel-stop',1],['reel-stop',2]]);
 assert.equal(audio.filter(event=>event[0]==='win').length,1);
 const winAt=renderer.presentedAt,logoTime=renderer.presentationClock;
 renderer.pause();elapse(40000);renderer.resume();step(16);
 assert.equal(renderer.presentedAt,winAt);assert.equal(renderer.presentationClock,logoTime+16);
 renderer.skipNativeWin();assert.equal(renderer.presentedAt,0);
 assert.ok(audio.some(event=>event[0]==='stop'&&event[1]==='win'));
});

test('all authoritative multiplier values stop exactly in reduced motion and after resizing',async t=>{
 const {renderer,step,resize}=fixture(t,{width:420,height:900,reducedMotion:true});
 assert.equal(renderer.layout.name,'portrait');
 resize(1366,768);assert.equal(renderer.layout.name,'landscape');
 for(let wheel=1;wheel<=5;wheel++){
  const result=receipt(wheel),completion=renderer.start(result);
  renderer.speedUp();for(let frame=0;renderer.motion.active&&frame<40;frame++)step(16);
  await completion;
  assert.equal(renderer.wheel,wheel);assert.equal(renderer.stats.displayedMultiplier,wheel);
  assert.deepEqual(renderer.grid,result.grid);
 }
});
