import test from 'node:test';
import assert from 'node:assert/strict';
import { SQL, REQUEST_OWNER_COMPONENT } from './request-owner-guard.mjs';
import { M10, body, request, setup, legacyFactory, token } from './test-support.mjs';

const conflict = fn => assert.rejects(fn, error => error.code === 'IDEMPOTENCY_PARAMETER_CONFLICT' && error.status === 409);

test('reproduced unguarded separate-journal legacy replay charges a new key already owned by M10', async () => {
  const h = setup(), key = token(); await h.m10().spin(request(), body(M10, key));
  await legacyFactory()(h.db)(request(), body('isolated-old-game', key));
  assert.equal(h.db.debits.get('isolated-user'), 2, 'this isolated baseline reproduces the cross-journal defect');
});

test('M10 then legacy with the same token is rejected before any second debit', async () => {
  const h = setup(), key = token(); await h.m10().spin(request(), body(M10, key));
  await conflict(() => h.legacy()(request(), body('isolated-old-game', key)));
  assert.equal(h.db.debits.get('isolated-user'), 1); assert.equal(h.db.rows.length, 1);
});
test('legacy then M10 rejects the same token and preserves the accepted legacy receipt', async () => {
  const h = setup(), key = token(), original = await h.legacy()(request(), body('isolated-old-game', key));
  await conflict(() => h.m10().spin(request(), body(M10, key)));
  assert.equal(h.db.debits.get('isolated-user'), 1); assert.deepEqual(h.db.rows[0].receipt, original);
});
test('concurrent old/new attempts with one key commit exactly one owner and one synthetic debit', async () => {
  const h = setup(), key = token();
  const results = await Promise.allSettled(Array.from({ length: 20 }, (_, n) => n % 2
    ? h.legacy()(request(), body('isolated-old-game', key)) : h.m10().spin(request(), body(M10, key))));
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 10);
  assert.equal(results.filter(row => row.status === 'rejected' && row.reason.code === 'IDEMPOTENCY_PARAMETER_CONFLICT').length, 10);
  assert.equal(h.db.rows.length, 1); assert.equal(h.db.debits.get('isolated-user'), 1);
});
test('matching-owner replay returns the unchanged original adapter receipt without a second debit', async () => {
  const h = setup(), input = body('isolated-old-game'), action = h.legacy();
  const first = await action(request(), input), replay = await action(request(), input);
  assert.deepEqual(replay, first); assert.equal(h.db.debits.get('isolated-user'), 1);
  assert.equal(h.db.rows.length, 1);
});
test('same token with another legacy game or another kind cannot enter a new adapter action', async () => {
  const h = setup(), key = token(); await h.legacy()(request(), body('isolated-old-game', key));
  await conflict(() => h.legacy()(request(), body('other-old-game', key)));
  await conflict(() => h.legacy({ kind: 'GAMBLE' })(request(), body('isolated-old-game', key)));
  await conflict(() => h.legacy({ kind: 'PICK' })(request(), body('isolated-old-game', key)));
  assert.equal(h.db.debits.get('isolated-user'), 1);
});
test('M10 TAKE and X2 action seams use the same key owner as SPIN', async () => {
  const h = setup(), key = token(), api = h.m10(); await api.spin(request(), body(M10, key));
  await conflict(() => api.takeWin(request(), body(M10, key)));
  await conflict(() => api.gamble(request(), body(M10, key)));
  const takeKey = token(); await api.takeWin(request(), body(M10, takeKey));
  await conflict(() => h.legacy({ kind: 'GAMBLE' })(request(), body('isolated-old-game', takeKey)));
  assert.equal(h.db.rows.length, 2);
});
test('callback failure rolls back its journal and debit and permits another owner to use the still-unaccepted key', async () => {
  const h = setup(), key = token();
  await assert.rejects(() => h.legacy({ afterWrite: async () => { throw Error('isolated rollback'); } })(request(), body('isolated-old-game', key)), /isolated rollback/);
  assert.equal(h.db.rows.length, 0); assert.equal(h.db.debits.size, 0);
  await h.m10().spin(request(), body(M10, key)); assert.equal(h.db.rows.length, 1); assert.equal(h.db.debits.get('isolated-user'), 1);
});
test('a callback that returns success without claiming its journal is rolled back', async () => {
  const h = setup();
  await assert.rejects(() => h.legacy({ record: false })(request(), body('isolated-old-game')), error => error.code === 'REQUEST_OWNER_CLAIM_NOT_RECORDED');
  assert.equal(h.db.rows.length, 0); assert.equal(h.db.debits.size, 0); assert.equal(h.db.transactions.at(-1), 'ROLLBACK');
});
test('a historical duplicate owner fails closed without choosing either receipt', async () => {
  const h = setup(), key = token(); await h.m10().spin(request(), body(M10, key));
  h.db.seed({ journal: 'legacy-round', userId: 'isolated-user', key, game_id: 'isolated-old-game', action: 'SPIN', receipt: { testOnly: true } });
  await assert.rejects(() => h.m10().spin(request(), body(M10, key)), error => error.code === 'REQUEST_OWNER_AMBIGUOUS');
  assert.equal(h.db.debits.get('isolated-user'), 1);
});
test('before new-journal installation legacy actions retain their path while M10 fails before mutation', async () => {
  const h = setup({ installed: false }); await h.legacy()(request(), body('isolated-old-game'));
  await assert.rejects(() => h.m10().spin(request(), body(M10)), error => error.code === 'M10_REQUEST_JOURNAL_NOT_INSTALLED');
  assert.equal(h.db.debits.get('isolated-user'), 1);
  assert.equal(h.db.queries.filter(row => row.sql === SQL.newOwners).length, 0);
});
test('legacy non-UUID keys are preserved and never cast as a new-journal UUID', async () => {
  const h = setup(), input = body('isolated-old-game', "old-key-quote-'-$1");
  await h.legacy()(request(), input); await h.legacy()(request(), input);
  assert.equal(h.db.debits.get('isolated-user'), 1);
  assert.equal(h.db.queries.filter(row => row.sql === SQL.newOwners).length, 0);
  assert.ok(h.db.queries.filter(row => row.sql === SQL.legacyOwners).every(row => row.parameters[1] === input.roundToken));
  assert.ok(h.db.queries.every(row => !row.sql.includes(input.roundToken)));
});
test('UUID case variants share the owner lock and cannot cross journals as another wager', async () => {
  const h = setup(), key = '12ab34cd-56ef-4789-8abc-12def3456789';
  await h.legacy()(request(), body('isolated-old-game', key.toUpperCase()));
  await conflict(() => h.m10().spin(request(), body(M10, key)));
  assert.equal(h.db.debits.get('isolated-user'), 1);
  const locks = h.db.queries.filter(row => row.sql === SQL.lock).map(row => row.parameters[0]);
  assert.equal(new Set(locks).size, 1);
});
test('different players may use the same request token without sharing ownership', async () => {
  const h = setup(), key = token();
  await Promise.all([h.legacy()(request('first-test-user'), body('isolated-old-game', key)), h.m10().spin(request('second-test-user'), body(M10, key))]);
  assert.equal(h.db.rows.length, 2); assert.equal(h.db.debits.get('first-test-user'), 1); assert.equal(h.db.debits.get('second-test-user'), 1);
});
test('the seams preserve original dependencies, read-only state and closed component status', async () => {
  const h = setup(), marker = () => 'unchanged'; h.db.move = marker; h.db.profileForGame = marker;
  await h.legacy({ observe: deps => { assert.equal(deps.move, marker); assert.equal(deps.profileForGame, marker); } })(request(), body('isolated-old-game'));
  const before = h.db.queries.length;
  assert.deepEqual(await h.m10().state(request(), M10), { testOnly: true, readOnly: true });
  assert.equal(h.db.queries.length, before); assert.equal(h.m10().handles(M10), true);
  assert.equal(REQUEST_OWNER_COMPONENT.mounted, false); assert.equal(REQUEST_OWNER_COMPONENT.productionEnabled, false);
});
