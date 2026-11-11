// Presentation adapter for the ten NEW SmartSoft titles only. Existing live
// games, including MultiHot40 and MH5/Foxy, never enter this adapter.
// Public source facts/hashes: evidence/smartsoft-motion-source.json.
import {smartSoftCompletedIceFeature} from './smartsoft-remaining7-view.mjs';
// Provider reel decoration is random; here that decoration is deterministic.
// A landing grid and feature value are accepted only from the host receipt.
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
const bounded=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
const modulo=(n,d)=>((n%d)+d)%d;
const copy=value=>value==null?value:JSON.parse(JSON.stringify(value));
const TAU=2*Math.PI;
const WHEEL_ANGLES=[null,3,5,2,4,1].map(n=>n===null?null:Math.PI*n/7);
const STRIP=[1,5,3,4,1,2,4,1,5,3,2,4];
const NEW={engine:'box',columns:3,rows:3,blurRows:2,delay:0,columnDelay:0,loop:0,start:20,startDuration:125,duration:125,endDuration:125,mobileHeight:100,desktopHeight:210,multiplier:'strip',stripFinishExtra:0};
export const SMARTSOFT_MOTION_PROFILES=freeze({
 multihot100_native:{...NEW,columns:5,rows:4,blurRows:1,loop:2,start:15,desktopHeight:190,multiplier:'wheel'},
 multihotwildways_native:{...NEW,loop:1,mobileHeight:106},
 multihot5wild_native:{...NEW,loop:1,mobileHeight:106},
 multihot5superwilds_native:{...NEW,columns:5,blurRows:1,loop:2,start:15,desktopHeight:210,multiplier:'wheel'},
 multihotdeluxe_native:{...NEW,delay:200,columnDelay:450,desktopHeight:217,stripFinishExtra:100},
 safarisimba_native:{...NEW,columnDelay:150,mobileHeight:102,desktopHeight:200},
 habeshafortune5_native:{...NEW,columnDelay:150,desktopHeight:205},
 burningice_native:{engine:'legacy-ticks',columns:5,rows:3,totalRows:21,cellHeight:210,multiplier:null},
 burningice10_native:{engine:'legacy-ticks',columns:5,rows:3,totalRows:21,cellHeight:210,multiplier:null},
 burningice40_native:{engine:'legacy-ticks',columns:5,rows:4,totalRows:21,cellHeight:205,multiplier:null},
});
export const supportsSmartSoftMotion=id=>Object.hasOwn(SMARTSOFT_MOTION_PROFILES,id);
export const sourceEase={
 outQuad:progress=>1-(1-bounded(progress))**2,
 swing:progress=>(1-Math.cos(Math.PI*bounded(progress)))/2,
 outBack:(progress,overshoot=1.10158)=>{const t=bounded(progress)-1;return 1+t*t*((overshoot+1)*t+overshoot);},
};

// Pure scalar form of New/Components/box.js spin/columnLoopStop. Amplitudes
// retain the native pixel-to-cell ratio; all durations are public constants.
export function boxReelPosition(profile,column,elapsed,stopAt=null,{turbo=false,mobile=true}={}){
 const duration=turbo?200:profile.duration,start=turbo?15:profile.start;
 const columnDelay=turbo?0:profile.columnDelay,lift=profile.startDuration+column*columnDelay+profile.delay;
 const returnTime=profile.startDuration/2,loopAt=lift+returnTime,loopDuration=profile.blurRows*duration;
 const amplitude=start/(mobile?profile.mobileHeight:profile.desktopHeight);
 if(stopAt!==null&&elapsed>=stopAt){
  const local=elapsed-stopAt;
  if(local<duration)return{phase:'landing',position:profile.rows*(local/duration-1),blur:true,settled:false,impact:false,loopAt,loopDuration};
  if(local<duration+profile.endDuration)return{phase:'rebound',position:amplitude*sourceEase.swing((local-duration)/profile.endDuration),blur:false,settled:false,impact:true,loopAt,loopDuration};
  if(local<duration+2*profile.endDuration)return{phase:'rebound',position:amplitude*(1-sourceEase.swing((local-duration-profile.endDuration)/profile.endDuration)),blur:false,settled:false,impact:true,loopAt,loopDuration};
  return{phase:'settled',position:0,blur:false,settled:true,impact:true,loopAt,loopDuration};
 }
 if(elapsed<lift)return{phase:'lift',position:-amplitude*sourceEase.outQuad(elapsed/lift),blur:elapsed>=profile.startDuration+column*columnDelay,settled:false,impact:false,loopAt,loopDuration};
 if(elapsed<loopAt)return{phase:'return',position:-amplitude*(1-(elapsed-lift)/returnTime),blur:true,settled:false,impact:false,loopAt,loopDuration};
 return{phase:'loop',position:modulo(elapsed-loopAt,loopDuration)/duration*profile.rows,blur:true,settled:false,impact:false,loopAt,loopDuration};
}

function reelEntries(profile,symbols,column,position,phase,previous,target){
 const rows=profile.rows,decorative=index=>symbols[modulo(index+column*3,symbols.length)];
 if(phase==='settled')return{offset:0,entries:target.map((symbol,row)=>({row,symbol}))};
 if(phase==='frozen')return{offset:0,entries:previous.map((symbol,row)=>({row,symbol}))};
 if(phase==='landing'||phase==='rebound'){
  const entries=[];
  for(let row=-1;row<=2*rows;row++)entries.push({row,symbol:row>=0&&row<rows?target[row]:decorative(row)});
  return{offset:position,entries};
 }
 if(phase==='lift'||phase==='return'||phase==='awaiting'){
  const entries=Array.from({length:rows+2},(_,i)=>{const row=i-1;return{row,symbol:previous?.[row]??decorative(row)};});
  return{offset:position,entries};
 }
 const step=Math.floor(position),offset=position-step;
 return{offset,entries:Array.from({length:rows+2},(_,i)=>({row:i-1,symbol:decorative(i-1-step)}))};
}

function wheelPosition(elapsed,turbo,initial){return initial+Math.max(0,elapsed-200)*TAU/(turbo?200:1000);}
function makeMultiplier(profile,state,elapsed){
 if(!profile.multiplier)return null;
 const value=state.feature?.multiplier,valid=Number.isInteger(value)&&value>=1&&value<=5;
 if(profile.multiplier==='wheel'){
  const start=state.initialMultiplier,base=state.turbo?200:1000;
  if(!state.received||!valid)return{kind:'wheel',angle:wheelPosition(elapsed,state.turbo,start),complete:false,value:null};
  const origin=wheelPosition(state.receivedAt,state.turbo,start),target=(Math.floor(origin/TAU)+1)*TAU+WHEEL_ANGLES[value];
  const duration=(target-origin)*base/TAU;
  const progress=bounded((elapsed-state.receivedAt+(state.wheelForward||0))/duration);
  return{kind:'wheel',angle:origin+(target-origin)*sourceEase.outBack(progress,.5),complete:progress===1,value,duration};
 }
 const duration=state.turbo?325:400,finishDuration=duration/2+profile.stripFinishExtra;
 const stopAt=state.received&&valid?state.stripStopAt:null;
 let position=modulo(elapsed,duration)/duration*6,complete=false,phase='loop';
 if(stopAt!==null&&elapsed>=stopAt){const p=bounded((elapsed-stopAt)/finishDuration);position=3*(sourceEase.outBack(p)-1);complete=p===1;phase='landing';}
 const step=Math.floor(position),offset=position-step,window=valid?[value===1?5:value-1,value,value===5?1:value+1]:null;
 const entries=Array.from({length:7},(_,i)=>{const row=i-2;return{row,value:phase==='landing'&&row-step>=0&&row-step<3?window[row-step]:STRIP[modulo(row-step,STRIP.length)],selected:complete&&row===1};});
 return{kind:'strip',offset,entries,complete,value:valid?value:null,phase};
}

export class SmartSoftMotion{
 constructor({id,columns,rows,symbols,onEvent=()=>{},mobile=true}={}){
  if(!supportsSmartSoftMotion(id))throw new TypeError('New SmartSoft motion requires an explicitly supported title');
  const profile=SMARTSOFT_MOTION_PROFILES[id];
  if(columns!==undefined&&columns!==profile.columns||rows!==undefined&&rows!==profile.rows||!Array.isArray(symbols)||!symbols.length)throw new TypeError('Motion geometry does not match the selected title');
  this.id=id;this.profile=profile;this.symbols=symbols.map(String);this.onEvent=onEvent;this.mobile=mobile;this.sequence=0;this.state=null;
 }
 validGrid(grid){return Array.isArray(grid)&&grid.length===this.profile.columns&&grid.every(column=>Array.isArray(column)&&column.length===this.profile.rows&&column.every(value=>this.symbols.includes(String(value))));}
 begin(time,{turbo=false,frozenReels=[],previousGrid=null,previousFeature=null,kind=null}={}){
  if(!Number.isFinite(time))throw new TypeError('A finite presentation clock is required');
  const previous=this.validGrid(previousGrid)?previousGrid.map(column=>column.map(String)):null;
  this.state={sequence:++this.sequence,last:time,elapsed:0,turbo:turbo===true,previous,previousFeature:copy(previousFeature),kind,received:false,receivedAt:null,grid:null,feature:null,stopAt:[],frozen:new Set(previous&&Array.isArray(frozenReels)?frozenReels.filter(column=>Number.isInteger(column)&&column>=0&&column<this.profile.columns):[]),stopped:new Set(),complete:false,accelerated:false,legacySteps:0,legacy:[],initialMultiplier:WHEEL_ANGLES[previousFeature?.multiplier]??WHEEL_ANGLES[1]};
  this.onEvent({type:'spin-start',sequence:this.sequence,turbo:turbo===true});
  if(this.profile.engine==='legacy-ticks'){
   const removed=(Array.isArray(previousFeature?.frozenReels)?previousFeature.frozenReels:[]).filter(column=>Number.isInteger(column)&&column>=0&&column<this.profile.columns&&!this.state.frozen.has(column));
   for(const column of new Set(removed))this.onEvent({type:'unfreeze',column,sequence:this.sequence});
   if(removed.length&&!this.state.frozen.size)this.onEvent({type:'unfreeze-logo',sequence:this.sequence});
  }
  return this.sequence;
 }
 advance(time){const s=this.state;if(!s||!Number.isFinite(time)||time<s.last)return;if(!s.received&&s.accelerated){s.last=time;return;}s.elapsed+=time-s.last;s.last=time;}
 accept(grid,time,{feature={},roundId=null,kind=null,wins=[],finalFrame=false}={}){
  const s=this.state;if(!s||s.received||!Number.isFinite(time)||!this.validGrid(grid))return false;
  if(this.profile.multiplier&&(!Number.isInteger(feature?.multiplier)||feature.multiplier<1||feature.multiplier>5))return false;
  this.advance(time);s.received=true;s.receivedAt=s.elapsed;s.grid=grid.map(column=>column.map(String));s.feature=copy(feature);s.roundId=roundId;s.kind=kind??s.kind;s.wins=copy(wins);s.finalFrame=finalFrame===true;
  for(const column of s.frozen)if(!s.previous[column].every((value,row)=>value===s.grid[column][row]))s.frozen.delete(column);
  // The public SuperWilds component reveals one accepted added-Wild every
  // 200ms, then waits100ms. A feature frame must match its previous grid
  // everywhere except the explicitly supplied cells; it is not a new spin.
  const added=feature?.addedWilds;
  if(this.id==='multihot5superwilds_native'&&s.previous&&Array.isArray(added)&&added.length&&added.every(cell=>Array.isArray(cell)&&cell.length===2&&Number.isInteger(cell[0])&&Number.isInteger(cell[1])&&cell[0]>=0&&cell[0]<this.profile.columns&&cell[1]>=0&&cell[1]<this.profile.rows)){
   const changed=new Set(added.map(cell=>cell.join(':')));
   s.featureOnly=s.grid.every((column,c)=>column.every((value,r)=>changed.has(c+':'+r)?value==='0':value===s.previous[c][r]));
  }
  if(this.profile.engine==='box'){
   const first=boxReelPosition(this.profile,0,s.elapsed,null,{turbo:s.turbo,mobile:this.mobile}),currentLoop=Math.floor(Math.max(0,s.elapsed-first.loopAt)/first.loopDuration);
   s.stopAt=Array.from({length:this.profile.columns},(_,column)=>{
    const reel=boxReelPosition(this.profile,column,s.elapsed,null,{turbo:s.turbo,mobile:this.mobile});
    return s.turbo||s.accelerated?s.elapsed:Math.max(s.elapsed,reel.loopAt+(currentLoop+1+column*this.profile.loop)*reel.loopDuration);
   });
  }else{
   s.legacy=Array.from({length:this.profile.columns},(_,column)=>({frame:-column*10,y:0,render:0,stopIndex:0,settled:false,blur:false,impact:false}));
   if(s.accelerated||s.turbo)this.accelerateLegacy();
  }
  const stripTime=s.turbo?325:400;s.stripStopAt=(Math.floor(s.elapsed/stripTime)+1)*stripTime;
  if(s.accelerated)s.stripStopAt=Math.min(s.stripStopAt,s.elapsed+100);
  if(s.accelerated)this.speedUp();
  return true;
 }
 accelerateLegacy(){const s=this.state;for(let c=0;c<s.legacy.length;c++)if(s.legacy[c].frame<100)s.legacy[c].frame+=1000-c*50;}
 speedUp(time){
  const s=this.state;if(!s||s.complete)return false;if(Number.isFinite(time))this.advance(time);
  s.accelerated=true;
  if(s.received){
   if(this.profile.engine==='legacy-ticks')this.accelerateLegacy();
   else for(let c=0;c<s.stopAt.length;c++)s.stopAt[c]=Math.min(s.stopAt[c],s.elapsed);
   s.stripStopAt=Math.min(s.stripStopAt,s.elapsed+100);
   const wheel=makeMultiplier(this.profile,s,s.elapsed);if(wheel?.kind==='wheel'&&!wheel.complete){const remaining=wheel.duration-(s.elapsed-s.receivedAt+(s.wheelForward||0));if(remaining>500)s.wheelForward=(s.wheelForward||0)+remaining-300;}
  }
  return true;
 }
 cancel(){this.state=null;}
 get running(){return Boolean(this.state&&!this.state.complete);}
 legacyPositions(){
  const s=this.state,p=this.profile,desired=Math.floor((s.elapsed-s.receivedAt)*60/1000),maxY=p.cellHeight*(p.totalRows-p.rows),coefficient=[1.3,1.2,1.1,1,.9];
  while(s.legacySteps<desired){
   for(let c=0;c<p.columns;c++){
    const r=s.legacy[c];if(r.settled||s.frozen.has(c))continue;r.frame++;if(r.frame<0)continue;const x=r.frame/10;
    if(r.y<=0){r.y=-Math.sin(x*3)*10;r.render=r.y;}
    else if(r.y<maxY-500){r.y+=20*Math.sqrt(x)*coefficient[c];r.render=r.y;r.blur=true;}
    else if(r.y<maxY-400){r.y+=16*Math.sqrt(x)*coefficient[c];r.render=r.y;r.blur=true;}
    else if(r.y<maxY-300){r.y+=12*Math.sqrt(x)*coefficient[c];r.render=r.y;r.blur=true;}
    else if(r.y<maxY-200){r.y+=9*Math.sqrt(x);r.render=r.y;r.blur=true;}
    else if(r.y<maxY-100){r.y+=7*Math.sqrt(x);r.render=r.y;r.blur=false;}
    else if(r.y<maxY){r.y+=5*Math.sqrt(x);r.render=r.y;r.blur=false;r.impact=true;}
    else{const jump=-Math.sin(r.stopIndex*.5)*10;r.render=maxY+Math.min(0,jump);r.settled=jump>0;r.impact=true;r.blur=false;r.stopIndex++;}
   }
   s.legacySteps++;
   if(s.legacy.every((r,c)=>r.settled||s.frozen.has(c))){s.legacySteps=desired;break;}
  }
  return s.legacy.map(r=>({phase:r.settled?'settled':r.render>=maxY-p.rows*p.cellHeight?'landing':r.render<=0?'lift':'loop',position:r.render>=maxY-p.rows*p.cellHeight?r.render/p.cellHeight-(p.totalRows-p.rows):r.render/p.cellHeight,blur:r.blur,settled:r.settled,impact:r.impact}));
 }
 sample(time){
  this.advance(time);const s=this.state,p=this.profile;if(!s)return null;
  if(s.featureOnly){
   const elapsed=s.elapsed-s.receivedAt,added=s.feature.addedWilds,visible=s.previous.map(column=>column.slice());
   added.forEach(([column,row],index)=>{if(elapsed>=index*200)visible[column][row]=s.grid[column][row];});
   const complete=elapsed>=(added.length-1)*200+100;
   if(complete&&!s.complete){s.complete=true;s.completedAt=s.elapsed;this.completedFeatureSound();this.onEvent({type:'animation-complete',sequence:s.sequence});}
   const value=s.feature.multiplier,multiplier={kind:'wheel',angle:WHEEL_ANGLES[value],complete:true,value};
   return{id:this.id,sequence:s.sequence,mode:'smartsoft-native',turbo:s.turbo,featureOnly:true,reels:visible.map((column,c)=>({column:c,phase:'feature',offset:0,entries:column.map((symbol,row)=>({row,symbol})),settled:complete,frozen:false,blur:false})),multiplier,elapsed:s.elapsed,complete,pending:false,completedAt:s.completedAt??null,grid:copy(s.grid),feature:copy(s.feature),wins:copy(s.wins),roundId:s.roundId};
  }
  const legacy=p.engine==='legacy-ticks'&&s.received?this.legacyPositions():null;
  const reels=Array.from({length:p.columns},(_,column)=>{
   const frozen=s.frozen.has(column),target=s.grid?.[column],previous=s.previous?.[column];
   let position=frozen?{phase:'frozen',position:0,settled:s.received,blur:false,impact:s.received}:p.engine==='box'?boxReelPosition(p,column,s.elapsed,s.received?s.stopAt[column]:null,{turbo:s.turbo,mobile:this.mobile}):s.received?legacy[column]:{phase:'awaiting',position:0,settled:false,blur:false,impact:false};
   if(position.impact&&!s.stopped.has(column)){s.stopped.add(column);if(!frozen)this.onEvent({type:'reel-stop',column,frozen:false,sequence:s.sequence,turbo:s.turbo,fast:s.turbo||s.accelerated});}
   return{column,...position,...reelEntries(p,this.symbols,column,position.position,position.phase,previous,target),frozen};
  });
  const multiplier=makeMultiplier(p,s,s.elapsed);
  if(multiplier?.complete&&!s.multiplierStopped){s.multiplierStopped=true;this.onEvent({type:'wheel-stop',value:multiplier.value,sequence:s.sequence});}
  if(s.received&&reels.every(reel=>reel.settled)&&(!multiplier||multiplier.complete)&&!s.complete){
   s.complete=true;s.completedAt=s.elapsed;
   if(p.engine==='legacy-ticks'){
    const displayFeature=smartSoftCompletedIceFeature(this.id,s.feature,s.finalFrame);
    const accepted=new Set((Array.isArray(displayFeature?.frozenReels)?displayFeature.frozenReels:[]).filter(column=>Number.isInteger(column)&&column>=0&&column<p.columns));
    const added=[...accepted].filter(column=>!s.frozen.has(column)),removed=[...s.frozen].filter(column=>!accepted.has(column));
    for(const column of removed)this.onEvent({type:'unfreeze',column,sequence:s.sequence});
    if(removed.length&&!accepted.size)this.onEvent({type:'unfreeze-logo',sequence:s.sequence});
    for(const column of new Set(added))this.onEvent({type:'freeze',column,sequence:s.sequence});
    if(added.length)this.onEvent({type:'freeze-logo',sequence:s.sequence});
   }
   this.completedFeatureSound();this.onEvent({type:'animation-complete',sequence:s.sequence});
  }
  return{id:this.id,sequence:s.sequence,mode:'smartsoft-native',turbo:s.turbo,reels,multiplier,elapsed:s.elapsed,complete:s.complete,pending:!s.received,completedAt:s.completedAt??null,grid:s.grid?copy(s.grid):null,feature:copy(s.feature),previousFeature:copy(s.previousFeature),heldReels:[...s.frozen],wins:copy(s.wins||[]),roundId:s.roundId??null};
 }
 completedFeatureSound(){
  const s=this.state;
  // Public SuperWilds gameSpinStop/showWin starts the multiplier fire and its
  // own WinMultiplier sound together. Only a final accepted positive line
  // result can emit it; restored history, pending receipts and losses cannot.
  if(this.id==='multihot5superwilds_native'&&s?.finalFrame&&s.wins?.some(win=>typeof win.payoutMinor==='string'&&/^\d+$/.test(win.payoutMinor)&&BigInt(win.payoutMinor)>0n))this.onEvent({type:'multiplier-win',sequence:s.sequence,roundId:s.roundId});
 }
}
