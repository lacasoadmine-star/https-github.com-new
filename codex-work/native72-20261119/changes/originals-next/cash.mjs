const prefix = '/api/slots/originals/';
const money = /^(0|[1-9][0-9]*)\.[0-9]{2}$/;
const token = /^[a-f0-9-]{36}$/i;
const rejected = new Set(['INSUFFICIENT_FUNDS', 'GAME_BET_OR_TOKEN_INVALID', 'GAME_RULES_UPDATED_RELOAD',
  'HOUSE_RESERVE_INSUFFICIENT', 'SLOT_RELEASE_NOT_ENABLED', 'IDEMPOTENCY_PARAMETER_CONFLICT']);
const cents = amount => BigInt(amount.replace('.', ''));

export class CashGame {
  constructor(game, { fetcher = globalThis.fetch.bind(globalThis), storage = globalThis.sessionStorage } = {}) {
    this.game = game;
    this.id = game.slug.replaceAll('-', '_');
    this.fetcher = fetcher;
    this.storage = storage;
    this.current = null;
    this.busy = false;
    this.generation = 0;
  }

  async request(action, body) {
    const response = await this.fetcher(prefix + action, {
      method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.detail || 'PLAYER_GAME_UNAVAILABLE');
    return data;
  }

  async read() {
    const session = await this.request('session');
    if (!session.authenticated || session.currency !== 'ETB' || typeof session.identity !== 'string' || !money.test(session.balance)) {
      throw Error('PLAYER_LOGIN_REQUIRED');
    }
    const model = session.nextGames?.find(item => item.id === this.id);
    if (!session.enabled || !model || model.rows !== this.game.rows || model.columns !== this.game.columns ||
        typeof model.mathVersion !== 'string' || !/^[a-f0-9]{64}$/.test(model.mathSha256 ?? '') ||
        !Array.isArray(model.betLevels) || !model.betLevels.length || !model.betLevels.every(bet => money.test(bet) && cents(bet) > 0n)) {
      throw Error('GAME_NOT_REGISTERED');
    }
    return { identity: session.identity, balance: session.balance, model };
  }

  async connect() {
    const generation = ++this.generation;
    this.current = null;
    const current = await this.read();
    if (generation !== this.generation) throw Error('PLAYER_SESSION_CHANGED');
    this.current = current;
    return current;
  }

  invalidate() { this.generation++; this.current = null; }

  async spin(bet) {
    if (this.busy || !this.current) throw Error('PLAYER_GAME_UNAVAILABLE');
    this.busy = true;
    const current = this.current;
    const generation = this.generation;
    const key = 'zplay:originals:round:' + this.id + ':' + current.identity;
    let pending;
    try {
      const fresh = await this.read();
      if (this.generation !== generation || fresh.identity !== current.identity ||
          fresh.model.mathVersion !== current.model.mathVersion || fresh.model.mathSha256 !== current.model.mathSha256) {
        if (this.generation === generation) this.invalidate();
        throw Error('PLAYER_SESSION_CHANGED');
      }
      pending = JSON.parse(this.storage.getItem(key) || 'null');
      if (pending && (!token.test(pending.roundToken) || pending.identity !== current.identity || pending.gameId !== this.id ||
          !fresh.model.betLevels.includes(pending.bet) || pending.mathVersion !== fresh.model.mathVersion)) {
        throw Error('SAVED_ROUND_REQUIRES_REVIEW');
      }
      if (!pending) {
        if (!fresh.model.betLevels.includes(bet)) throw Error('GAME_BET_OR_TOKEN_INVALID');
        pending = { gameId: this.id, bet, identity: current.identity,
          mathVersion: fresh.model.mathVersion, roundToken: crypto.randomUUID() };
        this.storage.setItem(key, JSON.stringify(pending));
      }
      const result = await this.request('spin', pending);
      const validGrid = Array.isArray(result.grid) && result.grid.length === this.game.columns && result.grid.every(
        reel => Array.isArray(reel) && reel.length === this.game.rows &&
          reel.every(symbol => Number.isInteger(symbol) && symbol >= 0 && symbol < this.game.symbols.length),
      );
      if (!result.walletSettled || result.currency !== 'ETB' || result.gameId !== this.id ||
          result.mathVersion !== fresh.model.mathVersion || result.mathSha256 !== fresh.model.mathSha256 ||
          !token.test(result.roundId) || !validGrid || !this.game.multipliers.includes(result.wheelMultiplier) ||
          !Array.isArray(result.lines) || !result.lines.every(line => Number.isInteger(line) && this.game.lines[line]) ||
          ![result.balanceBefore, result.balanceAfter, result.chargedStake, result.finalWin].every(value => money.test(value)) ||
          result.chargedStake !== pending.bet ||
          cents(result.balanceBefore) - cents(result.chargedStake) + cents(result.finalWin) !== cents(result.balanceAfter)) {
        throw Error('ROUND_RECEIPT_UNVERIFIED');
      }
      const after = await this.read();
      if (this.generation !== generation || after.identity !== current.identity ||
          after.model.mathSha256 !== fresh.model.mathSha256 || after.model.mathVersion !== fresh.model.mathVersion) {
        if (this.generation === generation) this.invalidate();
        throw Error('PLAYER_SESSION_CHANGED');
      }
      this.current = after;
      this.clearPending(key, pending);
      return { ...result, displayBalance: after.balance };
    } catch (error) {
      if (pending && rejected.has(error.message)) this.clearPending(key, pending);
      throw error;
    } finally {
      this.busy = false;
    }
  }

  clearPending(key, pending) {
    if (this.storage.getItem(key) === JSON.stringify(pending)) this.storage.removeItem(key);
  }
}
