import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundEngine} from '../public/audio.mjs';
import {backgroundTrack as multiBackground} from '../public/official-mh5-background.mjs';
import {backgroundTrack as foxyBackground} from '../public/official-foxy-background.mjs';
const isBackground=bytes=>new TextDecoder().decode(bytes.slice(0,4))==='OggS'||[multiBackground.sourceBytes,foxyBackground.sourceBytes].includes(bytes.byteLength);
const param=()=>({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
class Node{constructor(){this.gain=param();this.frequency=param();this.threshold=param();this.ratio=param();}connect(next){return next;}disconnect(){this.disconnected=true;}start(time,offset){this.offset=offset;this.startTime=time;}stop(){this.stopped=true;this.onended?.();}}
const buffer=(seconds=.5)=>{const channels=[new Float32Array(seconds*1000),new Float32Array(seconds*1000)];return {duration:seconds,length:channels[0].length,sampleRate:1000,numberOfChannels:2,getChannelData:i=>channels[i]};};
class Context{constructor(){this.currentTime=0;this.state='suspended';this.destination=new Node();this.backgroundDecodes=0;this.foregroundDecodes=0;}createGain(){return new Node();}createBufferSource(){return new Node();}createOscillator(){return new Node();}createBiquadFilter(){return new Node();}createDynamicsCompressor(){return new Node();}createBuffer(channels,length,rate){const b=buffer(length/rate);return b;}async resume(){this.state='running';}async close(){this.state='closed';}async decodeAudioData(bytes){if(isBackground(bytes)){this.backgroundDecodes++;return buffer(87);}this.foregroundDecodes++;return buffer();}}
const background=a=>[...a.nodes].filter(n=>n.group==='background');
async function withAudio(fn,ContextType=Context,id='multi_hot_100'){const old=globalThis.AudioContext;globalThis.AudioContext=ContextType;const a=new SoundEngine(261.63,id);try{await fn(a);}finally{await a.dispose();globalThis.AudioContext=old;}}
test('background requires explicit consent and starts once while seven foreground clips remain independent',()=>withAudio(async a=>{
 await a.unlock();await a.preload();assert.equal(a.samples.size,7);assert.equal(a.context.backgroundDecodes,0);assert.equal(background(a).length,0);
 a.setBackgroundEnabled(true);await a.preloadBackground();assert.equal(background(a).length,1);const bed=background(a)[0];assert.equal(a.samples.size,7);assert.equal(a.context.foregroundDecodes,7);
 await a.unlock();await a.preloadBackground();a.setBackgroundEnabled(true);assert.equal(background(a)[0],bed);assert.equal(a.context.backgroundDecodes,1);
 a.event('start');a.win(10,2);assert.equal(background(a)[0],bed);a.stop('reels');a.stop('win');assert.equal(background(a)[0],bed);assert.equal(a.remainingWinMs(),0);
 assert.equal(bed.osc.loop,true);assert.equal(bed.baseVolume,1,'retain user-uploaded clip amplitude before user volume');
}));
test('background mute and hidden presentation freeze position and resume exactly one loop',()=>withAudio(async a=>{
 a.setBackgroundEnabled(true);await a.unlock();await a.preloadBackground();a.context.currentTime=3.25;a.toggle();assert.equal(background(a).length,0);a.context.currentTime+=10;a.toggle();assert.equal(background(a).length,1);assert.equal(background(a)[0].offset,3.25);
 a.context.currentTime+=2;a.setSuspended(true);assert.equal(background(a).length,0);a.context.currentTime+=30;a.setSuspended(false);assert.equal(background(a).length,1);assert.equal(background(a)[0].offset,5.25);
 a.setVolume(.2);assert.equal(a.master.gain.value,.2);a.toggle();assert.equal(a.master.gain.value,0);a.setSuspended(true);a.setSuspended(false);assert.equal(background(a).length,0,'hidden/resume cannot override mute');
}));
test('background survives context recreation at saved position, while full stop and disposal release it',()=>withAudio(async a=>{
 a.setBackgroundEnabled(true);await a.unlock();await a.preloadBackground();const previous=a.context;a.context.currentTime=8.5;a.context.state='closed';await a.unlock();assert.notEqual(a.context,previous);assert.equal(background(a).length,1);assert.equal(background(a)[0].offset,8.5);
 a.stop();assert.equal(background(a).length,0);await a.unlock();assert.equal(background(a).length,0,'full stop revokes background intent');a.setBackgroundEnabled(true);await a.preloadBackground();assert.equal(background(a).length,1);await a.dispose();assert.equal(a.backgroundBuffer,null);assert.equal(a.nodes.size,0);assert.equal(a.retiring.size,0);await a.unlock();assert.equal(a.nodes.size,0);
}));
test('unsupported background decoding remains optional and does not interrupt foreground playback',()=>withAudio(async a=>{
 a.setBackgroundEnabled(true);await a.unlock();assert.equal(await a.preloadBackground(),false);await a.preload();assert.equal(a.samples.size,7);a.event('start');assert.ok([...a.nodes].some(n=>n.group==='reels'));assert.equal(background(a).length,0);
},class extends Context{async decodeAudioData(bytes){if(isBackground(bytes))throw Error('Unsupported Opus');return super.decodeAudioData(bytes);}}));
test('late music decoding after disposal cannot start or retain a buffer',async()=>{
 let release,entered;const started=new Promise(r=>entered=r);
 await withAudio(async a=>{a.setBackgroundEnabled(true);await a.unlock();const pending=a.preloadBackground();await started;await a.dispose();release(buffer(87));assert.equal(await pending,false);assert.equal(a.backgroundBuffer,null);assert.equal(a.nodes.size,0);},class extends Context{decodeAudioData(bytes){if(isBackground(bytes)){entered();return new Promise(r=>release=r);}return super.decodeAudioData(bytes);}});
});
test('unverified games never load or borrow the shared Multi Hot music',async()=>{
 for(const id of ['wild_multi_stars','unknown_game'])await withAudio(async a=>{a.setBackgroundEnabled(true);await a.unlock();assert.equal(await a.preloadBackground(),false);assert.equal(a.context.backgroundDecodes,0);assert.equal(background(a).length,0);},Context,id);
});
test('stalled resume does not start background until browser permits audio',()=>withAudio(async a=>{
 a.setBackgroundEnabled(true);await a.unlock();await a.preloadBackground();assert.equal(background(a).length,0);a.context.state='running';await a.unlock();assert.equal(background(a).length,1);
},class extends Context{resume(){return new Promise(()=>{});}}));

test('unsupported background decode is attempted once per context, never on every spin gesture',async()=>{
 let attempts=0;
 await withAudio(async a=>{a.setBackgroundEnabled(true);await a.unlock();assert.equal(await a.preloadBackground(),false);for(let i=0;i<10;i++){await a.unlock();await a.preloadBackground();a.event('tap');}assert.equal(attempts,1);assert.equal(a.samples.size,7);a.context.state='closed';await a.unlock();assert.equal(await a.preloadBackground(),false);assert.equal(attempts,2);},class extends Context{async decodeAudioData(bytes){if(isBackground(bytes)){attempts++;throw Error('Unsupported codec');}return super.decodeAudioData(bytes);}});
});

test('Multi Hot 5 loads the full original music only after explicit consent',()=>withAudio(async a=>{
 await a.unlock();await a.preload();assert.equal(a.context.backgroundDecodes,0);assert.equal(background(a).length,0);assert.equal(a.samples.size,7);
 a.setBackgroundEnabled(true);await a.preloadBackground();const bed=background(a)[0];assert.ok(bed);assert.equal(bed.baseVolume,1);assert.equal(a.context.backgroundDecodes,1);
 a.event('start');a.stop('reels');a.win(2,1);a.stop('win');assert.equal(background(a)[0],bed);assert.equal(a.samples.size,7);
 a.setBackgroundEnabled(false);assert.equal(background(a).length,0);await a.unlock();assert.equal(background(a).length,0);
},Context,'multi_hot_5_video'));

test('Foxy decodes its full original soundtrack only after consent and preserves it across foreground playback',()=>withAudio(async a=>{
 await a.unlock();await a.preload();assert.equal(a.context.backgroundDecodes,0);assert.equal(background(a).length,0);
 a.setBackgroundEnabled(true);await a.preloadBackground();const bed=background(a)[0];assert.ok(bed);assert.equal(a.context.backgroundDecodes,1);assert.equal(a.context.lastBackgroundBytes,foxyBackground.encoded);assert.notEqual(a.context.lastBackgroundBytes,multiBackground.encoded);
 a.event('start');a.stop('reels');a.win(2,1);a.stop('win');assert.equal(background(a)[0],bed);assert.equal(a.samples.size,15);a.setBackgroundEnabled(false);assert.equal(background(a).length,0);
},class extends Context{async decodeAudioData(bytes){if(isBackground(bytes))this.lastBackgroundBytes=Buffer.from(bytes).toString('base64');return super.decodeAudioData(bytes);}},'hot_foxy_20'));
