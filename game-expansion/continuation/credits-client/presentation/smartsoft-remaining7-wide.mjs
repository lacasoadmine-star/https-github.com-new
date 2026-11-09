// R5 desktop-only composition for the seven independently observed titles.
// Public source coordinates and the 2026-11-09 free-demo captures are art
// references. This projection never chooses symbols, actions or payouts.
import {SMARTSOFT_REMAINING7_IDS} from './smartsoft-remaining7-view.mjs';
import {supportsBurningIcePair} from '../burningice-wager-actions.mjs';

const ids=new Set(SMARTSOFT_REMAINING7_IDS);
const box=(x,y,width,height)=>({x,y,width,height});
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const modernControls=(play,autoplay,bet,menu,sound,turbo,gamble,collect)=>({play,autoplay,bet,menu,sound,turbo,gamble,collect});
export const REMAINING7_WIDE_PROFILES=freeze({
 multihotwildways_native:{width:2170,height:1154,board:box(670,162,1043,707),grid:box(690,208,1008,630),multiplier:box(423,168,250,700),logo:box(865,12,640,184),symbolSize:500,symbolOffset:-238,
  controls:modernControls([1768,405],[1831,255],[1832,683],[10,1010],[2104,1000],[1999,387],[1848,136],[1848,828]),balance:box(768,980,270,84),bet:box(1338,980,270,84),win:box(1048,977,281,88),rule:'27 WAYS'},
 multihot5wild_native:{width:2170,height:1154,board:box(670,162,1043,707),grid:box(690,208,1008,630),multiplier:box(423,168,250,700),logo:box(847,12,705,190),symbolSize:500,symbolOffset:-238,
  controls:modernControls([1768,405],[1831,255],[1832,683],[10,1010],[2104,1000],[1999,387],[1848,136],[1848,828]),balance:box(618,980,270,84),bet:box(1378,980,270,84),win:box(912,952,442,135),rule:'5 LINES FIXED'},
 multihot5superwilds_native:{width:2170,height:1220,board:box(510,75,1119,947),grid:box(536,341,1080,630),wheel:{x:1069,y:723},logo:box(-56,123,720,203),symbolSize:500,symbolOffset:-250,
  controls:modernControls([1795,455],[1867,316],[1867,745],[68,1080],[2060,1085],[2021,415],[1882,195],[1882,892]),balance:box(598,1055,270,84),bet:box(1280,1056,270,84),win:box(933,1053,281,88)},
 multihotdeluxe_native:{width:2170,height:1220,board:box(740,160,715,733),grid:box(764,182,690,651),multiplier:box(563,227,197,604),logo:box(750,-5,800,203),symbolSize:500,symbolOffset:-238,iconSpin:true,
  controls:modernControls([1768,510],[1826,355],[1832,777],[240,1100],[1884,1100],[1985,460],[1837,230],[1845,923]),balance:box(812,1060,270,83),bet:box(1098,1060,270,83),win:box(875,935,457,114)},
 burningice_native:{width:2170,height:1130,legacy:true,board:box(532,204,1108,648),grid:box(530.5,205,1115,630),logo:box(784,0,614,260),lineIcons:box(413,189,1342,663),footer:box(622,867,929,84),symbolSize:400,symbolOffset:-200,coinMeter:box(816,112,548,87)},
 burningice10_native:{width:2170,height:1130,legacy:true,board:box(532,204,1108,648),grid:box(530.5,205,1115,630),logo:box(784,0,614,260),lineIcons:box(413,189,1342,663),footer:box(622,867,929,84),symbolSize:400,symbolOffset:-200,coinMeter:box(816,112,548,87)},
 burningice40_native:{width:2170,height:1130,legacy:true,board:box(532,104,1108,829),grid:box(530.5,110.5,1115,820),logo:box(784,-17,614,260),lineIcons:box(413,89,1346,858),footer:box(622,931,929,84),symbolSize:400,symbolOffset:-200}
});
const MAPPED={play:'spin',autoplay:'autoPlay',bet:'bet',menu:'menu',sound:'sound',turbo:'turbo',gamble:'gamble',collect:'collect'};
// Native Common.container + containerLinesBox.y + text.y, converted from
// PIXI's top to the host Canvas middle baseline. The portrait caption lies
// below its grid and must not be stretched by the desktop reel projection.
const CAPTIONS={multihotwildways_native:{y:899,size:20,line:false},multihot5wild_native:{y:899,size:20,line:false},multihot5superwilds_native:{y:1019,size:20,line:true},multihotdeluxe_native:{y:908,size:18,line:false}};
export const isRemaining7Wide=id=>ids.has(id);
export const remaining7WideSize=id=>{const p=REMAINING7_WIDE_PROFILES[id];return p?{width:p.width,height:p.height}:null;};
export const isRemainingLegacy=id=>REMAINING7_WIDE_PROFILES[id]?.legacy===true;
const money=value=>{if(typeof value!=='string'||!/^\d+(?:\.\d{1,2})?$/.test(value))return '—';const[w,f='']=value.split('.');return w.replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+f.padEnd(2,'0');};
const minor=value=>typeof value==='string'&&/^\d+$/.test(value)?`${BigInt(value)/100n}.${String(BigInt(value)%100n).padStart(2,'0')}`:'0.00';

export function remaining7ControlGeometry(scene,manifest){
 const p=REMAINING7_WIDE_PROFILES[manifest?.id];if(!p)return scene.controlsGeometry;
 // The original carousel overlaps the lower padding of the Plus artwork.
 // Its independent hit region ends at the next-stake row, preserving the
 // source pixels while preventing a transparent rectangle from stealing taps.
 if(p.legacy){
  const controls={play:box(1808,409,284,260),autoplay:box(137,178,173,191),gamble:box(137,426,173,191),increase:box(1869,222,161,127),decrease:box(1871,700,159,148),bet:box(1881,349,133,60),menu:box(2075,5,75,75)};
  if(supportsBurningIcePair(manifest.id)){
   delete controls.bet;
   // The same captured Slots_blazinghot.js carousel supplies both titles.
   // Keep its 79px neighbor rows; draw order puts them above the spin padding.
   controls.startNext=box(1881,349,133,79);
   controls.startPrevious=box(1881,648,133,79);
  }
  return controls;
 }
 return Object.fromEntries(Object.entries(p.controls).flatMap(([name,[x,y]])=>{
  if(['gamble','collect'].includes(name)&&!scene.wideState?.[name])return[];
  const frame=manifest.frames?.[manifest.controls?.[MAPPED[name]]?.idle];return frame?[[name,box(x,y,frame.original.width,frame.original.height)]]:[];
 }));
}

function project(command,origin,target){
 const sx=target.width/origin.width,sy=target.height/origin.height;
 const point=p=>({x:target.x+(p.x-origin.x)*sx,y:target.y+(p.y-origin.y)*sy});
 const rect=b=>({...point(b),width:b.width*sx,height:b.height*sy});
 const out={...command};if(command.box)out.box=rect(command.box);if(command.clip)out.clip=rect(command.clip);
 if(command.clipPolygon)out.clipPolygon=command.clipPolygon.map(point);if(command.rotateAt)out.rotateAt=point(command.rotateAt);
 if(Number.isFinite(command.x)&&Number.isFinite(command.y))Object.assign(out,point(command));
 if(Number.isFinite(command.size))out.size=command.size*Math.min(sx,sy);if(Number.isFinite(command.lineWidth))out.lineWidth=command.lineWidth*Math.min(sx,sy);
 if(Number.isFinite(command.nativeScale))out.nativeScale=command.nativeScale*Math.min(sx,sy);return out;
}

function sourceSymbol(command,scene,manifest,p){
 const source=scene.gridGeometry,rows=manifest.grid.rows,columns=manifest.grid.columns,cw=source.width/columns,ch=source.height/rows;
 const placement=manifest.symbolPlacement;
 // The moving scene records a fractional reel offset in its box. Preserve it
 // exactly while moving the symbol to the original desktop cell coordinates.
 const centerY=placement?command.box.y-placement.offsetY*Math.min(cw/placement.cellWidth,ch/placement.cellHeight):command.box.y-ch*.055;
 const row=(centerY-source.y-(placement?ch/2:0))/ch;
 const dcw=p.grid.width/columns,dch=p.grid.height/rows,x=p.grid.x+command.column*dcw,y=p.grid.y+row*dch;
 const target=box(x+dcw/2+p.symbolOffset,y+dch/2+p.symbolOffset,p.symbolSize,p.symbolSize);
 const clip=box(x,p.grid.y,dcw,p.grid.height);
 return {...command,box:target,clip,padding:true,fit:'stretch'};
}

export function remaining7WideScene(scene,manifest){
 const p=REMAINING7_WIDE_PROFILES[manifest?.id];if(!p||!scene.wideLayout||!scene.boardGeometry||!scene.gridGeometry)return scene;
 const commands=[],state=scene.wideState||{},geometry=remaining7ControlGeometry(scene,manifest),currency=state.currency||'ETB';
 const sprite=(frame,target,extra={})=>{if(manifest.frames?.[frame])commands.push({type:'sprite',frame,box:target,padding:true,...extra});};
 const text=(value,x,y,size,color='#fff',extra={})=>commands.push({type:'text',text:String(value),x,y,size,color,align:'center',...extra});
 commands.push({type:'rect',box:box(0,0,p.width,p.height),color:'#032b20'});
 if(manifest.background?.file)commands.push({type:'image',file:manifest.background.file,box:box(0,0,p.width,p.height),fit:'cover'});
 else if(manifest.background?.frame)sprite(manifest.background.frame,box(0,0,p.width,p.height),{fit:'cover'});
 const hasNativeLogo=scene.commands.some(c=>c.role==='game-logo'&&c.type==='native-animation');
 let reelBackgroundsAdded=false;
 const addReelBackgrounds=()=>{
  if(reelBackgroundsAdded||!['multihotwildways_native','multihot5wild_native'].includes(manifest.id))return;
  reelBackgroundsAdded=true;
  // The source column atlas contains an opaque reel background. The board
  // outline arrives after symbols in the raw scene, so its backgrounds must
  // be inserted separately before the first fruit, never over the landing.
  for(let column=0;column<3;column++)sprite('Start/Column',box(p.grid.x+column*336,p.grid.y-4,328,648),{role:'reel-column',column});
 };
 for(const command of scene.commands){
  const role=command.role||'';
  if(role==='game-background'){commands.push({...command,box:box(0,0,p.width,p.height),clip:box(0,0,p.width,p.height)});continue;}
  if(role==='game-logo'){
   if(hasNativeLogo||!manifest.logo.layers)commands.push({...command,box:p.logo,padding:p.legacy});
   else if(command.frame===manifest.logo.layers[0].frame){
    const b=manifest.logo.bounds,s=Math.min(p.logo.width/b.width,p.logo.height/b.height);
    for(const layer of manifest.logo.layers)sprite(layer.frame,box(p.logo.x+(layer.box.x-b.x)*s,p.logo.y+(layer.box.y-b.y)*s,layer.box.width*s,layer.box.height*s),{role:'game-logo',fit:'stretch'});
   }continue;
  }
  if(role.startsWith('multiplier-wheel')&&p.wheel){
   const old=scene.commands.find(c=>c.role==='multiplier-wheel-background')?.box;if(!old)continue;
   commands.push(project(command,old,box(p.wheel.x-660,p.wheel.y-660,1320,1320)));continue;
  }
  if((role.startsWith('multiplier-')||role==='empty-multiplier'||role==='winning-multiplier')&&p.multiplier&&scene.multiplierGeometry){
   if(role==='empty-multiplier'&&scene.initialPreview?.kind==='source-initial-preview'&&scene.initialPreview.gameId===manifest.id&&scene.nativeVisual?.roundId===null&&scene.nativeVisual?.feature===null&&scene.nativeVisual?.pending===false){
    // All three public title scripts declare bottom-first indices [1,5,3].
    // These opening labels are decorative and never enter the receipt model.
    for(const[value,row]of [[3,0],[5,1],[1,2]]){
     const f=manifest.featurePresentation,frame=row===1&&f.activeValueFrames?.[value]||f.valueFrames[value],size=manifest.frames[frame].original,scale=p.multiplier.height/manifest.frames[f.backgroundFrame].height;
     sprite(frame,box(p.multiplier.x+(p.multiplier.width-size.width*scale)/2,p.multiplier.y+p.multiplier.height*f.rowCenters[row]-size.height*scale/2,size.width*scale,size.height*scale),{role:'multiplier-value',value,selected:row===1,opacity:row===1?1:.4,valueSource:'decorative-initial'});
    }
   }else commands.push(project(command,scene.multiplierGeometry,p.multiplier));continue;
  }
  if(command.frame&&(command.frame===manifest.board?.frame||command.frame===manifest.board?.activeFrame)){
   if(p.legacy){const column=Math.round((command.box.x-scene.boardGeometry.x)/(scene.boardGeometry.width/manifest.grid.columns));sprite(command.frame,box(p.board.x+column*223,p.board.y,216,p.board.height),{role:'reel-column',column});}
   else{
    addReelBackgrounds();
    sprite(command.frame,p.board,{role:'reel-board',fit:'stretch'});
   }continue;
  }
  if(role==='symbol'){addReelBackgrounds();commands.push(sourceSymbol(command,scene,manifest,p));continue;}
  if(role==='freezing-logo'||role==='unfreezing-logo'){commands.push(project(command,box(58,71,304,139),p.logo));continue;}
  if(role==='win-tier'||role==='win-tier-amount'||role==='win-coins'){
   commands.push(project(command,box(35,280,350,250),box(p.grid.x+p.grid.width*.08,p.grid.y+p.grid.height*.12,p.grid.width*.84,p.grid.height*.78)));continue;
  }
  if(['winning-line-caption','winning-caption-symbol','winning-caption-amount'].includes(role)&&CAPTIONS[manifest.id]){
   const caption=CAPTIONS[manifest.id];if(role==='winning-line-caption'&&!caption.line)continue;
   const projected=project(command,scene.gridGeometry,p.grid);
   if(projected.type==='text'){projected.y=caption.y;projected.size=caption.size;}
   else if(projected.box){const frame=manifest.frames[projected.frame]?.original;if(frame)projected.box={...projected.box,y:caption.y-frame.height/2,width:frame.width,height:frame.height};}
   commands.push(projected);continue;
  }
  if(command.type==='outline'||/^(?:empty-cell|winning-|expanded-|frozen-|unfreezing-reel|unfreezing-side|coin-wild)/.test(role)){
   commands.push(project(command,scene.gridGeometry,p.grid));continue;
  }
 }
 if(p.legacy){
  // Each title supplies its own line-strip art; the 40-line frame is taller.
  sprite(manifest.featurePresentation?.lineIconsFrame,p.lineIcons,{role:'source-line-icons'});
  if(p.coinMeter){
   sprite('Start/WildHeader',p.coinMeter,{role:'coin-meter'});
   const supplied=new Set(scene.nativeVisual?.feature?.coinReels||[]);
   for(let i=0;i<3;i++)sprite(supplied.has(i+1)?'Start/WildActive':'Start/Wild',box(p.coinMeter.x-142+i*230,p.coinMeter.y-7,400,101),{role:'coin-meter-value',column:i+1,opacity:supplied.has(i+1)?1:.3});
  }
  sprite('Buttons/Background',box(1861,299,179,462),{role:'wide-bet-background'});
  sprite(state.pending?'Buttons/SpinStop':'Buttons/Spin',geometry.play,{role:'wide-control',control:'play'});
  sprite(state.increaseEnabled?'Buttons/Plus':'Buttons/PlusDisabled',box(1869,222,161,162),{role:'wide-control',control:'increase'});
  sprite(state.decreaseEnabled?'Buttons/Minus':'Buttons/MinusDisabled',geometry.decrease,{role:'wide-control',control:'decrease'});
  sprite(state.canStart?'Buttons/AutoPlay':'Buttons/AutoPlayDisabled',geometry.autoplay,{role:'wide-control',control:'autoplay'});
  sprite(state.gamble?'Buttons/Double':'Buttons/DoubleDisabled',geometry.gamble,{role:'wide-control',control:'gamble'});
  if(supportsBurningIcePair(manifest.id)){
   for(const[name,stake,target,enabled]of [['startNext',state.nextStake,geometry.startNext,state.increaseEnabled],['startPrevious',state.previousStake,geometry.startPrevious,state.decreaseEnabled]]){
    sprite(enabled?'Buttons/Bet':'Buttons/BetDisabled',target,{role:'wide-control',control:name});
    if(stake){text(money(stake),target.x+67,target.y+23,30,'#fdff5b',{role:'wide-neighbor-stake',control:name});text(currency,target.x+67,target.y+52,currency==='CREDITS'?18:24,'#fdff5b');}
   }
  }else if(state.nextStake){text(money(state.nextStake),1948,375,30,'#fdff5b',{role:'wide-next-stake'});text(currency,1948,402,24,'#fdff5b');}
  text(state.pending?'STOP':money(state.stake),1950,472,45,'#fdff5b',{role:'wide-stake-amount'});text(currency,1950,514,currency==='CREDITS'?24:30,'#fdff5b');
  // The missing original collect icon is deliberately left to the existing
  // host's accessible TAKE WIN control. No wrong-title artwork is substituted.
  sprite('Start/Footer',p.footer,{role:'wide-footer'});
  text(money(state.balance)+' '+currency,p.footer.x+188,p.footer.y+47,24,'#fff',{role:'wide-balance-amount'});
  text(minor(state.winMinor)+' '+currency,p.footer.x+487,p.footer.y+47,24,'#fff',{role:'wide-win-amount'});
  text(minor(state.baseWinMinor)+' '+currency,p.footer.x+795,p.footer.y+47,24,'#fff',{role:'wide-last-win-amount'});
  text('☰',2112,42,38,'#fff',{role:'wide-menu-fallback'});
 }else{
  for(const[name,target]of Object.entries(geometry)){
   const control=manifest.controls[MAPPED[name]],frame=name==='play'?(state.pending?control.stop:state.canStart?control.idle:control.disabled||control.idle):name==='autoplay'&&state.autoplay?control.stop||control.idle:control.idle;
   sprite(frame,target,{role:'wide-control',control:name});
  }
  if(!p.iconSpin){const target=geometry.play,label=state.pending?'STOP':state.collect?'TAKE WIN':state.canStart?'HOLD\n&\nSPIN':state.authenticated?'PAUSED':'SIGN IN',lines=label.split('\n');lines.forEach((line,index)=>text(line,target.x+target.width/2,target.y+target.height/2+(index-(lines.length-1)/2)*30,lines.length>1?23:25,'#fff',{role:'wide-spin-label'}));}
  if(p.iconSpin)sprite('Start/Footer',box(812,1060,554,83));
  for(const[name,label]of [['balance','BALANCE'],['bet','BET'],['win','WIN']]){
   if(name==='win'&&!state.showWin)continue;const target=p[name];
   if(!p.iconSpin||name==='win')sprite('Start/Footer'+name[0].toUpperCase()+name.slice(1),target);
   text(label,target.x+target.width/2,target.y+target.height*.3,24,'#fff23c',{role:'wide-'+name+'-label'});
   text((name==='win'?minor(state.winMinor):money(state[name==='bet'?'stake':'balance']))+' '+currency,target.x+target.width/2,target.y+target.height*.66,currency==='CREDITS'?18:22,'#fff',{role:'wide-'+name+'-amount'});
  }
  // WildWays/5Wild rule and MULTIPLIER captions are already in the original
  // board/strip atlas. Drawing another text label would double their glyphs.
 }
 return {...scene,width:p.width,height:p.height,commands,boardGeometry:p.board,gridGeometry:p.grid,controlsGeometry:geometry,wideLayoutApplied:true,remainingSevenWide:true};
}

export function remaining7WideBinding(scene,manifest,snapshot,viewport){
 const p=REMAINING7_WIDE_PROFILES[manifest?.id];if(!p||viewport.width<900||viewport.width<=viewport.height)return scene;
 const active=snapshot.round?.status==='active',actions=snapshot.roundActions||[],adjacent=snapshot.remainingLegacyWager||{};
 return {...scene,wideLayout:true,wideState:{balance:snapshot.balance,stake:snapshot.stake,currency:snapshot.currency,pending:snapshot.pending,canStart:snapshot.canStart,authenticated:snapshot.authenticated,autoplay:snapshot.autoplayActive,
  gamble:active&&actions.includes('gamble'),collect:active&&actions.includes('collect'),showWin:active&&BigInt(snapshot.round.currentCashoutMinor??'0')>0n,
  // Collected receipts retain their audited payout, but the public demo clears
  // the held-win counters immediately after collection. Do that in view state.
  winMinor:active?snapshot.round.currentCashoutMinor:'0',baseWinMinor:active?snapshot.round?.baseWinMinor??'0':'0',
  nextStake:adjacent.nextStake,previousStake:adjacent.previousStake,increaseEnabled:adjacent.increaseEnabled===true,decreaseEnabled:adjacent.decreaseEnabled===true},
  additionalAssetFrames:Object.keys(manifest.frames).filter(key=>/^(?:Start\/Footer|Start\/Wild|Start\/Column$|Buttons\/Plus|Buttons\/Minus|Buttons\/Background)/.test(key)||supportsBurningIcePair(manifest.id)&&/^Buttons\/Bet/.test(key)||key===manifest.featurePresentation?.lineIconsFrame)};
}
