// Original synthesized music and effects; no provider audio is copied.
export class Sound {
  constructor(){this.enabled=localStorage.getItem('fresh10-sound')!=='off';this.musicEnabled=false;this.timer=null;this.index=0;}
  unlock(){if(!this.context){const Context=window.AudioContext||window.webkitAudioContext;if(Context)this.context=new Context();}if(this.context?.state==='suspended')void this.context.resume();}
  tone(frequency,duration=.1,type='sine',volume=.035){if(!this.enabled||!this.context)return;const c=this.context,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+duration+.02);}
  play(name){this.unlock();if(name==='win'){[523.25,659.25,783.99,1046.5].forEach((f,i)=>setTimeout(()=>this.tone(f,.28,'sine',.04),i*90));}else if(name==='lose'){this.tone(150,.4,'triangle',.04);}else if(name==='step'){this.tone(640,.12,'sine');}else this.tone(name==='spin'?310:450,.08,'triangle',.025);}
  toggle(){this.enabled=!this.enabled;localStorage.setItem('fresh10-sound',this.enabled?'on':'off');if(!this.enabled)this.music(false);return this.enabled;}
  music(on){this.unlock();clearInterval(this.timer);this.musicEnabled=on;if(on){this.enabled=true;this.timer=setInterval(()=>{if(document.hidden)return;const notes=[261.63,329.63,392,493.88,392,329.63,293.66,392];this.tone(notes[this.index++%notes.length],.8,'sine',.009);},600);}return on;}
  dispose(){clearInterval(this.timer);void this.context?.close();}
}
