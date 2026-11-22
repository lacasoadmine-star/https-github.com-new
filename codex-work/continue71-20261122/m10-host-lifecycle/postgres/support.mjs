import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createGuardedLegacyAction } from '../../request-owner-guard/adapter-seams.mjs';

export const GAME_ID = 'zplay72_multi_hot_10_v1';
export const OLD_GAME_ID = 'fresh_multihot20';
export const NOW = '2026-11-22T12:00:00.000Z';
export const MATH = Object.freeze({ mathVersion: 'synthetic-host-qa-v1', engineVersion: 'synthetic-host-qa-v1', mathSha256: 'a'.repeat(64) });
export const OLD_MATH = Object.freeze({ mathVersion: 'synthetic-old-host-qa-v1', engineVersion: 'synthetic-old-host-qa-v1', mathSha256: 'b'.repeat(64) });
export const hash = value => createHash('sha256').update(value).digest('hex');
export const money = amount => String(amount / 100n) + '.' + String(amount % 100n).padStart(2, '0');
const fail = (code, status = 409) => { throw Object.assign(new Error(code), { code, status }); };

/** Load the actual existing own-source modules. CI uses its normal checkout.
 * A sparse local checkout may materialize only those two tracked HEAD blobs
 * in a temporary directory; no shared source or downloaded code is changed.
 */
export async function loadExistingModules() {
  const root = fileURLToPath(new URL('../../../../', import.meta.url));
  const relative = 'codex-work/native72-20261119/changes/batch01/server/';
  let directory = join(root, relative), temporary = null;
  try { await access(join(directory, 'existing-gamble.mjs')); await access(join(directory, 'official-math.mjs')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    temporary = await mkdtemp(join(tmpdir(), 'zplay-m10-host-qa-own-source-'));
    directory = temporary;
    try {
      for (const name of ['existing-gamble.mjs', 'official-math.mjs']) {
        const { stdout } = await promisify(execFile)('git', ['show', 'HEAD:' + relative + name], { cwd: root, encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 });
        await writeFile(join(directory, name), stdout);
      }
    } catch (error) { await rm(temporary, { recursive: true, force: true }); throw error; }
  }
  try {
    const gamble = await import(pathToFileURL(join(directory, 'existing-gamble.mjs')).href);
    const math = await import(pathToFileURL(join(directory, 'official-math.mjs')).href);
    return { ...gamble, math, cleanup: async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); } };
  } catch (error) { if (temporary) await rm(temporary, { recursive: true, force: true }); throw error; }
}

export function createSupport(pool, createM10HostIntegration, existing) {
  const houses = new Map(), checkedOut = new Set();
  const connect = async () => { const client = await pool.connect(); checkedOut.add(client); return client; };
  const release = client => { if (checkedOut.delete(client)) client.release(); };
  const begin = async client => {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await client.query('SET LOCAL search_path = pg_catalog, sw_rebuild, public');
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SET LOCAL statement_timeout='10s'");
  };
  const transaction = async fn => {
    const client = await connect();
    try { await begin(client); const result = await fn(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { release(client); }
  };
  const rawToken = request => {
    const token = request.headers.get('cookie')?.match(/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/i)?.[1];
    if (!token) fail('PLAYER_LOGIN_REQUIRED', 401); return token;
  };
  const dependencies = {
    transaction, hash,
    houseFor: userId => { if (!houses.has(userId)) fail('HOUSE_WALLET_MISSING', 503); return houses.get(userId); },
    sessionGuard: (request, userId) => hash('fresh-account-session-v1\0' + userId + '\0' + rawToken(request)),
    authenticate: async (request, client = pool, locked = false) => {
      const token = rawToken(request);
      const result = await client.query(`SELECT u.id,u.role,u.status FROM sw_rebuild.sessions s JOIN sw_rebuild.users u ON u.id=s.user_id WHERE s.token=ANY($1::text[]) AND s.expires>$2${locked ? ' FOR SHARE OF s,u' : ''}`, [[token, hash(token)], Date.now()]);
      if (result.rowCount !== 1 || result.rows[0].role !== 'player' || result.rows[0].status !== 'active') fail('ACTIVE_PLAYER_SESSION_REQUIRED', 401);
      return result.rows[0].id;
    },
    lockWallets: async (client, userId) => {
      const result = await client.query('SELECT id,balance FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE', [[userId, dependencies.houseFor(userId)]]);
      if (result.rowCount !== 2) fail('PLAYER_OR_HOUSE_WALLET_MISSING', 503); return result.rows;
    },
    balance: async (client, id) => {
      const result = await client.query('SELECT balance FROM sw_rebuild.wallets WHERE id=$1', [id]);
      if (result.rowCount !== 1) fail('WALLET_NOT_CONFIGURED', 503); return result.rows[0].balance;
    },
    assertNoActive: async (client, userId) => {
      const result = await client.query("SELECT game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' ORDER BY created_at,id LIMIT 1", [userId]);
      if (result.rows[0]) fail('FINISH_ACTIVE_ROUND:' + result.rows[0].game_id);
    },
    assertPlayerCapacity: async (client, userId, before, stake, maximum) => {
      const result = await client.query('SELECT max_balance FROM sw_rebuild.account_limits WHERE user_id=$1', [userId]);
      const cap = result.rows[0]?.max_balance;
      if (cap !== null && cap !== undefined && BigInt(before) - BigInt(stake) + BigInt(maximum) > BigInt(cap)) fail('ACCOUNT_BALANCE_LIMIT');
    },
  };
  const seed = async () => {
    const userId = 'host-qa-player-' + randomUUID(), house = 'host-qa-house-' + randomUUID(), token = randomBytes(32).toString('hex');
    await transaction(async client => {
      await client.query("INSERT INTO sw_rebuild.users(id,role,status) VALUES($1,'player','active'),($2,'house','active')", [userId, house]);
      await client.query('INSERT INTO sw_rebuild.wallets(id,balance) VALUES($1,10000),($2,100000)', [userId, house]);
      await client.query('INSERT INTO sw_rebuild.sessions(token,user_id,expires) VALUES($1,$2,$3)', [hash(token), userId, Date.now() + 300000]);
      await client.query('INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES($1,NULL)', [userId]);
    });
    houses.set(userId, house);
    const request = new Request('https://synthetic.invalid/api/slots/spin', { method: 'POST', headers: { cookie: 'sw_session=' + token } });
    return { userId, house, request, guard: dependencies.sessionGuard(request, userId) };
  };
  const host = (amounts = [0n]) => {
    const outcomes = new Map(); let samples = 0;
    // Deliberately synthetic policy. These fixture amounts, sequence and flags
    // are never exported as an M10 operator model or provider rule assertion.
    const model = {
      gameId: GAME_ID, ...MATH, approved: true, betLevels: ['1.00'],
      verification: { outcomeDistributionVerified: true, legalOutcomesVerified: true, aggregatePayoutVerified: true,
        roundingVerified: true, deferredLifecycleVerified: true, etbPolicyVerified: true },
      maximumPayoutMinor: () => 500n,
      sampleOutcome: context => {
        assert.equal(context.gameId, GAME_ID); assert.equal(context.betMinor, 100n);
        const value = { grid: [['seven','bell','grapes','watermelon','lemon'],['plum','orange','cherry','seven','bell'],['grapes','watermelon','lemon','plum','orange']],
          wheelMultiplier: 1, totalWinMinor: amounts[Math.min(samples++, amounts.length - 1)] };
        outcomes.set(context.roundId, structuredClone(value)); return structuredClone(value);
      },
      validateOutcome: (value, context) => {
        assert.equal(context.betMinor, 100n); assert.deepEqual(value, outcomes.get(context.roundId)); return true;
      },
    };
    const integration = createM10HostIntegration({ dependencies, getApprovedModel: async id => {
      assert.equal(id, GAME_ID); return model;
    }, resolveApprovedModel: async () => model, releaseEnabled: () => true, uuid: randomUUID, now: () => NOW });
    return { ...integration, samples: () => samples };
  };
  const spinBody = (player, { key = randomUUID(), collectRoundId = null } = {}) => ({ gameId: GAME_ID, ...MATH,
    bet: '1.00', roundToken: key, sessionGuard: player.guard, collectRoundId });
  const takeBody = (player, receipt, key = randomUUID()) => ({ gameId: GAME_ID, ...MATH, bet: receipt.bet,
    roundToken: key, sessionGuard: player.guard, roundId: receipt.roundId });
  const oldProfile = { gameId: OLD_GAME_ID, ...OLD_MATH, productionApproved: true, probabilityModelAudited: true,
    auditReference: 'SYNTHETIC_OLD_ENGINE_ELIGIBILITY_TEST_ONLY', linePaths: existing.math.OFFICIAL_LINE_PATHS[OLD_GAME_ID],
    reelStrips: Array.from({ length: 5 }, () => ['seven','seven','seven']), wheelWeights: [1,1,1,1,1] };
  const oldApi = integration => {
    const calls = { draws: 0, moves: 0 };
    const d = { ...integration.legacyDependencies, accepting: () => true, now: () => Date.parse(NOW),
      publicGames: () => [{ id: OLD_GAME_ID, freshReleaseReady: true }],
      profileForGame: async id => { assert.equal(id, OLD_GAME_ID); return structuredClone(oldProfile); },
      assertOperatorWagerEnabled: async () => {},
      drawIndex: () => { calls.draws++; throw Error('UNEXPECTED_OLD_RANDOM_DRAW'); },
      move: async () => { calls.moves++; throw Error('UNEXPECTED_OLD_FINANCIAL_MUTATION'); },
    };
    const original = existing.createExistingGamble(d);
    return { describe: original.describe, calls,
      gamble: createGuardedLegacyAction({ createAction: deps => existing.createExistingGamble(deps).gamble, dependencies: d, kind: 'GAMBLE' }) };
  };
  const seedOldRound = async (player, requestKey = randomUUID()) => {
    const roundId = randomUUID(), receipt = { gameId: OLD_GAME_ID, ...OLD_MATH, roundId, bet: '1.00', finalWin: '1.00' };
    await transaction(async client => {
      await dependencies.lockWallets(client, player.userId);
      await client.query(`INSERT INTO sw_nine.game_rounds(round_id,user_id,game_id,bet,base_bet,total_win,wheel_multiplier,request_key,request_hash,result_json,math_sha256,created_at)
        VALUES($1,$2,$3,100,100,100,1,$4,$5,$6::jsonb,$7,$8)`, [roundId, player.userId, OLD_GAME_ID, requestKey, hash('synthetic-old-parent'), JSON.stringify(receipt), OLD_MATH.mathSha256, NOW]);
      await client.query('INSERT INTO sw_rebuild.rounds(id,user_id,game,bet,payout,outcome) VALUES($1,$2,$3,100,100,$4::jsonb)', ['nine:' + roundId, player.userId, OLD_GAME_ID, JSON.stringify(receipt)]);
    });
    return (await pool.query('SELECT * FROM sw_nine.game_rounds WHERE round_id=$1', [roundId])).rows[0];
  };
  const oldBody = (player, parent, key = randomUUID()) => ({ gameId: OLD_GAME_ID, ...OLD_MATH, roundId: parent.round_id,
    roundToken: key, sessionGuard: player.guard, choice: 'RED', expectedAttempt: 1, expectedStake: '1.00' });
  const seedOldAction = async (player, parent) => {
    const body = oldBody(player, parent), actionId = randomUUID();
    const receipt = { kind: 'GAMBLE', actionId, gameId: OLD_GAME_ID, ...OLD_MATH, roundId: body.roundId, roundToken: body.roundToken,
      choice: 'RED', stake: '1.00', payout: '2.00', attempt: 1, currency: 'ETB' };
    const fingerprint = hash(JSON.stringify({ uid: player.userId, kind: 'GAMBLE', gameId: OLD_GAME_ID,
      roundId: parent.round_id, choice: 'RED', expectedAttempt: 1, expectedStake: '1.00' }));
    await pool.query('INSERT INTO sw_nine.actions(id,parent_id,user_id,kind,request_key,request_hash,attempt,result_json) VALUES($1,$2,$3,$4,$5,$6,1,$7::jsonb)',
      [actionId, parent.round_id, player.userId, 'GAMBLE', body.roundToken, fingerprint, JSON.stringify(receipt)]);
    return { body, receipt };
  };
  const legacyState = (integration, old, player) => transaction(async client => {
    assert.equal(await dependencies.authenticate(player.request, client, true), player.userId);
    await dependencies.lockWallets(client, player.userId);
    return integration.ownership.describeLegacyState(client, player.userId, {
      readSnapshot: async () => {
        const latest = await client.query("SELECT r.round_id,r.game_id,r.result_json,r.created_at,r.total_win FROM sw_nine.game_rounds r LEFT JOIN sw_rebuild.rounds c ON c.id='nine:'||r.round_id::text WHERE r.user_id=$1 AND r.game_id=$2 ORDER BY c.settled_order DESC NULLS LAST,r.created_at DESC,r.round_id DESC LIMIT 1", [player.userId, OLD_GAME_ID]);
        return { state: { authenticated: true, currency: 'ETB', sessionGuard: player.guard,
          balance: money(BigInt(await dependencies.balance(client, player.userId))), game: { id: OLD_GAME_ID, enabled: true, freshReleaseReady: true } },
        parent: latest.rows[0] ?? null, currentProfile: oldProfile };
      }, describeGamble: old.describe,
    });
  });
  const snapshot = async player => {
    const tables = {
      wallets: ['SELECT id,balance FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id', [[player.userId, player.house]]],
      transfers: ['SELECT * FROM sw_rebuild.transfers WHERE actor=$1 ORDER BY id', [player.userId]],
      ledger: ['SELECT l.* FROM sw_rebuild.ledger l JOIN sw_rebuild.transfers t ON t.id=l.transfer_id WHERE t.actor=$1 ORDER BY l.transfer_id,l.wallet_id', [player.userId]],
      shared: ['SELECT * FROM sw_rebuild.rounds WHERE user_id=$1 ORDER BY settled_order', [player.userId]],
      rounds: ['SELECT * FROM sw_new_m10.rounds WHERE user_id=$1 ORDER BY ordinal', [player.userId]],
      requests: ['SELECT * FROM sw_new_m10.requests WHERE user_id=$1 ORDER BY request_key', [player.userId]],
      collections: ['SELECT * FROM sw_new_m10.collections WHERE user_id=$1 ORDER BY round_id', [player.userId]],
      reservations: ['SELECT * FROM sw_new_m10.reservations WHERE user_id=$1 ORDER BY round_id', [player.userId]],
      movements: ['SELECT * FROM sw_new_m10.wallet_movements WHERE user_id=$1 ORDER BY transfer_id', [player.userId]],
      events: ['SELECT * FROM sw_new_m10.reservation_events WHERE user_id=$1 ORDER BY event_key', [player.userId]],
      oldActions: ['SELECT * FROM sw_nine.actions WHERE user_id=$1 ORDER BY id', [player.userId]],
    };
    const result = {};
    for (const [key, [sql, parameters]] of Object.entries(tables)) result[key] = (await pool.query(sql, parameters)).rows;
    return result;
  };
  return { dependencies, connect, release, begin, transaction, seed, host, spinBody, takeBody, oldApi,
    seedOldRound, seedOldAction, oldBody, legacyState, snapshot,
    destroyOutstanding: () => { for (const client of checkedOut) { client.release(true); checkedOut.delete(client); } } };
}
