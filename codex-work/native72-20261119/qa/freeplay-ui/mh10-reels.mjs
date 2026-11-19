// Isolated free-play presentation state. No account or outcome logic.
import {ContinuousReel} from './continuous-reels.mjs';
export const SYMBOLS=Object.freeze({seven:0,bell:1,grape:2,watermelon:3,cherry:4,orange:5,plum:6,lemon:7});
const palette=Object.keys(SYMBOLS);
export function validateGrid(grid){
 if(!Array.isArray(grid)||grid.length!==3||grid.some(row=>!Array.isArray(row)||row.length!==5||row.some(s=>!Object.hasOwn(SYMBOLS,s))))throw Error('Invalid five-reel grid');
 return grid.map(row=>row.slice());
}
export class Reels{
 constructor(){
  this.phase='READY';this.grid=[['watermelon','grape','plum','cherry','cherry'],['grape','cherry','orange','bell','bell'],['watermelon','cherry','lemon','grape','cherry']];
  this.offsets=Array(5).fill(0);this.tracks=[];
 }
 beginPending(time){
  if(this.phase!=='READY')throw Error('Busy');
  this.startTime=time;this.phase='PENDING';this.stopRequested=false;
  this.tracks=Array.from({length:5},(_,col)=>new ContinuousReel(palette,this.grid.map(row=>row[col])).begin(time,{speed:.018}));
 }
 start(grid,time,plan){
  if(!['READY','PENDING'].includes(this.phase))throw Error('Busy');
  if(!Array.isArray(plan)||plan.length!==5||plan.some(value=>!Number.isFinite(value)||value<=0))throw Error('Stop plan required');
  this.target=validateGrid(grid);
  if(this.phase==='READY')this.beginPending(time);
  this.startTime=time;this.plan=plan.slice();this.phase=this.stopRequested?'STOPPING':'SPINNING';
  this.tracks.forEach((track,col)=>{
   track.settle(this.target.map(row=>row[col]),time,{duration:plan[col],minTravel:this.stopRequested?5:18});
   this.plan[col]=track.segment.duration;
  });
 }
 stop(time){
  if(this.phase==='READY')return;
  this.stopRequested=true;
  this.tracks.forEach((track,col)=>{
   track.requestStop(time,180+col*60);
   if(track.segment)this.plan[col]=track.segment.started+track.segment.duration-this.startTime;
  });
  if(this.phase!=='PENDING')this.phase='STOPPING';
 }
 tick(time){
  if(this.phase==='READY')return false;
  let stopped=0;
  this.tracks.forEach((track,col)=>{
   const state=track.sample(time);this.offsets[col]=state.phase;
   if(state.mode==='stopped'){
    stopped++;
    for(let row=0;row<3;row++)this.grid[row][col]=this.target[row][col];
   }
  });
  if(stopped===5){this.phase='READY';return true;}
  return false;
 }
 window(col,time){return this.tracks[col].window(time);}
 clarity(col){return this.tracks[col].clarity();}
 progress(col){return this.tracks[col]?.progress()??0;}
}
