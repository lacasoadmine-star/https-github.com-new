/** Unmounted M10 callbacks for the existing ETB wallet and paired ledger.
 * No RNG, model, account creation, endpoint or migration runs on import.
 * Every call must use the host's SAME transaction client; no autocommit use.
 */
export const GAME_ID = 'zplay72_multi_hot_10_v1';
export const COMPONENT = Object.freeze({ mounted: false, productionEnabled: false,
  migrationApplied: false, createsWallet: false, providerRngRequired: false });
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MAX = 9223372036854775807n;
export class ReservationError extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}
const fail = (code, status) => { throw new ReservationError(code, status); };
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 512 && !value.includes('\0');
function units(value) {
  if (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)) value = BigInt(value);
  if (typeof value !== 'bigint' || value < 0n || value > MAX) fail('M10_LEDGER_MINOR_INVALID');
  return value;
}
const copy = value => structuredClone(value);

// Identities and amounts are parameters. Only fixed, qualified schema names.
export const SQL = Object.freeze({
  installation: `SELECT current_setting('transaction_isolation') AS isolation,
 EXISTS(SELECT 1 FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
 WHERE t.tgrelid=to_regclass('sw_rebuild.wallets') AND t.tgname='m10_reserved_house_floor'
 AND t.tgenabled='A' AND NOT t.tgisinternal AND t.tgtype=19 AND t.tgqual IS NULL AND t.tgnargs=0
 AND t.tgattr::text=(SELECT attnum::text FROM pg_catalog.pg_attribute WHERE attrelid=t.tgrelid AND attname='balance' AND NOT attisdropped)
 AND t.tgfoid=to_regprocedure('sw_new_m10.enforce_house_floor()') AND p.provolatile='v' AND p.prosecdef
 AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]) AS wallet_floor,
 EXISTS(SELECT 1 FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
 WHERE t.tgrelid=to_regclass('sw_new_m10.reservations') AND t.tgname='m10_reservation_funding'
 AND t.tgenabled='A' AND NOT t.tgisinternal AND t.tgtype=31 AND t.tgqual IS NULL AND t.tgnargs=0
 AND t.tgattr::text='' AND t.tgfoid=to_regprocedure('sw_new_m10.enforce_reservation_funding()')
 AND p.provolatile='v' AND p.prosecdef AND p.proconfig @> ARRAY['search_path=pg_catalog']::text[]) AS reservation_funding`,
  houseHeld: 'SELECT COALESCE(SUM(amount_minor),0)::text AS amount FROM sw_new_m10.reservations WHERE house_wallet_id=$1',
  playerHeld: 'SELECT COALESCE(SUM(amount_minor),0)::text AS amount FROM sw_new_m10.reservations WHERE user_id=$1',
  reservation: 'SELECT round_id,user_id,house_wallet_id,amount_minor::text,closed_reason FROM sw_new_m10.reservations WHERE round_id=$1::uuid FOR UPDATE',
  active: 'SELECT round_id,user_id,house_wallet_id,amount_minor::text FROM sw_new_m10.reservations WHERE user_id=$1 AND amount_minor>0 ORDER BY round_id',
  event: 'SELECT receipt FROM sw_new_m10.reservation_events WHERE event_key=$1',
  insertReservation: 'INSERT INTO sw_new_m10.reservations(round_id,user_id,house_wallet_id,amount_minor) VALUES($1::uuid,$2,$3,$4::bigint)',
  changeReservation: `UPDATE sw_new_m10.reservations SET amount_minor=$4::bigint,closed_reason=$5
 WHERE round_id=$1::uuid AND user_id=$2 AND house_wallet_id=$3 AND amount_minor=$6::bigint AND closed_reason IS NULL RETURNING round_id`,
  insertEvent: `INSERT INTO sw_new_m10.reservation_events(event_key,round_id,user_id,house_wallet_id,kind,action_id,amount_minor,pending_before,pending_after,transfer_id,receipt)
 VALUES($1,$2::uuid,$3,$4,$5,$6::uuid,$7::bigint,$8::bigint,$9::bigint,$10,$11::jsonb)`,
  // Same existing wallet/transfer/paired-ledger contract, with a distinct ID
  // prefix and new-game audit table. No orphan sw_nine audit row is created.
  transfer: `WITH d AS (
 UPDATE sw_rebuild.wallets SET balance=balance-$3::bigint WHERE id=$1 AND balance >=$3::bigint RETURNING balance),
 cr AS (UPDATE sw_rebuild.wallets SET balance=balance+$3::bigint WHERE id=$2 AND EXISTS(SELECT 1 FROM d) RETURNING balance),
 t AS (INSERT INTO sw_rebuild.transfers(id,sender,recipient,amount,kind,actor)
 SELECT $4,$1,$2,$3::bigint,$5,$6 WHERE EXISTS(SELECT 1 FROM cr) RETURNING id),
 l AS (INSERT INTO sw_rebuild.ledger(transfer_id,wallet_id,delta)
 SELECT t.id,$1,-$3::bigint FROM t UNION ALL SELECT t.id,$2,$3::bigint FROM t RETURNING transfer_id),
 a AS (INSERT INTO sw_new_m10.wallet_movements(transfer_id,round_id,user_id,kind,amount_minor,balance_after)
 SELECT t.id,$7::uuid,$6,$8,$3::bigint,CASE WHEN $6=$1 THEN (SELECT balance FROM d) ELSE (SELECT balance FROM cr) END FROM t RETURNING transfer_id)
 SELECT (SELECT count(*) FROM d)::int AS debited,(SELECT count(*) FROM cr)::int AS credited,
 (SELECT count(*) FROM l)::int AS ledger_entries,(SELECT count(*) FROM a)::int AS recorded`,
});

/**
 * Uses the original host locks, balances, house mapping and active-round read.
 * The returned wallet object matches createMultiHot10PostgresLifecycle's
 * financial callback names. The original host must still supply the journal,
 * request-owner guard, shared round ordering and authenticated model hooks.
 */
export function createM10ReservationBridge(dependencies) {
  const required = ['lockWallets', 'balance', 'houseFor', 'assertNoActive', 'assertPlayerCapacity', 'activeRound'];
  if (!required.every(name => typeof dependencies?.[name] === 'function') || dependencies.m10ReservationsAware) {
    fail('M10_RAW_HOST_CALLBACKS_REQUIRED');
  }
  const d = dependencies;
  async function ready(client) {
    if (typeof client?.query !== 'function') fail('M10_EXISTING_TRANSACTION_REQUIRED');
    const r = await client.query(SQL.installation), row = r.rows?.[0];
    if (r.rowCount !== 1 || row?.isolation !== 'read committed' || row.wallet_floor !== true || row.reservation_funding !== true) {
      fail('M10_ENFORCED_RESERVATION_MIGRATION_REQUIRED');
    }
  }
  async function held(client, sql, value) {
    const r = await client.query(sql, [value]);
    if (r.rowCount !== 1) fail('M10_HOLD_TOTAL_INVALID');
    return units(r.rows[0].amount);
  }
  async function available(client, walletId) {
    const gross = units(await d.balance(client, walletId)), reserved = await held(client, SQL.houseHeld, walletId);
    if (reserved > gross) fail('M10_RESERVED_HOUSE_FUNDS_MISSING');
    return gross - reserved;
  }
  async function scope(client, userId) {
    if (!id(userId)) fail('M10_OWNER_INVALID', 400);
    await ready(client);
    const houseId = await d.houseFor(userId);
    if (!id(houseId) || houseId === userId) fail('M10_HOUSE_BINDING_INVALID');
    const locked = await d.lockWallets(client, userId);
    if (!Array.isArray(locked) || ![userId, houseId].every(value => locked.some(row => row.id === value))) {
      fail('M10_EXISTING_WALLET_LOCKS_REQUIRED');
    }
    return { userId, houseId, locked };
  }
  function action(args, kind) {
    if (!args || args.gameId !== GAME_ID || !id(args.userId) || !UUID.test(args.roundId ?? '') ||
      typeof args.amountMinor !== 'bigint' || units(args.amountMinor) <= 0n) fail('M10_RESERVATION_ACTION_INVALID', 400);
    const actionId = kind === 'COLLECT' ? args.collectionId : ['INCREASE', 'RELEASE'].includes(kind) ? args.actionId : null;
    if (actionId !== null && !UUID.test(actionId ?? '')) fail('M10_RESERVATION_ACTION_ID_INVALID', 400);
    const eventKey = ['INCREASE', 'RELEASE'].includes(kind) ? 'GAMBLE:' + actionId : kind + ':' + args.roundId;
    return { userId: args.userId, roundId: args.roundId.toLowerCase(), kind, actionId: actionId?.toLowerCase() ?? null,
      amountMinor: args.amountMinor.toString(), eventKey: eventKey.toLowerCase() };
  }
  async function existingEvent(client, expected) {
    const r = await client.query(SQL.event, [expected.eventKey]);
    if (!r.rowCount) return null;
    const receipt = r.rows?.[0]?.receipt;
    if (r.rowCount !== 1 || !receipt || receipt.schema !== 'zplay/m10-reservation-event/v1' || receipt.gameId !== GAME_ID ||
      !id(receipt.houseWalletId) || Object.keys(expected).some(key => receipt[key] !== expected[key])) {
      fail('IDEMPOTENCY_PARAMETER_CONFLICT', 409);
    }
    return copy(receipt);
  }
  async function reservation(client, expected, houseId, required = true) {
    const r = await client.query(SQL.reservation, [expected.roundId]);
    if (!r.rowCount && !required) return null;
    if (r.rowCount !== 1) fail('M10_RESERVED_WIN_MISSING', 409);
    const row = r.rows[0];
    if (row.user_id !== expected.userId) fail('M10_RESERVATION_OWNER_MISMATCH', 409);
    // A later agent/house reassignment cannot redirect an accepted liability.
    if (row.house_wallet_id !== houseId) fail('M10_RESERVATION_HOUSE_CHANGED', 409);
    return { ...row, amount: units(row.amount_minor) };
  }
  async function writeEvent(client, expected, houseId, before, after, transferId = null) {
    const receipt = { schema: 'zplay/m10-reservation-event/v1', gameId: GAME_ID, ...expected,
      houseWalletId: houseId, pendingBefore: before.toString(), pendingAfter: after.toString(), transferId };
    const r = await client.query(SQL.insertEvent, [expected.eventKey, expected.roundId, expected.userId, houseId,
      expected.kind, expected.actionId, expected.amountMinor, receipt.pendingBefore, receipt.pendingAfter, transferId, JSON.stringify(receipt)]);
    if (r.rowCount !== 1) fail('M10_RESERVATION_EVENT_NOT_RECORDED');
    return copy(receipt);
  }
  async function change(client, expected, houseId, before, after, reason = null) {
    const r = await client.query(SQL.changeReservation, [expected.roundId, expected.userId, houseId,
      units(after).toString(), reason, before.toString()]);
    if (r.rowCount !== 1) fail('M10_RESERVATION_STATE_CHANGED', 409);
  }
  async function transfer(client, expected, houseId) {
    const bet = expected.kind === 'BET', from = bet ? expected.userId : houseId, to = bet ? houseId : expected.userId;
    const kind = bet ? 'BET' : 'WIN', transferId = 'new-m10:' + expected.roundId + ':' + kind;
    const r = await client.query(SQL.transfer, [from, to, expected.amountMinor, transferId,
      bet ? 'bet' : 'win', expected.userId, expected.roundId, kind]);
    const row = r.rows?.[0];
    if (r.rowCount !== 1 || row?.debited !== 1) fail(bet ? 'INSUFFICIENT_FUNDS' : 'M10_RESERVED_HOUSE_FUNDS_MISSING', bet ? 402 : 503);
    if (row.credited !== 1 || row.ledger_entries !== 2 || row.recorded !== 1) fail('M10_EXISTING_LEDGER_WRITE_INCOMPLETE');
    return transferId;
  }
  async function mutate(client, args, kind) {
    const expected = action(args, kind), { houseId } = await scope(client, expected.userId);
    const replay = await existingEvent(client, expected);
    if (replay) return replay;
    const amount = BigInt(expected.amountMinor);
    if (kind === 'BET') return writeEvent(client, expected, houseId, 0n, 0n, await transfer(client, expected, houseId));
    if (kind === 'RESERVE') {
      if (await reservation(client, expected, houseId, false)) fail('M10_RESERVATION_ALREADY_EXISTS', 409);
      if (await available(client, houseId) < amount) fail('M10_HOUSE_CAPACITY_UNAVAILABLE');
      const r = await client.query(SQL.insertReservation, [expected.roundId, expected.userId, houseId, amount.toString()]);
      if (r.rowCount !== 1) fail('M10_RESERVATION_NOT_RECORDED');
      return writeEvent(client, expected, houseId, 0n, amount);
    }
    const row = await reservation(client, expected, houseId);
    if (row.closed_reason !== null || row.amount <= 0n) fail('M10_RESERVATION_ALREADY_CLOSED', 409);
    if (kind === 'INCREASE') {
      if (row.amount !== amount) fail('M10_PENDING_WIN_AMOUNT_CHANGED', 409);
      if (await available(client, houseId) < amount) fail('M10_HOUSE_CAPACITY_UNAVAILABLE');
      await change(client, expected, houseId, row.amount, row.amount + amount);
      return writeEvent(client, expected, houseId, row.amount, row.amount + amount);
    }
    if (row.amount !== amount) fail('M10_PENDING_WIN_AMOUNT_CHANGED', 409);
    // Release this exact claim before WIN so an exactly funded house can pay.
    // The host transaction rolls this back too if the paired ledger write fails.
    await change(client, expected, houseId, row.amount, 0n, kind === 'COLLECT' ? 'COLLECTED' : 'LOST');
    const transferId = kind === 'COLLECT' ? await transfer(client, expected, houseId) : null;
    return writeEvent(client, expected, houseId, row.amount, 0n, transferId);
  }
  async function ownActive(client, userId) {
    const r = await client.query(SQL.active, [userId]);
    if (!Array.isArray(r.rows) || r.rows.length > 1) fail('M10_ACTIVE_RESERVATION_INVALID');
    return r.rows[0] ? { gameId: GAME_ID, roundId: r.rows[0].round_id } : null;
  }
  async function assertNone(client, userId) {
    await d.assertNoActive(client, userId);
    if (await ownActive(client, userId)) fail('FINISH_ACTIVE_ROUND:' + GAME_ID, 409);
  }
  const wallet = Object.freeze({
    lockWallets: async (client, userId) => (await scope(client, userId)).locked,
    playerBalance: async (client, userId) => { await scope(client, userId); return units(await d.balance(client, userId)); },
    houseBalance: async (client, userId) => available(client, (await scope(client, userId)).houseId),
    reserveBalance: async (client, userId) => { await scope(client, userId); return held(client, SQL.playerHeld, userId); },
    debitStake: (client, args) => mutate(client, args, 'BET'),
    reserveWin: (client, args) => mutate(client, args, args?.actionId === undefined ? 'RESERVE' : 'INCREASE'),
    releaseReservedWin: (client, args) => mutate(client, args, 'RELEASE'),
    creditReservedWin: (client, args) => mutate(client, args, 'COLLECT'),
    assertNoActiveRound: async (client, userId) => { await scope(client, userId); await assertNone(client, userId); },
    assertPlayerCapacity: (...args) => d.assertPlayerCapacity(...args),
    activeRound: async (client, userId) => {
      await scope(client, userId);
      const old = await d.activeRound(client, userId), own = await ownActive(client, userId);
      if (old && own) fail('M10_CROSS_GAME_ACTIVE_CONFLICT');
      return own || old;
    },
    claimActiveRound: async (client, userId, gameId, roundId) => {
      await scope(client, userId); await d.assertNoActive(client, userId);
      const own = await ownActive(client, userId);
      if (gameId !== GAME_ID || own?.roundId !== roundId) fail('M10_ACTIVE_RESERVATION_INVALID');
    },
    releaseActiveRound: async (client, userId, gameId, roundId) => {
      const { houseId } = await scope(client, userId);
      const row = await reservation(client, { userId, roundId }, houseId);
      if (gameId !== GAME_ID || row.amount !== 0n || !row.closed_reason) fail('M10_ACTIVE_RESERVATION_NOT_RELEASED');
    },
  });
  // Install alongside M10 so old state() reads that consume lock return rows
  // and old balance() capacity checks both see the same available house funds.
  const legacyDependencies = Object.freeze({ ...d, m10ReservationsAware: true,
    lockWallets: async (client, userId) => {
      const { locked, houseId } = await scope(client, userId);
      const amount = await available(client, houseId);
      return locked.map(row => row.id === houseId ? { ...row, balance: amount.toString() } : { ...row });
    },
    balance: async (client, walletId) => { await ready(client); return available(client, walletId); },
    assertNoActive: async (client, userId) => { await scope(client, userId); await assertNone(client, userId); },
  });
  return Object.freeze({ wallet, legacyDependencies });
}
