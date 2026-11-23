import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createHostPgSupport } from './host-support.mjs';
import { createSuperWildsOwnModel, MODEL_IDENTITY } from '../own-model.mjs';
import { quoteGrid, GAME_ID } from '../../rules.mjs';
import { prepareSuperWildsSchema } from '../runtime-schema.mjs';
import { createSuperWildsRuntimeHost } from '../runtime-host.mjs';
import { createRequested90RuntimeConfiguration } from '../runtime-release.mjs';
const code = value => error => error?.code === value;

test('complete Super Wilds protected host composition on disposable PostgreSQL', { concurrency: false, timeout: 120000 }, async t => {
  const value = process.env.TEST_DATABASE_URL;
  assert.ok(value, 'TEST_DATABASE_URL required; never skip financial integration tests.');
  const parsed = new URL(value);
  assert.ok(['postgres:', 'postgresql:'].includes(parsed.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname));
  assert.equal(parsed.pathname, '/postgres'); assert.equal(parsed.search, ''); assert.equal(parsed.hash, '');
  assert.equal(process.env.SUPERWILDS_TEST_CREATE_DATABASE, 'disposable-database-only');
  const require = createRequire(import.meta.url), modulePath = require.resolve('pg', {
    paths: [process.env.SUPERWILDS_TEST_NODE_MODULES, process.cwd()].filter(Boolean) });
  const imported = await import(pathToFileURL(modulePath).href), Pool = imported.Pool ?? imported.default.Pool;
  const admin = new Pool({ connectionString: value, max: 1, connectionTimeoutMillis: 4000, statement_timeout: 15000 });
  const databaseName = 'zplay_superwilds_host_' + randomUUID().replaceAll('-', '');
  assert.match(databaseName, /^zplay_superwilds_host_[a-f0-9]{32}$/);
  let created = false, pool, h;
  try {
    await admin.query('CREATE DATABASE "' + databaseName + '"'); created = true; parsed.pathname = '/' + databaseName;
    pool = new Pool({ connectionString: parsed.href, max: 24, connectionTimeoutMillis: 5000,
      statement_timeout: 15000, idle_in_transaction_session_timeout: 20000 });
    await pool.query(await readFile(new URL('./fixture.sql', import.meta.url), 'utf8'));
    // The full guard uses the REAL legacy parent relation and native ordering.
    await pool.query('ALTER TABLE sw_nine.actions ADD COLUMN parent_id uuid REFERENCES sw_nine.game_rounds(round_id)');
    await pool.query('ALTER TABLE sw_native_library.rounds ADD COLUMN created_at timestamptz NOT NULL DEFAULT now()');
    await pool.query(await readFile(new URL('../prepare-journal.sql', import.meta.url), 'utf8'));
    await t.test('installing Super Wilds before the shared M10 liability schema fails atomically', async () => {
      const client = await pool.connect();
      try {
        const before = (await client.query('SELECT count(*)::int AS n FROM sw_rebuild.wallets')).rows[0].n;
        await assert.rejects(client.query(await readFile(new URL('../prepare-reservations.sql', import.meta.url), 'utf8')),
          error => error.code === 'P0001' && error.message.includes('SUPERWILDS_M10_RESERVATION_SCHEMA_REQUIRED_FIRST'));
        await client.query('ROLLBACK');
        const tables = (await client.query("SELECT to_regclass('sw_new_superwilds.reservations') AS reservations")).rows[0];
        assert.equal(tables.reservations, null);
        assert.equal((await client.query('SELECT count(*)::int AS n FROM sw_rebuild.wallets')).rows[0].n, before);
      } finally { try { await client.query('ROLLBACK'); } finally { client.release(); } }
    });
    await t.test('actual boot installer adds only absent groups atomically and is read-only on restart', async () => {
      const definitions = [['m10-journal', '../../../../continue71-20261122/m10-host-lifecycle/prepare-journal.sql'],
        ['m10-reservations', '../../../../continue71-20261122/m10-house-reservations/prepare-schema.sql'],
        ['superwilds-journal', '../prepare-journal.sql'], ['superwilds-reservations', '../prepare-reservations.sql']];
      const migrations = await Promise.all(definitions.map(async ([name, path]) => {
        const sql = await readFile(new URL(path, import.meta.url), 'utf8'); return { name, sql, sha256: createHash('sha256').update(sql).digest('hex') };
      }));
      const count = async () => (await pool.query(`SELECT (SELECT count(*) FROM sw_rebuild.users)::int AS users,
        (SELECT count(*) FROM sw_rebuild.wallets)::int AS wallets,(SELECT count(*) FROM sw_rebuild.ledger)::int AS ledger`)).rows[0];
      const before = await count(), installed = await prepareSuperWildsSchema(pool, migrations, { allowInstall: true });
      assert.deepEqual(installed.applied, ['m10-journal', 'm10-reservations', 'superwilds-reservations']);
      assert.deepEqual(await count(), before);
      assert.deepEqual((await prepareSuperWildsSchema(pool, migrations)).applied, []);
      assert.deepEqual(await count(), before);
    });
    await pool.query(await readFile(new URL('../prepare-gamble.sql', import.meta.url), 'utf8'));
    h = createHostPgSupport(pool);

    await t.test('twenty same-key X2 requests change one hold, then one TAKE pays the current win after model retirement', async () => {
      const p = await h.seed(), host = h.host({ gambleColors: ['RED'] });
      const spin = await host.service.spin(p.request, h.spinBody(p)), body = host.gambleBody(p, spin);
      const before = await h.snapshot(p);
      const all = await Promise.all(Array.from({ length: 20 }, () => host.service.gamble(p.request, { ...body })));
      all.forEach(result => assert.deepEqual(result, all[0]));
      assert.equal(all[0].pendingWinAfter, '6.00'); assert.equal(host.controls.gambleSamples, 1);
      const accepted = await h.snapshot(p);
      assert.deepEqual(accepted.ledger, before.ledger); assert.deepEqual(accepted.wallets, before.wallets);
      assert.equal(accepted.gambles.length, 1); assert.equal(accepted.reservations[0].amount_minor, '600');
      assert.equal(accepted.events.filter(row => row.kind === 'INCREASE').length, 1);
      assert.deepEqual(accepted.rounds[0].receipt, spin);
      host.controls.release = false; host.controls.modelAvailable = false;
      host.controls.gambleEnabled = false; host.controls.gambleModelAvailable = false;
      assert.deepEqual(await host.service.gamble(p.request, { ...body, replayOnly: true }), all[0]);
      const state = await host.service.state(p.request);
      assert.equal(state.round.pendingWin, '6.00'); assert.deepEqual(state.round.result, spin);
      const taken = await host.service.takeWin(p.request, h.takeBody(p, spin));
      assert.equal(taken.collection.amount, '6.00');
      const final = await h.snapshot(p);
      assert.equal(final.wallets.find(row => row.id === p.userId).balance, '10500');
      assert.equal(final.transfers.length, 2); assert.equal(final.ledger.length, 4);
      assert.equal(final.collections.length, 1); assert.deepEqual(final.rounds[0].receipt, spin);
    });
    await t.test('a lost X2 closes only the pending hold without a new debit or credit and permits the next spin', async () => {
      const p = await h.seed(), host = h.host({ gambleColors: ['BLACK'] });
      const spin = await host.service.spin(p.request, h.spinBody(p)), before = await h.snapshot(p);
      const lost = await host.service.gamble(p.request, host.gambleBody(p, spin));
      assert.equal(lost.pendingWinAfter, '0.00'); assert.equal(lost.won, false);
      const after = await h.snapshot(p);
      assert.deepEqual(after.wallets, before.wallets); assert.deepEqual(after.ledger, before.ledger);
      assert.equal(after.reservations[0].amount_minor, '0'); assert.equal(after.reservations[0].closed_reason, 'LOST');
      assert.equal(after.events.filter(row => row.kind === 'RELEASE').length, 1);
      const state = await host.service.state(p.request); assert.equal(state.blockedByActiveGame, null); assert.equal(state.round.pendingWin, '0.00');
      await host.service.spin(p.request, h.spinBody(p)); assert.equal((await h.snapshot(p)).transfers.length, 2);
    });
    await t.test('failed GAMBLE journal insertion rolls back the increased hold and the same key can retry once', async () => {
      const p = await h.seed(), host = h.host({ gambleColors: ['RED', 'RED'] });
      const spin = await host.service.spin(p.request, h.spinBody(p)), body = host.gambleBody(p, spin), before = await h.snapshot(p);
      await pool.query(`CREATE FUNCTION qa_superwilds.fail_gamble_insert() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'QA_GAMBLE_JOURNAL_FAILURE'; END $$`);
      await pool.query('CREATE TRIGGER qa_fail_gamble BEFORE INSERT ON sw_new_superwilds.gambles FOR EACH ROW EXECUTE FUNCTION qa_superwilds.fail_gamble_insert()');
      try {
        await assert.rejects(host.service.gamble(p.request, body), error => error.code === 'P0001' && error.message.includes('QA_GAMBLE_JOURNAL_FAILURE'));
        assert.deepEqual(await h.snapshot(p), before);
      } finally {
        await pool.query('DROP TRIGGER qa_fail_gamble ON sw_new_superwilds.gambles');
        await pool.query('DROP FUNCTION qa_superwilds.fail_gamble_insert()');
      }
      await host.service.gamble(p.request, body);
      const after = await h.snapshot(p); assert.equal(after.gambles.length, 1); assert.equal(after.reservations[0].amount_minor, '600');
      assert.deepEqual(after.ledger, before.ledger);
    });
    await t.test('an underfunded double is rejected before entropy while the original win remains collectable', async () => {
      const p = await h.seed({ houseMinor: 400n }), host = h.host({ gambleColors: ['BLACK'] });
      const spin = await host.service.spin(p.request, h.spinBody(p)), before = await h.snapshot(p);
      await assert.rejects(host.service.gamble(p.request, host.gambleBody(p, spin)), code('SUPERWILDS_HOUSE_CAPACITY_UNAVAILABLE'));
      assert.equal(host.controls.gambleSamples, 0); assert.deepEqual(await h.snapshot(p), before);
      await host.service.takeWin(p.request, h.takeBody(p, spin));
      assert.equal((await h.snapshot(p)).wallets.find(row => row.id === p.userId).balance, '10200');
    });

    await t.test('real composed host accepts one BET after twenty requests contend on wallet locks', async () => {
      const p = await h.seed(), host = h.host(), action = h.spinBody(p), blocker = await h.connect();
      let pending, results;
      try {
        await h.begin(blocker); await h.lockWallets(blocker, p.userId);
        pending = Promise.allSettled(Array.from({ length: 20 }, () => host.service.spin(p.request, { ...action })));
        const deadline = Date.now() + 7000; let waiting = 0;
        do {
          waiting = (await pool.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT id,balance FROM sw_rebuild.wallets%'")).rows[0].n;
          if (waiting >= 20) break; await delay(25);
        } while (Date.now() < deadline);
        assert.equal(waiting, 20); await blocker.query('COMMIT'); results = await pending;
      } finally { try { await blocker.query('ROLLBACK'); } finally { h.release(blocker); if (pending) await pending; } }
      for (const result of results) { assert.equal(result.status, 'fulfilled', result.reason?.message); assert.deepEqual(result.value, results[0].value); }
      const s = await h.snapshot(p);
      assert.equal(host.controls.samples, 1); assert.equal(s.rounds.length, 1); assert.equal(s.requests.length, 1);
      assert.equal(s.shared.length, 1); assert.equal(s.transfers.length, 1); assert.equal(s.ledger.length, 2);
      assert.equal(s.reservations[0].amount_minor, '300'); assert.equal(s.events.length, 2);
      assert.equal(s.ledger.reduce((sum, row) => sum + BigInt(row.delta), 0n), 0n);
    });
    await t.test('twenty distinct TAKE keys collect one protected win and one paired WIN', async () => {
      const p = await h.seed(), host = h.host(), receipt = await host.service.spin(p.request, h.spinBody(p));
      const actions = Array.from({ length: 20 }, () => h.takeBody(p, receipt));
      const results = await Promise.allSettled(actions.map(body => host.service.takeWin(p.request, body)));
      for (const result of results) assert.equal(result.status, 'fulfilled', result.reason?.message);
      assert.equal(new Set(results.map(r => r.value.collection.collectionId)).size, 1);
      const s = await h.snapshot(p); assert.equal(s.collections.length, 1); assert.equal(s.transfers.length, 2);
      assert.equal(s.events.filter(row => row.kind === 'COLLECT').length, 1); assert.equal(s.movements.length, 2);
      assert.equal(s.wallets.find(row => row.id === p.userId).balance, '10200'); assert.equal(s.reservations[0].closed_reason, 'COLLECTED');
    });
    await t.test('prepared M10 and Super Wilds liabilities share one protected house floor', async () => {
      const other = await h.seed({ houseMinor: 1000n }), p = await h.seed({ sharedHouse: other.house }), host = h.host();
      const m10 = await h.seedM10Hold(other, 400n), receipt = await host.service.spin(p.request, h.spinBody(p));
      const before = await h.snapshot(p);
      assert.equal((await pool.query('SELECT sw_new_superwilds.total_reserved($1)::text AS held', [p.house])).rows[0].held, '700');
      await assert.rejects(h.transaction(client => client.query('UPDATE sw_rebuild.wallets SET balance=699 WHERE id=$1', [p.house])),
        error => error.code === 'P0001' && error.message.includes('SUPERWILDS_RESERVED_HOUSE_FUNDS'));
      assert.deepEqual(await h.snapshot(p), before);
      // Existing M10's own trigger checks only M10. The companion trigger
      // must also reject an increase that would consume Super Wilds' hold.
      await assert.rejects(h.transaction(client => client.query('UPDATE sw_new_m10.reservations SET amount_minor=900 WHERE round_id=$1::uuid', [m10])),
        error => error.code === 'P0001' && error.message.includes('SUPERWILDS_HOUSE_CAPACITY_UNAVAILABLE'));
      assert.deepEqual(await h.snapshot(p), before); await host.service.takeWin(p.request, h.takeBody(p, receipt));
      assert.equal((await pool.query('SELECT sw_new_superwilds.total_reserved($1)::text AS held', [p.house])).rows[0].held, '400');
    });
    await t.test('exactly funded house closes the original hold before its one WIN transfer', async () => {
      const p = await h.seed({ houseMinor: 400n }), host = h.host({ win: 500n });
      const receipt = await host.service.spin(p.request, h.spinBody(p));
      assert.equal((await h.snapshot(p)).wallets.find(row => row.id === p.house).balance, '500');
      await host.service.takeWin(p.request, h.takeBody(p, receipt));
      const s = await h.snapshot(p); assert.equal(s.wallets.find(row => row.id === p.house).balance, '0');
      assert.equal(s.wallets.find(row => row.id === p.userId).balance, '10400'); assert.equal(s.ledger.length, 4);
    });
    await t.test('legacy and new UUID keys collide symmetrically; old opaque keys still work', async () => {
      const p = await h.seed(), host = h.host({ win: 0n }), legacy = randomUUID();
      await h.legacySpin(p, legacy); const before = await h.snapshot(p);
      await assert.rejects(host.service.spin(p.request, h.spinBody(p, { roundToken: legacy.toUpperCase() })), code('IDEMPOTENCY_PARAMETER_CONFLICT'));
      assert.deepEqual(await h.snapshot(p), before);
      const action = h.spinBody(p); await host.service.spin(p.request, action); const accepted = await h.snapshot(p);
      await assert.rejects(h.legacySpin(p, action.roundToken.toUpperCase()), code('IDEMPOTENCY_PARAMETER_CONFLICT'));
      assert.deepEqual(await h.snapshot(p), accepted); await h.legacySpin(p, 'old-opaque-request-key');
      assert.equal(host.controls.samples, 1);
    });
    await t.test('an injected SQL error rolls atomic TAKE plus next SPIN back through actual host callbacks', async () => {
      const p = await h.seed(), host = h.host(), receipt = await host.service.spin(p.request, h.spinBody(p)), before = await h.snapshot(p);
      await pool.query(`CREATE FUNCTION qa_superwilds.fail_host_request() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.receipt->'previousCollection' <> 'null'::jsonb THEN RAISE EXCEPTION 'QA_HOST_AFTER_COLLECT_AND_BET'; END IF; RETURN NEW; END $$`);
      await pool.query('CREATE TRIGGER qa_fail_host_request BEFORE INSERT ON sw_new_superwilds.requests FOR EACH ROW EXECUTE FUNCTION qa_superwilds.fail_host_request()');
      try {
        await assert.rejects(host.service.spin(p.request, h.spinBody(p, { collectRoundId: receipt.roundId })),
          error => error.code === 'P0001' && error.message.includes('QA_HOST_AFTER_COLLECT_AND_BET'));
        assert.deepEqual(await h.snapshot(p), before);
      } finally { await pool.query('DROP TRIGGER qa_fail_host_request ON sw_new_superwilds.requests'); await pool.query('DROP FUNCTION qa_superwilds.fail_host_request()'); }
    });
    await t.test('enabled-trigger inspection refuses an unprotected shared reservation installation', async () => {
      const p = await h.seed(), host = h.host(), before = await h.snapshot(p);
      await pool.query('ALTER TABLE sw_new_m10.reservations DISABLE TRIGGER superwilds_m10_reservation_funding');
      try {
        await assert.rejects(host.service.spin(p.request, h.spinBody(p)), code('SUPERWILDS_PROTECTED_RESERVATIONS_NOT_INSTALLED'));
        assert.deepEqual(await h.snapshot(p), before); assert.equal(host.controls.samples, 0);
      } finally { await pool.query('ALTER TABLE sw_new_m10.reservations ENABLE ALWAYS TRIGGER superwilds_m10_reservation_funding'); }
    });
    await t.test('replay and collection survive current model/release retirement with canonical UUID identity', async () => {
      const p = await h.seed(), host = h.host(), body = h.spinBody(p, { roundToken: randomUUID().toUpperCase() });
      const receipt = await host.service.spin(p.request, body), before = await h.snapshot(p);
      host.controls.release = false; host.controls.modelAvailable = false;
      assert.deepEqual(await host.service.spin(p.request, { ...body, roundToken: body.roundToken.toLowerCase(), replayOnly: true }), receipt);
      const state = await host.service.state(p.request); assert.deepEqual(state.round.result, receipt); assert.deepEqual(await h.snapshot(p), before);
      await host.service.takeWin(p.request, h.takeBody(p, receipt)); assert.equal((await h.snapshot(p)).collections.length, 1);
    });
    await t.test('failed server sampling rolls back its already executed BET without a separate refund wager', async () => {
      const p = await h.seed(), host = h.host(), before = await h.snapshot(p); host.controls.failSample = true;
      await assert.rejects(host.service.spin(p.request, h.spinBody(p)), code('ISOLATED_MODEL_FAILURE'));
      assert.deepEqual(await h.snapshot(p), before); assert.equal(host.controls.samples, 1);
    });
    await t.test('twenty fresh own-model rounds settle through mounted runtime HTTP and the same PostgreSQL ledger', async () => {
      const p = await h.seed({ houseMinor: 100000000n });
      const own = createSuperWildsOwnModel({ betLevels: ['1.00', '2.00'] });
      assert.equal(own.approved, false);
      const dependencies = { ...h.dependencies, accepting: () => true, publicGames: () => [{ id: 'fresh_multihot10',
        betLevels: ['1.00', '2.00'], features: { gambleRounds: 5, gambleMaxStake: '500.00' } }] };
      const runtime = await createSuperWildsRuntimeHost({ dependencies, rawBalance: h.dependencies.balance,
        rawLockWallets: h.dependencies.lockWallets, origin: 'https://isolated-host.invalid',
        configuration: createRequested90RuntimeConfiguration({ attach: true, cashEnabled: true, gambleEnabled: true }),
        createRoutes: () => ({ handles: () => false, state() { throw Error('UNRELATED_ROUTE'); },
          spin() { throw Error('UNRELATED_ROUTE'); }, gamble() { throw Error('UNRELATED_ROUTE'); } }) });
      const request = async (method, body) => {
        const response = await runtime.binding.handle(new Request('https://isolated-host.invalid/api/new-games90/superwilds/' + method, {
          method: body ? 'POST' : 'GET', headers: { cookie: p.request.headers.get('cookie'),
            origin: 'https://isolated-host.invalid', 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }));
        const output = await response.json(); assert.equal(response.status, 200, output.detail); return output;
      };
      const host = { service: { spin: (_, body) => request('spin', body), takeWin: (_, body) => request('take-win', body) } };
      const initial = await request('state'); assert.equal(initial.game.enabled, true); assert.deepEqual(initial.game.betLevels, ['1.00', '2.00']);
      let pending = null, expectedBalance = 10000n;
      for (let index = 0; index < 20; index++) {
        const body = h.spinBody(p, { ...MODEL_IDENTITY, collectRoundId: pending?.roundId ?? null });
        const result = await host.service.spin(p.request, body);
        const grid = Array.from({ length: 5 }, (_, c) => result.grid.map(row => row[c]));
        const quote = quoteGrid({ grid, betMinor: 100, multiplier: result.multiplier });
        const win = BigInt(quote.winMinor);
        expectedBalance += pending ? BigInt(pending.winAmount.replace('.', '')) : 0n;
        expectedBalance -= 100n;
        assert.equal(BigInt(result.winAmount.replace('.', '')), win);
        assert.deepEqual(result.winLines, quote.winningLines);
        assert.equal(result.gameId, GAME_ID); assert.equal(result.mathSha256, MODEL_IDENTITY.mathSha256);
        assert.equal(BigInt(result.walletReceipt.balanceAfter.replace('.', '')), expectedBalance);
        const beforeReplay = await h.snapshot(p);
        assert.deepEqual(await host.service.spin(p.request, { ...body, replayOnly: true }), result);
        assert.deepEqual(await h.snapshot(p), beforeReplay);
        pending = win > 0n ? result : null;
      }
      if (pending) {
        await host.service.takeWin(p.request, h.takeBody(p, pending, MODEL_IDENTITY));
        expectedBalance += BigInt(pending.winAmount.replace('.', ''));
      }
      const s = await h.snapshot(p);
      assert.equal(s.rounds.length, 20); assert.equal(s.shared.length, 20);
      assert.equal(s.movements.filter(row => row.kind === 'BET').length, 20);
      assert.equal(s.reservations.some(row => BigInt(row.amount_minor) > 0n), false);
      assert.equal(BigInt(s.wallets.find(row => row.id === p.userId).balance), expectedBalance);
      assert.equal(s.ledger.reduce((sum, row) => sum + BigInt(row.delta), 0n), 0n);
      assert.equal(s.ledger.length, s.transfers.length * 2);
    });
  } finally {
    try { await h?.cleanupClients(); await pool?.end(); }
    finally {
      try {
        if (created) {
          const deadline = Date.now() + 5000; let remaining;
          do { remaining = (await admin.query('SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=$1', [databaseName])).rows[0].n;
            if (remaining === 0) break; await delay(25);
          } while (Date.now() < deadline);
          assert.equal(remaining, 0); await admin.query('DROP DATABASE "' + databaseName + '"');
        }
      } finally { await admin.end(); }
    }
  }
});
