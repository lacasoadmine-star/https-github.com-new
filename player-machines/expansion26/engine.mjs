// ZPLAY 26: isolated, NO-MONEY presentation and interaction test engine.
// Not an authority on wagers, payout math, official RNG, RTP or certification.
// All outcomes MUST be supplied by an external verified result provider;
// this prototype accepts ONLY explicitly marked non-monetary QA fixtures.
import {findGame} from './catalog.mjs';

const TERMINAL = new Set(['collected','lost','result']);
const timed = family => ['crash','slot','plinko','wheel','roulette','cascade','tower'].includes(family);
const number = (value,min=0,max=Number.MAX_SAFE_INTEGER) => Number.isFinite(value) && value>=min && value<=max;
const clone = x => JSON.parse(JSON.stringify(x));
const point = p => Array.isArray(p)&&p.length===2&&number(p[0])&&number(p[1],1);
function selectedFamily(game,mode) {return game.family==='hybrid'?mode||'slot':game.family;}
function validateRound(game,mode,round) {
 if (!round || typeof round!=='object'||round.source!=='qa-fixture')throw Error('Only no-money QA fixtures are accepted');
 if(round.gameId!==game.id || typeof round.id!=='string'||round.id.length<3)throw Error('Invalid game/round identity');
 const fam=selectedFamily(game,mode);
 if(fam==='crash'){
  if(!number(round.crashAtMs,100,120000)||!Array.isArray(round.series)||!round.series.length||!round.series.every(point))throw Error('Missing crash timeline');
  if(round.series[0][0]!==0||round.series.some((p,i)=>i&&p[0]<=round.series[i-1][0])||round.series.at(-1)[0]>round.crashAtMs)throw Error('Invalid crash ordering');
 } else if(fam==='slot') {
  const cols=game.family==='hybrid'?3:game.grid?.[0]||5,rows=game.family==='hybrid'?1:game.grid?.[1]||3;
  if(!Array.isArray(round.reels)||round.reels.length!==cols||round.reels.some(col=>!Array.isArray(col)||col.length!==rows||col.some(s=>typeof s!=='string'||s.length>50)))throw Error('Invalid slot grid');
  if(!number(round.durationMs,250,120000)||!number(round.multiplier??0,0))throw Error('Invalid slot outcome');
 } else if(fam==='mines') {
  const count=(game.grid?.[0]||5)*(game.grid?.[1]||5);
  if(!Array.isArray(round.hazards)||round.hazards.length!==count||round.hazards.some(x=>typeof x!=='boolean')||!Array.isArray(round.multipliers)||!round.multipliers.every(x=>number(x,0)))throw Error('Invalid mine grid');
 } else if(fam==='path') {
  if(!Array.isArray(round.steps)||!round.steps.length||round.steps.some(s=>!Array.isArray(s.options)||s.options.length<2||s.options.some(v=>typeof v!=='boolean')||!number(s.multiplier,1)))throw Error('Invalid path steps');
 } else if(fam==='plinko') {
  if(!Array.isArray(round.path)||round.path.length<5||round.path.length>20||round.path.some(x=>x!==0&&x!==1)||!number(round.multiplier,0)||!number(round.stepMs,30,3000))throw Error('Invalid Plinko path');
 } else if(fam==='wheel'||fam==='roulette') {
  if(!Array.isArray(round.segments)||round.segments.length<2||round.segments.length>100||round.segments.some(s=>typeof s!=='string')||!Number.isInteger(round.index)||round.index<0||round.index>=round.segments.length||!number(round.durationMs,250,30000))throw Error('Invalid wheel outcome');
 } else if(fam==='cascade') {
  if(!Array.isArray(round.frames)||round.frames.length<2||round.frames.some(f=>!Array.isArray(f.grid)||f.grid.length!==5||f.grid.some(row=>!Array.isArray(row)||row.length!==6||row.some(s=>typeof s!=='string'))||!number(f.multiplier??1,1))||!number(round.stepMs,50,3000))throw Error('Invalid cascade frames');
 } else if(fam==='tower') {
  if(!Array.isArray(round.levels)||!round.levels.length||round.levels.some(l=>!number(l.multiplier,1)||typeof l.safe!=='boolean')||!number(round.stepMs,100,10000))throw Error('Invalid tower levels');
 } else throw Error('Unsupported engine family');
 return clone(round);
}
export class PreviewEngine {
 constructor(gameId){
  this.game=findGame(gameId);if(!this.game)throw Error('Unknown game');
  this.mode=this.game.family==='hybrid'?'slot':null;
  this.used=new Set();this.history=[];this.reset();
 }
 reset(){if(this.state==='running')throw Error('Cannot reset an active round');this.state='ready';this.round=null;this.elapsed=0;this.value=1;this.progress=0;this.revealed=[];this.choices=[];this.collected=[];this.stopAt=null;this.reason='';this.events=[];this.lastFrame=0;}
 setMode(mode){if(this.game.family!=='hybrid'||!['slot','crash'].includes(mode)||this.state==='running')return false;this.mode=mode;return true;}
 get family(){return selectedFamily(this.game,this.mode);}
 emit(type,extra={}){this.events.push({type,...extra});if(this.events.length>100)this.events.shift();}
 start(round){
  if(this.state==='running')return false;
  const clean=validateRound(this.game,this.mode,round);
  if(this.used.has(clean.id))return false;
  this.used.add(clean.id);this.state='ready';this.reset();
  this.round=clean;this.state='running';this.emit('start',{id:clean.id});
  if(this.family==='crash'){const n=Math.min(this.game.maxLanes||1,4);this.collected=Array.from({length:n},()=>null);this.value=clean.series[0][1];}
  return true;
 }
 finish(status,reason=''){
  if(this.state!=='running')return false;
  this.state=status;this.reason=reason;
  this.history.unshift({id:this.round.id,state:status,reason,progress:this.progress,value:this.value});
  if(this.history.length>20)this.history.length=20;
  this.emit(status,{reason,value:this.value});return true;
 }
 tick(dt){
  if(this.state!=='running')return false;
  if(!number(dt,0,60000))throw Error('Invalid elapsed time');
  const before=this.elapsed;this.elapsed+=dt;
  const r=this.round, fam=this.family;
  if(fam==='crash'){
   if(this.elapsed>=r.crashAtMs){this.elapsed=r.crashAtMs;const all=this.collected.every(x=>x!==null);this.finish(all?'result':'lost',all?'all-lanes-collected':'crash');return true;}
   const current=r.series.filter(([t])=>t<=this.elapsed).at(-1);if(current)this.value=current[1];
   if(this.collected.length && this.collected.every(x=>x!==null))this.finish('result','all-lanes-collected');
  } else if(fam==='slot'){
   const end=this.stopAt===null?r.durationMs:Math.min(this.stopAt,r.durationMs);
   if(this.elapsed>=end){this.progress=r.reels.length;this.value=r.multiplier??0;this.finish('result','reels-stopped');}
   else this.progress=Math.min(r.reels.length,Math.floor(this.elapsed/end*r.reels.length));
  } else if(fam==='plinko'){
   this.progress=Math.min(r.path.length,Math.floor(this.elapsed/r.stepMs));
   if(this.progress>=r.path.length){this.value=r.multiplier;this.finish('result','ball-landed');}
  } else if(fam==='wheel'||fam==='roulette'){
   this.progress=Math.min(1,this.elapsed/r.durationMs);
   if(this.progress===1){this.value=r.index;this.finish('result','wheel-stopped');}
  } else if(fam==='cascade'){
   this.progress=Math.min(r.frames.length-1,Math.floor(this.elapsed/r.stepMs));
   this.value=r.frames[this.progress].multiplier??1;
   if(this.progress>this.lastFrame){this.emit('cascade',{index:this.progress});this.lastFrame=this.progress;}
   if(this.progress>=r.frames.length-1)this.finish('lost','cascade-ended');
  } else if(fam==='tower'){
   const index=Math.min(r.levels.length-1,Math.floor(this.elapsed/r.stepMs));
   for(let i=this.progress;i<=index && this.state==='running';i++){
    const level=r.levels[i];this.progress=i+1;this.value=level.multiplier;this.emit('level',{level:this.progress});
    if(!level.safe){this.finish('lost','tower-collapsed');break;}
    if(i===r.levels.length-1)this.finish('result','tower-completed');
   }
  }
  return before!==this.elapsed||this.state!=='running';
 }
 stop(){
  if(this.state!=='running'||this.family!=='slot')return false;
  const end=this.round.durationMs;
  if(this.stopAt!==null)return false;
  this.stopAt=Math.min(end,this.elapsed+Math.max(120,this.round.reels.length*35));
  this.emit('stop-accelerate');return true;
 }
 collect(lane=0){
  if(this.state!=='running')return false;
  if(this.family==='crash'){
   if(!Number.isInteger(lane)||lane<0||lane>=this.collected.length||this.collected[lane]!==null)return false;
   this.collected[lane]=this.value;this.emit('cashout',{lane,multiplier:this.value});
   if(this.collected.every(x=>x!==null))this.finish('collected','all-lanes-collected');
   return true;
  }
  if(this.family==='mines'||this.family==='path'){
   if(this.progress===0)return false;
   this.finish('collected','manual-collect');return true;
  }
  if(this.family==='cascade'&&this.progress>0){this.finish('collected','manual-collect');return true;}
  if(this.family==='tower'&&this.progress>0){this.finish('collected','manual-collect');return true;}
  return false;
 }
 reveal(index){
  if(this.state!=='running'||this.family!=='mines'||!Number.isInteger(index)||index<0||index>=this.round.hazards.length||this.revealed.includes(index))return false;
  this.revealed.push(index);this.progress=this.revealed.length;
  const hazard=this.round.hazards[index];this.emit('reveal',{index,hazard});
  if(hazard){this.value=0;this.finish('lost','mine-hit');}
  else {this.value=this.round.multipliers[this.progress]??1;if(this.progress===this.round.hazards.filter(x=>!x).length)this.finish('result','all-safe-revealed');}
  return true;
 }
 choose(option){
  if(this.state!=='running'||this.family!=='path'||!Number.isInteger(option))return false;
  const step=this.round.steps[this.progress];if(!step||option<0||option>=step.options.length)return false;
  this.choices.push(option);this.progress++;this.value=step.multiplier;
  const good=step.options[option];this.emit('choice',{step:this.progress,option,safe:good});
  if(!good)this.finish('lost','unsafe-choice');
  else if(this.progress===this.round.steps.length)this.finish('result','path-completed');
  return true;
 }
 snapshot(){
  const r=this.round;
  return Object.freeze({id:this.game.id,name:this.game.name,family:this.family,mode:this.mode,state:this.state,roundId:r?.id||null,elapsed:this.elapsed,progress:this.progress,value:this.value,
    canStop:this.state==='running'&&this.family==='slot'&&this.stopAt===null,
    canCollect:this.state==='running'&&(this.family==='crash'?this.collected.some(x=>x===null):['mines','path','cascade','tower'].includes(this.family)&&this.progress>0),
    collected:[...this.collected],revealed:[...this.revealed],choices:[...this.choices],
    display:this.family==='slot'?{reels:r?.reels||[],spinning:this.state==='running'}
     :this.family==='mines'?{board:this.revealed.map(i=>({index:i,hazard:r?.hazards[i]}))}
     :this.family==='path'?{stepCount:r?.steps.length||0}
     :this.family==='plinko'?{path:r?.path.slice(0,this.progress)||[]}
     :this.family==='cascade'?{grid:r?.frames[this.progress]?.grid||[]}
     :this.family==='wheel'||this.family==='roulette'?{segments:r?.segments||[],targetIndex:r?.index??null}
     :this.family==='tower'?{levels:r?.levels.slice(0,this.progress)||[]}
     :{},reason:this.reason});
 }
}
export function makePreviewEngine(id){return new PreviewEngine(id);}