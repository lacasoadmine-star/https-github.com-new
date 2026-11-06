import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {SoundEngine} from '../public/audio.mjs';
import * as foxy from '../public/official-foxy-effects-audio.mjs';
import * as multi from '../public/official-mh5-effects-audio.mjs';
import {backgroundTrack as foxyBackground} from '../public/official-foxy-background.mjs';
import {backgroundTrack as multiBackground} from '../public/official-mh5-background.mjs';
const param=()=>({value:0,setValueAtTime(value){this.value=value;},setTargetAtTime(value){this.value=value;},linearRampToValueAtTime(value){this.value=value;},exponentialRampToValueAtTime(value){this.value=value;}});
class Node{constructor(){this.gain=param();this.frequency=param();this.threshold=param();this.ratio=param();}connect(next){return next;}disconnect(){this.disconnected=true;}start(time,offset){this.offset=offset;this.startedAt=time;}stop(){this.onended?.();}}
const fakeBuffer=duration=>({duration,length:Math.round(duration*1000),sampleRate:1000,numberOfChannels:2,getChannelData(){return new Float32Array(this.length);}});
class Context{constructor(){this.state='running';this.currentTime=0;this.destination=new Node();this.createdBuffers=0;this.oscillatorCount=0;this.decoded=[];this.sampleRate=1000;}createGain(){return new Node();}createBufferSource(){return new Node();}createOscillator(){this.oscillatorCount++;return new Node();}createBiquadFilter(){return new Node();}createDynamicsCompressor(){return new Node();}createBuffer(_channels,length,rate){this.createdBuffers++;return fakeBuffer(length/rate);}async decodeAudioData(bytes){const info=[foxyBackground,multiBackground].find(track=>track.sourceBytes===bytes.byteLength);const result=fakeBuffer(info?.sourceDurationSeconds||3);this.decoded.push(result);return result;}async close(){this.state='closed';}}
async function engine(game,fn){const previous=globalThis.AudioContext;globalThis.AudioContext=Context;const a=new SoundEngine(261.63,game);try{await a.unlock();await a.preload();await fn(a);}finally{await a.dispose();globalThis.AudioContext=previous;}}
const reels=a=>[...a.nodes].filter(node=>node.group==='reels');
const effects=a=>[...a.nodes].map(node=>node.sample);
test('original audio bytes match recorded public response hashes and full-length metadata',()=>{
 for(const bank of [foxy,multi])for(const asset of bank.provenance){const bytes=Buffer.from(bank.audioSamples[asset.event],'base64');assert.equal(bytes.length,asset.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);}
 for(const track of [multiBackground,foxyBackground]){const bytes=Buffer.from(track.encoded,'base64');assert.equal(bytes.length,track.sourceBytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),track.sourceSha256);assert.ok(track.sourceDurationSeconds>80);assert.equal(track.preserveOriginal,true);}
});
test('both complete music buffers preserve original duration and PCM without excerpt processing',async()=>{
 assert.equal(multiBackground.gain,.3);assert.equal(foxyBackground.gain,.6);
 for(const [id,track] of [['multi_hot_5_video',multiBackground],['hot_foxy_20',foxyBackground]])await engine(id,async a=>{assert.equal(a.backgroundBuffer,null);a.setBackgroundEnabled(true);await a.preloadBackground();assert.equal(a.backgroundBuffer,a.context.decoded.at(-1));assert.equal(a.backgroundBuffer.duration,track.sourceDurationSeconds);assert.equal(a.context.createdBuffers,0);assert.equal(a.backgroundGain,track.gain);});
});
test('MH5 uses its native spin and stop clips without adding a moving-reel or wheel sound',()=>engine('multi_hot_5_video',async a=>{
 assert.equal(a.samples.size,7);a.event('start');assert.ok(effects(a).includes('spin'));assert.equal(reels(a).length,0);a.event('move');assert.equal(reels(a).length,0);const before=a.nodes.size;a.event('wheel-stop');a.event('wheel-tick');a.event('multiplier',5);assert.equal(a.nodes.size,before);a.event('reel-stop',2);assert.ok(effects(a).includes('reel-stop'));
}));
test('Foxy one-shot motion ends naturally once and cannot repeat on movement ticks or unmute',()=>engine('hot_foxy_20',async a=>{
 assert.equal(a.samples.size,15);a.event('start');const motion=reels(a)[0];assert.equal(motion.osc.loop,false);assert.equal(motion.baseVolume,.7);motion.osc.onended();assert.equal(reels(a).length,0);a.event('move');a.toggle();a.toggle();assert.equal(reels(a).length,0);a.stop('reels');a.event('start');assert.equal(reels(a).length,1);
}));
test('Foxy interrupted one-shot resumes at its saved position and stays single-instance',()=>engine('hot_foxy_20',async a=>{
 a.event('start');a.context.currentTime=1.2;a.toggle();assert.equal(reels(a).length,0);a.context.currentTime=1.4;a.toggle();assert.equal(reels(a).length,1);assert.ok(Math.abs(reels(a)[0].offset-1.4)<1e-8);a.context.currentTime=1.9;a.setSuspended(true);a.context.currentTime=30;a.setSuspended(false);assert.equal(reels(a).length,1);assert.ok(Math.abs(reels(a)[0].offset-1.9)<1e-8);a.event('move');assert.equal(reels(a).length,1);a.toggle();a.context.currentTime+=10;a.toggle();assert.equal(reels(a).length,0,'a completed muted one-shot must not wrap and restart');
}));
test('Foxy indexes normal stop sounds and plays one fast-stop for STOP or turbo',()=>engine('hot_foxy_20',async a=>{
 a.event('start');for(let i=0;i<5;i++)a.event('reel-stop',i);assert.deepEqual(effects(a).filter(name=>name?.startsWith('reel-stop-')),Array.from({length:5},(_,i)=>'reel-stop-'+i));
 for(const turbo of [false,true]){a.stop();a.setTurbo(turbo);a.event('start');if(!turbo)a.setFastStop();for(let i=0;i<5;i++)a.event('reel-stop',i);assert.equal(effects(a).filter(name=>name==='fast-stop').length,1);assert.equal(effects(a).filter(name=>name?.startsWith('reel-stop-')).length,0);}
}));
test('Foxy only plays the multiplier phrase on a positive win and respects source win tiers',()=>engine('hot_foxy_20',async a=>{
 a.event('wheel-stop');a.win(0,1);assert.equal(a.nodes.size,0);
 for(const [amount,name] of [[15,'win'],[15.01,'win-2'],[30,'win-2'],[30.01,'win-3'],[50.01,'win-4'],[100.01,'win-5']]){a.win(amount,1);assert.deepEqual(effects(a).sort(),['win-multiplier',name].sort());assert.equal([...a.nodes].find(node=>node.sample==='win-multiplier').baseVolume,.5);}
}));
test('MH5 uses native win tiers including the strict 5x and25x boundaries',()=>engine('multi_hot_5_video',async a=>{
 for(const [amount,name] of [[5,'win'],[5.01,'win-medium'],[25,'win-medium'],[25.01,'big-win']]){a.win(amount,1);assert.deepEqual(effects(a),[name]);assert.equal([...a.nodes].find(node=>node.sample===name).baseVolume,.36);}
}));
test('a missing native reel-stop decode stays silent without adding another sound',()=>engine('hot_foxy_20',async a=>{
 a.samples.delete('reel-stop-3');assert.doesNotThrow(()=>a.event('reel-stop',3));assert.equal(a.context.oscillatorCount,0);assert.equal(a.nodes.size,0);
}));
test('partially decoded native bet and win tiers do not substitute another cue',async()=>{
 await engine('multi_hot_5_video',async a=>{a.samples.delete('bet');a.event('bet');assert.equal(a.nodes.size,0,'missing native Bet must not become Tap');a.samples.delete('win-medium');a.win(6,1);assert.equal(a.nodes.size,0,'missing Win2 must not become Win3');assert.equal(a.context.oscillatorCount,0);});
 await engine('hot_foxy_20',async a=>{a.samples.delete('win-2');a.win(16,1);assert.deepEqual(effects(a),['win-multiplier'],'retain only the separate available original multiplier phrase');assert.equal(a.context.oscillatorCount,0);});
});
test('native playback-node failure cannot fall through into generated reel noise',()=>engine('hot_foxy_20',async a=>{
 a.context.createBufferSource=()=>{throw Error('Audio output unavailable');};assert.doesNotThrow(()=>a.event('start'));assert.equal(a.nodes.size,0);assert.equal(a.context.oscillatorCount,0);assert.equal(a.context.createdBuffers,0);assert.equal(a.noise,null);
}));
test('context replacement during native decoding starts a fresh bank load and ignores old completion',async()=>{
 const previous=globalThis.AudioContext,contexts=[];
 class Delayed extends Context{constructor(){super();this.pending=[];contexts.push(this);}decodeAudioData(){return new Promise(resolve=>this.pending.push(resolve));}}
 globalThis.AudioContext=Delayed;const a=new SoundEngine(261.63,'hot_foxy_20');
 const wait=async context=>{for(let i=0;i<1000&&context.pending.length!==15;i++)await new Promise(r=>setTimeout(r,1));assert.equal(context.pending.length,15);};
 try{await a.unlock();await wait(a.context);const first=a.context,oldLoad=a.preload();first.state='closed';await a.unlock();await wait(a.context);const replacement=a.context,newLoad=a.preload();assert.notEqual(oldLoad,newLoad);first.pending.forEach(resolve=>resolve(fakeBuffer(1)));assert.equal(await oldLoad,false);assert.equal(a.samples.size,0);replacement.pending.forEach(resolve=>resolve(fakeBuffer(2)));assert.equal(await newLoad,true);assert.equal(a.samples.size,15);assert.equal(a.samples.get('spin').duration,2);}finally{await a.dispose();globalThis.AudioContext=previous;}
});
