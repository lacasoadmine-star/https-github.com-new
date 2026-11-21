import { RecoveryError, createExclusiveLock, retryAfterMilliseconds } from '../../../shared/round-recovery.mjs';
import { GAME_ID, HASH, UUID, MATH_KEYS, copy, fail, freeze, mathIdentity } from './contract.mjs';
import { DEFERRED_PATHS, validateDeferredBody, validateDeferredReceipt, validateDeferredState, wireBody } from './deferred-protocol.mjs';

export function deferredStorageKey(guard) {
  if (!HASH.test(guard ?? '')) fail('INVALID_SESSION_GUARD');
  return 'zplay.m10.deferred.pending.v1.' + guard;
}
export function createMultiHot10DeferredTransport({ fetcher = globalThis.fetch, timeoutMs = 20000, now = Date.now } = {}) {
  if (typeof fetcher !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) fail('M10_TRANSPORT_OPTIONS_INVALID');
  return async (path, body, { signal } = {}) => {
    if (!(path === DEFERRED_PATHS.state && body === undefined ||
      [DEFERRED_PATHS.spin, DEFERRED_PATHS.collect, DEFERRED_PATHS.gamble].includes(path) && body && typeof body === 'object')) fail('M10_TRANSPORT_ROUTE_INVALID');
    const abort = new AbortController(); let timeout = false;
    const cancel = () => abort.abort();
    if (signal?.aborted) cancel(); else signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => { timeout = true; abort.abort(); }, timeoutMs);
    try {
      const response = await fetcher(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
        redirect: 'error', cache: 'no-store', signal: abort.signal,
        headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
      const retryAfterMs = response.status === 429 ? retryAfterMilliseconds(response.headers.get('retry-after'), now()) : null;
      let data; try { data = await response.json(); } catch { throw new RecoveryError('INVALID_SERVER_RESPONSE', response.status, { retryAfterMs }); }
      if (!response.ok) {
        const code = [data?.code, data?.error].find(value => typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,99}$/.test(value)) ?? 'HTTP_' + response.status;
        throw new RecoveryError(code, response.status, { retryAfterMs });
      }
      return data;
    } catch (error) {
      if (error?.code) throw error;
      throw new RecoveryError(timeout ? 'REQUEST_TIMEOUT' : signal?.aborted ? 'REQUEST_ABORTED' : 'NETWORK_UNAVAILABLE');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  };
}
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new RecoveryError('REQUEST_ABORTED')); return; }
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(new RecoveryError('REQUEST_ABORTED')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
const sameAction = (a, b) => !!a && !!b && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => a[key] === b[key]);
const pendingWin = account => !!account?.round?.receipt && account.round.receipt.collectionStatus === 'PENDING' &&
  account.round.pendingWinAmount !== '0.00' && !account.round.collection;
const pathFor = kind => kind === 'SPIN' ? DEFERRED_PATHS.spin : kind === 'TAKE_WIN' ? DEFERRED_PATHS.collect : DEFERRED_PATHS.gamble;

/** Dedicated deferred protocol; never treats a reserved win as wallet credit. */
export class MultiHot10DeferredClient {
  constructor({ request = createMultiHot10DeferredTransport(), storage = globalThis.sessionStorage,
    resolveMath = async () => null, allowNewRounds = false, now = Date.now, delay = wait,
    lock = createExclusiveLock(), retry = {}, onState = () => {} } = {}) {
    if (![request, resolveMath, now, delay, lock, onState].every(value => typeof value === 'function') ||
      typeof allowNewRounds !== 'boolean' || !storage || !['getItem', 'setItem', 'removeItem'].every(name => typeof storage[name] === 'function')) fail('M10_DEFERRED_CLIENT_DEPENDENCIES_REQUIRED');
    const policy = { attempts: 3, baseDelayMs: 250, maxDelayMs: 2000, ...retry };
    if (!Number.isInteger(policy.attempts) || policy.attempts < 1 || policy.attempts > 5 ||
      !Number.isInteger(policy.baseDelayMs) || policy.baseDelayMs < 0 || !Number.isInteger(policy.maxDelayMs) ||
      policy.maxDelayMs < policy.baseDelayMs || policy.maxDelayMs > 60000) fail('M10_RETRY_POLICY_INVALID');
    Object.assign(this, { request, storage, resolveMath, allowNewRounds, now, delay, lock, onState });
    this.retry = freeze(policy); this._phase = 'DISCONNECTED'; this._account = null; this._pending = null;
    this._receipt = null; this._presentation = null; this._stateView = null; this._stateCollected = false;
    this._operation = null; this._generation = 0; this._disposed = false; this._retryAt = 0; this._lastError = null;
  }
  get snapshot() {
    return freeze({ phase: this._phase, busy: !!this._operation, account: copy(this._account), pending: copy(this._pending),
      receipt: copy(this._receipt), presentation: copy(this._presentation), roundView: copy(this._stateView),
      roundCollected: this._stateCollected, balanceFresh: this._phase === 'READY',
      canSpin: this.canSpin, canTake: this.canTake, canGamble: this.canGamble, retryAt: this._retryAt || null, lastError: this._lastError });
  }
  get canSpin() { return !this._disposed && !this._operation && !this._pending && this._phase === 'READY' && this._eligible(this._account); }
  get canTake() { return !this._disposed && !this._operation && !this._pending && this._phase === 'READY' && pendingWin(this._account); }
  get canGamble() { return this.canTake && this.allowNewRounds && this._account.game.gambleEnabled === true; }
  _eligible(account, action = null) {
    const game = account?.game;
    return this.allowNewRounds && account?.authenticated === true && game?.enabled === true && game.freshReleaseReady === true &&
      !account.blockedByActiveGame && game.wagerAvailability !== 'house_capacity' && (!action || game.betLevels.includes(action.bet) &&
      (!Array.isArray(game.availableBetLevels) || game.availableBetLevels.includes(action.bet)) && MATH_KEYS.every(key => game[key] === action[key]));
  }
  _notify() { if (!this._disposed) { try { this.onState(this.snapshot); } catch { /* UI cannot authorize a financial action. */ } } }
  _begin(kind) {
    if (this._disposed) fail('M10_DEFERRED_CLIENT_DISPOSED');
    if (this._operation) fail('ROUND_BUSY', 409);
    const op = { kind, generation: this._generation, controller: new AbortController() };
    this._operation = op; this._lastError = null; return op;
  }
  _assert(op) { if (this._disposed || this._operation !== op || op.generation !== this._generation) fail('STALE_OPERATION'); }
  _end(op) { if (this._operation === op && op.generation === this._generation) { this._operation = null; this._notify(); } }
  _error(op, error) {
    if (this._operation !== op || op.generation !== this._generation || this._disposed) return;
    this._lastError = error.code ?? 'M10_DEFERRED_REQUEST_FAILED';
    this._phase = error.status === 401 || error.status === 403 ? 'AUTH_REQUIRED' : this._pending ? 'PENDING' : 'UNAVAILABLE';
    this._notify();
  }
  _read(guard) {
    const raw = this.storage.getItem(deferredStorageKey(guard)); if (raw === null) return null;
    let value; try { value = JSON.parse(raw); } catch { fail('M10_PENDING_STORAGE_CORRUPT'); }
    if (!value || value.schema !== 'zplay-m10-deferred-pending-v1' || Object.keys(value).sort().join(',') !== 'action,retryAt,schema' ||
      !Number.isSafeInteger(value.retryAt) || value.retryAt < 0 || value.action?.sessionGuard !== guard) fail('M10_PENDING_STORAGE_CORRUPT');
    wireBody(value.action);
    return value;
  }
  _save(action, retryAt = 0) {
    wireBody(action);
    this.storage.setItem(deferredStorageKey(action.sessionGuard), JSON.stringify({ schema: 'zplay-m10-deferred-pending-v1', action, retryAt }));
    const saved = this._read(action.sessionGuard);
    if (!sameAction(saved?.action, action) || saved.retryAt !== retryAt) fail('M10_PENDING_NOT_PERSISTED');
  }
  _remove(action) {
    if (!sameAction(this._read(action.sessionGuard)?.action, action)) fail('PENDING_REQUEST_CHANGED');
    this.storage.removeItem(deferredStorageKey(action.sessionGuard));
    if (this._read(action.sessionGuard)) fail('M10_PENDING_NOT_REMOVED');
  }
  async _cooldown(op) {
    const delay = this._retryAt - this.now();
    if (delay > this.retry.maxDelayMs) throw new RecoveryError('RETRY_DEFERRED', 429, { retryAt: this._retryAt });
    if (delay > 0) await this.delay(delay, op.controller.signal);
    this._assert(op);
  }
  async _once(op, path, body) {
    this._assert(op); await this._cooldown(op);
    try { const value = await this.request(path, body, { signal: op.controller.signal }); this._assert(op); return value; }
    catch (error) {
      this._assert(op);
      if (error.status === 429 && Number.isFinite(error.retryAfterMs) && error.retryAfterMs >= 0) {
        this._retryAt = Math.max(this._retryAt, this.now() + error.retryAfterMs);
        if (this._pending && sameAction(this._read(this._pending.sessionGuard)?.action, this._pending)) this._save(this._pending, this._retryAt);
      }
      throw error;
    }
  }
  async _readRetry(op, path, body) {
    for (let attempt = 0; ; attempt++) {
      try { return await this._once(op, path, body); }
      catch (error) {
        if (attempt + 1 >= this.retry.attempts || !(error.status === 0 || error.status === undefined || error.status === 429 || error.status >= 500) ||
          error.code === 'STALE_OPERATION') throw error;
        await this._cooldown(op);
        await this.delay(Math.min(this.retry.maxDelayMs, this.retry.baseDelayMs * 2 ** attempt), op.controller.signal); this._assert(op);
      }
    }
  }
  async _state(op, guard = null) {
    const raw = await this._readRetry(op, DEFERRED_PATHS.state);
    const result = await validateDeferredState(raw, this.resolveMath); this._assert(op);
    if (guard && result.account.sessionGuard !== guard) fail('PLAYER_SESSION_CHANGED', 403);
    return result;
  }
  _setAccount(result) { this._account = copy(result.account); this._stateView = copy(result.roundView); this._stateCollected = result.roundCollected; }
  async connect() {
    const op = this._begin('connect'); this._phase = 'CONNECTING'; this._notify();
    try {
      const result = await this._state(op); this._assert(op);
      const saved = this._read(result.account.sessionGuard); this._setAccount(result);
      this._pending = saved?.action ?? null; this._retryAt = Math.max(this._retryAt, saved?.retryAt ?? 0);
      this._phase = this._pending ? 'PENDING' : 'READY'; this._notify(); this._assert(op);
      return copy(this._account);
    } catch (error) { this._error(op, error); throw error; } finally { this._end(op); }
  }
  async _accept(op, receipt, action) {
    const presentation = await validateDeferredReceipt(receipt, action, this.resolveMath); this._assert(op);
    this._remove(action); this._pending = null; this._receipt = copy(receipt); this._presentation = presentation;
    this._phase = 'SETTLED'; this._notify(); this._assert(op);
    return copy(receipt);
  }
  async _submit(kind, input) {
    if (!this._account || this._pending || this._phase !== 'READY') fail('ROUND_NOT_READY', 409);
    if (kind === 'SPIN' && !this.canSpin) fail('M10_NEW_ROUNDS_NOT_ENABLED');
    if (kind === 'TAKE_WIN' && !this.canTake) fail('M10_NO_PENDING_WIN', 409);
    if (kind === 'GAMBLE' && !this.canGamble) fail('M10_GAMBLE_NOT_ENABLED');
    if (!input || !UUID.test(input.requestKey ?? '')) fail('ROUND_TOKEN_INVALID', 400);
    const op = this._begin(kind), guard = this._account.sessionGuard, shown = copy(this._account);
    this._phase = 'CHECKING'; this._notify();
    try {
      const accepted = await this.lock('zplay-new72-round:' + guard, async () => {
        this._assert(op);
        const saved = this._read(guard);
        if (saved) { this._pending = saved.action; this._retryAt = Math.max(this._retryAt, saved.retryAt); fail('PENDING_ROUND_REQUIRES_RECOVERY'); }
        const result = await this._state(op, guard), account = result.account;
        let action;
        if (kind === 'SPIN') {
          if (MATH_KEYS.some(key => account.game[key] !== shown.game[key])) fail('GAME_RULES_UPDATED_RELOAD', 409);
          action = { kind, gameId: GAME_ID, bet: input.bet, roundToken: input.requestKey, sessionGuard: guard,
            ...mathIdentity(account.game), collectRoundId: input.collectRoundId };
          if (!this._eligible(account, action)) fail('M10_WAGER_NOT_AVAILABLE');
          if (action.collectRoundId !== null && account.round?.receipt.roundId !== action.collectRoundId ||
            action.collectRoundId === null && pendingWin(account)) fail('M10_COLLECTION_STATE_CHANGED', 409);
        } else {
          const round = account.round?.receipt;
          if (!round || round.roundId !== input.roundId || !pendingWin(account)) fail('M10_COLLECTION_STATE_CHANGED', 409);
          action = { kind, gameId: GAME_ID, bet: round.bet, roundToken: input.requestKey, sessionGuard: guard,
            ...mathIdentity(round), roundId: round.roundId };
          if (kind === 'GAMBLE') {
            if (!this.allowNewRounds || account.game.gambleEnabled !== true) fail('M10_GAMBLE_NOT_ENABLED');
            action.expectedAttempt = (account.round.gambleActions ?? []).length + 1;
            action.expectedWinAmount = account.round.pendingWinAmount ?? round.winAmount;
            action.choice = input.choice;
          }
        }
        validateDeferredBody(wireBody(action), kind); this._assert(op);
        this._setAccount(result); this._save(action); this._pending = action;
        this._phase = 'REQUESTING'; this._notify(); this._assert(op);
        const receipt = await this._once(op, pathFor(kind), wireBody(action));
        return this._accept(op, receipt, action);
      });
      this._assert(op); return accepted;
    } catch (error) { this._error(op, error); throw error; } finally { this._end(op); }
  }
  spin(input) { return this._submit('SPIN', input); }
  takeWin(input) { return this._submit('TAKE_WIN', input); }
  gamble(input) { return this._submit('GAMBLE', input); }
  async recover() {
    if (!this._account || !this._pending) fail('ROUND_NOT_RECOVERABLE', 409);
    const op = this._begin('recover'), action = copy(this._pending), path = pathFor(action.kind);
    this._phase = 'CONFIRMING'; this._notify();
    try {
      const accepted = await this.lock('zplay-new72-round:' + action.sessionGuard, async () => {
        this._assert(op); const saved = this._read(action.sessionGuard);
        if (!sameAction(saved?.action, action)) fail('PENDING_REQUEST_CHANGED');
        this._retryAt = Math.max(this._retryAt, saved.retryAt);
        let receipt;
        try { receipt = await this._readRetry(op, path, wireBody(action, true)); }
        catch (error) {
          if (error.status !== 404 || error.code !== 'ROUND_NOT_FOUND_FOR_REPLAY') throw error;
          const result = await this._state(op, action.sessionGuard); this._assert(op);
          if (!sameAction(this._read(action.sessionGuard)?.action, action)) fail('PENDING_REQUEST_CHANGED');
          if (action.kind === 'SPIN' && (!this._eligible(result.account, action) ||
            action.collectRoundId !== null && result.account.round?.receipt.roundId !== action.collectRoundId ||
            action.collectRoundId === null && pendingWin(result.account))) fail('M10_SAVED_REQUEST_REPLAY_ONLY');
          if (action.kind === 'GAMBLE' && (!this.allowNewRounds || result.account.game.gambleEnabled !== true ||
            !pendingWin(result.account) || result.account.round.receipt.roundId !== action.roundId ||
            result.account.round.pendingWinAmount !== action.expectedWinAmount ||
            (result.account.round.gambleActions ?? []).length + 1 !== action.expectedAttempt ||
            MATH_KEYS.some(key => result.account.round.receipt[key] !== action[key]))) fail('M10_SAVED_REQUEST_REPLAY_ONLY');
          // TAKE can safely resend its SAME original round/key after an
          // authenticated miss, including after model/new-wager retirement.
          this._setAccount(result);
          receipt = await this._once(op, path, wireBody(action));
        }
        return this._accept(op, receipt, action);
      });
      this._assert(op); return accepted;
    } catch (error) { this._error(op, error); throw error; } finally { this._end(op); }
  }
  async refresh() {
    if (!this._account || this._pending) fail('PENDING_ROUND_REQUIRES_RECOVERY');
    const op = this._begin('refresh'), guard = this._account.sessionGuard; this._phase = 'CHECKING'; this._notify();
    try {
      const result = await this._state(op, guard), saved = this._read(guard); this._assert(op); this._setAccount(result);
      this._pending = saved?.action ?? null; this._retryAt = Math.max(this._retryAt, saved?.retryAt ?? 0);
      this._phase = this._pending ? 'PENDING' : 'READY'; this._notify(); this._assert(op);
      return copy(this._account);
    } catch (error) { this._error(op, error); throw error; } finally { this._end(op); }
  }
  disconnect() {
    if (this._disposed) return;
    this._generation++; this._operation?.controller.abort(); this._operation = null;
    this._account = null; this._pending = null; this._receipt = null; this._presentation = null; this._stateView = null;
    this._phase = 'DISCONNECTED'; this._lastError = null; this._notify();
  }
  dispose() { if (!this._disposed) { this.disconnect(); this._disposed = true; this._phase = 'DISPOSED'; } }
}
