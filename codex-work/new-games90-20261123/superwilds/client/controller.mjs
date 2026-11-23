export const GAME_ID = 'zplay72_multi_hot_5_super_wilds_v1';
export const AUTO_COUNTS = Object.freeze([25,50,100,500,1000]);
const KEY = /^[A-Za-z0-9_-]{16,128}$/;
const SHA = /^[a-f0-9]{64}$/i;
const clone = value => structuredClone(value);
const fail = code => { throw new Error('SUPERWILDS_' + code); };
const minor = (value, positive=false) => {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) fail('AMOUNT_INVALID');
  return value;
};
export const formatMoney = value => value === null ? '—' : `${Math.floor(minor(value)/100).toLocaleString('en-US')}.${String(value%100).padStart(2,'0')}`;
export function validateReceipt(value, intent) {
  if (!value || value.gameId !== GAME_ID || value.currency !== 'ETB' || !KEY.test(value.roundId ?? '') ||
      value.requestKey !== intent.requestKey || value.betMinor !== intent.betMinor ||
      !Array.isArray(value.grid) || value.grid.length !== 5 || value.grid.some(c=>!Array.isArray(c)||c.length!==3||c.some(s=>typeof s!=='string'||!s)) ||
      !Number.isInteger(value.multiplier) || value.multiplier < 1 || value.multiplier > 5) fail('RECEIPT_BINDING');
  minor(value.betMinor,true); minor(value.winMinor); minor(value.balanceMinor);
  return clone(value);
}
export const rendererReceipt=value=>clone({roundId:value.roundId,grid:value.grid,multiplier:value.multiplier,
  winningLines:value.winningLines??[],winMinor:value.winMinor,betMinor:value.betMinor});
const baseView=value=>{const result=clone(value);for(const key of ['pendingWinMinor','winPending','gamble','acceptedAction','action'])delete result[key];return result;};
const positiveInteger=value=>Number.isSafeInteger(value)&&value>0;
function gambleEvent(value,roundId){
  if(!value||value.gameId!==GAME_ID||value.roundId!==roundId||!KEY.test(value.requestKey??'')||
    !['RED','BLACK'].includes(value.choice)||!['RED','BLACK'].includes(value.color)||typeof value.won!=='boolean'||
    !positiveInteger(value.attempt)||typeof value.gambleVersion!=='string'||!value.gambleVersion||!SHA.test(value.gambleSha256??''))fail('GAMBLE_RECEIPT');
  minor(value.pendingWinBeforeMinor,true);minor(value.pendingWinAfterMinor);
  return clone(value);
}
export function validateGambleDescriptor(value,roundId){
  if(value===null||value===undefined)return null;
  if(typeof value.available!=='boolean'||!Number.isSafeInteger(value.attempt)||value.attempt<0||
    !positiveInteger(value.nextAttempt)||!Array.isArray(value.history)||value.roundId!==roundId)fail('GAMBLE_STATE');
  minor(value.pendingWinMinor);if(value.targetWinMinor!==null)minor(value.targetWinMinor,true);
  if(value.available&&(!positiveInteger(value.pendingWinMinor)||!positiveInteger(value.targetWinMinor)||
    typeof value.version!=='string'||!value.version||!SHA.test(value.sha256??'')))fail('GAMBLE_STATE');
  const history=value.history.map(item=>gambleEvent(item,roundId));
  if(history.some((item,index)=>item.attempt!==index+1)||history.length!==value.attempt||value.nextAttempt!==value.attempt+1)fail('GAMBLE_HISTORY');
  return clone({...value,history});
}

/** Receipts and balances are accepted only from the injected authenticated host.
 * The action journal contains only a request identity/payload, never money state.
 */
export class SuperWildsController {
  constructor({transport,subject,journalStorage=null,keyFactory=()=>crypto.randomUUID(),onChange=()=>{},onError=()=>{},
      renderer=null,now=()=>performance.now(),receiptValidator=validateReceipt}={}) {
    if (!transport || typeof transport.state!=='function' || typeof transport.dispatch!=='function' || typeof transport.recover!=='function') fail('HOST_TRANSPORT_REQUIRED');
    if (typeof subject!=='string' || !/^[A-Za-z0-9_-]{1,128}$/.test(subject)) fail('AUTH_SUBJECT_REQUIRED');
    this.transport=transport;this.subject=subject;this.storage=journalStorage;this.keyFactory=keyFactory;this.onChange=onChange;this.onError=onError;
    this.renderer=renderer;this.now=now;this.receiptValidator=receiptValidator;this.seen=new Map();this.busy=null;this.disposed=false;
    this.storageKey=`zplay:superwilds:action:${subject}`;
    this.data={gameId:GAME_ID,phase:'DISCONNECTED',connected:false,canPlay:false,canDouble:false,betMinor:null,balanceMinor:null,
      betLevels:[],round:null,pending:null,pendingWinMinor:0,gamble:null,lastGamble:null,feedback:null,auto:null,history:[],error:null};
    try { const saved=JSON.parse(this.storage?.getItem(this.storageKey)??'null');
      if(saved?.subject===subject && saved?.intent?.gameId===GAME_ID && KEY.test(saved.intent.requestKey??'') &&
          ['SPIN','TAKE','DOUBLE'].includes(saved.intent.action)) this.data.pending=clone(saved.intent);
    } catch { /* Unreadable storage never manufactures a round or balance. */ }
  }
  snapshot(){return clone(this.data);}
  changed(){if(!this.disposed)this.onChange(this.snapshot());}
  journal(intent){
    // Storage failure occurs before sending. A request cannot be sent without a recoverable identity.
    if(this.storage)this.storage.setItem(this.storageKey,JSON.stringify({subject:this.subject,intent}));
  }
  clearJournal(){try{this.storage?.removeItem(this.storageKey);}catch{/* A retained key is safely replayed, never recharged. */}}
  async connect(){
    if(this.disposed)return false;
    const s=await this.transport.state();
    if(this.disposed)return false;
    if(s?.gameId!==GAME_ID||s.currency!=='ETB'||s.subject!==this.subject)fail('SESSION_BINDING');
    const ladder=s.betLevelsMinor??s.betLevels;
    if(!Array.isArray(ladder)||ladder.some(n=>!Number.isSafeInteger(n)||n<=0)||new Set(ladder).size!==ladder.length||s.canPlay===true&&!ladder.length)fail('HOST_BET_LADDER');
    const bet=s.betMinor??(ladder.includes(this.data.betMinor)?this.data.betMinor:ladder[0]??null);
    minor(s.balanceMinor);if(bet!==null){minor(bet,true);if(!ladder.includes(bet))fail('HOST_BET_INVALID');}
    this.data.connected=true;this.data.canPlay=s.canPlay===true;this.data.canDouble=s.canDouble===true;
    this.data.betLevels=[...ladder];this.data.betMinor=bet;this.data.balanceMinor=s.balanceMinor;
    if(s.round){const receipt=validateReceipt(s.round,{requestKey:s.round.requestKey,betMinor:s.round.betMinor});this.data.round=baseView(receipt);}
    const pendingWin=s.pendingWinMinor??s.round?.pendingWinMinor??(s.round?.winPending===true?s.round.winMinor:0);minor(pendingWin);
    if(pendingWin>0&&!s.round)fail('PENDING_WIN_BINDING');this.data.pendingWinMinor=pendingWin;
    this.setGamble(s.gamble??null);this.data.lastGamble=this.data.gamble?.history.at(-1)??null;
    this.data.phase=this.data.pending?'RECOVERY':pendingWin>0?'WIN_PENDING':'READY';
    this.data.error=null;this.changed();return true;
  }
  setGamble(value){
    this.data.gamble=validateGambleDescriptor(value,this.data.round?.roundId??null);
    this.data.canDouble=this.data.gamble?.available===true&&this.data.gamble.pendingWinMinor===this.data.pendingWinMinor;
  }
  selectBet(value){
    if(this.data.phase!=='READY'||this.data.pending||this.data.auto?.active)fail('BET_LOCKED');
    if(!this.data.betLevels.includes(value))fail('HOST_BET_LADDER');
    this.data.betMinor=value;this.changed();
  }
  newKey(){const key=this.keyFactory();if(!KEY.test(key??'')||this.seen.has(key))fail('REQUEST_KEY_INVALID');return key;}
  async spin({auto=false}={}){
    if(this.disposed)return false;
    if(['WAITING','ANIMATING','RECOVERY'].includes(this.data.phase)&&(!this.data.pending||this.data.pending.action==='SPIN')){
      this.renderer?.stop(this.now());return false;
    }
    if(!this.data.connected||!this.data.canPlay||this.busy||this.data.pending||!['READY','WIN_PENDING'].includes(this.data.phase))return false;
    if(this.data.auto?.active&&!auto)return false;
    if(auto&&(!this.data.auto?.active||this.data.auto.remaining<1))return false;
    const action={gameId:GAME_ID,action:'SPIN',requestKey:this.newKey(),betMinor:this.data.betMinor,
      collectRoundId:this.data.phase==='WIN_PENDING'?this.data.round.roundId:null};
    const intent=this.transport.prepare?this.transport.prepare(action):action;
    this.journal(intent);this.data.pending=intent;this.data.phase='WAITING';this.data.error=null;
    this.renderer?.start({requestKey:intent.requestKey,quick:this.quick===true,at:this.now()});this.changed();
    return this.send(intent,false,auto);
  }
  async take(){
    if(this.disposed||!this.data.connected||this.busy||this.data.phase!=='WIN_PENDING'||this.data.pending)return false;
    this.stopAuto('TAKE');
    const action={gameId:GAME_ID,action:'TAKE',requestKey:this.newKey(),betMinor:this.data.round.betMinor,roundId:this.data.round.roundId};
    const intent=this.transport.prepare?this.transport.prepare(action):action;
    this.journal(intent);this.data.pending=intent;this.data.phase='TAKING';this.changed();return this.send(intent);
  }
  async double(choice){
    if(!['RED','BLACK'].includes(choice))fail('GAMBLE_CHOICE');
    if(this.disposed||!this.data.connected||this.busy||!this.data.canDouble||this.data.phase!=='WIN_PENDING'||this.data.pending)return false;
    this.stopAuto('DOUBLE');
    const action={gameId:GAME_ID,action:'DOUBLE',requestKey:this.newKey(),betMinor:this.data.round.betMinor,roundId:this.data.round.roundId,choice,
      expectedPendingWinMinor:this.data.pendingWinMinor,expectedAttempt:this.data.gamble.nextAttempt,
      gambleVersion:this.data.gamble.version,gambleSha256:this.data.gamble.sha256};
    const intent=this.transport.prepare?this.transport.prepare(action):action;
    this.journal(intent);this.data.pending=intent;this.data.phase='DOUBLE_PENDING';this.changed();return this.send(intent);
  }
  async send(intent,recovery=false,auto=false){
    if(this.busy)return this.busy;
    const run=async()=>{
      try{
        const receipt=await this.transport[recovery?'recover':'dispatch'](clone(intent));
        if(this.disposed)return false;
        if(!this.data.pending||this.data.pending.requestKey!==intent.requestKey)fail('PENDING_OWNER_CHANGED');
        if(receipt?.gameId!==GAME_ID||receipt.requestKey!==intent.requestKey||receipt.currency!=='ETB')fail('ACTION_BINDING');
        const encoded=JSON.stringify(receipt),old=this.seen.get(intent.requestKey);
        if(old&&old!==encoded)fail('CONFLICTING_RECEIPT');
        minor(receipt.balanceMinor);
        if(intent.action==='SPIN'){
          const view=this.receiptValidator(receipt,intent);this.data.round=baseView(view);
          const pendingWin=view.pendingWinMinor??view.winMinor;minor(pendingWin);this.data.pendingWinMinor=pendingWin;this.data.lastGamble=null;
          this.setGamble(receipt.gamble??null);
          this.renderer?.acceptReceipt(rendererReceipt(view),this.now());this.data.phase='ANIMATING';
          if(auto&&this.data.auto)this.data.auto.remaining--;
        }else if(intent.action==='TAKE'){
          if(receipt.roundId!==intent.roundId||receipt.collected!==true)fail('TAKE_ACK');minor(receipt.amountMinor,true);
          // The server collects its current locked pending award. Another tab
          // may have gambled since this UI read it; the immutable collection
          // receipt, not the original base-game award, is the amount authority.
          this.data.pendingWinMinor=0;this.setGamble(receipt.gamble??null);this.data.phase='READY';
        }else{
          const accepted=gambleEvent(receipt,intent.roundId);
          if(accepted.choice!==intent.choice||accepted.attempt!==intent.expectedAttempt||
            accepted.pendingWinBeforeMinor!==intent.expectedPendingWinMinor||accepted.gambleVersion!==intent.gambleVersion||
            accepted.gambleSha256!==intent.gambleSha256)fail('DOUBLE_ACK');
          this.data.pendingWinMinor=receipt.pendingWinMinor??accepted.pendingWinAfterMinor;minor(this.data.pendingWinMinor);this.data.lastGamble=accepted;
          this.setGamble(receipt.gamble??null);this.data.phase=this.data.pendingWinMinor>0?'WIN_PENDING':'READY';
        }
        this.seen.set(intent.requestKey,encoded);this.data.history.unshift({action:intent.action,roundId:receipt.roundId,betMinor:intent.betMinor,
          winMinor:intent.action==='DOUBLE'?receipt.pendingWinAfterMinor:receipt.winMinor??receipt.amountMinor??0});
        if(!old&&!recovery&&['DOUBLE','TAKE'].includes(intent.action))this.data.feedback={action:intent.action,requestKey:intent.requestKey,won:receipt.won??null};
        this.data.history=this.data.history.slice(0,100);this.data.balanceMinor=receipt.balanceMinor;this.data.pending=null;this.data.error=null;this.clearJournal();this.changed();return true;
      }catch(error){
        if(!this.disposed){this.data.phase='RECOVERY';this.data.error=String(error?.message??error);this.stopAuto('CONNECTION');this.onError(error);this.changed();}return false;
      }finally{this.busy=null;this.changed();}
    };
    this.busy=Promise.resolve().then(run);return this.busy;
  }
  recover(){
    if(this.disposed||this.busy||!this.data.pending)return Promise.resolve(false);
    const intent=clone(this.data.pending);this.data.phase='RECOVERY';this.changed();return this.send(intent,true,false);
  }
  finishPresentation(roundId){
    if(this.data.phase!=='ANIMATING'||this.data.round?.roundId!==roundId)return false;
    this.data.phase=this.data.pendingWinMinor>0?'WIN_PENDING':'READY';
    const a=this.data.auto;
    if(a?.active){const delta=this.data.balanceMinor-a.startBalanceMinor;
      if(a.remaining<=0||(a.winLimit!==null&&this.data.round.winMinor>=a.winLimit)||
        (a.decreaseLimit!==null&&-delta>=a.decreaseLimit)||(a.increaseLimit!==null&&delta>=a.increaseLimit))this.stopAuto('LIMIT');}
    this.changed();return true;
  }
  configureAuto({count=100,winLimit=null,decreaseLimit=null,increaseLimit=null}={}){
    if(!AUTO_COUNTS.includes(count)||!['READY','WIN_PENDING'].includes(this.data.phase)||this.data.pending||this.data.auto?.active)fail('AUTO_CONFIGURATION');
    for(const n of [winLimit,decreaseLimit,increaseLimit])if(n!==null)minor(n,true);
    this.data.auto={active:false,count,remaining:count,winLimit,decreaseLimit,increaseLimit,startBalanceMinor:this.data.balanceMinor,reason:null};this.changed();
  }
  startAuto(){
    if(!this.data.auto||this.data.auto.active||this.data.auto.remaining<1||!this.data.canPlay||!this.data.connected||this.data.pending||!['READY','WIN_PENDING'].includes(this.data.phase))return false;
    minor(this.data.balanceMinor);this.data.auto.startBalanceMinor=this.data.balanceMinor;
    this.data.auto.active=true;this.changed();return true;
  }
  stopAuto(reason='USER'){if(!this.data.auto?.active)return false;this.data.auto.active=false;this.data.auto.reason=reason;this.changed();return true;}
  disconnect(reason='DISCONNECTED'){
    this.stopAuto(reason);this.data.connected=false;
    if(this.data.pending)this.data.phase='RECOVERY';else if(this.data.phase!=='ANIMATING')this.data.phase='DISCONNECTED';this.changed();
  }
  dispose(){this.stopAuto('DISPOSED');this.disposed=true;}
}
