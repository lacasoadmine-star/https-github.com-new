import { GAME_ID, minor, money, SuperWildsError } from './lifecycle.mjs';
const copy = value => structuredClone(value);
const fail = (code, status = 400) => { throw new SuperWildsError(code, status); };
const units = value => {
  if (!Number.isSafeInteger(value) || value < 0) fail('SUPERWILDS_UI_MINOR_INVALID');
  return BigInt(value);
};
const number = value => {
  const n = minor(value);
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) fail('SUPERWILDS_UI_MINOR_OVERFLOW', 503);
  return Number(n);
};
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}
function spinReceipt(round, stateBalance = null) {
  if (!round || round.gameId !== GAME_ID || round.kind !== 'SPIN' || !Array.isArray(round.grid) || round.grid.length !== 3 ||
    !round.grid.every(row => Array.isArray(row) && row.length === 5)) fail('SUPERWILDS_SERVER_RECEIPT_REQUIRED', 503);
  return deepFreeze({ gameId: GAME_ID, currency: 'ETB', requestKey: round.requestKey, roundId: round.roundId,
    // UI/canvas contract is columns first; the database/legacy engine remains
    // rows first. Conversion never changes a symbol or chooses an outcome.
    grid: Array.from({ length: 5 }, (_, c) => round.grid.map(row => row[c])),
    multiplier: round.multiplier ?? 1, betMinor: number(round.bet), winMinor: number(round.winAmount),
    balanceMinor: number(stateBalance ?? round.walletReceipt.balanceAfter), winningLines: copy(round.winLines),
    pendingWinMinor: round.collectionStatus === 'PENDING' ? number(round.winAmount) : 0,
    engineVersion: round.engineVersion, mathVersion: round.mathVersion, mathSha256: round.mathSha256 });
}

/** Explicit renderer transport facade, with no financial rule in the browser.
 * `request()` must reuse the actual authenticated request/session. `prepare`
 * snapshots exact semantic authority before dispatch; persist that action with
 * the request key. `recover` requires that same snapshot after reconnection.
 * Session guards are refreshed from state, never used as an RNG or balance.
 */
export function createSuperWildsTransport({ service, request } = {}) {
  if (!service || !['state', 'spin', 'takeWin'].every(k => typeof service[k] === 'function') || typeof request !== 'function') {
    fail('SUPERWILDS_EXISTING_SERVICE_REQUIRED', 503);
  }
  let current = null;
  async function state() {
    const result = await service.state(await request(), GAME_ID);
    if (result?.gameId !== GAME_ID || result.currency !== 'ETB' || result.authenticated !== true || !result.game) {
      fail('SUPERWILDS_SERVER_STATE_REQUIRED', 503);
    }
    current = copy(result);
    const round = result.round?.result ? spinReceipt(result.round.result, result.balance) : null;
    const pendingWinMinor = result.round ? number(result.round.pendingWin) : 0;
    return deepFreeze({ gameId: GAME_ID, authenticated: true, currency: 'ETB', enabled: result.game.enabled === true,
      subject: result.subject, canPlay: result.game.enabled === true &&
        (!result.blockedByActiveGame || result.blockedByActiveGame === GAME_ID), canDouble: false,
      balanceMinor: number(result.balance), betLevelsMinor: result.game.betLevels.map(number),
      round: round ? { ...round, pendingWinMinor } : null, pendingWinMinor,
      blockedByActiveGame: result.blockedByActiveGame,
      engineVersion: result.game.engineVersion ?? null, mathVersion: result.game.mathVersion ?? null,
      mathSha256: result.game.mathSha256 ?? null });
  }
  function prepare(action) {
    if (!current) fail('SUPERWILDS_STATE_REQUIRED', 409);
    if (!action || action.gameId !== GAME_ID || !['SPIN', 'TAKE', 'DOUBLE'].includes(action.action)) fail('SUPERWILDS_UI_ACTION_INVALID');
    if (action.action === 'DOUBLE') fail('SUPERWILDS_APPROVED_DOUBLE_MODEL_REQUIRED', 503);
    if (action.authority) return deepFreeze(copy(action));
    const accepted = action.action === 'TAKE' ? current.round?.result : null;
    if (action.action === 'TAKE' && accepted?.roundId !== action.roundId) fail('SUPERWILDS_COLLECTION_STATE_CHANGED', 409);
    const model = accepted ?? current.game;
    if (!model?.engineVersion || !model.mathVersion || !model.mathSha256) fail('SUPERWILDS_APPROVED_OWN_MODEL_REQUIRED', 503);
    const bet = action.action === 'TAKE' ? accepted.bet : money(units(action.betMinor));
    return deepFreeze({ ...copy(action), authority: { bet, engineVersion: model.engineVersion,
      mathVersion: model.mathVersion, mathSha256: model.mathSha256,
      ...(action.action === 'SPIN' ? { collectRoundId: action.collectRoundId ??
        (current.round?.pendingWin !== '0.00' ? current.round?.result?.roundId ?? null : null) } : { roundId: action.roundId }) } });
  }
  async function send(input, replayOnly) {
    if (!current || replayOnly) await state();
    // During recovery never reconstruct the old bet/model/collection identity
    // from today's UI state. The controller must retain the prepared action.
    if (replayOnly && !input?.authority) fail('SUPERWILDS_ORIGINAL_ACTION_REQUIRED', 409);
    const action = prepare(input);
    if (action.gameId !== GAME_ID) fail('SUPERWILDS_UI_ACTION_INVALID');
    const body = { gameId: GAME_ID, roundToken: action.requestKey, sessionGuard: current.sessionGuard,
      ...copy(action.authority), ...(replayOnly ? { replayOnly: true } : {}) };
    const result = await service[action.action === 'TAKE' ? 'takeWin' : 'spin'](await request(), body);
    const round = action.action === 'TAKE' ? result.round : result;
    const receipt = spinReceipt(round, action.action === 'TAKE' ? result.collection.walletReceipt.balanceAfter : null);
    // Read the actual host state after acceptance. In particular the next
    // SPIN prepares collection of the actual pending round, and recovery can
    // observe a later accepted action from another tab without overwriting it.
    const fresh = await state();
    if (!fresh.round?.roundId) fail('SUPERWILDS_READBACK_ROUND_MISSING', 503);
    const sameRound = fresh.round.roundId === receipt.roundId;
    return deepFreeze({ ...receipt, balanceMinor: fresh.balanceMinor,
      action: action.action, acceptedAction: copy(action),
      pendingWinMinor: action.action === 'TAKE' ? 0 : sameRound ? fresh.round.pendingWinMinor : 0,
      ...(action.action === 'TAKE' ? { collectionId: result.collection.collectionId, collected: true,
        amountMinor: number(result.collection.amount),
        requestKey: result.requestKey } : {}) });
  }
  return Object.freeze({ state, prepare, dispatch: action => send(action, false), recover: action => send(action, true) });
}
