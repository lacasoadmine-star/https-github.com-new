import { GAME_ID, SuperWildsError } from './lifecycle.mjs';

const MAX = 9223372036854775807n;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail = (code, status = 503) => { throw new SuperWildsError(code, status); };
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 512 && !value.includes('\0');
const units = value => {
  if (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)) value = BigInt(value);
  if (typeof value !== 'bigint' || value < 0n || value > MAX) fail('SUPERWILDS_LEDGER_AMOUNT_INVALID');
  return value;
};
const copy = value => structuredClone(value);
export const COMPONENT = Object.freeze({ mounted: false, productionEnabled: false, appliesMigration: false, createsWallet: false });

// Existing wallet and paired ledger only. The new tables store a liability
// and its audit trail, never an alternative player/house balance.
export const RESERVATION_SQL = Object.freeze({
  installation: `SELECT current_setting('transaction_isolation') AS isolation,
 EXISTS(SELECT 1 FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
 WHERE t.tgrelid=to_regclass('sw_rebuild.wallets') AND t.tgname='superwilds_reserved_house_floor'
 AND t.tgenabled='A' AND NOT t.tgisinternal AND t.tgtype=19 AND t.tgqual IS NULL AND t.tgnargs=0
 AND t.tgattr::text=(SELECT attnum::text FROM pg_catalog.pg_attribute WHERE attrelid=t.tgrelid AND attname='balance' AND NOT attisdropped)
 AND t.tgfoid=to_regprocedure('sw_new_superwilds.enforce_house_floor()') AND p.provolatile='v' AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]) AS wallet_floor,
 EXISTS(SELECT 1 FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
 WHERE t.tgrelid=to_regclass('sw_new_superwilds.reservations') AND t.tgname='superwilds_reservation_funding'
 AND t.tgenabled='A' AND NOT t.tgisinternal AND t.tgtype=31 AND t.tgqual IS NULL AND t.tgnargs=0 AND t.tgattr::text=''
 AND t.tgfoid=to_regprocedure('sw_new_superwilds.enforce_reservation_funding()') AND p.provolatile='v' AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]) AS reservation_funding,
 to_regclass('sw_new_m10.reservations') IS NOT NULL AS m10_installed,
 EXISTS(SELECT 1 FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
 WHERE t.tgrelid=to_regclass('sw_new_m10.reservations') AND t.tgname='superwilds_m10_reservation_funding'
 AND t.tgenabled='A' AND NOT t.tgisinternal AND t.tgtype=31 AND t.tgqual IS NULL AND t.tgnargs=0 AND t.tgattr::text=''
 AND t.tgfoid=to_regprocedure('sw_new_superwilds.enforce_reservation_funding()') AND p.provolatile='v' AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]) AS m10_funding`,
  total: 'SELECT sw_new_superwilds.total_reserved($1)::text AS amount',
  own: 'SELECT COALESCE(SUM(amount_minor),0)::text AS amount FROM sw_new_superwilds.reservations WHERE user_id=$1',
  active: 'SELECT round_id FROM sw_new_superwilds.reservations WHERE user_id=$1 AND amount_minor>0 ORDER BY round_id LIMIT 2',
  reservation: 'SELECT round_id,user_id,house_wallet_id,amount_minor::text,closed_reason FROM sw_new_superwilds.reservations WHERE round_id=$1::uuid FOR UPDATE',
  event: 'SELECT receipt FROM sw_new_superwilds.reservation_events WHERE event_key=$1',
  insertReservation: 'INSERT INTO sw_new_superwilds.reservations(round_id,user_id,house_wallet_id,amount_minor) VALUES($1::uuid,$2,$3,$4::bigint)',
  change: `UPDATE sw_new_superwilds.reservations SET amount_minor=$4::bigint,closed_reason=$5
 WHERE round_id=$1::uuid AND user_id=$2 AND house_wallet_id=$3 AND amount_minor=$6::bigint AND closed_reason IS NULL RETURNING round_id`,
  close: `UPDATE sw_new_superwilds.reservations SET amount_minor=0,closed_reason='COLLECTED'
 WHERE round_id=$1::uuid AND user_id=$2 AND house_wallet_id=$3 AND amount_minor=$4::bigint AND closed_reason IS NULL RETURNING round_id`,
  insertEvent: `INSERT INTO sw_new_superwilds.reservation_events(event_key,round_id,user_id,house_wallet_id,kind,action_id,amount_minor,pending_before,pending_after,transfer_id,receipt)
 VALUES($1,$2::uuid,$3,$4,$5,$6::uuid,$7::bigint,$8::bigint,$9::bigint,$10,$11::jsonb)`,
  transfer: `WITH d AS (
 UPDATE sw_rebuild.wallets SET balance=balance-$3::bigint WHERE id=$1 AND balance >=$3::bigint RETURNING balance),
 cr AS (UPDATE sw_rebuild.wallets SET balance=balance+$3::bigint WHERE id=$2 AND EXISTS(SELECT 1 FROM d) RETURNING balance),
 t AS (INSERT INTO sw_rebuild.transfers(id,sender,recipient,amount,kind,actor)
 SELECT $4,$1,$2,$3::bigint,$5,$6 WHERE EXISTS(SELECT 1 FROM cr) RETURNING id),
 l AS (INSERT INTO sw_rebuild.ledger(transfer_id,wallet_id,delta)
 SELECT t.id,$1,-$3::bigint FROM t UNION ALL SELECT t.id,$2,$3::bigint FROM t RETURNING transfer_id),
 a AS (INSERT INTO sw_new_superwilds.wallet_movements(transfer_id,round_id,user_id,kind,amount_minor,balance_after)
 SELECT t.id,$7::uuid,$6,$8,$3::bigint,CASE WHEN $6=$1 THEN (SELECT balance FROM d) ELSE (SELECT balance FROM cr) END FROM t RETURNING transfer_id)
 SELECT (SELECT count(*) FROM d)::int AS debited,(SELECT count(*) FROM cr)::int AS credited,
 (SELECT count(*) FROM l)::int AS ledger_entries,(SELECT count(*) FROM a)::int AS recorded`,
});

/** Compose with FINAL authenticated host callbacks on its same transaction.
 * Import/construction never create funds, execute a migration or enable cash.
 */
export function createSuperWildsReservationBridge(dependencies) {
  const names = ['lockWallets', 'balance', 'houseFor', 'assertNoActive', 'assertPlayerCapacity', 'activeRound'];
  if (!names.every(name => typeof dependencies?.[name] === 'function') || dependencies.superWildsReservationsAware || dependencies.m10ReservationsAware) {
    fail('SUPERWILDS_RAW_FINAL_HOST_CALLBACKS_REQUIRED');
  }
  const d = dependencies;
  async function ready(client) {
    if (typeof client?.query !== 'function') fail('SUPERWILDS_EXISTING_TRANSACTION_REQUIRED');
    const result = await client.query(RESERVATION_SQL.installation), row = result.rows?.[0];
    if (result.rowCount !== 1 || row?.isolation !== 'read committed' || row.wallet_floor !== true || row.reservation_funding !== true ||
      row.m10_installed !== true || row.m10_funding !== true) fail('SUPERWILDS_PROTECTED_RESERVATIONS_NOT_INSTALLED');
  }
  async function total(client, sql, identifier) {
    const result = await client.query(sql, [identifier]);
    if (result.rowCount !== 1) fail('SUPERWILDS_RESERVED_TOTAL_INVALID');
    return units(result.rows[0].amount);
  }
  async function available(client, identifier) {
    const gross = units(await d.balance(client, identifier));
    const held = await total(client, RESERVATION_SQL.total, identifier);
    if (held > gross) fail('SUPERWILDS_RESERVED_HOUSE_FUNDS_MISSING');
    return gross - held;
  }
  async function scope(client, userId) {
    if (!text(userId)) fail('SUPERWILDS_OWNER_INVALID', 400);
    await ready(client);
    const houseId = await d.houseFor(userId);
    if (!text(houseId) || houseId === userId) fail('SUPERWILDS_EXISTING_HOUSE_REQUIRED');
    const locked = await d.lockWallets(client, userId);
    if (!Array.isArray(locked) || ![userId, houseId].every(id => locked.some(row => row.id === id))) fail('SUPERWILDS_EXISTING_WALLET_LOCKS_REQUIRED');
    return { houseId, locked };
  }
  function action(value, kind) {
    if (value?.gameId !== GAME_ID || !text(value.userId) || !UUID.test(value.roundId ?? '') ||
      typeof value.amountMinor !== 'bigint' || units(value.amountMinor) <= 0n) fail('SUPERWILDS_RESERVATION_ACTION_INVALID', 400);
    const actionId = kind === 'COLLECT' ? value.collectionId : ['INCREASE', 'RELEASE'].includes(kind) ? value.actionId : null;
    if (actionId !== null && !UUID.test(actionId ?? '')) fail('SUPERWILDS_RESERVATION_ACTION_ID_INVALID', 400);
    return { userId: value.userId, roundId: value.roundId.toLowerCase(), kind,
      actionId: actionId?.toLowerCase() ?? null, amountMinor: value.amountMinor.toString(), eventKey: ['INCREASE', 'RELEASE'].includes(kind) ? `GAMBLE:${actionId.toLowerCase()}` : `${kind}:${value.roundId.toLowerCase()}` };
  }
  async function existing(client, expected) {
    const result = await client.query(RESERVATION_SQL.event, [expected.eventKey]);
    if (result.rowCount === 0) return null;
    const receipt = result.rows?.[0]?.receipt;
    if (result.rowCount !== 1 || receipt?.schema !== 'zplay/superwilds-reservation-event/v1' || receipt.gameId !== GAME_ID ||
      !text(receipt.houseWalletId) || Object.keys(expected).some(key => receipt[key] !== expected[key])) fail('IDEMPOTENCY_PARAMETER_CONFLICT', 409);
    return copy(receipt);
  }
  async function reservation(client, expected, houseId, required = true) {
    const result = await client.query(RESERVATION_SQL.reservation, [expected.roundId]);
    if (!required && result.rowCount === 0) return null;
    if (result.rowCount !== 1) fail('SUPERWILDS_RESERVED_WIN_MISSING', 409);
    const row = result.rows[0];
    if (row.user_id !== expected.userId) fail('SUPERWILDS_RESERVATION_OWNER_MISMATCH', 409);
    if (row.house_wallet_id !== houseId) fail('SUPERWILDS_RESERVATION_HOUSE_CHANGED', 409);
    return { ...row, amount: units(row.amount_minor) };
  }
  async function transfer(client, expected, houseId) {
    const bet = expected.kind === 'BET', from = bet ? expected.userId : houseId, to = bet ? houseId : expected.userId;
    const transferId = `new-superwilds:${expected.roundId}:${bet ? 'BET' : 'WIN'}`;
    const result = await client.query(RESERVATION_SQL.transfer, [from, to, expected.amountMinor, transferId,
      bet ? 'bet' : 'win', expected.userId, expected.roundId, bet ? 'BET' : 'WIN']);
    const row = result.rows?.[0];
    if (result.rowCount !== 1 || row?.debited !== 1) fail(bet ? 'INSUFFICIENT_FUNDS' : 'SUPERWILDS_RESERVED_HOUSE_FUNDS_MISSING', bet ? 402 : 503);
    if (row.credited !== 1 || row.ledger_entries !== 2 || row.recorded !== 1) fail('SUPERWILDS_EXISTING_LEDGER_WRITE_INCOMPLETE');
    return transferId;
  }
  async function event(client, expected, houseId, before, after, transferId = null) {
    const receipt = { schema: 'zplay/superwilds-reservation-event/v1', gameId: GAME_ID, ...expected,
      houseWalletId: houseId, pendingBefore: before.toString(), pendingAfter: after.toString(), transferId };
    const result = await client.query(RESERVATION_SQL.insertEvent, [expected.eventKey, expected.roundId, expected.userId, houseId,
      expected.kind, expected.actionId, expected.amountMinor, receipt.pendingBefore, receipt.pendingAfter, transferId, JSON.stringify(receipt)]);
    if (result.rowCount !== 1) fail('SUPERWILDS_RESERVATION_EVENT_NOT_RECORDED');
    return copy(receipt);
  }
  async function mutate(client, input, kind) {
    const expected = action(input, kind), { houseId } = await scope(client, expected.userId);
    const replay = await existing(client, expected);
    if (replay) {
      if (replay.houseWalletId !== houseId) fail('SUPERWILDS_RESERVATION_HOUSE_CHANGED', 409);
      return replay;
    }
    if (kind === 'BET') return event(client, expected, houseId, 0n, 0n, await transfer(client, expected, houseId));
    const amount = BigInt(expected.amountMinor);
    if (kind === 'RESERVE') {
      if (await reservation(client, expected, houseId, false)) fail('SUPERWILDS_RESERVATION_ALREADY_EXISTS', 409);
      if (await available(client, houseId) < amount) fail('SUPERWILDS_HOUSE_CAPACITY_UNAVAILABLE');
      const result = await client.query(RESERVATION_SQL.insertReservation, [expected.roundId, expected.userId, houseId, expected.amountMinor]);
      if (result.rowCount !== 1) fail('SUPERWILDS_RESERVATION_NOT_RECORDED');
      return event(client, expected, houseId, 0n, amount);
    }
    const held = await reservation(client, expected, houseId);
    if (held.closed_reason !== null || held.amount !== amount) fail('SUPERWILDS_PENDING_WIN_AMOUNT_CHANGED', 409);
    if (kind === 'INCREASE' || kind === 'RELEASE') {
      const after = kind === 'INCREASE' ? units(amount * 2n) : 0n;
      if (kind === 'INCREASE' && await available(client, houseId) < amount) fail('SUPERWILDS_HOUSE_CAPACITY_UNAVAILABLE');
      const changed = await client.query(RESERVATION_SQL.change, [expected.roundId, expected.userId, houseId,
        after.toString(), kind === 'RELEASE' ? 'LOST' : null, amount.toString()]);
      if (changed.rowCount !== 1) fail('SUPERWILDS_PENDING_WIN_STATE_CHANGED', 409);
      // The original pending award was already reserved. A gamble changes
      // only that liability and its immutable event, with no player transfer.
      return event(client, expected, houseId, amount, after);
    }
    // Close exactly this hold before paying. A later SQL failure rolls the
    // closure, transfer and both paired ledger entries back together.
    const result = await client.query(RESERVATION_SQL.close, [expected.roundId, expected.userId, houseId, expected.amountMinor]);
    if (result.rowCount !== 1) fail('SUPERWILDS_PENDING_WIN_STATE_CHANGED', 409);
    return event(client, expected, houseId, amount, 0n, await transfer(client, expected, houseId));
  }
  async function ownActive(client, userId) {
    const result = await client.query(RESERVATION_SQL.active, [userId]);
    if (!Array.isArray(result.rows) || result.rows.length > 1) fail('SUPERWILDS_ACTIVE_RESERVATION_INVALID');
    return result.rows[0] ? { gameId: GAME_ID, roundId: result.rows[0].round_id } : null;
  }
  async function assertNone(client, userId) {
    await d.assertNoActive(client, userId);
    if (await ownActive(client, userId)) fail('FINISH_ACTIVE_ROUND:' + GAME_ID, 409);
  }
  const wallet = Object.freeze({
    assertReady: ready,
    lockWallets: async (client, userId) => (await scope(client, userId)).locked,
    playerBalance: async (client, userId) => { await scope(client, userId); return units(await d.balance(client, userId)); },
    houseBalance: async (client, userId) => available(client, (await scope(client, userId)).houseId),
    reservedBalance: async (client, userId) => { await scope(client, userId); return total(client, RESERVATION_SQL.own, userId); },
    debitStake: (client, args) => mutate(client, args, 'BET'),
    reserveWin: (client, args) => mutate(client, args, 'RESERVE'),
    increaseReservedWin: (client, args) => mutate(client, args, 'INCREASE'),
    releaseReservedWin: (client, args) => mutate(client, args, 'RELEASE'),
    creditReservedWin: (client, args) => mutate(client, args, 'COLLECT'),
    assertPlayerCapacity: (...args) => d.assertPlayerCapacity(...args),
    assertNoActiveRound: async (client, userId) => { await scope(client, userId); await assertNone(client, userId); },
    activeRound: async (client, userId) => {
      await scope(client, userId); const old = await d.activeRound(client, userId), own = await ownActive(client, userId);
      if (old && own) fail('SUPERWILDS_CROSS_GAME_ACTIVE_CONFLICT');
      return own || old;
    },
    claimActiveRound: async (client, userId, gameId, roundId) => {
      await scope(client, userId); await d.assertNoActive(client, userId);
      const own = await ownActive(client, userId);
      if (gameId !== GAME_ID || own?.roundId !== roundId) fail('SUPERWILDS_ACTIVE_RESERVATION_INVALID');
    },
    releaseActiveRound: async (client, userId, gameId, roundId) => {
      const { houseId } = await scope(client, userId), held = await reservation(client, { userId, roundId }, houseId);
      if (gameId !== GAME_ID || held.amount !== 0n || !['COLLECTED', 'LOST'].includes(held.closed_reason)) fail('SUPERWILDS_ACTIVE_RESERVATION_NOT_RELEASED');
    },
  });
  const legacyDependencies = Object.freeze({ ...d, superWildsReservationsAware: true,
    lockWallets: async (client, userId) => {
      const { locked, houseId } = await scope(client, userId), reserve = await available(client, houseId);
      return locked.map(row => row.id === houseId ? { ...row, balance: reserve.toString() } : { ...row });
    },
    balance: async (client, walletId) => { await ready(client); return available(client, walletId); },
    assertNoActive: async (client, userId) => { await scope(client, userId); await assertNone(client, userId); },
  });
  return Object.freeze({ wallet, legacyDependencies });
}
