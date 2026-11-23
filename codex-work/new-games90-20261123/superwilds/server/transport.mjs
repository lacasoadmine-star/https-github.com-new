import { GAME_ID, minor, money, SuperWildsError } from './contract.mjs';
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
function gambleReceipt(event){
  if(!event||event.kind!=='GAMBLE'||event.gameId!==GAME_ID||event.currency!=='ETB'||
    !['RED','BLACK'].includes(event.choice)||!['RED','BLACK'].includes(event.color)||typeof event.won!=='boolean'||
    !Number.isSafeInteger(event.attempt)||event.attempt<1)fail('SUPERWILDS_SERVER_GAMBLE_RECEIPT_REQUIRED',503);
  return deepFreeze({...copy(event),pendingWinBeforeMinor:number(event.pendingWinBefore),pendingWinAfterMinor:number(event.pendingWinAfter),
    balanceMinor:number(event.walletReceipt.balanceAfter)});
}
function gambleState(value,roundId){
  if(!value)return null;
  if(typeof value.available!=='boolean'||!Number.isSafeInteger(value.attempt)||value.attempt<0||
    !Number.isSafeInteger(value.nextAttempt)||value.nextAttempt!==value.attempt+1||!Array.isArray(value.history))fail('SUPERWILDS_SERVER_GAMBLE_STATE_REQUIRED',503);
  return deepFreeze({...copy(value),roundId,pendingWinMinor:number(value.pendingWin),targetWinMinor:value.targetWin==null?null:number(value.targetWin),
    history:value.history.map(gambleReceipt)});
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
    const round = result.round?.result ? spinReceipt(result.round.result) : null;
    const pendingWinMinor = result.round ? number(result.round.pendingWin) : 0;
    const gamble=gambleState(result.gamble??result.round?.gamble,round?.roundId??null);
    return deepFreeze({ gameId: GAME_ID, authenticated: true, currency: 'ETB', enabled: result.game.enabled === true,
      subject: result.subject, canPlay: result.game.enabled === true &&
        (!result.blockedByActiveGame || result.blockedByActiveGame === GAME_ID),
      canDouble:typeof service.gamble==='function'&&gamble?.available===true&&pendingWinMinor>0,gamble,
      balanceMinor: number(result.balance), betLevelsMinor: result.game.betLevels.map(number),
      round: round ? { ...round, pendingWinMinor } : null, pendingWinMinor,
      blockedByActiveGame: result.blockedByActiveGame,
      engineVersion: result.game.engineVersion ?? null, mathVersion: result.game.mathVersion ?? null,
      mathSha256: result.game.mathSha256 ?? null });
  }
  function prepare(action) {
    if (!current) fail('SUPERWILDS_STATE_REQUIRED', 409);
    if (!action || action.gameId !== GAME_ID || !['SPIN', 'TAKE', 'DOUBLE'].includes(action.action)) fail('SUPERWILDS_UI_ACTION_INVALID');
    if (action.authority) return deepFreeze(copy(action));
    const accepted = action.action !== 'SPIN' ? current.round?.result : null;
    if(action.action==='DOUBLE'){
      const gamble=current.gamble??current.round?.gamble;
      if(typeof service.gamble!=='function'||gamble?.available!==true)fail('SUPERWILDS_APPROVED_DOUBLE_MODEL_REQUIRED',503);
      if(accepted?.roundId!==action.roundId||!['RED','BLACK'].includes(action.choice))fail('SUPERWILDS_GAMBLE_STATE_CHANGED',409);
      const pending=number(gamble.pendingWin);
      if(action.expectedPendingWinMinor!==undefined&&action.expectedPendingWinMinor!==pending||
        action.expectedAttempt!==undefined&&action.expectedAttempt!==gamble.nextAttempt||
        action.gambleVersion!==undefined&&action.gambleVersion!==gamble.version||action.gambleSha256!==undefined&&action.gambleSha256!==gamble.sha256)fail('SUPERWILDS_GAMBLE_STATE_CHANGED',409);
      return deepFreeze({...copy(action),betMinor:number(accepted.bet),expectedPendingWinMinor:pending,expectedAttempt:gamble.nextAttempt,
        gambleVersion:gamble.version,gambleSha256:gamble.sha256,authority:{bet:accepted.bet,roundId:accepted.roundId,
          engineVersion:accepted.engineVersion,mathVersion:accepted.mathVersion,mathSha256:accepted.mathSha256,
          choice:action.choice,expectedAttempt:gamble.nextAttempt,expectedPendingWin:gamble.pendingWin,
          gambleVersion:gamble.version,gambleSha256:gamble.sha256}});
    }
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
    const method=action.action==='TAKE'?'takeWin':action.action==='DOUBLE'?'gamble':'spin';
    if(typeof service[method]!=='function')fail('SUPERWILDS_APPROVED_DOUBLE_MODEL_REQUIRED',503);
    const result = await service[method](await request(), body);
    const round = action.action === 'SPIN' ? result : result.round;
    const receipt = action.action==='DOUBLE'?gambleReceipt(result):spinReceipt(round, action.action === 'TAKE' ? result.collection.walletReceipt.balanceAfter : null);
    // Read the actual host state after acceptance. In particular the next
    // SPIN prepares collection of the actual pending round, and recovery can
    // observe a later accepted action from another tab without overwriting it.
    const refreshed=await state();
    if(!refreshed.round?.roundId)fail('SUPERWILDS_SERVER_STATE_REQUIRED',503);
    const sameRound=refreshed.round.roundId===receipt.roundId,gamble=sameRound?refreshed.gamble:null;
    return deepFreeze({ ...receipt, action: action.action, acceptedAction: copy(action),
      balanceMinor:refreshed.balanceMinor,gamble,
      pendingWinMinor:action.action === 'TAKE' ? 0 : sameRound ? refreshed.pendingWinMinor : 0,
      ...(action.action === 'TAKE' ? { collectionId: result.collection.collectionId, collected: true,
        amountMinor: number(result.collection.amount),
        requestKey: result.requestKey } : {}) });
  }
  return Object.freeze({ state, prepare, dispatch: action => send(action, false), recover: action => send(action, true) });
}
