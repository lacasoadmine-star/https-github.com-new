import {makeAtlas,drawBackground,gold,leaf} from './art.mjs';
import {gridFromStops} from './contract.mjs';
import {ReelMotion,Particles} from './motion.mjs';
const TAU=Math.PI*2;
export class MachineRenderer {
 constructor(canvas,g,audio){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw Error('CANVAS_UNAVAILABLE');this.game=g;this.audio=audio;this.atlas=makeAtlas(g);this.background=document.createElement('canvas');this.background.width=840;this.background.height=1800;const b=this.background.getContext('2d');b.scale(2,2);drawBackground(b,g);this.motion=new ReelMotion(g.visual,g.reels);this.particles=new Particles();this.grid=gridFromStops(g,Array(g.reels).fill(0));this.result=null;this.frame=0;this.last=0;this.running=true;this.wheel=1;this.lastTick=0;this.lastMove=0;this.presentedAt=0;this.stats={frames:0,slowFrames:0,maxDelta:0};this.resize();this.loop=this.loop.bind(this);this.frame=requestAnimationFrame(this.loop);this.onLost=e=>{e.preventDefault();this.contextLost=true;this.pause();this.onContextState?.(true);};this.onRestored=()=>{this.contextLost=false;this.resize();this.resume();this.onContextState?.(false);};canvas.addEventListener?.('contextlost',this.onLost);canvas.addEventListener?.('contextrestored',this.onRestored);}
 resize(){const width=this.canvas.getBoundingClientRect().width||420,dpr=Math.min(2,devicePixelRatio||1);this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(width*900/420*dpr);this.ctx.setTransform(this.canvas.width/420,0,0,this.canvas.height/900,0,0);}
 start(result){if(this.motion.active)throw Error('ANIMATION_ALREADY_ACTIVE');this.result=result;this.presentedAt=0;this.particles.clear();this.motion.begin(result.stops,result.wheelMultiplier,performance.now());this.audio.event('start');this.lastTick=-1;this.lastMove=0;return new Promise(resolve=>{this.resolve=resolve;});}
 speedUp(){this.motion.speedUp();}
 pause(){this.running=false;cancelAnimationFrame(this.frame);this.audio.stop();}
 resume(){if(this.running||this.contextLost)return;this.running=true;this.last=performance.now();this.motion.resume(this.last);this.frame=requestAnimationFrame(this.loop);}
 loop(now){if(!this.running)return;const dt=this.last?Math.min(80,now-this.last):16;this.last=now;this.stats.frames++;if(dt>24)this.stats.slowFrames++;this.stats.maxDelta=Math.max(this.stats.maxDelta,dt);
  const wasActive=this.motion.active;if(wasActive){this.motion.advance(now);for(let c=0;c<this.game.reels;c++){if(this.motion.position(c).landed&&!this.motion.stopped.has(c)){this.motion.stopped.add(c);this.audio.event('reel-stop',c);}}
   if(this.motion.wheelProgress()>=1&&!this.motion.wheelStopped){this.motion.wheelStopped=true;this.wheel=this.result.wheelMultiplier;this.audio.event('wheel-stop');this.audio.event('multiplier',this.wheel);}
   const tick=Math.floor(this.motion.elapsed/90);if(tick!==this.lastTick&&!this.motion.wheelStopped){this.lastTick=tick;this.audio.event('wheel-tick');}
   if(this.motion.elapsed-this.lastMove>100&&this.motion.stopped.size<this.game.reels){this.lastMove=this.motion.elapsed;this.audio.event('move');}
  }
  if(wasActive&&!this.motion.active)this.grid=this.result.grid;
  this.draw(now,dt);
  if(wasActive&&!this.motion.active){this.grid=this.result.grid;this.presentedAt=now;const win=Number(this.result.finalWin);if(win>0){this.particles.burst(win/Number(this.result.bet)>=20?80:35);this.audio.win(win,Number(this.result.bet));}if(this.result.winLines.some(w=>w.wilds>0))this.audio.event('wild');if(this.result.bonusSpinsAwarded>0)this.audio.event('bonus');const resolve=this.resolve;this.resolve=null;resolve?.(this.result);}
  this.frame=requestAnimationFrame(this.loop);
 }
 text(text,x,y,size,color='#fff1ad',font='Georgia',align='center'){const c=this.ctx;c.font=`900 ${size}px ${font}`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(text,x,y);}
 draw(now,dt){const c=this.ctx,g=this.game,v=g.visual;c.drawImage(this.background,0,0,420,900);this.title();this.drawWheel(now);this.drawReels(now);if(!this.motion.active&&this.result&&this.presentedAt){this.paylines(now);this.win(now);}this.particles.draw(c,dt);}
 title(){const c=this.ctx,g=this.game,v=g.visual;c.save();c.shadowColor='#dcd46b66';c.shadowBlur=10;c.strokeStyle='#554013';c.lineWidth=3;c.textAlign='center';c.textBaseline='middle';
  if(g.id==='hot_foxy_20'){c.font='italic 900 37px Georgia';c.strokeText('Hot Foxy',195,43);c.fillStyle=gold(c,20);c.fillText('Hot Foxy',195,43);this.text('20',327,46,25,'#ffdb5c');leaf(c,110,36,.55,-.6);}
  else {c.font='900 32px Georgia';c.strokeText('MULTI HOT',200,100);c.fillStyle=gold(c,80);c.fillText('MULTI HOT',200,100);this.text('5',326,100,36,'#ef3d90');this.text('MULTIPLIER',43,133,7,'#e6d49a');this.text('5 LINES FIXED',398,133,8,'#e6d49a','Georgia','right');}c.restore();}
 drawReels(now){const c=this.ctx,g=this.game,v=g.visual,cw=v.w/g.reels,ch=v.h/g.rows;c.save();c.shadowColor='#75f7b355';c.shadowBlur=10;c.fillStyle='#003727';c.fillRect(v.x,v.y,v.w,v.h);c.lineWidth=g.id==='hot_foxy_20'?4:3;c.strokeStyle=gold(c,v.y);c.strokeRect(v.x,v.y,v.w,v.h);c.shadowBlur=0;
  for(let col=0;col<g.reels;col++){
   c.save();c.beginPath();c.rect(v.x+col*cw+1,v.y+2,cw-2,v.h-4);c.clip();const grd=c.createLinearGradient(v.x+col*cw,0,v.x+(col+1)*cw,0);grd.addColorStop(0,'#001f1e');grd.addColorStop(.45,g.id==='hot_foxy_20'?'#176a40':'#005b37');grd.addColorStop(1,'#002b22');c.fillStyle=grd;c.fillRect(v.x+col*cw,v.y,cw,v.h);
   const moving=this.motion.active&&!this.motion.position(col).landed;let fraction=0,whole=0,bounce=0;
   if(moving){const p=this.motion.position(col),position=this.result.stops[col]+p.travel-p.offset;whole=Math.floor(position);fraction=position-whole;bounce=p.p>.92?Math.sin((p.p-.92)/.08*Math.PI)*2:0;}
   for(let row=moving?-1:0;row<(moving?g.rows+1:g.rows);row++){
    const strip=g.strips[col],name=moving?strip[(whole+row-1+strip.length)%strip.length]:(this.result&&this.motion.active?this.result.grid:this.grid)[row][col],sprite=this.atlas.get(name);
    const size=Math.min(cw*.94,ch*.94),x=v.x+col*cw+(cw-size)/2,y=v.y+(row-fraction)*ch+(ch-size)/2+bounce;
    if(moving&&this.motion.position(col).p<.7){c.globalAlpha=.12;c.drawImage(sprite,x,y-9,size,size);c.drawImage(sprite,x,y+9,size,size);c.globalAlpha=.9;}else c.globalAlpha=1;c.drawImage(sprite,x,y,size,size);
   }
   c.restore();if(col){c.strokeStyle='#c6b15b88';c.lineWidth=1;c.beginPath();c.moveTo(v.x+col*cw,v.y);c.lineTo(v.x+col*cw,v.y+v.h);c.stroke();}
  }
  const shade=c.createLinearGradient(0,v.y,0,v.y+v.h);shade.addColorStop(0,'#001a12aa');shade.addColorStop(.09,'#0000');shade.addColorStop(.91,'#0000');shade.addColorStop(1,'#001a12aa');c.fillStyle=shade;c.fillRect(v.x,v.y,v.w,v.h);c.restore();}
 drawWheel(){const c=this.ctx,g=this.game,v=g.visual,active=this.motion.active&&!this.motion.wheelStopped;
  const progress=this.motion.wheelProgress(),phase=active?this.result.wheelMultiplier+20*(1-(1-Math.pow(1-progress,3))):this.wheel,selected=active?Math.floor(phase):this.wheel,frac=active?phase-Math.floor(phase):0;
  const value=n=>((n-1)%5+5)%5+1;
  if(g.wheel.position==='side'){
   c.save();c.beginPath();c.rect(12,v.y,62,v.h);c.clip();for(let i=-2;i<=2;i++){const y=v.y+v.h/2+(i-frac)*v.h/3;c.fillStyle='#02462e';c.fillRect(12,y-v.h/6+2,62,v.h/3-4);c.strokeStyle='#b6a765';c.lineWidth=2;c.strokeRect(12,y-v.h/6+2,62,v.h/3-4);c.globalAlpha=i===0?1:.42;this.text(value(selected+i)+'×',43,y,36,g.id==='multi_hot_5_video'?'#c8df6b':'#e5d99a');c.globalAlpha=1;}c.restore();c.strokeStyle='#eb2b89';c.lineWidth=5;c.strokeRect(10,v.y+v.h/3,66,v.h/3);c.strokeStyle='#ffde98';c.lineWidth=1;c.strokeRect(14,v.y+v.h/3+4,58,v.h/3-8);
  }else{
   c.save();c.beginPath();c.rect(16,58,388,v.y-58);c.clip();const cx=210,cy=v.y+145,outer=225,inner=133;
   for(let i=-3;i<=3;i++){const center=-Math.PI/2+(i-frac)*.41,left=center-.205,right=center+.205;c.beginPath();c.arc(cx,cy,outer,left,right);c.arc(cx,cy,inner,right,left,true);c.closePath();c.fillStyle=i===0?'#177e44':'#075332';c.fill();c.strokeStyle='#c8c879';c.lineWidth=2;c.stroke();c.save();c.translate(cx,cy);c.rotate(center+Math.PI/2);this.text(value(selected+i)+'×',0,-185,35,i===0?'#ffe180':'#b4cc9e');c.restore();}c.restore();c.beginPath();c.moveTo(172,76);c.lineTo(248,76);c.lineTo(236,v.y-3);c.lineTo(184,v.y-3);c.closePath();c.lineWidth=3;c.strokeStyle=gold(c,76);c.stroke();c.beginPath();c.moveTo(203,v.y+2);c.lineTo(217,v.y+2);c.lineTo(210,v.y-10);c.closePath();c.fillStyle='#ffd651';c.fill();
  }
 }
 paylines(now){const r=this.result;if(!r.winLines.length)return;const elapsed=now-this.presentedAt,which=Math.floor(elapsed/1100)%r.winLines.length,w=r.winLines[which],g=this.game,v=g.visual,c=this.ctx,cw=v.w/g.reels,ch=v.h/g.rows;
  c.save();c.globalAlpha=.65+.35*Math.sin(elapsed/170)**2;c.strokeStyle='#ffe773';c.shadowColor='#ffc523';c.shadowBlur=12;c.lineWidth=2;
  for(const [row,col]of w.positions){c.strokeRect(v.x+col*cw+3,v.y+row*ch+3,cw-6,ch-6);const s=this.atlas.get(this.grid[row][col]),size=Math.min(cw*.96,ch*.96);c.drawImage(s,v.x+col*cw+(cw-size)/2,v.y+row*ch+(ch-size)/2,size,size);}
  c.beginPath();w.rows.forEach((row,col)=>{const x=v.x+(col+.5)*cw,y=v.y+(row+.5)*ch;col?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();c.restore();this.text('LINE '+w.line+'   '+Number(w.win).toFixed(2)+' ETB',210,v.y+v.h+72,11,'#e9e6b3','Arial');}
 win(now){const r=this.result,amount=Number(r.finalWin);if(!(amount>0))return;const ratio=amount/Number(r.bet),elapsed=now-this.presentedAt,progress=Math.min(1,elapsed/(ratio>=20?1800:600)),g=this.game,v=g.visual,c=this.ctx;
  if(g.id==='hot_foxy_20'){c.save();c.fillStyle='#064a37';c.strokeStyle='#92d390';c.lineWidth=2;c.beginPath();c.moveTo(60,407);c.lineTo(360,407);c.lineTo(348,455);c.lineTo(72,455);c.closePath();c.fill();c.stroke();this.text('WIN',210,420,10,'#a8d1a0','Arial');this.text((amount*(1-Math.pow(1-progress,3))).toFixed(2)+' ETB',210,440,17,'#b3f8a5','Arial');c.restore();}
  if(ratio>=20&&elapsed<2600){c.save();c.beginPath();c.rect(v.x+2,v.y+2,v.w-4,v.h-4);c.clip();c.fillStyle='#00180fe6';c.fillRect(v.x,v.y,v.w,v.h);const x=v.x+v.w/2,y=v.y+v.h/2,label=ratio>=50?'MEGA WIN':'BIG WIN';c.strokeStyle=gold(c,y-70);c.lineWidth=2;c.strokeRect(v.x+10,y-82,v.w-20,164);c.shadowColor='#ffc523';c.shadowBlur=14;this.text(label,x,y-43,34,gold(c,y-60));this.text((amount*(1-Math.pow(1-progress,3))).toFixed(2),x,y+8,40,'#fff3ad');this.text('ETB',x,y+53,14,'#f7e3a6','Arial');c.restore();}
 }
 cancelPresentation(){this.motion.cancel();this.particles.clear();this.resolve?.(null);this.resolve=null;}
 dispose(){this.pause();this.canvas.removeEventListener?.('contextlost',this.onLost);this.canvas.removeEventListener?.('contextrestored',this.onRestored);this.cancelPresentation();this.atlas.clear();this.background.width=0;this.background.height=0;}
}
