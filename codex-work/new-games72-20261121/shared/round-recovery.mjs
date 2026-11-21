// Additive transport for new game modules. This module has no model, RNG,
// payout evaluator, wallet, backend registration, or production activation.
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH = /^[a-f0-9]{64}$/i;
const GAME = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const MONEY = /^(0|[1-9]\d{0,12})\.\d{2}$/;
const MATH_KEYS = ['mathVersion', 'engineVersion', 'mathSha256'];
const ACTION_KEYS = ['gameId', 'bet', 'roundToken', 'sessionGuard', ...MATH_KEYS];
const PREFIX = 'zplay.new72.pending.v1.';
const localLocks = new Set();

export class RecoveryError extends Error {
  constructor(code, status = 0, details = {}) {
    super(code);
    this.name = 'RecoveryError';
    this.code = code;
    this.status = status;
    Object.assign(this, details);
  }
}

const fail = (code, status = 0, details) => { throw new RecoveryError(code, status, details); };
const copy = value => structuredClone(value);
function minor(value) {
  if (typeof value !== 'string' || !MONEY.test(value)) fail('INVALID_ETB_AMOUNT');
  return BigInt(value.replace('.', ''));
}
function mathIdentity(value) {
  if (!value || !MATH_KEYS.slice(0, 2).every(key =>
    typeof value[key] === 'string' && value[key].length > 0 && value[key].length <= 200) ||
    !HASH.test(value.mathSha256 ?? '')) fail('INVALID_MATH_IDENTITY');
}
function validAction(action, guard) {
  if (!action || typeof action !== 'object' || Array.isArray(action) ||
    Object.keys(action).length !== ACTION_KEYS.length ||
    Object.keys(action).some(key => !ACTION_KEYS.includes(key)) ||
    !GAME.test(action.gameId ?? '') || !UUID.test(action.roundToken ?? '') ||
    !HASH.test(guard ?? '') || action.sessionGuard !== guard) fail('INVALID_SAVED_ROUND');
  if (minor(action.bet) <= 0n) fail('INVALID_SAVED_ROUND');
  mathIdentity(action);
  return action;
}
function sameAction(a, b) {
  return !!a && !!b && ACTION_KEYS.every(key => a[key] === b[key]);
}

export function pendingStorageKey(sessionGuard) {
  if (!HASH.test(sessionGuard ?? '')) fail('INVALID_SESSION_GUARD');
  return PREFIX + sessionGuard;
}

export function retryAfterMilliseconds(value, now = Date.now()) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isSafeInteger(seconds) && seconds <= Number.MAX_SAFE_INTEGER / 1000
      ? seconds * 1000 : null;
  }
  const timestamp = Date.parse(trimmed);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : null;
}

// Uses exactly the existing Player routes and the browser's existing cookie.
// The cookie, authorization headers and credentials are never read or stored.
export function createSameOriginTransport({ fetcher = globalThis.fetch, timeoutMs = 20000,
  now = Date.now } = {}) {
  if (typeof fetcher !== 'function' || typeof now !== 'function' ||
    !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) fail('INVALID_TRANSPORT_OPTIONS');
  return async (path, body, { signal } = {}) => {
    const url = new URL(path, 'https://same-origin.invalid');
    const state = url.pathname === '/api/slots/fresh-state' && body === undefined &&
      [...url.searchParams.keys()].length === 1 && GAME.test(url.searchParams.get('gameId') ?? '');
    const spin = url.pathname === '/api/slots/spin' && !!body && !url.search;
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') ||
      url.origin !== 'https://same-origin.invalid' || url.hash || !(state || spin)) fail('INVALID_EXISTING_ROUTE');
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetcher(path, {
        method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
        cache: 'no-store', redirect: 'error', signal: controller.signal,
        headers: { accept: 'application/json', ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const retryAfterMs = response.status === 429
        ? retryAfterMilliseconds(response.headers.get('retry-after'), now()) : null;
      let data;
      try { data = await response.json(); }
      catch { fail('INVALID_SERVER_RESPONSE', response.status, { retryAfterMs }); }
      if (!response.ok) {
        const code = [data?.code, data?.error, data?.detail]
          .find(value => typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,99}$/.test(value)) ?? 'HTTP_' + response.status;
        fail(code, response.status, { retryAfterMs });
      }
      return data;
    } catch (error) {
      if (error instanceof RecoveryError) throw error;
      fail(timedOut ? 'REQUEST_TIMEOUT' : signal?.aborted ? 'REQUEST_ABORTED' : 'NETWORK_UNAVAILABLE');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  };
}

// Rejects overlapping actions; it never queues another financial action.
// Web Locks coordinates cooperating tabs. The fallback covers this JS realm.
export function createExclusiveLock(locks = globalThis.navigator?.locks) {
  if (locks?.request) return (name, callback) => locks.request(name,
    { mode: 'exclusive', ifAvailable: true }, lock => {
      if (!lock) fail('ROUND_BUSY');
      return callback();
    });
  return async (name, callback) => {
    if (localLocks.has(name)) fail('ROUND_BUSY');
    localLocks.add(name);
    try { return await callback(); }
    finally { localLocks.delete(name); }
  };
}

function abortableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new RecoveryError('REQUEST_ABORTED')); return; }
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(new RecoveryError('REQUEST_ABORTED')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

function envelope(receipt, action) {
  if (!receipt || receipt.gameId !== action.gameId || receipt.bet !== action.bet ||
    receipt.currency !== 'ETB' || !UUID.test(receipt.roundId ?? '') ||
    typeof receipt.isFree !== 'boolean' || MATH_KEYS.some(key => receipt[key] !== action[key])) fail('RECEIPT_IDENTITY_MISMATCH');
  if (receipt.roundToken !== undefined && receipt.roundToken !== action.roundToken) fail('RECEIPT_REQUEST_MISMATCH');
  const wallet = receipt.walletReceipt;
  if (!wallet || wallet.currency !== 'ETB' || minor(wallet.chargedStake) !== (receipt.isFree ? 0n : minor(action.bet)) ||
    minor(wallet.balanceBefore) - minor(wallet.chargedStake) + minor(wallet.finalWin) !== minor(wallet.balanceAfter) ||
    minor(wallet.finalWin) !== minor(receipt.finalWin)) fail('INVALID_AUTHORITATIVE_SETTLEMENT');
}

const definitiveInitialRejection = error =>
  error.status === 402 && error.code === 'INSUFFICIENT_FUNDS' ||
  error.status === 422 && ['BET_OUTSIDE_WORKER_POLICY', 'BET_OUTSIDE_EXISTING_LADDER'].includes(error.code) ||
  error.status === 400 && ['ROUND_TOKEN_INVALID', 'INVALID_ETB_AMOUNT', 'INVALID_EXISTING_SPIN_REQUEST',
    'CLIENT_MATH_OR_PROFILE_OVERRIDE_NOT_ALLOWED', 'INVALID_REPLAY_FLAG'].includes(error.code);

export class RoundRecoveryClient {
  constructor({ gameId, validateModel, validateReceipt, request = createSameOriginTransport(),
    storage = globalThis.sessionStorage, uuid = () => globalThis.crypto.randomUUID(),
    now = Date.now, delay = abortableDelay, lock = createExclusiveLock(),
    retry = {}, onState = () => {}, onEvent = () => {} } = {}) {
    if (!GAME.test(gameId ?? '') || ![validateModel, validateReceipt, request, uuid, now, delay, lock, onState, onEvent]
      .every(value => typeof value === 'function') || !storage ||
      !['getItem', 'setItem', 'removeItem'].every(key => typeof storage[key] === 'function')) fail('RECOVERY_DEPENDENCIES_REQUIRED');
    const policy = { attempts: 3, baseDelayMs: 250, maxDelayMs: 2000, ...retry };
    if (!Number.isInteger(policy.attempts) || policy.attempts < 1 || policy.attempts > 5 ||
      !Number.isInteger(policy.baseDelayMs) || policy.baseDelayMs < 0 ||
      !Number.isInteger(policy.maxDelayMs) || policy.maxDelayMs < policy.baseDelayMs || policy.maxDelayMs > 60000) fail('INVALID_RETRY_POLICY');
    Object.assign(this, { gameId, validateModel, validateReceipt, request, storage, uuid, now, delay, lock, onState, onEvent });
    this.retry = Object.freeze(policy);
    this._phase = 'DISCONNECTED'; this._account = null; this._pending = null; this._receipt = null;
    this._operation = null; this._generation = 0; this._disposed = false; this._notBefore = 0; this._lastError = null;
  }

  get snapshot() {
    return copy({ phase: this._phase, busy: !!this._operation, account: this._account,
      pending: this._pending, receipt: this._receipt, lastError: this._lastError,
      retryAt: this._notBefore || null, canSpin: this.canSpin, canAuto: this.canSpin,
      balanceFresh: this._phase === 'READY' || this._phase === 'UNAVAILABLE' });
  }
  get canSpin() { return !this._disposed && !this._operation && this._phase === 'READY' && !this._pending; }
  _notify() { if (!this._disposed) { try { this.onState(this.snapshot); } catch { /* UI errors cannot alter settlement. */ } } }
  _event(value) { if (!this._disposed) { try { this.onEvent(Object.freeze({ ...value })); } catch { /* Audit callbacks do not authorize retries. */ } } }
  _begin(kind) {
    if (this._disposed) fail('CLIENT_DISPOSED');
    if (this._operation) fail('ROUND_BUSY');
    const op = { kind, generation: this._generation, controller: new AbortController() };
    this._operation = op; this._lastError = null;
    return op;
  }
  _active(op) { return !this._disposed && this._operation === op && this._generation === op.generation; }
  _assert(op) { if (!this._active(op)) fail('STALE_OPERATION'); }
  _end(op) { if (this._active(op)) { this._operation = null; this._notify(); } }
  _error(op, error) {
    if (!this._active(op)) return;
    this._lastError = error.code ?? 'RECOVERY_FAILED';
    this._phase = error.status === 401 || error.status === 403 || error.code === 'SESSION_CHANGED'
      ? 'AUTH_REQUIRED' : this._pending ? 'PENDING' : 'DISCONNECTED';
    this._event({ operation: op.kind, code: this._lastError, status: error.status ?? 0,
      reason: this._pending ? 'saved_request_retained' : 'request_blocked' });
    this._notify();
  }
  _read(guard) {
    const raw = this.storage.getItem(pendingStorageKey(guard));
    if (raw === null) return null;
    let saved;
    try { saved = JSON.parse(raw); } catch { fail('PENDING_STORAGE_CORRUPT'); }
    if (!saved || saved.schema !== 'zplay-new72-pending-v1' ||
      Object.keys(saved).sort().join(',') !== 'action,retryAt,schema' ||
      !Number.isSafeInteger(saved.retryAt) || saved.retryAt < 0) fail('PENDING_STORAGE_CORRUPT');
    validAction(saved.action, guard);
    return saved;
  }
  _write(action, retryAt = 0) {
    validAction(action, action.sessionGuard);
    const saved = { schema: 'zplay-new72-pending-v1', action: copy(action), retryAt };
    this.storage.setItem(pendingStorageKey(action.sessionGuard), JSON.stringify(saved));
    if (!sameAction(this._read(action.sessionGuard)?.action, action)) fail('PENDING_STORAGE_NOT_PERSISTED');
  }
  _owns(action) { return sameAction(this._read(action.sessionGuard)?.action, action); }
  _remove(action) {
    if (!this._owns(action)) fail('PENDING_REQUEST_CHANGED');
    this.storage.removeItem(pendingStorageKey(action.sessionGuard));
    if (this._read(action.sessionGuard)) fail('PENDING_STORAGE_NOT_CLEARED');
  }
  async _wait(op, ms) {
    if (ms <= 0) return;
    await this.delay(ms, op.controller.signal);
    this._assert(op);
  }
  async _cooldown(op) {
    const remaining = this._notBefore - this.now();
    if (remaining > this.retry.maxDelayMs) fail('RETRY_DEFERRED', 429, { retryAt: this._notBefore });
    await this._wait(op, Math.max(0, remaining));
    if (this.now() < this._notBefore) fail('RETRY_DEFERRED', 429, { retryAt: this._notBefore });
  }
  _rateLimit(error) {
    if (error.status !== 429) return;
    const delay = Number.isSafeInteger(error.retryAfterMs) && error.retryAfterMs >= 0
      ? error.retryAfterMs : this.retry.baseDelayMs;
    const next = this.now() + delay;
    if (!Number.isSafeInteger(next)) fail('INVALID_RETRY_AFTER', 429);
    this._notBefore = Math.max(this._notBefore, next);
    if (this._pending && this._owns(this._pending)) this._write(this._pending, this._notBefore);
  }
  async _once(op, path, body) {
    this._assert(op);
    await this._cooldown(op);
    this._assert(op);
    try {
      const result = await this.request(path, body === undefined ? undefined : copy(body), { signal: op.controller.signal });
      this._assert(op);
      return copy(result);
    } catch (error) {
      this._assert(op);
      this._rateLimit(error);
      throw error;
    }
  }
  async _readRetry(op, path, body) {
    for (let attempt = 1; attempt <= this.retry.attempts; attempt++) {
      try { return await this._once(op, path, body); }
      catch (error) {
        this._assert(op);
        const transient = error.status === 429 || error.status >= 500 && error.status <= 599 ||
          error instanceof RecoveryError && error.status === 0 &&
          ['REQUEST_TIMEOUT', 'NETWORK_UNAVAILABLE', 'INVALID_SERVER_RESPONSE'].includes(error.code);
        if (!transient || attempt === this.retry.attempts || error.code === 'RETRY_DEFERRED') throw error;
        const delay = Math.max(Math.min(this.retry.maxDelayMs, this.retry.baseDelayMs * 2 ** (attempt - 1)),
          this._notBefore - this.now());
        if (delay > this.retry.maxDelayMs) fail('RETRY_DEFERRED', 429, { retryAt: this._notBefore });
        this._event({ operation: body?.replayOnly ? 'replay' : 'state', attempt, code: error.code,
          status: error.status, delayMs: delay, reason: 'bounded_read_only_retry' });
        await this._wait(op, delay);
      }
    }
    fail('RETRY_BUDGET_EXHAUSTED');
  }
  async _state(op, expectedGuard = null) {
    const state = await this._readRetry(op, '/api/slots/fresh-state?gameId=' + encodeURIComponent(this.gameId));
    this._assert(op);
    if (state?.authenticated !== true) fail('PLAYER_LOGIN_REQUIRED', 401);
    if (state.currency !== 'ETB' || state.game?.id !== this.gameId ||
      !HASH.test(state.sessionGuard ?? '')) fail('INVALID_PLAYER_STATE');
    if (expectedGuard && state.sessionGuard !== expectedGuard) fail('SESSION_CHANGED', 403);
    minor(state.balance); mathIdentity(state.game);
    if (!Array.isArray(state.game.betLevels) || !state.game.betLevels.length ||
      new Set(state.game.betLevels).size !== state.game.betLevels.length) fail('INVALID_SERVER_BET_LADDER');
    state.game.betLevels.forEach(bet => { if (minor(bet) <= 0n) fail('INVALID_SERVER_BET_LADDER'); });
    await this.validateModel(copy(state.game));
    this._assert(op);
    return copy(state);
  }
  _eligible(account, action = null) {
    const game = account?.game;
    return account?.authenticated === true && game?.enabled === true && game.freshReleaseReady === true &&
      !account.blockedByActiveGame && game.wagerAvailability !== 'house_capacity' &&
      (!action || game.betLevels.includes(action.bet) &&
        (!Array.isArray(game.availableBetLevels) || game.availableBetLevels.includes(action.bet)) &&
        MATH_KEYS.every(key => game[key] === action[key]) && minor(account.balance) >= minor(action.bet));
  }

  async connect() {
    const op = this._begin('connect');
    this._phase = 'CONNECTING'; this._receipt = null; this._notify();
    try {
      const account = await this._state(op);
      this._assert(op);
      const saved = this._read(account.sessionGuard);
      this._assert(op);
      this._account = account; this._pending = saved?.action ?? null;
      this._notBefore = Math.max(this._notBefore, saved?.retryAt ?? 0);
      this._phase = this._pending ? this._pending.gameId === this.gameId ? 'PENDING' : 'OTHER_GAME_PENDING'
        : this._eligible(account) ? 'READY' : 'UNAVAILABLE';
      this._notify();
      this._assert(op);
      return copy(account);
    } catch (error) { this._error(op, error); throw error; }
    finally { this._end(op); }
  }

  async spin(bet) {
    if (!this.canSpin) fail('ROUND_NOT_READY');
    const op = this._begin('spin'), guard = this._account.sessionGuard, shownModel = copy(this._account.game);
    let action = null;
    this._phase = 'CHECKING'; this._notify();
    try {
      const result = await this.lock('zplay-new72-round:' + guard, async () => {
        this._assert(op);
        const saved = this._read(guard);
        if (saved) {
          this._pending = saved.action;
          this._notBefore = Math.max(this._notBefore, saved.retryAt);
          fail('PENDING_ROUND_REQUIRES_RECOVERY');
        }
        const account = await this._state(op, guard);
        this._assert(op);
        if (MATH_KEYS.some(key => account.game[key] !== shownModel[key])) fail('GAME_RULES_UPDATED_RELOAD', 409);
        action = { gameId: this.gameId, bet, roundToken: this.uuid(), sessionGuard: guard,
          ...Object.fromEntries(MATH_KEYS.map(key => [key, account.game[key]])) };
        validAction(action, guard);
        if (!this._eligible(account, action)) { action = null; fail('WAGER_NOT_AVAILABLE'); }
        this._account = account;
        this._write(action); // Storage must succeed before a potentially accepted POST.
        this._pending = copy(action); this._phase = 'REQUESTING'; this._notify();
        let receipt;
        try { receipt = await this._once(op, '/api/slots/spin', action); }
        catch (error) {
          // Only an explicit, known initial pre-settlement rejection clears it.
          // A recovery failure can never erase a potentially accepted request.
          if (definitiveInitialRejection(error) && this._owns(action)) {
            this._remove(action); this._pending = null;
          }
          throw error;
        }
        return await this._accept(op, receipt, action, false);
      });
      this._assert(op);
      return result;
    } catch (error) { this._error(op, error); throw error; }
    finally { this._end(op); }
  }

  async recover() {
    if (!this._account || !this._pending || this._pending.gameId !== this.gameId ||
      !['PENDING', 'AUTH_REQUIRED'].includes(this._phase)) fail('ROUND_NOT_RECOVERABLE');
    const op = this._begin('recover'), action = copy(this._pending);
    this._phase = 'CONFIRMING'; this._notify();
    try {
      const result = await this.lock('zplay-new72-round:' + action.sessionGuard, async () => {
        this._assert(op);
        const saved = this._read(action.sessionGuard);
        if (!sameAction(saved?.action, action)) fail('PENDING_REQUEST_CHANGED');
        // Another cooperating tab may have received a later server deadline
        // after this instance loaded its pending request. Re-read it under the
        // same lock before even a read-only replay can contact the server.
        this._notBefore = Math.max(this._notBefore, saved.retryAt);
        let receipt;
        try { receipt = await this._readRetry(op, '/api/slots/spin', { ...action, replayOnly: true }); }
        catch (error) {
          if (error.status !== 404 || error.code !== 'ROUND_NOT_FOUND_FOR_REPLAY') throw error;
          this._assert(op);
          if (!this._owns(action)) fail('PENDING_REQUEST_CHANGED');
          // Only the authenticated explicit miss permits the same original POST.
          // Re-read current session/model/availability before it can become a wager.
          const account = await this._state(op, action.sessionGuard);
          this._assert(op);
          if (!this._eligible(account, action)) fail('SAVED_ROUND_REPLAY_ONLY');
          this._account = account;
          this._event({ operation: 'spin', attempt: 1, reason: 'authenticated_replay_miss_same_request' });
          receipt = await this._once(op, '/api/slots/spin', action);
        }
        return await this._accept(op, receipt, action, true);
      });
      this._assert(op);
      return result;
    } catch (error) { this._error(op, error); throw error; }
    finally { this._end(op); }
  }

  async _accept(op, receipt, action, recovering) {
    this._assert(op);
    envelope(receipt, action);
    await this.validateReceipt(copy(receipt), { action: copy(action), currentModel: copy(this._account.game), recovering });
    this._assert(op);
    this._remove(action);
    this._pending = null; this._receipt = copy(receipt); this._phase = 'SETTLED';
    // A receipt's historical balance can lag another tab's later settlement.
    // Call refresh() before enabling the next spin/AUTO; never calculate a balance.
    this._notify();
    this._assert(op);
    return copy(receipt);
  }

  async refresh() {
    if (!this._account || this._pending) fail('PENDING_ROUND_REQUIRES_RECOVERY');
    const op = this._begin('refresh'), guard = this._account.sessionGuard;
    this._phase = 'CHECKING'; this._notify();
    try {
      const account = await this._state(op, guard);
      this._assert(op);
      const saved = this._read(guard);
      this._account = account; this._pending = saved?.action ?? null;
      this._notBefore = Math.max(this._notBefore, saved?.retryAt ?? 0);
      this._phase = this._pending ? this._pending.gameId === this.gameId ? 'PENDING' : 'OTHER_GAME_PENDING'
        : this._eligible(account) ? 'READY' : 'UNAVAILABLE';
      this._notify();
      this._assert(op);
      return copy(account);
    } catch (error) { this._error(op, error); throw error; }
    finally { this._end(op); }
  }

  // Lifecycle only. STOP/TURBO belong to each renderer and have no method here.
  disconnect() {
    if (this._disposed) return;
    this._generation++; this._operation?.controller.abort(); this._operation = null;
    this._account = null; this._pending = null; this._receipt = null; this._phase = 'DISCONNECTED';
    this._lastError = null; this._notify(); // Persisted requests are retained for their original scope.
  }
  dispose() {
    if (this._disposed) return;
    this._disposed = true; this._generation++; this._operation?.controller.abort();
    this._operation = null; this._account = null; this._pending = null; this._receipt = null; this._phase = 'DISPOSED';
  }
}
