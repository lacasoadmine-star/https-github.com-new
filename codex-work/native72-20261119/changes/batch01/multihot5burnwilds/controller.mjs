// Multi Hot 5 Burn Wilds: original dedicated client-side round controller.
// It does NOT create a wallet, game RNG, payout calculator, API, or fake bonus.
// Bind to the existing authenticated ZPLAY session adapter and its authoritative receipts.
export const GAME_ID="fresh_multihot5burnwilds";
export const GAME_SPEC=Object.freeze({
 title:"Multi Hot 5 Burn Wilds",id:GAME_ID,reels:5,rows:3,fixedPaylines:5,
 multiplierValues:Object.freeze([1,2,3,4,5]),feature:"expandingBurnWilds",
 minETB:'1.00',maxETB:'40000.00',
 referenceOnly:true,productionLaunchable:false
});
const fail=(code)=>{const error=new Error(code);error.code=code;throw error;};
const money=s=>{if(typeof s!=='string'||!/^(0|[1-9]\d{0,12})\.\d{2}$/.test(s))fail('INVALID_ETB_AMOUNT');return BigInt(s.replace('.',''));};
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
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
 // Only the server may identify expanding Wild columns; never infer wins from animation.
 const burns=receipt.features?.expandedWildReels??[];
 if(!Array.isArray(burns)||burns.some(i=>!Number.isInteger(i)||i<1||i>3)||
    new Set(burns).size!==burns.length)fail('BURN_WILD_REEL_INVALID');
 const w=receipt.walletReceipt;
 if(!w||w.currency!=='ETB'||money(w.chargedStake)!==(receipt.isFree?0n:money(stake))||
    money(w.balanceBefore)-money(w.chargedStake)+money(w.finalWin)!==money(w.balanceAfter)||
    money(w.finalWin)!==money(receipt.finalWin))fail('INVALID_AUTHORITATIVE_SETTLEMENT');
 return receipt;
}
export class GameController {
 constructor({session,scene,onChange=()=>{},visible=()=>true}){
  if(!session||typeof session.spin!=='function'||!scene)fail('EXISTING_PLAYER_SESSION_REQUIRED');
  this.session=session;this.scene=scene;this.onChange=onChange;this.visible=visible;
  this.phase='disconnected';this.generation=0;this.pending=false;this.lastReceipt=null;
  this.auto={armed:0,started:false};this.musicOptedIn=false;this.bet=GAME_SPEC.minETB;this.error=null;
 }
 status(){return{phase:this.phase,bet:this.bet,pending:this.pending,auto:{...this.auto},lastReceipt:this.lastReceipt,error:this.error};}
 notify(){try{this.onChange(this.status())}catch{/* UI never changes settlement. */}}
 change(phase,error=null){this.phase=phase;this.error=error;this.notify();}
 connect(account){
  if(!account?.authenticated||account.currency!=='ETB'||!account.sessionGuard)fail('LOGIN_REQUIRED');
  validateModel(account.game);
  this.account=account;this.generation++;
  this.auto={armed:0,started:false};
  this.change(account.game.enabled&&account.game.freshReleaseReady?'ready':'unavailable');
  return this.phase==='ready';
 }
 setBet(amount){if(this.pending||this.phase!=='ready'||!this.account.game.betLevels.includes(amount))return false;this.bet=amount;this.notify();return true;}
 previewPaytable(){return this.account?.game?.paytable??null;} // Must never alter stake or debit.
 armAuto(count){if(this.phase!=='ready'||!Number.isInteger(count)||count<1||count>1000)return false;this.auto={armed:count,started:false};this.notify();return true;}
 stopAuto(){this.auto={armed:0,started:false};this.notify();}
 async startPlay(){if(this.auto.armed<1||this.auto.started)return false;this.auto.started=true;return this.spin();}
 stop(){try{this.scene.speedUp?.()}catch{}return this.phase==='spinning';} // STOP alters animation only.
 async spin(){
  if(this.pending||this.phase!=='ready'||!this.visible()||!this.account)return false;
  const generation=this.generation,stake=this.bet;
  this.pending=true;
  let submitted=false;
  try{
   this.change('spinning');
   this.scene.start?.(); // Any error here is pre-submit and creates no wager.
   submitted=true;
   const raw=await this.session.spin(stake); // Existing session owns idempotency and wallet receipt.
   if(generation!==this.generation)return false;
   const receipt=validateReceipt(raw,this.account.game,stake);
   this.lastReceipt=receipt;
   try{await this.scene.settle?.(receipt);}catch{this.stopAuto();this.change('ready','ROUND_SETTLED_RENDER_ERROR');return true;}
   if(generation!==this.generation)return false;
   this.change('ready');
   if(this.auto.started&&this.auto.armed>0){
    this.auto.armed--;
    if(this.auto.armed>0&&this.visible())queueMicrotask(()=>{if(generation===this.generation&&this.phase==='ready')void this.spin()});
    else this.stopAuto();
   }
   return true;
  }catch(error){
   if(generation!==this.generation)return false;
   this.stopAuto();
   try{this.scene.reset?.()}catch{}
   // An ambiguous transport response needs reconciliation, not a new wager.
   const rejected=[400,402,422].includes(error?.status)||['INSUFFICIENT_FUNDS','INVALID_BET','GAME_LOCKED'].includes(error?.code);
   const unresolved=!!this.session.pending||submitted&&!rejected;
   this.change(error?.code==='SESSION_CHANGED'?'disconnected':unresolved?'confirm':'ready',error?.code||error?.message||'ROUND_UNAVAILABLE');
   return false;
  }finally{if(generation===this.generation){this.pending=false;this.notify()}}
 }
 onHidden(){try{this.scene.pauseAudio?.()}catch{};this.stopAuto();}
 onVisible(){if(this.musicOptedIn&&this.visible())try{this.scene.resumeOptedInMusic?.()}catch{}}
 logout(){this.generation++;this.account=null;this.pending=false;this.auto={armed:0,started:false};this.musicOptedIn=false;try{this.scene.pauseAudio?.();this.scene.reset?.()}catch{}this.change('disconnected')}
}
