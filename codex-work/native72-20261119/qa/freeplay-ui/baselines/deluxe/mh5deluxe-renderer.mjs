// Presentation only. The controller validates every settled grid and wallet
// receipt before this renderer sees it. Decorative travel never selects a win.
import {gridFromStops} from './contract.mjs';
import {ReelMotion} from '/zplay-native-shared-20261119-r1/motion.mjs';
import {createNativeAnimation} from '/zplay-native-shared-20261119-r1/native-animation-runtime.mjs';
import {DELUXE_TIMINGS,deluxeMotionProfile,deluxeLayoutForViewport,coverSource,symbolBox,reelLandingPhase,reelWindowAtPhase,multiplierAtPhase,multiplierLandingPhase,multiplierPhaseAt} from './deluxe-layout.mjs';

const base=new URL('./',import.meta.url);
const symbolNames=['Cherry','Plum','Orange','Lemon','Grape','Watermelon','Bells','Dollars','777'];
const fireNames=['back fire','charcho cecxli','charchos qvemo risxvs zemo cecxli'];
const image=src=>new Promise((resolve,reject)=>{const item=new Image();item.onload=()=>resolve(item);item.onerror=()=>reject(Error('MH5DELUXE_IMAGE_UNAVAILABLE'));item.src=src;});
const resource=async(path,type)=>{const response=await fetch(new URL(path,base));if(!response.ok)throw Error('MH5DELUXE_RESOURCE_UNAVAILABLE');return response[type]();};
const cssName=name=>name.replaceAll('/','-').replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase();

async function animationData(raw,folder){
 const json=raw.find(item=>item.sourceUrl.includes('/Spine/'+folder+'/')&&item.sourceUrl.endsWith('.json'));
 const atlas=raw.find(item=>item.sourceUrl.includes('/Spine/'+folder+'/')&&/\.atlas(?:\.txt)?$/.test(item.sourceUrl));
 if(!json||!atlas)throw Error('MH5DELUXE_ANIMATION_METADATA_MISSING:'+folder);
 const [skeleton,text]=await Promise.all([resource(json.path,'json'),resource(atlas.path,'text')]);
 const pages={};
 for(const line of text.split(/\r?\n/)){
  const name=line.trim();if(!/\.(png|webp|jpg)$/.test(name))continue;
  const page=raw.find(item=>item.sourceUrl===new URL(name,atlas.sourceUrl).href);
  if(!page)throw Error('MH5DELUXE_ANIMATION_PAGE_MISSING:'+folder);
  pages[name]=new URL(page.path,base).href;
 }
 if(!Object.keys(pages).length)throw Error('MH5DELUXE_ANIMATION_ATLAS_EMPTY:'+folder);
 return {skeleton,atlas:text,pages};
}

export class MultiHot5DeluxeRenderer {
 constructor(canvas,game,audio){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw Error('CANVAS_UNAVAILABLE');
  this.game=game;this.machineId=game.id;this.audio=audio;this.atlas=new Map();
  this.sprites=new Map();this.spriteBounds=new Map();this.desktopSprites=new Map();this.desktopBounds=new Map();
  this.symbolAnimations=new Map();this.multiplierEffects=new Map();
  this.displayStops=[0,0,0];this.grid=gridFromStops(game,this.displayStops);this.wheel=1;this.result=null;
  this.pendingSpin=null;this.wheelFrom=0;this.wheelTo=0;this.reelTravel=[];this.turbo=false;
  this.motion=new ReelMotion(deluxeMotionProfile(),3);this.stats={frames:0,draws:0,slowFrames:0,maxDelta:0};
  this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;this.presentedAt=0;this.presentationClock=0;this.nativeWinSkipClock=null;
  this.artReady=this.load();this.presentationReady=this.nativeReady=this.artReady;this.atlas.ready=this.artReady;
  this.enableNativePresentation=()=>{};this.loop=this.loop.bind(this);this.resize();this.resume();
 }

 async load(){
  const [manifest,desktop]=await Promise.all([resource('mh5deluxe-art.json','json'),resource('mh5deluxe-desktop-art.json','json')]);
  const sprites=Object.values(manifest.sprites),desktopSprites=Object.values(desktop.sprites);
  for(const entry of sprites){
   this.spriteBounds.set(entry.name,entry.visibleBounds||entry.spriteSourceSize);
   if(entry.name.startsWith('Buttons/'))this.canvas.ownerDocument.body.style.setProperty('--mh5deluxe-'+cssName(entry.name.slice(8)),'url("'+new URL(entry.path,base).href+'")');
  }
  for(const entry of desktopSprites){
   this.desktopBounds.set(entry.name,entry.visibleBounds||entry.spriteSourceSize);
   this.canvas.ownerDocument.body.style.setProperty('--deluxe-ui-'+cssName(entry.name),'url("'+new URL(entry.path,base).href+'")');
  }
  const common=['Multiplier/Background','Multiplier/BackgroundBorder',...Array.from({length:9},(_,i)=>'Box/'+i),...Array.from({length:9},(_,i)=>'Box/Blur/'+i),...Array.from({length:5},(_,i)=>'Multiplier/'+(i+1)),...Array.from({length:5},(_,i)=>'Multiplier/Active-'+(i+1))];
  const loadSprites=async(entries,names,target)=>Promise.all(names.map(async name=>{
   const entry=entries.find(item=>item.name===name);if(!entry)throw Error('MH5DELUXE_SPRITE_MISSING:'+name);
   target.set(name,await image(new URL(entry.path,base)));
  }));
  await Promise.all([
   loadSprites(sprites,['Vertical/Box/Background',...common],this.sprites),
   loadSprites(desktopSprites,['Box/Background',...common,...Array.from({length:5},(_,i)=>'Box/Line/'+(i+1))],this.desktopSprites)
  ]);
  for(let i=0;i<9;i++)this.atlas.set('symbol_'+i,this.sprites.get('Box/'+i));
  const background=manifest.rawAssets.find(item=>item.sourceUrl.endsWith('/Images/BackgroundVertical.png'));
  const desktopBackground=desktop.rawAssets.find(item=>item.sourceUrl.endsWith('/MultiHot5Deluxe/background.png'));
  if(!background||!desktopBackground)throw Error('MH5DELUXE_BACKGROUND_MISSING');
  [this.background,this.desktopBackground]=await Promise.all([image(new URL(background.path,base)),image(new URL(desktopBackground.path,base))]);
  const [logoData,symbolData,fireData]=await Promise.all([
   animationData(manifest.rawAssets,'Logo'),animationData(manifest.rawAssets,'Symbols'),animationData(desktop.rawAssets,'Multiplayer')
  ]);
  const logo=await createNativeAnimation(logoData);
  if(this.disposed){logo.destroy();return;}this.logo=logo;
  await Promise.all(symbolNames.map(async(name,index)=>{
   const animation=await createNativeAnimation(symbolData);
   if(this.disposed){animation.destroy();return;}
   const referenceBounds=animation.bounds(name+' - Intro',0);
   this.symbolAnimations.set('symbol_'+index,{
    draw(ctx,options){
     const duration=animation.duration(name+' - Intro'),time=options.timeSeconds;
     return animation.draw(ctx,{...options,referenceBounds,animation:name+(time<duration?' - Intro':' - Loop'),timeSeconds:time<duration?time:time-duration,loop:time>=duration});
    },destroy(){animation.destroy();}
   });
  }));
  await Promise.all(fireNames.map(async name=>{
   const animation=await createNativeAnimation(fireData);
   if(this.disposed){animation.destroy();return;}
   this.multiplierEffects.set(name,animation);
  }));
  if(this.disposed)return;
  this.officialArt=manifest;this.desktopArt=desktop;this.atlas.officialSymbolCount=9;this.atlas.artworkLoaded=true;this.ready=true;
 }

 setGameModel(game){if(game.id!==this.machineId)throw Error('PRESENTATION_IDENTITY_MISMATCH');this.game=game;}
 restore(result){this.result=result;this.grid=result.grid;this.displayStops=result.stops.slice();this.wheel=result.wheelMultiplier;this.wheelFrom=this.wheelTo=this.wheel-1;this.presentedAt=0;}
 beginPendingSpin(){
  const token={elapsed:0,reelPhase:0,wheelPhase:this.wheel-1};this.pendingSpin=token;this.presentedAt=0;
  this.audio.event?.('start');return token;
 }
 cancelPendingSpin(token){if(!token||token===this.pendingSpin)this.pendingSpin=null;}
 start(result){
  if(this.resolve)throw Error('PRESENTATION_ALREADY_ACTIVE');
  const fromPhase=this.pendingSpin?.reelPhase||0;
  this.reelTravel=this.game.strips.map((strip,column)=>({from:fromPhase,to:reelLandingPhase(fromPhase,this.displayStops[column],result.stops[column],strip.length)}));
  this.wheelFrom=this.multiplierPhase();this.wheelTo=multiplierLandingPhase(this.wheelFrom,result.wheelMultiplier);
  if(!this.pendingSpin)this.audio.event?.('start');
  this.cancelPendingSpin();this.result=result;this.presentedAt=0;this.motion.profile=deluxeMotionProfile(this.turbo);
  this.motion.begin(result.stops,result.wheelMultiplier,performance.now());
  return new Promise(resolve=>{this.resolve=resolve;});
 }
 speedUp(){this.motion.speedUp();this.audio.setFastStop?.();}
 setTurbo(value){this.turbo=!!value;this.audio.setTurbo?.(value);}
 skipNativeWin(){this.presentedAt=0;this.audio.stop?.('win');}
 cancelPresentation(){this.cancelPendingSpin();this.motion.cancel();this.audio.stop?.('reels');this.audio.stop?.('win');this.resolve?.(null);this.resolve=null;this.presentedAt=0;}
 resize(){
  const rect=this.canvas.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1);
  this.canvas.width=Math.max(1,Math.round(rect.width*ratio));this.canvas.height=Math.max(1,Math.round(rect.height*ratio));
  this.layout=deluxeLayoutForViewport(rect.width,rect.height);this.canvas.dataset.layout=this.layout.name;
 }
 pause(){this.running=false;cancelAnimationFrame(this.frame);this.audio.setSuspended?.(true);}
 resume(){if(this.disposed||this.running)return;this.running=true;this.last=performance.now();this.motion.resume(this.last);this.audio.setSuspended?.(false);this.frame=requestAnimationFrame(this.loop);}
 loop(now){
  if(!this.running)return;
  const dt=Math.min(80,Math.max(0,now-this.last));this.last=now;this.stats.frames++;this.presentationClock+=dt;
  if(this.pendingSpin){
   this.pendingSpin.elapsed+=dt;
   this.pendingSpin.reelPhase+=dt*3/(this.turbo?DELUXE_TIMINGS.turboCycle:DELUXE_TIMINGS.cycle);
   this.pendingSpin.wheelPhase+=dt*6/(this.turbo?DELUXE_TIMINGS.multiplierTurboLoop:DELUXE_TIMINGS.multiplierLoop);
  }
  const active=this.motion.active;if(active)this.motion.advance(now);
  if(active)for(let col=0;col<3;col++)if(this.motion.position(col).landed&&!this.motion.stopped.has(col)){this.motion.stopped.add(col);this.audio.event?.('reel-stop',col);}
  if(active&&!this.motion.active){
   this.grid=this.result.grid;this.displayStops=this.result.stops.slice();this.wheel=this.result.wheelMultiplier;this.presentedAt=this.presentationClock;
   this.audio.stop?.('reels');this.audio.win?.(Number(this.result.finalWin),Number(this.result.bet));
   const resolve=this.resolve;this.resolve=null;resolve?.(this.result);
  }
  if(this.ready){this.draw(this.presentationClock);this.stats.draws++;}
  this.frame=requestAnimationFrame(this.loop);
 }

 draw(now){
  const context=this.ctx,layout=this.layout,desktop=layout.name==='landscape';
  const scale=Math.min(this.canvas.width/layout.width,this.canvas.height/layout.height);
  context.setTransform(1,0,0,1,0,0);context.fillStyle='#003522';context.fillRect(0,0,this.canvas.width,this.canvas.height);
  context.setTransform(scale,0,0,scale,(this.canvas.width-layout.width*scale)/2,(this.canvas.height-layout.height*scale)/2);
  if(desktop){
   const b=layout.background;context.drawImage(this.desktopBackground,b.x,b.y,b.width,b.height);
   this.drawRawSprite(context,'Box/Background',layout.board,true);
  }else{
   const source=coverSource(this.background.naturalWidth||this.background.width,this.background.naturalHeight||this.background.height,layout.width,layout.height);
   context.drawImage(this.background,source.x,source.y,source.width,source.height,0,0,layout.width,layout.height);
   this.drawSprite(context,'Vertical/Box/Background',layout.board);
  }
  this.logo.draw(context,{animation:'animation',timeSeconds:now/1000,...(desktop?layout.logo:{box:layout.logo}),reducedMotion:this.reducedMotion});
  const winning=!this.motion.active&&!this.pendingSpin&&this.presentedAt>0&&this.result?.winLines.length;
  const age=winning?now-this.presentedAt:0,lineTime=age%DELUXE_TIMINGS.lineCycle;
  const activeLine=winning?this.result.winLines[Math.floor(age/DELUXE_TIMINGS.lineCycle)%this.result.winLines.length]:null;
  const animated=[];
  context.save();context.beginPath();
  if(layout.reelMask){layout.reelMask.forEach(([x,y],index)=>index?context.lineTo(x,y):context.moveTo(x,y));context.closePath();}
  else context.rect(layout.reels.x,layout.reels.y,layout.reels.width,layout.reels.height);
  context.clip();
  for(let col=0;col<3;col++){
   const position=this.motion.position(col),moving=!this.reducedMotion&&(this.pendingSpin||this.motion.active&&!position.landed);
   if(moving){
    let phase=this.pendingSpin?.reelPhase;
    if(phase===undefined){const travel=this.reelTravel[col];phase=travel.from+(travel.to-travel.from)*position.offset/position.travel;}
    for(const item of reelWindowAtPhase(this.game.strips[col],this.displayStops[col],phase)){
     const box=symbolBox(layout,col,item.row),clarity=this.pendingSpin?0:Math.max(0,(position.p-.72)/.28);
     this.drawMovingSymbol(context,item.symbol,box,desktop,clarity);
    }
   }else for(let row=0;row<3;row++){
    const grid=this.motion.active?this.result.grid:this.grid,symbol=grid[row][col],animation=this.symbolAnimations.get(symbol),box=symbolBox(layout,col,row);
    if(!this.reducedMotion&&activeLine?.positions.some(([r,k])=>r===row&&k===col)&&animation){
     if(desktop){const index=Number(symbol.slice(7));animated.push({animation,options:{timeSeconds:lineTime/1000,x:box.x-398,y:box.y+layout.symbolWinOffsets[index],scale:1}});}
     else animation.draw(context,{timeSeconds:lineTime/1000,box});
     this.stats.symbolAnimationDraws=(this.stats.symbolAnimationDraws||0)+1;
    }else if(desktop)this.drawRawSprite(context,'Box/'+symbol.slice(7),box,true);
    else this.drawSymbol(context,symbol,box.x,box.y,box.width,box.height);
   }
  }
  context.restore();for(const {animation,options}of animated)animation.draw(context,options);
  this.drawMultiplier(context,layout.multiplier,winning?age/1000:null);
  if(activeLine){
   if(desktop){
    context.save();context.globalAlpha=Math.max(0,Math.min(1,lineTime/DELUXE_TIMINGS.lineFade,(DELUXE_TIMINGS.lineCycle-lineTime)/DELUXE_TIMINGS.lineFade));
    this.drawRawSprite(context,'Box/Line/'+activeLine.line,layout.line,true);context.restore();
   }else{
    const {x,y,width,height}=layout.reels;context.strokeStyle='#ffe26b';context.lineWidth=3;context.beginPath();
    activeLine.rows.forEach((row,col)=>{const px=x+(col+.5)*width/3,py=y+(row+.5)*height/3;col?context.lineTo(px,py):context.moveTo(px,py);});context.stroke();
   }
  }
 }

 drawMovingSymbol(context,symbol,box,desktop,clarity){
  const index=symbol.slice(7);
  context.save();context.globalAlpha=1-clarity;
  if(desktop)this.drawRawSprite(context,'Box/Blur/'+index,box,true);
  else context.drawImage(this.sprites.get('Box/Blur/'+index),box.x,box.y,box.width,box.height);
  if(clarity>0){context.globalAlpha=clarity;if(desktop)this.drawRawSprite(context,'Box/'+index,box,true);else this.drawSymbol(context,symbol,box.x,box.y,box.width,box.height);}
  context.restore();
 }

 multiplierPhase(){
  if(this.reducedMotion)return (this.motion.active?this.result.wheelMultiplier:this.wheel)-1;
  if(this.pendingSpin)return this.pendingSpin.wheelPhase;
  if(this.motion.active)return multiplierPhaseAt(this.wheelFrom,this.wheelTo,this.motion.wheelProgress());
  return this.wheel-1;
 }

 drawMultiplierFire(context,box,name,timeSeconds){
  if(timeSeconds===null||this.reducedMotion)return;
  const animation=this.multiplierEffects.get(name);if(!animation)return;
  const duration=animation.duration(name+' start'),intro=timeSeconds<duration;
  context.save();context.translate(box.x,box.y);context.scale(box.width/197,box.height/604);context.globalCompositeOperation='lighter';
  animation.draw(context,{animation:name+(intro?' start':' loop'),timeSeconds:intro?timeSeconds:timeSeconds-duration,loop:!intro,x:-700,y:-252,scale:1});
  context.restore();this.stats.multiplierAnimationDraws=(this.stats.multiplierAnimationDraws||0)+1;
 }

 drawMultiplier(context,box,winTime=null){
  const {x,y,width,height}=box,phase=this.multiplierPhase(),whole=Math.floor(phase),fraction=phase-whole;
  this.stats.displayedMultiplier=multiplierAtPhase(phase);this.stats.multiplierPhase=phase;
  if(this.layout.name==='landscape'){
   const origin=this.layout.multiplierOrigin;
   this.drawRawSprite(context,'Multiplier/BackgroundBorder',{x:origin.x+130,y:origin.y+60,width:191,height:583},true);
   this.drawMultiplierFire(context,box,'back fire',winTime);
   context.save();context.beginPath();context.rect(origin.x+125,origin.y+57,175,187);context.rect(origin.x+115,origin.y+451,185,187);context.clip();
   for(let row=-2;row<=2;row++){
    const value=((whole+row)%5+5)%5+1;
    this.drawRawSprite(context,'Multiplier/'+value,{x:origin.x+147,y:origin.y+305+(fraction-row)*200,width:145,height:100},true);
   }
   context.restore();context.save();context.beginPath();context.rect(origin.x+95,origin.y+245,225,210);context.clip();
   for(let row=-2;row<=2;row++){
    const value=((whole+row)%5+5)%5+1;
    this.drawRawSprite(context,'Multiplier/Active-'+value,{x:origin.x+72,y:origin.y+225+(fraction-row)*200,width:320,height:270},true);
   }
   context.restore();this.drawRawSprite(context,'Multiplier/Background',box,true);
  }else{
   this.drawSprite(context,'Multiplier/BackgroundBorder',{x:x+width*4/188,y,width:width*180/188,height});
   this.drawMultiplierFire(context,box,'back fire',winTime);
   context.save();context.beginPath();context.rect(x+width*.07,y+height*.01,width*.86,height*.98);context.clip();
   for(let row=-2;row<=2;row++){
    const distance=fraction-row,value=((whole+row)%5+5)%5+1,active=Math.abs(distance)<.5;
    this.drawSprite(context,'Multiplier/'+(active?'Active-':'')+value,{x:x+width*.08,y:y+height/2+distance*height*.342-height*.135,width:width*.84,height:height*.27},true);
   }
   context.restore();this.drawSprite(context,'Multiplier/Background',box);
  }
  this.drawMultiplierFire(context,box,'charcho cecxli',winTime);
  this.drawMultiplierFire(context,box,'charchos qvemo risxvs zemo cecxli',winTime);
 }

 drawRawSprite(context,name,box,desktop=false){
  const sprite=(desktop?this.desktopSprites:this.sprites).get(name);if(sprite)context.drawImage(sprite,box.x,box.y,box.width,box.height);
 }
 drawSprite(context,name,box,contain=false){
  const sprite=this.sprites.get(name),bounds=this.spriteBounds.get(name);if(!sprite)return;
  if(!bounds){context.drawImage(sprite,box.x,box.y,box.width,box.height);return;}
  const scale=contain?Math.min(box.width/bounds.w,box.height/bounds.h):null;
  const width=contain?bounds.w*scale:box.width,height=contain?bounds.h*scale:box.height;
  context.drawImage(sprite,bounds.x,bounds.y,bounds.w,bounds.h,box.x+(box.width-width)/2,box.y+(box.height-height)/2,width,height);
 }
 drawSymbol(context,symbol,x,y,width,height){
  const sprite=this.atlas.get(symbol),bounds=this.spriteBounds.get('Box/'+symbol.slice(7));
  if(!bounds){context.drawImage(sprite,x,y,width,height);return;}
  const scale=Math.min(width/bounds.w,height/bounds.h);
  context.drawImage(sprite,bounds.x,bounds.y,bounds.w,bounds.h,x+(width-bounds.w*scale)/2,y+(height-bounds.h*scale)/2,bounds.w*scale,bounds.h*scale);
 }
 dispose(){
  this.disposed=true;this.pause();this.cancelPresentation();this.logo?.destroy();
  for(const animation of this.symbolAnimations.values())animation.destroy();
  for(const animation of this.multiplierEffects.values())animation.destroy();
  this.symbolAnimations.clear();this.multiplierEffects.clear();this.atlas.clear();this.sprites.clear();this.desktopSprites.clear();
 }
}
