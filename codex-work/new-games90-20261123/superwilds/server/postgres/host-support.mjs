// Disposable PostgreSQL only. Production modules do not import this file.
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createSuperWildsHostIntegration } from '../host-integration.mjs';
import { GAME_ID, SuperWildsError } from '../lifecycle.mjs';
import { withSharedRequestOwner } from '../ownership.mjs';
export const MATH = Object.freeze({ engineVersion: 'isolated-host-qa', mathVersion: 'isolated-host-qa', mathSha256: 'e'.repeat(64) });
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (code, status = 503) => { throw new SuperWildsError(code, status); };
export function createHostPgSupport(pool) {
  const houses = new Map(), checkedOut = new Set();
  const connect = async () => { const client = await pool.connect(); checkedOut.add(client); return client; };
  const release = client => { if (checkedOut.delete(client)) client.release(); };
  const begin = async client => {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await client.query("SET LOCAL lock_timeout='10s'"); await client.query("SET LOCAL statement_timeout='15s'");
  };
  const transaction = async operation => {
    const client = await connect();
    try { await begin(client); const value = await operation(client); await client.query('COMMIT'); return value; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { release(client); }
  };
  const rawToken = request => {
    const raw = request.headers.get('cookie')?.match(/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/i)?.[1];
    if (!raw) fail('PLAYER_LOGIN_REQUIRED', 401); return raw;
  };
  const sessionGuard = (request, userId) => hash('fresh-account-session-v1\0' + userId + '\0' + rawToken(request));
  const authenticate = async (request, client = pool, locked = false) => {
    const result = await client.query(`SELECT u.id,u.role,u.status FROM sw_rebuild.sessions s JOIN sw_rebuild.users u ON u.id=s.user_id
      WHERE s.token=$1 AND s.expires>$2${locked ? ' FOR SHARE OF s,u' : ''}`, [hash(rawToken(request)), Date.now()]);
    if (result.rowCount !== 1 || result.rows[0].role !== 'player' || result.rows[0].status !== 'active') fail('PLAYER_LOGIN_REQUIRED', 401);
    return result.rows[0].id;
  };
  const houseFor = userId => { const value = houses.get(userId); if (!value) fail('EXISTING_HOUSE_REQUIRED'); return value; };
  const lockWallets = async (client, userId) => {
    const result = await client.query('SELECT id,balance FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE', [[userId, houseFor(userId)]]);
    if (result.rowCount !== 2) fail('PLAYER_OR_HOUSE_WALLET_MISSING'); return result.rows;
  };
  const balance = async (client, walletId) => {
    const result = await client.query('SELECT balance::text FROM sw_rebuild.wallets WHERE id=$1', [walletId]);
    if (result.rowCount !== 1) fail('WALLET_NOT_CONFIGURED'); return BigInt(result.rows[0].balance);
  };
  const activeRound = async (client, userId) => {
    const result = await client.query("SELECT id,game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' ORDER BY created_at,id LIMIT 2", [userId]);
    if (result.rowCount > 1) fail('MULTIPLE_NATIVE_ACTIVE_ROUNDS');
    return result.rows[0] ? { gameId: result.rows[0].game_id, roundId: result.rows[0].id } : null;
  };
  const dependencies = { transaction, authenticate, sessionGuard, hash, lockWallets, balance, houseFor, activeRound,
    assertNoActive: async (client, userId) => { const value = await activeRound(client, userId); if (value) fail('FINISH_ACTIVE_ROUND:' + value.gameId, 409); },
    assertPlayerCapacity: async (client, userId, before, stake, maximum) => {
      const result = await client.query('SELECT max_balance::text FROM sw_rebuild.account_limits WHERE user_id=$1', [userId]);
      const cap = result.rows[0]?.max_balance;
      if (cap !== null && cap !== undefined && before - stake + maximum > BigInt(cap)) fail('ACCOUNT_BALANCE_LIMIT', 409);
    },
  };
  async function seed({ playerMinor = 10000n, houseMinor = 1000000n, sharedHouse = null } = {}) {
    const userId = 'host-qa-player-' + randomUUID(), house = sharedHouse ?? 'host-qa-house-' + randomUUID(), raw = randomBytes(32).toString('hex');
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
    const request = new Request('https://isolated-host.invalid/api/slots/spin', { headers: { cookie: 'sw_session=' + raw } });
    return { userId, house, request, guard: sessionGuard(request, userId) };
  }
  function host({ win = 300n, candidateModel = null } = {}) {
    const controls = { samples: 0, failSample: false, release: true, modelAvailable: true }, outcomes = new Map();
    const model = { gameId: GAME_ID, ...MATH, approved: true, betLevels: ['1.00', '2.00'],
      verification: { legalOutcomesVerified: true, outcomeDistributionVerified: true, aggregatePayoutVerified: true,
        roundingVerified: true, deferredLifecycleVerified: true, etbPolicyVerified: true },
      maximumPayoutMinor: () => 500n,
      sampleOutcome: context => {
        controls.samples++; if (controls.failSample) fail('ISOLATED_MODEL_FAILURE');
        const result = { grid: Array.from({ length: 3 }, () => ['wild','seven','grapes','bell','lemon']),
          winLines: [], multiplier: 1, totalWinMinor: win };
        outcomes.set(context.roundId, structuredClone(result)); return result;
      },
      validateOutcome: (value, context) => { assert.deepEqual(value, outcomes.get(context.roundId)); return true; },
    };
    const integration = createSuperWildsHostIntegration({ dependencies, getApprovedModel: async () => controls.modelAvailable ? (candidateModel ?? model) : null,
      releaseEnabled: () => controls.release, uuid: randomUUID, now: () => '2026-11-23T00:00:00.000Z' });
    return { ...integration, service: integration.lifecycle, controls };
  }
  const spinBody = (player, values = {}) => ({ gameId: GAME_ID, ...MATH, roundToken: randomUUID(), sessionGuard: player.guard,
    bet: '1.00', collectRoundId: null, ...values });
  const takeBody = (player, receipt, values = {}) => ({ gameId: GAME_ID, ...MATH, roundToken: randomUUID(), sessionGuard: player.guard,
    bet: receipt.bet, roundId: receipt.roundId, ...values });
  const legacySpin = (player, requestKey) => transaction(async client => {
    await lockWallets(client, player.userId);
    return withSharedRequestOwner(client, { family: 'legacy', userId: player.userId, gameId: 'isolated-old-slot', requestKey, action: 'SPIN' }, async () => {
      const id = randomUUID();
      await client.query('INSERT INTO sw_nine.game_rounds(round_id,user_id,game_id,request_key,result_json) VALUES($1::uuid,$2,$3,$4,$5::jsonb)',
        [id, player.userId, 'isolated-old-slot', requestKey, JSON.stringify({ roundId: id, gameId: 'isolated-old-slot' })]);
    });
  });
  const seedM10Hold = async (player, amount) => transaction(async client => {
    await lockWallets(client, player.userId);
    const roundId = randomUUID(), key = randomUUID(), gameId = 'zplay72_multi_hot_10_v1';
    await client.query('INSERT INTO sw_new_m10.rounds(round_id,user_id,game_id,request_key,stake_minor,win_minor,receipt) VALUES($1::uuid,$2,$3,$4::uuid,100,$5::bigint,$6::jsonb)',
      [roundId, player.userId, gameId, key, amount.toString(), JSON.stringify({})]);
    await client.query('INSERT INTO sw_new_m10.reservations(round_id,user_id,house_wallet_id,amount_minor) VALUES($1::uuid,$2,$3,$4::bigint)',
      [roundId, player.userId, player.house, amount.toString()]);
    return roundId;
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
      events: ['SELECT * FROM sw_new_superwilds.reservation_events WHERE user_id=$1 ORDER BY event_key', [player.userId]],
      movements: ['SELECT * FROM sw_new_superwilds.wallet_movements WHERE user_id=$1 ORDER BY transfer_id', [player.userId]],
    };
    const result = {}; for (const [name, [sql, values]] of Object.entries(tables)) result[name] = (await pool.query(sql, values)).rows;
    return result;
  };
  return { host, seed, seedM10Hold, spinBody, takeBody, snapshot, legacySpin, transaction, connect, release, begin, lockWallets, dependencies,
    cleanupClients: async () => { for (const c of checkedOut) { try { await c.query('ROLLBACK'); } finally { release(c); } } } };
}
