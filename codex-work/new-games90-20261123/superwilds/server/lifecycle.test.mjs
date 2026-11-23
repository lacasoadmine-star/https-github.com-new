import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, TOKEN } from './test-support.mjs';
import { createSuperWildsLifecycle, GAME_ID } from './lifecycle.mjs';
const rejects = (operation, code) => assert.rejects(operation, e => e.code === code);
const committedMoney = f => {
  const s = f.snapshot(); return { player: s.player, house: s.house, reserved: s.reserved,
    ledger: s.ledger, active: s.active, rounds: s.rounds.size, requests: s.requests.size, collections: s.collections.size, orders: s.order.length };
};

test('SPIN debits the existing wallet before server sampling and reserves the accepted win', async () => {
  const f = fixture(), r = await f.service.spin(f.request(), f.action());
  assert.equal(f.controls.sampledAfterDebit, 9900n);
  assert.equal(r.winAmount, '3.00'); assert.equal(r.collectionStatus, 'PENDING');
  assert.equal(r.walletReceipt.balanceAfter, '99.00'); assert.equal(r.walletReceipt.creditedWin, '0.00');
  const s = f.snapshot(); assert.equal(s.reserved, 300n); assert.equal(s.player, 9900n);
  assert.equal(s.ledger.length, 1); assert.equal(s.ledger[0].debit + s.ledger[0].credit, 0n);
  assert.equal(s.order.length, 1); assert.equal(s.active.roundId, r.roundId);
});
test('twenty concurrent retries return one immutable accepted receipt and one BET', async () => {
  const f = fixture(), results = await Promise.all(Array.from({ length: 20 }, () => f.service.spin(f.request(), f.action())));
  for (const result of results) assert.deepEqual(result, results[0]);
  assert.equal(f.snapshot().ledger.length, 1); assert.equal(f.snapshot().rounds.size, 1); assert.equal(f.controls.sampled, 1);
  assert.ok(Object.isFrozen(results[0].grid));
});
test('canonical UUID spelling replays the exact originally accepted wire token', async () => {
  const f = fixture(), original = await f.service.spin(f.request(), f.action(TOKEN.toUpperCase()));
  const replay = await f.service.spin(f.request(), f.action(TOKEN, { replayOnly: true }));
  assert.deepEqual(replay, original); assert.equal(replay.requestKey, TOKEN.toUpperCase()); assert.equal(f.controls.sampled, 1);
});
test('a lost accepted reply recovers after model and new-wager release withdrawal', async () => {
  const f = fixture(), accepted = await f.service.spin(f.request(), f.action());
  f.controls.release = false; f.controls.modelAvailable = false;
  assert.deepEqual(await f.service.spin(f.request(), f.action(TOKEN, { replayOnly: true })), accepted);
  assert.equal(f.controls.sampled, 1);
});
test('replayOnly with an absent request never creates a first wager', async () => {
  const f = fixture(), before = committedMoney(f);
  await rejects(f.service.spin(f.request(), f.action(TOKEN, { replayOnly: true })), 'ROUND_NOT_FOUND_FOR_REPLAY');
  assert.deepEqual(committedMoney(f), before); assert.equal(f.controls.sampled, 0);
});
test('same token with changed stake or action cannot charge or collect', async () => {
  const f = fixture(), r = await f.service.spin(f.request(), f.action()), before = committedMoney(f);
  await rejects(f.service.spin(f.request(), f.action(TOKEN, { bet: '2.00' })), 'IDEMPOTENCY_PARAMETER_CONFLICT');
  await rejects(f.service.takeWin(f.request(), f.take(r, TOKEN)), 'IDEMPOTENCY_PARAMETER_CONFLICT');
  assert.deepEqual(committedMoney(f), before);
});
test('a token owned by an older game cannot enter the new ledger', async () => {
  const f = fixture(); f.mutate(s => s.owners.set('fixture-player:' + TOKEN, { gameId: 'older-game', kind: 'SPIN' }));
  await rejects(f.service.spin(f.request(), f.action()), 'IDEMPOTENCY_PARAMETER_CONFLICT');
  assert.equal(f.snapshot().ledger.length, 0);
});
test('TAKE WIN with repeated and different tokens credits one accepted win once', async () => {
  const f = fixture(), r = await f.service.spin(f.request(), f.action());
  const a = f.take(r), first = await f.service.takeWin(f.request(), a);
  assert.deepEqual(await f.service.takeWin(f.request(), a), first);
  const other = await f.service.takeWin(f.request(), f.take(r));
  assert.deepEqual(other.collection, first.collection);
  const s = f.snapshot(); assert.equal(s.player, 10200n); assert.equal(s.reserved, 0n); assert.equal(s.active, null);
  assert.equal(s.ledger.filter(e => e.kind === 'WIN').length, 1); assert.equal(s.collections.size, 1);
});
test('twenty concurrent TAKE WIN actions with distinct tokens still credit once', async () => {
  const f = fixture(), r = await f.service.spin(f.request(), f.action());
  const collected = await Promise.all(Array.from({ length: 20 }, () => f.service.takeWin(f.request(), f.take(r))));
  assert.equal(new Set(collected.map(v => v.collection.collectionId)).size, 1);
  assert.equal(f.snapshot().ledger.length, 2); assert.equal(f.snapshot().player, 10200n);
});
test('accepted win remains collectible after the current approved model is retired', async () => {
  const f = fixture(), r = await f.service.spin(f.request(), f.action()); f.controls.release = false; f.controls.modelAvailable = false;
  const result = await f.service.takeWin(f.request(), f.take(r)); assert.equal(result.collection.amount, '3.00');
});
test('absent replayOnly TAKE never transfers a pending win', async () => {
  const f = fixture(), r = await f.service.spin(f.request(), f.action()), before = committedMoney(f);
  await rejects(f.service.takeWin(f.request(), f.take(r, undefined, { replayOnly: true })), 'ROUND_NOT_FOUND_FOR_REPLAY');
  assert.deepEqual(committedMoney(f), before);
});
test('next SPIN atomically collects its explicit accepted pending win then debits the next stake', async () => {
  const f = fixture(), r = await f.service.spin(f.request(), f.action());
  const next = await f.service.spin(f.request(), f.action(f.nextId(), { collectRoundId: r.roundId }));
  assert.equal(next.previousCollection.amount, '3.00'); assert.equal(next.walletReceipt.balanceBefore, '102.00');
  assert.equal(next.walletReceipt.balanceAfter, '101.00'); assert.equal(f.snapshot().ledger.length, 3);
  const replay = await f.service.spin(f.request(), f.action(next.requestKey, { collectRoundId: r.roundId, replayOnly: true }));
  assert.deepEqual(replay, next); assert.equal(f.snapshot().ledger.length, 3);
});
test('a new SPIN cannot silently abandon an existing pending win', async () => {
  const f = fixture(); await f.service.spin(f.request(), f.action()); const before = committedMoney(f);
  await rejects(f.service.spin(f.request(), f.action(f.nextId())), 'SUPERWILDS_PENDING_WIN_REQUIRES_COLLECTION');
  assert.deepEqual(committedMoney(f), before);
});
test('state reconnect returns authoritative balance, same round and pending collection without another debit', async () => {
  const f = fixture(), r = await f.service.spin(f.request(), f.action()), before = committedMoney(f);
  const state = await f.service.state(f.request());
  assert.equal(state.balance, '99.00'); assert.deepEqual(state.round.result, r); assert.equal(state.round.pendingWin, '3.00');
  assert.deepEqual(committedMoney(f), before);
  await f.service.takeWin(f.request(), f.take(r)); const after = await f.service.state(f.request());
  assert.equal(after.balance, '102.00'); assert.equal(after.round.pendingWin, '0.00'); assert.ok(after.round.collection);
});
test('zero-win spins are ordered, unlock the player and require no collect transfer', async () => {
  const f = fixture({ win: 0n }), r = await f.service.spin(f.request(), f.action());
  assert.equal(r.collectionStatus, 'NOT_REQUIRED'); assert.equal(f.snapshot().active, null); assert.equal(f.snapshot().order.length, 1);
  await rejects(f.service.takeWin(f.request(), f.take(r)), 'SUPERWILDS_NO_PENDING_WIN');
  await f.service.spin(f.request(), f.action(f.nextId())); assert.equal(f.snapshot().ledger.length, 2);
});
test('STOP and presentation controls have no financial endpoint', async () => {
  const f = fixture(); assert.deepEqual(Object.keys(f.service).sort(), ['gamble', 'handles', 'spin', 'state', 'takeWin']);
  assert.equal(f.service.handles(GAME_ID), true); assert.equal(f.service.handles('multihot5_native'), false);
  await rejects(f.service.spin(f.request(), f.action(TOKEN, { outcome: { win: 9999 } })), 'SUPERWILDS_CLIENT_AUTHORITY_REJECTED');
  assert.equal(f.snapshot().ledger.length, 0);
});
test('changed session or owner during the transaction blocks financial execution', async () => {
  const f = fixture(); await rejects(f.service.spin(f.request(), f.action(TOKEN, { sessionGuard: 'b'.repeat(64) })), 'PLAYER_SESSION_CHANGED');
  f.controls.inTransactionUser = 'another-fixture-user';
  await rejects(f.service.spin(f.request(), f.action()), 'PLAYER_SESSION_CHANGED'); assert.equal(f.snapshot().ledger.length, 0);
});
test('insufficient funds and uninstalled own model make no ledger entries', async () => {
  const poor = fixture({ initialPlayer: 99n }); await rejects(poor.service.spin(poor.request(), poor.action()), 'INSUFFICIENT_FUNDS');
  assert.equal(poor.controls.sampled, 0); assert.equal(poor.snapshot().ledger.length, 0);
  const f = fixture(); f.controls.modelAvailable = false;
  await rejects(f.service.spin(f.request(), f.action()), 'SUPERWILDS_APPROVED_OWN_MODEL_REQUIRED'); assert.equal(f.snapshot().ledger.length, 0);
});
test('factory defaults never enable new cash even when supplied a model', async () => {
  const f = fixture(), d = { ...f.dependencies }; delete d.releaseEnabled;
  const service = createSuperWildsLifecycle(d); await rejects(service.spin(f.request(), f.action()), 'SUPERWILDS_RELEASE_NOT_ENABLED');
});
for (const step of ['sample', 'reserve', 'insertRound', 'registerRound', 'claim', 'insertRequest']) {
  test(`failure at ${step} rolls back BET, pending hold, journal and shared order`, async () => {
    const f = fixture(), before = committedMoney(f); f.controls.failAt = step;
    await rejects(f.service.spin(f.request(), f.action()), 'FIXTURE_FAILURE_' + step);
    assert.deepEqual(committedMoney(f), before);
    f.controls.failAt = null; await f.service.spin(f.request(), f.action());
    assert.equal(f.snapshot().ledger.length, 1); assert.equal(f.snapshot().rounds.size, 1);
  });
}
for (const step of ['insertCollection', 'release', 'insertRequest']) {
  test(`failed TAKE at ${step} retains the accepted hold and never commits a partial credit`, async () => {
    const f = fixture(), r = await f.service.spin(f.request(), f.action()), before = committedMoney(f);
    f.controls.failAt = step; const action = f.take(r);
    await rejects(f.service.takeWin(f.request(), action), 'FIXTURE_FAILURE_' + step); assert.deepEqual(committedMoney(f), before);
    f.controls.failAt = null; await f.service.takeWin(f.request(), action);
    assert.equal(f.snapshot().ledger.filter(e => e.kind === 'WIN').length, 1);
  });
}
test('invalid server grid or rejected outcome rolls back the already executed debit', async () => {
  const f = fixture(), before = committedMoney(f); f.controls.malformed = true;
  await rejects(f.service.spin(f.request(), f.action()), 'SUPERWILDS_MODEL_OUTCOME_INVALID'); assert.deepEqual(committedMoney(f), before);
  f.controls.malformed = false; f.controls.validOutcome = false;
  await rejects(f.service.spin(f.request(), f.action()), 'SUPERWILDS_MODEL_OUTCOME_REJECTED'); assert.deepEqual(committedMoney(f), before);
});
test('collection plus a failing next SPIN rolls both actions back together', async () => {
  const f = fixture(), r = await f.service.spin(f.request(), f.action()), before = committedMoney(f);
  f.controls.failAt = 'sample';
  await rejects(f.service.spin(f.request(), f.action(f.nextId(), { collectRoundId: r.roundId })), 'FIXTURE_FAILURE_sample');
  assert.deepEqual(committedMoney(f), before);
});
test('a round owned by another authenticated account cannot be collected', async () => {
  const f = fixture(), r = await f.service.spin(f.request(), f.action()), before = committedMoney(f);
  f.controls.userId = f.controls.inTransactionUser = 'other-player';
  await rejects(f.service.takeWin(f.request(), f.take(r)), 'SUPERWILDS_ROUND_NOT_FOUND'); assert.deepEqual(committedMoney(f), before);
});
