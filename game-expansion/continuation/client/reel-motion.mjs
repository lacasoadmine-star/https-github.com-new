// Presentation only. The server supplies every landing grid. This module has
// no random source, wallet access or action transport. Durations are authored
// native timings, not a claim about the provider's private implementation.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class NativeReelMotion {
 constructor({columns,rows,symbols,onEvent=()=>{},mode='reels'}={}) {
  if(!Number.isInteger(columns)||columns<1||columns>8||!Number.isInteger(rows)||rows<1||rows>8||!Array.isArray(symbols)||!symbols.length)throw Error('Invalid reel geometry');
  this.columns=columns;this.rows=rows;this.symbols=symbols.map(String);this.onEvent=onEvent;this.mode=mode;this.state=null;this.sequence=0;
 }
 begin(time,{turbo=false,frozenReels=[],previousGrid=null}={}) {
  this.cancel();const frozen=new Set(frozenReels.filter(c=>Number.isInteger(c)&&c>=0&&c<this.columns));
  this.state={sequence:++this.sequence,last:time,elapsed:0,rate:1,turbo,received:false,landAt:null,grid:null,previousGrid,frozen,stopped:new Set(),complete:false};
  this.onEvent({type:'spin-start',sequence:this.sequence});return this.sequence;
 }
 accept(grid,time) {
  const state=this.state;if(!state||state.received)return false;
  if(!Array.isArray(grid)||grid.length!==this.columns||!grid.every(col=>Array.isArray(col)&&col.length===this.rows&&col.every(id=>this.symbols.includes(String(id)))))return false;
  this.advance(time);state.grid=grid.map(col=>col.map(String));state.received=true;
  state.landAt=Math.max(state.elapsed,state.turbo?150:420);return true;
 }
 speedUp(){if(this.state&&!this.state.complete){this.state.rate=4;return true;}return false;}
 cancel(){this.state=null;}
 get running(){return !!this.state&&!this.state.complete;}
 advance(time){const s=this.state;if(!s)return;if(Number.isFinite(time)&&time>=s.last){s.elapsed+=Math.min(1000,time-s.last)*s.rate;s.last=time;}}
 sample(time){
  this.advance(time);const s=this.state;if(!s)return null;
  const duration=this.mode==='cascade'?(s.turbo?140:300):(s.turbo?180:340),stagger=s.turbo?30:85;
  const reels=Array.from({length:this.columns},(_,column)=>{
   const previous=s.previousGrid?.[column];
   const frozen=s.frozen.has(column)&&Array.isArray(previous)&&(!s.received||previous.every((symbol,row)=>String(symbol)===s.grid[column][row]));
   const start=s.landAt===null?Infinity:s.landAt+column*stagger;
   const p=clamp((s.elapsed-start)/duration,0,1),done=s.received&&(frozen||p===1);
   if(done&&!s.stopped.has(column)){s.stopped.add(column);this.onEvent({type:'reel-stop',column,sequence:s.sequence,frozen});}
   const target=s.grid?.[column]??(frozen?previous.map(String):null);
   const distance=done?0:s.received&&s.elapsed>=start?(1-p)**3*(this.rows+2):s.elapsed*(s.turbo?.02:.013)+column*.37;
   const steps=Math.floor(distance),offset=done?0:-(distance-steps);
   const entries=Array.from({length:this.rows+2},(_,i)=>{
    const row=i-1;
    const symbol=target&&s.received&&s.elapsed>=start?target[((row+steps)%this.rows+this.rows)%this.rows]:this.symbols[((row+steps+column*3)%this.symbols.length+this.symbols.length)%this.symbols.length];
    return {row,symbol};
   });
   return {column,entries,offset,settled:done,frozen,blur:!done&&p<.72};
  });
  if(s.received&&reels.every(reel=>reel.settled)&&!s.complete){s.complete=true;this.onEvent({type:'animation-complete',sequence:s.sequence});}
  return {sequence:s.sequence,reels,complete:s.complete,pending:!s.received,elapsed:s.elapsed,mode:this.mode};
 }
}

// Compose the moving cells inside each game's own locked board geometry.
// Other commands (title, wheel, feature art, controls) retain their own layout.
export function movingScene(scene,manifest,motion){
 if(!motion||!scene.gridGeometry)return scene;
 const g=scene.gridGeometry,rows=manifest.grid.rows,columns=manifest.grid.columns,cw=g.cellWidth??g.width/columns,ch=g.cellHeight??g.height/rows,gap=g.columnGap??0;
 const moving=[];
 for(const reel of motion.reels){
  const clip={x:g.x+reel.column*(cw+gap),y:g.y,width:cw,height:ch*rows};
  for(const entry of reel.entries){
   if(reel.settled&&(entry.row<0||entry.row>=rows))continue;
   const symbol=manifest.symbols[entry.symbol];if(!symbol)continue;
   const frame=reel.blur&&symbol.blurFrame?symbol.blurFrame:symbol.frame;
   if(!manifest.frames[frame])continue;
   const cell={x:clip.x,y:g.y+(entry.row+reel.offset)*ch,width:cw,height:ch};
   const placement=manifest.symbolPlacement;let target,padding=false;
   if(placement){const scale=Math.min(cw/placement.cellWidth,ch/placement.cellHeight),source=manifest.frames[frame].original;target={x:cell.x+cw/2+placement.offsetX*scale,y:cell.y+ch/2+placement.offsetY*scale,width:source.width*scale,height:source.height*scale};padding=true;}
   else if(manifest.id==='bookofmagic_native'){target=cell;padding=true;}
   else target={x:cell.x+cw*.04,y:cell.y+ch*.04,width:cw*.92,height:ch*.92};
   moving.push({type:'sprite',frame,box:target,clip,padding,role:'symbol',column:reel.column,row:entry.row});
  }
 }
 let inserted=false;
 const commands=scene.commands.flatMap(command=>{
  if(command.role==='symbol'||command.role==='empty-cell'){
   if(!inserted){inserted=true;return moving;}return [];
  }
  if(!motion.complete&&command.type==='outline')return [];
  if(!motion.complete&&manifest.multiplier&&[manifest.multiplier.normal,manifest.multiplier.light].includes(command.frame))return [{...command,rotation:(command.rotation||0)+motion.elapsed*.005}];
  return [command];
 });
 return {...scene,commands};
}
