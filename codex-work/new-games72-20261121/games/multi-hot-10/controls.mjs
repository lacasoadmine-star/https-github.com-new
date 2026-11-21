/**
 * Independent Multi Hot 10 control/presentation state. No transport, RNG,
 * wallet, asset or audio implementation is supplied by this module.
 *
 * Source: this game's fresh official demo, 22 November 2026, and the retained
 * per-game controls-state-spec.json. Game-specific transitions are restricted
 * to observed/documented behavior. STOP, HOLD repetition, TURBO and X2
 * resolution are deliberately absent until their exact behavior is verified.
 *
 * The host must validate authoritative receipts before calling applyRoundView.
 * The view accepts the already-determined grid/win; it never calculates either.
 * Every command carries its original key and current round binding. Ambiguous
 * transport failure retains that command, and recovery never generates a key.
 * This unreleased component cannot authorize or send a production request.
 */
import { GAME_ID, SYMBOLS } from './evaluator.mjs';

const AMOUNT = /^(0|[1-9]\d{0,12})\.\d{2}$/;
const KEY = /^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODALS = new Set(['rules', 'settings', 'history', 'bet', 'auto']);
export const AUTO_COUNTS = Object.freeze([25, 50, 100, 500, 1000]);
const copy = value => structuredClone(value);
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const amount = value => typeof value === 'string' && AMOUNT.test(value);
const positive = value => amount(value) && BigInt(value.replace('.', '')) > 0n;
const validLevels = values => Array.isArray(values) && values.length > 0 &&
  Array.from(values).every(positive) && new Set(values).size === values.length;
const validGrid = grid => Array.isArray(grid) && grid.length === 3 &&
  Array.from(grid).every(row => Array.isArray(row) && row.length === 5 &&
    Array.from(row).every(symbol => SYMBOLS.includes(symbol)));

export class MultiHot10Controls {
  constructor({ betLevels, selectedBet, paytablePreviewLevels = betLevels,
    currency = 'ETB' } = {}) {
    if (!validLevels(betLevels) || !betLevels.includes(selectedBet) ||
      !validLevels(paytablePreviewLevels) || !paytablePreviewLevels.includes(selectedBet) ||
      !['ETB', 'DMO'].includes(currency)) throw new TypeError('Explicit verified stake and preview choices are required.');
    this._usedKeys = new Set();
    this._seenRounds = new Set();
    this._state = {
      gameId: GAME_ID, mode: 'UNRELEASED_CONTROL_COMPONENT', cashEnabled: false,
      phase: 'IDLE', currency, betLevels: [...betLevels], selectedBet,
      paytablePreviewLevels: [...paytablePreviewLevels], paytablePreviewBet: selectedBet,
      modal: null, pending: null, round: null, winVisible: false,
      hidden: false, disposed: false,
      settings: { effects: true, music: true, fullscreen: false },
      fullscreenActive: false, fullscreenRequestId: 0,
      autoOptions: { counts: [...AUTO_COUNTS], selectedCount: 100, executionEnabled: false },
    };
  }

  get snapshot() {
    const s = this._state;
    return freeze(copy({ ...s,
      // This is UI capability only; cashEnabled remains hard-false above.
      canRequestSpin: !s.disposed && !s.hidden && !s.pending && !s.modal &&
        ['IDLE', 'WIN_PENDING'].includes(s.phase),
      canRequestTake: !s.disposed && !s.hidden && !s.pending && !s.modal && s.phase === 'WIN_PENDING',
      wagerControlsDisabled: s.disposed || s.hidden || !!s.pending || s.phase === 'WIN_PENDING',
      spinLabel: s.pending?.kind === 'SPIN' ? 'STOP' : 'HOLD & SPIN',
      stopActionVerified: false,
    }));
  }

  _result(accepted, reason = null, intents = []) {
    return freeze({ accepted, reason, intents: copy(intents), state: this.snapshot });
  }
  _key(key) {
    return typeof key === 'string' && KEY.test(key) && !this._usedKeys.has(key);
  }
  _begin(kind, requestKey, extra = {}) {
    if (!this._key(requestKey)) return this._result(false, 'REQUEST_KEY_INVALID_OR_REUSED');
    const command = { kind, gameId: GAME_ID, requestKey, ...extra };
    this._usedKeys.add(requestKey);
    this._state.pending = command;
    this._state.phase = kind === 'SPIN' ? 'SPIN_PENDING' : 'TAKE_PENDING';
    return this._result(true, null, [command]);
  }

  requestSpin(requestKey) {
    if (!this.snapshot.canRequestSpin) return this._result(false, 'SPIN_UNAVAILABLE');
    // Current rules explicitly describe SPIN collecting the previous win and
    // starting the next round. Bind both actions; never emit a separate debit.
    return this._begin('SPIN', requestKey, {
      bet: this._state.selectedBet,
      collectRoundId: this._state.phase === 'WIN_PENDING' ? this._state.round.roundId : null,
    });
  }
  requestTakeWin(requestKey) {
    if (!this.snapshot.canRequestTake) return this._result(false, 'TAKE_UNAVAILABLE');
    return this._begin('TAKE_WIN', requestKey, { roundId: this._state.round.roundId });
  }

  applyRoundView(view) {
    const pending = this._state.pending;
    if (this._state.disposed || pending?.kind !== 'SPIN' ||
      !view || view.gameId !== GAME_ID || view.requestKey !== pending.requestKey ||
      view.bet !== pending.bet || typeof view.roundId !== 'string' || !KEY.test(view.roundId) ||
      this._seenRounds.has(view.roundId) ||
      !amount(view.winAmount) || !validGrid(view.grid) ||
      !Number.isInteger(view.multiplier) || view.multiplier < 1 || view.multiplier > 5) {
      return this._result(false, 'ROUND_VIEW_BINDING_MISMATCH');
    }
    // Project only the exact supplied fields; no wallet or model override can
    // be smuggled into this component through an unrecognized view property.
    this._state.round = copy({ gameId: view.gameId, requestKey: view.requestKey,
      roundId: view.roundId, bet: view.bet, winAmount: view.winAmount,
      grid: view.grid, multiplier: view.multiplier });
    this._seenRounds.add(view.roundId);
    this._state.pending = null;
    this._state.winVisible = positive(view.winAmount);
    this._state.phase = this._state.winVisible ? 'WIN_PENDING' : 'IDLE';
    return this._result(true);
  }

  applyTakeAcknowledgement(ack) {
    const pending = this._state.pending;
    if (this._state.disposed || pending?.kind !== 'TAKE_WIN' ||
      ack?.gameId !== GAME_ID || ack?.requestKey !== pending.requestKey ||
      ack?.roundId !== pending.roundId || ack?.collected !== true) {
      return this._result(false, 'TAKE_ACK_BINDING_MISMATCH');
    }
    this._state.pending = null;
    this._state.winVisible = false;
    this._state.phase = 'IDLE';
    return this._result(true);
  }

  markRequestUncertain(requestKey) {
    if (this._state.disposed || this._state.pending?.requestKey !== requestKey) {
      return this._result(false, 'NO_MATCHING_PENDING_REQUEST');
    }
    this._state.phase = 'RECOVERY_REQUIRED';
    return this._result(true);
  }
  recoveryIntent() {
    if (this._state.disposed || !this._state.pending || this._state.phase !== 'RECOVERY_REQUIRED') {
      return this._result(false, 'RECOVERY_UNAVAILABLE');
    }
    return this._result(true, null, [{ ...this._state.pending, replayOnly: true }]);
  }

  cancelUnsentSpin(requestKey) {
    // Host precondition: no POST was invoked and no pending action was saved.
    // Once uncertainty exists, only recovery may resolve that request identity.
    const pending = this._state.pending;
    if (this._state.disposed || this._state.phase !== 'SPIN_PENDING' ||
      pending?.kind !== 'SPIN' || pending.requestKey !== requestKey) {
      return this._result(false, 'UNSENT_CANCELLATION_UNAVAILABLE');
    }
    this._state.pending = null;
    this._state.phase = pending.collectRoundId && this._state.winVisible ? 'WIN_PENDING' : 'IDLE';
    return this._result(true);
  }

  restorePendingSpin(saved) {
    // Restore a host-validated persisted action for receipt-only recovery.
    // An original wager may predate the currently advertised stake ladder.
    if (this._state.disposed || this._state.pending || this._state.round ||
      this._state.phase !== 'IDLE' || saved?.gameId !== GAME_ID ||
      !this._key(saved.requestKey) || !positive(saved.bet) ||
      !(saved.collectRoundId === null || UUID.test(saved.collectRoundId ?? ''))) {
      return this._result(false, 'PENDING_RESTORE_UNAVAILABLE');
    }
    this._usedKeys.add(saved.requestKey);
    this._state.pending = { kind: 'SPIN', gameId: GAME_ID,
      requestKey: saved.requestKey, bet: saved.bet, collectRoundId: saved.collectRoundId };
    this._state.phase = 'RECOVERY_REQUIRED';
    return this._result(true); // No new wager intent is emitted.
  }

  restoreAuthoritativeRound(view, { collected = false } = {}) {
    // Bootstrap projection only; the host must first verify the retained
    // server receipt and its collection state. Never emit a credit or command.
    if (this._state.disposed || this._state.pending || this._state.round ||
      this._state.phase !== 'IDLE' || typeof collected !== 'boolean' ||
      view?.gameId !== GAME_ID || !this._key(view.requestKey) || !positive(view.bet) ||
      typeof view.roundId !== 'string' || !KEY.test(view.roundId) ||
      this._seenRounds.has(view.roundId) || !amount(view.winAmount) || !validGrid(view.grid) ||
      !Number.isInteger(view.multiplier) || view.multiplier < 1 || view.multiplier > 5) {
      return this._result(false, 'AUTHORITATIVE_RESTORE_UNAVAILABLE');
    }
    this._usedKeys.add(view.requestKey); this._seenRounds.add(view.roundId);
    this._state.round = copy({ gameId: GAME_ID, requestKey: view.requestKey,
      roundId: view.roundId, bet: view.bet, winAmount: view.winAmount,
      grid: view.grid, multiplier: view.multiplier });
    this._state.winVisible = !collected && positive(view.winAmount);
    this._state.phase = this._state.winVisible ? 'WIN_PENDING' : 'IDLE';
    return this._result(true);
  }

  restorePendingTake(saved) {
    if (this._state.disposed || this._state.pending || !this._state.round ||
      !['IDLE', 'WIN_PENDING'].includes(this._state.phase) || saved?.gameId !== GAME_ID ||
      !this._key(saved.requestKey) || saved.roundId !== this._state.round.roundId) {
      return this._result(false, 'TAKE_RESTORE_UNAVAILABLE');
    }
    this._usedKeys.add(saved.requestKey);
    this._state.pending = { kind: 'TAKE_WIN', gameId: GAME_ID,
      requestKey: saved.requestKey, roundId: saved.roundId };
    this._state.phase = 'RECOVERY_REQUIRED';
    return this._result(true);
  }

  cancelUnsentTake(requestKey) {
    if (this._state.disposed || this._state.phase !== 'TAKE_PENDING' ||
      this._state.pending?.kind !== 'TAKE_WIN' || this._state.pending.requestKey !== requestKey ||
      this._state.pending.roundId !== this._state.round?.roundId || !this._state.winVisible) {
      return this._result(false, 'UNSENT_TAKE_CANCELLATION_UNAVAILABLE');
    }
    this._state.pending = null; this._state.phase = 'WIN_PENDING';
    return this._result(true);
  }

  applyCollectionObservation(observation) {
    if (this._state.disposed || this._state.pending || !this._state.round ||
      observation?.gameId !== GAME_ID || observation.roundId !== this._state.round.roundId ||
      observation.collected !== true) return this._result(false, 'COLLECTION_OBSERVATION_MISMATCH');
    this._state.winVisible = false; this._state.phase = 'IDLE';
    return this._result(true);
  }

  applyPendingWinObservation(observation) {
    // Projection of an independently verified retained server history. This
    // never selects a gamble result, changes a balance, or emits a command.
    if (this._state.disposed || this._state.pending || !this._state.round ||
      !['IDLE', 'WIN_PENDING'].includes(this._state.phase) || observation?.gameId !== GAME_ID ||
      observation.roundId !== this._state.round.roundId || !amount(observation.winAmount)) {
      return this._result(false, 'PENDING_WIN_OBSERVATION_MISMATCH');
    }
    this._state.round.winAmount = observation.winAmount;
    this._state.winVisible = positive(observation.winAmount);
    this._state.phase = this._state.winVisible ? 'WIN_PENDING' : 'IDLE';
    return this._result(true);
  }

  openModal(name) {
    if (this._state.disposed || this._state.hidden || this._state.pending || !MODALS.has(name) ||
      (['bet', 'auto'].includes(name) && this._state.phase !== 'IDLE')) {
      return this._result(false, 'MODAL_UNAVAILABLE');
    }
    this._state.modal = name;
    if (name === 'rules') this._state.paytablePreviewBet = this._state.selectedBet;
    return this._result(true);
  }
  closeModal() {
    if (this._state.disposed || !this._state.modal) return this._result(false, 'NO_OPEN_MODAL');
    this._state.modal = null;
    return this._result(true);
  }
  selectPaytablePreview(value) {
    if (this._state.disposed || this._state.modal !== 'rules' ||
      !this._state.paytablePreviewLevels.includes(value)) return this._result(false, 'PREVIEW_UNAVAILABLE');
    this._state.paytablePreviewBet = value;
    return this._result(true);
  }
  selectBet(value) {
    if (this._state.disposed || this._state.pending || this._state.phase !== 'IDLE' ||
      this._state.modal !== 'bet' || !this._state.betLevels.includes(value)) {
      return this._result(false, 'BET_CHOICE_UNAVAILABLE');
    }
    // Fresh selection changes the actual displayed stake and closes the panel.
    // The next request captures it; changing a selection is not a wallet action.
    this._state.selectedBet = value;
    this._state.modal = null;
    return this._result(true);
  }
  selectAutoCount(value) {
    if (this._state.disposed || this._state.modal !== 'auto' || !AUTO_COUNTS.includes(value)) {
      return this._result(false, 'AUTO_CHOICE_UNAVAILABLE');
    }
    this._state.autoOptions.selectedCount = value;
    return this._result(true);
  }
  // Effects-off currently also switches music off in the official demo.
  disableEffects() {
    if (this._state.disposed || this._state.modal !== 'settings') return this._result(false, 'SETTINGS_UNAVAILABLE');
    this._state.settings.effects = false;
    this._state.settings.music = false;
    return this._result(true);
  }
  enableEffects() {
    if (this._state.disposed || this._state.modal !== 'settings') return this._result(false, 'SETTINGS_UNAVAILABLE');
    // Fresh both-off -> effects-on capture restores both effects and music.
    this._state.settings.effects = true;
    this._state.settings.music = true;
    return this._result(true);
  }
  setMusic(value) {
    if (this._state.disposed || this._state.modal !== 'settings' || typeof value !== 'boolean') {
      return this._result(false, 'SETTINGS_UNAVAILABLE');
    }
    this._state.settings.music = value;
    return this._result(true);
  }
  requestFullscreen(value) {
    if (this._state.disposed || this._state.modal !== 'settings' || typeof value !== 'boolean') {
      return this._result(false, 'SETTINGS_UNAVAILABLE');
    }
    this._state.settings.fullscreen = value;
    const requestId = ++this._state.fullscreenRequestId;
    return this._result(true, null, [{ kind: 'FULLSCREEN_REQUEST', requested: value, requestId }]);
  }
  applyFullscreenObservation({ requestId, active } = {}) {
    if (this._state.disposed || requestId !== this._state.fullscreenRequestId ||
      requestId < 1 || typeof active !== 'boolean') return this._result(false, 'FULLSCREEN_RESULT_MISMATCH');
    // A visible checked switch is not proof that browser fullscreen succeeded.
    this._state.fullscreenActive = active;
    return this._result(true);
  }

  unsupportedControl(name) {
    return this._result(false, 'CONTROL_BEHAVIOR_NOT_VERIFIED:' + String(name));
  }
  setHidden(value) {
    if (this._state.disposed || typeof value !== 'boolean') return this._result(false, 'LIFECYCLE_UNAVAILABLE');
    this._state.hidden = value;
    return this._result(true); // Pending identity survives blur/hide.
  }
  dispose() {
    if (this._state.disposed) return this._result(false, 'ALREADY_DISPOSED');
    this._state.disposed = true;
    return this._result(true); // No cancellation or reversal of accepted work.
  }
}
