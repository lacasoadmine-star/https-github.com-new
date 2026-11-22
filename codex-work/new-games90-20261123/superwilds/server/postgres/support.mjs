/** REAL PostgreSQL fixture callbacks. Imported only by the disposable runner.
 * Mirrors final host callbacks using the EXISTING wallet/ledger table names;
 * these synthetic funds/model/session fixtures cannot be installed by import.
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { createSuperWildsPostgresService } from '../postgres.mjs';
import { GAME_ID, SuperWildsError } from '../lifecycle.mjs';
export const MATH = Object.freeze({ engineVersion: 'synthetic-postgres-qa', mathVersion: 'synthetic-postgres-qa', mathSha256: 'd'.repeat(64) });
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (code, status = 503) => { throw new SuperWildsError(code, status); };
export function createPgSupport(pool) {
  const houses = new Map(), checkedOut = new Set();
  const connect = async () => { const client = await pool.connect(); checkedOut.add(client); return client; };
  const release = client => { if (checkedOut.delete(client)) client.release(); };
  const begin = async client => {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await client.query("SET LOCAL lock_timeout='10s'");
    await client.query("SET LOCAL statement_timeout='15s'");
  };
  const transaction = async operation => {
    const client = await connect();
    try { await begin(client); const result = await operation(client); await client.query('COMMIT'); return result; }
    catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { release(client); }
  };
  const token = request => {
    const raw = request.headers.get('cookie')?.match(/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/i)?.[1];
    if (!raw) fail('PLAYER_LOGIN_REQUIRED', 401); return raw;
  };
  const sessionGuard = (request, userId) => hash('fresh-account-session-v1\0' + userId + '\0' + token(request));
  const authenticate = async (request, client = pool, locked = false) => {
    const r = await client.query(`SELECT u.id,u.role,u.status FROM sw_rebuild.sessions s
      JOIN sw_rebuild.users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires>$2${locked ? ' FOR SHARE OF s,u' : ''}`,
      [hash(token(request)), Date.now()]);
    if (r.rowCount !== 1 || r.rows[0].role !== 'player' || r.rows[0].status !== 'active') fail('PLAYER_LOGIN_REQUIRED', 401);
    return r.rows[0].id;
  };
  const houseFor = userId => { const id = houses.get(userId); if (!id) fail('HOUSE_WALLET_MISSING'); return id; };
  const lockWallets = async (client, userId) => {
    const r = await client.query('SELECT id,balance FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',
      [[userId, houseFor(userId)]]);
    if (r.rowCount !== 2) fail('PLAYER_OR_HOUSE_WALLET_MISSING'); return r.rows;
  };
  const balance = async (client, walletId) => {
    const r = await client.query('SELECT balance::text FROM sw_rebuild.wallets WHERE id=$1', [walletId]);
    if (r.rowCount !== 1) fail('WALLET_NOT_CONFIGURED'); return BigInt(r.rows[0].balance);
  };
  const held = async (client, userId) => BigInt((await client.query(
    'SELECT COALESCE(SUM(amount_minor),0)::text AS held FROM sw_new_superwilds.reservations WHERE user_id=$1', [userId])).rows[0].held);
  const houseBalance = async (client, userId) => {
    const houseId = houseFor(userId), gross = await balance(client, houseId);
    const reserved = BigInt((await client.query('SELECT qa_superwilds.total_reserved($1)::text AS held', [houseId])).rows[0].held);
    if (reserved > gross) fail('RESERVED_HOUSE_FUNDS_MISSING'); return gross - reserved;
  };
  async function assertReady(client) {
    const r = await client.query(`SELECT current_setting('transaction_isolation') AS isolation,
      EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=to_regclass('sw_rebuild.wallets')
        AND tgname='qa_superwilds_house_floor' AND tgenabled='A' AND NOT tgisinternal
        AND tgfoid=to_regprocedure('qa_superwilds.enforce_floor()')) AS floor,
      EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=to_regclass('sw_new_superwilds.reservations')
        AND tgname='qa_superwilds_reservation_funding' AND tgenabled='A' AND NOT tgisinternal
        AND tgfoid=to_regprocedure('qa_superwilds.enforce_funding()')) AS funding`);
    if (r.rowCount !== 1 || r.rows[0].isolation !== 'read committed' || r.rows[0].floor !== true || r.rows[0].funding !== true) {
      fail('SUPERWILDS_RESERVED_FLOOR_NOT_INSTALLED');
    }
  }
  const owners = async (client, identity) => (await client.query(`
      SELECT game_id,'SPIN'::text AS kind FROM sw_nine.game_rounds WHERE user_id=$1 AND lower(request_key)=$2
      UNION ALL SELECT game_id,kind FROM sw_nine.actions WHERE user_id=$1 AND lower(request_key)=$2
      UNION ALL SELECT receipt->>'gameId' AS game_id,kind FROM sw_new_superwilds.requests WHERE user_id=$1 AND request_key=$2::uuid`,
    [identity.userId, identity.requestKey.toLowerCase()])).rows;
  const assertOwner = (rows, identity, required) => {
    if (rows.length > 1 || required && rows.length !== 1) fail('REQUEST_OWNER_AMBIGUOUS');
    if (rows.some(row => row.game_id !== identity.gameId || row.kind !== identity.kind)) fail('IDEMPOTENCY_PARAMETER_CONFLICT', 409);
  };
  const withRequestOwner = async (client, identity, operation) => {
    await client.query('SELECT pg_advisory_xact_lock(1515213391,hashtext($1::text))',
      [JSON.stringify(['zplay-request-owner-v1', identity.userId, identity.requestKey.toLowerCase()])]);
    assertOwner(await owners(client, identity), identity, false);
    const result = await operation(); assertOwner(await owners(client, identity), identity, true); return result;
  };
  const transfer = async (client, { userId, roundId, amountMinor, kind, from, to, prefix = 'new-superwilds:' }) => {
    const id = prefix + roundId + ':' + kind;
    const debit = await client.query('UPDATE sw_rebuild.wallets SET balance=balance-$2::bigint WHERE id=$1 AND balance>=$2::bigint RETURNING balance', [from, amountMinor.toString()]);
    if (debit.rowCount !== 1) fail('INSUFFICIENT_FUNDS', 402);
    const credit = await client.query('UPDATE sw_rebuild.wallets SET balance=balance+$2::bigint WHERE id=$1 RETURNING balance', [to, amountMinor.toString()]);
    if (credit.rowCount !== 1) fail('WALLET_NOT_CONFIGURED');
    await client.query('INSERT INTO sw_rebuild.transfers(id,sender,recipient,amount,kind,actor) VALUES($1,$2,$3,$4::bigint,$5,$6)',
      [id, from, to, amountMinor.toString(), kind.toLowerCase(), userId]);
    const l = await client.query('INSERT INTO sw_rebuild.ledger(transfer_id,wallet_id,delta) VALUES($1,$2,-$4::bigint),($1,$3,$4::bigint)',
      [id, from, to, amountMinor.toString()]);
    if (l.rowCount !== 2) fail('INCOMPLETE_PAIRED_LEDGER');
  };
  const activeRound = async (client, userId) => {
    const r = await client.query(`SELECT round_id::text AS round_id,$2::text AS game_id FROM sw_new_superwilds.reservations WHERE user_id=$1 AND amount_minor>0
      UNION ALL SELECT id,game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active'`, [userId, GAME_ID]);
    if (r.rowCount > 1) fail('CROSS_GAME_ACTIVE_CONFLICT');
    return r.rows[0] ? { gameId: r.rows[0].game_id, roundId: r.rows[0].round_id } : null;
  };
  const wallet = {
    lockWallets, assertReady, playerBalance: (client, userId) => balance(client, userId), houseBalance,
    reservedBalance: held, activeRound,
    assertNoActiveRound: async (client, userId) => { const active = await activeRound(client, userId); if (active) fail('FINISH_ACTIVE_ROUND:' + active.gameId, 409); },
    assertPlayerCapacity: async (client, userId, before, stake, maximum) => {
      const row = (await client.query('SELECT max_balance::text FROM sw_rebuild.account_limits WHERE user_id=$1', [userId])).rows[0];
      if (row?.max_balance != null && before - stake + maximum > BigInt(row.max_balance)) fail('ACCOUNT_BALANCE_LIMIT', 409);
    },
    debitStake: (client, action) => transfer(client, { ...action, kind: 'BET', from: action.userId, to: houseFor(action.userId) }),
    reserveWin: async (client, a) => {
      assert.equal(a.gameId, GAME_ID);
      await client.query('INSERT INTO sw_new_superwilds.reservations(round_id,user_id,house_id,amount_minor) VALUES($1::uuid,$2,$3,$4::bigint)',
        [a.roundId, a.userId, houseFor(a.userId), a.amountMinor.toString()]);
    },
    creditReservedWin: async (client, a) => {
      const r = await client.query('UPDATE sw_new_superwilds.reservations SET amount_minor=0,closed=true WHERE round_id=$1::uuid AND user_id=$2 AND house_id=$3 AND amount_minor=$4::bigint AND closed=false RETURNING round_id',
        [a.roundId, a.userId, houseFor(a.userId), a.amountMinor.toString()]);
      if (r.rowCount !== 1) fail('SUPERWILDS_RESERVED_WIN_MISSING');
      await transfer(client, { ...a, kind: 'WIN', from: houseFor(a.userId), to: a.userId });
    },
    claimActiveRound: async (client, userId, gameId, roundId) => {
      assert.deepEqual(await activeRound(client, userId), { gameId, roundId });
    },
    releaseActiveRound: async (client, userId) => { assert.equal(await activeRound(client, userId), null); },
  };
  const registerRound = async (client, round) => {
    const r = await client.query('INSERT INTO sw_rebuild.rounds(id,user_id,game,bet,payout,outcome) VALUES($1,$2,$3,$4::bigint,$5::bigint,$6::jsonb) RETURNING settled_order::text',
      ['new-superwilds:' + round.roundId, round.userId, GAME_ID, round.bet.replace('.', ''), round.winAmount.replace('.', ''), JSON.stringify(round.receipt)]);
    assert.equal(r.rowCount, 1); assert.ok(BigInt(r.rows[0].settled_order) > 0n);
  };
  const seed = async ({ playerMinor = 10000n, houseMinor = 1000000n, sharedHouse = null } = {}) => {
    const userId = 'pg-qa-player-' + randomUUID(), house = sharedHouse ?? 'pg-qa-house-' + randomUUID(), raw = randomBytes(32).toString('hex');
    await transaction(async client => {
      await client.query("INSERT INTO sw_rebuild.users(id,role,status) VALUES($1,'player','active')", [userId]);
      if (!sharedHouse) {
        await client.query("INSERT INTO sw_rebuild.users(id,role,status) VALUES($1,'house','active')", [house]);
        await client.query('INSERT INTO sw_rebuild.wallets(id,balance) VALUES($1,$2::bigint)', [house, houseMinor.toString()]);
      }
      await client.query('INSERT INTO sw_rebuild.wallets(id,balance) VALUES($1,$2::bigint)', [userId, playerMinor.toString()]);
      await client.query('INSERT INTO sw_rebuild.sessions(token,user_id,expires) VALUES($1,$2,$3)', [hash(raw), userId, Date.now() + 300000]);
      await client.query('INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES($1,NULL)', [userId]);
    });
    houses.set(userId, house);
    const request = new Request('https://synthetic.invalid/api/slots/spin', { headers: { cookie: 'sw_session=' + raw } });
    return { userId, house, request, guard: sessionGuard(request, userId) };
  };
  function host({ win = 300n } = {}) {
    const controls = { samples: 0, failSample: false, release: true, modelAvailable: true }, outcomes = new Map();
    const model = { gameId: GAME_ID, ...MATH, approved: true, betLevels: ['1.00', '2.00'],
      verification: { legalOutcomesVerified: true, outcomeDistributionVerified: true, aggregatePayoutVerified: true,
        roundingVerified: true, deferredLifecycleVerified: true, etbPolicyVerified: true },
      maximumPayoutMinor: () => 500n,
      sampleOutcome: context => {
        controls.samples++; if (controls.failSample) fail('SYNTHETIC_SAMPLE_FAILURE');
        const value = { grid: [['wild','seven','grapes','bell','lemon'],['cherry','plum','seven','bell','grapes'],['bell','lemon','wild','plum','cherry']],
          winLines: [], multiplier: 1, totalWinMinor: win };
        outcomes.set(context.roundId, structuredClone(value)); return value;
      }, validateOutcome: (value, context) => { assert.deepEqual(value, outcomes.get(context.roundId)); return true; } };
    const service = createSuperWildsPostgresService({ transaction, authenticate, sessionGuard, hash,
      wallet, registerRound, withRequestOwner, getApprovedModel: async () => controls.modelAvailable ? model : null,
      releaseEnabled: () => controls.release, uuid: randomUUID, now: () => '2026-11-23T00:00:00.000Z' });
    return { service, controls };
  }
  const spinBody = (player, values = {}) => ({ gameId: GAME_ID, ...MATH, roundToken: randomUUID(), sessionGuard: player.guard,
    bet: '1.00', collectRoundId: null, ...values });
  const takeBody = (player, receipt, values = {}) => ({ gameId: GAME_ID, ...MATH, roundToken: randomUUID(), sessionGuard: player.guard,
    bet: receipt.bet, roundId: receipt.roundId, ...values });
  const legacySpin = (player, requestKey) => transaction(async client => {
    await lockWallets(client, player.userId);
    return withRequestOwner(client, { userId: player.userId, gameId: 'synthetic-existing-slot', requestKey, kind: 'SPIN' }, async () => {
      const roundId = randomUUID();
      await transfer(client, { userId: player.userId, roundId, amountMinor: 100n, kind: 'BET', from: player.userId, to: player.house, prefix: 'synthetic-old:' });
      await client.query('INSERT INTO sw_nine.game_rounds(round_id,user_id,game_id,request_key,result_json) VALUES($1::uuid,$2,$3,$4,$5::jsonb)',
        [roundId, player.userId, 'synthetic-existing-slot', requestKey, JSON.stringify({ roundId, gameId: 'synthetic-existing-slot' })]);
    });
  });
  const snapshot = async player => {
    const tables = {
      wallets: ['SELECT id,balance::text FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id', [[player.userId, player.house]]],
      transfers: ['SELECT * FROM sw_rebuild.transfers WHERE actor=$1 ORDER BY id', [player.userId]],
      ledger: ['SELECT l.* FROM sw_rebuild.ledger l JOIN sw_rebuild.transfers t ON t.id=l.transfer_id WHERE t.actor=$1 ORDER BY transfer_id,wallet_id', [player.userId]],
      shared: ['SELECT * FROM sw_rebuild.rounds WHERE user_id=$1 ORDER BY settled_order', [player.userId]],
      rounds: ['SELECT * FROM sw_new_superwilds.rounds WHERE user_id=$1 ORDER BY ordinal', [player.userId]],
      requests: ['SELECT * FROM sw_new_superwilds.requests WHERE user_id=$1 ORDER BY request_key', [player.userId]],
      collections: ['SELECT * FROM sw_new_superwilds.collections WHERE user_id=$1 ORDER BY round_id', [player.userId]],
      reservations: ['SELECT * FROM sw_new_superwilds.reservations WHERE user_id=$1 ORDER BY round_id', [player.userId]],
      oldRounds: ['SELECT * FROM sw_nine.game_rounds WHERE user_id=$1 ORDER BY round_id', [player.userId]],
    };
    const result = {}; for (const [name, [sql, values]] of Object.entries(tables)) result[name] = (await pool.query(sql, values)).rows;
    return result;
  };
  return { host, seed, spinBody, takeBody, snapshot, legacySpin, transaction, connect, release, begin, lockWallets,
    cleanupClients: async () => { for (const c of checkedOut) { try { await c.query('ROLLBACK'); } finally { release(c); } } } };
}
