/** Burn Wilds-specific procedural cues for the accepted presentation timeline.
 * No provider audio or gameplay outcome is synthesized here. */
export class BurnWildsAudio {
  constructor({audioFactory=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)()}={}){
    this.factory=audioFactory;this.context=null;this.effects=false;this.music=false;this.unlocked=false;this.disposed=false;
    this.seen=new Set();this.voices=new Set();this.ambience=null;
  }
  async unlock(){
    if(this.disposed)return false;
    try{this.context??=this.factory();await this.context.resume();if(this.disposed)return false;
      this.unlocked=true;this.updateAmbience();return true;
    }catch{this.unlocked=false;return false;}
  }
  setPreferences({effects=this.effects,music=this.music}={}){
    this.effects=effects===true;this.music=music===true;
    if(!this.effects)this.stopVoices();
    this.updateAmbience();
  }
  updateAmbience(){
    if(this.disposed||!this.unlocked||!this.music||!this.context){this.stopAmbience();return;}
    if(this.ambience)return;
    try{
      const o=this.context.createOscillator(),g=this.context.createGain(),t=this.context.currentTime;
      o.type='sine';o.frequency.setValueAtTime(73,t);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.008,t+.18);
      o.connect(g);g.connect(this.context.destination);o.start(t);this.ambience={o,g};
    }catch{this.stopAmbience();}
  }
  stopAmbience(){if(!this.ambience)return;const{o,g}=this.ambience;this.ambience=null;try{o.stop();}catch{}try{o.disconnect();g.disconnect();}catch{}}
  stopVoices(){for(const {o,g} of this.voices){try{o.stop();}catch{}try{o.disconnect();g.disconnect();}catch{}}this.voices.clear();}
  cue(name,id,{column=0}={}){
    if(this.disposed||!this.unlocked||!this.effects||!this.context)return false;
    const key=name+':'+id;
    if(this.seen.has(key))return false;this.seen.add(key);
    if(this.seen.size>512)this.seen.delete(this.seen.values().next().value);
    const tones={spin:[170,.20],stop:[260,.045],reel:[280+Math.min(4,Math.max(0,column))*42,.075],reels:[320,.085],ignite:[110,.22],
      expanded:[590,.15],win:[830,.42],loss:[165,.08],button:[600,.045],error:[105,.18]};
    const [frequency,duration]=tones[name]??tones.button,c=this.context,t=c.currentTime;
    let o,g;
    try{
      o=c.createOscillator();g=c.createGain();o.type=name==='ignite'?'sawtooth':'sine';
      o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(45,frequency*(name==='win'?1.6:.72)),t+duration);
      g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.075,t+.012);
      g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(c.destination);
      const voice={o,g};this.voices.add(voice);o.onended=()=>{this.voices.delete(voice);try{o.disconnect();g.disconnect();}catch{}};
      o.start(t);o.stop(t+duration+.02);return true;
    }catch{try{o?.disconnect();g?.disconnect();}catch{}return false;}
  }
  event(type,details={}){
    const name=({'spin':'spin','stop-request':'stop','reel-stop':'reel','original-grid':'reels','burn-start':'ignite',
      'column-expanded':'expanded','settled':'win','rejected':'error'})[type];
    if(!name)return false;
    const id=(details.roundId??details.requestKey??'')+':'+(details.column??'');
    if(type==='settled'&&!(Number.isSafeInteger(details.winMinor)&&details.winMinor>0))return this.cue('loss',id);
    return this.cue(name,id,details);
  }
  async pause(){
    this.stopVoices();this.stopAmbience();this.unlocked=false;
    try{await this.context?.suspend();}catch{}
  }
  async resume(){
    if(this.disposed||!this.context)return false;
    try{await this.context.resume();this.unlocked=true;this.updateAmbience();return true;}catch{return false;}
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;this.unlocked=false;
    this.stopVoices();this.stopAmbience();this.seen.clear();
    try{this.context?.close();}catch{}
  }
}

