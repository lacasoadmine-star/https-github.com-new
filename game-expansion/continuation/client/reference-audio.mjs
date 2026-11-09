import {arcadeSoundCue} from '../presentation/arcade/event-media.mjs';
import {smartSoftSoundCue} from '../presentation/smartsoft-event-media.mjs';
import {supportsSmartSoftMotion} from '../presentation/smartsoft-motion.mjs';
// Decode only hash-verified audio declared by this game's manifest. A missing
// cue stays silent; another title's sound is never substituted.
export function soundKey(manifest,event,column=0){
 if(supportsSmartSoftMotion(manifest?.id))return smartSoftSoundCue(manifest,event,{column})?.key??null;
 if(['towerx_native','towerrush_native','coinminer_native'].includes(manifest?.id))return arcadeSoundCue(manifest,event)?.key??null;
 const names=Object.keys(manifest?.audio||{}),first=patterns=>patterns.map(pattern=>names.find(name=>pattern.test(name))).find(Boolean)||null;
 if(event==='music')return first([/^Start\/Background\.mp3$/i,/^background-music\.mp3$/i]);
 if(event==='spin-start')return first([/^Buttons\/Spin\.mp3$/i,/spin.?start/i]);
 if(event==='reel-stop')return names.includes('Start/ReelStop'+(column%3+1)+'.mp3')?'Start/ReelStop'+(column%3+1)+'.mp3':first([/^Start\/Column\.mp3$/i,/reel.?stop/i]);
 if(event==='win')return first([/^Start\/Win1\.mp3$/i,/^Start\/Line\.mp3$/i,/win.?small/i]);
 if(event==='collect')return first([/^Buttons\/DoubleTake\.mp3$/i,/collect/i]);
 if(event==='gamble-win')return first([/^Double\/Win\.mp3$/i]);
 if(event==='gamble-loss')return first([/^Double\/Lose\.mp3$/i]);
 if(event==='freeze')return first([/^Start\/Ice1\.mp3$/i]);
 return first([/^Buttons\/Button\.mp3$/i]);
}
export function audioPreloadFiles(manifest,{maxBytes=1024*1024,maxFiles=8}={}){
 const selected=[],seen=new Set();let bytes=0;
 for(const[event,column]of[['spin-start',0],['reel-stop',0],['reel-stop',1],['reel-stop',2],['button',0],['pick',0],['win',0],['collect',0]]){
  const key=soundKey(manifest,event,column),file=manifest?.audio?.[key]?.file,entry=manifest?.files?.[file];
  if(!entry||seen.has(file)||!Number.isSafeInteger(entry.bytes)||entry.bytes<=0)continue;
  if(selected.length>=maxFiles||bytes+entry.bytes>maxBytes)continue;
  selected.push(file);seen.add(file);bytes+=entry.bytes;
 }
 return selected;
}
export class ReferenceAudio {
 constructor({contextFactory=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)(),isVisible=()=>globalThis.document?.visibilityState!=='hidden'}={}){this.contextFactory=contextFactory;this.isVisible=isVisible;this.context=null;this.manifest=null;this.store=null;this.buffers=new Map();this.active=new Set();this.musicNode=null;this.enabled=true;this.musicEnabled=true;this.unlocked=false;this.resuming=null;this.epoch=0;}
 bind(manifest,store){if(this.manifest===manifest&&this.store===store)return;this.stop();this.epoch++;this.manifest=manifest;this.store=store;this.buffers.clear();}
 async preload({includeMuted=false}={}){
  // Bytes only: this does not create/resume an AudioContext or play a sound.
  // Music and unobserved cues are excluded; the selected game's hash gate and
  // request queue remain authoritative. Failure never blocks a wager control.
  const epoch=this.epoch,store=this.store;if(!store?.loadBytes||!this.enabled&&!includeMuted)return {loaded:0};
  const files=audioPreloadFiles(this.manifest);
  const results=await Promise.allSettled(files.map(file=>store.loadBytes(file,{priority:-1})));
  return {loaded:epoch===this.epoch?results.filter(result=>result.status==='fulfilled').length:0};
 }
 async unlock({prime=false}={}){
  if(!this.enabled||!this.isVisible())return false;
  const epoch=this.epoch;
  try{
   this.context??=this.contextFactory();
   if(!this.unlocked||this.context.state==='suspended'){
    this.resuming??=(async()=>{if(this.context.state==='suspended')await this.context.resume();this.unlocked=true;return true;})().finally(()=>{this.resuming=null;});
    await this.resuming;
   }
   if(!this.enabled||!this.isVisible()||epoch!==this.epoch)return false;
   if(prime){void this.prime().catch(()=>{});void this.music().catch(()=>{});}else await this.music();
   return true;
  }catch{return false;}
 }
 async prime(){
  if(!this.context||!this.unlocked||!this.enabled)return;
  const files=new Set(audioPreloadFiles(this.manifest));
  await Promise.allSettled(Object.entries(this.manifest?.audio||{}).filter(([,entry])=>files.has(entry.file)).map(([key])=>this.buffer(key)));
 }
 settings({sound=this.enabled,music=this.musicEnabled}={}){this.enabled=sound;this.musicEnabled=music;if(!sound)this.stop();else if(!music)this.stopMusic();else void this.music();}
 async buffer(key){if(this.buffers.has(key))return this.buffers.get(key);const store=this.store,context=this.context,entry=this.manifest?.audio?.[key];if(!store||!context||!entry)return null;const pending=store.loadBytes(entry.file).then(bytes=>context.decodeAudioData(bytes.slice(0)));this.buffers.set(key,pending);try{return await pending;}catch{this.buffers.delete(key);return null;}}
 async play(event,{column=0,loop,volume,turbo=false,fast=false}={}){
  const native=supportsSmartSoftMotion(this.manifest?.id),cue=native?smartSoftSoundCue(this.manifest,event,{column,turbo,fast}):arcadeSoundCue(this.manifest,event),key=cue?.key??(native?null:soundKey(this.manifest,event,column)),shouldLoop=loop??cue?.loop??false,epoch=this.epoch,gainValue=volume??cue?.volume??.4;
  if(!key||!this.enabled||!this.context||!this.isVisible()||shouldLoop&&!this.musicEnabled)return false;
  if(!this.unlocked&&this.resuming)await this.resuming.catch(()=>{});
  if(!this.unlocked||epoch!==this.epoch||!this.enabled||!this.isVisible())return false;
  const buffer=await this.buffer(key);if(!buffer||epoch!==this.epoch||!this.enabled||!this.isVisible()||shouldLoop&&!this.musicEnabled)return false;
  if(shouldLoop&&this.musicNode)return false;
  const offset=cue?.offsetSeconds??0,duration=cue?.durationSeconds;
  if(!Number.isFinite(offset)||offset<0||duration!==undefined&&(!Number.isFinite(duration)||duration<=0)||Number.isFinite(buffer.duration)&&(offset>=buffer.duration||duration!==undefined&&offset+duration>buffer.duration+.002))return false;
  try{const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.loop=shouldLoop;gain.gain.value=Math.max(0,Math.min(1,gainValue));source.connect(gain);gain.connect(this.context.destination);source.onended=()=>{this.active.delete(source);source.disconnect();gain.disconnect();if(this.musicNode===source)this.musicNode=null;};this.active.add(source);if(shouldLoop)this.musicNode=source;if(duration===undefined)source.start(0,offset);else source.start(0,offset,duration);return true;}catch{return false;}
 }
 music(){return this.play('music',{loop:true,...(supportsSmartSoftMotion(this.manifest?.id)?{}:{volume:.16})});}
 stopMusic(){const node=this.musicNode;this.musicNode=null;if(node){try{node.stop();}catch{}this.active.delete(node);}}
 stop(){this.epoch++;this.stopMusic();for(const node of this.active)try{node.stop();}catch{}this.active.clear();}
 dispose(){this.stop();this.buffers.clear();this.manifest=null;this.store=null;try{void this.context?.close();}catch{}this.context=null;this.unlocked=false;}
}
