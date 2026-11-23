import { deriveSuperWildsPending } from './gamble-state.mjs';
import { validateOperatorGamblePolicy } from './gamble-model.mjs';
import { GAME_ID, SuperWildsError, minor, money, amount } from './contract.mjs';
export { GAME_ID, SuperWildsError, minor, money } from './contract.mjs';
/** Authoritative Super Wilds deferred settlement on the EXISTING host wallet.
 * No sampler, probabilities, money, session, endpoint or database is created.
 * The transaction provider must roll back ALL callbacks on any failure.
 */
export const COMPONENT = Object.freeze({ mounted: false, productionEnabled: false, createsWallet: false,
  installsModel: false, appliesMigration: false });
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const MONEY = /^(0|[1-9]\d{0,12})\.\d{2}$/;
const clone = value => structuredClone(value);
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const fail = (code, status) => { throw new SuperWildsError(code, status); };
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && !value.includes('\0');
const validGrid = grid => Array.isArray(grid) && grid.length === 3 &&
  grid.every(row => Array.isArray(row) && row.length === 5 && row.every(text));
function modelIdentity(value) {
  if (!text(value?.engineVersion) || !text(value?.mathVersion) || !HASH.test(value?.mathSha256 ?? '')) {
    fail('SUPERWILDS_MODEL_IDENTITY_REQUIRED');
  }
  return { engineVersion: value.engineVersion, mathVersion: value.mathVersion, mathSha256: value.mathSha256 };
}
const sameModel = (a, b) => ['engineVersion', 'mathVersion', 'mathSha256'].every(key => a[key] === b[key]);
const TX_METHODS = ['authenticate', 'lockWallets', 'assertReady', 'withRequestOwner', 'findRequest', 'insertRequest',
  'findRound', 'latestRound', 'insertRound', 'findCollection', 'insertCollection', 'playerBalance', 'houseBalance',
  'reservedBalance', 'debitStake', 'reserveWin', 'creditReservedWin', 'assertNoActiveRound', 'claimActiveRound',
  'releaseActiveRound', 'assertPlayerCapacity', 'activeRound', 'registerRound', 'findGambles'];
const MODEL_GATES = ['legalOutcomesVerified', 'outcomeDistributionVerified', 'aggregatePayoutVerified',
  'roundingVerified', 'deferredLifecycleVerified', 'etbPolicyVerified'];

function installedModel(value, action) {
  if (!value || value.gameId !== GAME_ID || value.approved !== true ||
    !MODEL_GATES.every(key => value.verification?.[key] === true) ||
    !['sampleOutcome', 'validateOutcome', 'maximumPayoutMinor'].every(key => typeof value[key] === 'function') ||
    !Array.isArray(value.betLevels) || !value.betLevels.length || new Set(value.betLevels).size !== value.betLevels.length ||
    value.betLevels.some(bet => minor(bet) <= 0n)) fail('SUPERWILDS_APPROVED_OWN_MODEL_REQUIRED');
  const identity = modelIdentity(value);
  if (action && !sameModel(identity, action)) fail('PLAYER_MATH_VERSION_STALE', 409);
  if (action && !value.betLevels.includes(action.bet)) fail('BET_OUTSIDE_EXISTING_LADDER', 422);
  return Object.freeze({ ...identity, betLevels: Object.freeze([...value.betLevels]),
    sampleOutcome: value.sampleOutcome.bind(value), validateOutcome: value.validateOutcome.bind(value),
    maximumPayoutMinor: value.maximumPayoutMinor.bind(value) });
}

function installedGambleModel(value, action = null) {
  if (!value || value.gameId !== GAME_ID || value.approved !== true ||
    !['fairColorVerified', 'operatorPolicyVerified', 'reservationLifecycleVerified'].every(key => value.verification?.[key] === true) ||
    !text(value.gambleVersion) || !HASH.test(value.gambleSha256 ?? '') ||
    !['sampleColor', 'validateColor'].every(key => typeof value[key] === 'function')) fail('SUPERWILDS_APPROVED_GAMBLE_MODEL_REQUIRED');
  let policy;
  try { policy = validateOperatorGamblePolicy(value.policy); } catch { fail('SUPERWILDS_EXPLICIT_GAMBLE_POLICY_REQUIRED'); }
  if (action && (action.gambleVersion !== value.gambleVersion || action.gambleSha256 !== value.gambleSha256)) {
    fail('SUPERWILDS_GAMBLE_MODEL_STALE', 409);
  }
  return { gambleVersion: value.gambleVersion, gambleSha256: value.gambleSha256, policy,
    sampleColor: value.sampleColor.bind(value), validateColor: value.validateColor.bind(value) };
}

function actionBody(input, kind) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.gameId !== GAME_ID ||
    !UUID.test(input.roundToken ?? '') || !HASH.test(input.sessionGuard ?? '') ||
    !MONEY.test(input.bet ?? '') || minor(input.bet) <= 0n ||
    input.replayOnly !== undefined && typeof input.replayOnly !== 'boolean') fail('SUPERWILDS_ACTION_INVALID', 400);
  const keys = ['gameId', 'roundToken', 'sessionGuard', 'bet', 'engineVersion', 'mathVersion', 'mathSha256', 'replayOnly',
    ...(kind === 'SPIN' ? ['collectRoundId'] : ['roundId']),
    ...(kind === 'GAMBLE' ? ['choice', 'expectedAttempt', 'expectedPendingWin', 'gambleVersion', 'gambleSha256'] : [])];
  // The browser cannot submit an outcome, award, multiplier, strips or balance.
  if (Object.keys(input).some(key => !keys.includes(key))) fail('SUPERWILDS_CLIENT_AUTHORITY_REJECTED', 400);
  const result = { ...clone(input), ...modelIdentity(input), replayOnly: input.replayOnly === true };
  if (kind === 'SPIN') {
    if (input.collectRoundId !== null && !UUID.test(input.collectRoundId ?? '')) fail('SUPERWILDS_COLLECTION_ID_REQUIRED', 400);
    result.collectRoundId = input.collectRoundId?.toLowerCase() ?? null;
  } else {
    if (!UUID.test(input.roundId ?? '')) fail('SUPERWILDS_ROUND_ID_REQUIRED', 400);
    result.roundId = input.roundId.toLowerCase();
  }
  if (kind === 'GAMBLE' && (!['RED', 'BLACK'].includes(input.choice) || !Number.isSafeInteger(input.expectedAttempt) ||
    input.expectedAttempt < 1 || input.expectedAttempt > 1000 || !MONEY.test(input.expectedPendingWin ?? '') ||
    minor(input.expectedPendingWin) <= 0n || !text(input.gambleVersion) || !HASH.test(input.gambleSha256 ?? ''))) {
    fail('SUPERWILDS_GAMBLE_ACTION_INVALID', 400);
  }
  // Keep the exact wire request spelling in the immutable receipt. PostgreSQL
  // stores UUID keys canonically; equality checks compare their UUID identity.
  return freeze(result);
}

/** Create the lifecycle only; publication never enables its default release.
 * Approved server model callbacks supply ALL outcome probabilities/pay rules.
 * Wallet callbacks must share the host's transaction and protected house holds.
 */
export function createSuperWildsLifecycle({ authenticate, sessionGuard, transaction, hash,
  getApprovedModel = async () => null, releaseEnabled = () => false,
  getApprovedGambleModel = async () => null, gambleEnabled = () => false,
  uuid = () => globalThis.crypto.randomUUID(), now = () => new Date().toISOString() } = {}) {
  for (const [key, value] of Object.entries({ authenticate, sessionGuard, transaction, hash, getApprovedModel, releaseEnabled, getApprovedGambleModel, gambleEnabled, uuid, now })) {
    if (typeof value !== 'function') fail('SUPERWILDS_DEPENDENCY_REQUIRED_' + key);
  }
  const identifier = () => { const value = uuid(); if (!UUID.test(value ?? '')) fail('SUPERWILDS_SERVER_ID_INVALID'); return value.toLowerCase(); };
  const timestamp = () => { const value = now(); if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) fail('SUPERWILDS_SERVER_TIME_INVALID'); return value; };
  async function owner(request) {
    if (!(request instanceof Request)) fail('INVALID_EXISTING_REQUEST', 400);
    const userId = await authenticate(request);
    if (!text(userId)) fail('PLAYER_LOGIN_REQUIRED', 401);
    const guard = await sessionGuard(request, userId);
    if (!HASH.test(guard ?? '')) fail('EXISTING_SESSION_HASH_INVALID');
    return { userId, guard };
  }
  async function run(request, identity, action, kind, operation) {
    return transaction(async tx => {
      for (const name of TX_METHODS) if (typeof tx?.[name] !== 'function') fail('SUPERWILDS_HOST_CALLBACK_REQUIRED_' + name);
      if (await tx.authenticate(request) !== identity.userId || await sessionGuard(request, identity.userId) !== identity.guard) fail('PLAYER_SESSION_CHANGED', 403);
      await tx.lockWallets(identity.userId);
      // This hook must check the ACTUAL installed transaction isolation,
      // cross-game house floor and shared ownership integration, not a flag.
      await tx.assertReady();
      if (!action) return operation(tx);
      return tx.withRequestOwner({ userId: identity.userId, gameId: GAME_ID,
        requestKey: action.roundToken, kind }, () => operation(tx));
    });
  }
  async function fingerprint(userId, kind, action) {
    const result = await hash(JSON.stringify({ userId, gameId: GAME_ID, kind, bet: action.bet, ...modelIdentity(action),
      ...(kind === 'SPIN' ? { collectRoundId: action.collectRoundId } : { roundId: action.roundId }),
      ...(kind === 'GAMBLE' ? { choice: action.choice, expectedAttempt: action.expectedAttempt,
        expectedPendingWin: action.expectedPendingWin, gambleVersion: action.gambleVersion, gambleSha256: action.gambleSha256 } : {}) }));
    if (!HASH.test(result ?? '')) fail('EXISTING_REQUEST_HASH_INVALID');
    return result;
  }
  async function replay(tx, userId, kind, action, fingerprint) {
    const saved = await tx.findRequest(userId, action.roundToken);
    if (!saved) return null;
    const r = saved.receipt;
    if (saved.kind !== kind || saved.fingerprint !== fingerprint || r?.gameId !== GAME_ID || r.kind !== kind ||
      !UUID.test(r.requestKey ?? '') || r.requestKey.toLowerCase() !== action.roundToken.toLowerCase() || r.bet !== action.bet ||
      !sameModel(r, action) || kind === 'SPIN' && (r.previousCollection?.roundId ?? null) !== action.collectRoundId ||
      kind !== 'SPIN' && r.roundId !== action.roundId ||
      kind === 'GAMBLE' && (r.choice !== action.choice || r.attempt !== action.expectedAttempt || r.pendingWinBefore !== action.expectedPendingWin ||
        r.gambleVersion !== action.gambleVersion || r.gambleSha256 !== action.gambleSha256)) fail('IDEMPOTENCY_PARAMETER_CONFLICT', 409);
    return freeze(clone(r));
  }
  function ownedRound(value, userId, roundId) {
    const r = value?.receipt;
    if (!value || value.userId !== userId || value.gameId !== GAME_ID || value.roundId !== roundId) fail('SUPERWILDS_ROUND_NOT_FOUND', 404);
    if (!r || r.schema !== 'zplay/superwilds-round/v1' || r.gameId !== GAME_ID || r.kind !== 'SPIN' || r.currency !== 'ETB' ||
      r.roundId !== roundId || !UUID.test(roundId) || !UUID.test(r.requestKey ?? '') ||
      !UUID.test(value.requestKey ?? '') || value.requestKey.toLowerCase() !== r.requestKey.toLowerCase() ||
      r.bet !== value.bet || r.winAmount !== value.winAmount || !validGrid(r.grid) ||
      r.collectionStatus !== (minor(r.winAmount) > 0n ? 'PENDING' : 'NOT_REQUIRED')) fail('SUPERWILDS_STORED_ROUND_INVALID');
    modelIdentity(r); minor(r.bet);
    return value;
  }
  async function liability(tx, userId, round) {
    return deriveSuperWildsPending(round, await tx.findGambles(userId, round.roundId));
  }
  async function collection(tx, userId, round) {
    const current = await liability(tx, userId, round), win = current.pendingMinor;
    const saved = await tx.findCollection(userId, round.roundId);
    if (saved) {
      if (saved.schema !== 'zplay/superwilds-collection/v1' || saved.gameId !== GAME_ID || saved.roundId !== round.roundId ||
        saved.bet !== round.bet || saved.amount !== money(win) || !sameModel(saved, round.receipt) ||
        !UUID.test(saved.collectionId ?? '') || saved.collected !== true ||
        (saved.gambleAttempt ?? 0) !== current.attempt || (saved.lastGambleActionId ?? null) !== current.lastActionId) {
        fail('SUPERWILDS_STORED_COLLECTION_INVALID');
      }
      return freeze(clone(saved));
    }
    if (win <= 0n) fail('SUPERWILDS_NO_PENDING_WIN', 409);
    const active = await tx.activeRound(userId);
    if (active?.gameId !== GAME_ID || active.roundId !== round.roundId) fail('SUPERWILDS_ACTIVE_ROUND_MISMATCH');
    const before = amount(await tx.playerBalance(userId)), reserved = amount(await tx.reservedBalance(userId));
    const houseBefore = amount(await tx.houseBalance(userId));
    if (reserved < win) fail('SUPERWILDS_RESERVED_WIN_MISSING');
    const collectionId = identifier();
    await tx.creditReservedWin({ userId, gameId: GAME_ID, roundId: round.roundId, collectionId, amountMinor: win });
    const after = amount(await tx.playerBalance(userId));
    if (after !== before + win || amount(await tx.reservedBalance(userId)) !== reserved - win ||
      amount(await tx.houseBalance(userId)) !== houseBefore) fail('SUPERWILDS_COLLECTION_LEDGER_MISMATCH');
    const result = freeze({ schema: 'zplay/superwilds-collection/v1', gameId: GAME_ID, roundId: round.roundId,
      collectionId, bet: round.bet, ...modelIdentity(round.receipt), currency: 'ETB', amount: money(win),
      baseWinAmount: round.winAmount, gambleAttempt: current.attempt, lastGambleActionId: current.lastActionId,
      collected: true, createdAt: timestamp(), walletReceipt: { currency: 'ETB', balanceBefore: money(before), creditedWin: money(win), balanceAfter: money(after) } });
    await tx.insertCollection(userId, round.roundId, clone(result));
    await tx.releaseActiveRound(userId, GAME_ID, round.roundId);
    return result;
  }

  async function describeGamble(tx, userId, round, current, collected = null) {
    const pending = collected ? 0n : current.pendingMinor;
    const supplied = await getApprovedGambleModel(GAME_ID), model = supplied ? installedGambleModel(supplied) : null;
    let reason = null;
    if (pending <= 0n) reason = 'SUPERWILDS_NO_PENDING_WIN';
    else if (await gambleEnabled() !== true || await releaseEnabled() !== true) reason = 'SUPERWILDS_GAMBLE_NOT_ENABLED';
    else if (!model) reason = 'SUPERWILDS_APPROVED_GAMBLE_MODEL_REQUIRED';
    else if (current.attempt >= model.policy.maxAttempts) reason = 'SUPERWILDS_GAMBLE_ATTEMPT_LIMIT';
    else if (pending > model.policy.maxPendingMinor || pending * 2n > model.policy.maxTargetMinor) reason = 'SUPERWILDS_GAMBLE_POLICY_LIMIT';
    else {
      const active = await tx.activeRound(userId);
      if (active?.gameId !== GAME_ID || active.roundId !== round?.roundId) reason = 'SUPERWILDS_ACTIVE_ROUND_MISMATCH';
      else if (amount(await tx.houseBalance(userId)) < pending) reason = 'SUPERWILDS_HOUSE_CAPACITY_UNAVAILABLE';
    }
    return freeze({ available: reason === null, reason, attempt: current.attempt, nextAttempt: current.attempt + 1,
      pendingWin: money(pending), targetWin: reason === null ? money(pending * 2n) : null,
      version: model?.gambleVersion ?? null, sha256: model?.gambleSha256 ?? null,
      maxAttempts: model?.policy.maxAttempts ?? 0, remainingAttempts: model ? Math.max(0, model.policy.maxAttempts - current.attempt) : 0,
      history: clone(current.history) });
  }

  async function spin(request, input) {
    const identity = await owner(request), action = actionBody(input, 'SPIN');
    if (action.sessionGuard !== identity.guard) fail('PLAYER_SESSION_CHANGED', 403);
    const bound = await fingerprint(identity.userId, 'SPIN', action);
    return run(request, identity, action, 'SPIN', async tx => {
      const saved = await replay(tx, identity.userId, 'SPIN', action, bound);
      if (saved) return saved;
      if (action.replayOnly) fail('ROUND_NOT_FOUND_FOR_REPLAY', 404);
      if (await releaseEnabled() !== true) fail('SUPERWILDS_RELEASE_NOT_ENABLED');
      const model = installedModel(await getApprovedModel(GAME_ID), action);
      const latest = await tx.latestRound(identity.userId);
      let previousCollection = null;
      if (action.collectRoundId !== null) {
        if (latest?.roundId !== action.collectRoundId) fail('SUPERWILDS_COLLECTION_STATE_CHANGED', 409);
        previousCollection = await collection(tx, identity.userId, ownedRound(latest, identity.userId, action.collectRoundId));
      } else if (latest && (await liability(tx, identity.userId, ownedRound(latest, identity.userId, latest.roundId))).pendingMinor > 0n &&
        !await tx.findCollection(identity.userId, latest.roundId)) fail('SUPERWILDS_PENDING_WIN_REQUIRES_COLLECTION', 409);
      await tx.assertNoActiveRound(identity.userId);
      const stake = minor(action.bet), before = amount(await tx.playerBalance(identity.userId));
      const maximum = amount(await model.maximumPayoutMinor(stake));
      if (maximum <= 0n) fail('SUPERWILDS_APPROVED_MAXIMUM_REQUIRED');
      if (before < stake) fail('INSUFFICIENT_FUNDS', 402);
      const houseBefore = amount(await tx.houseBalance(identity.userId)), reservedBefore = amount(await tx.reservedBalance(identity.userId));
      if (houseBefore + stake < maximum) fail('SUPERWILDS_HOUSE_CAPACITY_UNAVAILABLE');
      await tx.assertPlayerCapacity(identity.userId, before, stake, maximum);
      const roundId = identifier();
      // Debit first. A model failure aborts the same transaction and restores
      // the original wallet/paired ledger; it does not require a second wager.
      await tx.debitStake({ userId: identity.userId, gameId: GAME_ID, roundId, amountMinor: stake });
      const context = freeze({ gameId: GAME_ID, roundId, betMinor: stake });
      const outcome = await model.sampleOutcome(context);
      if (!outcome || !validGrid(outcome.grid) || !Array.isArray(outcome.winLines)) fail('SUPERWILDS_MODEL_OUTCOME_INVALID');
      const multiplier = outcome.multiplier ?? outcome.wheelMultiplier ?? 1;
      if (!Number.isSafeInteger(multiplier) || multiplier < 1) fail('SUPERWILDS_MODEL_MULTIPLIER_INVALID');
      const win = amount(outcome.totalWinMinor);
      if (win > maximum || await model.validateOutcome(clone(outcome), context) !== true) fail('SUPERWILDS_MODEL_OUTCOME_REJECTED');
      if (win > 0n) await tx.reserveWin({ userId: identity.userId, gameId: GAME_ID, roundId, amountMinor: win });
      const after = amount(await tx.playerBalance(identity.userId));
      if (after !== before - stake || amount(await tx.houseBalance(identity.userId)) !== houseBefore + stake - win ||
        amount(await tx.reservedBalance(identity.userId)) !== reservedBefore + win) fail('SUPERWILDS_SPIN_LEDGER_MISMATCH');
      const result = freeze({ schema: 'zplay/superwilds-round/v1', kind: 'SPIN', gameId: GAME_ID, roundId,
        requestKey: action.roundToken, bet: action.bet, ...modelIdentity(model), currency: 'ETB', createdAt: timestamp(),
        grid: clone(outcome.grid), multiplier, winLines: clone(outcome.winLines), winAmount: money(win),
        collectionStatus: win > 0n ? 'PENDING' : 'NOT_REQUIRED', previousCollection: clone(previousCollection),
        walletReceipt: { currency: 'ETB', balanceBefore: money(before), chargedStake: action.bet,
          creditedWin: '0.00', reservedWin: money(win), balanceAfter: money(after) } });
      const round = { userId: identity.userId, gameId: GAME_ID, roundId, requestKey: action.roundToken,
        bet: action.bet, winAmount: money(win), receipt: clone(result) };
      await tx.insertRound(clone(round));
      await tx.registerRound(clone(round));
      if (win > 0n) await tx.claimActiveRound(identity.userId, GAME_ID, roundId);
      await tx.insertRequest(identity.userId, action.roundToken, 'SPIN', bound, clone(result));
      return result;
    });
  }

  async function takeWin(request, input) {
    const identity = await owner(request), action = actionBody(input, 'TAKE_WIN');
    if (action.sessionGuard !== identity.guard) fail('PLAYER_SESSION_CHANGED', 403);
    const bound = await fingerprint(identity.userId, 'TAKE_WIN', action);
    return run(request, identity, action, 'TAKE_WIN', async tx => {
      const saved = await replay(tx, identity.userId, 'TAKE_WIN', action, bound);
      if (saved) return saved;
      if (action.replayOnly) fail('ROUND_NOT_FOUND_FOR_REPLAY', 404);
      const round = ownedRound(await tx.findRound(identity.userId, action.roundId), identity.userId, action.roundId);
      if (round.bet !== action.bet || !sameModel(round.receipt, action)) fail('SUPERWILDS_COLLECTION_IDENTITY_MISMATCH', 409);
      // New-wager release/model withdrawal never confiscates an accepted win.
      const collected = await collection(tx, identity.userId, round);
      const result = freeze({ schema: 'zplay/superwilds-take/v1', kind: 'TAKE_WIN', gameId: GAME_ID,
        requestKey: action.roundToken, roundId: round.roundId, bet: round.bet, ...modelIdentity(round.receipt),
        collected: true, collection: clone(collected), round: clone(round.receipt) });
      await tx.insertRequest(identity.userId, action.roundToken, 'TAKE_WIN', bound, clone(result));
      return result;
    });
  }

  async function gamble(request, input) {
    const identity = await owner(request), action = actionBody(input, 'GAMBLE');
    if (action.sessionGuard !== identity.guard) fail('PLAYER_SESSION_CHANGED', 403);
    const bound = await fingerprint(identity.userId, 'GAMBLE', action);
    return run(request, identity, action, 'GAMBLE', async tx => {
      const saved = await replay(tx, identity.userId, 'GAMBLE', action, bound);
      if (saved) return saved;
      if (action.replayOnly) fail('ROUND_NOT_FOUND_FOR_REPLAY', 404);
      if (await gambleEnabled() !== true || await releaseEnabled() !== true) fail('SUPERWILDS_GAMBLE_NOT_ENABLED');
      const model = installedGambleModel(await getApprovedGambleModel(GAME_ID), action);
      for (const name of ['insertGamble', 'increaseReservedWin', 'releaseReservedWin']) {
        if (typeof tx[name] !== 'function') fail('SUPERWILDS_HOST_CALLBACK_REQUIRED_' + name);
      }
      const round = ownedRound(await tx.findRound(identity.userId, action.roundId), identity.userId, action.roundId);
      if (round.bet !== action.bet || !sameModel(round.receipt, action)) fail('SUPERWILDS_GAMBLE_ROUND_IDENTITY_MISMATCH', 409);
      if ((await tx.latestRound(identity.userId))?.roundId !== round.roundId || await tx.findCollection(identity.userId, round.roundId)) {
        fail('SUPERWILDS_GAMBLE_ROUND_CLOSED', 409);
      }
      const current = await liability(tx, identity.userId, round), pending = current.pendingMinor, attempt = current.attempt + 1;
      if (attempt !== action.expectedAttempt || money(pending) !== action.expectedPendingWin) fail('SUPERWILDS_GAMBLE_STATE_CHANGED', 409);
      if (pending <= 0n) fail('SUPERWILDS_NO_PENDING_WIN', 409);
      if (attempt > model.policy.maxAttempts) fail('SUPERWILDS_GAMBLE_ATTEMPT_LIMIT', 409);
      const target = amount(pending * 2n);
      if (pending > model.policy.maxPendingMinor || target > model.policy.maxTargetMinor) fail('SUPERWILDS_GAMBLE_POLICY_LIMIT', 409);
      const active = await tx.activeRound(identity.userId);
      if (active?.gameId !== GAME_ID || active.roundId !== round.roundId) fail('SUPERWILDS_ACTIVE_ROUND_MISMATCH');
      const balance = amount(await tx.playerBalance(identity.userId)), house = amount(await tx.houseBalance(identity.userId));
      const reserved = amount(await tx.reservedBalance(identity.userId));
      if (reserved < pending) fail('SUPERWILDS_RESERVED_WIN_MISSING');
      // Capacity is checked BEFORE entropy; a liability cannot be accepted
      // only when it happens to lose. No player wallet debit is performed.
      if (house < pending) fail('SUPERWILDS_HOUSE_CAPACITY_UNAVAILABLE');
      await tx.assertPlayerCapacity(identity.userId, balance, 0n, target);
      const actionId = identifier(), color = await model.sampleColor(freeze({ gameId: GAME_ID, roundId: round.roundId, actionId, attempt }));
      if (!['RED', 'BLACK'].includes(color) || await model.validateColor(color) !== true) fail('SUPERWILDS_GAMBLE_COLOR_REJECTED');
      const won = color === action.choice, afterPending = won ? target : 0n;
      const args = { userId: identity.userId, gameId: GAME_ID, roundId: round.roundId, actionId, amountMinor: pending };
      if (won) await tx.increaseReservedWin(args); else await tx.releaseReservedWin(args);
      if (amount(await tx.playerBalance(identity.userId)) !== balance ||
        amount(await tx.reservedBalance(identity.userId)) !== (won ? reserved + pending : reserved - pending) ||
        amount(await tx.houseBalance(identity.userId)) !== (won ? house - pending : house + pending)) fail('SUPERWILDS_GAMBLE_RESERVATION_MISMATCH');
      const result = freeze({ schema: 'zplay/superwilds-gamble/v1', kind: 'GAMBLE', gameId: GAME_ID,
        requestKey: action.roundToken, actionId, roundId: round.roundId, bet: round.bet, ...modelIdentity(round.receipt), currency: 'ETB',
        gambleVersion: model.gambleVersion, gambleSha256: model.gambleSha256, attempt, previousActionId: current.lastActionId,
        choice: action.choice, color, won, pendingWinBefore: money(pending), pendingWinAfter: money(afterPending),
        policy: { version: model.policy.version, maxAttempts: model.policy.maxAttempts,
          maxPendingWin: money(model.policy.maxPendingMinor), maxTargetWin: money(model.policy.maxTargetMinor) },
        createdAt: timestamp(), round: clone(round.receipt),
        walletReceipt: { currency: 'ETB', chargedStake: '0.00', creditedWin: '0.00', balanceBefore: money(balance), balanceAfter: money(balance) } });
      await tx.insertGamble(identity.userId, round.roundId, clone(result));
      if (!won) await tx.releaseActiveRound(identity.userId, GAME_ID, round.roundId);
      await tx.insertRequest(identity.userId, action.roundToken, 'GAMBLE', bound, clone(result));
      return result;
    });
  }

  async function state(request, gameId = GAME_ID) {
    const identity = await owner(request);
    if (gameId !== GAME_ID) fail('SUPERWILDS_GAME_NOT_FOUND', 404);
    return run(request, identity, null, null, async tx => {
      const latest = await tx.latestRound(identity.userId), balance = amount(await tx.playerBalance(identity.userId));
      let round = null, gambleState = null;
      if (latest) {
        const accepted = ownedRound(latest, identity.userId, latest.roundId);
        const collected = await tx.findCollection(identity.userId, latest.roundId);
        if (collected) await collection(tx, identity.userId, accepted); // validate, no transfer
        const current = await liability(tx, identity.userId, accepted);
        gambleState = await describeGamble(tx, identity.userId, accepted, current, collected);
        round = { result: clone(accepted.receipt), collection: clone(collected),
          pendingWin: collected ? '0.00' : money(current.pendingMinor), gamble: gambleState };
      }
      const active = await tx.activeRound(identity.userId);
      const suppliedModel = await getApprovedModel(GAME_ID);
      const currentModel = suppliedModel ? installedModel(suppliedModel) : null;
      return freeze({ schema: 'zplay/superwilds-state/v1', authenticated: true, gameId: GAME_ID,
        subject: identity.userId, currency: 'ETB', balance: money(balance), sessionGuard: identity.guard, round, gamble: gambleState,
        game: { id: GAME_ID, enabled: !!currentModel && await releaseEnabled() === true,
          betLevels: currentModel ? [...currentModel.betLevels] : [],
          ...(currentModel ? modelIdentity(currentModel) : {}) },
        blockedByActiveGame: active?.gameId ?? null });
    });
  }
  // STOP, QUICK, SOUND and AUTO policy are presentation controls. They have
  // no server wager endpoint and can never generate a second debit.
  return Object.freeze({ handles: gameId => gameId === GAME_ID, spin, takeWin, gamble, state });
}
