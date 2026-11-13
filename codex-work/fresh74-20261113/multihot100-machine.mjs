import {RoundController} from './round-controller.mjs';
import {validateGrid} from './reel-motion.mjs';

export const AUTO_COUNTS = Object.freeze([25, 50, 100, 500, 1000]);
const PANELS = new Set(['bet', 'autoplay', 'settings', 'history', 'about']);
const money = (value, name, positive = false) => {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) throw new TypeError('Invalid ' + name);
  return value;
};

export function parseMinor(value) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) throw new TypeError('Enter an amount with at most two decimal places');
  const [whole, fraction = ''] = value.trim().split('.');
  return money(Number(whole) * 100 + Number(fraction.padEnd(2, '0')), 'amount');
}

// Multi Hot 100 presentation/control model. No RNG, reel weights or paytable math.
export class MultiHot100Machine {
  constructor({gameId, allowedBets, balanceMinor, currency, symbols, initialBetMinor,
    startRound, recoverRound, present, nextToken, journal = null, onAudio = () => {}, requestTimeoutMs}) {
    if (!Array.isArray(allowedBets) || !allowedBets.length || new Set(allowedBets).size !== allowedBets.length)
      throw new TypeError('Existing-server bet choices are required');
    this.allowedBets = Object.freeze(allowedBets.map(value => money(value, 'bet', true)).sort((a,b) => a-b));
    if (!this.allowedBets.includes(initialBetMinor)) throw new TypeError('Initial bet is not allowed');
    if (!['ETB', 'DMO'].includes(currency) || !(symbols instanceof Set) || !symbols.size) throw new TypeError('Currency and verified symbols are required');
    this.balanceMinor = money(balanceMinor, 'balance'); this.currency = currency;
    this.betMinor = initialBetMinor; this.winMinor = 0; this.multiplier = null;
    this.panel = null; this.settings = {effects: true, music: true}; this.listeners = new Set();
    this.auto = null; this.lastResult = null; this.lastError = null; this.disposed = false;
    this.onAudio = onAudio; const verifiedSymbols = new Set(symbols);
    this.round = new RoundController({gameId, startRound, recoverRound, present, nextToken, journal, requestTimeoutMs,
      validateResult: result => {
        const grid = validateGrid(result.grid, 5, 4, verifiedSymbols);
        money(result.balanceMinor, 'server balance'); money(result.winMinor, 'server win');
        if (result.currency !== currency || ![1,2,3,4,5].includes(result.multiplier)) throw new TypeError('Unexpected currency or wheel multiplier');
        if (result.winningPaths != null && (!Array.isArray(result.winningPaths) || result.winningPaths.some(p => !Array.isArray(p) || p.length !== 5 || p.some(row => !Number.isInteger(row) || row < 0 || row > 3))))
          throw new TypeError('Invalid server win paths');
        return {...result, grid};
      },
      onState: state => {
        this.lastError = state.error?.message ?? null;
        if (state.state === 'idle' && state.result && state.result.roundId !== this.lastResult?.roundId) {
          this.lastResult = state.result; this.balanceMinor = state.result.balanceMinor;
          this.winMinor = state.result.winMinor; this.multiplier = state.result.multiplier;
        }
        this.emit();
      }
    });
  }

  snapshot() {
    const idle = this.round.state === 'idle' && !this.disposed;
    return Object.freeze({gameId: this.round.gameId, state: this.round.state, panel: this.panel,
      betMinor: this.betMinor, allowedBets: this.allowedBets, balanceMinor: this.balanceMinor,
      winMinor: this.winMinor, currency: this.currency, multiplier: this.multiplier,
      settings: Object.freeze({...this.settings}), autoRemaining: this.auto?.remaining ?? 0,
      canConfigure: idle && !this.auto, canSpin: idle && !this.auto && !this.panel,
      roundId: this.round.pending?.roundId ?? this.lastResult?.roundId ?? null, error: this.lastError});
  }
  subscribe(listener) {this.listeners.add(listener); listener(this.snapshot()); return () => this.listeners.delete(listener);}
  emit() {if (this.round) for (const listener of this.listeners) {try {listener(this.snapshot());} catch (error) {this.lastObserverError = error;}}}
  async initialize() {if (this.round.state === 'uninitialized') await this.round.initialize();}
  setBet(value) {
    if (!this.snapshot().canConfigure || !this.allowedBets.includes(value)) throw new Error('Bet cannot change during a round or autoplay');
    this.betMinor = value; this.panel = null; this.emit();
  }
  openPanel(name) {
    if (!PANELS.has(name) || !this.snapshot().canConfigure) throw new Error('Panel is unavailable during a round or autoplay');
    this.panel = name; this.emit();
  }
  closePanel() {this.panel = null; this.emit();}
  setAudio(name, enabled) {
    if (!Object.hasOwn(this.settings, name) || typeof enabled !== 'boolean' || this.disposed) throw new TypeError('Invalid audio setting');
    this.settings[name] = enabled;
    try {this.onAudio(Object.freeze({...this.settings}));} catch (error) {this.lastError = error.message;}
    this.emit();
  }
  spin() {
    if (!this.snapshot().canSpin) throw new Error('Spin is unavailable');
    return this.round.spin(this.betMinor);
  }
  stop() {
    const hadAuto = Boolean(this.auto);
    if (this.auto) {this.auto.cancelled = true; this.auto = null;}
    const stopped = this.round.stop(); this.emit(); return hadAuto || stopped;
  }
  recover() {return this.round.recover();}
  replayPresentation() {return this.round.replayPresentation();}
  retryStorage() {return this.round.state === 'release-error' ? this.round.retryRelease() : this.round.initialize();}

  async startAutoplay({count, winLimitMinor = null, lossLimitMinor = null, gainLimitMinor = null}) {
    if (!this.snapshot().canConfigure || !AUTO_COUNTS.includes(count)) throw new Error('Autoplay is unavailable or has an invalid count');
    for (const limit of [winLimitMinor, lossLimitMinor, gainLimitMinor]) if (limit !== null) money(limit, 'autoplay threshold', true);
    const plan = {remaining: count, baseline: this.balanceMinor, cancelled: false};
    this.auto = plan; this.panel = null; this.emit();
    try {
      while (!this.disposed && !plan.cancelled && plan.remaining > 0) {
        const result = await this.round.spin(this.betMinor);
        if (!result || this.round.state !== 'idle') break;
        plan.remaining--; this.emit();
        if ((winLimitMinor !== null && result.winMinor >= winLimitMinor) ||
            (lossLimitMinor !== null && plan.baseline - result.balanceMinor >= lossLimitMinor) ||
            (gainLimitMinor !== null && result.balanceMinor - plan.baseline >= gainLimitMinor)) break;
      }
    } finally {if (this.auto === plan) this.auto = null; this.emit();}
  }
  dispose() {if (this.disposed) return; this.disposed = true; this.stop(); this.round.dispose(); this.listeners.clear();}
}
