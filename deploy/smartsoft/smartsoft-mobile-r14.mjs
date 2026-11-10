// Source mobile coordinates are separate from the accepted-receipt coordinate
// system. This last projection moves art, clips, animations and hit regions
// together. It never changes a symbol, stake, receipt or payout.
import {MOBILE_PROFILES} from './mobile-profiles-r14.mjs';
const ICE=new Set(['burningice_native','burningice10_native','burningice40_native']);
const box=(x,y,width,height)=>({x,y,width,height});
const money=value=>{if(typeof value!=='string'||!/^\d+(?:\.\d{1,2})?$/.test(value))return '—';const [whole,fraction='']=value.split('.');return whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+fraction.padEnd(2,'0');};
const minor=value=>typeof value==='string'&&/^\d+$/.test(value)?`${BigInt(value)/100n}.${String(BigInt(value)%100n).padStart(2,'0')}`:'0.00';
const mobileFrame=(manifest,name)=>manifest.frames['@Mobile/'+name]?'@Mobile/'+name:null;
export function projectCommand(command,origin,target){
 const sx=target.width/origin.width,sy=target.height/origin.height;
 const point=p=>({x:target.x+(p.x-origin.x)*sx,y:target.y+(p.y-origin.y)*sy});
 const rect=b=>({...point(b),width:b.width*sx,height:b.height*sy});
 const out={...command};if(command.box)out.box=rect(command.box);if(command.clip)out.clip=rect(command.clip);
 if(command.clipPolygon)out.clipPolygon=command.clipPolygon.map(point);if(command.rotateAt)out.rotateAt=point(command.rotateAt);
 if(Number.isFinite(command.x)&&Number.isFinite(command.y))Object.assign(out,point(command));
 if(Number.isFinite(command.size))out.size=command.size*Math.min(sx,sy);
 if(Number.isFinite(command.lineWidth))out.lineWidth=command.lineWidth*Math.min(sx,sy);
 if(Number.isFinite(command.nativeScale))out.nativeScale=command.nativeScale*Math.min(sx,sy);
 return out;
}
export function bindMobileScene(scene,manifest,snapshot,viewport){
 const modern=MOBILE_PROFILES[manifest?.id];
 if(modern&&!scene.wideLayout&&viewport.width>0&&viewport.height>viewport.width&&mobileFrame(manifest,modern.board.frame)){
  const frames=[modern.board.frame,...Object.values(modern.footer).map(v=>v?.frame),...Object.values(modern.controls).map(v=>v?.frame),...Object.values(manifest.symbols).flatMap(s=>[s.frame,s.blurFrame]),...Object.keys(manifest.frames).filter(k=>/^Multiplier\//.test(k))].map(frame=>mobileFrame(manifest,frame)).filter(Boolean);
  const mobileProfile=resizeMobileProfile(modern,viewport);
  return {...scene,width:mobileProfile.width,height:mobileProfile.height,mobileProfile,modernMobileLayout:true,mobileState:snapshot,additionalAssetFrames:[...(scene.additionalAssetFrames||[]),...frames]};
 }
 if(!ICE.has(manifest?.id)||scene.wideLayout||scene.sourcePresentation||!mobileFrame(manifest,'Start/FooterVertical')||!(viewport.width>0&&viewport.height>viewport.width))return scene;
 const height=Math.max(1006,viewport.height/viewport.width*566);
 const extra=height-1006,top=Math.min(73,extra/2),bottom=extra-top;
 const state={...snapshot,...snapshot.remainingLegacyWager};
 const additional=Object.keys(manifest.frames).filter(key=>key.startsWith('@Mobile/'));
 return {...scene,width:566,height,mobileLayout:{top,bottom},mobileState:state,additionalAssetFrames:[...(scene.additionalAssetFrames||[]),...additional]};
}
export function resizeMobileProfile(profile,viewport){
 const r=profile.responsive,scale=Math.min(viewport.width/r.baseWidth,viewport.height/profile.height,1);
 const width=Math.floor(Math.min(Math.max(r.baseWidth,viewport.width/scale),r.maxWidth));
 const height=Math.floor(Math.min(Math.max(profile.height,viewport.height/scale),r.maxHeight));
 const dx=(width-profile.width)/2,dy=height-profile.height;
 const rect=(b,factor=0)=>({...b,x:b.x+dx,y:b.y+dy*factor});
 const image=(d,factor=0)=>d?{...d,box:rect(d.box,factor)}:d;
 return {...profile,width,height,board:image(profile.board,r.boardY),grid:rect(profile.grid,r.boardY),mask:rect(profile.mask,r.boardY),symbol:{...profile.symbol,box:rect(profile.symbol.box,r.boardY)},logo:image(profile.logo,r.logoY),
  controls:Object.fromEntries(Object.entries(profile.controls).map(([k,v])=>[k,image(v,r.controlsY)])),
  footer:Object.fromEntries(Object.entries(profile.footer).map(([k,v])=>[k,image(v,k==='winBackground'?r.winY:r.footerY)])),
  ...(profile.multiplier?{multiplier:rect(profile.multiplier,r.boardY)}:{}),
  ...(profile.wheel?{wheel:Object.fromEntries(Object.entries(profile.wheel).map(([k,b])=>[k,rect(b,r.boardY)]))}:{}),
 };
}
function iceGeometry(scene){
 const {top,bottom}=scene.mobileLayout;
 return {play:box(151,684+top+bottom,265,242),autoplay:box(59,544+top+bottom/2,130,143),gamble:box(223,545+top+bottom/2,130,143),collect:box(387,545+top+bottom/2,130,143),decrease:box(0,782+top+bottom,110,110),increase:box(459,782+top+bottom,104,110),bet:box(415,780+top+bottom,67,90)};
}
function sourceSymbol(command,scene,manifest,grid){
 const source=scene.gridGeometry,cw=source.width/manifest.grid.columns,ch=source.height/manifest.grid.rows,placement=manifest.symbolPlacement;
 const scale=placement?Math.min(cw/placement.cellWidth,ch/placement.cellHeight):1;
 const centerY=placement?command.box.y-placement.offsetY*scale:command.box.y-ch*.055;
 const row=(centerY-source.y-(placement?ch/2:0))/ch;
 const frame=mobileFrame(manifest,command.frame)||command.frame,descriptor=manifest.frames[frame];
 return {...command,frame,box:box(grid.x+(command.column+.5)*113-100,grid.y+(row+.5)*112-100,descriptor.original.width,descriptor.original.height),clip:box(grid.x+command.column*113,grid.y,113,grid.height),padding:true,fit:'stretch'};
}
export function projectMobileScene(scene,manifest){
 if(scene.modernMobileLayout)return projectModernMobile(scene,manifest);
 if(!scene.mobileLayout||!ICE.has(manifest?.id))return scene;
 const {top,bottom}=scene.mobileLayout,state=scene.mobileState,forty=manifest.id==='burningice40_native',ten=manifest.id==='burningice10_native';
 const grid=box(0,forty?56+top:145+top,565,forty?423:334),geometry=iceGeometry(scene),commands=[];
 const sprite=(name,target,extra={})=>{const frame=mobileFrame(manifest,name);if(frame)commands.push({type:'sprite',frame,box:target,padding:true,fit:'stretch',...extra});};
 const text=(value,x,y,size,color='#fff',extra={})=>commands.push({type:'text',text:String(value),x,y,size,color,align:'center',...extra});
 commands.push({type:'rect',box:box(0,0,566,scene.height),color:'#032b20'});
 if(manifest.mobileBackground){const b=manifest.mobileBackground;commands.push({type:'image',file:b.file,box:box(0,-73+top,566,b.height*566/b.width),fit:'stretch',role:'game-background'});}
 const clearIce10=ten&&scene.nativeVisual?.finalFrame===true&&scene.nativeVisual?.pending!==true;
 const frozen=new Set(clearIce10?[]:scene.nativeVisual?.feature?.frozenReels||[]);
 for(let column=0;column<5;column++)sprite(frozen.has(column)?'Start/ColumnActive':'Start/Column',box((forty?2:1)+column*113,grid.y,110,grid.height),{role:'reel-column',column});
 for(const command of scene.commands){
  const role=command.role||'';
  if(role==='symbol'){commands.push(sourceSymbol(command,scene,manifest,grid));continue;}
  if(command.type==='outline'||/^(empty-cell|winning-|expanded-|frozen-|unfreezing-reel|unfreezing-side|coin-wild)/.test(role)){
   commands.push(projectCommand(command,scene.gridGeometry,grid));continue;
  }
  if(role==='freezing-logo'||role==='unfreezing-logo')commands.push(projectCommand(command,box(58,71,304,139),forty?box(99,-18+top,375,159):ten?box(99,11+top,375,159):box(136,26+top,293,119)));
  if(['win-tier','win-tier-amount','win-coins'].includes(role))commands.push(projectCommand(command,box(35,280,350,250),box(30,grid.y+30,506,grid.height-45)));
 }
 // Mobile 10/40 supply distinct title and line-strip textures.
 sprite(frozen.size?'Start/LogoIce':'Start/Logo',forty?box(99,-18+top,375,159):ten?box(99,11+top,375,159):box(136,26+top,293,119),{role:'game-logo'});
 sprite('Start/LineIcons',forty?box(-16,7+top,591,481):box(-16,96+top,587,392),{role:'source-line-icons'});
 if(!forty){
  sprite('Start/WildHeader',box(151,97+top,265,42),{role:'coin-meter'});
  const active=new Set(scene.nativeVisual?.feature?.coinReels||[]);
  for(let i=0;i<3;i++)sprite(active.has(i+1)?'Start/WildActive':'Start/Wild',box(-4+i*110,87+top,372,61),{role:'coin-meter-value',column:i+1,opacity:active.has(i+1)?1:.3});
 }
 sprite('Start/FooterVertical',box(2,481+top,562,63),{role:'source-footer'});
 for(const[x,value,name]of [[104,state.balance,'balance'],[284,minor(state.round?.status==='active'?state.round?.currentCashoutMinor:state.round?.payoutMinor),'win'],[468,minor(state.round?.baseWinMinor),'base-win']]){
  text(name==='balance'?money(value):value,x,508+top,22,'#fff',{role:'mobile-'+name+'-amount'});text(state.currency,x,528+top,12);
 }
 sprite('Buttons/BackgroundVertical',box(61,752+top+bottom,440,148),{role:'bet-background'});
 const controls={play:state.pending?'Buttons/SpinVerticalStop':'Buttons/SpinVertical',autoplay:state.canStart?'Buttons/AutoPlayVertical':'Buttons/AutoPlayVerticalDisabled',gamble:state.round?.status==='active'&&state.round.actions?.includes('gamble')?'Buttons/DoubleVertical':'Buttons/DoubleVerticalDisabled',collect:state.round?.status==='active'?'Buttons/DoubleTakeVertical':'Buttons/DoubleTakeVerticalDisabled',increase:state.nextStake&&!state.pending?'Buttons/PlusVertical':'Buttons/PlusVerticalDisabled',decrease:state.previousStake&&!state.pending?'Buttons/MinusVertical':'Buttons/MinusVerticalDisabled'};
 for(const[name,frame]of Object.entries(controls))sprite(frame,geometry[name],{role:'mobile-control',control:name});
 text(state.pending?'STOP':money(state.stake),283,geometry.play.y+73,34,'#fdff5b',{role:'mobile-stake-amount'});text(state.currency,283,geometry.play.y+112,22,'#fdff5b');
 if(state.nextStake){text(money(state.nextStake),449,811+top+bottom,22,'#fdff5b',{role:'mobile-next-stake'});text(state.currency,449,841+top+bottom,18,'#fdff5b');}
 // The existing visible native menu owns sound/help/history. No invisible
 // menu, sound or turbo rectangle is added to this legacy mobile artwork.
 return {...scene,commands,controlsGeometry:geometry,mobileLayoutApplied:true};
}

function modernSymbol(command,scene,manifest,p){
 const g=scene.gridGeometry,cw=g.width/manifest.grid.columns,ch=g.height/manifest.grid.rows,placement=manifest.symbolPlacement;
 const scale=placement?Math.min(cw/placement.cellWidth,ch/placement.cellHeight):1;
 const row=(command.box.y-(placement?placement.offsetY*scale+ch/2:ch*.055)-g.y)/ch;
 const s=p.symbol,b=s.box,x=b.x+command.column*s.stepX,y=b.y+row*s.stepY;
 const left=p.grid.x+command.column*s.stepX,clip=box(Math.max(left,p.mask.x),p.mask.y,Math.min(s.stepX,p.mask.x+p.mask.width-left),p.mask.height);
 return {...command,frame:mobileFrame(manifest,command.frame)||command.frame,box:box(x,y,b.width,b.height),clip,padding:true,fit:'stretch'};
}
function projectModernMobile(scene,manifest){
 const p=scene.mobileProfile||MOBILE_PROFILES[manifest.id];if(!p)return scene;
 const state=scene.mobileState,commands=[],controls={},logos=[];
 const sprite=(name,target,extra={})=>{const frame=mobileFrame(manifest,name)||name;if(manifest.frames[frame])commands.push({type:'sprite',frame,box:target,padding:true,fit:'stretch',...extra});};
 const text=(value,x,y,size,color='#fff',extra={})=>commands.push({type:'text',text:String(value),x,y,size,color,align:'center',...extra});
 commands.push({type:'rect',box:box(0,0,p.width,p.height),color:'#032b20'});
 if(manifest.background?.file)commands.push({type:'image',file:manifest.background.file,box:box(0,0,p.width,p.height),fit:'cover',role:'game-background'});
 const symbols=[];
 for(const command of scene.commands){
  const role=command.role||'';
  if(role==='game-background'){commands.push({...command,box:box(0,0,p.width,p.height),clip:box(0,0,p.width,p.height)});continue;}
  if(role==='game-logo'){if(p.logo)logos.push({...command,box:p.logo.box});continue;}
  if(role.startsWith('multiplier-wheel')){
   const key=role==='multiplier-wheel-background'?'Multiplier/Background':role==='multiplier-wheel-selected'?'Multiplier/Light':'Multiplier/Numbers';
   const target=p.wheel?.[key];if(target&&command.box)commands.push(projectCommand({...command,frame:mobileFrame(manifest,command.frame)||command.frame},command.box,target));continue;
  }
  if((role.startsWith('multiplier-')||role==='empty-multiplier'||role==='winning-multiplier')&&p.multiplier&&scene.multiplierGeometry){commands.push(projectCommand({...command,...(command.frame?{frame:mobileFrame(manifest,command.frame)||command.frame}:{})},scene.multiplierGeometry,p.multiplier));continue;}
  if(role==='symbol'){symbols.push(modernSymbol(command,scene,manifest,p));continue;}
  if(command.type==='outline'||/^(empty-cell|winning-|expanded-|win-tier|win-coins)/.test(role)){symbols.push(projectCommand(command,scene.gridGeometry,p.grid));continue;}
 }
 // Column images form opaque backgrounds; the border follows the symbols in
 // these original mobile atlases. Keep that layering during reel motion too.
 if(['multihotwildways_native','multihot5wild_native'].includes(manifest.id)){
  for(let c=0;c<manifest.grid.columns;c++)sprite('Start/Column',box(p.grid.x+c*p.symbol.stepX,p.grid.y-9,p.symbol.stepX,p.grid.height+18),{role:'reel-column',column:c});
 }
 commands.push(...symbols);
 sprite(p.board.frame,p.board.box,{role:'reel-board'});
 // Re-add symbols over opaque legacy square board art, but retain the source
 // border for the titles whose atlas only contains a transparent outline.
 if(!['multihotwildways_native','multihot5wild_native'].includes(manifest.id)){
  const at=commands.indexOf(symbols[0]);if(at>=0){commands.splice(at,symbols.length);commands.push(...symbols);}
 }
 commands.push(...logos);
 for(const[name,descriptor]of Object.entries(p.controls)){
  if(!descriptor||!manifest.frames[descriptor.frame])continue;
  let frame=descriptor.frame;
  if(name==='play'&&state.pending)frame=manifest.controls.spin.stop||frame;
  if(name==='sound'&&state.soundEnabled)frame=manifest.controls.sound.idle||frame;
  controls[name]=descriptor.box;sprite(frame,descriptor.box,{role:'mobile-control',control:name});
 }
 const play=controls.play;
 if(play&&!state.pending&&manifest.id!=='multihotdeluxe_native'){
  const label=state.round?.status==='active'?['TAKE WIN']:['HOLD','&','SPIN'];
  label.forEach((line,index)=>text(line,play.x+play.width/2,play.y+play.height/2+(index-(label.length-1)/2)*23,16,'#e8ce0a',{role:'mobile-spin-label'}));
 }
 const footer=p.footer;
 if(footer.background?.box.width>5)sprite(footer.background.frame,footer.background.box,{role:'source-footer'});
 for(const[name,label]of [['balance','BALANCE'],['bet','BET'],['win','WIN']]){
  const descriptor=footer[name+'Background'];if(!descriptor||descriptor.box.width<5)continue;
  if(name==='win'&&!(state.round&&BigInt(state.round.currentCashoutMinor??state.round.payoutMinor??'0')>0n))continue;
  sprite(descriptor.frame,descriptor.box,{role:'source-'+name+'-footer'});
  const b=descriptor.box,value=name==='balance'?money(state.balance):name==='bet'?money(state.stake):minor(state.round.currentCashoutMinor??state.round.payoutMinor);
  text(label,b.x+b.width/2,b.y+b.height*.28,18,'#e8ce0a',{role:'mobile-'+name+'-label'});
  text(value+' '+state.currency,b.x+b.width/2,b.y+b.height*.67,17,'#fff',{role:'mobile-'+name+'-amount'});
 }
 return {...scene,commands,controlsGeometry:controls,mobileLayoutApplied:true};
}
