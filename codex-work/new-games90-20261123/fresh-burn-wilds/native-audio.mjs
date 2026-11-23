/**
 * Burn Wilds licensed-audio event player. This module does not synthesize,
 * sample, borrow or infer sounds from any other slot machine.
 * All event names/sources must come from this game's approved manifest.
 */
const deny=code=>{throw Object.assign(new Error(code),{code});};
const EVENT_RE=/^[a-z][a-z0-9-]{0,49}$/;
export class BurnWildsNativeAudio {
  constructor({sources,origin,makeAudio,now=()=>Date.now(),volume=1}={}) {
    let site;
    try{site=new URL(origin);}catch{deny('BURN_AUDIO_ORIGIN_INVALID');}
    if(site.protocol!=='https:'||site.pathname!=='/'||site.search||site.hash||site.username||site.password)
      deny('BURN_AUDIO_ORIGIN_INVALID');
    if(!sources || typeof sources!=='object' || Array.isArray(sources) ||
       !Object.keys(sources).length || Object.entries(sources).some(([event,url])=>
          !EVENT_RE.test(event) || typeof url!=='string' ||
          (!/^https:\/\/[a-zA-Z0-9.-]+\/new-games90\/media\/burn-wilds\/[a-z0-9/_-]+\.(?:mp3|ogg)$/.test(url) ||
           new URL(url).origin!==site.origin)) ||
       typeof makeAudio!=='function' || typeof now!=='function' ||
       typeof volume!=='number' || !Number.isFinite(volume)||volume<0||volume>1)
       deny('BURN_AUDIO_MANIFEST_INVALID');
    this.sources=Object.freeze({...sources});
    this.makeAudio=makeAudio;this.now=now;this.volume=volume;
    this.muted=true;this.disposed=false;this.active=new Set();this.fired=new Set();
  }
  setMuted(next) {
    if(this.disposed)deny('BURN_AUDIO_DISPOSED');
    this.muted=next===true;
    if(this.muted)for(const audio of this.active){audio.pause?.();}
    return this.muted;
  }
  setVolume(value) {
    if(this.disposed||!Number.isFinite(value)||value<0||value>1)deny('BURN_AUDIO_VOLUME_INVALID');
    this.volume=value;
    for(const audio of this.active)audio.volume=value;
    return value;
  }
  async play(event,roundToken) {
    if(this.disposed || this.muted || !Object.hasOwn(this.sources,event))return false;
    if(typeof roundToken!=='string' || !roundToken || roundToken.length>180)
      deny('BURN_AUDIO_EVENT_TOKEN_REQUIRED');
    const eventId=roundToken+'::'+event;
    if(this.fired.has(eventId))return false;
    const clip=this.makeAudio(this.sources[event]);
    if(!clip||typeof clip.play!=='function'||typeof clip.pause!=='function')
      deny('BURN_AUDIO_CLIP_INVALID');
    this.fired.add(eventId);this.active.add(clip);
    clip.volume=this.volume;
    const done=()=>{this.active.delete(clip);clip.removeEventListener?.('ended',done);};
    clip.addEventListener?.('ended',done,{once:true});
    try{await clip.play();return true;}catch{done();return false;}
  }
  releaseToken(token){
    if(typeof token!=='string'||!token)return;
    for(const entry of this.fired)if(entry.startsWith(token+'::'))this.fired.delete(entry);
  }
  dispose(){
    if(this.disposed)return;
    this.disposed=true;this.muted=true;
    for(const clip of this.active){try{clip.pause();clip.currentTime=0;}catch{}}
    this.active.clear();this.fired.clear();
  }
}
