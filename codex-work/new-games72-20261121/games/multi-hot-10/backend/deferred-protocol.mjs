import { GAME_ID, UUID, HASH, MATH_KEYS, copy, fail, freeze, mathIdentity, minor, validGrid } from './contract.mjs';
import { SYMBOLS } from '../evaluator.mjs';

export const DEFERRED_PATHS = freeze({
  state: '/api/slots/fresh-state?gameId=' + GAME_ID,
  spin: '/api/slots/spin',
  // Reserved new-game route. This source does not register or call it itself.
  collect: '/api/slots/new-games72/multi-hot-10/collect',
  gamble: '/api/slots/new-games72/multi-hot-10/gamble',
});
const common = ['gameId', 'bet', 'roundToken', 'sessionGuard', ...MATH_KEYS, 'replayOnly'];
export function validateDeferredBody(input, kind) {
  const specific = kind === 'SPIN' ? ['collectRoundId'] : kind === 'TAKE_WIN' ? ['roundId'] : ['roundId', 'choice', 'expectedAttempt', 'expectedWinAmount'];
  if (!['SPIN', 'TAKE_WIN', 'GAMBLE'].includes(kind) || !input || typeof input !== 'object' || Array.isArray(input) || input.gameId !== GAME_ID ||
    Object.keys(input).some(key => ![...common, ...specific].includes(key)) ||
    !common.filter(key => key !== 'replayOnly').every(key => Object.hasOwn(input, key))) fail('INVALID_EXISTING_SPIN_REQUEST', 400);
  if (!UUID.test(input.roundToken ?? '')) fail('ROUND_TOKEN_INVALID', 400);
  if (!HASH.test(input.sessionGuard ?? '')) fail('PLAYER_SESSION_CHANGED', 403);
  if (minor(input.bet) <= 0n) fail('INVALID_ETB_AMOUNT', 400);
  mathIdentity(input);
  if (input.replayOnly !== undefined && typeof input.replayOnly !== 'boolean') fail('INVALID_REPLAY_FLAG', 400);
  if (kind === 'SPIN' && input.collectRoundId !== null && !UUID.test(input.collectRoundId ?? '')) fail('M10_COLLECTION_BINDING_REQUIRED', 400);
  if (kind !== 'SPIN' && !UUID.test(input.roundId ?? '')) fail('M10_COLLECTION_BINDING_REQUIRED', 400);
  if (kind === 'GAMBLE' && (!['red', 'black'].includes(input.choice) || !Number.isSafeInteger(input.expectedAttempt) ||
    input.expectedAttempt < 1 || minor(input.expectedWinAmount) <= 0n)) fail('M10_GAMBLE_REQUEST_INVALID', 400);
  return freeze(copy(input));
}
export function wireBody(action, replayOnly = false) {
  const { kind, ...body } = action;
  if (Object.hasOwn(body, 'replayOnly')) fail('M10_SAVED_ACTION_INVALID');
  validateDeferredBody(body, kind);
  return replayOnly ? { ...copy(body), replayOnly: true } : copy(body);
}
export async function retainedDeferredMath(resolveMath, identity) {
  const key = freeze({ gameId: GAME_ID, ...mathIdentity(identity) });
  const model = await resolveMath(key);
  if (!model || model.gameId !== GAME_ID || MATH_KEYS.some(name => model[name] !== key[name]) ||
    model.fullEngineVerified !== true || model.outcomeLegalityVerified !== true ||
    model.collectionLifecycleVerified !== true || model.roundingVerified !== true ||
    typeof model.verifyDeferredRound !== 'function') fail('M10_RETAINED_DEFERRED_MATH_UNAVAILABLE');
  return model;
}
function collectionEnvelope(value, round = null, expectedAmount = round?.winAmount) {
  if (!value || value.schema !== 'zplay/m10-collection-receipt/v1' || value.gameId !== GAME_ID ||
    value.currency !== 'ETB' || value.collected !== true || !UUID.test(value.collectionId ?? '') ||
    !UUID.test(value.roundId ?? '') || minor(value.bet) <= 0n || minor(value.amount) <= 0n) fail('M10_COLLECTION_RECEIPT_INVALID');
  mathIdentity(value);
  const wallet = value.walletReceipt;
  if (!wallet || wallet.currency !== 'ETB' || wallet.creditedWin !== value.amount ||
    minor(wallet.balanceBefore) + minor(wallet.creditedWin) !== minor(wallet.balanceAfter)) fail('M10_COLLECTION_WALLET_MISMATCH');
  if (round && (value.roundId !== round.roundId || value.bet !== round.bet || value.amount !== expectedAmount ||
    MATH_KEYS.some(key => value[key] !== round[key]))) fail('M10_COLLECTION_ROUND_MISMATCH');
  return value;
}
async function roundEnvelope(round, action, resolveMath) {
  if (!round || round.schema !== 'zplay/m10-deferred-round-receipt/v1' || round.kind !== 'SPIN' ||
    round.gameId !== GAME_ID || round.requestKey !== action.roundToken || !UUID.test(round.roundId ?? '') ||
    round.bet !== action.bet || round.currency !== 'ETB' || MATH_KEYS.some(key => round[key] !== action[key]) ||
    !validGrid(round.grid) || !Number.isInteger(round.multiplier) || round.multiplier < 1 || round.multiplier > 5) {
    fail('M10_DEFERRED_RECEIPT_IDENTITY_MISMATCH');
  }
  const win = minor(round.winAmount), wallet = round.walletReceipt;
  if (round.collectionStatus !== (win > 0n ? 'PENDING' : 'NOT_REQUIRED') || !wallet || wallet.currency !== 'ETB' ||
    wallet.chargedStake !== action.bet || wallet.creditedWin !== '0.00' || wallet.reservedWin !== round.winAmount ||
    minor(wallet.balanceBefore) - minor(wallet.chargedStake) !== minor(wallet.balanceAfter)) fail('M10_DEFERRED_WALLET_MISMATCH');
  if (action.collectRoundId === null ? round.previousCollection !== null : round.previousCollection?.roundId !== action.collectRoundId) {
    fail('M10_PREVIOUS_COLLECTION_MISMATCH');
  }
  if (round.previousCollection) collectionEnvelope(round.previousCollection);
  const model = await retainedDeferredMath(resolveMath, action);
  if (await model.verifyDeferredRound(copy(round), { action: copy(action) }) !== true) fail('M10_DEFERRED_MATH_REJECTED');
  return freeze({ gameId: GAME_ID, requestKey: round.requestKey, roundId: round.roundId,
    bet: round.bet, winAmount: round.winAmount, grid: copy(round.grid), multiplier: round.multiplier });
}
const actionForRound = round => ({ kind: 'SPIN', gameId: GAME_ID, bet: round.bet,
  roundToken: round.requestKey, ...mathIdentity(round), collectRoundId: round.previousCollection?.roundId ?? null });

const format = value => String(value / 100n) + '.' + String(value % 100n).padStart(2, '0');
export async function validateGambleHistory(history, round, resolveMath) {
  if (!Array.isArray(history)) fail('M10_GAMBLE_HISTORY_INVALID');
  let pending = minor(round.winAmount);
  if (!history.length) return round.winAmount;
  const model = await retainedDeferredMath(resolveMath, round);
  if (model.gambleRulesVerified !== true || model.gambleDistributionVerified !== true || typeof model.verifyGambleAction !== 'function') fail('M10_RETAINED_GAMBLE_MATH_UNAVAILABLE');
  for (let i = 0; i < history.length; i++) {
    const event = history[i], wallet = event?.walletReceipt;
    if (!event || event.schema !== 'zplay/m10-gamble-event/v1' || event.kind !== 'GAMBLE' || event.gameId !== GAME_ID ||
      event.roundId !== round.roundId || event.bet !== round.bet || MATH_KEYS.some(key => event[key] !== round[key]) ||
      !UUID.test(event.requestKey ?? '') || !UUID.test(event.gambleId ?? '') || event.attempt !== i + 1 ||
      pending <= 0n || event.pendingWinBefore !== format(pending) || !['red', 'black'].includes(event.choice) ||
      !['red', 'black'].includes(event.winningColor) || event.won !== (event.choice === event.winningColor) ||
      !wallet || wallet.currency !== 'ETB' || wallet.chargedStake !== '0.00' || wallet.creditedWin !== '0.00' ||
      minor(wallet.balanceBefore) !== minor(wallet.balanceAfter)) fail('M10_GAMBLE_HISTORY_INVALID');
    pending = event.won ? pending * 2n : 0n;
    if (event.pendingWinAfter !== format(pending) || await model.verifyGambleAction(copy(event), {
      round: copy(round), previousActions: copy(history.slice(0, i)),
    }) !== true) fail('M10_GAMBLE_HISTORY_REJECTED');
  }
  return format(pending);
}

export async function validateDeferredReceipt(receipt, action, resolveMath) {
  if (!receipt || receipt.gameId !== GAME_ID || receipt.requestKey !== action.roundToken || receipt.kind !== action.kind ||
    receipt.bet !== action.bet || MATH_KEYS.some(key => receipt[key] !== action[key])) fail('M10_DEFERRED_RECEIPT_IDENTITY_MISMATCH');
  if (action.kind === 'SPIN') return freeze({ view: await roundEnvelope(receipt, action, resolveMath), acknowledgement: null });
  if (action.kind === 'GAMBLE') {
    if (receipt.schema !== 'zplay/m10-gamble-receipt/v1' || receipt.roundId !== action.roundId || receipt.round?.roundId !== action.roundId ||
      receipt.round.bet !== action.bet || MATH_KEYS.some(key => receipt.round[key] !== action[key]) ||
      receipt.attempt !== action.expectedAttempt || receipt.choice !== action.choice || receipt.pendingWinBefore !== action.expectedWinAmount) fail('M10_GAMBLE_RECEIPT_IDENTITY_MISMATCH');
    const view = await roundEnvelope(receipt.round, actionForRound(receipt.round), resolveMath);
    const win = await validateGambleHistory(receipt.gambleActions, receipt.round, resolveMath);
    const last = receipt.gambleActions.at(-1);
    if (!last || last.requestKey !== action.roundToken || last.gambleId !== receipt.gambleId || last.pendingWinAfter !== receipt.pendingWinAfter ||
      last.choice !== receipt.choice || last.winningColor !== receipt.winningColor || last.won !== receipt.won) fail('M10_GAMBLE_RECEIPT_IDENTITY_MISMATCH');
    return freeze({ view: { ...view, winAmount: win }, acknowledgement: null, gamble: copy(last) });
  }
  if (action.kind !== 'TAKE_WIN' || receipt.schema !== 'zplay/m10-take-receipt/v1' || receipt.collected !== true ||
    receipt.roundId !== action.roundId || receipt.round?.roundId !== action.roundId || receipt.round.bet !== action.bet ||
    MATH_KEYS.some(key => receipt.round[key] !== action[key])) fail('M10_TAKE_RECEIPT_IDENTITY_MISMATCH');
  const view = await roundEnvelope(receipt.round, actionForRound(receipt.round), resolveMath);
  const win = await validateGambleHistory(receipt.collection?.gambleActions ?? [], receipt.round, resolveMath);
  collectionEnvelope(receipt.collection, receipt.round, win);
  return freeze({ view: { ...view, winAmount: win }, acknowledgement: { gameId: GAME_ID, requestKey: action.roundToken,
    roundId: action.roundId, collected: true } });
}

export async function validateDeferredState(state, resolveMath) {
  if (state?.authenticated !== true) fail('PLAYER_LOGIN_REQUIRED', 401);
  if (state.currency !== 'ETB' || !HASH.test(state.sessionGuard ?? '') || state.game?.id !== GAME_ID ||
    typeof state.game.enabled !== 'boolean' || typeof state.game.freshReleaseReady !== 'boolean') fail('INVALID_PLAYER_STATE');
  minor(state.balance);
  const game = state.game;
  if (game.enabled || game.freshReleaseReady) {
    if (game.currency !== 'ETB' || game.reels !== 5 || game.rows !== 3 || game.paylines !== 10 ||
      !Array.isArray(game.symbols) || game.symbols.length !== SYMBOLS.length || new Set(game.symbols).size !== SYMBOLS.length ||
      !game.symbols.every(symbol => SYMBOLS.includes(symbol)) || !Array.isArray(game.betLevels) || !game.betLevels.length ||
      !Array.isArray(game.multiplierValues) || game.multiplierValues.join(',') !== '1,2,3,4,5' ||
      new Set(game.betLevels).size !== game.betLevels.length || game.betLevels.some(bet => minor(bet) <= 0n)) fail('M10_ADVERTISED_MODEL_INVALID');
    await retainedDeferredMath(resolveMath, game);
  }
  let roundView = null;
  let resolvedWin = null;
  if (state.round !== null && state.round !== undefined) {
    if (!state.round.receipt) fail('M10_STATE_ROUND_INVALID');
    roundView = await roundEnvelope(state.round.receipt, actionForRound(state.round.receipt), resolveMath);
    resolvedWin = await validateGambleHistory(state.round.gambleActions ?? [], state.round.receipt, resolveMath);
    roundView = { ...roundView, winAmount: resolvedWin };
    if (state.round.collection) collectionEnvelope(state.round.collection, state.round.receipt, resolvedWin);
    if (state.round.pendingWinAmount !== undefined && state.round.pendingWinAmount !== (state.round.collection ? '0.00' : resolvedWin)) fail('M10_PENDING_WIN_STATE_MISMATCH');
  }
  return freeze({ account: copy(state), roundView,
    roundCollected: !!state.round?.collection || resolvedWin === '0.00' });
}
