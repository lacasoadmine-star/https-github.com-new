import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, TOKEN } from './test-support.mjs';
import { createSuperWildsPostgresService, SQL } from './postgres.mjs';
const WALLET_METHODS = ['lockWallets', 'assertReady', 'playerBalance', 'houseBalance', 'reservedBalance',
  'debitStake', 'reserveWin', 'creditReservedWin', 'assertNoActiveRound', 'claimActiveRound',
  'releaseActiveRound', 'assertPlayerCapacity', 'activeRound'];
function pgFixture() {
  const f = fixture(), calls = [], clients = new Set(), controls = { rejectInsert: false, corruptToken: false };
  let current = null;
  const row = r => r ? { user_id: r.userId, game_id: r.gameId, round_id: r.roundId,
    request_key: controls.corruptToken ? 'different' : r.requestKey.toLowerCase(), receipt: r.receipt } : null;
  const transaction = operation => f.dependencies.transaction(async tx => {
    const client = { query: async (sql, p) => {
      assert.equal(client, current, 'every journal query uses the one currently locked host client');
      calls.push({ sql, params: p });
      const result = value => ({ rowCount: value ? 1 : 0, rows: value ? [value] : [] });
      if (sql === SQL.request) return result(await tx.findRequest(...p));
      if (sql === SQL.round) return result(row(await tx.findRound(...p)));
      if (sql === SQL.latest) return result(row(await tx.latestRound(p[0])));
      if (sql === SQL.collection) { const value = await tx.findCollection(...p); return result(value ? { receipt: value } : null); }
      if (controls.rejectInsert) return { rowCount: 0, rows: [] };
      if (sql === SQL.insertRequest) await tx.insertRequest(p[0], p[1], p[2], p[3], JSON.parse(p[4]));
      else if (sql === SQL.insertRound) await tx.insertRound({ userId: p[1], gameId: p[2], roundId: p[0], requestKey: p[3],
        bet: JSON.parse(p[6]).bet, winAmount: JSON.parse(p[6]).winAmount, receipt: JSON.parse(p[6]) });
      else if (sql === SQL.insertCollection) await tx.insertCollection(p[2], p[0], JSON.parse(p[4]));
      else throw Error('UNEXPECTED_SQL');
      return { rowCount: 1, rows: [] };
    }, tx };
    current = client; clients.add(client);
    try { return await operation(client); } finally { current = null; }
  });
  const checked = (client, method, args) => { assert.equal(client, current); return client.tx[method](...args); };
  const dependencies = { ...f.dependencies, transaction,
    authenticate: (request, client) => client ? checked(client, 'authenticate', [request]) : f.dependencies.authenticate(request),
    wallet: Object.fromEntries(WALLET_METHODS.map(method => [method, (client, ...args) => checked(client, method, args)])),
    withRequestOwner: (client, identity, operation) => checked(client, 'withRequestOwner', [identity, operation]),
    registerRound: (client, round) => checked(client, 'registerRound', [round]),
  };
  return { ...f, service: createSuperWildsPostgresService(dependencies), dependencies, calls, controls, clients };
}
test('PostgreSQL seam keeps wallet, journal, ownership and shared ordering on the same existing client', async () => {
  const f = pgFixture(), r = await f.service.spin(f.request(), f.action());
  await f.service.takeWin(f.request(), f.take(r)); const state = await f.service.state(f.request());
  assert.equal(state.balance, '102.00'); assert.equal(f.snapshot().ledger.length, 2); assert.equal(f.clients.size, 3);
  assert.ok(f.calls.some(c => c.sql === SQL.insertRound)); assert.ok(f.calls.some(c => c.sql === SQL.insertCollection));
  for (const call of f.calls) assert.ok(Object.values(SQL).includes(call.sql));
});
test('UUID database canonicalization preserves the exact original token in state and collection', async () => {
  const f = pgFixture(), r = await f.service.spin(f.request(), f.action(TOKEN.toUpperCase()));
  const state = await f.service.state(f.request()); assert.equal(state.round.result.requestKey, TOKEN.toUpperCase());
  const replay = await f.service.spin(f.request(), f.action(TOKEN, { replayOnly: true })); assert.deepEqual(replay, r);
  await f.service.takeWin(f.request(), f.take(r)); assert.equal(f.snapshot().ledger.length, 2);
});
test('a partial journal insert aborts the entire existing wallet transaction', async () => {
  const f = pgFixture(), before = f.snapshot(); f.controls.rejectInsert = true;
  await assert.rejects(f.service.spin(f.request(), f.action()), e => e.code === 'SUPERWILDS_JOURNAL_WRITE_INCOMPLETE');
  assert.deepEqual(f.snapshot(), before);
});
test('inconsistent stored UUID and accepted wire identity fails before collection', async () => {
  const f = pgFixture(), r = await f.service.spin(f.request(), f.action()), before = f.snapshot();
  f.controls.corruptToken = true;
  await assert.rejects(f.service.takeWin(f.request(), f.take(r)), e => e.code === 'SUPERWILDS_STORED_REQUEST_IDENTITY_INVALID');
  assert.deepEqual(f.snapshot(), before);
});
test('seam construction cannot silently omit the protected house or cross-adapter ownership hook', () => {
  const f = pgFixture(), missingOwner = { ...f.dependencies, withRequestOwner: undefined };
  assert.throws(() => createSuperWildsPostgresService(missingOwner), /SUPERWILDS_EXISTING_HOST_REQUIRED_withRequestOwner/);
  assert.throws(() => createSuperWildsPostgresService({ ...f.dependencies, wallet: { ...f.dependencies.wallet, assertReady: undefined } }),
    /SUPERWILDS_EXISTING_WALLET_REQUIRED_assertReady/);
});
