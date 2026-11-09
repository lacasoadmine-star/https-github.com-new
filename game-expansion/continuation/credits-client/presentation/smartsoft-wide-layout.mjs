// New-title desktop composition. The underlying420x900 scene remains the
// receipt/motion coordinate system; this final projection moves its artwork
// and the matching host hit regions together. No account or outcome API.
// Desktop controls use each title's public Buttons.config coordinates.
// Reel/logo placements are independently calibrated to the observed demo.
import {isRemaining7Wide,remaining7WideSize,remaining7ControlGeometry,remaining7WideScene,remaining7WideBinding} from './smartsoft-remaining7-wide.mjs';
const IDS=new Set(['multihot100_native','habeshafortune5_native']);
const box=(x,y,width,height)=>({x,y,width,height});
const PROFILES=Object.freeze({
 multihot100_native:{board:box(614,294,912,912*813/993),logo:box(-60,150,810,150),
  controls:{play:[1795,455],autoplay:[1867,316],bet:[1867,745],menu:[68,1080],sound:[2060,1085],turbo:[2021,415],gamble:[1882,195],collect:[1882,892]},
  balance:box(605,1066,270,84),bet:box(1260,1066,270,84),win:box(930,1063,281,88),ink:'#fff23c'},
 habeshafortune5_native:{board:box(680,110,811,810),logo:box(850,55,500,190),
  controls:{play:[1768,510],autoplay:[1826,355],bet:[1832,777],menu:[240,1110],sound:[1884,1110],turbo:[2010,465],gamble:[1840,230],collect:[1840,930]},
  balance:box(812,1060,270,83),bet:box(1098,1060,270,83),win:box(875,840,457,114),ink:'#ffeaa8'}
});
export const SMARTSOFT_WIDE_IDS=Object.freeze([...IDS]);
export const SMARTSOFT_WIDE_SIZE=Object.freeze({width:2170,height:1220});
export const supportsSmartSoftWide=id=>IDS.has(id)||isRemaining7Wide(id);
export const usesSmartSoftWide=(id,width,height)=>supportsSmartSoftWide(id)&&width>=900&&width>height;
export const smartSoftWideSize=id=>remaining7WideSize(id)||SMARTSOFT_WIDE_SIZE;
const money=value=>{if(typeof value!=='string'||!/^\d+(?:\.\d{1,2})?$/.test(value))return '—';const[whole,fraction='']=value.split('.');return whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+fraction.padEnd(2,'0');};
const minor=value=>typeof value==='string'&&/^\d+$/.test(value)?`${BigInt(value)/100n}.${String(BigInt(value)%100n).padStart(2,'0')}`:'—';
const MAPPED={play:'spin',autoplay:'autoPlay',bet:'bet',menu:'menu',sound:'sound',turbo:'turbo',gamble:'gamble',collect:'collect'};

export function wideControlGeometry(scene,manifest){
 if(isRemaining7Wide(manifest?.id))return remaining7ControlGeometry(scene,manifest);
 const profile=PROFILES[manifest?.id];if(!profile)return scene.controlsGeometry;
 const result={};
 for(const[name,[x,y]]of Object.entries(profile.controls)){
  if(['gamble','collect'].includes(name)&&!scene.wideState?.[name])continue;
  const key=manifest.controls?.[MAPPED[name]]?.idle,frame=manifest.frames?.[key];if(!frame)continue;
  // Keep the source's padded rectangle; the drawable trim is smaller for
  // some buttons, but remains centered in this same input region.
  result[name]=box(x,y,frame.original.width,frame.original.height);
 }
 return result;
}

function transform(command,origin,target){
 const scale=target.width/origin.width,point=p=>({x:target.x+(p.x-origin.x)*scale,y:target.y+(p.y-origin.y)*scale});
 const rectangle=b=>({...point(b),width:b.width*scale,height:b.height*scale});
 const result={...command};
 if(command.box)result.box=rectangle(command.box);
 if(command.clip)result.clip=rectangle(command.clip);
 if(command.clipPolygon)result.clipPolygon=command.clipPolygon.map(point);
 if(command.rotateAt)result.rotateAt=point(command.rotateAt);
 if(Number.isFinite(command.x)&&Number.isFinite(command.y))Object.assign(result,point(command));
 if(Number.isFinite(command.size))result.size=command.size*scale;
 if(Number.isFinite(command.lineWidth))result.lineWidth=command.lineWidth*scale;
 if(Number.isFinite(command.nativeScale))result.nativeScale=command.nativeScale*scale;
 return result;
}

export function smartSoftWideScene(scene,manifest){
 if(isRemaining7Wide(manifest?.id))return remaining7WideScene(scene,manifest);
 if(!scene.wideLayout||!IDS.has(manifest?.id))return scene;
 const profile=PROFILES[manifest.id],commands=[],origin=scene.boardGeometry;
 if(!origin)return scene;
 const sprite=(frame,target,extra={})=>{if(manifest.frames[frame])commands.push({type:'sprite',frame,box:target,...extra});};
 const text=(value,x,y,size,color='#fff',extra={})=>commands.push({type:'text',text:String(value),x,y,size,color,align:'center',...extra});
 commands.push({type:'rect',box:box(0,0,2170,1220),color:'#031b17'});
 // The desktop source draws a2470x1220 background centered under the2170
 // base canvas. Cropping keeps its original aspect instead of stretching.
 if(manifest.background?.file)commands.push({type:'image',file:manifest.background.file,box:box(0,0,2170,1220),fit:'cover'});
 else if(manifest.background?.frame)sprite(manifest.background.frame,box(0,0,2170,1220),{fit:'cover'});
 for(const command of scene.commands){
  if(command.role==='game-background'){commands.push({...command,box:box(0,0,2170,1220),clip:box(0,0,2170,1220)});continue;}
  if(command.role==='game-logo'){commands.push({...command,box:profile.logo});continue;}
  if(command.type==='outline'||command.frame===manifest.board?.frame||
     /^(?:symbol$|empty-cell$|multiplier-|winning-|expanded-|win-tier|win-coins)/.test(command.role||'')){
   const projected=transform(command,origin,profile.board);
   if(command.role==='symbol'){
    const b=projected.box,scale=manifest.id==='habeshafortune5_native'?1.65:1.35;
    // Match the observed full fruit bodies while retaining each receipt cell's
    // clipping boundary. Apply the same projection during motion and at rest.
    projected.box=box(b.x-b.width*(scale-1)/2,b.y-b.height*(scale-1)/2,b.width*scale,b.height*scale);
   }
   commands.push(projected);
  }
 }
 const geometry=wideControlGeometry(scene,manifest),state=scene.wideState||{};
 if(manifest.id==='habeshafortune5_native')sprite('Start/Footer',box(812,1060,554,83));
 for(const[name,target]of Object.entries(geometry)){
  const control=manifest.controls[MAPPED[name]],frame=name==='play'?(state.pending?control.stop:state.canStart?control.idle:control.disabled||control.idle):name==='autoplay'&&state.autoplay?control.stop||control.idle:control.idle;
  sprite(frame,target,{padding:true,role:'wide-control',control:name});
 }
 const spin=geometry.play;
 if(spin){
  const label=state.pending?'STOP':state.collect?'TAKE WIN':state.canStart?'HOLD\n&\nSPIN':state.authenticated?'PAUSED':'SIGN IN';
  const lines=label.split('\n'),size=lines.length>1?23:25;
  lines.forEach((line,index)=>text(line,spin.x+spin.width/2,spin.y+spin.height/2+(index-(lines.length-1)/2)*30,size,'#fff',{role:'wide-spin-label'}));
 }
 for(const[name,label]of [['balance','BALANCE'],['bet','BET'],['win','WIN']]){
  if(name==='win'&&!state.showWin)continue;
  const target=profile[name],frame='Start/Footer'+name[0].toUpperCase()+name.slice(1);
  sprite(frame,target);
  text(label,target.x+target.width/2,target.y+target.height*.30,24,profile.ink,{role:'wide-'+name+'-label'});
  const value=name==='balance'?money(state.balance):name==='bet'?money(state.stake):minor(state.winMinor);
  text(value+' '+(state.currency||'ETB'),target.x+target.width/2,target.y+target.height*.66,state.currency==='CREDITS'?18:22,'#fff',{role:'wide-'+name+'-amount'});
 }
 return {...scene,...SMARTSOFT_WIDE_SIZE,commands,controlsGeometry:geometry,wideLayoutApplied:true};
}

export function bindSmartSoftWideScene(scene,manifest,snapshot,viewport){
 if(isRemaining7Wide(manifest?.id))return remaining7WideBinding(scene,manifest,snapshot,viewport);
 if(!usesSmartSoftWide(manifest.id,viewport.width,viewport.height))return scene;
 const active=snapshot.round?.status==='active',actions=snapshot.roundActions||[];
 return {...scene,wideLayout:true,wideState:{balance:snapshot.balance,stake:snapshot.stake,currency:snapshot.currency,pending:snapshot.pending,
  canStart:snapshot.canStart,authenticated:snapshot.authenticated,autoplay:snapshot.autoplayActive,
  gamble:active&&actions.includes('gamble'),collect:active&&actions.includes('collect'),
  showWin:!!snapshot.round&&BigInt(snapshot.round.currentCashoutMinor??snapshot.round.payoutMinor??'0')>0n,
  winMinor:snapshot.round?.status==='active'?snapshot.round.currentCashoutMinor:snapshot.round?.payoutMinor},
  additionalAssetFrames:['Start/FooterBalance','Start/FooterBet','Start/Footer'].filter(key=>manifest.frames[key])};
}
