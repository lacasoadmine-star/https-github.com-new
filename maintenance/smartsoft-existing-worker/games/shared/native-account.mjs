import {
  ExpansionSession, bindPlayerEvents, getRoundActions, moneyMinor, fromMinor, formatMoney,
} from '/native-library/remaining20/20261110-rounds-r21/5fddea498e1f0d39/session.mjs';

// One canonical transport for the existing nine operator models. In-flight
// actions retain ExpansionSession's original storage keys and exact requests.
export {getRoundActions, moneyMinor, fromMinor, formatMoney};
export const NATIVE_ACCOUNT_IDS = Object.freeze([
  'multihot100_native', 'habeshafortune5_native', 'multihotwildways_native',
  'multihot5wild_native', 'multihot5superwilds_native', 'multihotdeluxe_native',
  'burningice_native', 'burningice10_native', 'burningice40_native',
]);
const IDS = new Set(NATIVE_ACCOUNT_IDS);
const ACTIONS = new Set(['collect', 'gamble']);
const MINOR = /^(0|[1-9]\d{0,18})$/;
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export class NativeAccountError extends Error {
  constructor(code, message = code) { super(message); this.name = 'NativeAccountError'; this.code = code; }
}
const fail = code => { throw new NativeAccountError(code); };
function copy(value, code = 'INVALID_SERVER_RESPONSE', maximum = 1024 * 1024) {
  let text;
  try { text = JSON.stringify(value); } catch { fail(code); }
  if (typeof text !== 'string' || text.length > maximum) fail(code);
  return JSON.parse(text);
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const item of Object.values(value)) if (item && typeof item === 'object' && !Object.isFrozen(item)) freeze(item);
  }
  return value;
}
function minorField(value, code = 'INVALID_RECEIPT_MONEY') {
  if (typeof value !== 'string' || !MINOR.test(value)) fail(code);
  return value;
}
function gridFor(grid, game) {
  if (!Array.isArray(grid) || grid.length !== game.columns) fail('INVALID_RECEIPT_GRID');
  const symbols = new Set(game.symbols.map(symbol => String(symbol.id)));
  return grid.map(column => {
    if (!Array.isArray(column) || column.length !== game.rows) fail('INVALID_RECEIPT_GRID');
    return column.map(symbol => {
      if (!['string', 'number'].includes(typeof symbol) || !symbols.has(String(symbol))) fail('INVALID_RECEIPT_SYMBOL');
      return String(symbol);
    });
  });
}
function featureFor(feature, game) {
  if (feature === undefined || feature === null) return {};
  if (!plain(feature)) fail('INVALID_RECEIPT_FEATURE');
  const result = copy(feature, 'INVALID_RECEIPT_FEATURE', 256 * 1024);
  for (const name of ['frozenReels', 'coinReels']) if (own(result, name)) {
    if (!Array.isArray(result[name]) || result[name].some(column => !Number.isInteger(column) || column < 0 || column >= game.columns)) fail('INVALID_RECEIPT_FEATURE');
  }
  if (own(result, 'addedWilds') && (!Array.isArray(result.addedWilds) || result.addedWilds.some(cell =>
    !Array.isArray(cell) || cell.length !== 2 || !Number.isInteger(cell[0]) || !Number.isInteger(cell[1]) ||
    cell[0] < 0 || cell[0] >= game.columns || cell[1] < 0 || cell[1] >= game.rows))) fail('INVALID_RECEIPT_FEATURE');
  if (own(result, 'multiplier') && (!Number.isSafeInteger(result.multiplier) || result.multiplier < 1)) fail('INVALID_RECEIPT_FEATURE');
  return result;
}
function frameFor(frame, game) {
  if (!plain(frame)) fail('INVALID_RECEIPT_FRAME');
  const result = copy(frame, 'INVALID_RECEIPT_FRAME');
  if (own(frame, 'grid')) result.grid = gridFor(frame.grid, game);
  if (own(frame, 'feature')) result.feature = featureFor(frame.feature, game);
  if (own(frame, 'wins') && !Array.isArray(frame.wins)) fail('INVALID_RECEIPT_FRAME');
  for (const field of ['payoutMinor', 'winMinor', 'baseWinMinor', 'currentCashoutMinor']) {
    if (own(frame, field)) minorField(frame[field]);
  }
  return result;
}

export function normalizeNativeRound(round, game) {
  if (round === null || round === undefined) return null;
  if (!plain(round) || !['active', 'settled'].includes(round.status)) fail('INVALID_RECEIPT_STATUS');
  if (round.game_id !== game.id || typeof round.round_id !== 'string' || !round.round_id || round.round_id.length > 160 ||
      !Number.isSafeInteger(round.version) || round.version < 0 || round.model_version !== game.version) fail('INVALID_RECEIPT_IDENTITY');
  if (own(round, 'gameId') && round.gameId !== game.id || own(round, 'modelVersion') && round.modelVersion !== game.version) fail('INVALID_RECEIPT_IDENTITY');
  const result = copy(round);
  result.stakeMinor = minorField(round.stakeMinor);
  if (round.status === 'active') {
    result.amountMinor = minorField(round.currentCashoutMinor);
    if (round.payoutMinor !== undefined && round.payoutMinor !== null) fail('INVALID_ACTIVE_RECEIPT');
  } else result.amountMinor = minorField(round.payoutMinor);
  for (const field of ['baseWinMinor', 'lockedPayoutMinor']) if (own(round, field)) minorField(round[field]);
  result.grid = gridFor(round.grid, game); // column-major; never transpose a receipt
  result.feature = featureFor(round.feature, game);
  if (round.wins !== undefined && !Array.isArray(round.wins)) fail('INVALID_RECEIPT_WINS');
  result.wins = copy(round.wins ?? []);
  const frames = round.frames ?? round.bonusFrames ?? [];
  if (!Array.isArray(frames) || frames.length > 4096) fail('INVALID_RECEIPT_FRAMES');
  result.frames = frames.map(frame => frameFor(frame, game));
  const suppliedActions = getRoundActions(round, game);
  result.actions = suppliedActions.filter(action => ACTIONS.has(action));
  result.unsupportedActions = suppliedActions.filter(action => !ACTIONS.has(action));
  const last = round.lastGamble ?? (Array.isArray(round.gambleHistory) ? round.gambleHistory.at(-1) : null);
  if (last !== null && last !== undefined && !plain(last)) fail('INVALID_GAMBLE_RECEIPT');
  result.lastGamble = last ? copy(last) : null;
  return freeze(result);
}

const initialState = game => ({
  connected: false, authenticated: false, game, balance: null, balanceMinor: null,
  currency: 'ETB', sessionId: '', round: null, accepting: false, busy: false,
  pending: false, confirming: false, recoveryBlocked: false, otherActiveGame: null,
  error: false, message: 'Connecting to your player account…',
  canStart: false, canCollect: false, canGamble: false, actions: [],
});

export class NativeAccount {
  constructor({gameId, game, onChange = () => {}, fetchImpl = globalThis.fetch?.bind(globalThis),
    storage, target = globalThis.window, uuid, now, pause, timeoutMs} = {}) {
    if (!IDS.has(gameId) || !plain(game) || game.id !== gameId || typeof game.version !== 'string' || !game.version ||
        !Number.isInteger(game.columns) || !Number.isInteger(game.rows) || game.columns < 1 || game.rows < 1 ||
        !Array.isArray(game.symbols) || !game.symbols.length || typeof fetchImpl !== 'function') fail('INVALID_GAME_CONFIG');
    this.gameId = gameId;
    this.game = freeze(copy(game, 'INVALID_GAME_CONFIG'));
    this.fetch = fetchImpl;
    this.onChange = onChange;
    this.disposed = false;
    this.invalid = false;
    this.initializing = true;
    this.state = freeze(initialState(this.game));
    if (storage === undefined) { try { storage = globalThis.sessionStorage; } catch { storage = null; } }
    const options = {gameId, fetchImpl, storage, onChange: state => this.receive(state)};
    for (const [name, value] of Object.entries({uuid, now, pause, timeoutMs})) if (value !== undefined) options[name] = value;
    this.session = new ExpansionSession(options);
    this.session.setGame(this.game);
    this.unbind = target?.addEventListener ? bindPlayerEvents(target, this.session) : () => {};
    this.initializing = false;
    queueMicrotask(() => { if (!this.disposed) this.emit(); });
  }

  emit() { if (!this.initializing && !this.disposed) this.onChange(this.state); }
  receive(raw) {
    if (this.disposed) return;
    try {
      if (raw.currency !== 'ETB' || raw.demo === true || raw.demoCreditsOnly === true) fail('INVALID_ACCOUNT_CURRENCY');
      const game = raw.game ?? this.game;
      if (game.id !== this.gameId || game.version !== this.game.version) fail('GAME_RULES_UPDATED_RELOAD');
      if (raw.authenticated && (typeof raw.sessionId !== 'string' || !raw.sessionId || raw.sessionId.length > 512 || moneyMinor(raw.balance) === null)) fail('INVALID_ACCOUNT_STATE');
      const round = raw.authenticated ? normalizeNativeRound(raw.round, {...game, columns: this.game.columns, rows: this.game.rows, symbols: this.game.symbols}) : null;
      const ready = raw.connected === true && raw.authenticated === true && raw.error !== true;
      const actions = ready && round?.status === 'active' ? [...round.actions] : [];
      this.invalid = false;
      this.state = freeze({
        ...initialState(this.game), ...raw, game: copy(game), currency: 'ETB', round,
        balance: raw.authenticated ? raw.balance : null,
        balanceMinor: raw.authenticated && moneyMinor(raw.balance) !== null ? moneyMinor(raw.balance).toString() : null,
        pending: raw.pending === true || !!this.session?.pending,
        canStart: ready && this.session?.canStart() === true,
        canCollect: ready && actions.includes('collect') && this.session?.canAct('collect') === true,
        canGamble: ready && actions.includes('gamble') && round.gambleAvailable !== false &&
          round.gambleAttemptsRemaining !== 0 && this.session?.canAct('gamble') === true,
        actions,
      });
    } catch (error) {
      this.invalid = true;
      this.state = freeze({...initialState(this.game), busy: raw.busy === true,
        pending: raw.pending === true || !!this.session?.pending, recoveryBlocked: true,
        error: true, code: error.code ?? 'INVALID_SERVER_RESPONSE',
        message: 'The game response could not be verified. Refresh the connection before playing.'});
    }
    this.emit();
  }

  async refresh(options) {
    if (this.disposed) return null;
    const result = await this.session.refresh(options);
    return result && !this.invalid ? this.state : null;
  }
  async start(stake, options = {}) {
    if (this.disposed || this.invalid || !this.state.canStart) return false;
    return await this.session.start(stake, options) === true && !this.invalid;
  }
  async act(action, input = {}) {
    if (this.disposed || this.invalid || !ACTIONS.has(action) ||
        action === 'collect' && !this.state.canCollect || action === 'gamble' && !this.state.canGamble) return false;
    if (action === 'gamble' && !['red', 'black'].includes(input?.color)) return false;
    return await this.session.act(action, input) === true && !this.invalid;
  }
  collect() { return this.act('collect'); }
  gamble(color) { return this.act('gamble', {color}); }
  async retry() {
    if (this.disposed) return false;
    return await this.session.retry() === true && !this.invalid;
  }
  async history(sort = 'recent') {
    if (this.disposed || !this.state.authenticated || !this.state.sessionId) fail('PLAYER_LOGIN_REQUIRED');
    if (!['recent', 'wins'].includes(sort)) fail('INVALID_HISTORY_ORDER');
    const sessionId = this.state.sessionId;
    const response = await this.fetch('/api/remaining20/history?game_id=' + encodeURIComponent(this.gameId) + '&sort=' + sort,
      {credentials: 'same-origin', cache: 'no-store', headers: {accept: 'application/json'}});
    let data;
    try { data = await response.json(); } catch { fail('INVALID_HISTORY_RESPONSE'); }
    if (!response.ok || data.currency !== 'ETB' || data.demo === true || data.demoCreditsOnly === true ||
        data.game_id !== this.gameId || data.sessionId !== sessionId || this.state.sessionId !== sessionId ||
        !Array.isArray(data.rows) || data.rows.length > 4096) fail('INVALID_HISTORY_RESPONSE');
    return freeze(data.rows.map(entry => {
      const row = copy(entry, 'INVALID_HISTORY_RESPONSE');
      if (!plain(row) || !plain(row.round) || row.round.game_id !== this.gameId || row.round.status !== 'settled') fail('INVALID_HISTORY_RESPONSE');
      minorField(row.round.stakeMinor, 'INVALID_HISTORY_RESPONSE');
      minorField(row.round.payoutMinor, 'INVALID_HISTORY_RESPONSE');
      return row;
    }));
  }
  dispose() { this.disposed = true; this.unbind(); }
}
