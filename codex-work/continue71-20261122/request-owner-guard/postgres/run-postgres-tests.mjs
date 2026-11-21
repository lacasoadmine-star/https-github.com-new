import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createGuardedLegacyAction, createGuardedMultiHot10Lifecycle } from '../adapter-seams.mjs';

const M10 = 'zplay72_multi_hot_10_v1';
const request = userId => ({ userId });
const body = (gameId, roundToken = randomUUID()) => ({ gameId, roundToken, bet: '1.00' });
const conflict = fn => assert.rejects(fn, error => error.code === 'IDEMPOTENCY_PARAMETER_CONFLICT' && error.status === 409);

test('request-owner guard with disposable PostgreSQL transactions', async t => {
  const value = process.env.REQUEST_OWNER_TEST_POSTGRES_ADMIN_URL;
  assert.ok(value, 'Set REQUEST_OWNER_TEST_POSTGRES_ADMIN_URL for a disposable local PostgreSQL server; no database test is silently skipped.');
  const parsed = new URL(value);
  assert.ok(['postgres:', 'postgresql:'].includes(parsed.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname), 'Database tests accept only a local disposable service.');
  assert.equal(parsed.pathname, '/postgres', 'Use only the local admin postgres database; tests create their own isolated database.');
  assert.equal(parsed.search, '', 'Connection-string options cannot override the isolated host/database.');
  assert.equal(parsed.hash, '', 'Connection URL fragments are not accepted.');
  assert.equal(process.env.REQUEST_OWNER_TEST_CREATE_DATABASE, 'disposable-database-only', 'Explicit isolated CREATE DATABASE opt-in is required.');
  const require = createRequire(import.meta.url);
  const modulePath = require.resolve('pg', { paths: [process.env.REQUEST_OWNER_TEST_NODE_MODULES, process.cwd()].filter(Boolean) });
  const imported = await import(pathToFileURL(modulePath).href);
  const Pool = imported.Pool ?? imported.default.Pool;
  const admin = new Pool({ connectionString: value, max: 1, connectionTimeoutMillis: 4000, statement_timeout: 10000 });
  const databaseName = 'zplay_request_owner_test_' + randomUUID().replaceAll('-', '');
  assert.match(databaseName, /^zplay_request_owner_test_[a-f0-9]{32}$/);
  let created = false, pool;
  try {
    await admin.query('CREATE DATABASE "' + databaseName + '"'); created = true;
    parsed.pathname = '/' + databaseName;
    pool = new Pool({ connectionString: parsed.href, max: 8, connectionTimeoutMillis: 4000, statement_timeout: 10000 });
    await pool.query(await readFile(new URL('./fixture.sql', import.meta.url), 'utf8'));
    const transaction = async fn => {
      const client = await pool.connect();
      try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
      catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    };
    const authenticate = async req => req.userId;
    const lockWallets = async (client, uid) => {
      const result = await client.query('SELECT id,balance FROM sw_rebuild.wallets WHERE id=$1 FOR UPDATE', [uid]);
      assert.equal(result.rowCount, 1); return result.rows;
    };
    const dependencies = { transaction, authenticate, lockWallets, wallet: { lockWallets } };
    const seed = async () => {
      const uid = 'isolated-' + randomUUID();
      await pool.query('INSERT INTO sw_rebuild.users(id) VALUES($1)', [uid]);
      await pool.query('INSERT INTO sw_rebuild.wallets(id,balance) VALUES($1,1000)', [uid]);
      return uid;
    };
    const balance = async uid => BigInt((await pool.query('SELECT balance FROM sw_rebuild.wallets WHERE id=$1', [uid])).rows[0].balance);
    const count = async uid => Number((await pool.query(`SELECT
      (SELECT count(*) FROM sw_nine.game_rounds WHERE user_id=$1) +
      (SELECT count(*) FROM sw_nine.actions WHERE user_id=$1) +
      (SELECT count(*) FROM sw_new_m10.requests WHERE user_id=$1) AS n`, [uid])).rows[0].n);
    const legacyFactory = ({ failAfter = false, record = true } = {}) => d => async (req, input) => d.transaction(async client => {
      const uid = await d.authenticate(req, client, true); await d.lockWallets(client, uid);
      const before = await client.query('SELECT result_json FROM sw_nine.game_rounds WHERE user_id=$1 AND request_key=$2', [uid, input.roundToken]);
      if (before.rowCount) return before.rows[0].result_json;
      await client.query('UPDATE sw_rebuild.wallets SET balance=balance-1 WHERE id=$1', [uid]);
      const receipt = { testOnly: true, gameId: input.gameId, requestKey: input.roundToken, action: 'SPIN' };
      if (record) await client.query('INSERT INTO sw_nine.game_rounds(round_id,user_id,game_id,request_key,result_json) VALUES($1,$2,$3,$4,$5::jsonb)',
        [randomUUID(), uid, input.gameId, input.roundToken, JSON.stringify(receipt)]);
      if (failAfter) throw Error('isolated post-insert failure'); return receipt;
    });
    const m10Factory = d => {
      const run = kind => async (req, input) => d.transaction(async client => {
        const uid = await d.authenticate(req, client, true); await d.wallet.lockWallets(client, uid);
        const before = await client.query('SELECT receipt FROM sw_new_m10.requests WHERE user_id=$1 AND request_key=$2::uuid', [uid, input.roundToken]);
        if (before.rowCount) return before.rows[0].receipt;
        await client.query('UPDATE sw_rebuild.wallets SET balance=balance-1 WHERE id=$1', [uid]);
        const receipt = { testOnly: true, gameId: input.gameId, requestKey: input.roundToken, action: kind };
        await client.query('INSERT INTO sw_new_m10.requests(user_id,request_key,kind,fingerprint,receipt) VALUES($1,$2,$3,$4,$5::jsonb)',
          [uid, input.roundToken, kind, 'a'.repeat(64), JSON.stringify(receipt)]);
        return receipt;
      });
      return { handles: id => id === M10, state: async () => ({ testOnly: true, readOnly: true }),
        spin: run('SPIN'), takeWin: run('TAKE_WIN'), gamble: run('GAMBLE') };
    };
    const legacy = options => createGuardedLegacyAction({ createAction: legacyFactory(options), dependencies });
    const m10 = createGuardedMultiHot10Lifecycle({ createLifecycle: m10Factory, dependencies });

    await t.test('new-to-old token collision preserves one debit and one journal', async () => {
      const uid = await seed(), key = randomUUID(); await m10.spin(request(uid), body(M10, key));
      await conflict(() => legacy()(request(uid), body('isolated-old-game', key)));
      assert.equal(await balance(uid), 999n); assert.equal(await count(uid), 1);
    });
    await t.test('old-to-new token collision preserves the old receipt', async () => {
      const uid = await seed(), key = randomUUID(), input = body('isolated-old-game', key);
      const receipt = await legacy()(request(uid), input);
      await conflict(() => m10.spin(request(uid), body(M10, key)));
      assert.deepEqual(await legacy()(request(uid), input), receipt);
      assert.equal(await balance(uid), 999n); assert.equal(await count(uid), 1);
    });
    await t.test('twenty concurrent old/new attempts accept one owner and commit one debit', async () => {
      const uid = await seed(), key = randomUUID(), old = legacy();
      const results = await Promise.allSettled(Array.from({ length: 20 }, (_, n) => n % 2
        ? old(request(uid), body('isolated-old-game', key)) : m10.spin(request(uid), body(M10, key))));
      assert.equal(results.filter(row => row.status === 'fulfilled').length, 10);
      assert.equal(results.filter(row => row.status === 'rejected' && row.reason.code === 'IDEMPOTENCY_PARAMETER_CONFLICT').length, 10);
      assert.equal(await balance(uid), 999n); assert.equal(await count(uid), 1);
    });
    await t.test('missing claim and failure after insert both roll back before another owner may accept', async () => {
      const uid = await seed(), key = randomUUID();
      await assert.rejects(() => legacy({ record: false })(request(uid), body('isolated-old-game', key)), error => error.code === 'REQUEST_OWNER_CLAIM_NOT_RECORDED');
      assert.equal(await balance(uid), 1000n); assert.equal(await count(uid), 0);
      await assert.rejects(() => legacy({ failAfter: true })(request(uid), body('isolated-old-game', key)), /isolated post-insert failure/);
      assert.equal(await balance(uid), 1000n); assert.equal(await count(uid), 0);
      await m10.spin(request(uid), body(M10, key)); assert.equal(await balance(uid), 999n); assert.equal(await count(uid), 1);
    });
    await t.test('new action kinds and UUID case variants cannot re-use an accepted key', async () => {
      const uid = await seed(), key = '12ab34cd-56ef-4789-8abc-12def3456789';
      await legacy()(request(uid), body('isolated-old-game', key.toUpperCase()));
      await conflict(() => m10.spin(request(uid), body(M10, key)));
      const next = randomUUID(); await m10.spin(request(uid), body(M10, next));
      await conflict(() => m10.takeWin(request(uid), body(M10, next)));
      await conflict(() => m10.gamble(request(uid), body(M10, next)));
      assert.equal(await balance(uid), 998n); assert.equal(await count(uid), 2);
    });
    await t.test('old non-UUID keys replay without UUID casts or altered receipt data', async () => {
      const uid = await seed(), input = body('isolated-old-game', "test-old-'-$1");
      const first = await legacy()(request(uid), input);
      assert.deepEqual(await legacy()(request(uid), input), first);
      assert.equal(await balance(uid), 999n); assert.equal(await count(uid), 1);
    });
  } finally {
    try {
      await pool?.end();
    } finally {
      try {
        // Only the random database this exact run successfully created is dropped.
        if (created) await admin.query('DROP DATABASE "' + databaseName + '"');
      } finally {
        // Close the admin pool even when closing the test pool or DROP fails.
        await admin.end();
      }
    }
  }
});
