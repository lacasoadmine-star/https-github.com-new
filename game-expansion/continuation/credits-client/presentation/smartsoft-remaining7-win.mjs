// The four remaining modern titles use the public Components/win.js clock.
// All offsets are presentation-only. Private outcomes and wallet actions are
// never scheduled here. See current-smartsoft-r5/media-review.json provenance.
const profiles=Object.freeze({
 multihotwildways_native:{popupAt:1000,soundAt:1400,amountAt:1400,countAt:1000},
 multihot5wild_native:{popupAt:1000,soundAt:1400,amountAt:1400,countAt:1000},
 multihot5superwilds_native:{popupAt:1000,soundAt:1000,amountAt:1000,countAt:1000},
 multihotdeluxe_native:{popupAt:1000,soundAt:1000,amountAt:1000,countAt:2000},
});
export const usesRemainingModernWinClock=id=>Object.hasOwn(profiles,id);
export function remainingModernWinTiming(id,tier){
 const p=profiles[id];
 if(!p||!tier||tier.legacy||!Number.isFinite(tier.duration)||tier.duration<=0)return null;
 return {...p,endAt:p.countAt+tier.duration,removeAt:p.countAt+tier.duration+1000};
}
export function remainingModernCountMinor(confirmedMinor,timing,elapsedMs){
 if(typeof confirmedMinor!=='string'||!/^(0|[1-9]\d*)$/.test(confirmedMinor)||!timing||!Number.isFinite(elapsedMs))return null;
 const duration=timing.endAt-timing.countAt;
 if(!Number.isSafeInteger(duration)||duration<=0)return null;
 const passed=Math.floor(Math.max(0,Math.min(duration,elapsedMs-timing.countAt)));
 return String(BigInt(confirmedMinor)*BigInt(passed)/BigInt(duration));
}

// Sample the same render clock as the win artwork. There are no background
// timers; resuming after a hidden/expired popup cannot replay an old sound.
export class RemainingSmartSoftWinClock{
 constructor(){this.record=null;this.closed=true;this.generation=0;}
 reset(){this.cancel();this.closed=false;}
 release(record){if(!record)return;record.audioController?.abort();if(record.ducked){record.restoreMusic?.(record);record.ducked=false;}}
 cancel(){this.generation++;this.closed=true;if(this.record){this.record.cancelled=true;this.release(this.record);}this.record=null;}
 observeReceipt(receiptKey,roundStatus){if(this.record&&(this.record.receiptKey!==receiptKey||this.record.roundStatus!==roundStatus))this.cancel();}
 get active(){return !this.closed&&!this.record?.cancelled&&!this.record?.ended;}
 handles(event){return this.active&&this.record!==null&&(event==='win'||event==='win-end'||event===this.record.tier.cue);}
 sample({id,motion,tier,elapsedMs,receiptKey,roundStatus,finalFrame,play,duckMusic,restoreMusic}){
  const timing=remainingModernWinTiming(id,tier);
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
    record.played.add(event);
    record.audioController?.abort();
    if(elapsedMs<until){record.audioController=new AbortController();void Promise.resolve(play?.(event,{isCurrent,signal:record.audioController.signal})).catch(()=>{});}
   }
  }
  return true;
 }
}
