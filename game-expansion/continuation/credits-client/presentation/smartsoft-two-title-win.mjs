// Only the first two reviewed titles. Public Components/win.js owns these
// offsets; this clock never schedules a wager or changes an accepted receipt.
// Provenance: remaining20-first-two-audio-timing-audit/source-provenance.json.
const IDS=new Set(['multihot100_native','habeshafortune5_native']);
export const usesTwoTitleWinClock=id=>IDS.has(id);
export function twoTitleWinTiming(id,tier){
 if(!IDS.has(id)||!tier||tier.legacy||!Number.isInteger(tier.level)||tier.level<1||tier.level>4||!Number.isInteger(tier.duration)||tier.duration<=0)return null;
 const habesha=id==='habeshafortune5_native',countAt=habesha?(tier.level===3?1040:1200):1000;
 return {popupAt:1000,soundAt:habesha?400:1000,amountAt:1000,countAt,endAt:countAt+tier.duration,removeAt:countAt+tier.duration+1000};
}
export function twoTitleCountMinor(confirmedMinor,timing,elapsedMs){
 if(typeof confirmedMinor!=='string'||!/^(0|[1-9]\d*)$/.test(confirmedMinor)||!timing||!Number.isFinite(elapsedMs))return null;
 const duration=timing.endAt-timing.countAt;
 if(!Number.isSafeInteger(duration)||duration<=0)return null;
 const passed=Math.floor(Math.max(0,Math.min(duration,elapsedMs-timing.countAt)));
 return String(BigInt(confirmedMinor)*BigInt(passed)/BigInt(duration));
}

// One owner per accepted result. Rendering samples this clock; no background
// timer can replay a sound after refresh, collection, a new spin or page exit.
export class TwoTitleWinClock{
 constructor(){this.record=null;this.closed=true;this.generation=0;}
 reset(){this.cancel();this.closed=false;}
 release(record){if(!record)return;record.audioController?.abort();if(record.ducked){record.restoreMusic?.(record);record.ducked=false;}}
 cancel(){this.generation++;this.closed=true;if(this.record){this.record.cancelled=true;this.release(this.record);}this.record=null;}
 observeReceipt(receiptKey,roundStatus){if(this.record&&(this.record.receiptKey!==receiptKey||roundStatus!==this.record.roundStatus))this.cancel();}
 get active(){return !this.closed&&!this.record?.cancelled&&!this.record?.ended;}
 handles(event){return this.active&&this.record!==null&&(event==='win'||event==='win-end'||event===this.record.tier.cue);}
 sample({id,motion,tier,elapsedMs,receiptKey,roundStatus,finalFrame,play,duckMusic,restoreMusic}){
  const timing=twoTitleWinTiming(id,tier);
  if(this.closed||!timing||!motion||!['active','settled'].includes(roundStatus)||finalFrame!==true||!Number.isFinite(elapsedMs)||elapsedMs<0)return false;
  if(!this.record)this.record={motion,tier,receiptKey,roundStatus,timing,played:new Set(),generation:this.generation,cancelled:false,ended:false,ducked:false,restoreMusic};
  const record=this.record;
  if(record.motion!==motion||record.receiptKey!==receiptKey||roundStatus!==record.roundStatus){this.cancel();return false;}
  if(record.cancelled||record.ended)return false;
  if(elapsedMs>=timing.removeAt){record.ended=true;this.release(record);return false;}
  const isCurrent=()=>this.active&&this.record===record&&this.generation===record.generation;
  if(elapsedMs>=timing.soundAt&&!record.ducked){duckMusic?.(record);record.ducked=true;}
  for(const[event,at,until]of [[tier.cue,timing.soundAt,timing.endAt],['win-end',timing.endAt,timing.removeAt]]){
   if(elapsedMs>=at&&!record.played.has(event)){
    record.played.add(event);record.audioController?.abort();
    if(elapsedMs<until){record.audioController=new AbortController();void Promise.resolve(play?.(event,{isCurrent,signal:record.audioController.signal})).catch(()=>{});}
   }
  }
  return true;
 }
}
