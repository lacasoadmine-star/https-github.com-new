import {moneyMinor} from './session.mjs';
import {buildCoinHelpModel} from './coin-help.mjs';

// Source-bound selection behavior only. This file is not imported by the R3
// frozen app. The current local app mounts it through coin-bet-host.mjs.
// It supplies no guessed popup CSS or provider typography. Its callback
// updates local selections; no method can submit a wager or wallet action.
export const COIN_BET_CONTROLLER_SOURCE=Object.freeze({
 runtimeSha256:'cf80c61777289229fe02429fe400d7f3360c8609074022d482b1e652ff4750e5',
 controllerOffset:245947,betOffset:253970,maxWinOffset:259585,
 buttonOrder:Object.freeze(['min','minus','value','plus','max']),
 holdDelayMs:200,holdRepeatMs:100,holdElapsedComparison:'strictly greater than 200ms',
 sourceStylesRetained:false,integrated:false,localHostIntegrated:true,localVerification:'deterministic actual-app DOM fixtures; browser verification blocked',
});
const ID='coinminer_native',OPERATIONS=new Set(['min','minus','plus','max']);
const fail=message=>{throw Error(message);};
const decimal=minor=>(minor/100n).toString()+'.'+(minor%100n).toString().padStart(2,'0');

function profile(game){
 if(game?.id!==ID||game.minStake!=='1.00'||game.maxStake!=='40000.00'||!Array.isArray(game.stakeValues)||!game.stakeValues.length)fail('COIN_OPERATOR_PROFILE_REQUIRED');
 const stakes=game.stakeValues.map(value=>{
  const minor=moneyMinor(value);if(minor===null||minor<100n||minor>4000000n||minor%100n!==0n)fail('INVALID_COIN_OPERATOR_STAKES');
  return decimal(minor);
 });
 if(stakes[0]!=='1.00'||stakes.at(-1)!=='40000.00'||stakes.some((value,index)=>index>0&&moneyMinor(value)<=moneyMinor(stakes[index-1])))fail('INVALID_COIN_OPERATOR_STAKES');
 const mines=game.controls?.mines?.values??game.controls?.mines?.choices;
 if(JSON.stringify(mines)!=='[1,2,3,5,7,10,17,20,24]')fail('INVALID_COIN_MINE_CHOICES');
 return {stakes,mines:[...mines]};
}

// MIN/MAX select list endpoints; +/- select adjacent supplied values. No
// interpolation creates a new wager amount or an unsupported mine count.
export function coinControllerValue(options,value,operation){
 if(!OPERATIONS.has(operation)||!Array.isArray(options)||!options.length||new Set(options).size!==options.length)fail('INVALID_COIN_CONTROLLER');
 const index=options.indexOf(value);if(index<0)fail('INVALID_COIN_SELECTED_VALUE');
 return options[operation==='min'?0:operation==='max'?options.length-1:operation==='minus'?Math.max(0,index-1):Math.min(options.length-1,index+1)];
}

export function buildCoinBetControllerView(game,selection){
 const {stakes,mines}=profile(game);
 if(!selection||selection.gameId!==undefined&&selection.gameId!==ID||selection.modelVersion!==undefined&&selection.modelVersion!==(game.modelVersion??game.version))fail('COIN_SELECTION_IDENTITY_CHANGED');
 if(!stakes.includes(selection.stake)||!mines.includes(selection.mines))fail('INVALID_COIN_SELECTED_VALUE');
 const disabled=selection.active===true||selection.pending===true||selection.busy===true||selection.confirming===true||selection.recoveryBlocked===true||selection.error===true||selection.connected===false||selection.confirmed===false||selection.authenticated===false;
 const row=(field,label,options,value)=>({field,label,options:[...options],value,disabled,
  minDisabled:disabled||value===options[0],minusDisabled:disabled||value===options[0],
  plusDisabled:disabled||value===options.at(-1),maxDisabled:disabled||value===options.at(-1)});
 const help=buildCoinHelpModel(game,{stake:selection.stake,mines:selection.mines}),last=help.rows.at(-1);
 return {gameId:ID,stake:selection.stake,mines:selection.mines,disabled,
  rows:[row('stake','BET',stakes,selection.stake),row('mines','MINES',mines,selection.mines)],
  maxReturnMinor:last.payoutMinor,maxReturn:decimal(BigInt(last.payoutMinor)),currency:'ETB',
  sourceStylesVerified:false,financialActions:false};
}

// Integration contract: getSelection() returns the latest local selection
// and active/pending locks. onSelection({stake,mines}) only updates those
// controls. Pointer-up calls release(); blur/close/pointercancel calls cancel().
// Every repeat re-reads the lock, model identity and selected value. Pass the
// host's sessionId and raw recovery/connection flags through getSelection().
// A hold belongs to the session that began it, including its short release.
export function createCoinBetController({game,getSelection,onSelection,timers={}}={}){
 profile(game);if(typeof getSelection!=='function'||typeof onSelection!=='function')fail('COIN_SELECTION_HANDLERS_REQUIRED');
 const clock={now:()=>performance.now(),setTimeout:(fn,ms)=>setTimeout(fn,ms),clearTimeout:id=>clearTimeout(id),setInterval:(fn,ms)=>setInterval(fn,ms),clearInterval:id=>clearInterval(id),...timers};
 let press=null,disposed=false;
 const view=()=>{if(disposed)fail('COIN_CONTROLLER_DISPOSED');return buildCoinBetControllerView(game,getSelection());};
 const choose=(field,operation)=>{
  const current=view(),row=current.rows.find(value=>value.field===field);
  if(!row||!OPERATIONS.has(operation))fail('INVALID_COIN_CONTROLLER');
  if(current.disabled||row[operation+'Disabled'])return false;
  const value=coinControllerValue(row.options,row.value,operation);if(value===row.value)return false;
  onSelection({stake:current.stake,mines:current.mines,[field]:value});return true;
 };
 const cancel=()=>{if(press){if(press.delay!==null)clock.clearTimeout(press.delay);if(press.interval!==null)clock.clearInterval(press.interval);press=null;}};
 const begin=(field,operation)=>{
  cancel();const current=view(),row=current.rows.find(value=>value.field===field);
  if(!row||!OPERATIONS.has(operation))fail('INVALID_COIN_CONTROLLER');
  if(current.disabled||row[operation+'Disabled'])return false;
  const held={field,operation,sessionId:getSelection().sessionId,startedAt:clock.now(),delay:null,interval:null};press=held;
  const armRepeat=()=>{
   if(press!==held||disposed)return;
   held.delay=null;
   // Timers can fire exactly on the boundary (or early). Re-arm rather than
   // silently leaving a long press without repeats. Preserve source's >200.
   const remaining=COIN_BET_CONTROLLER_SOURCE.holdDelayMs-(clock.now()-held.startedAt);
   if(remaining>=0){held.delay=clock.setTimeout(armRepeat,Math.max(1,remaining+1));return;}
   held.interval=clock.setInterval(()=>{
    if(press!==held||disposed)return;
    try{if(getSelection().sessionId!==held.sessionId||!choose(field,operation))cancel();}catch{cancel();}
   },COIN_BET_CONTROLLER_SOURCE.holdRepeatMs);
  };
  held.delay=clock.setTimeout(armRepeat,COIN_BET_CONTROLLER_SOURCE.holdDelayMs);
  return true;
 };
 const release=()=>{
  const held=press;if(!held||disposed)return false;
  const wasRepeating=held.interval!==null;cancel();
  try{return wasRepeating||getSelection().sessionId!==held.sessionId?false:choose(held.field,held.operation);}catch{return false;}
 };
 return {view,choose,begin,release,cancel,dispose(){cancel();disposed=true;}};
}
