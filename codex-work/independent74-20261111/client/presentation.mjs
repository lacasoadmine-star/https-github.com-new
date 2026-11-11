// Original presentation policy. These thresholds and melodies are not claimed
// to be SmartSoft's private configuration; payouts always come from the engine.
export function winTier(betMinor,winMinor){
 const bet=BigInt(betMinor),win=BigInt(winMinor);
 if(bet<=0n||win<=0n)return {id:'none',label:'No win',multiplierBps:0};
 const bps=Number(win*10000n/bet);
 return {id:bps>=500000?'fantastic':bps>=200000?'big':bps>=100000?'nice':'win',label:bps>=500000?'Fantastic Win':bps>=200000?'Big Win':bps>=100000?'Nice Win':'Return',multiplierBps:bps};
}
export class GameAudio {
 constructor(){this.context=null;this.enabled=false;this.voices=new Set();this.loop=null;this.lastCue=null;}
 async enable(value){this.enabled=value;if(!value){this.stop();return;}try{const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(C){this.context??=new C();await this.context.resume();}}catch{this.enabled=false;}}
 note(frequency,offset=0,duration=.12,volume=.025,wave='triangle'){
  if(!this.enabled||this.context?.state!=='running')return;
  const o=this.context.createOscillator(),g=this.context.createGain(),t=this.context.currentTime+offset;
  o.type=wave;o.frequency.setValueAtTime(frequency,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g).connect(this.context.destination);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.02);
 }
 cue(kind){this.lastCue=kind;const melodies={spin:[180,240],stop:[330],win:[440,554,659],nice:[523,659,784,1046],big:[392,523,659,784,1046,1318],fantastic:[523,659,784,1046,1318,1568,2093],lose:[196,147]};(melodies[kind]||[]).forEach((f,i)=>this.note(f,i*.085,kind==='fantastic'?.3:.17));}
 spin(){this.stop();this.cue('spin');this.loop=setInterval(()=>this.note(120+Math.random()*70,0,.065,.008),95);}
 endSpin(){clearInterval(this.loop);this.loop=null;}
 stop(){this.endSpin();for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
}
export function animateReels(stage,{turbo=false,reduced=false,onStop=()=>{}}={}){
 let finish,done=false;const timers=[];const columns=[...stage.querySelectorAll('.reel-column')];
 const promise=new Promise(resolve=>{finish=()=>{if(done)return;done=true;timers.forEach(clearTimeout);for(const col of columns){if(col.classList.contains('rolling')){col.classList.remove('rolling');col.classList.add('landed');onStop(Number(col.dataset.column));}}stage.classList.remove('spinning');resolve();};
  stage.classList.add('spinning');columns.forEach(c=>c.classList.add('rolling'));
  const duration=reduced?0:turbo?70:520,stagger=reduced?0:turbo?12:110;
  columns.forEach((col,i)=>timers.push(setTimeout(()=>{if(done)return;col.classList.remove('rolling');col.classList.add('landed');onStop(i);},duration+i*stagger)));
  timers.push(setTimeout(finish,duration+Math.max(0,columns.length-1)*stagger+15));
 });return {promise,stop:()=>finish()};
}
