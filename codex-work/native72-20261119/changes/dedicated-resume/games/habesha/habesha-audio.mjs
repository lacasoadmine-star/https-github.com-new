import {SoundEngine} from '/zplay-native-shared-20261119-r1/native-audio.mjs';
// Only this game's freshly captured MP3s; unsupported cues stay silent.
export class HabeshaAudio extends SoundEngine {
 constructor(){super(261.63,'habesha_fortune_5_native');this.nativeAudio=true;this.audioSamples={};this.volume=1;this.pausedSamples=[];}
 autoStarted(){this.playSample('auto-start');}
 autoStopped(){this.playSample('auto-stop');}
 collected(){this.playSample('collect');}
 event(name,index=0){
  if(name!=='start')return super.event(name,index);
  // The original spin clip belongs to this presentation, so rejection, hiding
  // the page and a new spin can cancel it along with the reels.
  this.stop('win');this.stop('reels');this.fastStop=false;this.fastStopPlayed=false;
  if(this.events.length>=100)this.events.shift();this.events.push({name,index,time:globalThis.performance?.now()||Date.now()});
  this.wantReels();this.playSample('spin',{group:'reels'});
 }
 setSuspended(value){
  value=!!value;if(value===!!this.playbackSuspended)return;
  if(value){
   const now=this.context?.currentTime||0;
   this.pausedSamples=[...this.nodes].filter(n=>n.sample&&n.group!=='background'&&!n.osc.loop).map(n=>({name:n.sample,group:n.group,volume:n.baseVolume,offset:(n.offset||0)+Math.max(0,now-n.startedAt)})).filter(n=>n.offset<(this.samples.get(n.name)?.duration||0));
  }
  super.setSuspended(value);
  if(!value){const pending=this.pausedSamples;this.pausedSamples=[];for(const sample of pending){if(sample.group==='reels'&&[...this.nodes].some(node=>node.group==='reels'))continue;this.playSample(sample.name,sample);}}
 }
 reelLoop(){
  if(!this.reelWanted||this.reelSampleEnded||this.muted||this.playbackSuspended||this.disposed||[...this.nodes].some(node=>node.group==='reels'))return;
  const duration=this.samples.get('spin')?.duration;if(!duration)return;
  const offset=this.currentReelElapsed();if(offset>=duration){this.reelSampleEnded=true;return;}
  // This game has one spin clip, not a looping reel bed. Restore only its
  // remaining portion after focus/unmute; never replay the cue from zero.
  this.playSample('spin',{group:'reels',offset});
 }
 stop(group){this.pausedSamples=(this.pausedSamples||[]).filter(n=>group&&n.group!==group);super.stop(group);}
 remainingWinMs(){
  if(this.muted||this.playbackSuspended||this.disposed||!this.context)return 0;
  let remaining=0;for(const node of this.nodes)if(node.group==='win'&&node.buffer)remaining=Math.max(remaining,node.buffer.duration-(node.offset||0)-(this.context.currentTime-node.startedAt));
  return Math.max(0,Math.ceil(remaining*1000));
 }
 gambleSettled(result){this.stop('win');this.playSample(result.won?'gamble-win':'gamble-lose',{group:'win'});}
 bank(){return this.bankPromise??=fetch(new URL('./habesha-audio.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('HABESHA_AUDIO_UNAVAILABLE');return r.json();});}
 preload(){
  const context=this.context;if(this.disposed||!context?.decodeAudioData||context.state==='closed')return Promise.resolve(false);
  if(this.sampleLoad)return this.sampleLoad;
  this.sampleLoad=this.bank().then(async bank=>{
   if(this.disposed||context!==this.context)return false;
   this.audioSamples=bank.effects;this.nativeBank={indexedStops:true,oneShotReels:true,volumes:{}};
   await Promise.all(Object.entries(bank.effects).map(async([name,path])=>{
    try{const r=await fetch(new URL(path,import.meta.url));if(!r.ok)return;const buffer=await context.decodeAudioData(await r.arrayBuffer());if(!this.disposed&&context===this.context)this.samples.set(name,buffer);}catch{}
   }));
   if(!this.disposed&&context===this.context)this.reelLoop();
   return !this.disposed&&context===this.context&&this.samples.size===Object.keys(bank.effects).length;
  }).catch(()=>false);return this.sampleLoad;
 }
 preloadBackground(){
  const context=this.context;if(!this.backgroundEnabled||this.disposed||!context?.decodeAudioData||context.state==='closed')return Promise.resolve(false);
  if(this.backgroundFailureContext===context)return Promise.resolve(false);
  if(this.backgroundBuffer){this.backgroundLoop();return Promise.resolve(true);}if(this.backgroundLoad)return this.backgroundLoad;
  const pending=this.bank().then(async bank=>{
   const r=await fetch(new URL(bank.background,import.meta.url));if(!r.ok)throw Error('HABESHA_MUSIC_UNAVAILABLE');
   const decoded=await context.decodeAudioData(await r.arrayBuffer());
   if(this.disposed||context!==this.context)return false;
   this.backgroundBuffer=decoded;this.backgroundGain=bank.backgroundGain;this.backgroundLoop();return true;
  }).catch(()=>{if(!this.disposed&&context===this.context)this.backgroundFailureContext=context;return false;}).finally(()=>{if(this.backgroundLoad===pending)this.backgroundLoad=null;});
  this.backgroundLoad=pending;return pending;
 }
 win(amount,bet,multiplier=1){if(!(amount>0))return;this.stop('win');this.playSample(multiplier>1?'win-multiplier':'win',{group:'win'});}
}
