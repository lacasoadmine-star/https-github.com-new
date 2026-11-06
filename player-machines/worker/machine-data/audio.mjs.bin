import {getAudioSamples} from './audio-banks.mjs';
import {audioSamples} from './audio-samples.mjs';
import {seamlessBuffer} from './audio-loop.mjs';
// Existing cabinet clips with a procedural fallback while decoding or without audio support.
export class SoundEngine {
 constructor(root=261.63,gameId=''){this.root=root;this.gameId=gameId;this.audioSamples=getAudioSamples(gameId,audioSamples);this.nativeAudio=['multi_hot_5_video','hot_foxy_20'].includes(gameId);this.nativeBank=null;this.reelSampleEnded=false;this.turbo=false;this.fastStop=false;this.fastStopPlayed=false;this.volume=.5;this.muted=false;this.nodes=new Set();this.retiring=new Set();this.events=[];this.samples=new Map();this.reelWanted=false;this.reelPhase=0;this.reelClock=0;this.reelElapsed=0;this.reelElapsedClock=0;this.disposed=false;this.backgroundEnabled=false;this.backgroundPhase=0;this.backgroundBuffer=null;this.backgroundLoad=null;this.backgroundFailureContext=null;this.backgroundGain=0;}
 async unlock(){
  if(this.disposed)return;const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
  try{
   if(!this.context||this.context.state==='closed'){
    this.saveReelPhase();this.saveBackgroundPhase();this.stopNodes();if(this.nativeAudio&&(!this.nativeBank||this.samples.size!==Object.keys(this.audioSamples).length))this.sampleLoad=null;this.backgroundLoad=null;this.backgroundFailureContext=null;this.noise=null;this.audioReady=false;this.context=new Audio();this.reelClock=this.context.currentTime;this.reelElapsedClock=this.context.currentTime;this.master=this.context.createGain();this.limiter=this.context.createDynamicsCompressor();this.limiter.threshold.value=-13;this.limiter.ratio.value=8;this.master.connect(this.limiter).connect(this.context.destination);this.gain();this.audioReady=true;
   }
   // A denied or stalled browser audio request must never hold up SPIN.
   // Safari may report interruption after a call or a backgrounded tab.
   if(['suspended','interrupted'].includes(this.context.state))void Promise.resolve(this.context.resume()).then(()=>this.backgroundLoop()).catch(()=>{});
   void this.preload();
   void this.preloadBackground();this.backgroundLoop();
   if(this.reelWanted)this.reelLoop();
  }catch{
   if(!this.audioReady){const context=this.context;this.context=null;this.master=null;this.limiter=null;try{void context?.close()?.catch(()=>{});}catch{}}
  }
 }
 setBackgroundEnabled(value){
  value=!!value;if(value===this.backgroundEnabled)return;
  if(!value){this.saveBackgroundPhase();this.backgroundEnabled=false;this.stopNodes('background');return;}
  this.backgroundEnabled=true;if(this.context){void this.preloadBackground();this.backgroundLoop();}
 }
 preloadBackground(){
  const context=this.context;if(!['multi_hot_100','multi_hot_5_video','hot_foxy_20'].includes(this.gameId)||!this.backgroundEnabled||this.disposed||!context?.decodeAudioData||context.state==='closed')return Promise.resolve(false);
  if(this.backgroundFailureContext===context)return Promise.resolve(false);if(this.backgroundBuffer){this.backgroundLoop();return Promise.resolve(true);}if(this.backgroundLoad)return this.backgroundLoad;
  // Full provider beds are separate, game-specific lazy modules. Do not load
  // either large music file before the player has explicitly enabled sound.
  const trackModule=this.gameId==='hot_foxy_20'?import('./official-foxy-background.mjs'):this.gameId==='multi_hot_5_video'?import('./official-mh5-background.mjs'):import('./background-audio.mjs');
  const pending=trackModule.then(async module=>{
   const backgroundTrack=module.backgroundTracks?.[this.gameId]||module.backgroundTrack;
   if(this.disposed||context!==this.context||!backgroundTrack?.encoded)return false;
   const bytes=Uint8Array.from(atob(backgroundTrack.encoded),c=>c.charCodeAt(0));const decoded=await context.decodeAudioData(bytes.buffer);
   if(this.disposed||context!==this.context)return false;
   // The original complete music must not go through the excerpt loop repair:
   // that trims35ms and crossfades PCM intended only for the old short clips.
   this.backgroundBuffer=backgroundTrack.preserveOriginal?decoded:seamlessBuffer(context,decoded);this.backgroundGain=backgroundTrack.gain;this.backgroundLoop();return true;
  }).catch(()=>{if(!this.disposed&&context===this.context)this.backgroundFailureContext=context;return false;}).finally(()=>{if(this.backgroundLoad===pending)this.backgroundLoad=null;});
  this.backgroundLoad=pending;return pending;
 }
 backgroundDiagnostics(){return {enabled:this.backgroundEnabled,loaded:!!this.backgroundBuffer,loading:!!this.backgroundLoad,playing:[...this.nodes].some(n=>n.group==='background'),positionSeconds:this.currentBackgroundPhase(),durationSeconds:this.backgroundBuffer?.duration||0,gain:this.backgroundGain};}
 currentBackgroundPhase(){
  const node=[...this.nodes].find(n=>n.group==='background');return node?.buffer?.duration?((node.offset||0)+Math.max(0,(this.context?.currentTime||0)-node.startedAt))%node.buffer.duration:this.backgroundPhase;
 }
 saveBackgroundPhase(){this.backgroundPhase=this.currentBackgroundPhase();}
 backgroundLoop(){
  const context=this.context,buffer=this.backgroundBuffer;if(!this.backgroundEnabled||!buffer?.duration||context?.state!=='running'||this.muted||this.disposed||this.playbackSuspended||[...this.nodes].some(n=>n.group==='background'))return false;
  let node;try{const osc=context.createBufferSource(),gain=context.createGain(),now=context.currentTime,offset=this.backgroundPhase%buffer.duration;node={osc,gain,group:'background',buffer,startedAt:now,offset,baseVolume:this.backgroundGain};osc.buffer=buffer;osc.loop=true;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(this.backgroundGain,now+.08);osc.connect(gain).connect(this.master);this.nodes.add(node);osc.onended=()=>this.release(node);osc.start(now,offset);return true;}catch{if(node)this.release(node);return false;}
 }
 preload(){
  const context=this.context;if(this.disposed||!context?.decodeAudioData||context.state==='closed')return Promise.resolve(false);
  if(this.sampleLoad)return this.sampleLoad;
  const decode=async bank=>{
   if(this.disposed||context!==this.context)return false;
   if(bank){this.nativeBank=bank;this.audioSamples=bank.audioSamples;}
   await Promise.all(Object.entries(this.audioSamples).map(async([name,encoded])=>{
    try{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),buffer=await context.decodeAudioData(bytes.buffer);
     if(!this.disposed&&(!this.nativeAudio||context===this.context)){this.samples.set(name,name==='reel-loop'&&!this.nativeBank?seamlessBuffer(context,buffer):buffer);if(name==='reel-loop')this.adoptDecodedReelLoop();}
    }catch{}
   }));
   return !this.disposed&&(!this.nativeAudio||context===this.context)&&this.samples.size===Object.keys(this.audioSamples).length;
  };
  // Only the selected game's foreground bank loads after a user gesture.
  // A missing optional asset retains the established procedural fallback.
  this.sampleLoad=this.nativeAudio?(this.gameId==='hot_foxy_20'?import('./official-foxy-effects-audio.mjs'):import('./official-mh5-effects-audio.mjs')).then(decode).catch(()=>decode(null)):decode(null);
  return this.sampleLoad;
 }
 setTurbo(value){this.turbo=!!value;}
 setFastStop(){this.fastStop=true;}
 // A first spin may begin while clips decode. Replace only its active fallback,
 // preserving phase and using the existing short fade instead of restarting audio.
 adoptDecodedReelLoop(){
  if(!['multi_hot_5_video','hot_foxy_20'].includes(this.gameId)||!this.reelWanted||this.muted||this.playbackSuspended||this.disposed||this.context?.state!=='running'||![...this.nodes].some(n=>n.group==='reels'&&!n.sample))return;
  this.saveReelPhase();this.stopNodes('reels');this.reelLoop();
 }
 playSample(name,{loop=false,group='effect',volume,offset=0}={}){volume=volume??this.nativeBank?.volumes?.[name]??(this.nativeBank?1:this.gameId==='wild_multi_stars'&&name==='reel-loop'?.25:1.4);
  const context=this.context,buffer=this.samples.get(name);if(!buffer||!context||context.state==='closed'||this.muted||this.disposed||this.playbackSuspended)return false;
  let node;try{
   const osc=context.createBufferSource(),gain=context.createGain(),now=context.currentTime,duration=buffer.duration;node={osc,gain,group,sample:name,baseVolume:volume,buffer,startedAt:now,offset};osc.buffer=buffer;osc.loop=loop;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+(loop ? .012 : .004));if(!loop&&duration>.02){gain.gain.setValueAtTime(volume,now+duration-.008);gain.gain.linearRampToValueAtTime(0,now+duration);}osc.connect(gain).connect(this.master);this.nodes.add(node);osc.onended=()=>{if(group==='reels'&&!loop&&!node.cancelled){this.reelSampleEnded=true;this.reelPhase=1;}this.release(node);};osc.start(now,offset);return true;
  }catch{if(node)this.release(node);return false;}
 }
 gain(){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.context.currentTime,.012);}
 setVolume(value){if(!Number.isFinite(value))return;this.volume=Math.max(0,Math.min(1,value));this.gain();}
 setSuspended(value){value=!!value;if(value===!!this.playbackSuspended)return;if(value){this.saveReelPhase();this.saveBackgroundPhase();}this.playbackSuspended=value;this.reelClock=this.context?.currentTime||0;this.reelElapsedClock=this.context?.currentTime||0;if(value)this.stopNodes();else if(this.context){void this.unlock();if(this.reelWanted)this.reelLoop();this.backgroundLoop();}}
 toggle(){if(!this.muted){this.saveReelPhase();this.saveBackgroundPhase();}this.muted=!this.muted;this.gain();if(this.muted)this.stopNodes();else{if(this.reelWanted)this.reelLoop();this.backgroundLoop();}return this.muted;}
 // The native Foxy movement is one shot, so its position comes from elapsed
 // presentation time, never a fraction of the much shorter fallback noise loop.
 currentReelElapsed(){return this.reelElapsed+(this.reelWanted&&!this.playbackSuspended?Math.max(0,(this.context?.currentTime||0)-this.reelElapsedClock):0);}
 currentReelPhase(){
  if(this.reelSampleEnded)return 1;
  const native=this.nativeBank?.oneShotReels&&this.samples.get('reel-loop');
  if(native?.duration)return Math.min(1,this.currentReelElapsed()/native.duration);
  const now=this.context?.currentTime||0,node=[...this.nodes].find(n=>n.group==='reels');
  if(node?.buffer?.duration)return ((node.offset||0)+Math.max(0,now-node.startedAt))%node.buffer.duration/node.buffer.duration;
  if(!this.reelPeriod)return this.reelPhase;
  return (this.reelPhase+(this.playbackSuspended?0:Math.max(0,now-this.reelClock)/this.reelPeriod))%1;
 }
 saveReelPhase(){this.reelPhase=this.currentReelPhase();this.reelElapsed=this.currentReelElapsed();this.reelClock=this.context?.currentTime||0;this.reelElapsedClock=this.reelClock;}
 wantReels(){if(!this.reelWanted){this.reelPhase=0;this.reelElapsed=0;this.reelSampleEnded=false;this.reelClock=this.context?.currentTime||0;this.reelElapsedClock=this.reelClock;this.reelPeriod=0;}this.reelWanted=true;}
 remainingWinMs(){if(this.muted||this.playbackSuspended||this.disposed||!this.context)return 0;const now=this.context.currentTime;let remaining=0;for(const node of this.nodes)if(node.group==='win'){const end=node.buffer?.duration?node.startedAt+node.buffer.duration:(node.endsAt||now);remaining=Math.max(remaining,end-now);}return Math.max(0,Math.ceil(remaining*1000));}
 tone(frequency,when,duration=.09,volume=.12,type='sine',end=frequency,group='effect'){
  if(!this.context||this.context.state==='closed'||this.muted||this.disposed||this.playbackSuspended)return;const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,when);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),when+duration);gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(volume,when+.009);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);osc.connect(gain).connect(this.master);const node={osc,gain,group,endsAt:when+duration+.025};this.nodes.add(node);osc.onended=()=>this.release(node);osc.start(when);osc.stop(when+duration+.025);
 }
 reelLoop(){
  this.wantReels();
  // The official MH5 asset list deliberately has no moving-reel sound.
  if(this.gameId==='multi_hot_5_video'||(this.nativeBank?.oneShotReels&&this.reelSampleEnded))return;
  const ctx=this.context;if(!ctx||ctx.state==='closed'||this.muted||this.disposed||this.playbackSuspended||!ctx.createBufferSource||[...this.nodes].some(n=>n.group==='reels'))return;
  const phase=this.currentReelPhase(),sample=this.samples.get('reel-loop');if(this.nativeBank?.oneShotReels&&phase>=1){this.reelSampleEnded=true;return;}if(sample){this.reelPeriod=sample.duration;if(this.playSample('reel-loop',{loop:!this.nativeBank?.oneShotReels,group:'reels',offset:Number.isFinite(sample.duration)?phase*sample.duration:0}))return;}
  if(!this.noise){this.noise=ctx.createBuffer(1,Math.round(ctx.sampleRate*.4),ctx.sampleRate);const pcm=this.noise.getChannelData(0);let seed=731;for(let i=0;i<pcm.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1,t=i/ctx.sampleRate;pcm[i]=noise*.3+Math.sin(t*Math.PI*2*(this.root/4))*.13;}}
  const osc=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),offset=Number.isFinite(this.noise.duration)?phase*this.noise.duration:0;this.reelPeriod=this.noise.duration;osc.buffer=this.noise;osc.loop=true;filter.type='lowpass';filter.frequency.value=this.root*3;gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(.14,ctx.currentTime+.012);osc.connect(filter).connect(gain).connect(this.master);const node={osc,gain,filter,group:'reels',baseVolume:.14,buffer:this.noise,offset,startedAt:ctx.currentTime};this.nodes.add(node);osc.onended=()=>this.release(node);osc.start(ctx.currentTime,offset);
 }
 event(name,index=0){if(this.events.length>=100)this.events.shift();this.events.push({name,index,time:globalThis.performance?.now()||Date.now()});if(name==='start'||name==='move')this.wantReels();if(name==='start'){this.fastStop=false;this.fastStopPlayed=false;this.stopNodes('win');}if(!this.context||this.context.state==='closed'||this.muted||this.disposed||this.playbackSuspended)return;const t=this.context.currentTime,r=this.root;
  if((name==='tap'||name==='bet')&&!this.playSample(name==='bet'&&this.samples.has('bet')?'bet':'tap'))this.tone(r*2.2,t,.045,.06);
  if(name==='start'){this.reelLoop();if(!this.playSample('spin'))this.tone(r/2,t,.12,.08,'triangle',r);}
  if(name==='move')this.reelLoop();
  if(name==='reel-stop'&&this.nativeBank){let played=false;if(this.nativeBank.indexedStops){if(this.turbo||this.fastStop){if(this.fastStopPlayed)return;played=this.playSample('fast-stop');this.fastStopPlayed=played;}else played=this.playSample('reel-stop-'+index);}else played=this.playSample('reel-stop');if(played)return;}
  if(name==='reel-stop'){for(const node of this.nodes)if(node.group==='reels'&&!node.sample){node.gain.gain.setTargetAtTime(node.baseVolume/(1+(index+1)*.4),t,.04);node.filter.frequency.setTargetAtTime(r*3/(1+(index+1)*.18),t,.04);}if(!this.playSample('reel-stop')){this.tone(r+index*24,t,.075,.16,'triangle',(r+index*24)*.55);this.tone(r*2+index*35,t+.018,.07,.025);}}
  if(name==='wheel-tick'&&!this.nativeAudio&&!this.samples.has('wheel-stop'))this.tone(r*2.4,t,.025,.03,'triangle');
  if(name==='wheel-stop'&&!this.nativeAudio&&!this.playSample('wheel-stop')){this.tone(r*2,t,.2,.12,'triangle');this.tone(r*3,t+.04,.16,.05);}
  if(name==='multiplier'&&!this.nativeAudio&&!this.samples.has('wheel-stop'))this.tone(r*2**(index/12),t,.22,.055);
  if((name==='wild'||name==='bonus')&&![...this.nodes].some(node=>node.group==='win'&&node.sample)){[0,7,12,19].forEach((n,i)=>this.tone(r*2**(n/12),t+i*.08,.23,.07,'sine',r*2**(n/12),'win'));}
  if(name==='error'){this.tone(180,t,.16,.08,'triangle',110);}
 }
 win(amount,bet){if(!(amount>0))return;this.stop('win');const ratio=amount/Math.max(.01,bet);if(this.nativeBank){if(this.nativeBank.multiplierOnWin)this.playSample('win-multiplier',{group:'win'});const name=this.gameId==='multi_hot_5_video'?(ratio>25?'big-win':ratio>5?'win-medium':'win'):(ratio>100?'win-5':ratio>50?'win-4':ratio>30?'win-3':ratio>15?'win-2':'win');if(this.playSample(name,{group:'win'}))return;}if(this.playSample(ratio>=20?'big-win':'win',{group:'win'}))return;const notes=ratio>=50?[0,4,7,12,16,19,24,19,24]:ratio>=20?[0,4,7,12,16,19]:ratio>=5?[0,4,7,12,16]:[0,4,7,12];if(!this.context)return;const t=this.context.currentTime;notes.forEach((step,i)=>{const f=this.root*2**(step/12);this.tone(f,t+i*.105,.32,.12,'triangle',f,'win');this.tone(f*2,t+i*.105,.2,.018,'sine',f*2,'win');});}
 release(node){this.nodes.delete(node);this.retiring.delete(node);try{node.osc.disconnect();node.filter?.disconnect();node.gain.disconnect();}catch{}}
 stopNodes(group){for(const node of [...this.nodes])if(!group||node.group===group){node.cancelled=true;this.nodes.delete(node);if(!this.disposed&&this.context?.state==='running'&&node.gain.gain.cancelScheduledValues){const now=this.context.currentTime;this.retiring.add(node);try{node.gain.gain.cancelAndHoldAtTime?.(now);if(!node.gain.gain.cancelAndHoldAtTime){node.gain.gain.cancelScheduledValues(now);node.gain.gain.setValueAtTime(node.gain.gain.value,now);}node.gain.gain.linearRampToValueAtTime(0,now+.015);node.osc.stop(now+.018);continue;}catch{}}try{node.osc.stop();}catch{}this.release(node);}}
 stop(group){if(!group||group==='background'){this.saveBackgroundPhase();if(!group)this.backgroundEnabled=false;}if(!group||group==='reels'){this.reelWanted=false;this.reelPhase=0;this.reelElapsed=0;this.reelElapsedClock=this.context?.currentTime||0;this.reelPeriod=0;this.reelSampleEnded=false;}this.stopNodes(group);}
 async dispose(){this.disposed=true;this.stop();for(const node of [...this.retiring]){try{node.osc.stop();}catch{}this.release(node);}this.noise=null;this.samples.clear();this.backgroundBuffer=null;this.backgroundLoad=null;this.backgroundFailureContext=null;this.backgroundPhase=0;await this.context?.close().catch(()=>{});}
}
