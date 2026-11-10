// Sound ownership for the reviewed BlazingHot10/40 source. moveSounds=1
// starts ObjectMove on the first moving reel, and column4 stops that loop
// at its impact. Completion also closes a loop if column4 was held frozen.
// No timers, outcome generation, wallet mutations, or financial requests.
export class IceReelAudioClock {
 constructor(){this.record=null;}
 cancel(){this.record?.controller.abort();this.record=null;}
 handle({id,event,play,isCurrent=()=>true}){
  if(!['burningice10_native','burningice40_native'].includes(id))return false;
  if(event.type==='spin-start'){this.cancel();return false;}
  if(event.type==='animation-complete'||event.type==='reel-stop'&&event.column===4){this.cancel();return false;}
  if(event.type!=='reel-move'||this.record||!isCurrent()||typeof play!=='function')return false;
  const record={sequence:event.sequence,controller:new AbortController()};this.record=record;
  const current=()=>this.record===record&&!record.controller.signal.aborted&&isCurrent();
  try{void Promise.resolve(play('reels-loop',{signal:record.controller.signal,isCurrent:current})).catch(()=>{});}catch{}
  return true;
 }
}
