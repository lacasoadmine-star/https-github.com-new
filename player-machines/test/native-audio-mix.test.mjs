import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundEngine} from '../public/audio.mjs';

const parameter = (value = 1) => ({value, setTargetAtTime(value) {this.value = value;}, setValueAtTime(value) {this.value = value;}, linearRampToValueAtTime(value) {this.value = value;}, exponentialRampToValueAtTime(value) {this.value = value;}});
class Node {
 constructor() {this.gain = parameter(); this.frequency = parameter();}
 connect(next) {this.target = next; return next;}
 disconnect() {this.target = null;}
 start() {}
 stop() {this.onended?.();}
}
class Context {
 constructor() {this.currentTime = 1; this.state = 'running'; this.destination = new Node();}
 createGain() {return new Node();}
 createBufferSource() {return new Node();}
 createOscillator() {return new Node();}
 createDynamicsCompressor() {const node = new Node(); for(const [name,value] of Object.entries({threshold:-24,knee:30,ratio:12,attack:.003,release:.25}))node[name]=parameter(value); return node;}
 async close() {this.state = 'closed';}
}
const compressor = audio => Object.fromEntries(['threshold','knee','ratio','attack','release'].map(name => [name,audio.limiter[name].value]));
const prepare = async game => {const audio = new SoundEngine(261.63,game);audio.preload=async()=>false;audio.preloadBackground=async()=>false;await audio.unlock();return audio;};

test('native graph keeps provider master/default compression and applies source clip gains to actual nodes', async () => {
 const previous=globalThis.AudioContext;globalThis.AudioContext=Context;
 try {for(const game of ['multi_hot_5_video','hot_foxy_20']){
  const audio=await prepare(game),mh5=game==='multi_hot_5_video';
  assert.equal(audio.volume,1);assert.equal(audio.master.gain.value,1);
  assert.equal(audio.master.target,audio.limiter);assert.equal(audio.limiter.target,audio.context.destination);
  assert.deepEqual(compressor(audio),{threshold:-24,knee:30,ratio:12,attack:.003,release:.25});
  audio.nativeBank={volumes:{win:mh5?1:.5}};audio.samples.set('win',{duration:.5});
  assert.equal(audio.playSample('win',{loop:true,group:'win'}),true);
  const win=[...audio.nodes].find(node=>node.group==='win');assert.equal(win.baseVolume,mh5?.36:.5);assert.equal(win.gain.gain.value,mh5?.36:.5);assert.equal(win.gain.target,audio.master);
  audio.backgroundBuffer={duration:20};audio.backgroundGain=mh5?.3:.6;audio.setBackgroundEnabled(true);
  const bed=[...audio.nodes].find(node=>node.group==='background');assert.equal(bed.gain.gain.value,mh5?.09:.6);assert.equal(bed.gain.target,audio.master);
  assert.equal(audio.backgroundDiagnostics().sourceGain,mh5?.3:.6);assert.equal(audio.backgroundDiagnostics().gain,mh5?.09:.6);
  audio.setVolume(.23);assert.equal(audio.master.gain.value,.23);assert.equal(win.gain.gain.value,mh5?.36:.5,'user gain does not overwrite original clip mix');
  audio.toggle();assert.equal(audio.master.gain.value,0);audio.toggle();assert.equal(audio.master.gain.value,.23);
  await audio.context.close();await audio.unlock();assert.equal(audio.master.gain.value,.23);assert.deepEqual(compressor(audio),{threshold:-24,knee:30,ratio:12,attack:.003,release:.25});await audio.dispose();
 }}finally{globalThis.AudioContext=previous;}
});

test('other cabinets retain their existing half-volume custom compressor and unsquared clip mix', async () => {
 const previous=globalThis.AudioContext;globalThis.AudioContext=Context;
 try{for(const game of ['multi_hot_100','wild_multi_stars']){
  const audio=await prepare(game);assert.equal(audio.volume,.5);assert.equal(audio.master.gain.value,.5);assert.equal(audio.limiter.threshold.value,-13);assert.equal(audio.limiter.ratio.value,8);
  audio.samples.set('tap',{duration:.5});audio.playSample('tap',{loop:true,volume:.6});assert.equal([...audio.nodes][0].gain.gain.value,.6);
  audio.setVolume(.72);assert.equal(audio.master.gain.value,.72);await audio.dispose();
 }}finally{globalThis.AudioContext=previous;}
});
