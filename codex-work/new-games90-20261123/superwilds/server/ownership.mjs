import { deriveSuperWildsPending } from './gamble-state.mjs';
import { isDeepStrictEqual } from 'node:util';
import { GAME_ID, minor, SuperWildsError } from './lifecycle.mjs';

export const M10_GAME_ID = 'zplay72_multi_hot_10_v1';
export const COMPONENT = Object.freeze({ mounted: false, productionEnabled: false, appliesMigration: false, createsWallet: false });
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH = /^[a-f0-9]{64}$/i;
const UINT = /^(0|[1-9]\d*)$/;
const MAX = 9223372036854775807n;
const fail = (code, status) => { throw new SuperWildsError(code, status); };
const text = (value, limit = 512) => typeof value === 'string' && value.length > 0 && value.length <= limit && !value.includes('\0');
const clone = value => structuredClone(value);
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function rows(result, code) {
  if (!Array.isArray(result?.rows) || result.rowCount !== result.rows.length) fail(code);
  return result.rows;
}
function units(value, positive = false) {
  if (typeof value !== 'string' || !UINT.test(value) || BigInt(value) > MAX || positive && BigInt(value) === 0n) fail('SUPERWILDS_SHARED_AMOUNT_INVALID');
  return BigInt(value);
}
const actions = Object.freeze({ legacy: ['SPIN', 'GAMBLE', 'PICK'], m10: ['SPIN', 'TAKE_WIN', 'GAMBLE'], superwilds: ['SPIN', 'TAKE_WIN', 'GAMBLE'] });

// The lock namespace and canonical lock key match the earlier M10 guard.
// All relations and SQL identifiers are fixed; caller identities are parameters.
export const REQUEST_SQL = Object.freeze({
  lock: 'SELECT pg_advisory_xact_lock(1515213391, hashtext($1::text))',
  installation: `SELECT to_regclass('sw_new_m10.requests') IS NOT NULL AS m10,
 to_regclass('sw_new_superwilds.requests') IS NOT NULL AS superwilds`,
  legacyOwners: `SELECT 'legacy-round'::text AS journal, user_id::text AS user_id, game_id::text AS game_id, 'SPIN'::text AS action
 FROM sw_nine.game_rounds
 WHERE user_id=$1 AND (request_key=$2 OR ($3::text IS NOT NULL AND lower(request_key)=$3::text))
 UNION ALL
 SELECT 'legacy-action'::text AS journal, a.user_id::text AS user_id, r.game_id::text AS game_id, a.kind::text AS action
 FROM sw_nine.actions a LEFT JOIN sw_nine.game_rounds r ON r.round_id=a.parent_id AND r.user_id=a.user_id
 WHERE a.user_id=$1 AND (a.request_key=$2 OR ($3::text IS NOT NULL AND lower(a.request_key)=$3::text))`,
  m10Owners: `SELECT 'm10'::text AS journal, user_id::text AS user_id, request_key::text AS request_key,
 receipt->>'gameId' AS game_id, kind::text AS action, receipt->>'kind' AS receipt_kind,
 receipt->>'requestKey' AS receipt_request_key FROM sw_new_m10.requests WHERE user_id=$1 AND request_key=$2::uuid`,
  superwildsOwners: `SELECT 'superwilds'::text AS journal, user_id::text AS user_id, request_key::text AS request_key,
 receipt->>'gameId' AS game_id, kind::text AS action, receipt->>'kind' AS receipt_kind,
 receipt->>'requestKey' AS receipt_request_key FROM sw_new_superwilds.requests WHERE user_id=$1 AND request_key=$2::uuid`,
});

function requestIdentity(input) {
  const action = input?.action ?? input?.kind, family = input?.family;
  if (!Object.hasOwn(actions, family ?? '') || !actions[family].includes(action) ||
    input.action !== undefined && input.kind !== undefined && input.action !== input.kind ||
    !text(input.userId) || !text(input.gameId, 64) || !text(input.requestKey, 128) ||
    family === 'm10' && (input.gameId !== M10_GAME_ID || !UUID.test(input.requestKey)) ||
    family === 'superwilds' && (input.gameId !== GAME_ID || !UUID.test(input.requestKey)) ||
    family === 'legacy' && [GAME_ID, M10_GAME_ID].includes(input.gameId)) fail('SUPERWILDS_REQUEST_OWNER_IDENTITY_INVALID', 400);
  return { userId: input.userId, gameId: input.gameId, requestKey: input.requestKey, family, action,
    canonicalUuid: UUID.test(input.requestKey) ? input.requestKey.toLowerCase() : null };
}

function assertRequestOwner(found, expected, required) {
  if (found.length === 0) { if (required) fail('SUPERWILDS_REQUEST_OWNER_CLAIM_NOT_RECORDED'); return; }
  if (found.length !== 1) fail('SUPERWILDS_REQUEST_OWNER_AMBIGUOUS');
  const row = found[0], family = ['legacy-round', 'legacy-action'].includes(row.journal) ? 'legacy' : row.journal;
  if (!Object.hasOwn(actions, family ?? '') || !actions[family].includes(row.action) || !text(row.game_id, 64) ||
    row.user_id !== expected.userId || row.journal === 'legacy-round' && row.action !== 'SPIN' ||
    row.journal === 'legacy-action' && !['GAMBLE', 'PICK'].includes(row.action) ||
    family === 'legacy' && [GAME_ID, M10_GAME_ID].includes(row.game_id) ||
    family === 'm10' && row.game_id !== M10_GAME_ID || family === 'superwilds' && row.game_id !== GAME_ID) {
    fail('SUPERWILDS_REQUEST_OWNER_JOURNAL_INVALID');
  }
  if (family !== 'legacy' && (row.receipt_kind !== row.action || !UUID.test(row.request_key ?? '') ||
    !UUID.test(row.receipt_request_key ?? '') || row.request_key.toLowerCase() !== expected.canonicalUuid ||
    row.receipt_request_key.toLowerCase() !== expected.canonicalUuid)) fail('SUPERWILDS_REQUEST_OWNER_JOURNAL_INVALID');
  if (family !== expected.family || row.game_id !== expected.gameId || row.action !== expected.action) fail('IDEMPOTENCY_PARAMETER_CONFLICT', 409);
}

/** The caller must already hold the existing wallet locks in its transaction.
 * This validates journal ownership before and after the ORIGINAL action; its
 * own fingerprint/receipt/policy checks remain authoritative. No new claim
 * table, balance or outcome is created by this guard.
 */
export async function withSharedRequestOwner(client, input, run) {
  if (typeof client?.query !== 'function' || typeof run !== 'function') fail('SUPERWILDS_REQUEST_OWNER_TRANSACTION_REQUIRED');
  const expected = requestIdentity(input);
  await client.query(REQUEST_SQL.lock, [JSON.stringify(['zplay-request-owner-v1', expected.userId, expected.canonicalUuid ?? expected.requestKey])]);
  const installed = rows(await client.query(REQUEST_SQL.installation), 'SUPERWILDS_REQUEST_OWNER_INSTALLATION_INVALID');
  if (installed.length !== 1 || ['m10', 'superwilds'].some(name => typeof installed[0][name] !== 'boolean')) fail('SUPERWILDS_REQUEST_OWNER_INSTALLATION_INVALID');
  if (expected.family !== 'legacy' && !installed[0][expected.family]) fail(expected.family === 'm10' ? 'M10_REQUEST_JOURNAL_NOT_INSTALLED' : 'SUPERWILDS_REQUEST_JOURNAL_NOT_INSTALLED');
  const read = async () => {
    const result = [...rows(await client.query(REQUEST_SQL.legacyOwners, [expected.userId, expected.requestKey, expected.canonicalUuid]), 'SUPERWILDS_REQUEST_OWNER_QUERY_INVALID')];
    if (expected.canonicalUuid) {
      for (const [family, sql] of [['m10', REQUEST_SQL.m10Owners], ['superwilds', REQUEST_SQL.superwildsOwners]]) {
        if (installed[0][family]) result.push(...rows(await client.query(sql, [expected.userId, expected.canonicalUuid]), 'SUPERWILDS_REQUEST_OWNER_QUERY_INVALID'));
      }
    }
    return result;
  };
  assertRequestOwner(await read(), expected, false);
  const result = await run();
  assertRequestOwner(await read(), expected, true);
  return result;
}

export function withSuperWildsRequestOwner(client, input, run) {
  if (input?.family !== undefined && input.family !== 'superwilds') fail('SUPERWILDS_REQUEST_OWNER_IDENTITY_INVALID', 400);
  return withSharedRequestOwner(client, { ...input, family: 'superwilds' }, run);
}

function guardedDependencies(dependencies, request, body, family, action, lockWallets) {
  return { ...dependencies, transaction: fn => dependencies.transaction(async client => {
    const userId = await dependencies.authenticate(request, client, true);
    if (!text(userId)) fail('PLAYER_LOGIN_REQUIRED', 401);
    await lockWallets(client, userId);
    return withSharedRequestOwner(client, { userId, gameId: body?.gameId, requestKey: body?.roundToken, family, action }, () => fn(client));
  }) };
}

/** Wrap the final host factory, after its native dependency overrides. */
export function createGuardedSuperWildsLegacyAction({ createAction, dependencies, kind = 'SPIN' } = {}) {
  if (typeof createAction !== 'function' || !actions.legacy.includes(kind) ||
    !['transaction', 'authenticate', 'lockWallets'].every(name => typeof dependencies?.[name] === 'function')) fail('SUPERWILDS_LEGACY_GUARD_DEPENDENCIES_REQUIRED');
  return async (request, body) => {
    const original = createAction(guardedDependencies(dependencies, request, body, 'legacy', kind, dependencies.lockWallets));
    if (typeof original !== 'function') fail('SUPERWILDS_LEGACY_GUARD_FACTORY_INVALID');
    return original(request, body);
  };
}

/** Prepared M10 shares the same guard; no M10 source/model is renamed. */
export function createGuardedSuperWildsM10Lifecycle({ createLifecycle, dependencies } = {}) {
  if (typeof createLifecycle !== 'function' || typeof dependencies?.wallet?.lockWallets !== 'function' ||
    !['transaction', 'authenticate'].every(name => typeof dependencies?.[name] === 'function')) fail('SUPERWILDS_M10_GUARD_DEPENDENCIES_REQUIRED');
  const baseline = createLifecycle(dependencies), methods = { spin: 'SPIN', takeWin: 'TAKE_WIN', gamble: 'GAMBLE' };
  if (!['handles', 'state', ...Object.keys(methods)].every(name => typeof baseline?.[name] === 'function')) fail('SUPERWILDS_M10_GUARD_FACTORY_INVALID');
  const result = { handles: baseline.handles.bind(baseline), state: baseline.state.bind(baseline) };
  for (const [method, action] of Object.entries(methods)) result[method] = async (request, body) => {
    const scoped = guardedDependencies(dependencies, request, body, 'm10', action, (client, userId) => dependencies.wallet.lockWallets(client, userId));
    return createLifecycle(scoped)[method](request, body);
  };
  return Object.freeze(result);
}

export const ROUND_SQL = Object.freeze({
  gambles: `SELECT receipt FROM sw_new_superwilds.gambles WHERE user_id=$1 AND round_id=$2::uuid ORDER BY attempt LIMIT 1001`,
  journal: `SELECT round_id::text,user_id,game_id,request_key::text,stake_minor::text,win_minor::text,receipt
 FROM sw_new_superwilds.rounds WHERE round_id=$1::uuid FOR SHARE`,
  insertOrder: `INSERT INTO sw_rebuild.rounds(id,user_id,game,bet,payout,outcome)
 VALUES($1,$2,$3,$4::bigint,$5::bigint,$6::jsonb) ON CONFLICT(id) DO NOTHING RETURNING settled_order::text`,
  order: 'SELECT id,user_id,game,bet::text,payout::text,outcome,settled_order::text FROM sw_rebuild.rounds WHERE id=$1',
  nativeActive: `SELECT id,game_id FROM sw_native_library.rounds
 WHERE user_id=$1 AND status='active' ORDER BY created_at,id LIMIT 2`,
  installation: `SELECT
 to_regclass('sw_new_m10.reservations') IS NOT NULL AS m10_reservations,
 to_regclass('sw_new_m10.rounds') IS NOT NULL AS m10_rounds,
 to_regclass('sw_new_m10.collections') IS NOT NULL AS m10_collections,
 to_regclass('sw_new_superwilds.reservations') IS NOT NULL AS superwilds_reservations,
 to_regclass('sw_new_superwilds.rounds') IS NOT NULL AS superwilds_rounds,
 to_regclass('sw_new_superwilds.collections') IS NOT NULL AS superwilds_collections`,
  m10Active: `SELECT h.round_id::text,h.user_id,h.house_wallet_id,h.amount_minor::text,h.closed_reason,
 r.user_id AS round_user_id,r.game_id,r.request_key::text,r.stake_minor::text,r.win_minor::text,r.receipt,c.collection_id::text
 FROM sw_new_m10.reservations h LEFT JOIN sw_new_m10.rounds r ON r.round_id=h.round_id
 LEFT JOIN sw_new_m10.collections c ON c.round_id=h.round_id
 WHERE h.user_id=$1 AND h.amount_minor>0 ORDER BY h.round_id LIMIT 2`,
  superwildsActive: `SELECT h.round_id::text,h.user_id,h.house_wallet_id,h.amount_minor::text,h.closed_reason,
 r.user_id AS round_user_id,r.game_id,r.request_key::text,r.stake_minor::text,r.win_minor::text,r.receipt,c.collection_id::text
 FROM sw_new_superwilds.reservations h LEFT JOIN sw_new_superwilds.rounds r ON r.round_id=h.round_id
 LEFT JOIN sw_new_superwilds.collections c ON c.round_id=h.round_id
 WHERE h.user_id=$1 AND h.amount_minor>0 ORDER BY h.round_id LIMIT 2`,
});

function acceptedReceipt(receipt, gameId, roundId, requestKey, stake, win) {
  const schema = gameId === GAME_ID ? 'zplay/superwilds-round/v1' : 'zplay/m10-deferred-round-receipt/v1';
  if (!receipt || receipt.schema !== schema || receipt.kind !== 'SPIN' || receipt.gameId !== gameId || receipt.currency !== 'ETB' ||
    receipt.roundId !== roundId || receipt.requestKey !== requestKey || !UUID.test(roundId ?? '') || !UUID.test(requestKey ?? '') ||
    minor(receipt.bet) !== stake || minor(receipt.winAmount) !== win || stake <= 0n ||
    receipt.collectionStatus !== (win > 0n ? 'PENDING' : 'NOT_REQUIRED') ||
    !text(receipt.engineVersion, 200) || !text(receipt.mathVersion, 200) || !HASH.test(receipt.mathSha256 ?? '') ||
    receipt.walletReceipt?.currency !== 'ETB' || receipt.walletReceipt.chargedStake !== receipt.bet ||
    receipt.walletReceipt.reservedWin !== receipt.winAmount || receipt.walletReceipt.creditedWin !== '0.00' ||
    minor(receipt.walletReceipt.balanceBefore) - stake !== minor(receipt.walletReceipt.balanceAfter)) fail('SUPERWILDS_SHARED_ROUND_INVALID');
}

/** Same-client hooks; caller supplies the host's protected, stable wallet lock
 * function. Positive Super Wilds holds, prepared M10 holds and native active
 * TEXT ids are merged before state/eligibility is derived.
 */
export function createSuperWildsRoundOwnership({ lockWallets } = {}) {
  if (typeof lockWallets !== 'function') fail('SUPERWILDS_EXISTING_WALLET_LOCKS_REQUIRED');
  async function lock(client, userId) {
    if (typeof client?.query !== 'function' || !text(userId)) fail('SUPERWILDS_EXISTING_TRANSACTION_REQUIRED');
    await lockWallets(client, userId);
  }
  async function registerRound(client, input) {
    const supplied = clone(input);
    if (!supplied || !text(supplied.userId) || supplied.gameId !== GAME_ID || !UUID.test(supplied.roundId ?? '') || !UUID.test(supplied.requestKey ?? '')) fail('SUPERWILDS_SHARED_ROUND_INVALID');
    const stake = minor(supplied.bet), win = minor(supplied.winAmount), receipt = supplied.receipt;
    acceptedReceipt(receipt, GAME_ID, supplied.roundId, supplied.requestKey, stake, win);
    await lock(client, supplied.userId);
    const saved = rows(await client.query(ROUND_SQL.journal, [supplied.roundId]), 'SUPERWILDS_SHARED_ROUND_JOURNAL_MISMATCH');
    const row = saved[0];
    if (saved.length !== 1 || row.round_id !== supplied.roundId.toLowerCase() || row.user_id !== supplied.userId || row.game_id !== GAME_ID ||
      row.request_key !== supplied.requestKey.toLowerCase() || row.stake_minor !== stake.toString() || row.win_minor !== win.toString() ||
      !isDeepStrictEqual(row.receipt, receipt)) fail('SUPERWILDS_SHARED_ROUND_JOURNAL_MISMATCH');
    const sharedRoundId = 'new-superwilds:' + supplied.roundId.toLowerCase();
    // This immutable payout is the accepted base-game award, NOT cash paid.
    // PENDING/creditedWin=0 is retained; paired ledger/collection is cash truth.
    await client.query(ROUND_SQL.insertOrder, [sharedRoundId, supplied.userId, GAME_ID, stake.toString(), win.toString(), JSON.stringify(receipt)]);
    const shared = rows(await client.query(ROUND_SQL.order, [sharedRoundId]), 'SUPERWILDS_SHARED_ROUND_CONFLICT'), actual = shared[0];
    if (shared.length !== 1 || actual.id !== sharedRoundId || actual.user_id !== supplied.userId || actual.game !== GAME_ID ||
      actual.bet !== stake.toString() || actual.payout !== win.toString() || !isDeepStrictEqual(actual.outcome, receipt)) fail('SUPERWILDS_SHARED_ROUND_CONFLICT', 409);
    if (typeof actual.settled_order !== 'string' || !/^[1-9]\d*$/.test(actual.settled_order)) fail('SUPERWILDS_SHARED_ROUND_ORDER_UNAVAILABLE');
    return freeze({ gameId: GAME_ID, roundId: supplied.roundId.toLowerCase(), sharedRoundId, settledOrder: actual.settled_order });
  }
  async function activeRound(client, userId) {
    await lock(client, userId);
    const native = rows(await client.query(ROUND_SQL.nativeActive, [userId]), 'SUPERWILDS_ACTIVE_QUERY_INVALID');
    const installed = rows(await client.query(ROUND_SQL.installation), 'SUPERWILDS_ACTIVE_INSTALLATION_INVALID');
    if (installed.length !== 1) fail('SUPERWILDS_ACTIVE_INSTALLATION_INVALID');
    const active = [];
    for (const row of native) {
      if (!text(row.id) || !text(row.game_id, 64) || [GAME_ID, M10_GAME_ID].includes(row.game_id)) fail('SUPERWILDS_NATIVE_ACTIVE_RECORD_INVALID');
      active.push({ gameId: row.game_id, roundId: row.id });
    }
    for (const [family, gameId, sql] of [['m10', M10_GAME_ID, ROUND_SQL.m10Active], ['superwilds', GAME_ID, ROUND_SQL.superwildsActive]]) {
      const flags = ['reservations', 'rounds', 'collections'].map(name => installed[0][family + '_' + name]);
      if (flags.some(value => typeof value !== 'boolean') || flags.some(Boolean) && !flags.every(Boolean)) fail('SUPERWILDS_ACTIVE_INSTALLATION_INCOMPLETE');
      if (!flags[0]) continue;
      for (const row of rows(await client.query(sql, [userId]), 'SUPERWILDS_ACTIVE_QUERY_INVALID')) {
        if (row.user_id !== userId || row.round_user_id !== userId || row.game_id !== gameId || !UUID.test(row.round_id ?? '') ||
          !UUID.test(row.request_key ?? '') || !text(row.house_wallet_id) || row.house_wallet_id === userId ||
          row.closed_reason !== null || row.collection_id !== null) fail('SUPERWILDS_ACTIVE_JOURNAL_MISMATCH');
        const stake = units(row.stake_minor, true), win = units(row.win_minor, true), held = units(row.amount_minor, true);
        // M10 may increase its pending win through its own journalled gamble;
        // this hook does not overwrite that original receipt or reinterpret it.
        const token = row.receipt?.requestKey;
        if (!UUID.test(token ?? '') || row.request_key !== token.toLowerCase()) fail('SUPERWILDS_ACTIVE_JOURNAL_MISMATCH');
        acceptedReceipt(row.receipt, gameId, row.round_id, token, stake, win);
        if (gameId === GAME_ID) {
          const events = rows(await client.query(ROUND_SQL.gambles, [userId, row.round_id]), 'SUPERWILDS_GAMBLE_JOURNAL_INVALID');
          const derived = deriveSuperWildsPending(row.receipt, events.map(event => event.receipt));
          if (derived.pendingMinor !== held) fail('SUPERWILDS_ACTIVE_JOURNAL_MISMATCH');
        }
        active.push({ gameId, roundId: row.round_id });
      }
    }
    if (active.length > 1) fail('SUPERWILDS_CROSS_GAME_ACTIVE_CONFLICT');
    return active.length ? freeze(active[0]) : null;
  }
  async function assertNoActive(client, userId) {
    const active = await activeRound(client, userId);
    if (active) fail('FINISH_ACTIVE_ROUND:' + active.gameId, 409);
  }
  async function describeLegacyState(client, userId, { readSnapshot, describeGamble } = {}) {
    if (typeof readSnapshot !== 'function' || typeof describeGamble !== 'function') fail('SUPERWILDS_EXISTING_STATE_CALLBACKS_REQUIRED');
    const active = await activeRound(client, userId), snapshot = await readSnapshot(client, userId), base = snapshot?.state, parent = snapshot?.parent;
    if (!base || base.authenticated !== true || base.currency !== 'ETB' || !HASH.test(base.sessionGuard ?? '') ||
      !text(base.game?.id, 64) || [GAME_ID, M10_GAME_ID].includes(base.game.id) || typeof base.game.enabled !== 'boolean') fail('SUPERWILDS_EXISTING_STATE_INVALID');
    minor(base.balance);
    if (parent && (parent.result_json?.gameId !== base.game.id || parent.user_id !== undefined && parent.user_id !== userId)) fail('SUPERWILDS_EXISTING_STATE_OWNER_MISMATCH');
    const blockedByActiveGame = active?.gameId ?? null;
    const gamble = parent ? await describeGamble(client, userId, parent, { enabled: base.game.enabled,
      blockedByActiveGame, currentProfile: snapshot.currentProfile }) : null;
    return freeze({ ...clone(base), blockedByActiveGame,
      round: parent ? { result: clone(parent.result_json), createdAt: clone(parent.created_at), gamble: clone(gamble) } : null });
  }
  return Object.freeze({ registerRound, activeRound, assertNoActive, describeLegacyState });
}
