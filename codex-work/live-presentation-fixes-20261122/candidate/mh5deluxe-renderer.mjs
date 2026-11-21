// Presentation only: settled grids enter through the existing controller's
// validateRound call. Pending movement never creates an outcome or wallet value.
import {gridFromStops} from './contract.mjs';
import {ReelMotion,Particles} from './motion.mjs';
import {createNativeAnimation} from './native-animation-runtime.mjs';
const base=new URL('./',import.meta.url);
const image=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('MH5DELUXE_IMAGE_UNAVAILABLE'));i.src=src;});
export class MultiHot5DeluxeRenderer {
 constructor(canvas,game,audio){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw Error('CANVAS_UNAVAILABLE');
  this.game=game;this.machineId=game.id;this.audio=audio;this.atlas=new Map();this.sprites=new Map();this.spriteBounds=new Map();this.symbolAnimations=new Map();
  this.grid=gridFromStops(game,[0,0,0]);this.wheel=1;this.result=null;this.pendingSpin=null;
  this.motion=new ReelMotion({duration:950,stagger:190,startStagger:100,travel:12,wheelEnd:950},3);
  this.particles=new Particles();this.stats={frames:0,draws:0,slowFrames:0,maxDelta:0};
  this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;this.presentedAt=0;this.nativeWinSkipClock=null;
  this.artReady=this.load();this.presentationReady=this.nativeReady=this.artReady;this.atlas.ready=this.artReady;
  this.enableNativePresentation=()=>{};this.loop=this.loop.bind(this);this.resize();this.resume();
 }
 async load(){
  const response=await fetch(new URL('mh5deluxe-art.json',base));if(!response.ok)throw Error('MH5DELUXE_MANIFEST_UNAVAILABLE');
  const manifest=await response.json();const sprites=Object.values(manifest.sprites);for(const entry of sprites)this.spriteBounds.set(entry.name,entry.visibleBounds||entry.spriteSourceSize);
  for(const entry of sprites.filter(s=>s.name.startsWith('Buttons/'))){
   const key=entry.name.slice('Buttons/'.length).replace(/[A-Z]/g,c=>'-'+c.toLowerCase()).replace(/^-/,'');
   this.canvas.ownerDocument.body.style.setProperty('--mh5deluxe-'+key,'url("'+new URL(entry.path,base).href+'")');
  }
  const names=['Vertical/Box/Background','Multiplier/Background','Multiplier/BackgroundBorder',...Array.from({length:9},(_,i)=>'Box/'+i),...Array.from({length:9},(_,i)=>'Box/Blur/'+i),...Array.from({length:5},(_,i)=>'Multiplier/'+(i+1)),...Array.from({length:5},(_,i)=>'Multiplier/Active-'+(i+1))];
  await Promise.all(names.map(async name=>{const entry=sprites.find(s=>s.name===name);if(!entry)throw Error('MH5DELUXE_SPRITE_MISSING:'+name);this.sprites.set(name,await image(new URL(entry.path,base)));}));
  for(let i=0;i<9;i++)this.atlas.set('symbol_'+i,this.sprites.get('Box/'+i));
  const raw=manifest.rawAssets,background=raw.find(a=>a.sourceUrl.endsWith('/Images/BackgroundVertical.png'));
  if(!background)throw Error('MH5DELUXE_BACKGROUND_MISSING');this.background=await image(new URL(background.path,base));
  const json=raw.find(a=>a.sourceUrl.includes('/Spine/Logo/')&&a.sourceUrl.endsWith('.json'));
  const atlas=raw.find(a=>a.sourceUrl.includes('/Spine/Logo/')&&/\.atlas(?:\.txt)?$/.test(a.sourceUrl));
  if(!json||!atlas)throw Error('MH5DELUXE_LOGO_MISSING');
  const [skeleton,atlasText]=await Promise.all([fetch(new URL(json.path,base)).then(r=>r.json()),fetch(new URL(atlas.path,base)).then(r=>r.text())]);
  const pages={};for(const line of atlasText.split(/\r?\n/)){if(!/\.(png|webp|jpg)$/.test(line.trim()))continue;const asset=raw.find(a=>a.sourceUrl===new URL(line.trim(),atlas.sourceUrl).href);if(!asset)throw Error('MH5DELUXE_LOGO_PAGE_MISSING');pages[line.trim()]=new URL(asset.path,base).href;}
  const logo=await createNativeAnimation({skeleton,atlas:atlasText,pages});
  if(this.disposed){logo.destroy();return;}
  this.logo=logo;
  await Promise.all(Array.from({length:9},async(_,i)=>{
   const json=raw.find(a=>a.sourceUrl.includes('/Spine/Symbols/')&&a.sourceUrl.endsWith('.json'));
   const atlas=raw.find(a=>a.sourceUrl.includes('/Spine/Symbols/')&&/\.atlas(?:\.txt)?$/.test(a.sourceUrl));
   if(!json||!atlas)throw Error('MH5DELUXE_SYMBOL_ANIMATION_MISSING:'+i);
   const [skeleton,text]=await Promise.all([fetch(new URL(json.path,base)).then(r=>r.json()),fetch(new URL(atlas.path,base)).then(r=>r.text())]);
   const pages={};for(const line of text.split(/\r?\n/)){if(!/\.(png|webp|jpg)$/.test(line.trim()))continue;const page=raw.find(a=>a.sourceUrl===new URL(line.trim(),atlas.sourceUrl).href);if(!page)throw Error('MH5DELUXE_SYMBOL_PAGE_MISSING:'+i);pages[line.trim()]=new URL(page.path,base).href;}
   const animation=await createNativeAnimation({skeleton,atlas:text,pages});
   if(this.disposed)animation.destroy();else {const name=['Cherry','Plum','Orange','Lemon','Grape','Watermelon','Bells','Dollars','777'][i];this.symbolAnimations.set('symbol_'+i,{draw(ctx,opts){const duration=animation.duration(name+' - Intro'),t=opts.timeSeconds;return animation.draw(ctx,{...opts,animation:name+(t<duration?' - Intro':' - Loop'),timeSeconds:t<duration?t:t-duration,loop:t>=duration});},destroy(){animation.destroy();}});}
  }));
  if(this.disposed)return;
  this.officialArt=manifest;this.atlas.officialSymbolCount=9;this.atlas.artworkLoaded=true;this.ready=true;
 }
 setGameModel(g){if(g.id!==this.machineId)throw Error('PRESENTATION_IDENTITY_MISMATCH');this.game=g;}
 restore(result){this.result=result;this.grid=result.grid;this.wheel=result.wheelMultiplier;}
 beginPendingSpin(){const token={elapsed:0};this.pendingSpin=token;this.audio.event?.('start');return token;}
 cancelPendingSpin(token){if(!token||token===this.pendingSpin)this.pendingSpin=null;}
 start(result){
  if(this.resolve)throw Error('PRESENTATION_ALREADY_ACTIVE');
  if(!this.pendingSpin)this.audio.event?.('start');this.cancelPendingSpin();this.result=result;this.presentedAt=0;this.motion.begin(result.stops,result.wheelMultiplier,performance.now());
  return new Promise(resolve=>{this.resolve=resolve;});
 }
 speedUp(){this.motion.speedUp();this.audio.setFastStop?.();}
 setTurbo(value){this.motion.rate=value?2.4:1;this.audio.setTurbo?.(value);}
 skipNativeWin(){this.presentedAt=0;}
 cancelPresentation(){this.cancelPendingSpin();this.motion.cancel();this.audio.stop?.('reels');this.resolve?.(null);this.resolve=null;this.presentedAt=0;}
 resize(){const rect=this.canvas.getBoundingClientRect();const ratio=Math.min(2,devicePixelRatio||1);this.canvas.width=Math.max(1,Math.round(rect.width*ratio));this.canvas.height=Math.max(1,Math.round(rect.height*ratio));}
 pause(){this.running=false;cancelAnimationFrame(this.frame);}
 resume(){if(this.disposed||this.running)return;this.running=true;this.last=performance.now();this.motion.resume(this.last);this.frame=requestAnimationFrame(this.loop);}
 loop(now){
  if(!this.running)return;const dt=Math.min(80,Math.max(0,now-this.last));this.last=now;this.stats.frames++;
  if(this.pendingSpin)this.pendingSpin.elapsed+=dt;
  const active=this.motion.active;if(active)this.motion.advance(now);
  if(active)for(let col=0;col<3;col++){if(this.motion.position(col).landed&&!this.motion.stopped.has(col)){this.motion.stopped.add(col);this.audio.event?.('reel-stop',col);}}
  if(active&&!this.motion.active){this.grid=this.result.grid;this.wheel=this.result.wheelMultiplier;this.presentedAt=now;this.audio.stop?.('reels');this.audio.win?.(Number(this.result.finalWin),Number(this.result.bet));const resolve=this.resolve;this.resolve=null;resolve?.(this.result);}
  if(this.ready){this.draw(now);this.stats.draws++;}
  this.frame=requestAnimationFrame(this.loop);
 }
 draw(now){
  const c=this.ctx;c.setTransform(this.canvas.width/420,0,0,this.canvas.height/900,0,0);c.drawImage(this.background,0,0,420,900);
  {const b=this.spriteBounds.get('Vertical/Box/Background');c.drawImage(this.sprites.get('Vertical/Box/Background'),b.x,b.y,b.w,b.h,103,125,280,280);}
  this.logo.draw(c,{timeSeconds:now/1000,box:{x:101,y:49,width:285,height:88},reducedMotion:this.reducedMotion});
  const x=115,y=138,w=256,h=253,cw=w/3,ch=h/3;
  const winning=!this.motion.active&&!this.pendingSpin&&this.presentedAt&&this.result?.winLines.length;
  const activeLine=winning?this.result.winLines[Math.floor((now-this.presentedAt)/1100)%this.result.winLines.length]:null;
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  for(let col=0;col<3;col++){
   const position=this.motion.position(col),moving=!this.reducedMotion&&(this.pendingSpin||this.motion.active&&!position.landed);
   if(moving){
    const phase=this.pendingSpin?this.pendingSpin.elapsed/95:position.offset;const strip=this.game.strips[col];
    for(let row=-1;row<4;row++){const n=((Math.floor(phase)+row)%strip.length+strip.length)%strip.length;this.drawSymbol(c,strip[n],x+col*cw,y+(row-(phase%1))*ch,cw,ch,true);}
   }else for(let row=0;row<3;row++){
    const grid=this.motion.active?this.result.grid:this.grid,symbol=grid[row][col],animation=this.symbolAnimations.get(symbol);
    if(!this.reducedMotion&&activeLine?.positions.some(([r,k])=>r===row&&k===col)&&animation){
     animation.draw(c,{timeSeconds:(now-this.presentedAt)/1000,box:{x:x+col*cw,y:y+row*ch,width:cw,height:ch}});
     this.stats.symbolAnimationDraws=(this.stats.symbolAnimationDraws||0)+1;
    }else this.drawSymbol(c,symbol,x+col*cw,y+row*ch,cw,ch);
   }
  }c.restore();
  c.drawImage(this.sprites.get('Multiplier/BackgroundBorder'),36,156,74,220);
  c.drawImage(this.sprites.get('Multiplier/Background'),34,153,78,226);
  const values=[(this.wheel+3)%5+1,this.wheel,this.wheel%5+1];
  values.forEach((v,i)=>c.drawImage(this.sprites.get('Multiplier/'+(i===1?'Active-':'')+v),38,168+i*73,69,48));
  if(!this.motion.active&&!this.pendingSpin&&this.presentedAt&&this.result?.winLines.length){
   const wins=this.result.winLines,win=wins[Math.floor((now-this.presentedAt)/1100)%wins.length];
   c.strokeStyle='#ffe26b';c.lineWidth=3;c.beginPath();win.rows.forEach((row,col)=>{const px=x+(col+.5)*cw,py=y+(row+.5)*ch;col?c.lineTo(px,py):c.moveTo(px,py);});c.stroke();
  }
 }
 drawSymbol(c,symbol,x,y,w,h,blur=false){const key=(blur?'Box/Blur/':'Box/')+symbol.slice(7),image=blur?this.sprites.get(key):this.atlas.get(symbol),b=this.spriteBounds.get(key);if(!b){c.drawImage(image,x,y,w,h);return;}const scale=Math.min(w/b.w,h/b.h);c.drawImage(image,b.x,b.y,b.w,b.h,x+(w-b.w*scale)/2,y+(h-b.h*scale)/2,b.w*scale,b.h*scale);}
 dispose(){this.disposed=true;this.pause();this.cancelPresentation();this.logo?.destroy();for(const animation of this.symbolAnimations.values())animation.destroy();this.symbolAnimations.clear();this.atlas.clear();this.sprites.clear();}
}
