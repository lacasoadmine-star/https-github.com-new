import { OBSERVED_TARGETS_BPS, evaluateObservedRollXPayout } from './evaluator.mjs';
import { freezeCopy, parseAmount, validateRollXReceipt } from './receipt.mjs';

export const AUTO_COUNTS = Object.freeze([10, 50, 100, 500, 1000]);
const noop = () => {};
const silentAudio = { unlock: async () => {}, emit: noop, setMuted: noop, setHidden: noop, dispose: noop };
const noAnimation = { presentReceipt: async () => {}, finishPresentation: noop, dispose: noop };
const supportedWager = (bet, targetBps) => {
  try {
    evaluateObservedRollXPayout({ betMinor: parseAmount(bet), targetBps, outcome: 'empty' });
    return true;
  } catch { return false; }
};

export class RollXController {
  constructor({ session, renderer = noAnimation, audio = silentAudio,
    onState = noop,
    schedule = (callback, delay) => globalThis.setTimeout(callback, delay),
    cancel = timer => globalThis.clearTimeout(timer),
    reducedMotion = false } = {}) {
    if (!session || !['connect', 'spin', 'recover', 'refresh', 'dispose', 'supportsTarget'].every(key => typeof session[key] === 'function')) {
      throw new TypeError('A session/recovery adapter with explicit target binding is required.');
    }
    Object.assign(this, { session, renderer, audio, onState, schedule, cancel, reducedMotion });
    this.state = {
      phase: 'UNAVAILABLE', busy: false, hidden: false, bet: null, targetBps: 14_000,
      betLevels: [], balance: null, balanceFresh: false, receipt: null, history: [],
      autoRemaining: 0, autoActive: false, turbo: false, muted: false,
      message: 'Game not released yet.', fixture: session.kind === 'isolated-fixture',
    };
    this.disposed = false;
    this.generation = 0;
    this.presentation = null;
    this.autoTimer = null;
    this.autoWaitResolve = null;
    this.autoGeneration = 0;
    this.autoStartBalance = null;
    this.autoSettings = null;
  }

  get snapshot() {
    const transport = this.session.snapshot;
    const allowedTarget = this.session.supportsTarget(this.state.targetBps);
    return freezeCopy({
      ...this.state,
      canSpin: !this.disposed && !this.state.hidden && !this.state.busy &&
        !this.state.autoActive && transport.canSpin === true && transport.balanceFresh === true &&
        this.state.betLevels.includes(this.state.bet) && allowedTarget && supportedWager(this.state.bet, this.state.targetBps),
      canStop: !this.disposed && this.state.phase === 'PRESENTING' && !!this.presentation,
      canRecover: !this.disposed && !this.state.busy && !!transport.pending &&
        ['PENDING', 'AUTH_REQUIRED'].includes(transport.phase),
      canAuto: !this.disposed && !this.state.hidden && !this.state.busy &&
        !this.state.autoActive && transport.canAuto === true && transport.balanceFresh === true &&
        this.state.betLevels.includes(this.state.bet) && allowedTarget && supportedWager(this.state.bet, this.state.targetBps),
      targetSupported: allowedTarget,
      wagerControlsDisabled: this.disposed || this.state.busy || this.state.autoActive || !!transport.pending,
    });
  }
  _notify() {
    if (!this.disposed) {
      try { this.onState(this.snapshot); } catch { /* A UI error cannot alter settlement. */ }
    }
  }
  _sync() {
    const snapshot = this.session.snapshot;
    const account = snapshot.account;
    this.state.balanceFresh = snapshot.balanceFresh === true;
    if (account?.currency === 'ETB' && typeof account.balance === 'string') {
      parseAmount(account.balance);
      this.state.balance = account.balance; // Never derive a balance from a receipt.
    } else this.state.balance = null;
    this.state.betLevels = Array.isArray(account?.game?.betLevels)
      ? account.game.betLevels.filter(bet => {
        try { return parseAmount(bet) > 0n; } catch { return false; }
      }) : [];
    if (!this.state.betLevels.includes(this.state.bet)) this.state.bet = this.state.betLevels[0] ?? null;
    if (!this.state.busy) {
      this.state.phase = snapshot.pending ? 'RECOVERY_PENDING' : snapshot.canSpin ? 'IDLE' : 'UNAVAILABLE';
      this.state.message = snapshot.pending ? 'Confirm the previous round before starting another.' :
        snapshot.canSpin ? 'Choose your bet and multiplier.' : 'Game not released yet.';
    }
    return snapshot;
  }

  async connect() {
    if (this.disposed || this.state.busy) return false;
    const generation = this.generation;
    this.state.busy = true; this.state.phase = 'CONNECTING'; this.state.message = 'Checking account and game availability…'; this._notify();
    try { await this.session.connect(); }
    catch { /* The adapter's state remains the source of availability. */ }
    if (this.disposed || generation !== this.generation) return false;
    this.state.busy = false; this._sync(); this._notify();
    return this.snapshot.canSpin;
  }

  setBet(bet) {
    if (this.snapshot.wagerControlsDisabled || !this.state.betLevels.includes(bet)) return false;
    this.state.bet = bet; this.audio.emit('button'); this._notify(); return true;
  }
  stepBet(direction) {
    const index = this.state.betLevels.indexOf(this.state.bet);
    return this.setBet(this.state.betLevels[Math.max(0, Math.min(this.state.betLevels.length - 1, index + direction))]);
  }
  setTarget(targetBps) {
    if (this.snapshot.wagerControlsDisabled || !OBSERVED_TARGETS_BPS.includes(targetBps)) return false;
    this.state.targetBps = targetBps;
    this.state.message = this.session.supportsTarget(targetBps)
      ? 'Choose your bet and multiplier.' : 'This multiplier is not available for the current game configuration.';
    this.audio.emit('button'); this._notify(); return true;
  }
  setTurbo(enabled) {
    if (this.disposed) return;
    this.state.turbo = enabled === true; this._notify();
  }
  setMuted(muted) {
    if (this.disposed) return;
    this.state.muted = muted === true; this.audio.setMuted(this.state.muted); this._notify();
  }
  async unlockAudio() {
    if (this.disposed) return;
    try { await this.audio.unlock(); } catch { /* Muted/unavailable audio does not change a round. */ }
  }
  stop() {
    if (!this.snapshot.canStop) return false;
    this.audio.emit('button'); this.renderer.finishPresentation();
    return true; // No session/transport operation.
  }

  async spin(origin = 'manual') {
    const transport = this.session.snapshot;
    if (this.disposed || this.state.busy || this.state.hidden ||
      (this.state.autoActive && origin !== 'auto') || !transport.canSpin || !transport.balanceFresh ||
      !this.state.betLevels.includes(this.state.bet) || !this.session.supportsTarget(this.state.targetBps) ||
      !supportedWager(this.state.bet, this.state.targetBps)) return { accepted: false };
    const wager = Object.freeze({ bet: this.state.bet, targetBps: this.state.targetBps });
    const generation = this.generation;
    this.state.busy = true; this.state.phase = 'REQUEST_PENDING'; this.state.balanceFresh = false;
    this.state.message = 'Confirming the round…'; this.audio.emit('button'); this._notify();
    let acceptedReceipt = null;
    try {
      const receipt = validateRollXReceipt(await this.session.spin(wager), wager);
      acceptedReceipt = receipt;
      if (this.disposed || generation !== this.generation) return { accepted: false, disposed: true };
      await this._presentAndRefresh(receipt, generation);
      return { accepted: true, receipt };
    } catch (error) {
      if (this.disposed || generation !== this.generation) return { accepted: false, disposed: true };
      this.presentation?.abort(); this.presentation = null;
      this.stopAuto();
      this.state.busy = false; const state = this._sync();
      this.state.message = state.pending ? 'Round confirmation is pending. Recover it before starting another.' :
        acceptedReceipt ? 'Round accepted. The current balance still needs confirmation.' :
        'The round could not start. Check availability and try again.';
      this.state.phase = state.pending ? 'RECOVERY_PENDING' : 'UNAVAILABLE';
      this.audio.emit('error'); this._notify();
      return { accepted: !!acceptedReceipt, receipt: acceptedReceipt, ready: false, code: error.code ?? 'ROUND_UNAVAILABLE' };
    }
  }

  async _presentAndRefresh(receipt, generation) {
    this.state.receipt = receipt;
    this.state.targetBps = receipt.rollX.targetBps;
    this.state.bet = receipt.bet;
    if (!this.state.history.some(row => row.roundId === receipt.roundId)) {
      this.state.history = [receipt, ...this.state.history].slice(0, 20);
    }
    this.presentation = new AbortController();
    this.state.phase = 'PRESENTING'; this.state.message = 'Showing the confirmed result…'; this._notify();
    if (!this.state.hidden) this.audio.emit('spin');
    await this.renderer.presentReceipt(receipt, {
      signal: this.presentation.signal,
      duration: this.state.hidden || this.reducedMotion ? 0 : this.state.turbo ? 450 : 1500,
      onTick: () => { if (!this.disposed && !this.state.hidden) this.audio.emit('tick'); },
    });
    if (this.disposed || generation !== this.generation) return;
    this.presentation = null;
    if (!this.state.hidden) {
      this.audio.emit('stop');
      this.audio.emit(parseAmount(receipt.finalWin) > 0n ? 'win' : 'loss');
    }
    this.state.phase = 'REFRESHING'; this.state.message = 'Updating the confirmed account balance…'; this._notify();
    await this.session.refresh();
    if (this.disposed || generation !== this.generation) return;
    this.state.busy = false; this._sync();
    this.state.message = parseAmount(receipt.finalWin) > 0n ? 'Win confirmed: ' + receipt.finalWin + ' ETB' : 'Round confirmed.';
    this._notify();
  }

  async recover() {
    if (!this.snapshot.canRecover) return { accepted: false };
    const generation = this.generation;
    this.state.busy = true; this.state.phase = 'RECOVERY_PENDING'; this.state.message = 'Confirming the previous round…';
    this.stopAuto(); this._notify();
    let acceptedReceipt = null;
    try {
      const raw = await this.session.recover();
      if (this.disposed || generation !== this.generation) return { accepted: false };
      const receipt = validateRollXReceipt(raw, { bet: raw.bet, targetBps: raw.rollX?.targetBps });
      acceptedReceipt = receipt;
      await this._presentAndRefresh(receipt, generation);
      return { accepted: true, receipt };
    } catch (error) {
      if (this.disposed || generation !== this.generation) return { accepted: false };
      this.presentation?.abort(); this.presentation = null;
      this.state.busy = false; this._sync();
      this.state.message = acceptedReceipt ? 'Round accepted. The current balance still needs confirmation.' : 'The previous round still needs confirmation.';
      this._notify();
      return { accepted: !!acceptedReceipt, receipt: acceptedReceipt, ready: false, code: error.code ?? 'RECOVERY_UNAVAILABLE' };
    }
  }

  _autoDelay() {
    return new Promise(resolve => {
      this.autoWaitResolve = resolve;
      this.autoTimer = this.schedule(() => {
        this.autoTimer = null; this.autoWaitResolve = null; resolve(true);
      }, this.state.turbo ? 180 : 500);
    });
  }
  stopAuto() {
    this.autoGeneration++;
    this.state.autoActive = false; this.state.autoRemaining = 0;
    if (this.autoTimer !== null) this.cancel(this.autoTimer);
    this.autoTimer = null;
    this.autoWaitResolve?.(false); this.autoWaitResolve = null;
    this._notify();
  }
  async startAuto({ count, bet = this.state.bet, targetBps = this.state.targetBps,
    stopOnWin = '0.00', stopOnLoss = '0.00', stopOnGain = '0.00' } = {}) {
    if (!AUTO_COUNTS.includes(count) || !this.snapshot.canAuto) return { started: false, completed: 0 };
    // The source AUTO form has its own wager selectors. Bind their complete
    // confirmed choice before starting the first action, without modifying the
    // active choice when an invalid/stale form is rejected.
    if (!this.state.betLevels.includes(bet) || !OBSERVED_TARGETS_BPS.includes(targetBps) ||
      !this.session.supportsTarget(targetBps) || !supportedWager(bet, targetBps)) {
      return { started: false, completed: 0, code: 'AUTO_WAGER_UNAVAILABLE' };
    }
    let thresholds;
    try { thresholds = { win: parseAmount(stopOnWin), loss: parseAmount(stopOnLoss), gain: parseAmount(stopOnGain) }; }
    catch { return { started: false, completed: 0 }; }
    const generation = ++this.autoGeneration;
    this.state.bet = bet; this.state.targetBps = targetBps;
    this.state.autoActive = true; this.state.autoRemaining = count;
    this.autoStartBalance = parseAmount(this.state.balance); this.autoSettings = thresholds; this._notify();
    let completed = 0;
    while (!this.disposed && generation === this.autoGeneration && this.state.autoRemaining > 0 && !this.state.hidden) {
      const result = await this.spin('auto');
      if (result.accepted) completed++;
      if (!result.accepted || this.disposed || generation !== this.autoGeneration) break;
      this.state.autoRemaining--;
      const balance = parseAmount(this.state.balance);
      const stop = thresholds.win > 0n && parseAmount(result.receipt.finalWin) > thresholds.win ||
        thresholds.loss > 0n && this.autoStartBalance - balance > thresholds.loss ||
        thresholds.gain > 0n && balance - this.autoStartBalance > thresholds.gain;
      this._notify();
      if (stop || !this.session.snapshot.canAuto) break;
      if (this.state.autoRemaining > 0 && !await this._autoDelay()) break;
    }
    if (generation === this.autoGeneration) this.stopAuto();
    return { started: true, completed };
  }

  setHidden(hidden) {
    if (this.disposed) return;
    this.state.hidden = hidden === true;
    this.audio.setHidden(this.state.hidden);
    if (this.state.hidden) { this.stopAuto(); this.renderer.finishPresentation(); }
    this._notify();
  }
  async resume() {
    if (this.disposed) return false;
    this.setHidden(false);
    if (this.state.busy || this.session.snapshot.pending) return false;
    if (this.session.snapshot.account) {
      this.state.busy = true;
      try { await this.session.refresh(); } catch { /* Reconnect stays explicit. */ }
      if (this.disposed) return false;
      this.state.busy = false; this._sync(); this._notify();
      return this.snapshot.canSpin;
    }
    return this.connect();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.generation++;
    this.stopAuto(); this.presentation?.abort(); this.presentation = null;
    this.state.phase = 'EXITED'; this.state.busy = false;
    this.session.dispose(); this.renderer.dispose(); this.audio.dispose();
  }
}
