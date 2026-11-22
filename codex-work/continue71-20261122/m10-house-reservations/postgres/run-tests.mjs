import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { GAME_ID, SQL, createM10ReservationBridge } from '../bridge.mjs';

// The existing generic wallet/paired-ledger transfer SQL, including its old
// audit target. Deliberately unmodified by the M10 available-balance wrapper:
// the database trigger must protect an accepted hold even for an old writer.
const LEGACY_TRANSFER_SQL = `WITH d AS (
 UPDATE sw_rebuild.wallets SET balance=balance-$3::bigint WHERE id=$1 AND balance >=$3::bigint RETURNING balance),
 cr AS (UPDATE sw_rebuild.wallets SET balance=balance+$3::bigint WHERE id=$2 AND EXISTS(SELECT 1 FROM d) RETURNING balance),
 t AS (INSERT INTO sw_rebuild.transfers(id,sender,recipient,amount,kind,actor) SELECT $4,$1,$2,$3::bigint,$5,$6 WHERE EXISTS(SELECT 1 FROM cr) RETURNING id),
 l AS (INSERT INTO sw_rebuild.ledger(transfer_id,wallet_id,delta) SELECT t.id,$1,-$3::bigint FROM t UNION ALL SELECT t.id,$2,$3::bigint FROM t),
 audit AS (INSERT INTO sw_nine.wallet_transactions(user_id,round_id,game_id,type,amount,balance_after,transfer_id)
 SELECT $6,$7::uuid,$8,$9,$3::bigint,CASE WHEN $6=$1 THEN (SELECT balance FROM d) ELSE (SELECT balance FROM cr) END,t.id FROM t RETURNING id)
 SELECT (SELECT count(*) FROM d)::int debited,(SELECT count(*) FROM cr)::int credited,(SELECT count(*) FROM audit)::int recorded`;

const code = expected => error => error?.code === expected;
const pgError = message => error => error?.code === 'P0001' && error.message.includes(message);
const args = (userId, amountMinor = 100n, roundId = randomUUID()) => ({ gameId: GAME_ID, userId, roundId, amountMinor });

test('M10 house reservations with a disposable PostgreSQL database', { timeout: 130000, concurrency: false }, async t => {
  const value = process.env.M10_RESERVATION_TEST_POSTGRES_ADMIN_URL;
  assert.ok(value, 'Set M10_RESERVATION_TEST_POSTGRES_ADMIN_URL for disposable localhost PostgreSQL; database tests are never silently skipped.');
  const parsed = new URL(value);
  assert.ok(['postgres:', 'postgresql:'].includes(parsed.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname), 'Only a local disposable PostgreSQL service is accepted.');
  assert.equal(parsed.pathname, '/postgres', 'The harness creates its own random database from the local postgres admin database.');
  assert.equal(parsed.search, '', 'Connection options must not override the isolated host or database.');
  assert.equal(parsed.hash, '', 'Connection URL fragments are not accepted.');
  assert.equal(process.env.M10_RESERVATION_TEST_CREATE_DATABASE, 'disposable-database-only', 'Explicit disposable CREATE DATABASE opt-in is required.');
  const require = createRequire(import.meta.url);
  const modulePath = require.resolve('pg', { paths: [process.env.M10_RESERVATION_TEST_NODE_MODULES, process.cwd()].filter(Boolean) });
  const imported = await import(pathToFileURL(modulePath).href);
  const Pool = imported.Pool ?? imported.default.Pool;
  const admin = new Pool({ connectionString: value, max: 1, connectionTimeoutMillis: 4000, statement_timeout: 10000 });
  const databaseName = 'zplay_m10_reservation_test_' + randomUUID().replaceAll('-', '');
  assert.match(databaseName, /^zplay_m10_reservation_test_[a-f0-9]{32}$/);
  let created = false, pool;
  const checkedOut = new Set();
  try {
    await admin.query('CREATE DATABASE "' + databaseName + '"');
    created = true;
    parsed.pathname = '/' + databaseName;
    pool = new Pool({ connectionString: parsed.href, max: 8, connectionTimeoutMillis: 4000,
      statement_timeout: 10000, idle_in_transaction_session_timeout: 15000 });
    await pool.query(await readFile(new URL('./fixture.sql', import.meta.url), 'utf8'));
    // Apply the exact candidate, not a rewritten approximation of its triggers.
    await pool.query(await readFile(new URL('../prepare-schema.sql', import.meta.url), 'utf8'));

    const connect = async () => { const client = await pool.connect(); checkedOut.add(client); return client; };
    const release = client => { if (checkedOut.delete(client)) client.release(); };
    const begin = async (client, isolation = 'READ COMMITTED') => {
      assert.ok(['READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'].includes(isolation));
      await client.query('BEGIN ISOLATION LEVEL ' + isolation);
      await client.query('SET LOCAL search_path = pg_catalog, sw_rebuild, public');
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query("SET LOCAL statement_timeout='10s'");
    };
    const transaction = async (fn, { rollback = false, isolation = 'READ COMMITTED' } = {}) => {
      const client = await connect();
      try {
        await begin(client, isolation);
        const result = await fn(client);
        await client.query(rollback ? 'ROLLBACK' : 'COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { release(client); }
    };
    const houses = new Map();
    const houseFor = userId => {
      assert.ok(houses.has(userId), 'The synthetic player has an explicit existing house assignment.');
      return houses.get(userId);
    };
    const balance = async (client, id) => {
      const result = await client.query('SELECT balance FROM sw_rebuild.wallets WHERE id=$1', [id]);
      assert.equal(result.rowCount, 1); return result.rows[0].balance;
    };
    const raw = {
      houseFor, balance,
      lockWallets: async (client, userId) => {
        const result = await client.query('SELECT id,balance FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE', [[userId, houseFor(userId)]]);
        assert.equal(result.rowCount, 2); return result.rows;
      },
      assertNoActive: async (client, userId) => {
        const result = await client.query("SELECT game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' ORDER BY created_at,id LIMIT 1", [userId]);
        if (result.rows[0]) throw Object.assign(new Error('OLD_ACTIVE_ROUND'), { code: 'OLD_ACTIVE_ROUND' });
      },
      activeRound: async (client, userId) => {
        const result = await client.query("SELECT id,game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' ORDER BY created_at,id LIMIT 1", [userId]);
        return result.rows[0] ? { gameId: result.rows[0].game_id, roundId: result.rows[0].id } : null;
      },
      assertPlayerCapacity: async (client, userId, before, stake, maximumPayout) => {
        const result = await client.query('SELECT max_balance FROM sw_rebuild.account_limits WHERE user_id=$1', [userId]);
        const cap = result.rows[0]?.max_balance;
        if (cap !== null && cap !== undefined && BigInt(before) - BigInt(stake) + BigInt(maximumPayout) > BigInt(cap)) {
          throw Object.assign(new Error('ACCOUNT_BALANCE_LIMIT'), { code: 'ACCOUNT_BALANCE_LIMIT' });
        }
      },
    };
    const { wallet, legacyDependencies } = createM10ReservationBridge(raw);
    const seed = async ({ houseId = null, houseBalance = 1000n, playerBalance = 1000n } = {}) => {
      const userId = 'm10-qa-player-' + randomUUID();
      const house = houseId ?? 'm10-qa-house-' + randomUUID();
      await transaction(async client => {
        await client.query("INSERT INTO sw_rebuild.users(id,role,status) VALUES($1,'player','active')", [userId]);
        await client.query('INSERT INTO sw_rebuild.wallets(id,balance) VALUES($1,$2)', [userId, playerBalance.toString()]);
        if (houseId === null) {
          await client.query("INSERT INTO sw_rebuild.users(id,role,status) VALUES($1,'house','active')", [house]);
          await client.query('INSERT INTO sw_rebuild.wallets(id,balance) VALUES($1,$2)', [house, houseBalance.toString()]);
        }
        await client.query('INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES($1,NULL)', [userId]);
      });
      houses.set(userId, house);
      return { userId, house };
    };
    const recordRound = (client, action, win) => client.query(`INSERT INTO sw_new_m10.rounds
      (round_id,user_id,game_id,request_key,stake_minor,win_minor,receipt) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [action.roundId, action.userId, GAME_ID, randomUUID(), action.amountMinor.toString(), win.toString(), JSON.stringify({ testOnly: true, roundId: action.roundId })]);
    const acceptIn = async (client, action, win) => {
      await wallet.assertNoActiveRound(client, action.userId);
      await wallet.debitStake(client, action);
      if (win > 0n) await wallet.reserveWin(client, { ...action, amountMinor: win });
      assert.equal((await client.query('SELECT 1 FROM sw_new_m10.rounds WHERE round_id=$1', [action.roundId])).rowCount, 0,
        'The financial writes really precede the deferred-FK parent insert.');
      await recordRound(client, action, win);
      if (win > 0n) await wallet.claimActiveRound(client, action.userId, GAME_ID, action.roundId);
    };
    const accept = (action, win) => transaction(client => acceptIn(client, action, win));
    const cash = async id => BigInt(await balance(pool, id));
    const snapshot = async ids => {
      const result = {};
      result.wallets = (await pool.query('SELECT id,balance FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id', [ids])).rows;
      result.transfers = (await pool.query('SELECT * FROM sw_rebuild.transfers WHERE sender=ANY($1::text[]) OR recipient=ANY($1::text[]) ORDER BY id', [ids])).rows;
      result.ledger = (await pool.query('SELECT l.* FROM sw_rebuild.ledger l JOIN sw_rebuild.transfers t ON t.id=l.transfer_id WHERE t.sender=ANY($1::text[]) OR t.recipient=ANY($1::text[]) ORDER BY l.transfer_id,l.wallet_id', [ids])).rows;
      result.reservations = (await pool.query('SELECT * FROM sw_new_m10.reservations WHERE user_id=ANY($1::text[]) OR house_wallet_id=ANY($1::text[]) ORDER BY round_id', [ids])).rows;
      result.movements = (await pool.query('SELECT * FROM sw_new_m10.wallet_movements WHERE user_id=ANY($1::text[]) ORDER BY transfer_id', [ids])).rows;
      result.events = (await pool.query('SELECT * FROM sw_new_m10.reservation_events WHERE user_id=ANY($1::text[]) OR house_wallet_id=ANY($1::text[]) ORDER BY event_key', [ids])).rows;
      result.rounds = (await pool.query('SELECT * FROM sw_new_m10.rounds WHERE user_id=ANY($1::text[]) ORDER BY round_id', [ids])).rows;
      return result;
    };

    await t.test('exact DDL applies and BET/hold/collect uses the shared ledger without ledger.id', async () => {
      const columns = (await pool.query("SELECT attname FROM pg_catalog.pg_attribute WHERE attrelid='sw_rebuild.ledger'::regclass AND attnum>0 AND NOT attisdropped ORDER BY attnum")).rows.map(row => row.attname);
      assert.deepEqual(columns, ['transfer_id', 'wallet_id', 'delta']);
      const flags = (await pool.query(SQL.installation)).rows[0];
      assert.deepEqual(flags, { isolation: 'read committed', wallet_floor: true, reservation_funding: true });
      const { userId, house } = await seed(), action = args(userId);
      await accept(action, 300n);
      assert.equal(await cash(userId), 900n); assert.equal(await cash(house), 1100n);
      await transaction(async client => {
        assert.equal(await wallet.houseBalance(client, userId), 800n);
        assert.equal(await wallet.reserveBalance(client, userId), 300n);
        await wallet.creditReservedWin(client, { ...action, amountMinor: 300n, collectionId: randomUUID() });
        await wallet.releaseActiveRound(client, userId, GAME_ID, action.roundId);
        assert.equal(await wallet.houseBalance(client, userId), 800n);
      });
      const state = await snapshot([userId, house]);
      assert.equal(await cash(userId), 1200n); assert.equal(await cash(house), 800n);
      assert.equal(state.transfers.length, 2); assert.equal(state.ledger.length, 4);
      assert.equal(state.ledger.reduce((total, row) => total + BigInt(row.delta), 0n), 0n);
      assert.equal(state.reservations[0].amount_minor, '0'); assert.equal(state.reservations[0].closed_reason, 'COLLECTED');
      assert.equal((await pool.query('SELECT 1 FROM sw_nine.wallet_transactions WHERE user_id=$1', [userId])).rowCount, 0);
    });

    await t.test('twenty concurrent collection replays commit one WIN and one paired credit', async () => {
      const { userId, house } = await seed(), action = args(userId);
      await accept(action, 300n);
      const collect = { ...action, amountMinor: 300n, collectionId: randomUUID() };
      const results = await Promise.allSettled(Array.from({ length: 20 }, () => transaction(client => wallet.creditReservedWin(client, collect))));
      assert.equal(results.filter(result => result.status === 'rejected').length, 0,
        results.find(result => result.status === 'rejected')?.reason?.message ?? 'Every concurrent replay must finish successfully.');
      const receipts = results.map(result => result.value);
      for (const receipt of receipts) assert.deepEqual(receipt, receipts[0]);
      const state = await snapshot([userId, house]);
      assert.equal(state.transfers.filter(row => row.kind === 'win').length, 1);
      assert.equal(state.ledger.length, 4); assert.equal(state.events.filter(row => row.kind === 'COLLECT').length, 1);
      assert.equal(await cash(userId), 1200n); assert.equal(await cash(house), 800n);
      const before = await snapshot([userId, house]);
      await assert.rejects(() => transaction(client => wallet.creditReservedWin(client, { ...collect, collectionId: randomUUID() })), code('IDEMPOTENCY_PARAMETER_CONFLICT'));
      assert.deepEqual(await snapshot([userId, house]), before);
    });

    await t.test('an old debit started before hold commit waits, then cannot spend the newly held funds', async () => {
      const { userId, house } = await seed(), action = args(userId);
      const holder = await connect(), old = await connect();
      let pending;
      try {
        await begin(holder); await begin(old);
        await acceptIn(holder, action, 1100n);
        const pid = (await old.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
        const oldRound = randomUUID();
        pending = old.query(LEGACY_TRANSFER_SQL, [house, userId, '1', 'nine:' + oldRound + ':WIN', 'win', userId, oldRound, 'qa-existing-game', 'WIN'])
          .then(result => ({ result }), error => ({ error }));
        let blocked = false;
        for (let attempt = 0; attempt < 60; attempt++) {
          const status = (await pool.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1', [pid])).rows[0];
          if (status?.wait_event_type === 'Lock') { blocked = true; break; }
          await delay(25);
        }
        assert.equal(blocked, true, 'The unchanged legacy SQL must actually be waiting before the holder commits.');
        await holder.query('COMMIT');
        const result = await pending;
        assert.ok(pgError('M10_RESERVED_HOUSE_FUNDS')(result.error), result.error?.message ?? 'Legacy debit unexpectedly succeeded.');
        await old.query('ROLLBACK');
      } finally {
        // Releasing the holder first also bounds cleanup if the lock assertion fails.
        try { await holder.query('ROLLBACK'); }
        finally {
          release(holder);
          try { if (pending) await pending; await old.query('ROLLBACK'); }
          finally { release(old); }
        }
      }
      const state = await snapshot([userId, house]);
      assert.equal(await cash(userId), 900n); assert.equal(await cash(house), 1100n);
      assert.equal(state.reservations[0].amount_minor, '1100'); assert.equal(state.transfers.length, 1);
      assert.equal((await pool.query('SELECT 1 FROM sw_nine.wallet_transactions WHERE user_id=$1', [userId])).rowCount, 0);
      await transaction(client => wallet.creditReservedWin(client, { ...action, amountMinor: 1100n, collectionId: randomUUID() }));
      assert.equal(await cash(house), 0n); assert.equal(await cash(userId), 2000n);
    });

    await t.test('a database error after hold release and paired ledger insertion rolls all of them back', async () => {
      const { userId, house } = await seed(), action = args(userId);
      await accept(action, 300n);
      const before = await snapshot([userId, house]);
      await assert.rejects(() => transaction(async client => {
        // NOT VALID preserves prior test rows but rejects this transaction's
        // event only after its hold change and WIN transfer have executed.
        await client.query("ALTER TABLE sw_new_m10.reservation_events ADD CONSTRAINT qa_reject_collect CHECK(kind<>'COLLECT') NOT VALID");
        await wallet.creditReservedWin(client, { ...action, amountMinor: 300n, collectionId: randomUUID() });
      }), code('23514'));
      assert.deepEqual(await snapshot([userId, house]), before);
    });

    await t.test('all player holds share house capacity and both legacy balance seams expose available funds', async () => {
      const first = await seed(), second = await seed({ houseId: first.house });
      const a = args(first.userId), b = args(second.userId);
      await accept(a, 900n);
      const before = await snapshot([first.userId, second.userId, first.house]);
      await assert.rejects(() => accept(b, 400n), code('M10_HOUSE_CAPACITY_UNAVAILABLE'));
      assert.deepEqual(await snapshot([first.userId, second.userId, first.house]), before);
      await accept(b, 300n);
      await transaction(async client => {
        assert.equal(await wallet.houseBalance(client, first.userId), 0n);
        assert.equal(await wallet.reserveBalance(client, first.userId), 900n);
        assert.equal(await wallet.reserveBalance(client, second.userId), 300n);
        const original = await raw.lockWallets(client, first.userId);
        const exposed = await legacyDependencies.lockWallets(client, first.userId);
        assert.equal(original.find(row => row.id === first.house).balance, '1200');
        assert.equal(exposed.find(row => row.id === first.house).balance, '0');
        assert.equal(await legacyDependencies.balance(client, first.house), 0n);
        await assert.rejects(() => legacyDependencies.assertNoActive(client, first.userId), /FINISH_ACTIVE_ROUND/);
      });
    });

    await t.test('disabled or drifted enforcement is rejected before any wallet write', async () => {
      const { userId, house } = await seed(), action = args(userId), before = await snapshot([userId, house]);
      const mutations = [
        'ALTER TABLE sw_rebuild.wallets DISABLE TRIGGER m10_reserved_house_floor',
        'ALTER TABLE sw_new_m10.reservations DISABLE TRIGGER m10_reservation_funding',
        'DROP TRIGGER m10_reserved_house_floor ON sw_rebuild.wallets; CREATE TRIGGER m10_reserved_house_floor AFTER UPDATE OF balance ON sw_rebuild.wallets FOR EACH ROW EXECUTE FUNCTION sw_new_m10.enforce_house_floor(); ALTER TABLE sw_rebuild.wallets ENABLE ALWAYS TRIGGER m10_reserved_house_floor',
        'DROP TRIGGER m10_reserved_house_floor ON sw_rebuild.wallets; CREATE TRIGGER m10_reserved_house_floor BEFORE UPDATE OF id ON sw_rebuild.wallets FOR EACH ROW EXECUTE FUNCTION sw_new_m10.enforce_house_floor(); ALTER TABLE sw_rebuild.wallets ENABLE ALWAYS TRIGGER m10_reserved_house_floor',
        'DROP TRIGGER m10_reservation_funding ON sw_new_m10.reservations; CREATE TRIGGER m10_reservation_funding BEFORE INSERT ON sw_new_m10.reservations FOR EACH ROW EXECUTE FUNCTION sw_new_m10.enforce_reservation_funding(); ALTER TABLE sw_new_m10.reservations ENABLE ALWAYS TRIGGER m10_reservation_funding',
        'DROP TRIGGER m10_reserved_house_floor ON sw_rebuild.wallets; CREATE TRIGGER m10_reserved_house_floor BEFORE UPDATE OF balance ON sw_rebuild.wallets FOR EACH ROW WHEN (NEW.balance>=0) EXECUTE FUNCTION sw_new_m10.enforce_house_floor(); ALTER TABLE sw_rebuild.wallets ENABLE ALWAYS TRIGGER m10_reserved_house_floor',
        'ALTER FUNCTION sw_new_m10.enforce_house_floor() STABLE',
        'ALTER FUNCTION sw_new_m10.enforce_house_floor() SECURITY INVOKER',
        'ALTER FUNCTION sw_new_m10.enforce_house_floor() SET search_path=public',
      ];
      for (const sql of mutations) await transaction(async client => {
        await client.query(sql);
        await assert.rejects(() => wallet.debitStake(client, action), code('M10_ENFORCED_RESERVATION_MIGRATION_REQUIRED'));
      }, { rollback: true });
      assert.deepEqual(await snapshot([userId, house]), before);
      const flags = (await pool.query(SQL.installation)).rows[0];
      assert.equal(flags.wallet_floor, true); assert.equal(flags.reservation_funding, true);
    });

    await t.test('bridge and direct SQL writers reject unsupported transaction isolation', async () => {
      const { userId, house } = await seed(), action = args(userId), before = await snapshot([userId, house]);
      for (const isolation of ['REPEATABLE READ', 'SERIALIZABLE']) {
        await assert.rejects(() => transaction(client => wallet.debitStake(client, action), { isolation }), code('M10_ENFORCED_RESERVATION_MIGRATION_REQUIRED'));
        await assert.rejects(() => transaction(client => client.query('UPDATE sw_rebuild.wallets SET balance=balance-1 WHERE id=$1', [house]), { isolation }), pgError('M10_RESERVATIONS_REQUIRE_READ_COMMITTED'));
        await assert.rejects(() => transaction(client => client.query(SQL.insertReservation, [action.roundId, userId, house, '1']), { isolation }), pgError('M10_RESERVATIONS_REQUIRE_READ_COMMITTED'));
      }
      assert.deepEqual(await snapshot([userId, house]), before);
    });

    await t.test('floor and funding triggers reject NULL balances independently of a host NOT NULL constraint', async () => {
      const { userId, house } = await seed(), before = await snapshot([userId, house]);
      await assert.rejects(() => transaction(async client => {
        await client.query('ALTER TABLE sw_rebuild.wallets ALTER COLUMN balance DROP NOT NULL');
        await client.query('UPDATE sw_rebuild.wallets SET balance=NULL WHERE id=$1', [house]);
      }), pgError('M10_RESERVED_HOUSE_FUNDS'));
      await assert.rejects(() => transaction(async client => {
        await client.query('ALTER TABLE sw_rebuild.wallets ALTER COLUMN balance DROP NOT NULL');
        const nullHouse = 'm10-qa-null-house-' + randomUUID();
        await client.query('INSERT INTO sw_rebuild.wallets(id,balance) VALUES($1,NULL)', [nullHouse]);
        await client.query(SQL.insertReservation, [randomUUID(), userId, nullHouse, '1']);
      }), pgError('M10_HOUSE_WALLET_MISSING'));
      assert.deepEqual(await snapshot([userId, house]), before);
      assert.equal((await pool.query("SELECT attnotnull FROM pg_catalog.pg_attribute WHERE attrelid='sw_rebuild.wallets'::regclass AND attname='balance'")).rows[0].attnotnull, true);
    });

    await t.test('deferred foreign keys reject an orphan round at COMMIT and roll back the earlier BET and hold', async () => {
      const { userId, house } = await seed(), action = args(userId), before = await snapshot([userId, house]);
      await assert.rejects(() => transaction(async client => {
        await wallet.debitStake(client, action);
        await wallet.reserveWin(client, { ...action, amountMinor: 300n });
        // Deliberately omit the required journal parent. Both writes have
        // succeeded before COMMIT evaluates their actual deferred FKs.
        assert.equal((await client.query('SELECT 1 FROM sw_new_m10.reservations WHERE round_id=$1', [action.roundId])).rowCount, 1);
      }), code('23503'));
      assert.deepEqual(await snapshot([userId, house]), before);
    });

    await t.test('reservation identity, deletion and a closed hold remain protected by real triggers', async () => {
      const { userId, house } = await seed(), action = args(userId);
      await accept(action, 300n);
      await assert.rejects(() => transaction(client => client.query('DELETE FROM sw_new_m10.reservations WHERE round_id=$1', [action.roundId])), pgError('M10_RESERVATION_DELETE_FORBIDDEN'));
      await assert.rejects(() => transaction(client => client.query('UPDATE sw_new_m10.reservations SET round_id=$2 WHERE round_id=$1', [action.roundId, randomUUID()])), pgError('M10_RESERVATION_IDENTITY_IMMUTABLE'));
      await transaction(client => wallet.releaseReservedWin(client, { ...action, amountMinor: 300n, actionId: randomUUID() }));
      await assert.rejects(() => transaction(client => client.query('UPDATE sw_new_m10.reservations SET amount_minor=1,closed_reason=NULL WHERE round_id=$1', [action.roundId])), pgError('M10_CLOSED_RESERVATION_IMMUTABLE'));
      assert.equal(await cash(userId), 900n); assert.equal(await cash(house), 1100n);
    });
  } finally {
    // Only this run's successfully created random database is removed.
    // Destroy any checked-out fixture clients before closing the pool, so a
    // failed assertion cannot leave pool.end waiting on an unreleased client.
    for (const client of checkedOut) { client.release(true); checkedOut.delete(client); }
    try { await pool?.end(); }
    finally {
      try {
        if (created) {
          // pool.end() can finish before PostgreSQL has removed every backend
          // whose socket was just closed. A force-drop at that point sends a
          // FATAL to a disconnecting client and creates asynchronous test
          // failures after its assertions have passed. Confirm the server has
          // drained naturally; never terminate a lingering connection here.
          const deadline = Date.now() + 5000;
          for (;;) {
            const status = await admin.query('SELECT count(*)::int AS connections FROM pg_stat_activity WHERE datname=$1', [databaseName]);
            if (status.rows[0].connections === 0) break;
            assert.ok(Date.now() < deadline, 'M10_TEST_DATABASE_CONNECTIONS_NOT_DRAINED: graceful cleanup exceeded five seconds.');
            await delay(25);
          }
          await admin.query('DROP DATABASE "' + databaseName + '"');
        }
      }
      finally { await admin.end(); }
    }
  }
});
