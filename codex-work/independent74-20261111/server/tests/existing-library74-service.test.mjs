import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import * as math from '../../math/official72.mjs';
import { installExistingLibrary74 } from '../existing-library74-service.mjs';
import { integerRngFromLibrary } from '../existing-library74-adapter.mjs';
import { createRegistry, seededRandom } from './support/retained-library/library-service.mjs';
import { createRetainedLibrary74Fixture } from './support/retained-library-fixture.mjs';

const games = math.listGameDefinitions();
const gameFor = family => games.find(game => game.family === family);
const moneyMinor = cash => BigInt(cash.replace('.', ''));
const rejected = message => error => error.message === message;
const noPrivateState = round => {
  for (const key of ['private', 'mathState', 'seed', 'secret_seed', 'revealed_seed']) assert.equal(round[key], undefined, key);
  if (round.status === 'active') {
    assert.equal(round.mineCells, undefined); assert.equal(round.bustMultiplierBps, undefined);
    if (round.family === 'crash') assert.equal(round.expiresAt, undefined);
  }
};

test('official72 uses the retained SQL financial classes in an isolated PostgreSQL fixture', { timeout: 180000 }, async t => {
  let now = 1794355200000;
  const fixture = await createRetainedLibrary74Fixture({ isolated: true, now: () => now, activeTtlMs: 1000 });
  const { sql, facade, service, shared } = fixture;
  const wallet = async user => BigInt((await sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1', [user]))[0].balance);
  const allMoney = async () => BigInt((await sql.unsafe('SELECT SUM(balance)::text AS value FROM sw_rebuild.wallets'))[0].value);
  const rowFor = async id => (await sql.unsafe('SELECT * FROM sw_native_library.rounds WHERE id=$1', [id]))[0];
  const bodyFor = (game, extra = {}) => ({ request_id: randomUUID(), type: 'start', game_id: game.id, model_version: facade.adapter.definitions[game.id].version, stake: '1.00', options: {}, ...extra });
  const actBody = (round, action, input = {}, extra = {}) => ({ request_id: randomUUID(), type: 'action', game_id: round.game_id, model_version: round.model_version, round_id: round.round_id, expected_version: round.version, action, input, ...extra });
  const footprint = async () => {
    const data = {};
    for (const table of ['sw_rebuild.wallets', 'sw_rebuild.transfers', 'sw_rebuild.ledger', 'sw_rebuild.rounds', 'sw_rebuild.audit', 'sw_rebuild.live_revisions', 'sw_native_library.rounds', 'sw_native_library.requests']) {
      data[table] = (await sql.unsafe(`SELECT row_to_json(t)::text AS value FROM ${table} t`)).map(row => row.value).sort();
    }
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  };
  const safeReveal = async (user, snapshot) => {
    const row = await rowFor(snapshot.round.round_id);
    const mineCells = row.state.mathState.private.mines;
    const cell = Array.from({ length: snapshot.game.cells }, (_, index) => index).find(index => !mineCells.includes(index));
    now += 1;
    return facade.action(user, actBody(snapshot.round, 'reveal', { cell }));
  };
  let forcedRoundSerial = 0;
  const startHeldWin = async (user, stake = '1.00') => {
    const game = games.find(game => game.id === 'ind74_official_multihot100');
    const roundId = '90000000-0000-4000-8000-' + String(++forcedRoundSerial).padStart(12, '0');
    let selectedSeed;
    // Search only fixture entropy to cover a winning branch deterministically.
    // No production account, request or seed is read or selected here.
    for (let attempt = 0; attempt < 4096; attempt++) {
      const candidate = createHash('sha256').update('held-slot-fixture:' + attempt).digest('hex');
      const result = facade.adapter.start(game.id, { stakeMinor: String(moneyMinor(stake)), holdWin: true }, seededRandom(candidate, roundId + ':0'), now);
      if (result.state.status === 'active' && (stake === '1.00' || BigInt(result.state.mathState.pendingWinMinor) > 4000000n)) { selectedSeed = candidate; break; }
    }
    assert.ok(selectedSeed, 'The isolated entropy search should reach a held win.');
    const originalId = service.id, originalSeed = service.seed;
    service.id = () => roundId; service.seed = () => selectedSeed;
    try { return await facade.action(user, bodyFor(game, { stake, options: { holdWin: true } })); }
    finally { service.id = originalId; service.seed = originalSeed; }
  };
  const nextGambleColor = stored => ['red', 'black'][integerRngFromLibrary(seededRandom(stored.secret_seed, stored.id + ':' + (Number(stored.version) + 1)))(2)];
  const startPlinkoColor = async (user, desiredFactor) => {
    const game = games.find(game => game.id === 'ind74_official_plinkoxclassic');
    const roundId = '91000000-0000-4000-8000-' + String(++forcedRoundSerial).padStart(12, '0');
    let selectedSeed;
    for (let attempt = 0; attempt < 20000; attempt++) {
      const candidate = createHash('sha256').update('server-ball-color-fixture:' + attempt).digest('hex');
      const rng = integerRngFromLibrary(seededRandom(candidate, roundId + ':0'));
      for (let row = 0; row < game.rows; row++) rng(2);
      const ticket = rng(1000), factor = ticket < 995 ? 1 : ticket < 999 ? 5 : 10;
      if (factor === desiredFactor) { selectedSeed = candidate; break; }
    }
    assert.ok(selectedSeed, 'The isolated entropy search should reach the server color.');
    const originalId = service.id, originalSeed = service.seed;
    service.id = () => roundId; service.seed = () => selectedSeed;
    try { return await facade.action(user, bodyFor(game)); }
    finally { service.id = originalId; service.seed = originalSeed; }
  };
  const startCascade = async (user, predicate) => {
    const game = games.find(game => game.id === 'ind74_official_popx');
    const roundId = '92000000-0000-4000-8000-' + String(++forcedRoundSerial).padStart(12, '0');
    let selectedSeed;
    for (let attempt = 0; attempt < 20000; attempt++) {
      const candidate = createHash('sha256').update('cascade-fixture:' + attempt).digest('hex');
      const result = facade.adapter.start(game.id, { stakeMinor: '100' }, seededRandom(candidate, roundId + ':0'), now);
      if (result.state.status === 'active' && predicate(result.state.mathState.private.sequence)) { selectedSeed = candidate; break; }
    }
    assert.ok(selectedSeed, 'The isolated entropy search should reach the requested cascade branch.');
    const originalId = service.id, originalSeed = service.seed;
    service.id = () => roundId; service.seed = () => selectedSeed;
    try { return await facade.action(user, bodyFor(game)); }
    finally { service.id = originalId; service.seed = originalSeed; }
  };

  try {
    await t.test('all 72 start and settle with shared wallet, reservations, ledger and canonical history', async t => {
      const user = fixture.fixtureUserId;
      for (const game of games) await t.test(game.catalogName, async () => {
        now += 10;
        const initial = await wallet(user), total = await allMoney();
        const start = bodyFor(game);
        let response = await facade.action(user, start);
        noPrivateState(response.round);
        let stored = await rowFor(response.round.round_id);
        assert.equal(String(stored.total_stake), '100');
        assert.equal(String(stored.liability), math.maximumPayoutMinor({ gameId: game.id, betMinor: '100' }));
        if (response.round.status === 'active') {
          assert.equal(await wallet(user), initial - 100n);
          assert.equal(await wallet(stored.reserve_wallet), BigInt(stored.liability));
          assert.equal((await sql.unsafe('SELECT id FROM sw_rebuild.rounds WHERE id=$1', ['native-library:' + stored.id])).length, 0);
        }
        if (response.round.status === 'active' && game.family === 'mines') response = await safeReveal(user, response);
        if (response.round.status === 'active') response = await facade.action(user, actBody(response.round, 'collect'));
        assert.equal(response.round.status, 'settled');
        noPrivateState(response.round);
        const award = BigInt(response.round.payoutMinor);
        assert.equal(await wallet(user), initial - 100n + award);
        assert.equal(moneyMinor(response.balance), initial - 100n + award);
        assert.equal(await allMoney(), total);
        stored = await rowFor(response.round.round_id);
        assert.equal(await wallet(stored.reserve_wallet), 0n);
        assert.equal(stored.status, 'settled');
        const history = await sql.unsafe('SELECT bet,payout,game FROM sw_rebuild.rounds WHERE id=$1', ['native-library:' + stored.id]);
        assert.equal(history.length, 1); assert.equal(String(history[0].bet), '100');
        assert.equal(String(history[0].payout), String(award)); assert.equal(history[0].game, game.id);
        const stakeTransfers = await sql.unsafe("SELECT amount FROM sw_rebuild.transfers WHERE actor=$1 AND id=$2 AND kind='casino_bet'", [user, `nl:${stored.id}:0:stake`]);
        assert.equal(stakeTransfers.length, 1); assert.equal(String(stakeTransfers[0].amount), '100');
        const historyView = await facade.history(user, game.id);
        assert.equal(historyView.history.length, 1); noPrivateState(historyView.history[0]);
      });
    });

    await t.test('simultaneous retries of one request debit once; altered retry conflicts even after a gate closes', async () => {
      const user = await fixture.addPlayer();
      const game = gameFor('mines'), body = bodyFor(game), initial = await wallet(user);
      const results = await Promise.all(Array.from({ length: 8 }, () => facade.action(user, body)));
      assert.equal(new Set(results.map(result => result.round.round_id)).size, 1);
      assert.equal(results.filter(result => result.replayed).length, 7);
      assert.equal(await wallet(user), initial - 100n);
      assert.equal((await sql.unsafe('SELECT id FROM sw_native_library.rounds WHERE user_id=$1', [user])).length, 1);
      await assert.rejects(facade.action(user, { ...body, stake: '2.00' }), rejected('REQUEST_ID_CONFLICT'));
      const progressed = await safeReveal(user, results[0]);
      const collected = await facade.action(user, actBody(progressed.round, 'collect'));
      service.accepting = false;
      try {
        const replay = await facade.action(user, body);
        assert.equal(replay.replayed, true);
        assert.equal(replay.current_balance, collected.balance);
        assert.equal(replay.accepting, false); assert.equal(replay.game.accepting, false);
        assert.ok(facade.definitions().every(game => !game.accepting && !game.launchable));
        await assert.rejects(facade.action(user, bodyFor(game)), rejected('LIBRARY_NEW_ROUNDS_DISABLED'));
      } finally { service.accepting = true; }
      assert.equal(await wallet(user), moneyMinor(collected.balance));
    });

    await t.test('competing new rounds and stale actions obey one active round and version exclusion', async () => {
      const user = await fixture.addPlayer();
      const game = gameFor('mines'), initial = await wallet(user);
      const raced = await Promise.allSettled([facade.action(user, bodyFor(game)), facade.action(user, bodyFor(game))]);
      const successful = raced.filter(result => result.status === 'fulfilled');
      assert.equal(successful.length, 1);
      assert.match(raced.find(result => result.status === 'rejected').reason.message, /^FINISH_ACTIVE_ROUND:/);
      assert.equal(await wallet(user), initial - 100n);
      const started = successful[0].value;
      const progressed = await safeReveal(user, started);
      await assert.rejects(facade.action(user, actBody(started.round, 'collect')), rejected('ROUND_VERSION_CHANGED'));
      const user2 = await fixture.addPlayer();
      await assert.rejects(facade.action(user2, actBody(progressed.round, 'collect')), rejected('ROUND_NOT_FOUND'));
      const sameCollect = actBody(progressed.round, 'collect');
      const collected = await Promise.all(Array.from({ length: 5 }, () => facade.action(user, sameCollect)));
      assert.equal(collected.filter(result => result.replayed).length, 4);
      assert.equal((await sql.unsafe('SELECT id FROM sw_rebuild.transfers WHERE id=$1', [`nl:${started.round.round_id}:payout`])).length, 1);
    });

    await t.test('foreign native and JetX active rounds prevent new independent stakes', async () => {
      const user = await fixture.addPlayer();
      await sql.unsafe('INSERT INTO sw_jetx_native.bets(id,user_id,status) VALUES($1,$2,$3)', [randomUUID(), user, 'active']);
      const before = await footprint();
      await assert.rejects(facade.action(user, bodyFor(gameFor('slots'))), rejected('FINISH_ACTIVE_ROUND:jetx_native'));
      assert.equal(await footprint(), before);
      assert.equal((await facade.state(user, games[0].id)).other_active_game, 'jetx_native');
      await sql.unsafe('DELETE FROM sw_jetx_native.bets WHERE user_id=$1', [user]);
      // This disposable fixture row represents an obligation from the retained
      // family schema; its evaluator and finances are not replaced by the bridge.
      await sql.unsafe('INSERT INTO sw_native_family.rounds(id,user_id,game_id,game_config,state,secret_seed,commitment,reserve_wallet,liability,status,version,expires_at) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,100,$9,0,$10)', [randomUUID(), user, 'retained_fixture_game', '{}', '{}', '1'.repeat(64), '2'.repeat(64), user, 'active', now + 5000]);
      const nativeBefore = await footprint();
      await assert.rejects(facade.action(user, bodyFor(gameFor('slots'))), rejected('FINISH_ACTIVE_ROUND:retained_fixture_game'));
      assert.equal(await footprint(), nativeBefore);
      await sql.unsafe('DELETE FROM sw_native_family.rounds WHERE user_id=$1', [user]);
    });

    await t.test('the exact retained cross-active guard blocks reverse starts while preserving old native receipts', async () => {
      const user = await fixture.addPlayer(), mine = gameFor('mines');
      const retainedGame = Object.values(fixture.legacyNativeDefinitions).find(game => game.family === 'slots');
      const oldRequest = { request_id: randomUUID(), type: 'start', game_id: retainedGame.id, stake: '1.00', options: {} };
      const total = await allMoney();
      const original = await shared.perform(user, oldRequest);
      assert.equal(original.status, 'SUCCESS');
      const started = await facade.action(user, bodyFor(mine));
      assert.equal(started.round.status, 'active');
      const before = await footprint();
      await assert.rejects(shared.perform(user, { ...oldRequest, request_id: randomUUID() }), rejected('FINISH_ACTIVE_ROUND:' + mine.id));
      assert.equal(await footprint(), before);
      const replay = await shared.perform(user, oldRequest);
      assert.equal(replay.replayed, true); assert.equal(replay.round.round_id, original.round.round_id);
      assert.equal(moneyMinor(replay.current_balance), await wallet(user));
      assert.equal((await rowFor(started.round.round_id)).status, 'active');
      now += 1001;
      await facade.state(user, mine.id);
      assert.equal((await shared.perform(user, { ...oldRequest, request_id: randomUUID() })).status, 'SUCCESS');
      assert.equal(await allMoney(), total);
    });

    await t.test('insufficient player funds, liability capacity and account caps leave no partial ledger writes', async () => {
      const game = gameFor('slots');
      const poor = await fixture.addPlayer(undefined, '50');
      let before = await footprint();
      await assert.rejects(facade.action(poor, bodyFor(game)), rejected('INSUFFICIENT_FUNDS'));
      assert.equal(await footprint(), before);
      const limited = await fixture.addPlayer();
      await sql.unsafe('INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES($1,$2)', [limited, String(await wallet(limited))]);
      before = await footprint();
      await assert.rejects(facade.action(limited, bodyFor(game)), rejected('POTENTIAL_PAYOUT_EXCEEDS_ACCOUNT_LIMIT'));
      assert.equal(await footprint(), before);
      const user = await fixture.addPlayer(), house = await wallet('house');
      await sql.unsafe('UPDATE sw_rebuild.wallets SET balance=0 WHERE id=$1', ['house']);
      try {
        before = await footprint();
        await assert.rejects(facade.action(user, bodyFor(game)), rejected('BANKROLL_CAPACITY_UNAVAILABLE'));
        assert.equal(await footprint(), before);
      } finally { await sql.unsafe('UPDATE sw_rebuild.wallets SET balance=$1 WHERE id=$2', [String(house), 'house']); }
    });

    await t.test('the retained wallet path accepts configured amounts above 40000 ETB and rejects excess atomically', async () => {
      const user = await fixture.addPlayer(), game = gameFor('slots');
      const original = await footprint();
      for (const stake of ['0.99', '50000.01', '50001.00']) {
        await assert.rejects(facade.action(user, bodyFor(game, { stake })), rejected('INVALID_BET'));
        assert.equal(await footprint(), original);
      }
      for (const stake of ['1.00', '40001.00']) {
        now += 1;
        const before = await wallet(user), total = await allMoney(), request = bodyFor(game, { stake });
        const result = await facade.action(user, request);
        const amount = moneyMinor(stake), award = BigInt(result.round.payoutMinor);
        assert.equal(result.round.stakeMinor, String(amount));
        assert.equal(result.game.minStake, '1.00'); assert.equal(result.game.maxStake, '50000.00');
        assert.equal(result.game.limits.maxBetMinor, '5000000');
        assert.equal(await wallet(user), before - amount + award); assert.equal(await allMoney(), total);
        const row = await rowFor(result.round.round_id);
        assert.equal(String(row.total_stake), String(amount)); assert.equal(await wallet(row.reserve_wallet), 0n);
        assert.equal((await facade.action(user, request)).replayed, true);
        await assert.rejects(facade.action(user, { ...request, stake: '4000.01' }), rejected('REQUEST_ID_CONFLICT'));
      }
      assert.equal((await sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'", [user])).length, 2);
    });

    await t.test('funded held award above 40000 ETB settles exactly once with integer ledger conservation', async () => {
      const user = await fixture.addPlayer(), before = await wallet(user), total = await allMoney();
      const started = await startHeldWin(user, '40001.00');
      const row = await rowFor(started.round.round_id);
      assert(BigInt(started.round.pendingWinMinor) > 4000000n);
      assert.equal(await wallet(row.reserve_wallet), BigInt(row.liability));
      const request = actBody(started.round, 'collect');
      const result = await facade.action(user, request), award = BigInt(result.round.payoutMinor);
      assert(award > 4000000n);
      assert.equal(await wallet(user), before - 4000100n + award);
      assert.equal(await allMoney(), total); assert.equal(await wallet(row.reserve_wallet), 0n);
      assert.equal((await facade.action(user, request)).replayed, true);
      assert.equal(await wallet(user), before - 4000100n + award);
      assert.equal((await sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_win'", [user])).length, 1);
    });

    await t.test('a database failure after reserve moves rolls back; the same request may safely retry', async () => {
      const user = await fixture.addPlayer(), game = gameFor('mines'), body = bodyFor(game);
      const before = await footprint();
      fixture.setQueryFault(query => { if (query.startsWith('INSERT INTO sw_native_library.rounds')) throw new Error('INJECTED_AFTER_RESERVE_FAILURE'); });
      try { await assert.rejects(facade.action(user, body), /INJECTED_AFTER_RESERVE_FAILURE/); }
      finally { fixture.setQueryFault(undefined); }
      assert.equal(await footprint(), before);
      const accepted = await facade.action(user, body);
      assert.equal(accepted.round.status, 'active');
      assert.equal((await sql.unsafe('SELECT request_id FROM sw_native_library.requests WHERE user_id=$1', [user])).length, 1);
      now += 1001;
      assert.equal((await facade.state(user, game.id)).round.settlementReason, 'EXPIRED_UNPLAYED_STAKE_RETURN');
    });

    await t.test('timed mine refund is an exactly-once real settlement and survives payout failure', async () => {
      const user = await fixture.addPlayer(), game = gameFor('mines'), initial = await wallet(user);
      const started = await facade.action(user, bodyFor(game));
      const stored = await rowFor(started.round.round_id), before = await footprint();
      now += 1001;
      fixture.setQueryFault(query => { if (query.startsWith('INSERT INTO sw_rebuild.rounds')) throw new Error('INJECTED_AFTER_PAYOUT_FAILURE'); });
      try { await assert.rejects(facade.state(user, game.id), /INJECTED_AFTER_PAYOUT_FAILURE/); }
      finally { fixture.setQueryFault(undefined); }
      assert.equal(await footprint(), before);
      assert.equal(await wallet(stored.reserve_wallet), BigInt(stored.liability));
      const settled = await Promise.all(Array.from({ length: 5 }, () => facade.state(user, game.id)));
      for (const result of settled) {
        assert.equal(result.round.status, 'settled'); assert.equal(result.round.payoutMinor, '100');
        assert.equal(result.round.settlementReason, 'EXPIRED_UNPLAYED_STAKE_RETURN');
        assert.equal(moneyMinor(result.balance), initial);
      }
      assert.equal(await wallet(stored.reserve_wallet), 0n);
      assert.equal((await sql.unsafe('SELECT id FROM sw_rebuild.rounds WHERE id=$1', ['native-library:' + stored.id])).length, 1);
    });

    await t.test('accepted earned payouts recover after blocking, a lower cap and release shutdown', async () => {
      const user = await fixture.addPlayer(), game = gameFor('mines'), initial = await wallet(user);
      const started = await facade.action(user, bodyFor(game));
      const progressed = await safeReveal(user, started);
      const earned = BigInt(progressed.round.collectibleMinor);
      await sql.unsafe('UPDATE sw_rebuild.users SET status=$1 WHERE id=$2', ['blocked', user]);
      await sql.unsafe('INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES($1,1)', [user]);
      service.accepting = false;
      try {
        await assert.rejects(facade.action(user, actBody(progressed.round, 'collect')), rejected('ACCOUNT_BLOCKED'));
        now += 1001;
        const recovered = await service.reconcile(100);
        assert.ok(recovered.settled >= 1);
        assert.equal(await wallet(user), initial - 100n + earned);
        assert.equal((await rowFor(started.round.round_id)).state.settlementReason, 'EXPIRED_EARNED_AWARD');
        assert.equal((await service.reconcile(100)).settled, 0);
      } finally { service.accepting = true; }
    });

    await t.test('authoritative crash expiry settles the stored terminal outcome without revealing its deadline', async () => {
      const user = await fixture.addPlayer(), game = gameFor('crash');
      let started;
      for (let attempt = 0; attempt < 32; attempt++) {
        now += 1;
        started = await facade.action(user, bodyFor(game));
        if (started.round.status === 'active') break;
      }
      assert.equal(started.round.status, 'active'); noPrivateState(started.round);
      const stored = await rowFor(started.round.round_id), initial = await wallet(user);
      assert.equal((await facade.state(user, game.id)).round.expiresAt, undefined);
      now = Number(stored.expires_at);
      const expected = math.reconcileRound(stored.state.mathState, now);
      const result = await facade.state(user, game.id);
      assert.equal(result.round.status, 'settled');
      assert.equal(result.round.resultStatus, expected.status);
      assert.equal(result.round.payoutMinor, expected.winMinor);
      assert.equal(await wallet(user), initial + BigInt(expected.winMinor));
      assert.equal(await wallet(stored.reserve_wallet), 0n);
    });

    await t.test('PopX publishes confirmed cascades, keeps its reserve and collects without another stake', async () => {
      const user = await fixture.addPlayer(), initial = await wallet(user), total = await allMoney();
      const started = await startCascade(user, sequence => sequence.length >= 3);
      const row = await rowFor(started.round.round_id);
      assert.equal(started.round.outcome.grid.length, 5); assert.equal(started.round.outcome.grid[0].length, 6);
      assert.equal(started.round.cascadeIndex, 0); assert.equal(started.round.multiplierBps, 11500);
      assert.equal(await wallet(row.reserve_wallet), 10000n); noPrivateState(started.round);
      now += 1500;
      const observed = await facade.state(user, started.round.game_id);
      assert.equal(observed.round.cascadeIndex, 1); assert.equal(observed.round.multiplierBps, 14000);
      assert.deepEqual(observed.round.outcome.grid, row.state.mathState.private.sequence[1].grid);
      assert.doesNotMatch(JSON.stringify(observed.round), /"(?:sequence|terminalAt|private|expiresAt)"/);
      const synchronized = await facade.action(user, actBody(observed.round, 'sync'));
      assert.equal(synchronized.round.version, 1); assert.equal(await wallet(user), initial - 100n);
      const collected = await facade.action(user, actBody(synchronized.round, 'collect'));
      assert.equal(collected.round.payoutMinor, '140'); assert.equal(await wallet(user), initial + 40n);
      assert.equal(await wallet(row.reserve_wallet), 0n); assert.equal(await allMoney(), total);
      assert.equal((await sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'", [user])).length, 1);
    });

    await t.test('PopX terminal loss and its independent cap reconcile to exact balanced settlements', async () => {
      const user = await fixture.addPlayer();
      for (const capped of [false, true]) {
        const initial = await wallet(user), total = await allMoney();
        const started = await startCascade(user, sequence => (sequence.at(-1).result === 'cap') === capped);
        const row = await rowFor(started.round.round_id);
        now = Number(row.expires_at);
        const settled = await facade.state(user, started.round.game_id);
        const expected = capped ? 10000n : 0n;
        assert.equal(settled.round.status, 'settled'); assert.equal(settled.round.payoutMinor, String(expected));
        assert.equal(settled.round.outcome.result, capped ? 'cap' : 'crash');
        assert.equal(await wallet(user), initial - 100n + expected);
        assert.equal(await wallet(row.reserve_wallet), 0n); assert.equal(await allMoney(), total);
        assert.equal((await facade.state(user, started.round.game_id)).balance, settled.balance);
        assert.equal((await sql.unsafe('SELECT id FROM sw_rebuild.rounds WHERE id=$1', ['native-library:' + row.id])).length, 1);
      }
    });

    await t.test('held slot wins remain reserved; repeated gamble delivery adds no stake and one collection', async () => {
      const user = await fixture.addPlayer(), initial = await wallet(user), total = await allMoney();
      const started = await startHeldWin(user), roundId = started.round.round_id;
      noPrivateState(started.round);
      assert.equal(started.round.status, 'active'); assert.ok(started.round.outcome.grid);
      const pending = BigInt(started.round.pendingWinMinor), row = await rowFor(roundId);
      assert.equal(await wallet(user), initial - 100n);
      assert.equal(await wallet(row.reserve_wallet), BigInt(row.liability));
      const body = actBody(started.round, 'gamble', { color: nextGambleColor(row) });
      const results = await Promise.all(Array.from({ length: 6 }, () => facade.action(user, body)));
      assert.equal(results.filter(result => result.replayed).length, 5);
      const progressed = results[0];
      assert.equal(progressed.round.status, 'active'); assert.equal(progressed.round.gambleRounds, 1);
      assert.equal(progressed.round.pendingWinMinor, String(pending * 2n));
      assert.equal(progressed.round.gambleHistory.length, 1); noPrivateState(progressed.round);
      assert.equal(await wallet(user), initial - 100n);
      assert.equal(await wallet(row.reserve_wallet), BigInt(row.liability));
      const collected = await facade.action(user, actBody(progressed.round, 'collect'));
      assert.equal(collected.round.status, 'settled'); assert.equal(collected.round.payoutMinor, String(pending * 2n));
      assert.equal(await wallet(user), initial - 100n + pending * 2n);
      assert.equal(await wallet(row.reserve_wallet), 0n); assert.equal(await allMoney(), total);
      assert.equal((await sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'", [user])).length, 1);
      assert.equal((await sql.unsafe('SELECT id FROM sw_rebuild.transfers WHERE id=$1', [`nl:${roundId}:payout`])).length, 1);
    });

    await t.test('a lost gamble releases its reserve; an abandoned held award pays out on expiry', async () => {
      const user = await fixture.addPlayer(), initial = await wallet(user);
      let started = await startHeldWin(user), row = await rowFor(started.round.round_id);
      const wrong = nextGambleColor(row) === 'red' ? 'black' : 'red';
      const lost = await facade.action(user, actBody(started.round, 'gamble', { color: wrong }));
      assert.equal(lost.round.status, 'settled'); assert.equal(lost.round.payoutMinor, '0');
      assert.equal(await wallet(user), initial - 100n); assert.equal(await wallet(row.reserve_wallet), 0n);
      started = await startHeldWin(user); row = await rowFor(started.round.round_id);
      const pending = BigInt(started.round.pendingWinMinor);
      now += 1001;
      const expired = await facade.state(user, started.round.game_id);
      assert.equal(expired.round.round_id, started.round.round_id);
      assert.equal(expired.round.status, 'settled'); assert.equal(expired.round.payoutMinor, String(pending));
      assert.equal(expired.round.settlementReason, 'EXPIRED_EARNED_AWARD');
      assert.equal(await wallet(user), initial - 200n + pending); assert.equal(await wallet(row.reserve_wallet), 0n);
    });

    await t.test('Plinko server-selected colors preserve one stake debit and reserve the full 10000× award', async () => {
      const user = await fixture.addPlayer(), game = games.find(game => game.id === 'ind74_official_plinkoxclassic');
      for (const factor of [1, 5, 10]) {
        now += 1;
        const initial = await wallet(user), total = await allMoney();
        const result = await startPlinkoColor(user, factor);
        const expectedAward = 100n * BigInt(result.round.outcome.bucketMultiplierBps) * BigInt(factor) / 10000n;
        assert.equal(result.round.stakeMinor, '100'); assert.equal(result.round.totalBetMinor, '100');
        assert.equal(result.round.baseBetMinor, '100'); assert.equal(result.round.ballMultiplier, factor);
        assert.equal(result.round.payoutMinor, String(expectedAward));
        assert.equal(await wallet(user), initial - 100n + expectedAward); assert.equal(await allMoney(), total);
        const row = await rowFor(result.round.round_id);
        assert.equal(String(row.liability), '1000000');
        const debits = await sql.unsafe('SELECT amount FROM sw_rebuild.transfers WHERE id=$1', [`nl:${row.id}:0:stake`]);
        assert.equal(debits.length, 1); assert.equal(String(debits[0].amount), '100');
      }
      const before = await footprint();
      await assert.rejects(facade.action(user, bodyFor(game, { options: { ballMultiplier: 5 } })), rejected('INVALID_OPTIONS'));
      await assert.rejects(facade.action(user, bodyFor(game, { options: { ballType: 'fire' } })), rejected('INVALID_OPTIONS'));
      assert.equal(await footprint(), before);
    });

    await t.test('unreviewed starts and client-authored money are rejected without side effects', async () => {
      const user = await fixture.addPlayer(), game = gameFor('slots');
      for (const body of [bodyFor(game, { payoutMinor: '999999' }), bodyFor(game, { stake: 1 }), bodyFor(game, { options: { stakeMinor: '100' } }), bodyFor(game, { options: { rng: 0 } })]) {
        const before = await footprint();
        await assert.rejects(facade.action(user, body), /INVALID_(LIBRARY_REQUEST|STAKE|LIBRARY_OPTIONS|OPTIONS)/);
        assert.equal(await footprint(), before);
      }
      for (const untrusted of ['', '@system', '@session:' + 'a'.repeat(64), null]) await assert.rejects(facade.state(untrusted, game.id), rejected('RESOLVED_PLAYER_ID_REQUIRED'));
      await assert.rejects(facade.state('fixture-agent', game.id), rejected('PLAYER_REQUIRED'));
      await assert.rejects(facade.history(user, game.id, { limit: 51 }), rejected('INVALID_HISTORY_LIMIT'));
    });

    await t.test('every actual transfer has two balanced ledger legs and zero residual settled reserve', async () => {
      const unbalanced = await sql.unsafe('SELECT transfer_id,COUNT(*) AS legs,SUM(delta)::text AS delta FROM sw_rebuild.ledger GROUP BY transfer_id HAVING COUNT(*)<>2 OR SUM(delta)<>0');
      assert.deepEqual(unbalanced, []);
      const missingLegs = await sql.unsafe('SELECT t.id FROM sw_rebuild.transfers t LEFT JOIN sw_rebuild.ledger l ON l.transfer_id=t.id WHERE l.id IS NULL');
      assert.deepEqual(missingLegs, []);
      const residual = await sql.unsafe("SELECT r.id,w.balance FROM sw_native_library.rounds r JOIN sw_rebuild.wallets w ON w.id=r.reserve_wallet WHERE r.status='settled' AND w.balance<>0");
      assert.deepEqual(residual, []);
      const negative = await sql.unsafe('SELECT id FROM sw_rebuild.wallets WHERE balance<0'); assert.deepEqual(negative, []);
      const immutable = await sql.unsafe("SELECT r.id FROM sw_native_library.rounds r LEFT JOIN sw_rebuild.rounds h ON h.id='native-library:'||r.id::text WHERE r.status='settled' AND (h.id IS NULL OR h.bet<>r.total_stake OR h.payout<>(r.state->>'payoutMinor')::bigint)");
      assert.deepEqual(immutable, []);
      assert.ok((await sql.unsafe('SELECT revision FROM sw_rebuild.live_revisions WHERE user_id=$1', ['fixture-agent']))[0].revision > 72);
    });
  } finally { await fixture.close(); }
});

test('installing the new catalog preserves an accepted round and its original evaluator', async () => {
  let now = 1794355200000;
  const fixture = await createRetainedLibrary74Fixture({ isolated: true, now: () => now });
  try {
    const gameId = gameFor('mines').id;
    const legacy = {
      definitions: { [gameId]: { version: 'previous-reviewed-fixture-v0', name: 'Previous fixture model' }, protected_fixture: { version: 'protected-fixture-v1' } },
      start(id, options, _rng, at) { return { state: { gameId: id, status: 'active', stakeMinor: options.stakeMinor, expiresAt: at + 1000 }, debitMinor: options.stakeMinor, maxPayoutMinor: '200', payoutMinor: null }; },
      act(state, _input, _rng, at) { return { state: { ...state, status: 'settled', payoutMinor: '150', expiresAt: at }, debitMinor: '0', maxPayoutMinor: '200', payoutMinor: '150' }; },
      expire(state, rng, at) { return this.act(state, {}, rng, at); },
      publicState(state) { return { retainedEvaluator: true, status: state.status, payoutMinor: state.payoutMinor }; },
    };
    fixture.service.registry = createRegistry([legacy]);
    const started = await fixture.service.action(fixture.fixtureUserId, { request_id: randomUUID(), type: 'start', game_id: gameId, model_version: 'previous-reviewed-fixture-v0', stake: '1.00', options: {} });
    const oldModel = fixture.service.registry.get(gameId, 'previous-reviewed-fixture-v0');
    const facade = installExistingLibrary74({ service: fixture.service });
    assert.equal(facade.registry.get(gameId, 'previous-reviewed-fixture-v0'), oldModel);
    assert.equal(facade.registry.get('protected_fixture', 'protected-fixture-v1').adapter, legacy);
    const snapshot = await facade.state(fixture.fixtureUserId, gameId);
    assert.equal(snapshot.round.model_version, 'previous-reviewed-fixture-v0');
    assert.equal(snapshot.round.retainedEvaluator, true); assert.equal(snapshot.accepting, false);
    now += 10;
    const response = await facade.action(fixture.fixtureUserId, { request_id: randomUUID(), type: 'action', game_id: gameId, model_version: started.round.model_version, round_id: started.round.round_id, expected_version: 0, action: 'collect', input: {} });
    assert.equal(response.round.payoutMinor, '150'); assert.equal(response.round.retainedEvaluator, true);
    assert.equal(response.balance, '100000000.50');
    await assert.rejects(facade.action(fixture.fixtureUserId, { request_id: randomUUID(), type: 'start', game_id: gameId, model_version: facade.adapter.definitions[gameId].version, stake: '1.00', options: {} }), rejected('INDEPENDENT74_NEW_ROUNDS_DISABLED'));
  } finally { await fixture.close(); }
});
