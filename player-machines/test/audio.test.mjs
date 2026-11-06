import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundEngine} from '../public/audio.mjs';
const param=()=>({value:0,setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
class Node {constructor(){this.gain=param();this.frequency=param();this.threshold=param();this.ratio=param();}connect(next){return next;}disconnect(){this.disconnected=true;}start(){}stop(time){if(time===undefined)this.onended?.();}}
class Context {constructor(){this.currentTime=1;this.state='suspended';this.destination=new Node();}createGain(){return new Node();}createOscillator(){return new Node();}createDynamicsCompressor(){return new Node();}async resume(){this.state='running';}async close(){this.state='closed';}}
test('audio unlock, mute, volume and disposal release all scheduled nodes',async()=>{const original=globalThis.AudioContext;globalThis.AudioContext=Context;try{const audio=new SoundEngine();await audio.unlock();assert.equal(audio.context.state,'running');audio.event('start');audio.event('reel-stop',2);audio.win(100,2);assert.ok(audio.nodes.size>0);audio.toggle();assert.equal(audio.nodes.size,0);audio.event('wheel-stop');assert.equal(audio.nodes.size,0);audio.setVolume(5);assert.equal(audio.volume,1);audio.toggle();audio.win(4,2);assert.ok(audio.nodes.size>0);await audio.dispose();assert.equal(audio.nodes.size,0);assert.equal(audio.context.state,'closed');}finally{globalThis.AudioContext=original;}});
test('new spin cancels previous win score and retained diagnostics stay bounded',async()=>{const original=globalThis.AudioContext;globalThis.AudioContext=Context;try{const audio=new SoundEngine(329.63);await audio.unlock();audio.win(100,2);assert.ok([...audio.nodes].some(x=>x.group==='win'));audio.event('start');assert.ok(![...audio.nodes].some(x=>x.group==='win'));for(let i=0;i<300;i++)audio.event('unknown');assert.ok(audio.events.length<=101);await audio.dispose();}finally{globalThis.AudioContext=original;}});

test('blocked audio resume cannot freeze wallet or controls',async()=>{const old=globalThis.AudioContext;class Blocked extends Context{resume(){return new Promise(()=>{});}}globalThis.AudioContext=Blocked;try{const audio=new SoundEngine();const result=await Promise.race([audio.unlock().then(()=>true),new Promise(r=>setTimeout(()=>r(false),50))]);assert.equal(result,true);await audio.dispose();}finally{globalThis.AudioContext=old;}});

test('browser audio setup failure is optional and a later gesture can retry',async()=>{
 const old=globalThis.AudioContext;const audio=new SoundEngine();let attempts=0;
 globalThis.AudioContext=class extends Context{constructor(){if(++attempts===1)throw Error('Audio unavailable');super();}};
 try{await assert.doesNotReject(audio.unlock());assert.equal(audio.context,null);await audio.unlock();assert.equal(audio.context.state,'running');audio.event('tap');assert.ok(audio.nodes.size>0);await audio.dispose();}finally{globalThis.AudioContext=old;}
});

test('failed graph setup releases partial context and can recover',async()=>{
 const old=globalThis.AudioContext;let partial;class BrokenGraph extends Context{constructor(){super();partial=this;}createDynamicsCompressor(){throw Error('No audio output');}}
 globalThis.AudioContext=BrokenGraph;const audio=new SoundEngine();
 try{await audio.unlock();assert.equal(audio.context,null);assert.equal(partial.state,'closed');globalThis.AudioContext=Context;await audio.unlock();assert.equal(audio.context.state,'running');await audio.dispose();}finally{globalThis.AudioContext=old;}
});

test('Safari interrupted audio resumes without blocking the caller',async()=>{
 const old=globalThis.AudioContext;globalThis.AudioContext=class extends Context{constructor(){super();this.state='interrupted';}};
 try{const audio=new SoundEngine();await audio.unlock();assert.equal(audio.context.state,'running');await audio.dispose();}finally{globalThis.AudioContext=old;}
});

test('a throwing resume request remains retryable',async()=>{
 const old=globalThis.AudioContext;let attempts=0;globalThis.AudioContext=class extends Context{resume(){if(++attempts===1)throw Error('Gesture required');return super.resume();}};
 try{const audio=new SoundEngine();await assert.doesNotReject(audio.unlock());assert.equal(audio.context.state,'suspended');await audio.unlock();assert.equal(audio.context.state,'running');await audio.dispose();}finally{globalThis.AudioContext=old;}
});

test('a stalled browser resume can be retried by the next gesture',async()=>{
 const old=globalThis.AudioContext;let attempts=0;globalThis.AudioContext=class extends Context{resume(){if(++attempts===1)return new Promise(()=>{});return super.resume();}};
 try{const audio=new SoundEngine();await audio.unlock();assert.equal(audio.context.state,'suspended');await audio.unlock();assert.equal(audio.context.state,'running');await audio.dispose();}finally{globalThis.AudioContext=old;}
});

class ReelContext extends Context{
 constructor(){super();this.sampleRate=8000;}
 createBuffer(_channels,length){return {getChannelData:()=>new Float32Array(length)};}
 createBufferSource(){return new Node();}
 createBiquadFilter(){return new Node();}
}
test('a hidden response cannot restart sound until presentation resumes',async()=>{
 const old=globalThis.AudioContext;globalThis.AudioContext=ReelContext;
 try{const audio=new SoundEngine();await audio.unlock();audio.event('start');assert.equal([...audio.nodes].filter(n=>n.group==='reels').length,1);audio.setSuspended(true);assert.equal(audio.nodes.size,0);audio.event('start');audio.event('reel-stop',1);audio.win(100,2);assert.equal(audio.nodes.size,0);assert.equal(audio.muted,false);audio.setSuspended(false);audio.event('move');assert.equal([...audio.nodes].filter(n=>n.group==='reels').length,1);await audio.dispose();}finally{globalThis.AudioContext=old;}
});

test('reel sound remains single-instance and starts cleanly on the next spin',async()=>{
 const old=globalThis.AudioContext;globalThis.AudioContext=ReelContext;
 try{const audio=new SoundEngine();await audio.unlock();audio.event('start');const first=[...audio.nodes].find(n=>n.group==='reels');audio.event('move');audio.event('move');assert.equal([...audio.nodes].filter(n=>n.group==='reels').length,1);audio.event('reel-stop',1);audio.event('start');assert.equal(first.osc.disconnected,undefined);assert.equal([...audio.nodes].filter(n=>n.group==='reels').length,1);audio.stop('reels');audio.event('start');assert.equal(first.osc.disconnected,true);assert.equal([...audio.nodes].filter(n=>n.group==='reels').length,1);await audio.dispose();}finally{globalThis.AudioContext=old;}
});

class SampleContext extends ReelContext{
 constructor(){super();this.decodeCalls=0;this.oscillators=0;}
 async decodeAudioData(bytes){this.decodeCalls++;assert.ok(bytes.byteLength>100);return {decoded:true};}
 createOscillator(){this.oscillators++;return super.createOscillator();}
}
test('embedded clips preload after a gesture and replace procedural events without doubling',async()=>{
 const old=globalThis.AudioContext;let contexts=0;globalThis.AudioContext=class extends SampleContext{constructor(){super();contexts++;}};
 try{const audio=new SoundEngine();assert.equal(await audio.preload(),false);assert.equal(contexts,0);await audio.unlock();assert.equal(await audio.preload(),true);assert.equal(audio.samples.size,7);assert.equal(audio.context.decodeCalls,7);await audio.preload();assert.equal(audio.context.decodeCalls,7);
  audio.event('start');assert.equal([...audio.nodes].filter(n=>n.sample==='reel-loop').length,1);assert.equal([...audio.nodes].filter(n=>n.sample==='spin').length,1);audio.event('move');assert.equal([...audio.nodes].filter(n=>n.sample==='reel-loop').length,1);audio.event('reel-stop',1);audio.event('wheel-stop');audio.event('wheel-tick');audio.event('multiplier',4);assert.equal([...audio.nodes].filter(n=>n.sample==='reel-stop').length,1);assert.equal([...audio.nodes].filter(n=>n.sample==='wheel-stop').length,1);assert.equal(audio.context.oscillators,0);
  audio.win(10,2);assert.equal([...audio.nodes].find(n=>n.group==='win').sample,'win');audio.win(40,2);assert.equal([...audio.nodes].filter(n=>n.group==='win').length,1);assert.equal([...audio.nodes].find(n=>n.group==='win').sample,'big-win');audio.event('wild');assert.equal([...audio.nodes].filter(n=>n.group==='win').length,1);audio.setSuspended(true);assert.equal(audio.nodes.size,0);audio.event('start');assert.equal(audio.nodes.size,0);audio.setSuspended(false);audio.event('move');assert.equal([...audio.nodes].filter(n=>n.sample==='reel-loop').length,1);audio.toggle();assert.equal(audio.nodes.size,0);await audio.dispose();assert.equal(audio.samples.size,0);
 }finally{globalThis.AudioContext=old;}
});

test('failed sample decoding keeps procedural audio available without rejecting unlock',async()=>{
 const old=globalThis.AudioContext;globalThis.AudioContext=class extends SampleContext{async decodeAudioData(){throw Error('Unsupported codec');}};
 try{const audio=new SoundEngine();await audio.unlock();assert.equal(await audio.preload(),false);assert.equal(audio.samples.size,0);audio.event('start');assert.ok(audio.context.oscillators>0);assert.equal([...audio.nodes].filter(n=>n.group==='reels').length,1);await audio.dispose();}finally{globalThis.AudioContext=old;}
});

test('late sample decoding after disposal cannot retain decoded audio',async()=>{
 const old=globalThis.AudioContext;const pending=[];globalThis.AudioContext=class extends SampleContext{decodeAudioData(){return new Promise(resolve=>pending.push(resolve));}};
 try{const audio=new SoundEngine();await audio.unlock();assert.equal(pending.length,7);const load=audio.preload();await audio.dispose();pending.forEach(resolve=>resolve({decoded:true}));assert.equal(await load,false);assert.equal(audio.samples.size,0);assert.equal(audio.nodes.size,0);}finally{globalThis.AudioContext=old;}
});

test('unmute restores an ongoing spin immediately and keeps its audio phase',async()=>{
 const old=globalThis.AudioContext;globalThis.AudioContext=SampleContext;
 try{const audio=new SoundEngine();await audio.unlock();await audio.preload();audio.samples.set('reel-loop',{duration:.515});audio.event('start');audio.context.currentTime+=.2;audio.toggle();assert.equal(audio.nodes.size,0);assert.equal(audio.reelWanted,true);audio.context.currentTime+=.1;audio.toggle();const loop=[...audio.nodes].find(n=>n.group==='reels');assert.ok(loop,'resume without a later move event');assert.ok(Math.abs(loop.offset-.3)<1e-8);audio.event('reel-stop',1);assert.equal([...audio.nodes].find(n=>n.group==='reels'),loop);audio.stop('reels');audio.toggle();audio.toggle();assert.equal([...audio.nodes].filter(n=>n.group==='reels').length,0,'a settled spin must stay stopped');await audio.dispose();}finally{globalThis.AudioContext=old;}
});
test('hidden presentation freezes audio phase and resumes immediately without changing mute',async()=>{
 const old=globalThis.AudioContext;globalThis.AudioContext=SampleContext;
 try{const audio=new SoundEngine();await audio.unlock();await audio.preload();audio.samples.set('reel-loop',{duration:.515});audio.event('start');audio.context.currentTime+=.2;audio.setSuspended(true);audio.context.currentTime+=10;audio.setSuspended(false);const loop=[...audio.nodes].find(n=>n.group==='reels');assert.ok(loop);assert.ok(Math.abs(loop.offset-.2)<1e-8);assert.equal(audio.muted,false);audio.stop('reels');audio.setSuspended(true);audio.setSuspended(false);assert.equal([...audio.nodes].filter(n=>n.group==='reels').length,0);await audio.dispose();}finally{globalThis.AudioContext=old;}
});
test('a spin starting muted remembers its loop until unmuted',async()=>{
 const old=globalThis.AudioContext;globalThis.AudioContext=SampleContext;
 try{const audio=new SoundEngine();await audio.unlock();await audio.preload();audio.toggle();audio.event('start');assert.equal(audio.reelWanted,true);assert.equal(audio.nodes.size,0);audio.toggle();assert.equal([...audio.nodes].filter(n=>n.group==='reels').length,1);await audio.dispose();}finally{globalThis.AudioContext=old;}
});
test('stopped audio ramps out before disconnecting and leaves no retired nodes',async()=>{
 const old=globalThis.AudioContext;const scheduled=[];class Smooth extends SampleContext{createGain(){const node=super.createGain();node.gain.cancelScheduledValues=()=>{};node.gain.linearRampToValueAtTime=(value,time)=>scheduled.push({value,time});return node;}createBufferSource(){const node=super.createBufferSource();node.stop=time=>{node.stopTime=time;};return node;}}
 globalThis.AudioContext=Smooth;
 try{const audio=new SoundEngine();await audio.unlock();await audio.preload();audio.event('start');const loop=[...audio.nodes].find(n=>n.group==='reels');audio.stop('reels');assert.equal(audio.nodes.has(loop),false);assert.equal(audio.retiring.has(loop),true);assert.ok(loop.osc.stopTime>audio.context.currentTime);assert.ok(scheduled.some(item=>item.value===0&&item.time>audio.context.currentTime));loop.osc.onended();assert.equal(audio.retiring.has(loop),false);assert.equal(loop.osc.disconnected,true);await audio.dispose();assert.equal(audio.retiring.size,0);}finally{globalThis.AudioContext=old;}
});

test('AUTO can wait for the current win phrase to finish without delaying muted audio',async()=>{
 const old=globalThis.AudioContext;globalThis.AudioContext=SampleContext;
 try{const audio=new SoundEngine();await audio.unlock();await audio.preload();audio.samples.set('win',{duration:1.45});audio.samples.set('big-win',{duration:2.1});audio.win(6,2);assert.ok(Math.abs(audio.remainingWinMs()-1450)<=1);audio.context.currentTime+=.4;assert.ok(Math.abs(audio.remainingWinMs()-1050)<=1);audio.event('start');assert.equal(audio.remainingWinMs(),0,'manual spin can interrupt the phrase');audio.win(40,2);assert.ok(Math.abs(audio.remainingWinMs()-2100)<=1);audio.setSuspended(true);assert.equal(audio.remainingWinMs(),0);audio.setSuspended(false);audio.win(40,2);audio.toggle();assert.equal(audio.remainingWinMs(),0);await audio.dispose();}finally{globalThis.AudioContext=old;}
});
