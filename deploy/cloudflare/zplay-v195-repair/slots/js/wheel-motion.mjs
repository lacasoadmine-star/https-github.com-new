import {cruising,landing,sample} from './reel-motion.mjs';

// Presentation only: target values always come from the validated server round.
export class WheelAnimator {
  constructor(element, onTick=()=>{}) {
    this.element=element;this.onTick=onTick;this.phase=0;this.frame=0;
  }
  begin() {
    this.cancel();this.cells=[...this.element.querySelectorAll('.wheel-cell')];
    if(!this.cells.length)return;
    const center=this.cells.findIndex(c=>c.dataset.center==='true');
    this.phase=Math.max(0,center);this.origin=this.phase;this.started=performance.now();
    this.fast=false;this.plan=null;this.running=true;this.lastTick=Math.floor(this.phase);
    this.element.dataset.animating='true';
    this.element.setAttribute('aria-label','Multiplier moving; awaiting confirmed result');
    this.cells.forEach(c=>c.classList.remove('active'));
    const loop=now=>{if(!this.running)return;this.render(now);if(this.running)this.frame=requestAnimationFrame(loop);};
    this.frame=requestAnimationFrame(loop);
  }
  motion(now) {
    if(this.plan)return sample(this.plan,now);
    const m=cruising(now-this.started,10,180);return {...m,position:m.position+this.origin,done:false};
  }
  finish(value,duration=900) {
    if(!this.running)return Promise.resolve();
    const index=this.cells.findIndex(c=>Number(c.dataset.multiplier)===Number(value));
    if(index<0)throw Error('INVALID_WHEEL_RESULT');
    this.target=index;const now=performance.now(),m=this.motion(now),n=this.cells.length;
    const ms=this.fast||matchMedia('(prefers-reduced-motion: reduce)').matches?180:duration;
    const minimum=m.position+m.velocity*ms/2000+1;
    const end=index+Math.ceil((minimum-index)/n)*n;
    this.plan=landing(m.position,m.velocity,now,ms,end);
    return new Promise(resolve=>{this.resolve=resolve;});
  }
  requestStop() {
    this.fast=true;
    if(!this.plan)return;
    const now=performance.now(),m=this.motion(now);
    if(!m.done)this.plan=landing(m.position,m.velocity,now,Math.min(180,Math.max(1,this.plan.start+this.plan.duration-now)),this.plan.to);
  }
  render(now) {
    const m=this.motion(now),n=this.cells.length;this.phase=m.position;
    const tick=Math.floor(this.phase);
    if(tick!==this.lastTick){this.lastTick=tick;this.onTick();}
    this.cells.forEach((cell,index)=>{
      const step=((index-this.phase+n/2)%n+n)%n-n/2;
      cell.style.setProperty('--step',step);
      cell.dataset.visible=String(Math.abs(step)<1.65);
      cell.dataset.center=String(Math.abs(step)<.5);
    });
    if(m.done){
      this.running=false;this.element.dataset.animating='false';
      this.cells.forEach((c,i)=>c.classList.toggle('active',i===this.target));
      this.element.setAttribute('aria-label',`Settled multiplier ${this.cells[this.target].dataset.multiplier} times`);
      this.resolve?.();this.resolve=null;
    }
  }
  cancel() {
    cancelAnimationFrame(this.frame);this.running=false;this.element.dataset.animating='false';
    this.resolve?.();this.resolve=null;
  }
}
