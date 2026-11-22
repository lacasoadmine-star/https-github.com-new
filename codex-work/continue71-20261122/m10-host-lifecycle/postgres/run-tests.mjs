import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createSupport, loadExistingModules, GAME_ID } from './support.mjs';

const code = expected => error => error?.code === expected;
const noOldMutation = old => assert.deepEqual(old.calls, { draws: 0, moves: 0 });

test('actual M10 host lifecycle and existing gamble with disposable PostgreSQL', { timeout: 130000, concurrency: false }, async t => {
  const value = process.env.M10_HOST_TEST_POSTGRES_ADMIN_URL;
  assert.ok(value, 'Set M10_HOST_TEST_POSTGRES_ADMIN_URL for disposable localhost PostgreSQL; no database scenario is silently skipped.');
  const parsed = new URL(value);
  assert.ok(['postgres:', 'postgresql:'].includes(parsed.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname), 'Only a local disposable PostgreSQL service is accepted.');
  assert.equal(parsed.pathname, '/postgres', 'The harness creates its own random database from local postgres.');
  assert.equal(parsed.search, '', 'Connection options cannot override the isolated host or database.');
  assert.equal(parsed.hash, '', 'Connection URL fragments are not accepted.');
  assert.equal(process.env.M10_HOST_TEST_CREATE_DATABASE, 'disposable-database-only', 'Explicit disposable CREATE DATABASE opt-in is required.');
  const require = createRequire(import.meta.url);
  const modulePath = require.resolve('pg', { paths: [process.env.M10_HOST_TEST_NODE_MODULES, process.cwd()].filter(Boolean) });
  const imported = await import(pathToFileURL(modulePath).href);
  const Pool = imported.Pool ?? imported.default.Pool;
  const { createM10HostIntegration } = await import('../host-integration.mjs');
  const admin = new Pool({ connectionString: value, max: 1, connectionTimeoutMillis: 4000, statement_timeout: 10000 });
  const databaseName = 'zplay_m10_host_test_' + randomUUID().replaceAll('-', '');
  assert.match(databaseName, /^zplay_m10_host_test_[a-f0-9]{32}$/);
  let created = false, pool, existing, h;
  try {
    await admin.query('CREATE DATABASE "' + databaseName + '"'); created = true;
    parsed.pathname = '/' + databaseName;
    pool = new Pool({ connectionString: parsed.href, max: 8, connectionTimeoutMillis: 4000,
      statement_timeout: 10000, idle_in_transaction_session_timeout: 15000 });
    await pool.query(await readFile(new URL('./fixture.sql', import.meta.url), 'utf8'));
    // Execute the real prepared journal and frozen reservation DDL in order.
    await pool.query(await readFile(new URL('../prepare-journal.sql', import.meta.url), 'utf8'));
    await pool.query(await readFile(new URL('../../m10-house-reservations/prepare-schema.sql', import.meta.url), 'utf8'));
    existing = await loadExistingModules();
    h = createSupport(pool, createM10HostIntegration, existing);

    await t.test('a new loss registers one authoritative shared round and all retries preserve its identity', async () => {
      const player = await h.seed(), host = h.host([0n]), body = h.spinBody(player);
      const first = await host.lifecycle.spin(player.request, body);
      assert.equal(first.winAmount, '0.00'); assert.equal(first.collectionStatus, 'NOT_REQUIRED');
      const before = await h.snapshot(player);
      assert.equal(before.shared.length, 1); assert.equal(before.rounds.length, 1); assert.equal(before.requests.length, 1);
      assert.equal(before.shared[0].id, 'new-m10:' + first.roundId);
      assert.equal(before.shared[0].game, GAME_ID); assert.equal(before.shared[0].payout, '0');
      assert.deepEqual(before.shared[0].outcome, first); assert.ok(BigInt(before.shared[0].settled_order) > 0n);
      const results = await Promise.allSettled(Array.from({ length: 20 }, () => host.lifecycle.spin(player.request, { ...body, replayOnly: true })));
      for (const result of results) { assert.equal(result.status, 'fulfilled', result.reason?.message); assert.deepEqual(result.value, first); }
      assert.equal(host.samples(), 1); assert.deepEqual(await h.snapshot(player), before);
      // Exercise the real registration hook's duplicate path as well. The
      // sequence may develop gaps; the already accepted stored order must not change.
      await h.transaction(client => host.ownership.registerRound(client, { userId: player.userId, gameId: GAME_ID,
        roundId: first.roundId, requestKey: first.requestKey, bet: first.bet, winAmount: first.winAmount, receipt: first }));
      assert.deepEqual(await h.snapshot(player), before);
      await assert.rejects(() => host.lifecycle.spin(player.request, { ...body, bet: '2.00' }), code('IDEMPOTENCY_PARAMETER_CONFLICT'));
      assert.deepEqual(await h.snapshot(player), before);
    });

    await t.test('an M10 loss expires actual old gamble eligibility before any old RNG or transfer', async () => {
      const player = await h.seed(), host = h.host([0n]), old = h.oldApi(host), parent = await h.seedOldRound(player);
      const beforeState = await h.legacyState(host, old, player);
      assert.equal(beforeState.blockedByActiveGame, null); assert.equal(beforeState.round.gamble.available, true);
      await host.lifecycle.spin(player.request, h.spinBody(player));
      const afterState = await h.legacyState(host, old, player);
      assert.equal(afterState.blockedByActiveGame, null); assert.equal(afterState.round.gamble.available, false);
      assert.equal(afterState.round.gamble.reason, 'GAMBLE_EXPIRED');
      const before = await h.snapshot(player);
      await assert.rejects(() => old.gamble(player.request, h.oldBody(player, parent)), code('GAMBLE_EXPIRED'));
      assert.deepEqual(await h.snapshot(player), before); noOldMutation(old);
      assert.equal(before.shared.length, 2);
      assert.ok(BigInt(before.shared[1].settled_order) > BigInt(before.shared[0].settled_order));
    });

    await t.test('an accepted old gamble receipt still replays after a newer M10 round', async () => {
      const player = await h.seed(), host = h.host([0n]), old = h.oldApi(host), parent = await h.seedOldRound(player);
      const accepted = await h.seedOldAction(player, parent);
      await host.lifecycle.spin(player.request, h.spinBody(player));
      const before = await h.snapshot(player);
      assert.deepEqual(await old.gamble(player.request, { ...accepted.body, replayOnly: true }), accepted.receipt);
      assert.deepEqual(await h.snapshot(player), before); noOldMutation(old);
    });

    await t.test('TAKE and next-SPIN really contend on wallet locks and collect once before one new BET', async () => {
      const player = await h.seed(), host = h.host([300n, 0n]);
      const first = await host.lifecycle.spin(player.request, h.spinBody(player));
      assert.equal(first.winAmount, '3.00');
      const blocker = await h.connect(); let pending, results;
      try {
        await h.begin(blocker); await h.dependencies.lockWallets(blocker, player.userId);
        pending = Promise.allSettled([
          host.lifecycle.takeWin(player.request, h.takeBody(player, first)),
          host.lifecycle.spin(player.request, h.spinBody(player, { collectRoundId: first.roundId })),
        ]);
        let bothWaiting = false;
        for (let attempt = 0; attempt < 60; attempt++) {
          const row = (await pool.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT id,balance FROM sw_rebuild.wallets%'")).rows[0];
          if (row.n >= 2) { bothWaiting = true; break; }
          await delay(25);
        }
        assert.equal(bothWaiting, true, 'Both real lifecycle requests must be waiting on the held wallet lock.');
        await blocker.query('COMMIT'); results = await pending;
      } finally {
        try { await blocker.query('ROLLBACK'); }
        finally { h.release(blocker); if (pending) await pending; }
      }
      for (const result of results) assert.equal(result.status, 'fulfilled', result.reason?.message);
      const take = results[0].value, next = results[1].value, state = await h.snapshot(player);
      assert.equal(take.collection.collectionId, next.previousCollection.collectionId);
      assert.equal(state.collections.length, 1); assert.equal(state.requests.length, 3); assert.equal(state.rounds.length, 2);
      assert.equal(state.shared.length, 2); assert.equal(state.transfers.filter(row => row.kind === 'bet').length, 2);
      assert.equal(state.transfers.filter(row => row.kind === 'win').length, 1); assert.equal(state.ledger.length, 6);
      assert.equal(state.ledger.reduce((total, row) => total + BigInt(row.delta), 0n), 0n);
      assert.equal(state.wallets.find(row => row.id === player.userId).balance, '10100');
      assert.equal(state.wallets.find(row => row.id === player.house).balance, '99900');
      assert.equal((await host.lifecycle.state(player.request)).round.pendingWinAmount, '0.00');
      assert.equal(host.samples(), 2);
    });

    for (const phase of ['BEFORE', 'AFTER']) await t.test('SQL failure ' + phase.toLowerCase() + ' the final request insert rolls back the shared order, hold and paired ledger', async () => {
      const player = await h.seed(), host = h.host([300n]), before = await h.snapshot(player);
      const expected = phase === 'BEFORE' ? 'QA_AFTER_SHARED_ROUND_BEFORE_REQUEST' : 'QA_AFTER_FINAL_REQUEST_INSERT';
      await pool.query(`CREATE FUNCTION sw_new_m10.qa_fail_request() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NOT EXISTS(SELECT 1 FROM sw_rebuild.rounds WHERE id='new-m10:'||(NEW.receipt->>'roundId') AND user_id=NEW.user_id) THEN
            RAISE EXCEPTION 'QA_SHARED_ROUND_NOT_REACHED';
          END IF;
          IF TG_WHEN='AFTER' AND NOT EXISTS(SELECT 1 FROM sw_new_m10.requests WHERE user_id=NEW.user_id AND request_key=NEW.request_key) THEN
            RAISE EXCEPTION 'QA_FINAL_REQUEST_NOT_REACHED';
          END IF;
          RAISE EXCEPTION '${expected}';
        END $$`);
      await pool.query('CREATE TRIGGER qa_fail_request ' + phase + ' INSERT ON sw_new_m10.requests FOR EACH ROW EXECUTE FUNCTION sw_new_m10.qa_fail_request()');
      try {
        await assert.rejects(() => host.lifecycle.spin(player.request, h.spinBody(player)), error => error.code === 'P0001' && error.message.includes(expected));
        assert.deepEqual(await h.snapshot(player), before);
      } finally {
        await pool.query('DROP TRIGGER qa_fail_request ON sw_new_m10.requests');
        await pool.query('DROP FUNCTION sw_new_m10.qa_fail_request()');
      }
    });

    await t.test('native text IDs block M10 state and spin without a fabricated UUID', async () => {
      const player = await h.seed(), host = h.host([0n]), old = h.oldApi(host);
      await h.seedOldRound(player);
      const nativeId = 'synthetic-native-round-' + player.userId, nativeGame = 'synthetic-existing-native';
      await pool.query("INSERT INTO sw_native_library.rounds(id,user_id,game_id,status) VALUES($1,$2,$3,'active')", [nativeId, player.userId, nativeGame]);
      assert.deepEqual(await h.transaction(client => host.ownership.activeRound(client, player.userId)), { gameId: nativeGame, roundId: nativeId });
      const state = await host.lifecycle.state(player.request);
      assert.equal(state.blockedByActiveGame, nativeGame); assert.equal(state.round, null);
      const legacy = await h.legacyState(host, old, player);
      assert.equal(legacy.blockedByActiveGame, nativeGame); assert.equal(legacy.round.gamble.reason, 'FINISH_ACTIVE_ROUND:' + nativeGame);
      const before = await h.snapshot(player);
      await assert.rejects(() => host.lifecycle.spin(player.request, h.spinBody(player)), code('FINISH_ACTIVE_ROUND:' + nativeGame));
      assert.deepEqual(await h.snapshot(player), before); assert.equal(host.samples(), 0);
    });

    await t.test('an M10 pending win blocks the actual old mutation and both legacy state fields', async () => {
      const player = await h.seed(), host = h.host([300n]), old = h.oldApi(host), parent = await h.seedOldRound(player);
      const receipt = await host.lifecycle.spin(player.request, h.spinBody(player));
      const legacy = await h.legacyState(host, old, player);
      assert.equal(legacy.authenticated, true); assert.equal(legacy.sessionGuard, player.guard);
      assert.equal(legacy.blockedByActiveGame, GAME_ID); assert.equal(legacy.round.gamble.available, false);
      assert.equal(legacy.round.gamble.reason, 'FINISH_ACTIVE_ROUND:' + GAME_ID);
      const before = await h.snapshot(player);
      const shared = before.shared.find(row => row.id === 'new-m10:' + receipt.roundId);
      assert.equal(shared.payout, '300'); assert.equal(shared.outcome.collectionStatus, 'PENDING');
      assert.equal(shared.outcome.walletReceipt.creditedWin, '0.00');
      await assert.rejects(() => old.gamble(player.request, h.oldBody(player, parent)), code('FINISH_ACTIVE_ROUND:' + GAME_ID));
      assert.deepEqual(await h.snapshot(player), before); noOldMutation(old);
    });

    await t.test('inconsistent native and M10 ownership is rejected by both state paths', async () => {
      const player = await h.seed(), host = h.host([300n]), old = h.oldApi(host);
      await h.seedOldRound(player); await host.lifecycle.spin(player.request, h.spinBody(player));
      // Deliberate fixture corruption to test fail-closed ownership, not an
      // application operation or an attempt to synthesize an M10 native row.
      await pool.query("INSERT INTO sw_native_library.rounds(id,user_id,game_id,status) VALUES($1,$2,'synthetic-other-active','active')", ['dual-' + randomUUID(), player.userId]);
      const before = await h.snapshot(player);
      await assert.rejects(() => host.lifecycle.state(player.request), code('M10_CROSS_GAME_ACTIVE_CONFLICT'));
      await assert.rejects(() => h.legacyState(host, old, player), code('M10_CROSS_GAME_ACTIVE_CONFLICT'));
      assert.deepEqual(await h.snapshot(player), before); noOldMutation(old);
    });

    await t.test('the composed old/new request-owner guard rejects cross-family key collisions', async () => {
      const player = await h.seed(), host = h.host([0n]), old = h.oldApi(host), oldKey = randomUUID();
      const parent = await h.seedOldRound(player, oldKey), before = await h.snapshot(player);
      await assert.rejects(() => host.lifecycle.spin(player.request, h.spinBody(player, { key: oldKey })), code('IDEMPOTENCY_PARAMETER_CONFLICT'));
      assert.deepEqual(await h.snapshot(player), before);
      const body = h.spinBody(player); await host.lifecycle.spin(player.request, body);
      const accepted = await h.snapshot(player);
      await assert.rejects(() => old.gamble(player.request, h.oldBody(player, parent, body.roundToken)), code('IDEMPOTENCY_PARAMETER_CONFLICT'));
      assert.deepEqual(await h.snapshot(player), accepted); noOldMutation(old); assert.equal(host.samples(), 1);
    });
  } finally {
    try { h?.destroyOutstanding(); await pool?.end(); }
    finally {
      try {
        if (created) {
          // pg-pool end may resolve before every server backend has exited.
          // Observe graceful server-side drain; never force-drop or suppress
          // asynchronous errors caused by killing still-connected clients.
          const deadline = Date.now() + 5000; let remaining;
          do {
            remaining = (await admin.query('SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=$1', [databaseName])).rows[0].n;
            if (remaining === 0) break;
            await delay(25);
          } while (Date.now() < deadline);
          assert.equal(remaining, 0, 'Disposable PostgreSQL clients did not drain before DROP DATABASE.');
          await admin.query('DROP DATABASE "' + databaseName + '"');
        }
      } finally {
        try { await admin.end(); }
        finally { await existing?.cleanup(); }
      }
    }
  }
});
