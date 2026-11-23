/** Procedural Web Audio, zero external sound files. Activated only by a user gesture. */
export class AudioEngine{
  constructor(){this.context=null;this.master=null;this.muted=false;this.volume=.55;this.impulse=null;this.spinLoop=null;this.theme='classic';this.noiseBuffers=new Map();
    try{const saved=JSON.parse(localStorage.getItem('sw-audio-settings')||'null');if(saved){this.muted=saved.muted===true;if(Number.isFinite(saved.volume))this.volume=Math.max(0,Math.min(1,saved.volume));}}catch{}}
  async ensure(){
    if(!this.context){
      const C=window.AudioContext||window.webkitAudioContext;
      if(!C)throw new Error('WEB_AUDIO_UNAVAILABLE');
      this.context=new C({latencyHint:'interactive'});
      this.master=this.context.createGain();this.master.gain.value=this.muted?0:this.volume;
      this.master.connect(this.context.destination);
    }
    if(this.context.state==='suspended'||this.context.state==='interrupted')await this.context.resume();
  }
  setTheme(game){this.theme=game==='hot_foxy_20'?'forest':game==='multi_hot_5_video'?'multi5':game==='multi_hot_40'?'multi40':game==='burning_ice'?'ice':game==='wild_multi_stars'?'stars':'classic';}
  save(){try{localStorage.setItem('sw-audio-settings',JSON.stringify({muted:this.muted,volume:this.volume}));}catch{}}
  applyVolume(){if(this.master){const t=this.context.currentTime;this.master.gain.cancelScheduledValues(t);this.master.gain.setTargetAtTime(this.muted?0:this.volume,t,.015);}this.save();}
  mute(flag){this.muted=Boolean(flag);this.applyVolume();}
  setVolume(value){const n=Number(value);if(!Number.isFinite(n))return;this.volume=Math.max(0,Math.min(1,n));this.applyVolume();}
  stopReelSpin(){const loop=this.spinLoop;if(!loop)return;this.spinLoop=null;const t=this.context.currentTime;loop.gain.gain.cancelScheduledValues(t);loop.gain.gain.setTargetAtTime(.0001,t,.025);loop.source.stop(t+.15);}

  note(freq,when,duration=.21,volume=.10,type='triangle',dest=this.master){
    if(!this.context)return;
    const c=this.context,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,when);
    g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),when+.012);
    g.gain.exponentialRampToValueAtTime(.0001,when+duration);
    o.connect(g).connect(dest);o.onended=()=>{o.disconnect();g.disconnect();};o.start(when);o.stop(when+duration+.012);
  }
  noise(seconds){
    if(this.noiseBuffers.has(seconds))return this.noiseBuffers.get(seconds);
    const ctx=this.context,len=Math.ceil(ctx.sampleRate*seconds),b=ctx.createBuffer(1,len,ctx.sampleRate),out=b.getChannelData(0);
    const bytes=new Uint32Array(Math.min(8192,len));
    for(let i=0;i<len;){crypto.getRandomValues(bytes);for(let j=0;j<bytes.length&&i<len;j++,i++)out[i]=bytes[j]/2147483648-1;}
    if(this.noiseBuffers.size<12)this.noiseBuffers.set(seconds,b);return b;
  }
  hiss({duration=.25,frequency=1400,endFrequency=280,filterType='bandpass',volume=.09,when}={}){
    if(!this.context)return;
    const c=this.context,t=when??c.currentTime,src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
    src.buffer=this.noise(duration+.01);f.type=filterType;f.Q.value=.8;
    f.frequency.setValueAtTime(frequency,t);f.frequency.exponentialRampToValueAtTime(Math.max(35,endFrequency),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+.018);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.connect(f).connect(g).connect(this.master);src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};src.start(t);src.stop(t+duration+.01);
  }
  playReelSpin(){
    if(!this.context)return;this.stopReelSpin();
    const c=this.context,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    source.buffer=this.noise(.65);source.loop=true;filter.type='bandpass';filter.frequency.value=this.theme==='forest'?540:this.theme==='multi5'?780:920;filter.Q.value=.55;gain.gain.value=.065;
    source.connect(filter).connect(gain).connect(this.master);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start();this.spinLoop={source,gain};
  }
  playWheelWhoosh(){this.hiss({duration:1.35,frequency:240,endFrequency:4200,filterType:'lowpass',volume:.09});}
  playWheelClick(){const t=this.context?.currentTime??0;this.note(880,t,.042,.032,'square');}
  playReelStop(column=0){
    if(!this.context)return;
    const t=this.context.currentTime,c=this.context,o=c.createOscillator(),g=c.createGain();o.type='sawtooth';
    o.frequency.setValueAtTime((this.theme==='forest'?240:180)+Math.min(4,Math.max(0,column))*22,t);o.frequency.exponentialRampToValueAtTime(56,t+.09);
    g.gain.setValueAtTime(.20,t);g.gain.exponentialRampToValueAtTime(.0001,t+.09);
    o.connect(g).connect(this.master);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+.1);
    this.hiss({duration:.055,frequency:1500,endFrequency:470,volume:.065});
  }
  playWinChime(win=1,bet=1){
    if(!this.context||!Number.isFinite(win)||win<=0)return;
    const ratio=win/Math.max(.01,Number(bet)||1),t=this.context.currentTime;
    const root=this.theme==='forest'?587.33:this.theme==='multi5'?523.25:this.theme==='multi40'?493.88:this.theme==='ice'?440:this.theme==='stars'?622.25:523.25;
    const melody=ratio>=10?[0,4,7,12,7,12,16]:[0,4,7,12];
    melody.forEach((step,i)=>{const f=root*2**(step/12);this.note(f,t+i*.11,.36,.075,'triangle');this.note(f*2,t+i*.11,.2,.018,'sine');});
    if(ratio>=5)this.note(root/2,t,.65,.06,'sine');
  }
  playGambleLoss(){if(!this.context)return;const t=this.context.currentTime;[392,293.66].forEach((f,i)=>this.note(f,t+i*.13,.2,.045,'sine'));}
  convolver(){
    if(this.impulse)return this.impulse;
    const c=this.context,len=Math.floor(c.sampleRate*.95),b=c.createBuffer(2,len,c.sampleRate);
    for(let ch=0;ch<2;ch++){
      const a=b.getChannelData(ch),buf=new Uint32Array(4096);
      for(let i=0;i<len;){crypto.getRandomValues(buf);for(let j=0;j<buf.length&&i<len;j++,i++)a[i]=(buf[j]/2147483648-1)*Math.pow(1-i/len,2);}
    }
    const rv=c.createConvolver();rv.buffer=b;const wet=c.createGain();wet.gain.value=.16;rv.connect(wet).connect(this.master);
    this.impulse=rv;return rv;
  }
  playJackpot(){
    if(!this.context)return;
    const t=this.context.currentTime,rv=this.convolver();
    [523.25,659.25,783.99,1046.5,1318.5,1567.98].forEach((f,i)=>{
      const start=t+i*.18;this.note(f,start,.70,.095,'triangle');this.note(f/2,start,.38,.045,'sawtooth',rv);
    });
    this.hiss({duration:1.45,frequency:1600,endFrequency:4700,volume:.045});
  }
  playGambleFlip(){
    if(!this.context)return;
    this.hiss({duration:.08,frequency:3200,endFrequency:520,volume:.17});
    const t=this.context.currentTime,c=this.context,o=c.createOscillator(),g=c.createGain();o.type='triangle';
    o.frequency.setValueAtTime(800,t);o.frequency.exponentialRampToValueAtTime(200,t+.08);
    g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.0001,t+.08);
    o.connect(g).connect(this.master);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+.09);
  }
  playBonusPick(){if(!this.context)return;[392,523,659,784].forEach((f,i)=>this.note(f,this.context.currentTime+i*.08,.35,.10));}
}

