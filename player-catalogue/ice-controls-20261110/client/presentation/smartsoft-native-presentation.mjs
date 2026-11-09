import {drawAtlasFrame,normalizeTextureAtlas,normalizeSpineRegions} from './atlas.mjs';
import {ReferenceAssetStore,minorMoney} from './machine-renderer.mjs';
import {SmartSoftSkeleton} from './smartsoft-skeleton.mjs';
import {supportsSmartSoftMotion} from './smartsoft-motion.mjs';
import {smartSoftCompletedIceFeature} from './smartsoft-remaining7-view.mjs';
import {remainingModernWinTiming,remainingModernCountMinor} from './smartsoft-remaining7-win.mjs';

// New20-only composition of the original locked ART DATA. Public provider
// scripts are never evaluated. A separate data interpreter preserves the existing live interpreter
// unchanged; no live-game asset or configuration is changed by this module.
export const SMARTSOFT_ART_KEY='@smartsoft/native-art';
const decoder=new TextDecoder('utf-8',{fatal:true});
const rectangle=(x,y,width,height)=>({x,y,width,height});
const decode=value=>{try{return decodeURI(value);}catch{return value;}};
const validMoney=value=>typeof value==='string'&&/^(0|[1-9]\d{0,18})$/.test(value);
const MOD=(n,d)=>((n%d)+d)%d;
const TIER_NAMES=['Nice Win','Big Win','Super Win','Fantastic Win'];
const DELUXE_SYMBOLS=['Cherry','Plum','Orange','Lemon','Grape','Watermelon','Bells','Dollars','777'];

export function nativeSpineRole(source){
 const path=decode(source.source||'').split('/Spine/')[1]||'';
 if(source.group==='Logo'||path.startsWith('Start/Logo/'))return 'logo';
 if(source.group==='Win'||source.group==='Wins')return 'win';
 if(source.group==='WinCoins')return 'win-coins';
 if(source.group==='ControlsMenu')return 'controls-menu';
 if(source.group==='WinBox')return 'win-box';
 if(source.group==='Wild')return 'wild';
 if(source.group==='Symbols')return 'symbols';
 if(source.group==='Multiplayer'||path==='Start/multiplayer.atlas.txt')return 'multiplier';
 if(path.startsWith('Start/Background/'))return 'background';
 const symbol=path.match(/^Box\/(\d)\//);if(symbol)return 'symbol-'+symbol[1];
 if(path.startsWith('Box/4-5-6-7/'))return /Zebra/i.test(path)?'symbol-4':/elephant/i.test(path)?'symbol-5':/Tigher/i.test(path)?'symbol-6':/Lion/i.test(path)?'symbol-7':null;
 if(path.startsWith('Box/Full/All/'))return /Zebra/i.test(path)?'expanded-4':/elephant/i.test(path)?'expanded-5':/tigher/i.test(path)?'expanded-6':null;
 if(path.startsWith('Box/Full/Small/')){const letter=path.match(/\/([JQKA]) big/);return letter?'expanded-'+('JQKA'.indexOf(letter[1])):null;}
 return null;
}

function stableBounds(record,animation,firstPose=false){
 const cacheKey=animation+(firstPose?':first-pose':'');
 if(record.bounds.has(cacheKey))return record.bounds.get(cacheKey);
 if(firstPose){
  const box=record.skeleton.bounds(record.skeleton.sample(animation,0));
  if(box&&box.width>0&&box.height>0){record.bounds.set(cacheKey,box);return box;}
 }
 const length=record.skeleton.durations[animation]||1;
 const samples=[0,Math.min(.15,length),Math.min(.5,length),length/2,Math.max(0,length-.01)];
 const boxes=samples.map(time=>record.skeleton.bounds(record.skeleton.sample(animation,time))).filter(box=>box&&box.width>0&&box.height>0);
 if(!boxes.length)return null;
 const x=Math.min(...boxes.map(box=>box.x)),y=Math.min(...boxes.map(box=>box.y));
 const result={x,y,width:Math.max(...boxes.map(box=>box.x+box.width))-x,height:Math.max(...boxes.map(box=>box.y+box.height))-y};record.bounds.set(cacheKey,result);return result;
}

export class SmartSoftAssetStore extends ReferenceAssetStore{
 constructor(manifest,options){
  if(!supportsSmartSoftMotion(manifest?.id))throw new TypeError('Native art belongs to an explicitly selected new title');
  super(manifest,options);this.art={skeletons:new Map(),sequences:new Map(),frames:new Map(),images:new Map(),unsupported:[],draw:(context,command)=>this.drawNative(context,command)};this.nativePromise=null;this.disposed=false;
 }
 async prepareNative(){
  if(this.nativePromise)return this.nativePromise;
  this.nativePromise=(async()=>{
   await Promise.all((this.manifest.spine||[]).map(async source=>{
    const role=nativeSpineRole(source);if(!role)return;
    const [atlasBytes,skeletonBytes,...pages]=await Promise.all([this.loadBytes(source.atlasFile),this.loadBytes(source.skeletonFile),...source.pages.map(page=>this.loadImage(page.file))]);
    if(this.disposed)return;
    source.pages.forEach((page,index)=>this.art.images.set(page.file,pages[index]));
    const regions=normalizeSpineRegions(decoder.decode(atlasBytes),Object.fromEntries(source.pages.map(page=>[page.name,{file:page.file,sha256:page.sha256}])));
    let skeleton;
    try{skeleton=new SmartSoftSkeleton(JSON.parse(decoder.decode(skeletonBytes)),regions,this.art.images);}
    catch(error){this.art.unsupported.push({role,source:source.source,reason:error.message});return;}
    this.art.skeletons.set(role,{skeleton,bounds:new Map(),source});
   }));
   const sources=Object.entries(this.manifest.files).filter(([file,record])=>file.endsWith('.json')&&record.urls?.some(url=>/\/Sprite\//.test(url)));
   await Promise.all(sources.map(async([file,record])=>{
    const atlas=JSON.parse(decoder.decode(await this.loadBytes(file)));if(!atlas.frames||!atlas.meta?.image)return;
    const source=record.urls.find(url=>/\/Sprite\//.test(url)),imageURL=decode(new URL(atlas.meta.image,source).href);
    const texture=Object.entries(this.manifest.files).find(([,entry])=>entry.urls?.some(url=>decode(url)===imageURL));
    if(!texture)throw new TypeError('Native animation texture is not locked in this manifest');
    const[textureFile,textureRecord]=texture,frames=normalizeTextureAtlas(atlas,{file:textureFile,sha256:textureRecord.sha256});
    const image=await this.loadImage(textureFile);if(this.disposed)return;this.art.images.set(textureFile,image);
    for(const[name,frame]of Object.entries(frames)){
     this.art.frames.set(name,frame);const prefix=name.replace(/\/?\d+\.[^.]+$|\/\d+$/,'');
     if(!this.art.sequences.has(prefix))this.art.sequences.set(prefix,[]);this.art.sequences.get(prefix).push(name);
    }
   }));
   for(const[namesKey,names]of this.art.sequences)this.art.sequences.set(namesKey,[...new Set(names)].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})));
   return this.art;
  })();return this.nativePromise;
 }
 async prepare(scene){
  // These exact locked frames are reached only after a confirmed win/freeze,
  // so the opening scene alone does not list their image pages.
  const dynamic=Object.keys(this.manifest.frames).filter(frame=>/^(Box\/Line\/|Lines\/)|LogoIce/.test(frame)).map(frame=>({type:'sprite',frame}));
  const[images]=await Promise.all([super.prepare({...scene,commands:[...scene.commands,...dynamic]}),this.prepareNative()]);if(!this.disposed)images.set(SMARTSOFT_ART_KEY,this.art);return images;
 }
 drawNative(context,command){
  if(this.disposed)return;
  const b=command.box;if(!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0)return;
  if(command.kind==='sequence'){
   const frames=this.art.sequences.get(command.key);if(!frames?.length)return;
   const frameIndex=Math.floor(Math.max(0,command.time||0)*(command.fps||24));
   if(!command.loop&&!command.holdLast&&frameIndex>=frames.length)return;
   const name=frames[command.loop?frameIndex%frames.length:Math.min(frameIndex,frames.length-1)],frame=this.art.frames.get(name);
   drawAtlasFrame(context,this.art.images.get(frame.file),frame,b,{padding:true,fit:command.fit||'contain',opacity:command.opacity??1});return;
  }
  const record=this.art.skeletons.get(command.key);if(!record)return;
  let animation=command.animation,time=Math.max(0,command.time||0),loop=command.loop===true;
  if(!Object.hasOwn(record.skeleton.durations,animation))return;
  if(command.next&&time>=record.skeleton.durations[animation]&&Object.hasOwn(record.skeleton.durations,command.next)){time-=record.skeleton.durations[animation];animation=command.next;loop=true;}
  if(command.sourceOrigin&&Number.isFinite(command.nativeScale)&&command.nativeScale>0){
   const pose=record.skeleton.sample(animation,time,{loop}),factor=command.nativeScale;
   record.skeleton.draw(context,pose,{x:b.x+b.width/2-command.sourceOrigin.x*factor,y:b.y+b.height/2+command.sourceOrigin.y*factor,scale:factor,opacity:command.opacity??1});return;
  }
  // Keep a winning symbol anchored to its initial visible body. Animated
  // sparks may extend outside it; they must not shrink the body each frame.
  const bounds=stableBounds(record,animation,command.role==='winning-symbol');if(!bounds)return;
  const factor=(command.fit==='cover'?Math.max:Math.min)(b.width/bounds.width,b.height/bounds.height);
  const pose=record.skeleton.sample(animation,time,{loop});
  record.skeleton.draw(context,pose,{x:b.x+(b.width-bounds.width*factor)/2-bounds.x*factor,y:b.y+(b.height-bounds.height*factor)/2+(bounds.y+bounds.height)*factor,scale:factor,opacity:command.opacity??1});
 }
 dispose(){this.disposed=true;for(const record of this.art.skeletons.values())record.skeleton.dispose();this.art.skeletons.clear();this.art.sequences.clear();this.art.frames.clear();this.art.images.clear();super.dispose();}
}

function movingSymbols(scene,manifest,motion){
 const g=scene.gridGeometry,cw=g.width/manifest.grid.columns,ch=g.height/manifest.grid.rows,output=[];
 for(const reel of motion.reels){
  const clip=rectangle(g.x+reel.column*cw,g.y,cw,g.height);
  for(const entry of reel.entries){
   if(entry.row+reel.offset+1<=0||entry.row+reel.offset>=manifest.grid.rows)continue;
   const symbol=manifest.symbols[String(entry.symbol)];if(!symbol)continue;
   const frame=reel.blur&&symbol.blurFrame?symbol.blurFrame:symbol.frame;if(!manifest.frames[frame])continue;
   const cell=rectangle(clip.x,g.y+(entry.row+reel.offset)*ch,cw,ch),placement=manifest.symbolPlacement;
   let target,padding=false;
   if(placement){const scale=Math.min(cw/placement.cellWidth,ch/placement.cellHeight),source=manifest.frames[frame].original;target=rectangle(cell.x+cw/2+placement.offsetX*scale,cell.y+ch/2+placement.offsetY*scale,source.width*scale,source.height*scale);padding=true;}
   else target=rectangle(cell.x+cw*.06,cell.y+ch*.055,cw*.88,ch*.89);
   output.push({type:'sprite',frame,box:target,clip,padding,role:'symbol',column:reel.column,row:entry.row,value:String(entry.symbol)});
  }
 }
 return output;
}

function movingMultiplier(scene,manifest,sample){
 const feature=manifest.featurePresentation,target=scene.multiplierGeometry;if(!target||sample?.kind!=='strip')return[];
 const frames=[],centers=feature.rowCenters||[1/6,.5,5/6],pitch=(centers[2]-centers[0])/2,source=manifest.frames[feature.backgroundFrame],scale=target.height/source.height;
 for(const item of sample.entries){
  const row=item.row+sample.offset;if(row<-.65||row>2.65)continue;
  const frame=item.selected&&feature.activeValueFrames?.[item.value]||feature.valueFrames[item.value],descriptor=manifest.frames[frame];if(!descriptor)continue;
  const width=descriptor.original.width*scale*(feature.numberScale||1),height=descriptor.original.height*scale*(feature.numberScale||1);
  frames.push({type:'sprite',frame,box:rectangle(target.x+(target.width-width)/2,target.y+target.height*(centers[0]+row*pitch)-height/2,width,height),clip:target,padding:true,role:'multiplier-value',value:item.value,selected:item.selected,opacity:item.selected?1:.4,valueSource:item.selected?'supplied':'decorative'});
 }
 return frames;
}

const animation=(key,name,target,time,extra={})=>({type:'native-animation',kind:'spine',key,animation:name,box:target,time,loop:false,...extra});
const sequence=(key,target,time,extra={})=>({type:'native-animation',kind:'sequence',key,box:target,time,loop:false,...extra});
export function smartSoftWinTier(id,win,stake){
 if(!supportsSmartSoftMotion(id)||!validMoney(win)||!validMoney(stake)||BigInt(stake)<=0n||BigInt(win)<=0n)return null;
 const amount=BigInt(win),bet=BigInt(stake);
 if(id.startsWith('burningice')){const level=amount>bet*25n?3:amount>bet*2n?2:1;return{name:['3','2','1'][level-1],level,legacy:true,cue:['win-ordinary','win-big','win-super'][level-1]};}
 let index=amount*100n>bet*3999n?3:amount*100n>bet*2999n?2:amount*100n>bet*1999n?1:amount*100n>bet*999n?0:-1;if(index<0)return null;
 // The public WildWays script explicitly removes its final animation after
 // setting the names. Its active table ends at Super, even above39.99x.
 if(id==='multihotwildways_native')index=Math.min(index,2);
 const name=id==='multihotdeluxe_native'?['1. Nice','2. Big','3. Super','4. Fantastic'][index]:id==='habeshafortune5_native'?TIER_NAMES[index].toLowerCase():id==='safarisimba_native'?TIER_NAMES[index].split(' ')[0]:TIER_NAMES[index];
 const duration=['multihot100_native','multihot5superwilds_native'].includes(id)?[3000,4000,5000,7000][index]:id==='multihot5wild_native'?4800:3000;
 return{name,duration,level:index+1,legacy:false,cue:['win-nice','win-big','win-super','win-fantastic'][index]};
}

const CAPTION_TITLES=new Set(['multihotwildways_native','multihot5wild_native','multihot5superwilds_native','multihotdeluxe_native','habeshafortune5_native','safarisimba_native']);
const reelSet=(value,columns)=>new Set((Array.isArray(value)?value:[]).filter(column=>Number.isInteger(column)&&column>=0&&column<columns));
const swing=value=>.5-Math.cos(Math.PI*Math.min(1,Math.max(0,value)))/2;
const addEffects=(commands,effects)=>{const at=commands.findIndex(command=>command.type==='text'&&command.text==='WIN');commands.splice(at<0?commands.length:at,0,...effects);return commands;};

function lineCaption(scene,manifest,native,wins,elapsed){
 if(!CAPTION_TITLES.has(manifest.id))return[];
 const accepted=wins.filter(win=>validMoney(win.payoutMinor)&&BigInt(win.payoutMinor)>0n);if(!accepted.length)return[];
 // drawWinLinesStrips uses one1000ms caption per supplied WinLinesStrip,
 // separately from combined winning-cell animation. MH100's copy is commented
 // out in its public script and is deliberately not enabled here.
 const win=accepted[Math.floor(elapsed)%accepted.length],multiple=native.feature?.multiplier;
 const paid=BigInt(win.payoutMinor),exactFactor=Number.isInteger(multiple)&&multiple>0&&multiple<=5&&paid%BigInt(multiple)===0n;
 const equation=exactFactor?`${minorMoney(String(paid/BigInt(multiple)))} x ${multiple} = ${minorMoney(win.payoutMinor)}`:minorMoney(win.payoutMinor);
 const y=Math.min(660,Math.max(scene.boardGeometry.y+scene.boardGeometry.height+68,622)),frame='Lines/'+String(win.symbol),count=Number.isInteger(win.count)?Math.min(manifest.grid.columns,Math.max(0,win.count)):0;
 const output=[];
 if(Number.isInteger(win.line)&&win.line>0)output.push({type:'text',text:'Line '+win.line,x:37,y,size:12,color:'#fff3c0',align:'left',role:'winning-line-caption',line:win.line});
 if(manifest.frames[frame])for(let i=0;i<count;i++)output.push({type:'sprite',frame,box:rectangle(91+i*20,y-12,23,24),role:'winning-caption-symbol',line:win.line??null});
 output.push({type:'text',text:equation+' '+native.currency,x:390,y,size:12,color:'#fff3c0',align:'right',role:'winning-caption-amount',line:win.line??null,payoutMinor:win.payoutMinor});return output;
}

function wholeLineEffects(scene,manifest,wins,elapsed){
 const calibration={multihot100_native:[1,4],multihot5superwilds_native:[1,3],habeshafortune5_native:[2,3],multihotdeluxe_native:null};
 if(!Object.hasOwn(calibration,manifest.id))return[];
 const delay=['multihot100_native','multihot5superwilds_native'].includes(manifest.id)?1.5:1;
 const opacity=elapsed<.2?swing(elapsed/.2):elapsed<delay?1:1-swing((elapsed-delay)/.2);if(opacity<=0)return[];
 const g=scene.gridGeometry,cw=g.width/manifest.grid.columns,ch=g.height/manifest.grid.rows,pair=calibration[manifest.id];let target=g;
 if(pair){
  const top=manifest.frames['Box/Line/'+pair[0]],bottom=manifest.frames['Box/Line/'+pair[1]];
  if(top&&bottom){const sy=(g.height-ch)/(bottom.trim.y+bottom.trim.height/2-top.trim.y-top.trim.height/2),sx=(g.width-cw)/top.trim.width;target=rectangle(g.x+cw/2-top.trim.x*sx,g.y+ch/2-(top.trim.y+top.trim.height/2)*sy,top.original.width*sx,top.original.height*sy);}
 }
 return[...new Set(wins.map(win=>win.line).filter(line=>Number.isInteger(line)&&line>0))].flatMap(line=>{
  const frame='Box/Line/'+line;return manifest.frames[frame]?[{type:'sprite',frame,box:target,padding:true,fit:'stretch',opacity,clip:g,role:'winning-line',line}]:[];
 });
}

// Authored line geometry from Slots/blazinghot*.js and MultiHot5Wild.js.
// These paths only place visible art after an accepted receipt; no win is
// evaluated here and no supplied payout or symbol is changed.
const SEGMENT_LINES={
 multihot5wild_native:[[1,1,1],[0,0,0],[2,2,2],[0,1,2],[2,1,0]],
 burningice_native:[[1,1,1,1,1],[2,2,2,2,2],[0,0,0,0,0],[2,1,0,1,2],[0,1,2,1,0]],
 burningice10_native:[[1,1,1,1,1],[2,2,2,2,2],[0,0,0,0,0],[2,1,0,1,2],[0,1,2,1,0],[2,2,1,0,0],[0,0,1,2,2],[1,0,0,0,1],[1,2,2,2,1],[2,1,1,1,2]],
 burningice40_native:[[2,2,2,2,2],[1,1,1,1,1],[3,3,3,3,3],[0,0,0,0,0],[2,1,0,1,2],[1,2,3,2,1],[3,3,2,1,0],[0,0,1,2,3],[2,3,3,3,2],[1,0,0,0,1],[3,2,1,0,0],[0,1,2,3,3],[2,3,2,1,2],[1,0,1,2,1],[3,2,3,2,3],[0,1,0,1,0],[2,1,2,3,2],[1,2,1,0,1],[3,2,2,2,3],[0,1,1,1,0],[2,2,1,0,0],[1,1,2,3,3],[3,2,1,1,0],[0,1,2,2,3],[2,1,1,1,0],[1,2,2,2,3],[3,3,2,3,3],[0,0,1,0,0],[2,2,3,2,2],[1,1,0,1,1],[3,3,3,2,1],[0,0,0,1,2],[2,3,3,2,1],[1,0,0,1,2],[3,2,2,1,0],[0,1,1,2,3],[2,3,2,1,0],[1,0,1,2,3],[3,2,1,0,1],[0,1,2,3,2]]
};
function segmentLineEffects(scene,manifest,wins,elapsed,art){
 const paths=SEGMENT_LINES[manifest.id];if(!paths)return[];
 const legacy=manifest.id.startsWith('burningice'),g=scene.gridGeometry,cw=g.width/manifest.grid.columns,ch=g.height/manifest.grid.rows,output=[];
 const ordered=legacy?[...wins].sort((a,b)=>validMoney(a.payoutMinor)&&validMoney(b.payoutMinor)?BigInt(a.payoutMinor)>BigInt(b.payoutMinor)?-1:BigInt(a.payoutMinor)<BigInt(b.payoutMinor)?1:0:0):wins;
 ordered.forEach((win,index)=>{
  const path=Number.isInteger(win.line)?paths[win.line-1]:null;if(!path||!Array.isArray(win.cells)||win.cells.some(cell=>!Array.isArray(cell)||path[cell[0]]!==cell[1]))return;
  const lineTime=elapsed-(legacy?(index*20+10)/60:0);if(lineTime<0)return;
  for(let column=0;column<path.length-1;column++){
   const delta=path[column+1]-path[column],key=delta===0?'Line1':legacy?(delta<0?'Line2':'Line3'):(delta>0?'Line2':'Line3'),frames=art.sequences.get(key),t=lineTime-column*.05;
   if(!frames?.length||t<0||t>=frames.length/15)continue;
   const descriptor=art.frames?.get(frames[0]);if(!descriptor)continue;
   // Responsive affine placement keeps the original animated texture and its
   // authored15fps/50ms progression. It is not a replacement painted line.
   const centerX=g.x+(column+.5)*cw,centerY=g.y+(path[column]+.5)*ch;
   let target,rotation=0,rotateAt;
   if(legacy)target=rectangle(centerX-142*cw/223,centerY+(-258+(delta<0?100:delta>0?-100:0))*ch/(manifest.grid.rows===4?205:210),descriptor.original.width*1.071*cw/223,descriptor.original.height*1.071*ch/(manifest.grid.rows===4?205:210));
   else{
    // The source mobile container uses155x106 cells, pivot98/5 and the
    // original1.071*1.52*.49 line scale, with ±.23 diagonal rotations.
    const sx=cw/155,sy=ch/106,scale=1.071*1.52*.49,x=delta>0?-40:delta<0?40:0,y=-55+(delta>0?80-(column===1?10:0):delta<0?-60+(column===1?12:0):0);
    rotateAt={x:centerX+(-24+x)*sx,y:centerY+(-133+y)*sy};rotation=delta>0?-.23:delta<0?.23:0;
    target=rectangle(rotateAt.x-98*sx,rotateAt.y,descriptor.original.width*scale*sx,descriptor.original.height*scale*sy);
   }
   output.push(sequence(key,target,t,{fps:15,fit:'stretch',clip:g,rotation,rotateAt,role:'winning-line-segment',line:win.line,column}));
  }
 });return output;
}

function frozenPresentation(scene,manifest,native,active,elapsed,art){
 if(manifest.featurePresentation?.type!=='frozen-reels')return{effects:[],logoFrame:null};
 const forty=manifest.id==='burningice40_native',suffix=forty?'-40':'',columns=manifest.grid.columns,g=scene.gridGeometry,cw=g.width/columns;
 const completed=active?active.complete:native.pending!==true;
 const displayFeature=smartSoftCompletedIceFeature(manifest.id,native.feature,native.finalFrame===true&&completed);
 const held=reelSet(active?.heldReels,columns),previous=reelSet(active?.previousFeature?.frozenReels,columns),accepted=reelSet(displayFeature?.frozenReels,columns),current=active&&!active.complete?held:accepted;
 const entering=active?.complete?[...current].filter(column=>!held.has(column)):[],leftAtStop=active?.complete?[...held].filter(column=>!current.has(column)):[],leftAtStart=active?[...previous].filter(column=>!held.has(column)):[],leaving=[...new Set([...leftAtStart,...leftAtStop])],motionSeconds=Math.max(0,(active?.elapsed||0)/1000),effects=[];
 const push=(key,target,clock,extra)=>{if(art.sequences.has(key))effects.push(sequence(key,target,clock,extra));};
 // Native40 atlases contain large transparent gutters. Anchor the final
 // opaque ice panel to the reel, retaining every frame's common source box;
 // fitting that whole transparent canvas would shrink the ice to two rows.
 const fitOpaque=(key,target)=>{const names=art.sequences.get(key),frame=names?.length?art.frames?.get(names.at(-1)):null;if(!frame)return target;const sx=target.width/frame.trim.width,sy=target.height/frame.trim.height;return rectangle(target.x-frame.trim.x*sx,target.y-frame.trim.y*sy,frame.original.width*sx,frame.original.height*sy);};
 for(const column of current)push('Ice1'+suffix,fitOpaque('Ice1'+suffix,rectangle(g.x+column*cw,g.y,cw,g.height)),entering.includes(column)?elapsed:1e6,{fps:15,fit:'stretch',holdLast:true,role:'frozen-reel-effect',column});
 for(const column of leaving)if(!current.has(column))push('Ice2'+suffix,fitOpaque('Ice1'+suffix,rectangle(g.x+column*cw,g.y,cw,g.height)),leftAtStop.includes(column)?elapsed:motionSeconds,{fps:15,fit:'stretch',role:'unfreezing-reel-effect',column});
 const logoSuffix=manifest.id==='burningice10_native'?'-10':suffix,logoFrame=current.size?(logoSuffix?'@Image/Start/LogoIce'+logoSuffix:'Start/LogoIce'):null;
 const logoBox=rectangle(58,71,304,139),logoSource=(manifest.frames[logoFrame]||manifest.frames[manifest.logo.frame]).original,logoScale=Math.min(logoBox.width/logoSource.width,logoBox.height/logoSource.height),logoOrigin={x:logoBox.x+(logoBox.width-logoSource.width*logoScale)/2,y:logoBox.y+(logoBox.height-logoSource.height*logoScale)/2};
 const logoSequenceBox=key=>{const names=art.sequences.get(key),frame=names?.length?art.frames?.get(names[0]):null;if(!frame)return logoBox;const offset=logoSuffix?{x:-199,y:-88}:key.startsWith('Logo1')?{x:-191,y:0}:{x:-10,y:0};return rectangle(logoOrigin.x+offset.x*logoScale,logoOrigin.y+offset.y*logoScale,frame.original.width*logoScale,frame.original.height*logoScale);};
 if(entering.length)push('Logo2'+logoSuffix,logoSequenceBox('Logo2'+logoSuffix),elapsed,{fps:24,fit:'stretch',role:'freezing-logo'});
 if(leaving.length&&!current.size)push('Logo1'+logoSuffix,logoSequenceBox('Logo1'+logoSuffix),leftAtStop.length?elapsed:motionSeconds,{fps:24,fit:'stretch',role:'unfreezing-logo'});
 for(const side of [0,1]){
  const width=Math.max(5,Math.min(18,g.x-2)),target=fitOpaque('SideIce1'+suffix,rectangle(side?g.x+g.width:g.x-width,g.y,width,g.height));
  if(current.size)push('SideIce1'+suffix,target,entering.length?elapsed:1e6,{fps:15,fit:'stretch',holdLast:true,role:'frozen-side-effect',side});
  else if(leaving.length)push('SideIce2'+suffix,target,leftAtStop.length?elapsed:motionSeconds,{fps:24,fit:'stretch',role:'unfreezing-side-effect',side});
 }
 return{effects,logoFrame:manifest.frames[logoFrame]?logoFrame:null,visibleFrozenColumns:current};
}

// Called only for a new20 title after its ordinary checked scene is created.
// Geometry remains in the scene's own coordinate system. No receipt is edited.
export function smartSoftMovingScene(scene,manifest,motion,{time=0,images=null,receiptElapsedMs=0,winPresentationActive=true}={}){
 if(!supportsSmartSoftMotion(manifest?.id)||scene.gameId!==manifest.id)return scene;
 const art=images?.get?.(SMARTSOFT_ART_KEY),native=scene.nativeVisual||{},seconds=Math.max(0,time)/1000;
 const active=motion?.mode==='smartsoft-native'&&motion.id===manifest.id?motion:null;
 const pending=active?!active.complete:native.pending===true;
 scene={...scene,nativeControlTime:seconds,nativeControlSpinTime:Math.max(0,active?.elapsed||0)/1000};
 const elapsed=active?.complete?Math.max(0,(active.elapsed-active.completedAt)/1000):Number.isFinite(receiptElapsedMs)?Math.max(0,receiptElapsedMs/1000):0;
 const frozen=art?frozenPresentation(scene,manifest,native,active,elapsed,art):{effects:[],logoFrame:null};
 const moving=active?movingSymbols(scene,manifest,active):null,strip=active?.multiplier?.kind==='strip'?movingMultiplier(scene,manifest,active.multiplier):null;
 let symbolsInserted=false,stripInserted=false,logoInserted=false;
 let commands=scene.commands.flatMap(command=>{
  if((manifest.id==='burningice10_native'||manifest.id==='burningice40_native')&&frozen.visibleFrozenColumns){
   // Static column/hold decorations follow the same display state as the
   // original ice sequence, including the final thaw. Receipt data stays put.
   const column=command.box?Math.round((command.box.x-scene.boardGeometry.x)/(scene.boardGeometry.width/manifest.grid.columns)):null;
   if(command.frame===manifest.featurePresentation.holdFrame&&!frozen.visibleFrozenColumns.has(column))return[];
   if(command.frame===manifest.board.activeFrame&&!frozen.visibleFrozenColumns.has(column))return[{...command,frame:manifest.board.frame}];
  }
  if(moving&&(command.role==='symbol'||command.role==='empty-cell')){if(symbolsInserted)return[];symbolsInserted=true;return moving;}
  if(strip&&command.role==='multiplier-value'){if(stripInserted)return[];stripInserted=true;return strip;}
  if(pending&&command.type==='outline')return[];
  if(active?.multiplier?.kind==='wheel'&&['multiplier-wheel','multiplier-wheel-selected'].includes(command.role))return[{...command,rotation:active.multiplier.angle}];
  if(command.role==='game-logo'&&manifest.featurePresentation?.type==='frozen-reels')return[{...command,frame:frozen.logoFrame||command.frame,padding:true}];
  if(command.role==='game-logo'&&art?.skeletons.has('logo')){if(logoInserted)return[];logoInserted=true;return[animation('logo','animation',rectangle(70,78,280,94),seconds,{loop:true,role:'game-logo'})];}
  if(command.type==='image'&&command.file===manifest.background?.file&&art?.skeletons.has('background'))return[animation('background','animation2',command.box,seconds,{loop:true,fit:'cover',clip:command.box,role:'game-background'})];
  return[command];
 });
 // Before the first confirmed round there are no static multiplier-value
 // commands to replace. Insert moving decorative labels immediately below the
 // existing selected-border art; this never supplies a result multiplier.
 if(strip&&!stripInserted){const at=commands.findIndex(command=>command.role==='multiplier-selected-border');commands.splice(at<0?commands.length:at,0,...strip);commands=commands.filter(command=>command.role!=='empty-multiplier');}
 if(!art||pending||!Array.isArray(native.grid))return{...scene,commands:addEffects(commands,frozen.effects)};
 const g=scene.gridGeometry,cw=g.width/manifest.grid.columns,ch=g.height/manifest.grid.rows;
 const wins=Array.isArray(native.wins)?native.wins:[];
 // Public Box.config.winLines='combined' and winLinesTime=0 animate all
 // accepted winning cells together. Individual caption clocks are separate.
 const selected=wins;
 const cells=new Set(selected.flatMap(win=>Array.isArray(win.cells)?win.cells.filter(cell=>Array.isArray(cell)&&cell.length===2&&Number.isInteger(cell[0])&&Number.isInteger(cell[1])&&cell[0]>=0&&cell[0]<manifest.grid.columns&&cell[1]>=0&&cell[1]<manifest.grid.rows).map(cell=>cell.join(':')):[]));
 const effects=[...frozen.effects],replaced=new Set(),expanded=new Set();
 for(const column of native.feature?.expandedReels||[]){
  if(!Number.isInteger(column)||column<0||column>=manifest.grid.columns)continue;
  const symbol=native.grid[column]?.[0],role='expanded-'+symbol;
  if(manifest.id==='safarisimba_native'&&art.skeletons.has(role)&&native.grid[column].every(item=>String(item)===String(symbol))){
   expanded.add(column);effects.push(animation(role,'animation',rectangle(g.x+column*cw,g.y,cw,g.height),elapsed,{loop:true,clip:g,role:'expanded-symbol',column}));
  }
 }
 for(const key of cells){
  const[column,row]=key.split(':').map(Number);if(expanded.has(column))continue;
  const symbol=String(native.grid[column][row]),target=rectangle(g.x+column*cw+cw*.04,g.y+row*ch+ch*.025,cw*.92,ch*.95);
  const role='symbol-'+symbol;
  if(art.skeletons.has(role)){replaced.add(key);effects.push(animation(role,manifest.id==='habeshafortune5_native'&&symbol==='6'?'qali':'animation',target,elapsed,{loop:true,clip:g,role:'winning-symbol',column,row}));}
  else if(manifest.id==='multihotdeluxe_native'&&art.skeletons.has('symbols')){replaced.add(key);effects.push(animation('symbols',DELUXE_SYMBOLS[Number(symbol)]+' - Intro',target,elapsed,{next:DELUXE_SYMBOLS[Number(symbol)]+' - Loop',clip:g,role:'winning-symbol',column,row}));}
  else if(art.sequences.has('BoxWin'))effects.push(sequence('BoxWin',rectangle(target.x-cw*.05,target.y-ch*.08,cw*1.02,ch*1.12),elapsed,{fps:['multihot100_native','multihot5superwilds_native'].includes(manifest.id)?21:active?.turbo?36:24,loop:false,clip:g,role:'winning-symbol-border',column,row}));
 }
 if(wins.length&&art.skeletons.has('multiplier')){
  const record=art.skeletons.get('multiplier'),vertical=scene.multiplierGeometry;
  const target=vertical?rectangle(vertical.x,vertical.y+vertical.height*.29,vertical.width,vertical.height*.42):rectangle(180,g.y-92,60,90);
  const animationName=manifest.id==='safarisimba_native'?'Intro':'charcho cecxli start';
  if(Object.hasOwn(record.skeleton.durations,animationName))effects.push(animation('multiplier',animationName,target,elapsed,{next:manifest.id==='safarisimba_native'?null:'charcho cecxli loop',role:'winning-multiplier'}));
 }
 if(wins.length&&scene.multiplierGeometry&&art.sequences.has('X'+native.feature?.multiplier))effects.push(sequence('X'+native.feature.multiplier,scene.multiplierGeometry,elapsed,{fps:active?.turbo?60:36,role:'winning-multiplier'}));
 effects.push(...wholeLineEffects(scene,manifest,wins,elapsed),...segmentLineEffects(scene,manifest,wins,elapsed,art),...lineCaption(scene,manifest,native,wins,elapsed));
 if(manifest.featurePresentation?.type==='frozen-reels'){
  const forty=manifest.id==='burningice40_native',coin=forty?'ColumnEffect-40':'ColumnEffect';
  // ColumnEffect belongs to accepted lucky-coin Wild reels, separately from
  // the15fps Ice1 freeze transition (Slots/blazinghot.js columnTimer).
  for(const[columnIndex,column]of(native.feature?.coinReels||[]).entries()){
   if(!Number.isInteger(column)||column<0||column>=manifest.grid.columns||!art.sequences.has(coin))continue;
   const delayed=elapsed-(columnIndex*200+200)/1000;
   if(delayed>=0)effects.push(sequence(coin,rectangle(g.x+column*cw,g.y,cw,g.height),delayed,{fps:24,role:'coin-wild-effect',column}));
  }
 }
 // Overlay authored native win artwork only during this accepted spin's
 // presentation. Restoration and gamble receipt updates do not replay a win.
 const spinWin=validMoney(native.baseWinMinor)?native.baseWinMinor:native.winMinor;
 const tier=winPresentationActive&&active?.complete&&active.roundId===native.roundId&&native.finalFrame?smartSoftWinTier(manifest.id,spinWin,native.stakeMinor):null;
 if(tier&&art.skeletons.has('win')){
  const record=art.skeletons.get('win'),duration=tier.legacy?(record.skeleton.durations[tier.name]||0)*1000:tier.duration;
  const timing=remainingModernWinTiming(manifest.id,tier),popupTime=timing?elapsed-timing.popupAt/1000:elapsed;
  // Blazing's source maps its three levels to mogeba3/2/1. Render that finite
  // original animation and the confirmed total, never a made-up interim win.
  // Its unrecovered initial text-delay setting is not presented as verified.
  if(timing?elapsed*1000>=timing.popupAt&&elapsed*1000<timing.removeAt:elapsed*1000<duration){
   const popup=rectangle(35,280,350,250),nativeScale=g.width/(5*223),sourceTransform=tier.legacy?{sourceOrigin:{x:653.88,y:676.52},nativeScale}:{};
   // The Blazing source places win/coin roots at430,1200 and840,1170.
   // Preserve that common coordinate frame. Fitting flight-path bounds would
   // shrink the central title and collapse the coin shower to a narrow strip.
   if(tier.legacy&&tier.level===3&&art.skeletons.has('win-coins'))for(const delay of [.2,.8,1.4])if(elapsed>=delay)effects.push(animation('win-coins','big win',popup,elapsed-delay,{sourceOrigin:{x:243.88,y:manifest.id==='burningice40_native'?671.52:646.52},nativeScale,clip:rectangle(0,170,420,505),role:'win-coins'}));
   effects.push(animation('win',tier.name,popup,popupTime,{...sourceTransform,role:'win-tier',level:tier.level}));
   const textPosition=tier.legacy?{x:210+5.12*nativeScale,y:405+(tier.level===1?-33.48+24:138.52+24)*nativeScale,size:48*nativeScale,color:tier.level===1?'#00ff9c':'#fff669'}:{x:210,y:486,size:27,color:'#fff669'};
   if(!timing||elapsed*1000>=timing.amountAt){
    // Public Components/win.js uses a linear count-up. Only the displayed
    // integer minor amount changes; the canonical payout remains untouched.
    const displayedMinor=timing?remainingModernCountMinor(spinWin,timing,elapsed*1000):spinWin;
    effects.push({type:'text',text:minorMoney(displayedMinor??spinWin)+' '+native.currency,...textPosition,align:'center',role:'win-tier-amount',payoutMinor:spinWin,displayedMinor:displayedMinor??spinWin});
   }
  }
 }
 if(replaced.size||expanded.size)commands=commands.filter(command=>command.role!=='symbol'||(!replaced.has(command.column+':'+command.row)&&!expanded.has(command.column)));
 // Place effects after reel cells and before bottom navigation. They never
 // cover or intercept the host's DOM controls.
 if(effects.some(command=>['winning-symbol','winning-symbol-border','winning-line','winning-line-segment'].includes(command.role)))commands=commands.filter(command=>command.type!=='outline');
 return{...scene,commands:addEffects(commands,effects)};
}
