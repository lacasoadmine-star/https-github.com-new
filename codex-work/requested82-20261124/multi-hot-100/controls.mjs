/** Input/presentation state for the newly observed Multi Hot 100. No transport or outcome generator. */
import { M100_SYMBOL_FRAMES } from '../../continue71-20261122/multi-hot-100-component/render/atlas.mjs';

export const MULTI_HOT_100_GAME_ID = 'zplay72_multi_hot_100_v1';
export const M100_OBSERVED_BET_CHOICES = Object.freeze(["1.00","2.00","3.00","4.00","5.00","6.00","7.00","8.00","10.00","15.00","20.00","25.00","30.00","40.00","50.00","60.00","70.00","80.00","100.00"]);
export const M100_OBSERVED_AUTO_COUNTS = Object.freeze([25,50,100,500,1000]);
const symbols = new Set(Object.keys(M100_SYMBOL_FRAMES));
const keyOK = s => typeof s === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(s);
const roundOK = s => typeof s === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(s);
const moneyOK = s => typeof s === 'string' && /^(0|[1-9][0-9]{0,11})\.[0-9]{2}$/.test(s);
const frozen = x => { if (x && typeof x === 'object') { Object.values(x).forEach(frozen); Object.freeze(x); } return x; };
const copy = x => structuredClone(x);
const reject = reason => frozen({ accepted:false, reason, intents:[] });

export function validateM100RoundView(view, expected = {}) {
  if (!view || view.gameId !== MULTI_HOT_100_GAME_ID || !keyOK(view.requestKey) || !roundOK(view.roundId)) throw new TypeError('M100_RECEIPT_IDENTITY');
  for (const field of ['gameId','requestKey','bet','roundId']) if (expected[field] !== undefined && view[field] !== expected[field]) throw new TypeError(`M100_RECEIPT_${field.toUpperCase()}_MISMATCH`);
  const currency=view.currency??'DMO';
  if(!['DMO','ETB'].includes(currency)||(expected.currency!==undefined&&expected.currency!==currency))throw new TypeError('M100_RECEIPT_CURRENCY');
  if (!moneyOK(view.bet) || BigInt(view.bet.replace('.','')) < 100n || BigInt(view.bet.replace('.','')) > (currency==='ETB'?4000000n:10000n) || !moneyOK(view.winAmount)) throw new TypeError('M100_RECEIPT_AMOUNT');
  if (view.balance !== undefined && !moneyOK(view.balance)) throw new TypeError('M100_RECEIPT_BALANCE');
  if (!Array.isArray(view.grid) || view.grid.length !== 4 || Array.from(view.grid).some(row => !Array.isArray(row) || row.length !== 5 || Array.from(row).some(symbol => !symbols.has(symbol)))) throw new TypeError('M100_RECEIPT_GRID');
  if (!Number.isInteger(view.multiplier) || view.multiplier < 1 || view.multiplier > 5) throw new TypeError('M100_RECEIPT_MULTIPLIER');
  // Fresh original line artwork establishes all100 unique paths, including45/46.
  if (view.winningLines !== undefined && (!Array.isArray(view.winningLines) || new Set(view.winningLines).size !== view.winningLines.length || Array.from(view.winningLines).some(n => !Number.isInteger(n) || n < 1 || n > 100))) throw new TypeError('M100_UNVERIFIED_WINNING_LINE');
  if (view.winTier !== undefined && view.winTier !== null && !['NICE WIN','SUPER WIN'].includes(view.winTier)) throw new TypeError('M100_UNOBSERVED_WIN_TIER');
  return frozen(copy({ gameId:view.gameId, requestKey:view.requestKey, roundId:view.roundId, bet:view.bet, winAmount:view.winAmount, grid:view.grid, multiplier:view.multiplier,
    ...(view.currency===undefined?{}:{currency}),
    ...(view.balance === undefined ? {} : {balance:view.balance}), ...(view.winningLines === undefined ? {} : {winningLines:view.winningLines}), ...(view.winTier === undefined ? {} : {winTier:view.winTier}) }));
}

export class MultiHot100Controls {
  #state; #used = new Set(); #collected = new Set(); #rounds=new Map(); #collections=new Map(); #gambles=new Map();
  constructor({betLevels = M100_OBSERVED_BET_CHOICES, selectedBet = '1.00', currency = 'DMO',hostPolicy=null} = {}) {
    if (!['DMO','ETB'].includes(currency) || !Array.isArray(betLevels) || !betLevels.length || new Set(betLevels).size !== betLevels.length || !betLevels.includes(selectedBet)) throw new TypeError('M100_REFERENCE_BET_CHOICES');
    if(currency==='DMO'&&(hostPolicy!==null||betLevels.some(b=>!M100_OBSERVED_BET_CHOICES.includes(b))))throw new TypeError('M100_REFERENCE_BET_CHOICES');
    // This policy comes from the authenticated existing-host adapter. It cannot
    // authorize funds: that host still validates every wager in its transaction.
    if(currency==='ETB'&&(!hostPolicy||hostPolicy.gameId!==MULTI_HOT_100_GAME_ID||hostPolicy.backendGameId!=='multihot100_native'||
      hostPolicy.currency!=='ETB'||hostPolicy.serverAuthoritative!==true||!moneyOK(hostPolicy.balance)||
      !['mathVersion','engineVersion'].every(k=>typeof hostPolicy[k]==='string'&&hostPolicy[k].length>0&&hostPolicy[k].length<=160)||
      !/^[a-f0-9]{64}$/.test(hostPolicy.mathSha256||'')||JSON.stringify(hostPolicy.betLevels)!==JSON.stringify(betLevels)||
      betLevels.some(b=>!moneyOK(b)||BigInt(b.replace('.',''))<100n||BigInt(b.replace('.',''))>4000000n)))throw new TypeError('M100_EXISTING_HOST_POLICY');
    this.#state = {gameId:MULTI_HOT_100_GAME_ID,currency,betLevels:[...betLevels],selectedBet,phase:'IDLE',pending:null,round:null,pendingWin:null,balance:currency==='ETB'?hostPolicy.balance:null,gamble:null,modal:null,stopRequested:false,
      paytablePreviewBet:selectedBet, settings:{soundEffects:true,music:true,quick:false,fullscreenRequested:false}, auto:{running:false,configuration:null}, cashEnabled:currency==='ETB',audibleVerified:false};
  }
  snapshot() { return frozen(copy(this.#state)); }
  restoreHostRound(view) {
    const s=this.#state;
    // Boot restoration is an authenticated GET projection. A pending journal
    // must be resolved by the existing host before constructing this fresh UI.
    if(s.currency!=='ETB'||s.pending||s.round||s.phase!=='IDLE'||this.#used.size||
      view?.readOnlyRestoration!==true||typeof view.collected!=='boolean')throw new Error('M100_READ_ONLY_RESTORE_UNAVAILABLE');
    const accepted=validateM100RoundView(view,{currency:'ETB'});
    if(!s.betLevels.includes(accepted.bet)||accepted.balance!==s.balance)throw new Error('M100_READ_ONLY_RESTORE_POLICY');
    this.#rounds.set(accepted.roundId,accepted);this.#used.add(accepted.requestKey);
    if(view.collected)this.#collected.add(accepted.roundId);
    s.round=accepted;s.pendingWin=view.collected?'0.00':accepted.winAmount;s.selectedBet=accepted.bet;s.paytablePreviewBet=accepted.bet;
    s.phase=s.pendingWin==='0.00'?'IDLE':'WIN_PENDING';return accepted;
  }
  #begin(key, kind, details) {
    if (!keyOK(key) || this.#used.has(key)) return reject('INVALID_OR_REUSED_KEY');
    this.#used.add(key);
    const intent=frozen({kind,gameId:MULTI_HOT_100_GAME_ID,requestKey:key,...(this.#state.currency==='ETB'?{currency:'ETB'}:{}),...details});
    this.#state.pending=intent; this.#state.phase=`${kind}_PENDING`;this.#state.stopRequested=false;
    return frozen({accepted:true,intents:[intent]});
  }
  requestSpin(key) {
    const s=this.#state;
    if (s.pending || s.modal || !['IDLE','WIN_PENDING'].includes(s.phase)) return reject('INPUT_LOCKED');
    return this.#begin(key,'SPIN',{bet:s.selectedBet,collectRoundId:s.phase==='WIN_PENDING'?s.round.roundId:null});
  }
  applyRoundView(view) {
    const s=this.#state;
    const normalized=validateM100RoundView(view);
    if(s.pending && normalized.requestKey!==s.pending.requestKey) throw new Error('M100_STALE_RECEIPT');
    if(this.#rounds.has(normalized.roundId)){
      if(JSON.stringify(this.#rounds.get(normalized.roundId))!==JSON.stringify(normalized))throw new Error('M100_ROUND_ID_REUSE');
      return false;
    }
    if (!s.pending || s.pending.kind!=='SPIN' || !['SPIN_PENDING','RECOVERY_REQUIRED'].includes(s.phase)) throw new Error('M100_NO_PENDING_SPIN');
    const accepted=validateM100RoundView(normalized,s.pending);
    if (s.pending.collectRoundId) this.#collected.add(s.pending.collectRoundId);
    this.#rounds.set(accepted.roundId,accepted);
    s.round=accepted;s.pendingWin=accepted.winAmount;s.balance=accepted.balance??s.balance;s.gamble=null;s.pending=null;s.phase='PRESENTING';return accepted;
  }
  finishPresentation(roundId) {
    const s=this.#state;if(s.phase!=='PRESENTING'||s.round?.roundId!==roundId) return false;
    s.phase=s.round.winAmount==='0.00'?'IDLE':'WIN_PENDING';s.stopRequested=false;return true;
  }
  requestStop() {
    const s=this.#state;if(!['SPIN_PENDING','PRESENTING'].includes(s.phase)) return reject('NO_PRESENTATION_TO_STOP');
    if(s.stopRequested)return reject('STOP_ALREADY_REQUESTED');
    s.stopRequested=true;return frozen({accepted:true,intents:[],presentationOnly:true,requiresAcceptedReceipt:true,timingVerified:false});
  }
  requestTakeWin(key) {
    const s=this.#state;if(s.pending||s.phase!=='WIN_PENDING'||!s.round||this.#collected.has(s.round.roundId)) return reject('NO_PENDING_WIN');
    s.modal=null;return this.#begin(key,'TAKE_WIN',{roundId:s.round.roundId});
  }
  applyTakeAcknowledgement(ack) {
    const s=this.#state, p=s.pending;
    if(p?.kind==='TAKE_WIN' && (ack?.gameId!==MULTI_HOT_100_GAME_ID || ack.requestKey!==p.requestKey || ack.roundId!==p.roundId)) throw new Error('M100_STALE_COLLECTION_ACK');
    if(this.#collections.has(ack?.requestKey)){
      if(JSON.stringify(this.#collections.get(ack.requestKey))!==JSON.stringify(ack))throw new Error('M100_COLLECTION_REPLAY_MISMATCH');return false;
    }
    if(!p||p.kind!=='TAKE_WIN'||ack?.gameId!==MULTI_HOT_100_GAME_ID||ack.requestKey!==p.requestKey||ack.roundId!==p.roundId||ack.collected!==true||ack.collectedAmount!==s.pendingWin||(ack.balance!==undefined&&!moneyOK(ack.balance))) throw new Error('M100_COLLECTION_ACK_MISMATCH');
    this.#collections.set(ack.requestKey,frozen(copy(ack)));this.#collected.add(ack.roundId);s.pendingWin='0.00';s.balance=ack.balance??s.balance;s.pending=null;s.phase='IDLE';s.modal=null;return true;
  }
  requestGamble(key, choice) {
    const s=this.#state;if(s.pending||s.phase!=='WIN_PENDING'||s.modal!=='double'||!['red','black'].includes(choice))return reject('GAMBLE_UNAVAILABLE');
    return this.#begin(key,'GAMBLE',{roundId:s.round.roundId,choice});
  }
  applyGambleView(view) {
    const s=this.#state,p=s.pending;
    const suits=['Ace_Diamonds','Ace_Hearts','Ace_Spades','Ace_Clubs'];
    if(p?.kind==='GAMBLE' && (view?.gameId!==MULTI_HOT_100_GAME_ID || view.requestKey!==p.requestKey || view.roundId!==p.roundId || view.choice!==p.choice)) throw new Error('M100_STALE_GAMBLE_ACK');
    if(this.#gambles.has(view?.requestKey)){
      if(JSON.stringify(this.#gambles.get(view.requestKey))!==JSON.stringify(view))throw new Error('M100_GAMBLE_REPLAY_MISMATCH');return false;
    }
    if(!p||p.kind!=='GAMBLE'||view?.gameId!==MULTI_HOT_100_GAME_ID||view.requestKey!==p.requestKey||view.roundId!==p.roundId||view.choice!==p.choice||!suits.includes(view.card)||!moneyOK(view.winAmount)||typeof view.correct!=='boolean')throw new Error('M100_GAMBLE_ACK_MISMATCH');
    const red=['Ace_Diamonds','Ace_Hearts'].includes(view.card);
    const won=(view.choice==='red')===red;
    // Verify the own documented 2x/zero presentation contract; no random draw or wallet credit.
    const expectedMinor=won?BigInt(s.pendingWin.replace('.',''))*2n:0n;
    if(view.correct!==won||BigInt(view.winAmount.replace('.',''))!==expectedMinor)throw new Error('M100_GAMBLE_RULE_MISMATCH');
    this.#gambles.set(view.requestKey,frozen(copy(view)));s.pendingWin=view.winAmount;s.gamble=frozen(copy(view));s.pending=null;s.phase=view.winAmount==='0.00'?'IDLE':'WIN_PENDING';if(s.phase==='IDLE')s.modal=null;return true;
  }
  markRequestUncertain(key) { const s=this.#state;if(!s.pending||s.pending.requestKey!==key)return false;s.phase='RECOVERY_REQUIRED';return true; }
  recoveryIntent() { return this.#state.phase==='RECOVERY_REQUIRED'?frozen({...copy(this.#state.pending),replayOnly:true}):null; }
  cancelUnsent(key) { const s=this.#state;if(!s.pending||s.pending.requestKey!==key||s.phase==='RECOVERY_REQUIRED')return false;s.pending=null;s.phase=s.round&&s.pendingWin!=='0.00'&&!this.#collected.has(s.round.roundId)?'WIN_PENDING':'IDLE';return true; }
  openModal(name) {
    const s=this.#state;if(s.pending||s.phase==='PRESENTING'||!['menu','settings','rules','bet','auto','quick','double'].includes(name))return false;
    if(['bet','auto','quick'].includes(name)&&s.phase!=='IDLE')return false;
    if(name==='double'&&s.phase!=='WIN_PENDING')return false;
    s.modal=name;return true;
  }
  closeModal(){if(this.#state.pending)return false;this.#state.modal=null;return true;}
  selectBet(bet){const s=this.#state;if(s.pending||s.phase!=='IDLE'||!s.betLevels.includes(bet))return false;s.selectedBet=bet;s.modal=null;return true;}
  selectPaytablePreview(bet){const s=this.#state;if(!s.betLevels.includes(bet))return false;s.paytablePreviewBet=bet;return true;}
  setSetting(name,value){if(!['soundEffects','music','quick','fullscreenRequested'].includes(name)||typeof value!=='boolean')return false;if(name==='quick'&&(this.#state.pending||this.#state.phase!=='IDLE'))return false;this.#state.settings[name]=value;return true;}
  configureAuto(configuration){
    const s=this.#state;if(s.pending||s.phase!=='IDLE'||!configuration||!M100_OBSERVED_AUTO_COUNTS.includes(configuration.maximumRounds))return false;
    for(const name of ['winAtLeast','balanceDecrease','balanceIncrease'])if(configuration[name]!==null&&configuration[name]!==undefined&&(!moneyOK(configuration[name])||configuration[name]==='0.00'))return false;
    s.auto.configuration=frozen({maximumRounds:configuration.maximumRounds,winAtLeast:configuration.winAtLeast??null,balanceDecrease:configuration.balanceDecrease??null,balanceIncrease:configuration.balanceIncrease??null});return true;
  }
  requestAutoStart(){const s=this.#state;if(s.phase!=='IDLE'||s.pending||s.auto.running||!['auto',null].includes(s.modal)||!s.auto.configuration)return reject('AUTO_UNAVAILABLE');s.auto.running=true;s.modal=null;return frozen({accepted:true,intents:[],hostScheduleRequested:copy(s.auto.configuration)});}
  stopAuto(){this.#state.auto.running=false;return true;}
}
