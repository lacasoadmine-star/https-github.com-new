// Time-based presentation only. STOP changes time, never the round or its target.
export class ReelMotion {
 constructor(profile,columns){this.profile=profile;this.columns=columns;this.active=false;this.fast=false;this.elapsed=0;this.stopped=new Set();this.wheelStopped=false;}
 begin(stops,wheel,now){this.targets=stops.slice();this.wheel=wheel;this.started=now;this.last=now;this.elapsed=0;this.fast=false;this.active=true;this.stopped.clear();this.wheelStopped=false;}
 speedUp(){if(this.active)this.fast=true;}
 advance(now){const dt=Math.min(80,Math.max(0,now-this.last));this.last=now;this.elapsed+=dt*(this.fast?5:1);const max=Math.max(this.profile.duration+(this.columns-1)*this.profile.stagger,this.profile.wheelEnd);if(this.elapsed>=max)this.active=false;return this.elapsed;}
 position(col){const delay=(this.profile.startStagger||0)*col,duration=this.profile.duration+col*this.profile.stagger-delay,p=Math.max(0,Math.min(1,(this.elapsed-delay)/duration)),travel=(this.profile.travel||18)+col;return {p,offset:travel*motionEase(p),travel,started:this.elapsed>=delay,landed:p>=1};}
 wheelProgress(){return Math.min(1,this.elapsed/this.profile.wheelEnd);}
 resume(now){this.last=now;}
 cancel(){this.active=false;}
}
export class Particles {
 constructor(){this.items=[];}
 burst(size=45){this.items=Array.from({length:Math.min(90,size)},(_,i)=>({x:210,y:440,vx:Math.sin(i*2.399)*(.8+(i%5)*.24),vy:-2.3-(i%9)*.24,age:0,ttl:900+(i%7)*170,r:2+i%3}));}
 draw(c,dt){this.items=this.items.filter(p=>p.age<p.ttl);for(const p of this.items){p.age+=dt;p.vy+=dt*.003;p.x+=p.vx*dt*.06;p.y+=p.vy*dt*.06;c.globalAlpha=Math.max(0,1-p.age/p.ttl);c.fillStyle=p.r%2?'#ffea8a':'#f7b62a';c.save();c.translate(p.x,p.y);c.rotate(p.age*.005);c.fillRect(-p.r,-p.r,p.r*2,p.r*2);c.restore();}c.globalAlpha=1;}
 clear(){this.items=[];}
}

export function motionEase(p){return p<.2?Math.pow(p/.2,2)*.1:p<.7?.1+(p-.2)*1.5:.85+.15*(1-Math.pow((1-p)/.3,3));}
