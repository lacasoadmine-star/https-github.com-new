// Multi Hot 40 dedicated live controller.
// Integrates existing /api/machine-session, /api/slots/* via the shared WalletAdapter.
// No synthetic payout, detached wallet, dashboard or new endpoint.
import {WalletAdapter, definitelyRejected} from '../dedicated-resume/shared/wallet.mjs';
export const GAME_ID = 'multihot40_native';
const fail = (code) => {throw Object.assign(new Error(code),{code});};
const cents = s => typeof s === 'string' && /^(0|[1-9]\d*)\.\d{2}$/.test(s);
const req = (condition,code) => {if(!condition)fail(code)};
export function validatePlayer(session) {
 req(session?.authenticated === true,'PLAYER_NOT_AUTHENTICATED');
 req(session.currency==='ETB' && cents(session.balance),'INVALID_ETB_BALANCE');
 req(typeof session.sessionId==='string' && /^[0-9a-f]{64}$/.test(session.sessionId),'INVALID_PLAYER_SESSION');
 return session;
}
export function validateModel(model) {
 req(model?.id===GAME_ID && model.enabled===true,'MODEL_NOT_AVAILABLE');
 req(typeof model.mathVersion==='string' && model.mathVersion.length>0,'MODEL_VERSION_MISSING');
 req(typeof model.engineVersion==='string' && model.engineVersion.length>0,'ENGINE_VERSION_MISSING');
 req(typeof model.mathSha256==='string' && /^[a-f0-9]{64}$/i.test(model.mathSha256),'MODEL_HASH_INVALID');
 req(Array.isArray(model.betLevels) && model.betLevels.length>0 && model.betLevels.every(x=>cents(x)&&Number(x)>0),'INVALID_BET_LADDER');
 // A foreign game model must never silently drive this 5-by-4, 40-line title.
 req(model.reels===undefined || model.reels===5,'MH40_MODEL_REELS_MISMATCH');
 req(model.rows===undefined || model.rows===4,'MH40_MODEL_ROWS_MISMATCH');
 req(model.paylines===undefined || model.paylines===40,'MH40_MODEL_LINES_MISMATCH');
 if(model.symbolNames!==undefined)req(Array.isArray(model.symbolNames)&&model.symbolNames.length===8&&model.symbolNames.every(x=>typeof x==='string'&&x.length>0)&&new Set(model.symbolNames).size===8,'MH40_SYMBOL_DICTIONARY_INVALID');
 return model;
}
export function validateRound(receipt,{model,bet}) {
 req(receipt?.gameId===GAME_ID,'WRONG_GAME_RECEIPT');
 req(typeof receipt.roundId==='string' && receipt.roundId.length>0,'ROUND_ID_MISSING');
 req(receipt.mathVersion===model.mathVersion && receipt.mathSha256===model.mathSha256 && receipt.engineVersion===model.engineVersion,'RULES_VERSION_MISMATCH');
 // Native backend receipts use balanceAfter; retain balance for older read-only snapshots.
 // Never compute a balance locally and never infer a win from reel graphics.
 const authoritativeBalance=receipt.balanceAfter ?? receipt.balance;
 req(receipt.bet===bet && cents(receipt.finalWin) && cents(authoritativeBalance),'ROUND_ACCOUNTING_INVALID');
 // Existing Multi Hot 40 engine receipts are column-major: five reels, four symbols each.
 req(Array.isArray(receipt.grid) && receipt.grid.length===5 && receipt.grid.every(column=>Array.isArray(column) && column.length===4),'MH40_GRID_INVALID');
 req(receipt.grid.every(row=>row.every(v=>(typeof v==='string'&&v.length>0)||(Number.isInteger(v)&&v>=0&&v<8))),'MH40_SYMBOL_INVALID');
 if(model.symbolNames)req(receipt.grid.every(row=>row.every(v=>typeof v==='number'||model.symbolNames.includes(v))),'MH40_SYMBOL_OUTSIDE_MODEL');
 req(Number.isInteger(receipt.wheelMultiplier) && receipt.wheelMultiplier>=1 && receipt.wheelMultiplier<=5,'MH40_MULTIPLIER_INVALID');
 return {...receipt,balance:authoritativeBalance};
}
export class MultiHot40Live {
 constructor({api=new WalletAdapter(),scene,clock=()=>Date.now(),onState=()=>{}}={}) {
  req(scene && ['start','stop','reveal','reset','pause','resume','dispose'].every(k=>typeof scene[k]==='function'),'MH40_SCENE_REQUIRED');
  this.api=api;this.scene=scene;this.clock=clock;this.onState=onState;this.generation=0;this.session=null;this.model=null;this.stake=null;this.phase='loading';this.autoArmed=0;this.autoLeft=0;this.active=false;this.hidden=false;this.focused=true;this.disposed=false;this.lastReceipt=null;this.error=null;this.audio=null;
 }
 snapshot(){return {phase:this.phase,stake:this.stake,balance:this.session?.balance??null,autoArmed:this.autoArmed,autoLeft:this.autoLeft,lastReceipt:this.lastReceipt,error:this.error};}
 notify(){try{this.onState(this.snapshot());}catch{ /* UI callbacks never own wallet, settlement, or lifecycle state. */ }}
 change(phase,error=null){this.phase=phase;this.error=error;this.notify();}
 async boot(){
  const generation=++this.generation;this.active=false;this.autoLeft=0;this.change('loading');
  try {
   const session=validatePlayer(await this.api.session());
   if(generation!==this.generation||this.disposed)return false;
   const model=validateModel(await this.api.model(GAME_ID));
   if(generation!==this.generation||this.disposed)return false;
   this.api.bind(session.sessionId,GAME_ID);this.session=session;this.model=model;
   this.scene.setSymbolNames?.(model.symbolNames);
   this.stake=model.betLevels.includes(this.stake)?this.stake:model.betLevels[0];
   const pending=this.api.pending();this.scene.reset();
   this.change(pending?'confirm':'ready');return true;
  }catch(e){if(generation!==this.generation||this.disposed)return false;this.change('error',e.code||e.message);return false;}
 }
 bet(value){if(this.phase!=='ready'||this.autoLeft||this.autoArmed)return false;if(!this.model?.betLevels.includes(value))return false;this.stake=value;this.notify();return true;}
 armAuto(count){if(this.phase!=='ready'||!Number.isInteger(count)||count<1||count>100)return false;this.autoArmed=count;this.notify();return true;}
 // Selecting AUTO never executes a spin. Only this explicit START PLAY entry does.
 async startPlay(){if(!this.autoArmed||this.phase!=='ready')return false;this.autoLeft=this.autoArmed;this.autoArmed=0;return this.spin();}
 stopAuto(){this.autoArmed=0;this.autoLeft=0;this.notify();}
 visible(){return !this.disposed&&!this.hidden&&this.focused;}
 visibility(hidden){this.hidden=!!hidden;this.syncLifecycle();}
 focus(focused){this.focused=!!focused;this.syncLifecycle();}
 syncLifecycle(){if(this.visible()){this.scene.resume();this.audio?.resume?.();}else{this.stopAuto();this.scene.pause();this.audio?.pause?.();}}
 async spin(){
  if(this.disposed||!this.visible()||!['ready','confirm'].includes(this.phase)||this.active)return false;
  const generation=this.generation,model=this.model,stake=this.stake;
  let saved;
  try{saved=this.api.pending();}catch(e){this.change('error',e.code||e.message);return false;}
  if(!model||!stake)return false;
  if(saved&&saved.bet!==stake){this.change('confirm','SAVED_BET_CONFLICT');return false;}
  this.active=true;
  let submitted=!!saved,settled=false;
  try {
   this.change('requesting');
   this.scene.start();
   try{this.audio?.play?.('spin');}catch{ /* Audio never blocks or creates a wager. */ }
   const stillSignedIn=validatePlayer(await this.api.session());
   if(stillSignedIn.sessionId!==this.session.sessionId)fail('PLAYER_SESSION_CHANGED');
   // Re-query the existing model before creating a new request; never wager on changed rules.
   if(!saved){const now=validateModel(await this.api.model(GAME_ID));if(now.mathSha256!==model.mathSha256||now.mathVersion!==model.mathVersion||now.engineVersion!==model.engineVersion)fail('GAME_RULES_UPDATED_RELOAD');}
   if(generation!==this.generation||this.disposed)return false;
   submitted=true;
   const receipt=validateRound(await this.api.spin(stake,saved?null:model),{model,bet:stake});
   if(generation!==this.generation||this.disposed)return false;
   const pending=this.api.pending();if(!pending)fail('ROUND_TOKEN_LOST');
   if(!this.api.complete(pending))fail('ROUND_REQUEST_CHANGED');
   settled=true;
   this.lastReceipt=receipt;this.session={...this.session,balance:receipt.balance};
   this.change('revealing');
   try {
    await this.scene.reveal(receipt);
   } catch (presentationError) {
    // The accepted receipt was already settled on the existing server. A failed
    // local animation must NEVER restore a pending wager or trigger another debit.
    if(generation!==this.generation||this.disposed)return false;
    this.stopAuto();this.scene.reset();
    this.change('ready','ROUND_SETTLED_PRESENTATION_ERROR');
    return true;
   }
   if(generation!==this.generation||this.disposed)return false;
   try{this.audio?.play?.('stop');if(Number(receipt.finalWin)>0)this.audio?.play?.('win');}catch{ /* Audio cannot invalidate a settled receipt. */ }
   this.change('ready');
   const continueAuto=this.autoLeft>0&&this.visible();
   if(continueAuto){this.autoLeft--;this.notify();if(this.autoLeft>0){queueMicrotask(()=>{if(this.phase==='ready'&&this.visible()&&!this.disposed)this.spin();});}else this.stopAuto();}
   return true;
  }catch(e){
   if(generation!==this.generation||this.disposed)return false;
   if(settled){
    this.stopAuto();try{this.scene.reset();}catch{}
    this.change('ready','ROUND_SETTLED_PRESENTATION_ERROR');
    return true;
   }
   const authRejected=e.status===401||e.status===403||['MACHINE_SESSION_CHANGED','PLAYER_NOT_AUTHENTICATED'].includes(e.code);
   const rejected=authRejected||definitelyRejected(e)||['GAME_RULES_UPDATED_RELOAD','PLAYER_SESSION_CHANGED'].includes(e.code);
   // Ambiguous failure retains the *same* saved request token for CONFIRM replay.
   let pending=null;
   try{pending=this.api.pending();}catch{}
   if(rejected&&pending)this.api.complete(pending);
   this.stopAuto();try{this.scene.reset();}catch{}
   // A presentation failure or preflight error before any wager was submitted
   // has no saved token to confirm, so never strand the SPIN button on CONFIRM.
   this.change(authRejected?'error':rejected||(!submitted&&!pending)?'ready':'confirm',e.code||e.message);
   return false;
  }finally {if(generation===this.generation&&!this.disposed){this.active=false;if(this.phase==='requesting')this.change('confirm','ROUND_CONFIRM_REQUIRED');}}
 }
 stop(){this.scene.stop();this.stopAuto();}
 async retry(){if(this.phase!=='confirm')return false;return this.spin();}
 dispose(){if(this.disposed)return;this.disposed=true;this.generation++;this.stopAuto();this.audio?.pause?.();this.scene.dispose();this.api.close();}
}
