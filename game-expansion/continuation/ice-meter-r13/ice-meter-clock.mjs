// Source: official Slots/blazinghot.js SHA-256
// a250e41a8a196a53f8f919d37a158d7a2e295f07de7ffa93caa0dba9a32dfa34.
// Presentation only. The host supplies time since wildColumnAnimation and the
// accepted coinReels. No outcome generation, timers or financial operations.
const supported=new Set(['burningice_native','burningice10_native','burningice40_native']);
const ticks=[0];
// Preserve the source's repeated floating-point increment, including the
// boundary at which parseInt(index / 9) becomes positive.
while(Math.trunc(ticks.at(-1)/9)===0)ticks.push(ticks.at(-1)+0.1);
export const ICE_METER_CYCLE_TICKS=ticks.length-1;
export function iceMeterClock(id,{elapsedMs,coinReels=[],cancelled=false}={}){
 if(!supported.has(id)||!Number.isFinite(elapsedMs)||elapsedMs<0||!Array.isArray(coinReels)||coinReels.some(c=>!Number.isInteger(c)||c<0||c>4))return null;
 const visible=id!=='burningice40_native';
 if(cancelled)return {visible,phase:'cancelled',headerAlpha:1,activeSlots:[],movingSlot:null,columnEffects:[]};
 const tick=Math.floor(elapsedMs*60/1000),cycling=tick<ICE_METER_CYCLE_TICKS;
 if(cycling){
  const movingSlot=Math.trunc(ticks[tick])%3;
  return {visible,phase:'cycling',headerAlpha:0,activeSlots:[movingSlot],movingSlot,columnEffects:[]};
 }
 const since=elapsedMs-ICE_METER_CYCLE_TICKS*1000/60;
 const selected=[1,2,3].filter(c=>coinReels.includes(c));
 return {visible,phase:'selected',headerAlpha:1,
  activeSlots:selected.flatMap((c,i)=>since>=i*200?[c-1]:[]),movingSlot:null,
  columnEffects:selected.flatMap((c,i)=>since>=i*200+200?[{column:c,elapsedMs:since-i*200-200}]:[])};
}
