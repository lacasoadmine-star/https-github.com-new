import {audioSamples} from './audio-samples.mjs';
// Existing cabinet clips with a procedural fallback while decoding or without audio support.
export class SoundEngine {
 constructor(root=261.63){this.root=root;this.volume=.5;this.muted=false;this.nodes=new Set();this.events=[];this.samples=new Map();this.disposed=false;}
 async unlock(){
  if(this.disposed)return;const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
  try{
   if(!this.context||this.context.state==='closed'){
    this.stop();this.noise=null;this.audioReady=false;this.context=new Audio();this.master=this.context.createGain();this.limiter=this.context.createDynamicsCompressor();this.limiter.threshold.value=-13;this.limiter.ratio.value=8;this.master.connect(this.limiter).connect(this.context.destination);this.gain();this.audioReady=true;
   }
   // A denied or stalled browser audio request must never hold up SPIN.
   // Safari may report interruption after a call or a backgrounded tab.
   if(['suspended','interrupted'].includes(this.context.state))void Promise.resolve(this.context.resume()).catch(()=>{});
   void this.preload();
  }catch{
   if(!this.audioReady){const context=this.context;this.context=null;this.master=null;this.limiter=null;try{void context?.close()?.catch(()=>{});}catch{}}
  }
 }
 preload(){
  const context=this.context;if(this.disposed||!context?.decodeAudioData||context.state==='closed')return Promise.resolve(false);
  if(this.sampleLoad)return this.sampleLoad;
  this.sampleLoad=Promise.all(Object.entries(audioSamples).map(async([name,encoded])=>{
   try{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),buffer=await context.decodeAudioData(bytes.buffer);if(!this.disposed)this.samples.set(name,buffer);}catch{}
  })).then(()=>this.samples.size===Object.keys(audioSamples).length);
  return this.sampleLoad;
 }
 playSample(name,{loop=false,group='effect',volume=1.4}={}){
  const context=this.context,buffer=this.samples.get(name);if(!buffer||!context||context.state==='closed'||this.muted||this.disposed||this.playbackSuspended)return false;
  let node;try{
   const osc=context.createBufferSource(),gain=context.createGain();osc.buffer=buffer;osc.loop=loop;gain.gain.setValueAtTime(volume,context.currentTime);osc.connect(gain).connect(this.master);node={osc,gain,group,sample:name,baseVolume:volume};this.nodes.add(node);osc.onended=()=>{osc.disconnect();gain.disconnect();this.nodes.delete(node);};osc.start();return true;
  }catch{if(node){node.osc.disconnect();node.gain.disconnect();this.nodes.delete(node);}return false;}
 }
 gain(){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.context.currentTime,.012);}
 setVolume(value){if(!Number.isFinite(value))return;this.volume=Math.max(0,Math.min(1,value));this.gain();}
 setSuspended(value){this.playbackSuspended=!!value;if(this.playbackSuspended)this.stop();}
 toggle(){this.muted=!this.muted;this.gain();if(this.muted)this.stop();return this.muted;}
 tone(frequency,when,duration=.09,volume=.12,type='sine',end=frequency,group='effect'){
  if(!this.context||this.context.state==='closed'||this.muted||this.disposed||this.playbackSuspended)return;const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,when);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),when+duration);gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(volume,when+.009);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);osc.connect(gain).connect(this.master);const node={osc,gain,group};this.nodes.add(node);osc.onended=()=>{osc.disconnect();gain.disconnect();this.nodes.delete(node);};osc.start(when);osc.stop(when+duration+.025);
 }
 reelLoop(){
  const ctx=this.context;if(!ctx||ctx.state==='closed'||this.muted||this.disposed||this.playbackSuspended||!ctx.createBufferSource||[...this.nodes].some(n=>n.group==='reels'))return;
  if(this.playSample('reel-loop',{loop:true,group:'reels'}))return;
  if(!this.noise){this.noise=ctx.createBuffer(1,Math.round(ctx.sampleRate*.4),ctx.sampleRate);const pcm=this.noise.getChannelData(0);let seed=731;for(let i=0;i<pcm.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1,t=i/ctx.sampleRate;pcm[i]=noise*.3+Math.sin(t*Math.PI*2*(this.root/4))*.13;}}
  const osc=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();osc.buffer=this.noise;osc.loop=true;filter.type='lowpass';filter.frequency.value=this.root*3;gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(.14,ctx.currentTime+.08);osc.connect(filter).connect(gain).connect(this.master);const node={osc,gain,filter,group:'reels',baseVolume:.14};this.nodes.add(node);osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();this.nodes.delete(node);};osc.start();
 }
 event(name,index=0){if(this.events.length>=100)this.events.shift();this.events.push({name,index,time:globalThis.performance?.now()||Date.now()});if(!this.context||this.context.state==='closed'||this.muted||this.disposed||this.playbackSuspended)return;const t=this.context.currentTime,r=this.root;
  if((name==='tap'||name==='bet')&&!this.playSample('tap'))this.tone(r*2.2,t,.045,.06);
  if(name==='start'){this.stop('win');this.stop('reels');this.reelLoop();if(!this.playSample('spin'))this.tone(r/2,t,.12,.08,'triangle',r);}
  if(name==='move')this.reelLoop();
  if(name==='reel-stop'){for(const node of this.nodes)if(node.group==='reels'&&!node.sample){node.gain.gain.setTargetAtTime(node.baseVolume/(1+(index+1)*.4),t,.04);node.filter.frequency.setTargetAtTime(r*3/(1+(index+1)*.18),t,.04);}if(!this.playSample('reel-stop')){this.tone(r+index*24,t,.075,.16,'triangle',(r+index*24)*.55);this.tone(r*2+index*35,t+.018,.07,.025);}}
  if(name==='wheel-tick'&&!this.samples.has('wheel-stop'))this.tone(r*2.4,t,.025,.03,'triangle');
  if(name==='wheel-stop'&&!this.playSample('wheel-stop')){this.tone(r*2,t,.2,.12,'triangle');this.tone(r*3,t+.04,.16,.05);}
  if(name==='multiplier'&&!this.samples.has('wheel-stop'))this.tone(r*2**(index/12),t,.22,.055);
  if((name==='wild'||name==='bonus')&&![...this.nodes].some(node=>node.group==='win'&&node.sample)){[0,7,12,19].forEach((n,i)=>this.tone(r*2**(n/12),t+i*.08,.23,.07,'sine',r*2**(n/12),'win'));}
  if(name==='error'){this.tone(180,t,.16,.08,'triangle',110);}
 }
 win(amount,bet){if(!(amount>0))return;this.stop('win');const ratio=amount/Math.max(.01,bet);if(this.playSample(ratio>=20?'big-win':'win',{group:'win'}))return;const notes=ratio>=50?[0,4,7,12,16,19,24,19,24]:ratio>=20?[0,4,7,12,16,19]:ratio>=5?[0,4,7,12,16]:[0,4,7,12];if(!this.context)return;const t=this.context.currentTime;notes.forEach((step,i)=>{const f=this.root*2**(step/12);this.tone(f,t+i*.105,.32,.12,'triangle',f,'win');this.tone(f*2,t+i*.105,.2,.018,'sine',f*2,'win');});}
 stop(group){for(const n of [...this.nodes])if(!group||n.group===group){try{n.osc.stop();}catch{}n.osc.disconnect();n.filter?.disconnect();n.gain.disconnect();this.nodes.delete(n);}}
 async dispose(){this.disposed=true;this.stop();this.noise=null;this.samples.clear();await this.context?.close().catch(()=>{});}
}
