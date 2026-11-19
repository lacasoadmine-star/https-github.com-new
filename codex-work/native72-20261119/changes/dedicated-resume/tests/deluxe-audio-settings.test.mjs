// Retained behavioral suite redirected to the isolated Deluxe release.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createOfficialAudioControls} from '../games/deluxe/deluxe-audio-controls.mjs';
import {MachineLifecycle} from '../shared/lifecycle.mjs';

const context=vm.createContext({URL,performance:{now:()=>0}}),modules=new Map();
const imports={
 'audio-banks.mjs':{getAudioSamples:()=>({})},'audio-samples.mjs':{audioSamples:{}},
 'audio-loop.mjs':{seamlessBuffer:(_,buffer)=>buffer},
 'native-audio-gains.mjs':{nativeBackgroundGain:(_,gain)=>gain,nativeEffectGain:(_game,_name,gain)=>gain}
};
async function load(name){
 if(modules.has(name))return modules.get(name);
 const values=imports[name];let module;
 if(values)module=new vm.SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value);},{context});
 else{const url=name==='native-audio.mjs'?new URL('../shared/native-audio.mjs',import.meta.url):new URL('../games/deluxe/'+name,import.meta.url);module=new vm.SourceTextModule(await readFile(url,'utf8'),{context,initializeImportMeta(meta){meta.url=url.href;}});}
 modules.set(name,module);await module.link(specifier=>load(specifier.split('/').at(-1)));return module;
}
const module=await load('mh5deluxe-audio.mjs');await module.evaluate();const {MultiHot5DeluxeAudio}=module.namespace;
const choiceKey='zplay:sound-choice',musicKey='zplay:mh5deluxe-background-music:v1',volumeKey='zplay:mh5deluxe-volume:v1',otherMusicKey='zplay:native-background-music:v1';
const memory=(entries={})=>{const data=new Map(Object.entries(entries));return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value))};};
function fixture(storage=memory({[choiceKey]:'yes'})){
 const starts=[],audio=new MultiHot5DeluxeAudio();
 const audioContext={state:'running',currentTime:0,createBufferSource(){return{loop:false,connect(node){return node;},disconnect(){},start(time,offset){starts.push({sample:this.buffer.name,time,offset});},stop(){this.onended?.();}};},createGain(){return{connect(node){return node;},disconnect(){},gain:{value:1,setValueAtTime(value){this.value=value;},setTargetAtTime(value){this.value=value;},linearRampToValueAtTime(value){this.value=value;},cancelScheduledValues(){},cancelAndHoldAtTime(){}}};}};
 audio.context=audioContext;audio.master=audioContext.createGain();audio.nativeBank={indexedStops:true,oneShotReels:true};
 for(const [name,duration]of [['spin',4],['win',6],['win-multiplier',7],['tap',.2]])audio.samples.set(name,{name,duration});
 audio.backgroundBuffer={name:'deluxe-background',duration:200};audio.backgroundGain=.2;
 audio.unlock=async()=>{audio.reelLoop();audio.backgroundLoop();};
 const controls=createOfficialAudioControls({gameId:'multi_hot_5_deluxe_native',audio,storage});
 return {audio,context:audioContext,starts,storage,controls};
}
const group=(audio,name)=>[...audio.nodes].filter(node=>node.group===name);

test('Deluxe keeps its own music preference and default gains instead of another game settings',()=>{
 const {audio,controls,storage}=fixture(memory({[choiceKey]:'yes',[otherMusicKey]:'no'}));
 assert.deepEqual(controls.getState(),{effectsEnabled:true,musicEnabled:true,volume:1});
 assert.equal(audio.volume,1);assert.equal(group(audio,'background')[0].baseVolume,.2);assert.equal(storage.getItem(otherMusicKey),'no');
 assert.equal(audio.nativeAudio,true);assert.deepEqual(Object.keys(audio.audioSamples),[]);
});

test('Music OFF stops only background while effects and the current spin continue',async()=>{
 const f=fixture();f.audio.event('start');const reel=group(f.audio,'reels')[0];f.context.currentTime=.25;
 await f.controls.setMusic(false);assert.equal(group(f.audio,'background').length,0);assert.equal(group(f.audio,'reels')[0],reel);assert.equal(f.audio.muted,false);
 assert.deepEqual(f.controls.getState(),{effectsEnabled:true,musicEnabled:false,volume:1});
 await f.controls.setMusic(true);assert.equal(group(f.audio,'background').length,1);assert.equal(group(f.audio,'reels')[0],reel);assert.equal(f.storage.getItem(musicKey),'yes');
});

test('Effects OFF clears music and Effects ON restores both without replaying the spin from zero',async()=>{
 const f=fixture();f.audio.event('start');f.context.currentTime=.4;await f.controls.setEffects(false);
 assert.equal(f.audio.nodes.size,0);assert.deepEqual(f.controls.getState(),{effectsEnabled:false,musicEnabled:false,volume:1});
 assert.equal(f.storage.getItem(choiceKey),'no');assert.equal(f.storage.getItem(musicKey),'no');
 f.context.currentTime=.9;await f.controls.setEffects(true);
 assert.deepEqual(f.controls.getState(),{effectsEnabled:true,musicEnabled:true,volume:1});assert.equal(group(f.audio,'reels').length,1);assert.equal(group(f.audio,'background').length,1);
 assert.ok(Math.abs(group(f.audio,'reels')[0].offset-.9)<1e-10);assert.equal(f.audio.events.filter(event=>event.name==='start').length,1);
});

test('Music ON never unmutes an Effects-OFF master',async()=>{
 const f=fixture();await f.controls.setEffects(false);await f.controls.setMusic(true);
 assert.equal(f.controls.getState().effectsEnabled,false);assert.equal(f.audio.muted,true);assert.equal(f.audio.nodes.size,0);assert.equal(f.storage.getItem(choiceKey),'no');
});

test('setting changes while blurred or hidden cannot bypass the lifecycle mute gate',async()=>{
 const f=fixture(),renderer={pause:()=>f.audio.setSuspended(true),resume:()=>f.audio.setSuspended(false)},lifecycle=new MachineLifecycle(renderer);
 f.audio.event('start');f.context.currentTime=.5;lifecycle.blur();lifecycle.visibility(true);
 await f.controls.setEffects(false);await f.controls.setEffects(true);await f.controls.setMusic(false);await f.controls.setMusic(true);
 assert.equal(f.audio.nodes.size,0);assert.equal(f.audio.playbackSuspended,true);
 f.context.currentTime=30.5;lifecycle.focus(true);assert.equal(f.audio.nodes.size,0);
 lifecycle.visibility(false);assert.equal(group(f.audio,'background').length,1);assert.equal(group(f.audio,'reels').length,1);assert.equal(group(f.audio,'reels')[0].offset,.5);
});

test('music and volume persist for Deluxe without changing another game music setting',async()=>{
 const storage=memory({[choiceKey]:'yes',[otherMusicKey]:'yes'}),first=fixture(storage);
 first.controls.setVolume(.35);await first.controls.setMusic(false);first.controls.dispose();
 const restored=fixture(storage);assert.deepEqual(restored.controls.getState(),{effectsEnabled:true,musicEnabled:false,volume:.35});
 assert.equal(restored.audio.volume,.35);assert.equal(group(restored.audio,'background').length,0);assert.equal(storage.getItem(otherMusicKey),'yes');
});

test('invalid saved volume and unavailable storage cannot break the controls',async()=>{
 const invalid=fixture(memory({[choiceKey]:'yes',[volumeKey]:'NaN'}));assert.equal(invalid.audio.volume,1);invalid.controls.setVolume(Number.NaN);assert.equal(invalid.audio.volume,1);
 const blocked=fixture({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
 await blocked.controls.setEffects(true);await blocked.controls.setMusic(false);blocked.controls.setVolume(.6);
 assert.deepEqual(blocked.controls.getState(),{effectsEnabled:true,musicEnabled:false,volume:.6});
});


test('cancelled spin stops the Deluxe one-shot and discards its paused continuation',()=>{
 const f=fixture();f.audio.event('start');assert.equal(group(f.audio,'reels').length,1);f.context.currentTime=.5;f.audio.setSuspended(true);assert.equal(f.audio.nodes.size,0);f.audio.stop('reels');f.context.currentTime=30;f.audio.setSuspended(false);assert.equal(group(f.audio,'reels').length,0);
});
test('Deluxe win resumes the remaining clip without duplicating a win cue',()=>{
 const f=fixture();f.audio.win(5);assert.equal(group(f.audio,'win')[0].sample,'win');f.context.currentTime=2;assert.equal(f.audio.remainingWinMs(),4000);f.audio.setSuspended(true);f.context.currentTime=40;f.audio.setSuspended(false);assert.equal(group(f.audio,'win').length,1);assert.equal(group(f.audio,'win')[0].offset,2);assert.equal(f.audio.remainingWinMs(),4000);
});
