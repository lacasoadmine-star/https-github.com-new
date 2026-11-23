import { GAME_ID, quoteLineCandidates } from './presentation-quote.mjs';

// Presentation state only. This module cannot generate outcomes, charge stakes or credit wins.
export const OBSERVED_BETS = Object.freeze(['0.20','0.40','0.60','0.80','1.00','2.00','3.00','4.00','5.00']);
export const AUTO_COUNTS = Object.freeze([25,50,100,500,1000]);
const clone = value => structuredClone(value);
const fail = code => { throw new Error('M20_' + code); };
const keyOK = value => typeof value === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(value);
export function moneyMinor(value, { positive = false } = {}) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,10})\.\d{2}$/.test(value)) fail('CANONICAL_AMOUNT_REQUIRED');
  const result = Number(value.replace('.', ''));
  if (!Number.isSafeInteger(result) || (positive && result <= 0)) fail('INVALID_AMOUNT');
  return result;
}
export const amount = minor => {
  if (!Number.isSafeInteger(minor) || minor < 0) fail('INVALID_MINOR_AMOUNT');
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2,'0')}`;
};

/** Shape and observed line quote validation, never a full financial or RNG validator. */
export function validatePresentation(view) {
  if (!view || view.gameId !== GAME_ID || !keyOK(view.requestKey) || !keyOK(view.roundId)) fail('PRESENTATION_IDENTITY_REQUIRED');
  const betMinor = moneyMinor(view.bet, { positive: true }), winMinor = moneyMinor(view.winAmount);
  const quote = quoteLineCandidates({ gameId: GAME_ID, gridRows: view.grid, totalBetMinor: betMinor, multiplier: view.multiplier });
  if (quote.lineQuoteSumMinor !== winMinor) fail('PRESENTATION_QUOTE_MISMATCH');
  if (view.winTier != null && view.winTier !== 'NICE_WIN') fail('UNOBSERVED_WIN_TIER');
  if (view.winTier && winMinor === 0) fail('WIN_TIER_WITHOUT_WIN');
  if (view.balance != null) moneyMinor(view.balance);
  return Object.freeze({ gameId: GAME_ID, requestKey: view.requestKey, roundId: view.roundId,
    bet: view.bet, grid: Object.freeze(view.grid.map(row => Object.freeze([...row]))), multiplier: view.multiplier,
    winAmount: view.winAmount, winTier: view.winTier ?? null, balance: view.balance ?? null,
    lines: quote.lines, referenceQuoteOnly: true, settlementValidated: false });
}

export class MultiHot20Controls {
  constructor({ bet = '0.20', roundIntentsEnabled = false, onChange = () => {} } = {}) {
    if (!OBSERVED_BETS.includes(bet)) fail('UNOBSERVED_BET');
    this.onChange = onChange; this.roundIntentsEnabled = roundIntentsEnabled === true;
    this.usedKeys = new Set(); this.seenRounds = new Map();
    this.state = { gameId: GAME_ID, phase: 'READY', bet, modal: null, rulesBet: bet,
      settings: { effects: true, music: true, fullscreen: false, quick: false },
      pending: null, round: null, balance: null, stopRequested: false,
      auto: null, financialEnabled: false, lastLocalEvent: null };
  }
  snapshot() { return clone({ ...this.state, roundIntentsEnabled: this.roundIntentsEnabled }); }
  change() { const snapshot = this.snapshot(); this.onChange(snapshot); return snapshot; }
  idle() { return ['READY','WIN_PENDING'].includes(this.state.phase) && !this.state.pending; }
  claim(key) { if (!keyOK(key)) fail('REQUEST_KEY_REQUIRED'); if (this.usedKeys.has(key)) fail('REQUEST_KEY_ALREADY_USED'); this.usedKeys.add(key); }
  setBalance(value) { moneyMinor(value); this.state.balance = value; return this.change(); }
  selectBet(value) {
    if (this.state.phase !== 'READY' || this.state.pending || this.state.auto?.active) fail('BET_LOCKED');
    if (!OBSERVED_BETS.includes(value)) fail('UNOBSERVED_BET');
    this.state.bet = value; this.state.modal = null; return this.change();
  }
  setRulesBet(value) {
    if (!OBSERVED_BETS.includes(value)) fail('UNOBSERVED_RULES_BET');
    this.state.rulesBet = value; return this.change();
  }
  openModal(modal) {
    if (!['rules','settings','bet','auto','quick'].includes(modal)) fail('UNOBSERVED_PANEL');
    if (!this.idle()) fail('PANEL_LOCKED');
    if (modal === 'bet' && this.state.phase === 'WIN_PENDING') fail('BET_LOCKED');
    this.state.modal = modal;
    if (modal === 'rules') this.state.rulesBet = this.state.bet;
    return this.change();
  }
  closeModal() { this.state.modal = null; return this.change(); }
  setSetting(name, value) {
    if (!Object.hasOwn(this.state.settings, name) || typeof value !== 'boolean') fail('INVALID_SETTING');
    // Own follow-up M20 DOM states: effects OFF -> both off; effects ON from both off -> both on.
    this.state.settings[name] = value;
    if (name === 'effects') this.state.settings.music = value;
    return this.change();
  }
  requestSpin(requestKey, { auto = false } = {}) {
    if (!this.roundIntentsEnabled) fail('ROUND_INTENTS_DISABLED');
    if (!this.idle() || this.state.modal) fail('SPIN_LOCKED');
    if (auto && (!this.state.auto?.active || this.state.auto.remaining < 1)) fail('AUTO_NOT_RUNNING');
    if (!auto && this.state.auto?.active) fail('MANUAL_SPIN_DURING_AUTO');
    this.claim(requestKey);
    const collectRoundId = this.state.phase === 'WIN_PENDING' ? this.state.round.roundId : null;
    const intent = Object.freeze({ action: 'SPIN', gameId: GAME_ID, requestKey, bet: this.state.bet, collectRoundId });
    this.state.pending = { ...intent, auto }; this.state.phase = 'WAITING_RECEIPT';
    this.state.stopRequested = false; this.state.lastLocalEvent = null; this.change(); return intent;
  }
  requestStop() {
    if (!['WAITING_RECEIPT','ANIMATING','RECOVERY_REQUIRED'].includes(this.state.phase) ||
      (this.state.pending && this.state.pending.action !== 'SPIN')) return false;
    if (this.state.stopRequested) return false;
    this.state.stopRequested = true; this.state.lastLocalEvent = 'STOP_REQUESTED'; this.change(); return true;
  }
  acceptReceipt(input) {
    const view = validatePresentation(input), serial = JSON.stringify(view);
    const pending = this.state.pending;
    // A previously accepted round cannot satisfy a later pending action.
    // Reject it before duplicate suppression so the controller retains the
    // later request key and exposes recovery instead of waiting forever.
    if (pending && (pending.action !== 'SPIN' || view.requestKey !== pending.requestKey || view.bet !== pending.bet)) fail('RECEIPT_BINDING_MISMATCH');
    if (this.seenRounds.has(view.roundId)) {
      if (this.seenRounds.get(view.roundId) !== serial) fail('CONFLICTING_ROUND_REPLAY');
      return false;
    }
    if (!pending || pending.action !== 'SPIN' || !['WAITING_RECEIPT','RECOVERY_REQUIRED'].includes(this.state.phase)) fail('UNEXPECTED_RECEIPT');
    if (view.requestKey !== pending.requestKey || view.bet !== pending.bet) fail('RECEIPT_BINDING_MISMATCH');
    this.seenRounds.set(view.roundId, serial);
    this.state.round = view; this.state.pending = null; this.state.phase = 'ANIMATING';
    if (view.balance !== null) this.state.balance = view.balance;
    if (pending.auto && this.state.auto) {
      this.state.auto.remaining--;
      this.state.auto.lastAcceptedRound = view.roundId;
    }
    this.change(); return true;
  }
  finishPresentation(roundId) {
    if (this.state.phase !== 'ANIMATING' || this.state.round?.roundId !== roundId) return false;
    this.state.phase = moneyMinor(this.state.round.winAmount) > 0 ? 'WIN_PENDING' : 'READY';
    this.state.stopRequested = false;
    const auto = this.state.auto;
    if (auto?.active) {
      const balance = this.state.balance === null ? null : moneyMinor(this.state.balance);
      const win = moneyMinor(this.state.round.winAmount);
      const stop = auto.remaining <= 0 || (auto.winLimit !== null && win >= auto.winLimit) ||
        ((auto.decreaseLimit !== null || auto.increaseLimit !== null) && this.state.round.balance === null) ||
        (balance !== null && auto.startBalance !== null &&
          ((auto.decreaseLimit !== null && auto.startBalance - balance >= auto.decreaseLimit) ||
           (auto.increaseLimit !== null && balance - auto.startBalance >= auto.increaseLimit)));
      if (stop) { auto.active = false; auto.reason = 'LIMIT_OR_COUNT'; }
    }
    this.change(); return true;
  }
  requestTake(requestKey) {
    if (!this.roundIntentsEnabled) fail('ROUND_INTENTS_DISABLED');
    if (this.state.phase !== 'WIN_PENDING' || this.state.pending || this.state.modal) fail('TAKE_LOCKED');
    this.claim(requestKey);
    const intent = Object.freeze({ action: 'TAKE', gameId: GAME_ID, requestKey, roundId: this.state.round.roundId });
    this.state.pending = intent; this.state.phase = 'TAKE_PENDING'; this.change(); return intent;
  }
  acceptTake(ack) {
    const p = this.state.pending;
    if (!p || p.action !== 'TAKE' || !['TAKE_PENDING','RECOVERY_REQUIRED'].includes(this.state.phase) ||
      ack?.gameId !== GAME_ID || ack.requestKey !== p.requestKey || ack.roundId !== p.roundId ||
      ack.collected !== true || ack.amount !== this.state.round.winAmount) fail('TAKE_ACK_MISMATCH');
    if (ack.balance != null) { moneyMinor(ack.balance); this.state.balance = ack.balance; }
    this.state.pending = null; this.state.phase = 'READY'; this.change(); return true;
  }
  uncertain(requestKey) {
    if (!this.state.pending || requestKey !== this.state.pending.requestKey) fail('PENDING_KEY_MISMATCH');
    this.state.phase = 'RECOVERY_REQUIRED'; if (this.state.auto) this.state.auto.active = false;
    this.change(); return clone(this.state.pending);
  }
  cancelUnsent(requestKey) {
    if (!this.state.pending || requestKey !== this.state.pending.requestKey || this.state.phase === 'RECOVERY_REQUIRED') fail('UNSENT_CANCELLATION_NOT_PROVED');
    const pending = this.state.pending;
    this.state.pending = null;
    this.state.phase = pending.action === 'TAKE' || pending.collectRoundId ? 'WIN_PENDING' : 'READY';
    if (this.state.auto) this.state.auto.active = false;
    this.change(); return true;
  }
  configureAuto({ count, winLimit = null, decreaseLimit = null, increaseLimit = null }) {
    if (!this.idle() || this.state.auto?.active || !AUTO_COUNTS.includes(count)) fail('AUTO_CONFIGURATION_INVALID');
    const parseLimit = value => value === null ? null : moneyMinor(value, { positive: true });
    this.state.auto = { count, remaining: count, active: false, reason: null,
      winLimit: parseLimit(winLimit), decreaseLimit: parseLimit(decreaseLimit), increaseLimit: parseLimit(increaseLimit),
      startBalance: this.state.balance === null ? null : moneyMinor(this.state.balance), lastAcceptedRound: null };
    return this.change();
  }
  startAuto() {
    if (!this.roundIntentsEnabled || !this.idle() || !this.state.auto || this.state.auto.active || this.state.auto.remaining < 1) fail('AUTO_START_UNAVAILABLE');
    const auto = this.state.auto;
    if ((auto.decreaseLimit !== null || auto.increaseLimit !== null) && this.state.balance === null) fail('AUTO_BALANCE_REQUIRED');
    // The baseline belongs to the actual start, not an earlier visit to the dialog.
    auto.startBalance = this.state.balance === null ? null : moneyMinor(this.state.balance);
    this.state.auto.active = true; this.state.modal = null; return this.change();
  }
  stopAuto() {
    if (!this.state.auto?.active) return false;
    this.state.auto.active = false; this.state.auto.reason = 'LOCAL_STOP'; this.change(); return true;
  }
  disconnect() {
    if (this.state.auto) { this.state.auto.active = false; this.state.auto.reason = 'DISCONNECTED'; }
    if (this.state.pending) this.state.phase = 'RECOVERY_REQUIRED';
    return this.change();
  }
}
