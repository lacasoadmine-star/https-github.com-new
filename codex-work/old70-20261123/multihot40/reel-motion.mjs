const gridOK = grid => Array.isArray(grid) && grid.length === 4 && grid.every(row =>
  Array.isArray(row) && row.length === 5 && row.every(v => Number.isInteger(v) && v >= 0 && v <= 7));
const clone = value => structuredClone(value);
export const DEFAULT_TIMING = Object.freeze({spinMs:1400, staggerMs:260, settleMs:280, turboMs:420, stopMs:120});
/** Presentation only. The accepted local result never changes when STOP is pressed. */
export function createReelMotion({timing=DEFAULT_TIMING,onEvent=()=>{}}={}) {
  for(const key of Object.keys(DEFAULT_TIMING))if(!Number.isFinite(timing[key])||timing[key]<0)throw Error('MH40_TIMING_REQUIRED');
  let run=null,pausedAt=null,disposed=false;
  const emit=event=>{try{onEvent(event);}catch{}};
  function start(round,{now=0,turbo=false}={}) {
    if(disposed||run||!gridOK(round?.grid)||typeof round.requestId!=='string'||!round.requestId)throw Error('MH40_INVALID_PRESENTATION');
    const length=turbo?timing.turboMs:timing.spinMs;
    run={round:clone(round),started:now,ends:Array.from({length:5},(_,c)=>now+length+c*(turbo?45:timing.staggerMs)),
      stopped:new Set(),complete:false};
    pausedAt=null;emit({type:'spin',requestId:round.requestId});return snapshot(now);
  }
  function stop(now) {
    if(!run||disposed)return false;
    const base=pausedAt??now;
    run.ends=run.ends.map((end,c)=>Math.min(end,base+timing.stopMs+c*35));
    return true;
  }
  function pause(now) {if(run&&pausedAt===null)pausedAt=now;}
  function resume(now) {
    if(run&&pausedAt!==null){const offset=Math.max(0,now-pausedAt);run.started+=offset;run.ends=run.ends.map(t=>t+offset);pausedAt=null;}
  }
  function snapshot(now) {
    if(!run)return {phase:'idle',columns:[],round:null};
    const at=pausedAt??now;
    return {phase:at>=run.ends[4]+timing.settleMs?'complete':'spinning',round:clone(run.round),
      columns:run.ends.map((end,column)=>({column,stopped:at>=end,remainingMs:Math.max(0,end-at),
        travel:Math.max(0,at-run.started)/65,
        bounce:at<end?0:at>end+timing.settleMs?0:Math.sin((at-end)/timing.settleMs*Math.PI)*.07}))};
  }
  function tick(now) {
    const value=snapshot(now);
    if(run&&pausedAt===null){
      for(const column of value.columns)if(column.stopped&&!run.stopped.has(column.column)){
        run.stopped.add(column.column);emit({type:'reel-stop',column:column.column,requestId:run.round.requestId});
      }
      if(value.phase==='complete'&&!run.complete){run.complete=true;emit({type:'complete',requestId:run.round.requestId,round:clone(run.round)});}
    }
    return value;
  }
  function finish(requestId) {
    if(!run||requestId!==run.round.requestId||!run.complete)return false;
    run=null;pausedAt=null;return true;
  }
  return Object.freeze({start,stop,pause,resume,tick,snapshot,finish,
    dispose(){disposed=true;run=null;pausedAt=null;}});
}
