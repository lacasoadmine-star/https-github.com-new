// Original procedural sound design; no claim that these are provider samples.
export class SuperWildsAudio {
  constructor({audioFactory=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)()}={}){
    this.factory=audioFactory;this.context=null;this.effects=true;this.music=true;this.unlocked=false;this.disposed=false;
    this.seen=new Set();this.voices=new Set();this.ambient=null;
  }
  async unlock(){
    if(this.disposed)return;
    try{this.context??=this.factory();await this.context.resume();this.unlocked=true;this.ambience();}catch{/* A muted/unsupported device never affects accounting. */}
  }
  setting({effects=this.effects,music=this.music}={}){
    this.effects=effects===true;this.music=music===true;
    if(!this.effects)this.stopVoices();
    this.ambience();
  }
  ambience(){
    if(!this.unlocked||!this.music||!this.context||this.disposed){this.stopAmbience();return;}
    if(this.ambient)return;
    const c=this.context,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=110;g.gain.value=.012;
    o.connect(g);g.connect(c.destination);o.start();this.ambient={o,g};
  }
  stopAmbience(){if(!this.ambient)return;try{this.ambient.o.stop();this.ambient.o.disconnect();this.ambient.g.disconnect();}catch{}this.ambient=null;}
  stopVoices(){for(const v of this.voices){try{v.o.stop();v.o.disconnect();v.g.disconnect();}catch{}}this.voices.clear();}
  once(name,id){
    if(this.disposed||!this.effects||!this.unlocked||!this.context)return false;
    const key=`${name}:${id}`;if(this.seen.has(key))return false;this.seen.add(key);
    if(this.seen.size>2048)this.seen.delete(this.seen.values().next().value);
    const tones={button:[600,.045],spin:[140,.20],reel:[240,.07],wheel:[820,.06],win:[660,.45],error:[100,.15]};
    const [frequency,duration]=tones[name]??tones.button,c=this.context,o=c.createOscillator(),g=c.createGain(),t=c.currentTime;
    o.type=name==='spin'?'triangle':'sine';o.frequency.setValueAtTime(frequency,t);
    o.frequency.exponentialRampToValueAtTime(name==='win'?1320:Math.max(45,frequency*.7),t+duration);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(c.destination);const voice={o,g};this.voices.add(voice);
    o.onended=()=>{this.voices.delete(voice);o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.02);return true;
  }
  handle(event){
    const type=event?.type??event?.name;
    const names={SPIN_START:'spin',spin:'spin','spin-start':'spin',reelstop:'reel',REEL_STOP:'reel','reel-stop':'reel',
      WHEEL_STOP:'wheel','wheel-stop':'wheel',wheel:'wheel',WIN:'win',win:'win'};
    if(names[type])return this.once(names[type],`${event.roundId??event.requestKey??''}:${event.column??event.reel??''}`);
    return false;
  }
  async suspend(){this.stopVoices();this.stopAmbience();try{await this.context?.suspend();}catch{}}
  dispose(){this.disposed=true;this.stopVoices();this.stopAmbience();try{this.context?.close();}catch{}}
}
