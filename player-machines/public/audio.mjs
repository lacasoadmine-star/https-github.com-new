// Original Web Audio event score. No remotely downloaded music or provider samples.
export class SoundEngine {
 constructor(root=261.63){this.root=root;this.volume=.5;this.muted=false;this.nodes=new Set();this.events=[];this.disposed=false;}
 async unlock(){if(this.disposed)return;const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;if(!this.context){this.context=new Audio();this.master=this.context.createGain();this.limiter=this.context.createDynamicsCompressor();this.limiter.threshold.value=-13;this.limiter.ratio.value=8;this.master.connect(this.limiter).connect(this.context.destination);this.gain();}if(this.context.state==='suspended')void this.context.resume().catch(()=>{});}
 gain(){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.context.currentTime,.012);}
 setVolume(value){this.volume=Math.max(0,Math.min(1,value));this.gain();}
 toggle(){this.muted=!this.muted;this.gain();if(this.muted)this.stop();return this.muted;}
 tone(frequency,when,duration=.09,volume=.12,type='sine',end=frequency,group='effect'){
  if(!this.context||this.muted||this.disposed)return;const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,when);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),when+duration);gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(volume,when+.009);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);osc.connect(gain).connect(this.master);const node={osc,gain,group};this.nodes.add(node);osc.onended=()=>{osc.disconnect();gain.disconnect();this.nodes.delete(node);};osc.start(when);osc.stop(when+duration+.025);
 }
 event(name,index=0){if(this.events.length>100)this.events.shift();this.events.push({name,index,time:globalThis.performance?.now()||Date.now()});if(!this.context||this.muted)return;const t=this.context.currentTime,r=this.root;
  if(name==='tap'||name==='bet')this.tone(r*2.2,t,.045,.06);
  if(name==='start'){this.stop('win');this.tone(r/2,t,.17,.09,'triangle',r);}
  if(name==='move')this.tone(r/3,t,.07,.015,'triangle',r/4);
  if(name==='reel-stop'){this.tone(r+index*24,t,.13,.13,'triangle',(r+index*24)*.7);this.tone(r*2+index*35,t+.018,.07,.025);}
  if(name==='wheel-tick')this.tone(r*2.4,t,.035,.035,'triangle');
  if(name==='wheel-stop'){this.tone(r*2,t,.2,.12,'triangle');this.tone(r*3,t+.04,.16,.05);}
  if(name==='multiplier')this.tone(r*2**(index/12),t,.22,.055);
  if(name==='wild'||name==='bonus'){[0,7,12,19].forEach((n,i)=>this.tone(r*2**(n/12),t+i*.08,.23,.07,'sine',r*2**(n/12),'win'));}
  if(name==='error'){this.tone(180,t,.16,.08,'triangle',110);}
 }
 win(amount,bet){if(!(amount>0))return;this.stop('win');const ratio=amount/Math.max(.01,bet),notes=ratio>=50?[0,4,7,12,16,19,24,19,24]:ratio>=20?[0,4,7,12,16,19]:ratio>=5?[0,4,7,12,16]:[0,4,7,12];if(!this.context)return;const t=this.context.currentTime;notes.forEach((step,i)=>{const f=this.root*2**(step/12);this.tone(f,t+i*.105,.32,.12,'triangle',f,'win');this.tone(f*2,t+i*.105,.2,.018,'sine',f*2,'win');});}
 stop(group){for(const n of [...this.nodes])if(!group||n.group===group){try{n.osc.stop();}catch{}n.osc.disconnect();n.gain.disconnect();this.nodes.delete(n);}}
 async dispose(){this.disposed=true;this.stop();await this.context?.close().catch(()=>{});}
}
