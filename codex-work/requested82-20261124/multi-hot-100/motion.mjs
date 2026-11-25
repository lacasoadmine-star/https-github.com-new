import {defaultM100WheelAngle} from './view.mjs';

// These are explicitly own presentation choices. They never alter accepted
// server outcomes, payouts or probability, and are not provider timing claims.
export const M100_OWN_MOTION=Object.freeze({schema:'zplay/m100-own-receipt-motion/v1',providerTimingVerified:false,
 normalDurationMs:1700,quickDurationMs:450,reelCycleMs:170,quickReelCycleMs:95,wheelTurns:2,reelSettleStart:.46,reelStagger:.105});

export function createM100Motion({onEvent=()=>{}}={}){
 let key=null,acceptedAt=null,fromAngle=0,lastAngle=0,disposed=false;const emitted=new Set();
 function emit(name){const id=key+':'+name;if(emitted.has(id))return;emitted.add(id);try{onEvent(name);}catch{}}
 function clock({now,elapsedMs,state,presentation}){
  if(disposed||(!presentation.pending&&!presentation.moving))return null;
  const next=presentation.pending?.requestKey??presentation.receipt?.requestKey;
  if(next!==key){key=next;acceptedAt=null;fromAngle=lastAngle;emitted.clear();}
  if(presentation.receipt&&acceptedAt===null){acceptedAt=now;fromAngle=lastAngle;}
  const duration=state.settings.quick?M100_OWN_MOTION.quickDurationMs:M100_OWN_MOTION.normalDurationMs;
  const progress=acceptedAt===null?0:Math.min(1,Math.max(0,(now-acceptedAt)/duration));
  if(presentation.receipt){for(let column=0;column<5;column++)if(presentation.stopRequested||progress>=M100_OWN_MOTION.reelSettleStart+column*M100_OWN_MOTION.reelStagger)emit('reel-stop-'+(column+1));if(progress>=1||presentation.stopRequested)emit('multiplier');}
  return {clockMs:elapsedMs,progress};
 }
 function reelOffset({column,cellHeight,state,presentation}){
  if(disposed||!presentation.moving||presentation.stopRequested||presentation.receipt&&presentation.progress>=M100_OWN_MOTION.reelSettleStart+column*M100_OWN_MOTION.reelStagger)return 0;
  return ((presentation.clockMs/(state.settings.quick?M100_OWN_MOTION.quickReelCycleMs:M100_OWN_MOTION.reelCycleMs))+column*.16)%1*cellHeight;
 }
 function wheelAngle({state,presentation}){
  if(disposed)return defaultM100WheelAngle({presentation});
  const target=defaultM100WheelAngle({presentation:presentation.receipt||presentation.previous?presentation:{receipt:state.round,previous:null}});
  if(!presentation.moving){lastAngle=target;return target;}
  if(!presentation.receipt){lastAngle=fromAngle+presentation.clockMs/340;return lastAngle;}
  const turns=M100_OWN_MOTION.wheelTurns*2*Math.PI;
  const end=fromAngle+turns+((target-fromAngle)%(2*Math.PI)+2*Math.PI)%(2*Math.PI),p=presentation.progress,eased=1-(1-p)**3;
  lastAngle=presentation.stopRequested?target:fromAngle+(end-fromAngle)*eased;return lastAngle;
 }
 return Object.freeze({clock,reelOffset,wheelAngle,metadata:M100_OWN_MOTION,dispose(){disposed=true;emitted.clear();}});
}
