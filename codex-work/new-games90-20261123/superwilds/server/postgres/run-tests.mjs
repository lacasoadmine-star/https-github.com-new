import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createPgSupport } from './support.mjs';
const code = value => error => error?.code === value;

test('actual Super Wilds journal/wallet callbacks on disposable localhost PostgreSQL',
  { concurrency: false, timeout: 120000 }, async t => {
  const value = process.env.TEST_DATABASE_URL;
  assert.ok(value, 'TEST_DATABASE_URL is required; financial database tests are never silently skipped.');
  const parsed = new URL(value);
  assert.ok(['postgres:', 'postgresql:'].includes(parsed.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname), 'Only a local disposable PostgreSQL service is accepted.');
  assert.equal(parsed.pathname, '/postgres', 'The harness only accepts the local postgres admin database and creates its own random database.');
  assert.equal(parsed.search, '', 'Connection parameters cannot override the isolated host/database.');
  assert.equal(parsed.hash, '');
  assert.equal(process.env.SUPERWILDS_TEST_CREATE_DATABASE, 'disposable-database-only');
  const require = createRequire(import.meta.url);
  const modulePath = require.resolve('pg', { paths: [process.env.SUPERWILDS_TEST_NODE_MODULES, process.cwd()].filter(Boolean) });
  const imported = await import(pathToFileURL(modulePath).href), Pool = imported.Pool ?? imported.default.Pool;
  const admin = new Pool({ connectionString: value, max: 1, connectionTimeoutMillis: 4000, statement_timeout: 15000 });
  const databaseName = 'zplay_superwilds_test_' + randomUUID().replaceAll('-', '');
  assert.match(databaseName, /^zplay_superwilds_test_[a-f0-9]{32}$/);
  let created = false, pool, h;
  try {
    await admin.query('CREATE DATABASE "' + databaseName + '"'); created = true;
    parsed.pathname = '/' + databaseName;
    pool = new Pool({ connectionString: parsed.href, max: 24, connectionTimeoutMillis: 5000,
      statement_timeout: 15000, idle_in_transaction_session_timeout: 20000 });
    await pool.query(await readFile(new URL('./fixture.sql', import.meta.url), 'utf8'));
    await pool.query(await readFile(new URL('../prepare-journal.sql', import.meta.url), 'utf8'));
    await pool.query(await readFile(new URL('./reservation-fixture.sql', import.meta.url), 'utf8'));
    h = createPgSupport(pool);

    await t.test('twenty first SPIN requests really wait on the existing wallet and accept one debit/round', async () => {
      const p = await h.seed(), host = h.host(), body = h.spinBody(p), blocker = await h.connect();
      let pending, results;
      try {
        await h.begin(blocker); await h.lockWallets(blocker, p.userId);
        pending = Promise.allSettled(Array.from({ length: 20 }, () => host.service.spin(p.request, { ...body })));
        const deadline = Date.now() + 7000; let waiting = 0;
        do {
          waiting = (await pool.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT id,balance FROM sw_rebuild.wallets%'")).rows[0].n;
          if (waiting >= 20) break; await delay(25);
        } while (Date.now() < deadline);
        assert.equal(waiting, 20, 'All twenty actions must contend on the actual PostgreSQL wallet lock.');
        await blocker.query('COMMIT'); results = await pending;
      } finally {
        try { await blocker.query('ROLLBACK'); } finally { h.release(blocker); if (pending) await pending; }
      }
      for (const result of results) {
        assert.equal(result.status, 'fulfilled', result.reason?.message); assert.deepEqual(result.value, results[0].value);
      }
      const s = await h.snapshot(p);
      assert.equal(host.controls.samples, 1); assert.equal(s.rounds.length, 1); assert.equal(s.requests.length, 1);
      assert.equal(s.shared.length, 1); assert.equal(s.transfers.length, 1); assert.equal(s.ledger.length, 2);
      assert.equal(s.wallets.find(w => w.id === p.userId).balance, '9900'); assert.equal(s.reservations[0].amount_minor, '300');
      assert.equal(s.ledger.reduce((sum, row) => sum + BigInt(row.delta), 0n), 0n);
    });

    await t.test('twenty distinct TAKE keys credit the accepted pending win once with one paired WIN', async () => {
      const p = await h.seed(), host = h.host(), r = await host.service.spin(p.request, h.spinBody(p));
      const actions = Array.from({ length: 20 }, () => h.takeBody(p, r));
      const results = await Promise.allSettled(actions.map(action => host.service.takeWin(p.request, action)));
      for (const result of results) assert.equal(result.status, 'fulfilled', result.reason?.message);
      assert.equal(new Set(results.map(r => r.value.collection.collectionId)).size, 1);
      const s = await h.snapshot(p);
      assert.equal(s.collections.length, 1); assert.equal(s.requests.length, 21); assert.equal(s.transfers.length, 2);
      assert.equal(s.transfers.filter(r => r.kind === 'win').length, 1); assert.equal(s.ledger.length, 4);
      assert.equal(s.wallets.find(w => w.id === p.userId).balance, '10200'); assert.equal(s.reservations[0].amount_minor, '0');
      assert.equal(s.ledger.reduce((sum, row) => sum + BigInt(row.delta), 0n), 0n);
    });

    await t.test('real old/new request-journal collisions are rejected in both directions before a second debit', async () => {
      const p = await h.seed(), host = h.host({ win: 0n }), oldKey = randomUUID();
      await h.legacySpin(p, oldKey); const old = await h.snapshot(p);
      await assert.rejects(host.service.spin(p.request, h.spinBody(p, { roundToken: oldKey.toUpperCase() })), code('IDEMPOTENCY_PARAMETER_CONFLICT'));
      assert.deepEqual(await h.snapshot(p), old);
      const action = h.spinBody(p); await host.service.spin(p.request, action); const accepted = await h.snapshot(p);
      await assert.rejects(h.legacySpin(p, action.roundToken), code('IDEMPOTENCY_PARAMETER_CONFLICT'));
      assert.deepEqual(await h.snapshot(p), accepted); assert.equal(host.controls.samples, 1);
    });

    await t.test('a SQL error after collect plus next SPIN rolls collection, new debit and journals back together', async () => {
      const p = await h.seed(), host = h.host(), r = await host.service.spin(p.request, h.spinBody(p)), before = await h.snapshot(p);
      await pool.query(`CREATE FUNCTION qa_superwilds.fail_next_request() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.receipt->>'kind'='SPIN' AND NEW.receipt->'previousCollection' <> 'null'::jsonb THEN
          IF NOT EXISTS(SELECT 1 FROM sw_new_superwilds.collections WHERE round_id=(NEW.receipt->'previousCollection'->>'roundId')::uuid) THEN
            RAISE EXCEPTION 'QA_COLLECTION_NOT_REACHED'; END IF;
          IF NOT EXISTS(SELECT 1 FROM sw_rebuild.rounds WHERE id='new-superwilds:'||(NEW.receipt->>'roundId')) THEN
            RAISE EXCEPTION 'QA_NEW_ROUND_NOT_REACHED'; END IF;
          RAISE EXCEPTION 'QA_AFTER_COLLECTION_AND_NEW_DEBIT'; END IF; RETURN NEW; END $$`);
      await pool.query('CREATE TRIGGER qa_fail_next_request BEFORE INSERT ON sw_new_superwilds.requests FOR EACH ROW EXECUTE FUNCTION qa_superwilds.fail_next_request()');
      try {
        await assert.rejects(host.service.spin(p.request, h.spinBody(p, { collectRoundId: r.roundId })),
          e => e.code === 'P0001' && e.message.includes('QA_AFTER_COLLECTION_AND_NEW_DEBIT'));
        assert.deepEqual(await h.snapshot(p), before);
      } finally {
        await pool.query('DROP TRIGGER qa_fail_next_request ON sw_new_superwilds.requests');
        await pool.query('DROP FUNCTION qa_superwilds.fail_next_request()');
      }
    });

    await t.test('actual wallet floor rejects an older raw debit below reserved liability and TAKE still pays', async () => {
      const p = await h.seed(), host = h.host(), r = await host.service.spin(p.request, h.spinBody(p)), before = await h.snapshot(p);
      await assert.rejects(h.transaction(client => client.query('UPDATE sw_rebuild.wallets SET balance=299 WHERE id=$1', [p.house])),
        e => e.code === 'P0001' && e.message.includes('QA_SUPERWILDS_RESERVED_HOUSE_FLOOR'));
      assert.deepEqual(await h.snapshot(p), before);
      await host.service.takeWin(p.request, h.takeBody(p, r));
      assert.equal((await h.snapshot(p)).wallets.find(w => w.id === p.userId).balance, '10200');
    });

    await t.test('readiness inspects actual enabled PostgreSQL trigger and rejects a disabled floor', async () => {
      const p = await h.seed(), host = h.host(), before = await h.snapshot(p);
      await pool.query('ALTER TABLE sw_rebuild.wallets DISABLE TRIGGER qa_superwilds_house_floor');
      try {
        await assert.rejects(host.service.spin(p.request, h.spinBody(p)), code('SUPERWILDS_RESERVED_FLOOR_NOT_INSTALLED'));
        assert.deepEqual(await h.snapshot(p), before); assert.equal(host.controls.samples, 0);
      } finally { await pool.query('ALTER TABLE sw_rebuild.wallets ENABLE ALWAYS TRIGGER qa_superwilds_house_floor'); }
    });

    await t.test('uppercase accepted keys recover through the actual UUID journal after model retirement', async () => {
      const p = await h.seed(), host = h.host(), body = h.spinBody(p, { roundToken: randomUUID().toUpperCase() });
      const r = await host.service.spin(p.request, body), before = await h.snapshot(p);
      host.controls.release = false; host.controls.modelAvailable = false;
      assert.deepEqual(await host.service.spin(p.request, { ...body, roundToken: body.roundToken.toLowerCase(), replayOnly: true }), r);
      const state = await host.service.state(p.request); assert.deepEqual(state.round.result, r);
      assert.deepEqual(await h.snapshot(p), before);
      await host.service.takeWin(p.request, h.takeBody(p, r));
      assert.equal((await h.snapshot(p)).collections.length, 1);
    });
  } finally {
    try { await h?.cleanupClients(); await pool?.end(); }
    finally {
      try {
        if (created) {
          // Observe normal backend exit after pool.end; no forced DROP,
          // connection termination or suppressed asynchronous client errors.
          const deadline = Date.now() + 5000; let remaining;
          do {
            remaining = (await admin.query('SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=$1', [databaseName])).rows[0].n;
            if (remaining === 0) break; await delay(25);
          } while (Date.now() < deadline);
          assert.equal(remaining, 0, 'Disposable PostgreSQL clients did not drain naturally before cleanup.');
          await admin.query('DROP DATABASE "' + databaseName + '"');
        }
      } finally { await admin.end(); }
    }
  }
});
