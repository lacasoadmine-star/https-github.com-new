// Public presentation timing only. No wager, outcome, RNG or receipt selection.
const clamp=x=>Math.max(0,Math.min(1,x));
const swing=x=>(1-Math.cos(Math.PI*clamp(x)))/2;
const backInOut=x=>{const s=.9*1.01,t=clamp(x)*2;return t<1?t*t*((s+1)*t-s)/2:((t-2)**2*((s+1)*(t-2)+s)+2)/2;};

export function foxyPendingColumn(elapsed,column,turbo=false){
 const first=125+column*(turbo?25:200),returnTime=62.5,cellHeight=230*.49,startRows=15/cellHeight;
 const t=Math.max(0,elapsed);let displacement;
 if(t<first){const p=t/first;displacement=-startRows*(1-(1-p)**2);}
 else if(t<first+returnTime)displacement=-startRows*(1-(t-first)/returnTime);
 else displacement=(t-first-returnTime)*3/(turbo?325:125);
 const position=-displacement,whole=Math.floor(position),fraction=position-whole;
 return {whole,fraction,blur:t>=first,displacement};
}
export function foxyPendingWheel(elapsed,angle=0,turbo=false){
 const t=Math.max(0,elapsed),back=Math.PI/20;
 return t<200?angle-back*backInOut(t/200):angle-back+(t-200)*Math.PI*2/(turbo?200:1000);
}
export function foxyWinShade(amount,bet,age,{reducedMotion=false,dismissed=false}={}){
 if(dismissed||!(Number(bet)>0)||!(Number(amount)>Number(bet)*15)||age<1500||age>=15200)return 0;
 return .7*(reducedMotion?1:swing((age-1500)/200));
}
export const foxyWinProgress=(age,completed=false)=>completed?1:clamp((age-2500)/11700);
export const foxyWinTap=(age,alreadyCompleted=false)=>alreadyCompleted||age<2500||age>=14200?'dismiss':'complete';

// Convert the provider's capped60Hz tick schedule to stable elapsed presentation time.
// Each receipt is sorted on a copy; line IDs, rows, payouts and original order are not mutated.
export function multiLineSchedule(winLines,age,{reducedMotion=false}={}){
 const sorted=winLines.map((line,index)=>({line,index})).sort((a,b)=>Number(b.line.baseWin)-Number(a.line.baseWin)||a.index-b.index).map(x=>x.line);
 if(!sorted.length)return {selected:null,active:[]};
 if(reducedMotion)return {selected:sorted[0],active:[{line:sorted[0],seconds:.25}]};
 const tick=Math.max(0,age)*60/1000;let nextTick=0;
 const active=[];
 for(const [index,line]of sorted.entries()){
  // Only the first outstanding line's counter decrements. The next line waits
  // for the36-frame/24FPS BoxWin completion, then its own10+20*index ticks.
  const start=nextTick+10+20*index,seconds=(tick-start)/60;nextTick=start+90;
  if(seconds>=0&&seconds<1.65)active.push({line,seconds});
 }
 return {selected:active.at(-1)?.line||null,active};
}
export function multiSymbolOpacity(schedule,row,col){
 const current=schedule.active.at(-1);if(!current||current.line.positions.some(([r,c])=>r===row&&c===col))return 1;
 const t=current.seconds;return t<.1?1-.5*clamp(t/.1):t<1.5?.5:.5+.5*clamp((t-1.5)/.1);
}
