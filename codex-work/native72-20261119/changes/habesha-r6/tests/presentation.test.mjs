import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {habeshaLayout,pendingReelPhase,settledReelPhase,reelPhaseAt,habeshaMultiplierGeometry,INITIAL_MULTIPLIER_VALUES,multiplierNeighbors,multiplierTrack} from '../assets/habesha-layout.mjs';
import {HabeshaLifecycle} from '../../habesha-r5/assets/habesha-lifecycle.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const base=resolve(root,'live-frontend/zplay-native-machines-20261119-habesha-r4');
const changed=resolve(root,'changes/habesha-r6/assets');
const inherited=resolve(root,'changes/habesha-r5/assets');
let now=0;
const context=vm.createContext({URL,Map,Set,Math,Number,Promise,console,performance:{now:()=>now},matchMedia:()=>({matches:false}),requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}});
const modules=new Map();
const stubs={
 'registry.mjs':{gameConfig(){},gameConfigForReceipt(){},isLegacyModel(){},presentationGameId(){}},
 'native-animation-runtime.mjs':{createNativeAnimation(){}},
 'audio-banks.mjs':{getAudioSamples:()=>({})},
 'audio-samples.mjs':{audioSamples:{}},
 'audio-loop.mjs':{seamlessBuffer:(_context,buffer)=>buffer},
 'native-audio-gains.mjs':{nativeBackgroundGain:(_id,gain)=>gain,nativeEffectGain:(_id,_name,gain)=>gain}
};
async function moduleFor(name){
 if(modules.has(name))return modules.get(name);
 let module;
 if(stubs[name]){const exports=stubs[name];module=new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context,identifier:name});}
 else{let source;try{source=await readFile(resolve(changed,name),'utf8');}catch{try{source=await readFile(resolve(inherited,name),'utf8');}catch{source=await readFile(resolve(base,name),'utf8');}}module=new vm.SourceTextModule(source,{context,identifier:name,initializeImportMeta:meta=>{meta.url='https://fixture.invalid/'+name;}});}
 modules.set(name,module);await module.link(specifier=>moduleFor(specifier.replace('./','')));return module;
}
const rendererModule=await moduleFor('habesha-renderer.mjs');await rendererModule.evaluate();
const audioModule=await moduleFor('habesha-audio.mjs');await audioModule.evaluate();
const {HabeshaRenderer}=rendererModule.namespace,{HabeshaAudio}=audioModule.namespace;
const {ReelMotion,Particles}=modules.get('motion.mjs').namespace;
const {gridFromStops}=modules.get('contract.mjs').namespace;

function makeRenderer(){
 const calls=[],game={id:'habesha_fortune_5_native',rows:3,reels:3,strips:[0,1,2].map(col=>Array.from({length:32},(_,i)=>'symbol_'+((i+col)%9)))};
 const renderer=Object.create(HabeshaRenderer.prototype);
 Object.assign(renderer,{game,machineId:game.id,stops:[0,0,0],grid:gridFromStops(game,[0,0,0]),wheel:5,wheelValues:[...INITIAL_MULTIPLIER_VALUES],wheelTrack:multiplierTrack(INITIAL_MULTIPLIER_VALUES,'initial'),chooseMultiplierIndex:null,landscapeSprites:new Map(),landscapeSymbolMeta:new Map(),pendingSpin:null,result:null,resolve:null,ready:false,running:true,last:now,presentationClock:0,presentedAt:0,stats:{frames:0},motion:new ReelMotion({duration:950,stagger:190,startStagger:0,travel:12,wheelEnd:950},3),particles:new Particles(),audio:{event:(...args)=>calls.push(['event',...args]),stop:(...args)=>calls.push(['stop',...args]),win:(...args)=>calls.push(['win',...args]),setSuspended:(...args)=>calls.push(['suspend',...args])}});
 return {renderer,calls,game};
}

test('landscape uses a wide board composition while portrait stays independent',()=>{
 const wide=habeshaLayout(1363,766),portrait=habeshaLayout(390,836);
 assert.equal(wide.landscape,true);assert.equal(wide.width,1366);assert.equal(wide.height,768);
 assert.equal(portrait.landscape,false);assert.equal(portrait.width,420);
 for(const layout of [wide,portrait])for(const key of ['grid','board','multiplier','logo']){
  const box=layout[key];assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=layout.width&&box.y+box.height<=layout.height,key+' must fit');
 }
});

test('every pending phase lands on the server stop without a discontinuous grid swap',()=>{
 for(const length of [32,58,64])for(const oldStop of [0,length-1])for(const stop of [0,1,length-1])for(const delay of [0,95,1507,22000]){
  const start=pendingReelPhase(oldStop,delay),end=settledReelPhase(start,stop,length);
  assert.ok(end>=start+12);assert.equal(((end%length)+length)%length,((stop-1+length)%length));
  assert.equal(reelPhaseAt(start,end,0,950),start);assert.equal(reelPhaseAt(start,end,1,950),end);
  let previous=start;for(let step=1;step<=100;step++){const phase=reelPhaseAt(start,end,step/100,950);assert.ok(phase>=previous-1e-10);assert.ok(phase<=end+1e-10);previous=phase;}
 }
});

test('the decorative initial cabinet is 3 / 5 / 1 and a receipt always replaces its center',()=>{
 const original={load:HabeshaRenderer.prototype.load,resize:HabeshaRenderer.prototype.resize,resume:HabeshaRenderer.prototype.resume};
 Object.assign(HabeshaRenderer.prototype,{load(){return Promise.resolve();},resize(){},resume(){}});
 try{
  const {game}=makeRenderer(),renderer=new HabeshaRenderer({getContext:()=>({})},game,{});
  assert.equal(renderer.wheel,5);assert.deepEqual(Array.from(renderer.wheelValues),[3,5,1]);
  const result={roundId:'restored-receipt',grid:gridFromStops(game,[1,2,3]),stops:[1,2,3],wheelMultiplier:2};
  renderer.restore(result);assert.equal(renderer.wheel,2);assert.equal(renderer.wheelValues[1],2);assert.equal(renderer.result,result);
 }finally{Object.assign(HabeshaRenderer.prototype,original);}
});

test('cosmetic neighbors never replace the selected multiplier and replay choices stay stable',()=>{
 for(let selected=1;selected<=5;selected++){
  const result=multiplierNeighbors(selected,'round-id',length=>length-1);
  assert.equal(result[1],selected);assert.equal(new Set(result).size,3);
  assert.ok(result.every(value=>value>=1&&value<=5));
  assert.deepEqual(multiplierNeighbors(selected,'round-id'),multiplierNeighbors(selected,'round-id'));
 }
 assert.throws(()=>multiplierNeighbors(0),/INVALID_PRESENTATION_MULTIPLIER/);
 assert.throws(()=>multiplierNeighbors(5,'id',()=>5),/INVALID_COSMETIC_INDEX/);
 assert.notDeepEqual(multiplierNeighbors(5,'id',()=>0),multiplierNeighbors(5,'id',length=>length-1));
});

test('actual multiplier layers retain all receipt centers and cosmetic neighbors across delay, landing and idle',()=>{
 for(const dimensions of [[420,900],[1366,768]])for(let previous=1;previous<=5;previous++)for(let target=1;target<=5;target++)for(const delay of [0,95,1507,22000]){
  now=0;const {renderer,game}=makeRenderer(),draws=[];
  renderer.restore({roundId:'previous-'+previous,stops:[0,0,0],grid:gridFromStops(game,[0,0,0]),wheelMultiplier:previous});
  Object.assign(renderer,{layout:habeshaLayout(...dimensions),canvas:{width:dimensions[0],height:dimensions[1]},background:{width:420,height:900},landscapeBackground:{width:2470,height:1220},landscapeBoard:{},logo:{draw(){}},symbolAnimations:new Map(),spriteBounds:new Map(),atlas:new Map(Array.from({length:9},(_,i)=>['symbol_'+i,{}])),sprites:new Map(),reducedMotion:true});
  for(const name of ['Vertical/Box/Background','Multiplier/Background','Multiplier/BackgroundBorder',...Array.from({length:5},(_,i)=>'Multiplier/'+(i+1)),...Array.from({length:5},(_,i)=>'Multiplier/Active-'+(i+1))])renderer.sprites.set(name,{name});
  renderer.ctx={setTransform(){},save(){},restore(){},beginPath(){},rect(){},clip(){},drawImage(image,x,y,width,height){if(/^Multiplier\/(?:Active-)?[1-5]$/.test(image?.name))draws.push({name:image.name,x,y,width,height});}};
  const snapshot=()=>{draws.length=0;renderer.draw(0);return structuredClone(draws);};
  const geometry=habeshaMultiplierGeometry(renderer.layout),normal=geometry.normal,active=geometry.active;
  const visible=items=>[0,1,2].map(row=>{
   const isActive=row===1,expectedY=normal.y+row*normal.step+(isActive?active.dy:0);
   const candidates=items.filter(item=>item.name.startsWith('Multiplier/Active-')===isActive).sort((a,b)=>Math.abs(a.y-expectedY)-Math.abs(b.y-expectedY));
   assert.ok(candidates[0]);return candidates[0];
  });
  assert.equal(Number(visible(snapshot())[1].name.at(-1)),previous);
  renderer.beginPendingSpin();assert.equal(Number(visible(snapshot())[1].name.at(-1)),previous,'starting a spin must not advance the value');
  renderer.pendingSpin.elapsed=delay;const beforeReceipt=snapshot();
  const result={roundId:'new-'+target,stops:[1,2,3],wheelMultiplier:target,grid:gridFromStops(game,[1,2,3]),winLines:[],finalWin:'0.00',bet:'2.00'};
  void renderer.start(result);assert.deepEqual(snapshot(),beforeReceipt,'receipt handoff must preserve the exact drawn multiplier phase and pictures');
  renderer.motion.elapsed=renderer.motion.profile.wheelEnd-.001;assert.equal(Number(visible(snapshot())[1].name.at(-1)),target,'last moving frame must approach the receipt center');
  renderer.motion.elapsed=renderer.motion.profile.wheelEnd;const landed=visible(snapshot());
  assert.equal(landed[1].name,'Multiplier/Active-'+target);
  assert.deepEqual(landed.map(item=>Number(item.name.at(-1))),Array.from(renderer.nextWheelValues));
  assert.equal(new Set(landed.map(item=>item.name.at(-1))).size,3);
  renderer.motion.elapsed=1330;now=16;renderer.loop(now);const settled=visible(snapshot());
  assert.deepEqual(settled,landed,'ending the whole spin must preserve all three visible pictures and their positions');
  assert.equal(renderer.wheel,target);assert.equal(renderer.result,result);assert.equal(result.wheelMultiplier,target);
 }
});

test('a delayed receipt transfers the pending animation once, then orders stop cues and win',async()=>{
 now=0;const {renderer,calls,game}=makeRenderer();renderer.presentedAt=200;
 const token=renderer.beginPendingSpin();assert.equal(renderer.presentedAt,0);
 for(let i=0;i<95;i++){now+=16;renderer.loop(now);}
 const phaseBefore=pendingReelPhase(0,token.elapsed),result={stops:[3,19,31],wheelMultiplier:4,finalWin:'10.00',bet:'2.00'};result.grid=gridFromStops(game,result.stops);
 const done=renderer.start(result);assert.equal(renderer.reelStarts[0],phaseBefore);assert.equal(renderer.pendingSpin,null);
 assert.equal(calls.filter(v=>v[0]==='event'&&v[1]==='start').length,1);
 assert.equal(calls.filter(v=>v[0]==='stop').length,0,'receipt must not cancel the start clip');
 renderer.cancelPendingSpin(token);assert.equal(calls.filter(v=>v[0]==='stop').length,0,'finally with consumed token must not stop active spin');
 for(let i=0;i<90;i++){now+=16;renderer.loop(now);}
 assert.equal(await done,result);assert.deepEqual(Array.from(renderer.stops),result.stops);assert.equal(renderer.wheel,4);
 assert.deepEqual(calls.filter(v=>v[0]==='event'&&v[1]==='reel-stop').map(v=>v[2]),[0,1,2]);
 const winIndex=calls.findIndex(v=>v[0]==='win'),lastStop=calls.findLastIndex(v=>v[0]==='event'&&v[1]==='reel-stop');assert.ok(winIndex>lastStop);
 assert.deepEqual(calls[winIndex],['win',10,2,4]);
});

test('cancelled pending request stops its own sound, and an old token cannot cancel the next spin',()=>{
 now=0;const {renderer,calls}=makeRenderer(),first=renderer.beginPendingSpin();renderer.cancelPendingSpin(first);
 assert.equal(renderer.pendingSpin,null);assert.deepEqual(calls.at(-1),['stop','reels']);
 const second=renderer.beginPendingSpin();renderer.cancelPendingSpin(first);assert.equal(renderer.pendingSpin,second);
});

test('visibility pause freezes presentation clock and resumes without a long elapsed jump',()=>{
 now=0;const {renderer,calls}=makeRenderer();renderer.beginPendingSpin();now=40;renderer.loop(now);
 const elapsed=renderer.pendingSpin.elapsed,presentation=renderer.presentationClock;renderer.pause();now+=30000;renderer.loop(now);
 assert.equal(renderer.pendingSpin.elapsed,elapsed);assert.equal(renderer.presentationClock,presentation);
 renderer.resume();now+=16;renderer.loop(now);assert.equal(renderer.pendingSpin.elapsed,elapsed+16);assert.equal(renderer.presentationClock,presentation+16);
 assert.deepEqual(calls.filter(v=>v[0]==='suspend'),[['suspend',true],['suspend',false]]);
});

function makeAudio(){
 const starts=[],audio=new HabeshaAudio();
 const gain=()=>({value:1,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){},cancelAndHoldAtTime(){}});
 audio.context={state:'running',currentTime:0,createBufferSource(){return{loop:false,connect(target){return target;},disconnect(){},start(time,offset){starts.push({name:[...audio.samples].find(([,buffer])=>buffer===this.buffer)?.[0],time,offset});},stop(){}};},createGain(){return{gain:gain(),connect(target){return target;},disconnect(){}};}};
 audio.master=audio.context.createGain();audio.unlock=async()=>{};audio.nativeBank={indexedStops:true,oneShotReels:true};
 audio.samples.set('spin',{duration:2});audio.samples.set('win',{duration:3});audio.samples.set('win-multiplier',{duration:4});
 return {audio,starts};
}

test('start sound belongs to reels and can be stopped on a definite request rejection',()=>{
 const {audio,starts}=makeAudio();audio.event('start');assert.equal(starts.length,1);assert.equal([...audio.nodes][0].group,'reels');
 audio.stop('reels');assert.equal(audio.nodes.size,0);assert.equal(audio.reelWanted,false);
});

test('paused win sound resumes at its frozen sample offset and a new spin clears it',()=>{
 const {audio,starts}=makeAudio();audio.win(10,2,4);assert.equal(starts.at(-1).name,'win-multiplier');
 audio.context.currentTime=.75;audio.setSuspended(true);assert.equal(audio.nodes.size,0);assert.equal(audio.pausedSamples[0].offset,.75);
 audio.context.currentTime=30.75;audio.setSuspended(false);assert.equal(starts.at(-1).offset,.75);assert.equal(audio.remainingWinMs(),3250);
 assert.equal([...audio.nodes].length,1);assert.equal([...audio.nodes][0].group,'win');assert.equal([...audio.nodes][0].offset,.75);
 audio.event('start');assert.equal([...audio.nodes].filter(n=>n.group==='win').length,0);assert.equal(audio.pausedSamples.length,0);
});

test('superclass suspension preserves the reel group and a win-only stop leaves that paused clip intact',()=>{
 const {audio,starts}=makeAudio();audio.event('start');audio.context.currentTime=.4;audio.setSuspended(true);
 assert.equal(audio.nodes.size,0);assert.equal(audio.pausedSamples.length,1);assert.equal(audio.pausedSamples[0].group,'reels');
 audio.stop('win');assert.equal(audio.pausedSamples.length,1,'stopping another group must not discard reels');
 audio.context.currentTime=40;audio.setSuspended(false);assert.equal(starts.length,2);assert.equal(starts.at(-1).name,'spin');assert.equal(starts.at(-1).offset,.4);
 assert.equal(audio.nodes.size,1);assert.equal([...audio.nodes][0].group,'reels');assert.equal([...audio.nodes][0].offset,.4);
 audio.stop('reels');assert.equal(audio.nodes.size,0);assert.equal(audio.reelWanted,false);
});

test('cancelling a hidden spin prevents its stale clip from restarting on return',()=>{
 const {audio,starts}=makeAudio();audio.event('start');audio.context.currentTime=.25;audio.setSuspended(true);audio.stop('reels');
 audio.context.currentTime=20;audio.setSuspended(false);assert.equal(starts.length,1);assert.equal(audio.pausedSamples.length,0);assert.equal(audio.nodes.size,0);
});

test('blur owner silences the actual audio class until both focus and visibility return',()=>{
 now=0;const {renderer}=makeRenderer(),{audio,starts}=makeAudio();renderer.audio=audio;
 const lifecycle=new HabeshaLifecycle(renderer);audio.event('start');audio.context.currentTime=.4;lifecycle.blur();
 assert.equal(renderer.running,false);assert.equal(audio.playbackSuspended,true);assert.equal(audio.nodes.size,0);
 lifecycle.visibility(true);audio.context.currentTime=20.4;lifecycle.focus(true);assert.equal(audio.nodes.size,0);assert.equal(starts.length,1);
 lifecycle.visibility(false);assert.equal(renderer.running,true);assert.equal(audio.nodes.size,1);assert.equal(starts.length,2);assert.equal(starts.at(-1).offset,.4);
 assert.equal([...audio.nodes][0].group,'reels');
});

test('focus while muted stays silent and unmute restores only the current spin portion',()=>{
 now=0;const {renderer}=makeRenderer(),{audio,starts}=makeAudio();renderer.audio=audio;
 const lifecycle=new HabeshaLifecycle(renderer);audio.event('start');audio.context.currentTime=.4;lifecycle.blur();audio.toggle();
 audio.context.currentTime=20.4;lifecycle.focus(false);assert.equal(audio.muted,true);assert.equal(audio.nodes.size,0);assert.equal(starts.length,1);
 audio.context.currentTime=20.9;audio.toggle();assert.equal(audio.nodes.size,1);assert.equal(starts.length,2);assert.ok(Math.abs(starts.at(-1).offset-.9)<1e-10);
 assert.equal([...audio.nodes][0].group,'reels');
});

test('unmute cannot replay an ended or cancelled spin clip',()=>{
 for(const cancelled of [false,true]){
  const {audio,starts}=makeAudio();audio.event('start');audio.context.currentTime=.4;audio.toggle();
  if(cancelled)audio.stop('reels');audio.context.currentTime=5;audio.toggle();
  assert.equal(audio.nodes.size,0);assert.equal(starts.length,1);
 }
});
