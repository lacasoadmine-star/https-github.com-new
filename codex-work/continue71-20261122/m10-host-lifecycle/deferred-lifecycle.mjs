import { BACKEND_CONFIGURATION, GAME_ID, HASH, UUID, MONEY, MATH_KEYS, copy, fail, freeze, mathIdentity, minor, validGrid } from '../../new-games72-20261121/games/multi-hot-10/backend/contract.mjs';
import { validateDeferredBody as actionBody } from '../../new-games72-20261121/games/multi-hot-10/backend/deferred-protocol.mjs';

const money = value => {
  if (typeof value !== 'bigint' || value < 0n) fail('M10_INVALID_LEDGER_AMOUNT');
  const result = String(value / 100n) + '.' + String(value % 100n).padStart(2, '0');
  if (!MONEY.test(result)) fail('M10_LEDGER_AMOUNT_OVERFLOW');
  return result;
};
const integer = value => {
  if (typeof value !== 'bigint' || value < 0n) fail('M10_INVALID_MODEL_AMOUNT');
  return value;
};
const requiredTx = ['authenticate', 'lockWallets', 'findRequest', 'insertRequest', 'findRound', 'latestRound',
  'insertRound', 'findCollection', 'insertCollection', 'playerBalance', 'houseBalance', 'reserveBalance',
  'debitStake', 'reserveWin', 'creditReservedWin', 'assertNoActiveRound', 'claimActiveRound',
  'releaseActiveRound', 'assertPlayerCapacity', 'activeRound', 'listGambles', 'insertGamble', 'releaseReservedWin'];

function installedModel(value, action = null) {
  const gates = ['outcomeDistributionVerified', 'legalOutcomesVerified', 'aggregatePayoutVerified',
    'roundingVerified', 'deferredLifecycleVerified', 'etbPolicyVerified'];
  if (!value || value.gameId !== GAME_ID || value.approved !== true ||
    !gates.every(key => value.verification?.[key] === true) ||
    !['sampleOutcome', 'validateOutcome', 'maximumPayoutMinor'].every(key => typeof value[key] === 'function') ||
    !Array.isArray(value.betLevels) || !value.betLevels.length ||
    new Set(value.betLevels).size !== value.betLevels.length || value.betLevels.some(bet => minor(bet) <= 0n)) {
    fail('M10_APPROVED_GAME_MODEL_REQUIRED');
  }
  mathIdentity(value);
  if (action && MATH_KEYS.some(key => value[key] !== action[key])) fail('PLAYER_MATH_VERSION_STALE', 409);
  if (action && !value.betLevels.includes(action.bet)) fail('BET_OUTSIDE_EXISTING_LADDER', 422);
  // Snapshot the authority and bind functions before the first await. This
  // module supplies no sampler, strips, probabilities, rounding or payout rule.
  return Object.freeze({ ...mathIdentity(value), betLevels: Object.freeze([...value.betLevels]),
    sampleOutcome: value.sampleOutcome.bind(value), validateOutcome: value.validateOutcome.bind(value),
    maximumPayoutMinor: value.maximumPayoutMinor.bind(value),
    gambleReady: value.verification.gambleRulesVerified === true && value.verification.gambleDistributionVerified === true &&
      ['gambleEligibility', 'sampleGambleOutcome', 'validateGambleOutcome'].every(key => typeof value[key] === 'function'),
    ...Object.fromEntries(['gambleEligibility', 'sampleGambleOutcome', 'validateGambleOutcome']
      .filter(key => typeof value[key] === 'function').map(key => [key, value[key].bind(value)])) });
}

/**
 * Real deferred accounting, driven by an injected, approved, game-specific
 * outcome module. Default release/model dependencies keep it closed.
 *
 * All tx methods MUST use one existing database transaction. The composed
 * house-reservation bridge locks the existing player/house wallets in stable
 * order and protects pending wins with database-enforced house holds. It
 * creates no extra wallet. A liability counter without that cross-game wallet
 * floor is insufficient. The adapter also registers every accepted spin in
 * the existing shared round ordering, including losses.
 */
export function createMultiHot10DeferredLifecycle({ authenticate, sessionGuard, transaction, hash,
  getApprovedModel = async () => null, releaseEnabled = () => false,
  resolveApprovedModel = identity => getApprovedModel(identity.gameId),
  uuid = () => globalThis.crypto.randomUUID(), now = () => new Date().toISOString() } = {}) {
  for (const [name, value] of Object.entries({ authenticate, sessionGuard, transaction, hash,
    getApprovedModel, resolveApprovedModel, releaseEnabled, uuid, now })) if (typeof value !== 'function') fail('M10_LIFECYCLE_DEPENDENCY_REQUIRED_' + name);
  async function owner(request) {
    if (!(request instanceof Request)) fail('INVALID_EXISTING_REQUEST', 400);
    const userId = await authenticate(request);
    if (typeof userId !== 'string' || !userId) fail('PLAYER_LOGIN_REQUIRED', 401);
    const guard = await sessionGuard(request, userId);
    if (!HASH.test(guard ?? '')) fail('EXISTING_SESSION_HASH_INVALID');
    return { userId, guard };
  }
  function identifier() { const value = uuid(); if (!UUID.test(value ?? '')) fail('M10_SERVER_ID_INVALID'); return value; }
  function timestamp() { const value = now(); if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) fail('M10_SERVER_TIME_INVALID'); return value; }
  async function inTransaction(request, identity, fn) {
    return transaction(async tx => {
      for (const name of requiredTx) if (typeof tx?.[name] !== 'function') fail('M10_TRANSACTION_DEPENDENCY_REQUIRED_' + name);
      if (await tx.authenticate(request) !== identity.userId || await sessionGuard(request, identity.userId) !== identity.guard) {
        fail('PLAYER_SESSION_CHANGED', 403);
      }
      await tx.lockWallets(identity.userId);
      return fn(tx);
    });
  }
  async function fingerprint(userId, kind, action) {
    const value = await hash(JSON.stringify({ userId, gameId: GAME_ID, kind, bet: action.bet,
      ...mathIdentity(action), ...(kind === 'SPIN' ? { collectRoundId: action.collectRoundId } : { roundId: action.roundId }),
      ...(kind === 'GAMBLE' ? { choice: action.choice, expectedAttempt: action.expectedAttempt, expectedWinAmount: action.expectedWinAmount } : {}) }));
    if (!HASH.test(value ?? '')) fail('EXISTING_REQUEST_HASH_INVALID');
    return value;
  }
  async function previous(tx, userId, kind, action, expected) {
    const existing = await tx.findRequest(userId, action.roundToken);
    if (!existing) return null;
    if (existing.kind !== kind || existing.fingerprint !== expected ||
      existing.receipt?.gameId !== GAME_ID || existing.receipt?.requestKey !== action.roundToken ||
      existing.receipt?.kind !== kind || existing.receipt?.bet !== action.bet ||
      MATH_KEYS.some(key => existing.receipt?.[key] !== action[key]) ||
      kind !== 'SPIN' && existing.receipt.roundId !== action.roundId ||
      kind === 'GAMBLE' && (existing.receipt.choice !== action.choice || existing.receipt.attempt !== action.expectedAttempt ||
        existing.receipt.pendingWinBefore !== action.expectedWinAmount) ||
      kind === 'SPIN' && (existing.receipt.previousCollection?.roundId ?? null) !== action.collectRoundId) {
      fail('IDEMPOTENCY_PARAMETER_CONFLICT', 409);
    }
    return freeze(copy(existing.receipt));
  }
  function ownedRound(value, userId, roundId) {
    if (!value || value.userId !== userId || value.gameId !== GAME_ID || value.roundId !== roundId) {
      fail('M10_ROUND_NOT_FOUND', 404);
    }
    if (!value.receipt || value.receipt.roundId !== roundId || value.receipt.gameId !== GAME_ID ||
      value.bet !== value.receipt.bet || value.winAmount !== value.receipt.winAmount || !UUID.test(roundId) ||
      value.receipt.schema !== 'zplay/m10-deferred-round-receipt/v1' ||
      value.requestKey !== value.receipt.requestKey || !validGrid(value.receipt.grid) ||
      !['PENDING', 'NOT_REQUIRED'].includes(value.receipt.collectionStatus)) {
      fail('M10_STORED_ROUND_INVALID');
    }
    mathIdentity(value.receipt); minor(value.bet); minor(value.winAmount);
    return value;
  }
  async function pending(tx, userId, round) {
    const history = await tx.listGambles(userId, round.roundId);
    if (!Array.isArray(history)) fail('M10_GAMBLE_JOURNAL_INVALID');
    let amount = minor(round.winAmount);
    for (let i = 0; i < history.length; i++) {
      const event = history[i];
      if (!event || event.schema !== 'zplay/m10-gamble-event/v1' || event.kind !== 'GAMBLE' ||
        event.gameId !== GAME_ID || event.roundId !== round.roundId || event.bet !== round.bet ||
        MATH_KEYS.some(key => event[key] !== round.receipt[key]) || event.attempt !== i + 1 || amount <= 0n ||
        event.pendingWinBefore !== money(amount) || !['red', 'black'].includes(event.choice) ||
        !['red', 'black'].includes(event.winningColor) || event.won !== (event.choice === event.winningColor)) fail('M10_GAMBLE_JOURNAL_INVALID');
      amount = event.won ? amount * 2n : 0n;
      if (event.pendingWinAfter !== money(amount)) fail('M10_GAMBLE_JOURNAL_INVALID');
    }
    return { amount, history: copy(history) };
  }
  async function collect(tx, userId, round) {
    const current = await pending(tx, userId, round);
    const existing = await tx.findCollection(userId, round.roundId);
    if (existing) {
      if (existing.gameId !== GAME_ID || existing.roundId !== round.roundId ||
        existing.bet !== round.bet || existing.amount !== money(current.amount) ||
        MATH_KEYS.some(key => existing[key] !== round.receipt[key])) fail('M10_STORED_COLLECTION_INVALID');
      return freeze(copy(existing));
    }
    const amount = current.amount, before = integer(await tx.playerBalance(userId));
    if (amount <= 0n) fail('M10_NO_PENDING_WIN', 409);
    const reserveBefore = integer(await tx.reserveBalance(userId)), houseBefore = integer(await tx.houseBalance(userId));
    if (reserveBefore < amount) fail('M10_RESERVED_WIN_MISSING');
    const collectionId = identifier();
    await tx.creditReservedWin({ userId, gameId: GAME_ID, roundId: round.roundId, collectionId, amountMinor: amount });
    const after = integer(await tx.playerBalance(userId));
    if (after !== before + amount || integer(await tx.reserveBalance(userId)) !== reserveBefore - amount ||
      integer(await tx.houseBalance(userId)) !== houseBefore) fail('M10_COLLECTION_LEDGER_MISMATCH');
    const receipt = freeze({ schema: 'zplay/m10-collection-receipt/v1', gameId: GAME_ID,
      collectionId, roundId: round.roundId, bet: round.bet, ...mathIdentity(round.receipt),
      currency: 'ETB', amount: money(amount), collected: true, createdAt: timestamp(), gambleActions: current.history,
      walletReceipt: { currency: 'ETB', balanceBefore: money(before), creditedWin: money(amount), balanceAfter: money(after) } });
    await tx.insertCollection(userId, round.roundId, copy(receipt));
    await tx.releaseActiveRound(userId, GAME_ID, round.roundId);
    return receipt;
  }

  async function spin(request, input) {
    const identity = await owner(request), action = actionBody(input, 'SPIN');
    if (action.sessionGuard !== identity.guard) fail('PLAYER_SESSION_CHANGED', 403);
    const bound = await fingerprint(identity.userId, 'SPIN', action);
    return inTransaction(request, identity, async tx => {
      const replay = await previous(tx, identity.userId, 'SPIN', action, bound);
      if (replay) return replay;
      if (action.replayOnly === true) fail('ROUND_NOT_FOUND_FOR_REPLAY', 404);
      if (await releaseEnabled() !== true) fail('M10_RELEASE_NOT_ENABLED');
      const model = installedModel(await getApprovedModel(GAME_ID), action);
      const latest = await tx.latestRound(identity.userId);
      let collected = null;
      if (action.collectRoundId !== null) {
        if (!latest || latest.roundId !== action.collectRoundId) fail('M10_COLLECTION_STATE_CHANGED', 409);
        collected = await collect(tx, identity.userId, ownedRound(latest, identity.userId, action.collectRoundId));
      } else if (latest && (await pending(tx, identity.userId, ownedRound(latest, identity.userId, latest.roundId))).amount > 0n &&
        !await tx.findCollection(identity.userId, latest.roundId)) {
        fail('M10_PENDING_WIN_REQUIRES_COLLECTION', 409);
      }
      await tx.assertNoActiveRound(identity.userId);
      const stake = minor(action.bet), before = integer(await tx.playerBalance(identity.userId));
      const maximum = integer(await model.maximumPayoutMinor(stake));
      if (maximum <= 0n) fail('M10_APPROVED_MAXIMUM_REQUIRED');
      if (before < stake) fail('INSUFFICIENT_FUNDS', 402);
      const houseBefore = integer(await tx.houseBalance(identity.userId)), reserveBefore = integer(await tx.reserveBalance(identity.userId));
      if (houseBefore < maximum) fail('M10_HOUSE_CAPACITY_UNAVAILABLE');
      await tx.assertPlayerCapacity(identity.userId, before, stake, maximum);
      const roundId = identifier();
      const outcome = await model.sampleOutcome(freeze({ gameId: GAME_ID, roundId, betMinor: stake }));
      if (!outcome || !validGrid(outcome.grid) || !Number.isInteger(outcome.wheelMultiplier) ||
        outcome.wheelMultiplier < 1 || outcome.wheelMultiplier > 5) fail('M10_MODEL_OUTCOME_INVALID');
      const win = integer(outcome.totalWinMinor);
      if (win > maximum || await model.validateOutcome(copy(outcome), freeze({ gameId: GAME_ID, roundId, betMinor: stake })) !== true) {
        fail('M10_MODEL_OUTCOME_REJECTED');
      }
      await tx.debitStake({ userId: identity.userId, gameId: GAME_ID, roundId, amountMinor: stake });
      if (win > 0n) await tx.reserveWin({ userId: identity.userId, gameId: GAME_ID, roundId, amountMinor: win });
      const after = integer(await tx.playerBalance(identity.userId));
      if (after !== before - stake || integer(await tx.houseBalance(identity.userId)) !== houseBefore + stake - win ||
        integer(await tx.reserveBalance(identity.userId)) !== reserveBefore + win) fail('M10_SPIN_LEDGER_MISMATCH');
      const receipt = freeze({ schema: 'zplay/m10-deferred-round-receipt/v1', kind: 'SPIN', gameId: GAME_ID,
        requestKey: action.roundToken, roundId, bet: action.bet, currency: 'ETB', ...mathIdentity(action),
        grid: copy(outcome.grid), multiplier: outcome.wheelMultiplier, winAmount: money(win),
        collectionStatus: win > 0n ? 'PENDING' : 'NOT_REQUIRED', createdAt: timestamp(),
        previousCollection: collected ? copy(collected) : null,
        walletReceipt: { currency: 'ETB', balanceBefore: money(before), chargedStake: action.bet,
          creditedWin: '0.00', reservedWin: money(win), balanceAfter: money(after) } });
      await tx.insertRound({ userId: identity.userId, gameId: GAME_ID, roundId,
        requestKey: action.roundToken, bet: action.bet, winAmount: money(win), receipt: copy(receipt) });
      if (win > 0n) await tx.claimActiveRound(identity.userId, GAME_ID, roundId);
      await tx.insertRequest(identity.userId, action.roundToken, 'SPIN', bound, copy(receipt));
      return receipt;
    });
  }

  async function takeWin(request, input) {
    const identity = await owner(request), action = actionBody(input, 'TAKE_WIN');
    if (action.sessionGuard !== identity.guard) fail('PLAYER_SESSION_CHANGED', 403);
    const bound = await fingerprint(identity.userId, 'TAKE_WIN', action);
    return inTransaction(request, identity, async tx => {
      const replay = await previous(tx, identity.userId, 'TAKE_WIN', action, bound);
      if (replay) return replay;
      // Replay-only never becomes a first collection. The client can safely
      // distinguish an absent request from an accepted request whose reply died.
      if (action.replayOnly === true) fail('ROUND_NOT_FOUND_FOR_REPLAY', 404);
      const round = ownedRound(await tx.findRound(identity.userId, action.roundId), identity.userId, action.roundId);
      if (round.bet !== action.bet || MATH_KEYS.some(key => round.receipt[key] !== action[key])) {
        fail('M10_COLLECTION_IDENTITY_MISMATCH', 409);
      }
      // An accepted pending win remains collectable after the active model or
      // new-wager release is retired. Its immutable accepted amount is used.
      const collection = await collect(tx, identity.userId, round);
      const receipt = freeze({ schema: 'zplay/m10-take-receipt/v1', kind: 'TAKE_WIN', gameId: GAME_ID,
        requestKey: action.roundToken, roundId: action.roundId, bet: action.bet,
        ...mathIdentity(action), collected: true, collection: copy(collection), round: copy(round.receipt) });
      await tx.insertRequest(identity.userId, action.roundToken, 'TAKE_WIN', bound, copy(receipt));
      return receipt;
    });
  }
  async function gamble(request, input) {
    const identity = await owner(request), action = actionBody(input, 'GAMBLE');
    if (action.sessionGuard !== identity.guard) fail('PLAYER_SESSION_CHANGED', 403);
    const bound = await fingerprint(identity.userId, 'GAMBLE', action);
    return inTransaction(request, identity, async tx => {
      const replay = await previous(tx, identity.userId, 'GAMBLE', action, bound);
      if (replay) return replay;
      if (action.replayOnly === true) fail('ROUND_NOT_FOUND_FOR_REPLAY', 404);
      if (await releaseEnabled() !== true) fail('M10_RELEASE_NOT_ENABLED');
      const round = ownedRound(await tx.findRound(identity.userId, action.roundId), identity.userId, action.roundId);
      if (round.bet !== action.bet || MATH_KEYS.some(key => round.receipt[key] !== action[key])) fail('M10_GAMBLE_IDENTITY_MISMATCH', 409);
      if (await tx.findCollection(identity.userId, round.roundId)) fail('M10_WIN_ALREADY_COLLECTED', 409);
      const current = await pending(tx, identity.userId, round);
      if (current.amount <= 0n) fail('M10_NO_PENDING_WIN', 409);
      if (action.expectedAttempt !== current.history.length + 1 || action.expectedWinAmount !== money(current.amount)) fail('M10_GAMBLE_STATE_CHANGED', 409);
      const active = await tx.activeRound(identity.userId);
      if (active?.gameId !== GAME_ID || active.roundId !== round.roundId) fail('M10_ACTIVE_ROUND_STATE_INVALID');
      const model = installedModel(await resolveApprovedModel({ gameId: GAME_ID, ...mathIdentity(action) }), action);
      if (!model.gambleReady) fail('M10_APPROVED_GAMBLE_MODEL_REQUIRED');
      const context = freeze({ gameId: GAME_ID, roundId: round.roundId, betMinor: minor(round.bet),
        pendingWinMinor: current.amount, attempt: action.expectedAttempt, choice: action.choice,
        createdAt: round.receipt.createdAt, now: timestamp(), history: copy(current.history) });
      // The approved per-game policy supplies attempt/stake/time/maximum rules.
      // No old-game limit, infinite limit or 50/50 probability is supplied here.
      if (await model.gambleEligibility(context) !== true) fail('M10_GAMBLE_NOT_ELIGIBLE', 409);
      const before = integer(await tx.playerBalance(identity.userId)), houseBefore = integer(await tx.houseBalance(identity.userId));
      const reserveBefore = integer(await tx.reserveBalance(identity.userId));
      if (reserveBefore < current.amount) fail('M10_RESERVED_WIN_MISSING');
      if (houseBefore < current.amount) fail('M10_HOUSE_CAPACITY_UNAVAILABLE');
      await tx.assertPlayerCapacity(identity.userId, before, 0n, current.amount * 2n);
      const sampled = await model.sampleGambleOutcome(context);
      if (!sampled || !['red', 'black'].includes(sampled.color) || await model.validateGambleOutcome(copy(sampled), context) !== true) fail('M10_GAMBLE_OUTCOME_REJECTED');
      const won = sampled.color === action.choice, afterWin = won ? current.amount * 2n : 0n;
      const gambleId = identifier();
      const movement = { userId: identity.userId, gameId: GAME_ID, roundId: round.roundId, actionId: gambleId, amountMinor: current.amount };
      if (won) await tx.reserveWin(movement); else await tx.releaseReservedWin(movement);
      if (integer(await tx.playerBalance(identity.userId)) !== before ||
        integer(await tx.houseBalance(identity.userId)) !== houseBefore + (won ? -current.amount : current.amount) ||
        integer(await tx.reserveBalance(identity.userId)) !== reserveBefore + (won ? current.amount : -current.amount)) fail('M10_GAMBLE_LEDGER_MISMATCH');
      const event = freeze({ schema: 'zplay/m10-gamble-event/v1', kind: 'GAMBLE', gameId: GAME_ID,
        requestKey: action.roundToken, gambleId, roundId: round.roundId, bet: round.bet, ...mathIdentity(action),
        attempt: action.expectedAttempt, choice: action.choice, winningColor: sampled.color, won,
        pendingWinBefore: money(current.amount), pendingWinAfter: money(afterWin), createdAt: timestamp(),
        walletReceipt: { currency: 'ETB', balanceBefore: money(before), chargedStake: '0.00', creditedWin: '0.00', balanceAfter: money(before) } });
      await tx.insertGamble(identity.userId, round.roundId, copy(event));
      if (!won) await tx.releaseActiveRound(identity.userId, GAME_ID, round.roundId);
      const receipt = freeze({ ...copy(event), schema: 'zplay/m10-gamble-receipt/v1', round: copy(round.receipt), gambleActions: [...current.history, copy(event)] });
      await tx.insertRequest(identity.userId, action.roundToken, 'GAMBLE', bound, copy(receipt));
      return receipt;
    });
  }
  async function state(request, gameId = GAME_ID) {
    const identity = await owner(request);
    if (gameId !== GAME_ID) fail('FRESH_GAME_UNAVAILABLE', 404);
    return inTransaction(request, identity, async tx => {
      const supplied = await getApprovedModel(GAME_ID), model = supplied ? installedModel(supplied) : null;
      const enabled = !!model && await releaseEnabled() === true;
      const latest = await tx.latestRound(identity.userId);
      const round = latest ? ownedRound(latest, identity.userId, latest.roundId) : null;
      const collection = round ? await tx.findCollection(identity.userId, round.roundId) : null;
      const pendingState = round ? await pending(tx, identity.userId, round) : null;
      const active = await tx.activeRound(identity.userId);
      // Existing native rounds have opaque TEXT identifiers. Only this new
      // game's own identity contract requires a UUID; preserve other IDs.
      if (active && (typeof active.gameId !== 'string' || !active.gameId ||
        (active.gameId === GAME_ID ? !UUID.test(active.roundId ?? '') :
          typeof active.roundId !== 'string' || !active.roundId || active.roundId.length > 512 || active.roundId.includes('\0')))) {
        fail('M10_ACTIVE_ROUND_STATE_INVALID');
      }
      if (active?.gameId === GAME_ID && active.roundId !== round?.roundId) fail('M10_ACTIVE_ROUND_STATE_INVALID');
      const capacity = integer(await tx.houseBalance(identity.userId));
      const available = model ? (await Promise.all(model.betLevels.map(async bet =>
        integer(await model.maximumPayoutMinor(minor(bet))) <= capacity ? bet : null))).filter(Boolean) : [];
      const game = { id: GAME_ID, ...copy(BACKEND_CONFIGURATION), enabled, freshReleaseReady: enabled,
        ...(model ? { ...mathIdentity(model), betLevels: [...model.betLevels], availableBetLevels: available,
          integrationStatus: enabled ? 'DEFERRED_MODEL_INSTALLED' : 'DEFERRED_MODEL_RETIRED',
          settlementEligible: enabled, missingInputs: [],
          gambleEnabled: enabled && model.gambleReady,
          wagerAvailability: available.length ? 'available' : 'house_capacity' } : {}) };
      return freeze({ authenticated: true, currency: 'ETB', sessionGuard: identity.guard,
        balance: money(integer(await tx.playerBalance(identity.userId))), game,
        blockedByActiveGame: active && active.gameId !== GAME_ID ? active.gameId : null,
        round: round ? { receipt: copy(round.receipt), collection: copy(collection), gambleActions: pendingState.history,
          pendingWinAmount: collection ? '0.00' : money(pendingState.amount) } : null });
    });
  }
  return Object.freeze({ handles: gameId => gameId === GAME_ID, state, spin, takeWin, gamble });
}
