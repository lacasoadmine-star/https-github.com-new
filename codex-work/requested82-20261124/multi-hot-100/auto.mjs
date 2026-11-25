import {M100_OBSERVED_AUTO_COUNTS} from './controls.mjs';
const minor=value=>{if(typeof value!=='string'||!/^(0|[1-9]\d*)\.\d{2}$/.test(value))throw Error('M100_AUTO_AMOUNT');return BigInt(value.replace('.',''));};
export const M100_OWN_AUTO_POLICY=Object.freeze({schema:'zplay/m100-own-auto-policy/v1',providerExecutionParityVerified:false,
 maximumRounds:'Counts accepted completed rounds',winCondition:'Accepted pending win at or above limit',balanceConditions:'Compare accepted cash plus accepted pending win with the accepted total at Start; display and ledger stay unchanged',
 stopCollectsWin:true,hiddenOrDisposedCollectsWin:false,sourceRule:'Current M100 help: AutoPlay wins transfer to balance',pollMs:80});

/** Each SPIN/TAKE uses the existing controller and original authoritative host. */
export function createM100Auto({getGame,onChange=()=>{},isHidden=()=>document.hidden}={}){
 if(typeof getGame!=='function')throw TypeError('M100_AUTO_GAME');
 let active=false,remaining=0,baseline=0n,config=null,timer=null,inflight=false,disposed=false,lastRound=null,finishCollect=false;
 const snapshot=()=>Object.freeze({active,remaining,collectingFinalWin:finishCollect,policy:M100_OWN_AUTO_POLICY});
 const notify=()=>{try{onChange(snapshot());}catch{}};
 function schedule(){if(!disposed&&(active||finishCollect)&&timer===null&&!inflight)timer=setTimeout(tick,M100_OWN_AUTO_POLICY.pollMs);}
 function cancel({collect=true}={}){
  const wasActive=active;active=false;if(timer!==null)clearTimeout(timer);timer=null;
  const game=getGame();game?.controls.stopAuto();
  if(disposed||isHidden()||!collect)finishCollect=false;else if(wasActive)finishCollect=true;
  notify();schedule();return true;
 }
 async function tick(){
  timer=null;if(disposed||inflight)return;const game=getGame(),state=game?.snapshot();
  if(!state||isHidden()||state.hidden||state.disposed){cancel({collect:false});return;}
  if(state.phase==='RECOVERY_REQUIRED'||state.presentationRecoveryRequired){cancel({collect:false});return;}
  if(active&&!state.auto.running)cancel();
  if(state.pending||state.inFlight||state.modal||!['IDLE','WIN_PENDING'].includes(state.phase)){schedule();return;}
  if(finishCollect&&!active){
   finishCollect=false;
   if(state.phase==='WIN_PENDING'&&minor(state.pendingWin??'0.00')>0n){inflight=true;try{await game.controller.take();}finally{inflight=false;notify();}}
   else notify();
   return;
  }
  if(!active)return;
  if(state.round&&state.round.roundId!==lastRound){
   lastRound=state.round.roundId;remaining--;
   const cash=minor(state.balance),win=minor(state.pendingWin??'0.00'),acceptedTotal=cash+win;
   if(remaining<=0||config.winAtLeast&&win>=minor(config.winAtLeast)||config.balanceDecrease&&baseline-acceptedTotal>=minor(config.balanceDecrease)||config.balanceIncrease&&acceptedTotal-baseline>=minor(config.balanceIncrease)){cancel();return;}
   notify();
  }
  if(disposed||isHidden()||!active)return;
  inflight=true;try{const accepted=await game.controller.spin();if(!accepted)cancel({collect:false});}catch{cancel({collect:false});}finally{inflight=false;schedule();}
 }
 function start(configuration){
  if(disposed||active||finishCollect||inflight||!configuration||!M100_OBSERVED_AUTO_COUNTS.includes(configuration.maximumRounds))throw Error('M100_AUTO_CONFIGURATION');
  const state=getGame()?.snapshot();if(!state||isHidden()||state.hidden||state.pending||state.inFlight||state.phase!=='IDLE'||!state.auto.running)throw Error('M100_AUTO_UNAVAILABLE');
  for(const key of ['winAtLeast','balanceDecrease','balanceIncrease'])if(configuration[key]!==null&&configuration[key]!==undefined&&minor(configuration[key])<=0n)throw Error('M100_AUTO_CONFIGURATION');
  config=Object.freeze({...configuration});remaining=configuration.maximumRounds;baseline=minor(state.balance)+minor(state.pendingWin??'0.00');lastRound=state.round?.roundId??null;active=true;notify();schedule();return true;
 }
 return Object.freeze({start,cancel,observe(state){if(disposed)return;if(state.hidden||state.disposed)cancel({collect:false});else schedule();},snapshot,dispose(){disposed=true;cancel({collect:false});}});
}
