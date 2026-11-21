// Multi Hot 20: original dedicated client-side round controller.
// It does NOT create a wallet, game RNG, payout calculator, API, or fake bonus.
// Bind to the existing authenticated ZPLAY session adapter and its authoritative receipts.
export const GAME_ID="fresh_multihot20";
export const GAME_SPEC=Object.freeze({
 title:"Multi Hot 20",id:GAME_ID,reels:5,rows:3,fixedPaylines:20,
 multiplierValues:Object.freeze([1,2,3,4,5]),feature:"fixedPaylines20",
 minETB:'1.00',maxETB:'40000.00',
 referenceOnly:true,productionLaunchable:false
});
const fail=(code)=>{const error=new Error(code);error.code=code;throw error;};
const money=s=>{if(typeof s!=='string'||!/^(0|[1-9]\d{0,12})\.\d{2}$/.test(s))fail('INVALID_ETB_AMOUNT');return BigInt(s.replace('.',''));};
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const mathKeys=['mathVersion','engineVersion','mathSha256'];
const isPlayerSessionError=error=>error?.status===401||['LOGIN_REQUIRED','PLAYER_LOGIN_REQUIRED',
 'PLAYER_SESSION_CHANGED','SESSION_CHANGED','SESSION_CHANGED_AFTER_ROUND'].includes(error?.code);
export function validateSavedRound(action,guard){
 if(!action||action.gameId!==GAME_ID||action.sessionGuard!==guard||
    !/^[a-f0-9]{64}$/i.test(guard||'')||!UUID.test(action.roundToken||''))fail('SAVED_ROUND_BELONGS_TO_ANOTHER_SESSION');
 const stake=money(action.bet);
 if(stake<money(GAME_SPEC.minETB)||stake>money(GAME_SPEC.maxETB)||stake%BigInt(GAME_SPEC.fixedPaylines)!==0n)
  fail('SAVED_ROUND_STAKE_MISMATCH');
 if(typeof action.mathVersion!=='string'||!action.mathVersion||
    typeof action.engineVersion!=='string'||!action.engineVersion||
    !/^[a-f0-9]{64}$/i.test(action.mathSha256||''))fail('SAVED_ROUND_MATH_INVALID');
 return action;
}
export function validateModel(game){
 if(!game||game.id!==GAME_ID||game.reels!==GAME_SPEC.reels||
    game.rows!==GAME_SPEC.rows||game.paylines!==GAME_SPEC.fixedPaylines)fail('GAME_MODEL_MISMATCH');
 if(!Array.isArray(game.betLevels)||!game.betLevels.length||new Set(game.betLevels).size!==game.betLevels.length)fail('BET_LEVELS_MISSING');
 if(typeof game.mathVersion!=='string'||!game.mathVersion||typeof game.engineVersion!=='string'||!game.engineVersion||
    !/^[a-f0-9]{64}$/i.test(game.mathSha256||''))fail('UNVERIFIED_GAME_MATH');
 if(!Array.isArray(game.symbols)||!game.symbols.length||
    game.symbols.some(v=>typeof v!=='string'||!v))fail('UNVERIFIED_SYMBOL_SET');
 for(const amount of game.betLevels)if(money(amount)<money(GAME_SPEC.minETB)||money(amount)>money(GAME_SPEC.maxETB))fail('BET_OUTSIDE_EXISTING_WORKER_LIMIT');
 return game;
}
export function validateReceipt(receipt,model,stake){
 validateModel(model);
 if(!receipt||receipt.gameId!==GAME_ID||receipt.bet!==stake||receipt.currency!=='ETB'||
    !UUID.test(receipt.roundId||'')||typeof receipt.isFree!=='boolean')fail('RECEIPT_IDENTITY_MISMATCH');
 for(const key of ['mathVersion','engineVersion','mathSha256'])if(receipt[key]!==model[key])fail('RECEIPT_MATH_CHANGED');
 if(!Array.isArray(receipt.grid)||receipt.grid.length!==GAME_SPEC.rows||
    receipt.grid.some(row=>!Array.isArray(row)||row.length!==GAME_SPEC.reels||
      row.some(symbol=>!model.symbols.includes(symbol))))fail('RECEIPT_GRID_INVALID');
 if(!GAME_SPEC.multiplierValues.includes(receipt.wheelMultiplier))fail('MULTIPLIER_NOT_AUTHORIZED');
 if(!Array.isArray(receipt.winLines)||receipt.winLines.some(line=>!Array.isArray(line.positions)||
    line.positions.some(pos=>{const y=Array.isArray(pos)?pos[0]:pos?.row,x=Array.isArray(pos)?pos[1]:pos?.col;
      return !Number.isInteger(y)||!Number.isInteger(x)||y<0||y>=GAME_SPEC.rows||x<0||x>=GAME_SPEC.reels;
    })))fail('PAYLINE_RECEIPT_INVALID');
 // Twenty fixed paylines are authoritative on the server; client only checks their indices.
 if(receipt.winLines.length>GAME_SPEC.fixedPaylines)fail('TOO_MANY_PAYLINES');
 const w=receipt.walletReceipt;
 if(!w||w.currency!=='ETB'||money(w.chargedStake)!==(receipt.isFree?0n:money(stake))||
    money(w.balanceBefore)-money(w.chargedStake)+money(w.finalWin)!==money(w.balanceAfter)||
    money(w.finalWin)!==money(receipt.finalWin))fail('INVALID_AUTHORITATIVE_SETTLEMENT');
 return receipt;
}
export function validateReplayedReceipt(receipt,currentModel,action,guard){
 validateSavedRound(action,guard);
 validateModel(currentModel);
 // Replaying a paid round does not authorize another wager. Keep the full
 // grid, paylines, currency and wallet checks, but bind math/stake to the
 // original persisted request instead of a newly revised/filtered model.
 return validateReceipt(receipt,{...currentModel,betLevels:[action.bet],
  ...Object.fromEntries(mathKeys.map(key=>[key,action[key]]))},action.bet);
}
// Receipt verification only: the existing server alone selects a card and moves funds.
export function validateGambleReceipt(receipt,action){
 if(!receipt||!action||receipt.kind!=='GAMBLE'||receipt.gameId!==GAME_ID||
    receipt.currency!=='ETB'||!UUID.test(receipt.actionId||'')||!UUID.test(receipt.roundId||'')||!UUID.test(receipt.roundToken||'')||
    receipt.roundId!==action.roundId||receipt.roundToken!==action.roundToken||
    receipt.choice!==action.choice||receipt.attempt!==action.expectedAttempt||
    receipt.stake!==action.expectedStake||!['RED','BLACK'].includes(receipt.color)||
    typeof receipt.won!=='boolean'||receipt.won!==(receipt.color===receipt.choice))fail('GAMBLE_RECEIPT_IDENTITY_MISMATCH');
 for(const key of ['mathVersion','engineVersion','mathSha256'])if(receipt[key]!==action[key])fail('GAMBLE_RECEIPT_MATH_CHANGED');
 const stake=money(receipt.stake),payout=money(receipt.payout),wallet=receipt.walletReceipt;
 if(payout!==(receipt.won?stake*2n:0n)||!wallet||wallet.currency!=='ETB'||
    money(wallet.chargedStake)!==stake||money(wallet.finalWin)!==payout||
    money(wallet.balanceBefore)-stake+payout!==money(wallet.balanceAfter)||
    receipt.balanceAfter!==wallet.balanceAfter)fail('INVALID_GAMBLE_SETTLEMENT');
 if(!Number.isSafeInteger(receipt.maxAttempts)||receipt.maxAttempts<receipt.attempt||
    stake<=0n||stake>money(receipt.maxStake))fail('INVALID_GAMBLE_LIMITS');
 return receipt;
}
export function isDefinitiveGambleRejection(error){
 if(error?.code==='INVALID_SERVER_RESPONSE')return false;
 if([400,402,422].includes(error?.status))return true;
 if(error?.status===404&&error?.code==='ROUND_NOT_FOUND')return true;
 return error?.status===409&&['GAMBLE_STATE_CHANGED','GAMBLE_LIMIT','GAMBLE_STAKE_LIMIT',
  'NO_GAMBLE_WINNINGS','GAMBLE_EXPIRED','GAME_RULES_UPDATED_RELOAD'].includes(error?.code);
}
const emptyAuto=()=>({armed:0,started:false,limits:{winLimit:null,lossLimit:null,balanceIncreaseLimit:null},balanceAtStart:null,stopReason:null});
export class GameController {
 constructor({session,scene,onChange=()=>{},visible=()=>true}){
  if(!session||typeof session.spin!=='function'||!scene)fail('EXISTING_PLAYER_SESSION_REQUIRED');
  this.session=session;this.scene=scene;this.onChange=onChange;this.visible=visible;
  this.phase='disconnected';this.generation=0;this.pending=false;this.lastReceipt=null;
  this.auto=emptyAuto();this.musicOptedIn=false;this.turbo=false;this.bet=GAME_SPEC.minETB;this.error=null;
  this.lastAction=null;this.takenRoundId=null;
 }
 gambleState(){
  const round=this.account?.round,gamble=round?.gamble;
  if(!gamble||round.result?.gameId!==GAME_ID||!UUID.test(round.result?.roundId||''))return null;
  const closed=this.takenRoundId===round.result.roundId;
  // A later same-game round can arrive in the ledger refresh while this tab
  // still displays its earlier result. Keep the latest balance, but never
  // gamble the unseen parent until reconnect restores that exact receipt.
  const changed=!!this.lastReceipt&&this.lastReceipt.roundId!==round.result.roundId;
  return {...gamble,roundId:round.result.roundId,available:gamble.available===true&&!closed&&!changed,
   ...(changed?{reason:'ROUND_CHANGED'}:closed?{reason:'WIN_TAKEN'}:{}),lastResult:this.lastAction?.roundId===round.result.roundId?this.lastAction:gamble.lastResult??null};
 }
 status(){return{phase:this.phase,bet:this.bet,pending:this.pending,
  auto:{...this.auto,limits:{...this.auto.limits}},lastReceipt:this.lastReceipt,error:this.error,
  gamble:this.gambleState(),lastAction:this.lastAction,
  actionPending:!!this.session.pendingAction,actionKind:this.session.pendingAction?'GAMBLE':this.unresolved()?'SPIN':null};}
 notify(){try{this.onChange(this.status())}catch{/* UI never changes settlement. */}}
 change(phase,error=null){this.phase=phase;this.error=error;this.notify();}
 disconnectExpiredSession(error){
  if(!isPlayerSessionError(error))return false;
  // An expired/replaced login cannot own the displayed balance or controls.
  // Session.logout preserves pending storage for the original Player to recover.
  this.logout(error?.code||'LOGIN_REQUIRED');return true;
 }
 unresolved(){try{const p=this.session.pending;return !!(typeof p==='function'?p.call(this.session):p)||!!this.session.pendingAction}catch{return true}}
 canWager(account=this.account){
  // The existing Player engine/session has the final say after a round.
  // Do not re-enable SPIN when another game owns the account, the house
  // cannot accept bets, or fresh-state explicitly returned UNAVAILABLE.
  return !!(account?.game?.enabled&&account.game.freshReleaseReady&&
   !account.blockedByActiveGame&&account.game.wagerAvailability!=='house_capacity'&&
   (typeof this.session.phase!=='string'||this.session.phase==='READY'));
 }
 acceptAccount(account){
  this.account=account;
  if(!account.game.betLevels.includes(this.bet)){
   this.bet=account.game.betLevels.includes(GAME_SPEC.minETB)?GAME_SPEC.minETB:account.game.betLevels[0];
   this.stopAuto('BET_LEVEL_CHANGED');
  }
 }
 connect(account){
  if(!account?.authenticated||account.currency!=='ETB'||!account.sessionGuard)fail('LOGIN_REQUIRED');
  validateModel(account.game);
  this.account=account;this.generation++;
  this.pending=false;this.lastReceipt=null;this.lastAction=null;this.takenRoundId=null;
  this.bet=account.game.betLevels.includes(GAME_SPEC.minETB)?GAME_SPEC.minETB:account.game.betLevels[0];
  const saved=typeof this.session.pending==='function'?this.session.pending():this.session.pending;
  if(saved?.sessionGuard===account.sessionGuard){validateSavedRound(saved,account.sessionGuard);this.bet=saved.bet;}
  this.auto=emptyAuto();
  try{this.scene.reset?.()}catch{ /* A stale canvas cannot block auth. */ }
  this.change(this.unresolved()?'confirm':this.canWager(account)?'ready':'unavailable');
  return this.phase==='ready';
 }
 setBet(amount){if(this.pending||this.phase!=='ready'||!this.account.game.betLevels.includes(amount))return false;this.bet=amount;this.notify();return true;}
 previewPaytable(){return this.account?.game?.paytable??null;} // Must never alter stake or debit.
 armAuto(count,options={}){
  if(this.pending||this.phase!=='ready'||!Number.isInteger(count)||count<1||count>1000||
     !options||typeof options!=='object'||Array.isArray(options))return false;
  const limits={winLimit:null,lossLimit:null,balanceIncreaseLimit:null};
  try{
   if(Object.keys(options).some(key=>!Object.hasOwn(limits,key)))return false;
   for(const key of Object.keys(limits))if(options[key]!==undefined&&options[key]!==null){
    if(money(options[key])<=0n)return false;limits[key]=options[key];
   }
   if(Object.values(limits).some(Boolean))money(this.account?.balance);
  }catch{return false}
  this.auto={...emptyAuto(),armed:count,limits};this.notify();return true;
 }
 stopAuto(reason='USER_STOP'){this.auto={...this.auto,armed:0,started:false,stopReason:reason};this.notify();}
 setTurbo(enabled){this.turbo=enabled===true;this.notify();return this.turbo;}
 async startPlay(){
  if(this.auto.armed<1||this.auto.started||this.phase!=='ready'||this.pending||!this.visible())return false;
  this.auto.started=true;this.auto.balanceAtStart=this.account?.balance??null;this.auto.stopReason=null;
  return this.spin();
 }
 autoLimitReached(receipt){
  const {limits,balanceAtStart}=this.auto;
  if(limits.winLimit&&money(receipt.finalWin)>=money(limits.winLimit))return 'WIN_LIMIT';
  if(balanceAtStart!==null){
   const current=money(this.account?.balance??receipt.walletReceipt.balanceAfter),start=money(balanceAtStart);
   if(limits.lossLimit&&start-current>=money(limits.lossLimit))return 'LOSS_LIMIT';
   if(limits.balanceIncreaseLimit&&current-start>=money(limits.balanceIncreaseLimit))return 'BALANCE_INCREASE_LIMIT';
  }
  return null;
 }
 stop(){try{this.scene.speedUp?.()}catch{}return this.phase==='spinning';} // STOP alters animation only.
 async spin(){
  if(this.pending||this.phase!=='ready'||!this.visible()||!this.account)return false;
  if(this.unresolved()){this.change('confirm','PENDING_ROUND_REQUIRES_RECONCILIATION');return false;}
  if(!this.account.game.betLevels.includes(this.bet)){this.stopAuto('BET_LEVEL_CHANGED');this.change('ready','BET_NO_LONGER_AVAILABLE');return false;}
  const generation=this.generation,stake=this.bet;
  this.pending=true;
  let submitted=false;
  try{
   this.change('spinning');
   this.scene.start?.(); // Any error here is pre-submit and creates no wager.
   if(this.turbo)this.scene.speedUp?.(); // Speed affects visuals, NEVER server settlement.
   submitted=true;
   const raw=await this.session.spin(stake); // Existing session owns idempotency and wallet receipt.
   if(generation!==this.generation)return false;
   const receipt=validateReceipt(raw,this.account.game,stake);
   this.lastReceipt=receipt;this.lastAction=null;this.takenRoundId=null;
   let renderFailed=false;
   try{await this.scene.settle?.(receipt);}catch{renderFailed=true;this.stopAuto();}
   if(generation!==this.generation)return false;
   // A real ZPLAY session stays SHOWING_RESULT until finish() re-reads its
   // authenticated ledger. No second wager may start before reconciliation.
   if(typeof this.session.finish==='function'){
    try{
     const refreshed=await this.session.finish();
     if(generation!==this.generation)return false;
     if(!refreshed?.authenticated||refreshed.currency!=='ETB'||
        refreshed.sessionGuard!==this.account.sessionGuard||refreshed.game?.id!==GAME_ID)
       fail('SESSION_CHANGED_AFTER_ROUND');
     validateModel(refreshed.game);
     this.acceptAccount(refreshed);
    }catch(error){
     if(generation!==this.generation)return false;
     if(this.disconnectExpiredSession(error))return true;
     this.stopAuto();this.change('confirm',error?.code||'ROUND_SETTLED_REFRESH_REQUIRED');
     return true; // Actual round may have paid; do NOT submit a new wager.
    }
   }
   if(generation!==this.generation)return false;
   if(!this.canWager()){this.stopAuto();this.change('unavailable','PLAYER_WAGER_NOT_AVAILABLE');return true;}
   this.change('ready',renderFailed?'ROUND_SETTLED_RENDER_ERROR':null);
   if(renderFailed)return true;
   if(this.auto.started&&this.auto.armed>0){
    this.auto.armed--;
    const limit=this.autoLimitReached(receipt);
    if(limit)this.stopAuto(limit);
    else if(this.auto.armed>0&&this.visible())queueMicrotask(()=>{
     if(generation===this.generation&&this.phase==='ready'&&!this.pending&&this.auto.started&&this.auto.armed>0&&this.visible())void this.spin();
    });
    else this.stopAuto(this.auto.armed===0?'COUNT_COMPLETED':'HIDDEN');
   }
   return true;
  }catch(error){
   if(generation!==this.generation)return false;
   if(this.disconnectExpiredSession(error))return false;
   this.stopAuto();
   try{this.scene.reset?.()}catch{}
   // An ambiguous transport response needs reconciliation, not a new wager.
   const rejected=[400,402,422].includes(error?.status)||['INSUFFICIENT_FUNDS','INVALID_BET','GAME_LOCKED'].includes(error?.code);
   const unresolved=this.unresolved()||submitted&&!rejected;
   this.change(error?.code==='SESSION_CHANGED'?'disconnected':unresolved?'confirm':'ready',error?.code||error?.message||'ROUND_UNAVAILABLE');
   return false;
  }finally{if(generation===this.generation){this.pending=false;this.notify()}}
 }
 async gamble(choice){
  const gamble=this.gambleState();
  if(this.pending||this.phase!=='ready'||!this.visible()||this.unresolved()||
     !gamble?.available||!['RED','BLACK'].includes(choice)||typeof this.session.gamble!=='function')return false;
  const generation=this.generation,guard=this.account.sessionGuard;
  const expected={gameId:GAME_ID,roundId:gamble.roundId,choice,expectedAttempt:gamble.attempt+1,
   expectedStake:gamble.stake,...Object.fromEntries(['mathVersion','engineVersion','mathSha256'].map(key=>[key,this.account.game[key]]))};
  this.stopAuto('GAMBLE');this.pending=true;this.change('gambling');
  let submitted=false;
  try{
   submitted=true;
   const raw=await this.session.gamble(choice);
   if(generation!==this.generation||this.account?.sessionGuard!==guard)return false;
   // The Session checked its privately persisted token; this checks the visible
   // parent's original stake, attempt, colour and authoritative settlement too.
   this.lastAction=validateGambleReceipt(raw,{...expected,roundToken:raw?.roundToken});
   const account=await this.session.finish();
   if(generation!==this.generation||this.account?.sessionGuard!==guard)return false;
   if(!account?.authenticated||account.sessionGuard!==guard||account.currency!=='ETB'||account.game?.id!==GAME_ID)fail('SESSION_CHANGED');
   validateModel(account.game);this.acceptAccount(account);
   this.change(this.canWager(account)?'ready':'unavailable');return true;
  }catch(error){
   if(generation!==this.generation)return false;
   if(this.disconnectExpiredSession(error))return false;
   this.change(error?.code==='SESSION_CHANGED'?'disconnected':
    this.unresolved()||submitted&&!isDefinitiveGambleRejection(error)?'confirm':'ready',error?.code||error?.message||'GAMBLE_UNAVAILABLE');
   return false;
  }finally{if(generation===this.generation){this.pending=false;this.notify()}}
 }
 async takeWin(){
  const roundId=this.account?.round?.result?.roundId;
  if(this.pending||!['ready','unavailable'].includes(this.phase)||!this.visible()||this.unresolved()||
     !UUID.test(roundId||'')||typeof this.session.takeWin!=='function')return false;
  const generation=this.generation,guard=this.account.sessionGuard;
  // TAKE WIN closes this local choice immediately: its money is already
  // settled. A failed balance GET must not reopen X2 after reconciliation.
  this.takenRoundId=roundId;
  this.stopAuto('WIN_TAKEN');this.pending=true;this.change('collecting');
  try{
   // Already settled by SPIN/X2. This is only a GET of the existing account.
   const account=await this.session.takeWin();
   if(generation!==this.generation||this.account?.sessionGuard!==guard)return false;
   if(!account?.authenticated||account.sessionGuard!==guard||account.currency!=='ETB'||account.game?.id!==GAME_ID)fail('SESSION_CHANGED');
   validateModel(account.game);this.acceptAccount(account);this.takenRoundId=roundId;
   this.change(this.canWager(account)?'ready':'unavailable');return true;
  }catch(error){
   if(generation===this.generation&&!this.disconnectExpiredSession(error))this.change('confirm',error?.code||'LEDGER_REFRESH_REQUIRED');
   return false;
  }finally{if(generation===this.generation){this.pending=false;this.notify()}}
 }
 async reconcile(){
  if(this.pending||this.phase!=='confirm'||!this.account||!this.visible())return false;
  const generation=this.generation,guard=this.account.sessionGuard;
  this.pending=true;this.stopAuto();
  try{
   // The existing session owns the persisted roundToken. Replay-only cannot
   // submit a new bet or change the amount. Never invent a wallet receipt.
   if(this.session.pendingAction){
    const action={...this.session.pendingAction};
    if(typeof this.session.recoverAction!=='function')fail('ACTION_REPLAY_NOT_SUPPORTED');
    const response=await this.session.recoverAction();
    if(generation!==this.generation||this.account?.sessionGuard!==guard)return false;
    this.lastAction=validateGambleReceipt(response,action);
   }else if(this.unresolved()){
    if(typeof this.session.recover!=='function')fail('REPLAY_ONLY_NOT_SUPPORTED');
    const saved=typeof this.session.pending==='function'?this.session.pending():this.session.pending;
    const action={...validateSavedRound(saved,guard)};
    const response=await this.session.recover();
    if(generation!==this.generation||this.account?.sessionGuard!==guard)return false;
    const receipt=validateReplayedReceipt(response,this.account.game,action,guard);
    this.lastReceipt=receipt;this.lastAction=null;this.takenRoundId=null;
    try{this.scene.start?.();await this.scene.settle?.(receipt)}catch{
     // The transaction is settled even when a canvas fails to render it.
     this.error='ROUND_SETTLED_RENDER_ERROR';
    }
   }
   const refresh=typeof this.session.refresh==='function'?this.session.refresh:this.session.finish;
   if(typeof refresh!=='function')fail('LEDGER_REFRESH_REQUIRED');
   const account=await refresh.call(this.session);
   if(generation!==this.generation||this.account?.sessionGuard!==guard)return false;
   if(account?.sessionGuard!==guard||account.currency!=='ETB'||account.game?.id!==GAME_ID)fail('SESSION_CHANGED');
   validateModel(account.game);
   this.acceptAccount(account);
   if(!this.canWager(account)){this.change('unavailable','PLAYER_WAGER_NOT_AVAILABLE');return true;}
   this.change('ready',this.error==='ROUND_SETTLED_RENDER_ERROR'?this.error:null);
   return true;
  }catch(error){
   if(generation===this.generation&&!this.disconnectExpiredSession(error))this.change('confirm',error?.code||error?.message||'RECONCILIATION_REQUIRED');
   return false;
  }finally{if(generation===this.generation){this.pending=false;this.notify()}}
 }
 onHidden(){try{this.scene.pauseAudio?.()}catch{};this.stopAuto('HIDDEN');}
 onVisible(){if(this.musicOptedIn&&this.visible())try{this.scene.resumeOptedInMusic?.()}catch{}}
 logout(error=null){this.generation++;this.account=null;this.pending=false;this.lastReceipt=null;this.lastAction=null;this.takenRoundId=null;this.bet=GAME_SPEC.minETB;this.auto=emptyAuto();this.musicOptedIn=false;try{this.session.logout?.();this.scene.pauseAudio?.();this.scene.reset?.()}catch{}this.change('disconnected',error)}
}
