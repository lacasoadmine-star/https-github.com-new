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
 return model;
}
export function validateRound(receipt,{model,bet}) {
 req(receipt?.gameId===GAME_ID,'WRONG_GAME_RECEIPT');
 req(typeof receipt.roundId==='string' && receipt.roundId.length>0,'ROUND_ID_MISSING');
 req(receipt.mathVersion===model.mathVersion && receipt.mathSha256===model.mathSha256 && receipt.engineVersion===model.engineVersion,'RULES_VERSION_MISMATCH');
 req(receipt.bet===bet && cents(receipt.finalWin) && cents(receipt.balance),'ROUND_ACCOUNTING_INVALID');
 req(Array.isArray(receipt.grid) && receipt.grid.length===4 && receipt.grid.every(row=>Array.isArray(row) && row.length===5),'MH40_GRID_INVALID');
 req(receipt.grid.every(row=>row.every(v=>typeof v==='string'||Number.isInteger(v))),'MH40_SYMBOL_INVALID');
 req(Number.isInteger(receipt.wheelMultiplier) && receipt.wheelMultiplier>=1 && receipt.wheelMultiplier<=5,'MH40_MULTIPLIER_INVALID');
 return receipt;
}
export class MultiHot40Live {
 constructor({api=new WalletAdapter(),scene,clock=()=>Date.now(),onState=()=>{}}={}) {
  req(scene && ['start','stop','reveal','reset','pause','resume','dispose'].every(k=>typeof scene[k]==='function'),'MH40_SCENE_REQUIRED');
  this.api=api;this.scene=scene;this.clock=clock;this.onState=onState;this.generation=0;this.session=null;this.model=null;this.stake=null;this.phase='loading';this.autoArmed=0;this.autoLeft=0;this.active=false;this.hidden=false;this.focused=true;this.disposed=false;this.lastReceipt=null;this.error=null;this.audio=null;
 }
 snapshot(){return {phase:this.phase,stake:this.stake,balance:this.session?.balance??null,autoArmed:this.autoArmed,autoLeft:this.autoLeft,lastReceipt:this.lastReceipt,error:this.error};}
 change(phase,error=null){this.phase=phase;this.error=error;this.onState(this.snapshot());}
 async boot(){
  const generation=++this.generation;this.active=false;this.autoLeft=0;this.change('loading');
  try {
   const session=validatePlayer(await this.api.session());
   if(generation!==this.generation||this.disposed)return false;
   const model=validateModel(await this.api.model(GAME_ID));
   if(generation!==this.generation||this.disposed)return false;
   this.api.bind(session.sessionId,GAME_ID);this.session=session;this.model=model;
   this.stake=model.betLevels.includes(this.stake)?this.stake:model.betLevels[0];
   const pending=this.api.pending();this.scene.reset();
   this.change(pending?'confirm':'ready');return true;
  }catch(e){if(generation!==this.generation||this.disposed)return false;this.change('error',e.code||e.message);return false;}
 }
 bet(value){if(this.phase!=='ready'||this.autoLeft||this.autoArmed)return false;if(!this.model?.betLevels.includes(value))return false;this.stake=value;this.onState(this.snapshot());return true;}
 armAuto(count){if(this.phase!=='ready'||!Number.isInteger(count)||count<1||count>100)return false;this.autoArmed=count;this.onState(this.snapshot());return true;}
 // Selecting AUTO never executes a spin. Only this explicit START PLAY entry does.
 async startPlay(){if(!this.autoArmed||this.phase!=='ready')return false;this.autoLeft=this.autoArmed;this.autoArmed=0;return this.spin();}
 stopAuto(){this.autoArmed=0;this.autoLeft=0;this.onState(this.snapshot());}
 visible(){return !this.disposed&&!this.hidden&&this.focused;}
 visibility(hidden){this.hidden=!!hidden;this.syncLifecycle();}
 focus(focused){this.focused=!!focused;this.syncLifecycle();}
 syncLifecycle(){if(this.visible()){this.scene.resume();this.audio?.resume?.();}else{this.stopAuto();this.scene.pause();this.audio?.pause?.();}}
 async spin(){
  if(this.disposed||!this.visible()||!['ready','confirm'].includes(this.phase)||this.active)return false;
  const generation=this.generation,model=this.model,stake=this.stake,saved=this.api.pending();
  if(!model||!stake)return false;
  if(saved&&saved.bet!==stake){this.change('confirm','SAVED_BET_CONFLICT');return false;}
  this.active=true;this.change('requesting');this.scene.start();
  try {
   const stillSignedIn=validatePlayer(await this.api.session());
   if(stillSignedIn.sessionId!==this.session.sessionId)fail('PLAYER_SESSION_CHANGED');
   // Re-query the existing model before creating a new request; never wager on changed rules.
   if(!saved){const now=validateModel(await this.api.model(GAME_ID));if(now.mathSha256!==model.mathSha256||now.mathVersion!==model.mathVersion||now.engineVersion!==model.engineVersion)fail('GAME_RULES_UPDATED_RELOAD');}
   if(generation!==this.generation||this.disposed)return false;
   const receipt=validateRound(await this.api.spin(stake,saved?null:model),{model,bet:stake});
   if(generation!==this.generation||this.disposed)return false;
   const pending=this.api.pending();if(!pending)fail('ROUND_TOKEN_LOST');
   this.api.complete(pending);
   this.lastReceipt=receipt;this.session={...this.session,balance:receipt.balance};
   this.change('revealing');await this.scene.reveal(receipt);
   if(generation!==this.generation||this.disposed)return false;
   this.change('ready');
   const continueAuto=this.autoLeft>0&&this.visible();
   if(continueAuto){this.autoLeft--;this.onState(this.snapshot());if(this.autoLeft>0){queueMicrotask(()=>{if(this.phase==='ready'&&this.visible()&&!this.disposed)this.spin();});}else this.stopAuto();}
   return true;
  }catch(e){
   if(generation!==this.generation||this.disposed)return false;
   const rejected=definitelyRejected(e)||['GAME_RULES_UPDATED_RELOAD','PLAYER_SESSION_CHANGED'].includes(e.code);
   // Ambiguous failure retains the *same* saved request token for CONFIRM replay.
   if(rejected){const pending=this.api.pending();if(pending)this.api.complete(pending);}
   this.stopAuto();this.scene.reset();
   this.change(rejected?'ready':'confirm',e.code||e.message);
   return false;
  }finally {if(generation===this.generation&&!this.disposed){this.active=false;if(this.phase==='requesting')this.change('confirm','ROUND_CONFIRM_REQUIRED');}}
 }
 stop(){this.scene.stop();this.stopAuto();}
 async retry(){if(this.phase!=='confirm')return false;return this.spin();}
 dispose(){if(this.disposed)return;this.disposed=true;this.generation++;this.stopAuto();this.audio?.pause?.();this.scene.dispose();this.api.close();}
}
