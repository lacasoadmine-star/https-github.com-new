// Presentation only: settled grids enter through the existing controller's
// validateRound call. Pending movement never creates an outcome or wallet value.
import {gridFromStops} from './contract.mjs';
import {ReelMotion,Particles} from './motion.mjs';
import {createNativeAnimation} from './native-animation-runtime.mjs';
import {habeshaLayout,pendingReelPhase,settledReelPhase,reelPhaseAt} from './habesha-layout.mjs';
const base=new URL('./',import.meta.url);
const image=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('HABESHA_IMAGE_UNAVAILABLE'));i.src=src;});
export class HabeshaRenderer {
 constructor(canvas,game,audio){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw Error('CANVAS_UNAVAILABLE');
  this.game=game;this.machineId=game.id;this.audio=audio;this.atlas=new Map();this.sprites=new Map();this.spriteBounds=new Map();this.symbolAnimations=new Map();
  this.grid=gridFromStops(game,[0,0,0]);this.stops=[0,0,0];this.wheel=1;this.result=null;this.pendingSpin=null;
  this.motion=new ReelMotion({duration:950,stagger:190,startStagger:0,travel:12,wheelEnd:950},3);
  this.particles=new Particles();this.stats={frames:0,draws:0,slowFrames:0,maxDelta:0};
  this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;this.presentedAt=0;this.presentationClock=0;this.nativeWinSkipClock=null;
  this.artReady=this.load();this.presentationReady=this.nativeReady=this.artReady;this.atlas.ready=this.artReady;
  this.enableNativePresentation=()=>{};this.loop=this.loop.bind(this);this.resize();this.resume();
 }
 async load(){
  const response=await fetch(new URL('habesha-art.json',base));if(!response.ok)throw Error('HABESHA_MANIFEST_UNAVAILABLE');
  const manifest=await response.json();const sprites=Object.values(manifest.sprites);for(const entry of sprites)this.spriteBounds.set(entry.name,entry.spriteSourceSize);
  for(const entry of sprites.filter(s=>s.name.startsWith('Buttons/'))){
   const key=entry.name.slice('Buttons/'.length).replace(/[A-Z]/g,c=>'-'+c.toLowerCase()).replace(/^-/,'');
   this.canvas.ownerDocument.body.style.setProperty('--habesha-'+key,'url("'+new URL(entry.path,base).href+'")');
  }
  const landscapeResponse=await fetch(new URL('habesha-landscape-art.json',base));if(!landscapeResponse.ok)throw Error('HABESHA_LANDSCAPE_UNAVAILABLE');
  const landscape=await landscapeResponse.json();
  for(const [name,entry] of Object.entries(landscape.sprites))if(name.startsWith('Buttons/')){
   const key=name.slice('Buttons/'.length).replace(/[A-Z]/g,c=>'-'+c.toLowerCase()).replace(/^-/,'');
   this.canvas.ownerDocument.body.style.setProperty('--habesha-landscape-'+key,'url("'+new URL(entry.path,base).href+'")');
  }
  const [landscapeBackground,landscapeBoard]=await Promise.all([image(new URL(landscape.background.path,base)),image(new URL(landscape.sprites['Box/Background'].path,base))]);
  this.landscapeBackground=landscapeBackground;this.landscapeBoard=landscapeBoard;
  this.canvas.ownerDocument.body.style.setProperty('--habesha-landscape-footer','url("'+new URL(landscape.sprites['Start/Footer'].path,base).href+'")');
  const names=['Vertical/Box/Background','Multiplier/Background','Multiplier/BackgroundBorder',...Array.from({length:9},(_,i)=>'Box/'+i),...Array.from({length:9},(_,i)=>'Box/Blur/'+i),...Array.from({length:5},(_,i)=>'Multiplier/'+(i+1)),...Array.from({length:5},(_,i)=>'Multiplier/Active-'+(i+1))];
  await Promise.all(names.map(async name=>{const entry=sprites.find(s=>s.name===name);if(!entry)throw Error('HABESHA_SPRITE_MISSING:'+name);this.sprites.set(name,await image(new URL(entry.path,base)));}));
  for(let i=0;i<9;i++)this.atlas.set('symbol_'+i,this.sprites.get('Box/'+i));
  const raw=manifest.rawAssets,background=raw.find(a=>a.sourceUrl.endsWith('/Vertical/background.jpg'));
  if(!background)throw Error('HABESHA_BACKGROUND_MISSING');this.background=await image(new URL(background.path,base));
  const json=raw.find(a=>a.sourceUrl.endsWith('/Start/Logo/logo.json'));
  const atlas=raw.find(a=>a.sourceUrl.endsWith('/Start/Logo/logo.atlas.txt'));
  if(!json||!atlas)throw Error('HABESHA_LOGO_MISSING');
  const [skeleton,atlasText]=await Promise.all([fetch(new URL(json.path,base)).then(r=>r.json()),fetch(new URL(atlas.path,base)).then(r=>r.text())]);
  const pages={};for(const line of atlasText.split(/\r?\n/)){if(!/\.(png|webp|jpg)$/.test(line.trim()))continue;const asset=raw.find(a=>a.sourceUrl===new URL(line.trim(),atlas.sourceUrl).href);if(!asset)throw Error('HABESHA_LOGO_PAGE_MISSING');pages[line.trim()]=new URL(asset.path,base).href;}
  const logo=await createNativeAnimation({skeleton,atlas:atlasText,pages});
  if(this.disposed){logo.destroy();return;}
  this.logo=logo;
  await Promise.all(Array.from({length:9},async(_,i)=>{
   const json=raw.find(a=>a.sourceUrl.includes('/Spine/Box/'+i+'/')&&a.sourceUrl.endsWith('.json'));
   const atlas=raw.find(a=>a.sourceUrl.includes('/Spine/Box/'+i+'/')&&/\.atlas(?:\.txt)?$/.test(a.sourceUrl));
   if(!json||!atlas)throw Error('HABESHA_SYMBOL_ANIMATION_MISSING:'+i);
   const [skeleton,text]=await Promise.all([fetch(new URL(json.path,base)).then(r=>r.json()),fetch(new URL(atlas.path,base)).then(r=>r.text())]);
   const pages={};for(const line of text.split(/\r?\n/)){if(!/\.(png|webp|jpg)$/.test(line.trim()))continue;const page=raw.find(a=>a.sourceUrl===new URL(line.trim(),atlas.sourceUrl).href);if(!page)throw Error('HABESHA_SYMBOL_PAGE_MISSING:'+i);pages[line.trim()]=new URL(page.path,base).href;}
   const animation=await createNativeAnimation({skeleton,atlas:text,pages});
   if(this.disposed)animation.destroy();else this.symbolAnimations.set('symbol_'+i,animation);
  }));
  if(this.disposed)return;
  this.officialArt=manifest;this.atlas.officialSymbolCount=9;this.atlas.artworkLoaded=true;this.ready=true;
 }
 setGameModel(g){if(g.id!==this.machineId)throw Error('PRESENTATION_IDENTITY_MISMATCH');this.game=g;}
 restore(result){this.result=result;this.grid=result.grid;this.stops=result.stops.slice();this.wheel=result.wheelMultiplier;}
 beginPendingSpin(){
  if(this.pendingSpin||this.motion.active)throw Error('PRESENTATION_ALREADY_ACTIVE');
  const token={elapsed:0,stops:this.stops.slice()};this.pendingSpin=token;this.presentedAt=0;this.audio.event?.('start');return token;
 }
 cancelPendingSpin(token){if(this.pendingSpin&&(!token||token===this.pendingSpin)){this.pendingSpin=null;this.audio.stop?.('reels');}}
 start(result){
  if(this.resolve)throw Error('PRESENTATION_ALREADY_ACTIVE');
  if(!this.pendingSpin)this.audio.event?.('start');
  this.pendingElapsed=this.pendingSpin?.elapsed||0;
  const previousStops=this.pendingSpin?.stops||this.stops;
  this.reelStarts=previousStops.map(stop=>pendingReelPhase(stop,this.pendingElapsed));
  this.reelEnds=this.reelStarts.map((phase,col)=>settledReelPhase(phase,result.stops[col],this.game.strips[col].length,12+col));
  this.wheelStart=pendingReelPhase(this.wheel,this.pendingElapsed);this.wheelEnd=settledReelPhase(this.wheelStart,result.wheelMultiplier,5,10);
  // Transfer ownership without cancelling the in-flight start sound.
  this.pendingSpin=null;this.result=result;this.presentedAt=0;this.motion.begin(result.stops,result.wheelMultiplier,performance.now());
  return new Promise(resolve=>{this.resolve=resolve;});
 }
 speedUp(){this.motion.speedUp();this.audio.setFastStop?.();}
 setTurbo(value){this.motion.rate=value?2.4:1;this.audio.setTurbo?.(value);}
 skipNativeWin(){this.presentedAt=0;this.audio.stop?.('win');}
 cancelPresentation(){this.cancelPendingSpin();this.motion.cancel();this.audio.stop?.('reels');this.audio.stop?.('win');this.resolve?.(null);this.resolve=null;this.presentedAt=0;}
 resize(){const rect=this.canvas.getBoundingClientRect();const ratio=Math.min(2,devicePixelRatio||1);this.layout=habeshaLayout(rect.width,rect.height);this.canvas.width=Math.max(1,Math.round(rect.width*ratio));this.canvas.height=Math.max(1,Math.round(rect.height*ratio));}
 pause(){this.running=false;cancelAnimationFrame(this.frame);this.audio.setSuspended?.(true);}
 resume(){if(this.disposed||this.running)return;this.running=true;this.last=performance.now();this.motion.resume(this.last);this.audio.setSuspended?.(false);this.frame=requestAnimationFrame(this.loop);}
 loop(now){
  if(!this.running)return;const dt=Math.min(80,Math.max(0,now-this.last));this.last=now;this.stats.frames++;
  this.presentationClock+=dt;
  if(this.pendingSpin)this.pendingSpin.elapsed+=dt*this.motion.rate;
  const active=this.motion.active;if(active)this.motion.advance(now);
  if(active)for(let col=0;col<3;col++){if(this.motion.position(col).landed&&!this.motion.stopped.has(col)){this.motion.stopped.add(col);this.audio.event?.('reel-stop',col);}}
  if(active&&!this.motion.active){this.grid=this.result.grid;this.stops=this.result.stops.slice();this.wheel=this.result.wheelMultiplier;this.presentedAt=this.presentationClock;this.audio.stop?.('reels');this.audio.win?.(Number(this.result.finalWin),Number(this.result.bet),this.result.wheelMultiplier);const resolve=this.resolve;this.resolve=null;resolve?.(this.result);}
  if(this.ready){this.draw(this.presentationClock);this.stats.draws++;}
  this.frame=requestAnimationFrame(this.loop);
 }
 draw(now){
  const c=this.ctx,l=this.layout||habeshaLayout(this.canvas.width,this.canvas.height);
  c.setTransform(this.canvas.width/l.width,0,0,this.canvas.height/l.height,0,0);
  const background=l.landscape?this.landscapeBackground:this.background;
  if(l.landscape){const scale=Math.max(l.width/background.width,l.height/background.height),w=background.width*scale,h=background.height*scale;c.drawImage(background,(l.width-w)/2,0,w,h);}else c.drawImage(background,0,0,l.width,l.height);
  const board=l.board;c.drawImage(l.landscape?this.landscapeBoard:this.sprites.get('Vertical/Box/Background'),board.x,board.y,board.width,board.height);
  this.logo.draw(c,{timeSeconds:now/1000,box:l.logo,reducedMotion:this.reducedMotion});
  const {x,y,width:w,height:h}=l.grid,cw=w/3,ch=h/3;
  const winning=!this.motion.active&&!this.pendingSpin&&this.presentedAt&&this.result?.winLines.length;
  const activeLine=winning?this.result.winLines[Math.floor((now-this.presentedAt)/1100)%this.result.winLines.length]:null;
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  for(let col=0;col<3;col++){
   const position=this.motion.position(col),moving=!this.reducedMotion&&(this.pendingSpin||this.motion.active&&!position.landed);
   if(moving){
    const phase=this.pendingSpin?pendingReelPhase(this.pendingSpin.stops[col],this.pendingSpin.elapsed):reelPhaseAt(this.reelStarts[col],this.reelEnds[col],position.p,this.motion.profile.duration+col*this.motion.profile.stagger);const strip=this.game.strips[col],fraction=phase-Math.floor(phase);
    for(let row=-1;row<4;row++){const n=((Math.floor(phase)+row)%strip.length+strip.length)%strip.length,sy=y+(row-fraction)*ch;if(this.pendingSpin||position.p<.72)c.drawImage(this.sprites.get('Box/Blur/'+strip[n].slice(7)),x+col*cw,sy,cw,ch);else this.drawSymbol(c,strip[n],x+col*cw,sy,cw,ch);}
   }else for(let row=0;row<3;row++){
    const grid=this.motion.active?this.result.grid:this.grid,symbol=grid[row][col],animation=this.symbolAnimations.get(symbol);
    if(!this.reducedMotion&&activeLine?.positions.some(([r,k])=>r===row&&k===col)&&animation){
     animation.draw(c,{timeSeconds:(now-this.presentedAt)/1000,box:{x:x+col*cw,y:y+row*ch,width:cw,height:ch}});
     this.stats.symbolAnimationDraws=(this.stats.symbolAnimationDraws||0)+1;
    }else this.drawSymbol(c,symbol,x+col*cw,y+row*ch,cw,ch);
   }
  }c.restore();
  const mb=l.multiplierBorder,m=l.multiplier;c.drawImage(this.sprites.get('Multiplier/BackgroundBorder'),mb.x,mb.y,mb.width,mb.height);
  c.drawImage(this.sprites.get('Multiplier/Background'),m.x,m.y,m.width,m.height);
  const rolling=!!this.pendingSpin||this.motion.active&&this.motion.wheelProgress()<1;
  const phase=this.pendingSpin?pendingReelPhase(this.wheel,this.pendingSpin.elapsed):this.motion.active?reelPhaseAt(this.wheelStart,this.wheelEnd,this.motion.wheelProgress(),this.motion.profile.wheelEnd):this.wheel-1;
  const vbox=l.values,fraction=phase-Math.floor(phase);
  c.save();c.beginPath();c.rect(vbox.x,vbox.y,vbox.width,2*vbox.step+vbox.height);c.clip();
  // The reference strip descends top to bottom: selected+1, selected,
  // selected-1. Increasing phase therefore moves its symbols downwards.
  for(let i=-1;i<4;i++){const value=((Math.floor(phase)-i+1)%5+5)%5+1;c.drawImage(this.sprites.get('Multiplier/'+(!rolling&&i===1?'Active-':'')+value),vbox.x,vbox.y+(i+fraction)*vbox.step,vbox.width,vbox.height);}
  c.restore();
  if(!this.motion.active&&!this.pendingSpin&&this.presentedAt&&this.result?.winLines.length){
   const wins=this.result.winLines,win=wins[Math.floor((now-this.presentedAt)/1100)%wins.length];
   c.strokeStyle='#ffe26b';c.lineWidth=3;c.beginPath();win.rows.forEach((row,col)=>{const px=x+(col+.5)*cw,py=y+(row+.5)*ch;col?c.lineTo(px,py):c.moveTo(px,py);});c.stroke();
  }
 }
 drawSymbol(c,symbol,x,y,w,h){const image=this.atlas.get(symbol),b=this.spriteBounds.get('Box/'+symbol.slice(7));if(!b){c.drawImage(image,x,y,w,h);return;}const scale=Math.min(w/b.w,h/b.h);c.drawImage(image,b.x,b.y,b.w,b.h,x+(w-b.w*scale)/2,y+(h-b.h*scale)/2,b.w*scale,b.h*scale);}
 dispose(){this.disposed=true;this.pause();this.cancelPresentation();this.logo?.destroy();for(const animation of this.symbolAnimations.values())animation.destroy();this.symbolAnimations.clear();this.atlas.clear();this.sprites.clear();}
}
