import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuperWildsLifecycle, money } from './lifecycle.mjs';
import { createSuperWildsFairGambleModel } from './gamble-model.mjs';
import { fixture } from './test-support.mjs';

function game({ colors = ['RED'], policy = {}, initialHouse } = {}) {
  const f = fixture(initialHouse === undefined ? {} : { initialHouse });
  const control = { enabled: true, available: true, colors: [...colors], samples: 0, failEntropy: false };
  const candidate = createSuperWildsFairGambleModel({
    policy: { version: 'isolated-policy', maxAttempts: 3, maxPendingMinor: 10000n, maxTargetMinor: 20000n, ...policy },
    randomBytes: () => {
      control.samples++; if (control.failEntropy) throw Error('ISOLATED_ENTROPY_FAILURE');
      return new Uint8Array([control.colors.shift() === 'BLACK' ? 1 : 0]);
    },
  });
  // Explicit disposable acceptance, never exported as a production model.
  const model = { ...candidate, approved: true,
    verification: { fairColorVerified: true, operatorPolicyVerified: true, reservationLifecycleVerified: true } };
  const service = createSuperWildsLifecycle({ ...f.dependencies,
    getApprovedGambleModel: async () => control.available ? model : null, gambleEnabled: () => control.enabled });
  const body = (round, values = {}) => ({ ...f.take(round), choice: 'RED', expectedAttempt: 1,
    expectedPendingWin: round.winAmount, gambleVersion: model.gambleVersion, gambleSha256: model.gambleSha256, ...values });
  return { ...f, service, control, model, candidate, body };
}
const rejects = (promise, code) => assert.rejects(promise, error => error.code === code);

test('own fair colour law has128 outcomes per colour; no cap or approval default is invented', () => {
  const policy = { version: 'explicit-test-policy', maxAttempts: 2, maxPendingMinor: 100n, maxTargetMinor: 200n };
  const counts = { RED: 0, BLACK: 0 };
  for (let byte = 0; byte < 256; byte++) {
    const candidate = createSuperWildsFairGambleModel({ policy, randomBytes: () => new Uint8Array([byte]) });
    counts[candidate.sampleColor()]++; assert.equal(candidate.approved, false);
    assert.equal(candidate.verification.operatorPolicyVerified, false);
  }
  assert.deepEqual(counts, { RED: 128, BLACK: 128 });
  assert.throws(() => createSuperWildsFairGambleModel(), /EXPLICIT_OPERATOR_POLICY_REQUIRED/);
  assert.throws(() => createSuperWildsFairGambleModel({ policy: { ...policy, maxTargetMinor: undefined } }), /EXPLICIT/);
  const a = createSuperWildsFairGambleModel({ policy }), b = createSuperWildsFairGambleModel({ policy: { ...policy, maxTargetMinor: 400n } });
  assert.notEqual(a.gambleSha256, b.gambleSha256);
});

test('a winning gamble increases only the pending hold and preserves original SPIN/paired ledger', async () => {
  const f = game(), spin = await f.service.spin(f.request(), f.action()), before = f.snapshot();
  const result = await f.service.gamble(f.request(), f.body(spin));
  assert.equal(result.won, true); assert.equal(result.pendingWinBefore, '3.00'); assert.equal(result.pendingWinAfter, '6.00');
  assert.equal(result.walletReceipt.balanceBefore, '99.00'); assert.equal(result.walletReceipt.balanceAfter, '99.00');
  const after = f.snapshot(); assert.equal(after.player, before.player); assert.equal(after.house, before.house);
  assert.equal(after.reserved, 600n); assert.deepEqual(after.ledger, before.ledger); assert.equal(f.controls.debitWrites, 1);
  assert.deepEqual(after.rounds.get(spin.roundId).receipt, spin); assert.deepEqual(result.round, spin);
  const state = await f.service.state(f.request());
  assert.equal(state.round.pendingWin, '6.00'); assert.equal(state.gamble.nextAttempt, 2); assert.equal(state.gamble.targetWin, '12.00');
  assert.equal(state.gamble.history.length, 1); assert.deepEqual(state.round.result, spin);
});

test('twenty simultaneous same-key gambles create one color, action and hold adjustment', async () => {
  const f = game(), spin = await f.service.spin(f.request(), f.action()), body = f.body(spin);
  const all = await Promise.all(Array.from({ length: 20 }, () => f.service.gamble(f.request(), { ...body })));
  all.forEach(value => assert.deepEqual(value, all[0]));
  assert.equal(f.control.samples, 1); assert.equal(f.snapshot().reserved, 600n);
  assert.equal(f.snapshot().gambles.get(spin.roundId).length, 1); assert.equal(f.snapshot().reservationEvents.length, 1);
  assert.equal(f.snapshot().ledger.length, 1);
});

test('twenty different keys bound to the same attempt accept one action and reject stale state', async () => {
  const f = game(), spin = await f.service.spin(f.request(), f.action());
  const all = await Promise.allSettled(Array.from({ length: 20 }, () => f.service.gamble(f.request(), f.body(spin))));
  assert.equal(all.filter(value => value.status === 'fulfilled').length, 1);
  assert.ok(all.filter(value => value.status === 'rejected').every(value => value.reason.code === 'SUPERWILDS_GAMBLE_STATE_CHANGED'));
  assert.equal(f.control.samples, 1); assert.equal(f.snapshot().reserved, 600n);
});

test('accepted key replays unchanged after both models/releases retire and UUID spelling changes', async () => {
  const f = game(), spin = await f.service.spin(f.request(), f.action());
  const body = f.body(spin, { roundToken: 'abcdefab-abcd-4abc-8abc-abcdefabcdef'.toUpperCase() });
  const accepted = await f.service.gamble(f.request(), body);
  f.control.available = false; f.control.enabled = false; f.controls.release = false; f.controls.modelAvailable = false;
  assert.deepEqual(await f.service.gamble(f.request(), { ...body, roundToken: body.roundToken.toLowerCase(), replayOnly: true }), accepted);
  const state = await f.service.state(f.request()); assert.equal(state.round.pendingWin, '6.00'); assert.equal(state.gamble.available, false);
  const take = await f.service.takeWin(f.request(), f.take(spin)); assert.equal(take.collection.amount, '6.00');
  assert.equal(f.snapshot().player, 10500n); assert.equal(f.control.samples, 1);
});

test('TAKE and atomic next SPIN collect CURRENT doubled win exactly once, never original base award', async () => {
  const f = game(), spin = await f.service.spin(f.request(), f.action()); await f.service.gamble(f.request(), f.body(spin));
  const takes = await Promise.all(Array.from({ length: 20 }, () => f.service.takeWin(f.request(), f.take(spin))));
  assert.equal(new Set(takes.map(value => value.collection.collectionId)).size, 1);
  assert.equal(takes[0].collection.amount, '6.00'); assert.equal(takes[0].collection.baseWinAmount, '3.00');
  assert.equal(f.snapshot().ledger.filter(value => value.kind === 'WIN').length, 1);
  const g = game(), first = await g.service.spin(g.request(), g.action()); await g.service.gamble(g.request(), g.body(first));
  const next = await g.service.spin(g.request(), g.action(g.nextId(), { collectRoundId: first.roundId }));
  assert.equal(next.previousCollection.amount, '6.00'); assert.equal(next.walletReceipt.balanceBefore, '105.00');
  assert.equal(next.walletReceipt.balanceAfter, '104.00'); assert.equal(g.snapshot().ledger.length, 3);
  assert.deepEqual(g.snapshot().rounds.get(first.roundId).receipt, first);
});

test('a losing gamble releases the liability without a second debit and permits next SPIN', async () => {
  const f = game({ colors: ['BLACK'] }), spin = await f.service.spin(f.request(), f.action()), before = f.snapshot();
  const lost = await f.service.gamble(f.request(), f.body(spin));
  assert.equal(lost.won, false); assert.equal(lost.pendingWinAfter, '0.00');
  const after = f.snapshot(); assert.equal(after.player, before.player); assert.equal(after.house, before.house);
  assert.equal(after.reserved, 0n); assert.equal(after.active, null); assert.deepEqual(after.ledger, before.ledger);
  assert.equal((await f.service.state(f.request())).round.pendingWin, '0.00');
  await rejects(f.service.takeWin(f.request(), f.take(spin)), 'SUPERWILDS_NO_PENDING_WIN');
  await f.service.spin(f.request(), f.action(f.nextId())); assert.equal(f.controls.debitWrites, 2);
  assert.deepEqual(f.snapshot().rounds.get(spin.roundId).receipt, spin);
});

test('explicit attempt/pending/target policies reject before entropy without guessing500DMO meaning', async () => {
  for (const policy of [{ maxPendingMinor: 299n }, { maxTargetMinor: 599n }]) {
    const f = game({ policy }), spin = await f.service.spin(f.request(), f.action()), before = f.snapshot();
    await rejects(f.service.gamble(f.request(), f.body(spin)), 'SUPERWILDS_GAMBLE_POLICY_LIMIT');
    assert.deepEqual(f.snapshot(), before); assert.equal(f.control.samples, 0);
  }
  const f = game({ policy: { maxAttempts: 1 } }), spin = await f.service.spin(f.request(), f.action());
  await f.service.gamble(f.request(), f.body(spin));
  await rejects(f.service.gamble(f.request(), f.body(spin, { expectedAttempt: 2, expectedPendingWin: '6.00' })), 'SUPERWILDS_GAMBLE_ATTEMPT_LIMIT');
  assert.equal(f.control.samples, 1); assert.equal((await f.service.state(f.request())).gamble.targetWin, null);
});

test('changed request arguments, stale versions, client outcome and absent replay never mutate pending money', async () => {
  const f = game(), spin = await f.service.spin(f.request(), f.action()), body = f.body(spin);
  const accepted = await f.service.gamble(f.request(), body), before = f.snapshot();
  await rejects(f.service.gamble(f.request(), { ...body, choice: 'BLACK' }), 'IDEMPOTENCY_PARAMETER_CONFLICT');
  await rejects(f.service.gamble(f.request(), f.body(spin, { expectedAttempt: 2, expectedPendingWin: '6.00', gambleSha256: 'b'.repeat(64) })), 'SUPERWILDS_GAMBLE_MODEL_STALE');
  await rejects(f.service.gamble(f.request(), f.body(spin, { color: 'RED' })), 'SUPERWILDS_CLIENT_AUTHORITY_REJECTED');
  await rejects(f.service.gamble(f.request(), f.body(spin, { replayOnly: true })), 'ROUND_NOT_FOUND_FOR_REPLAY');
  assert.deepEqual(f.snapshot(), before); assert.equal(f.control.samples, 1); assert.equal(accepted.pendingWinAfter, '6.00');
});

test('new gamble defaults closed and cannot affect an accepted win without actual approved policy', async () => {
  const f = fixture(), spin = await f.service.spin(f.request(), f.action()), before = f.snapshot();
  const candidate = createSuperWildsFairGambleModel({ policy: { version: 'disposable', maxAttempts: 2, maxPendingMinor: 1000n, maxTargetMinor: 2000n } });
  const body = { ...f.take(spin), choice: 'RED', expectedAttempt: 1, expectedPendingWin: '3.00',
    gambleVersion: candidate.gambleVersion, gambleSha256: candidate.gambleSha256 };
  await rejects(f.service.gamble(f.request(), body), 'SUPERWILDS_GAMBLE_NOT_ENABLED');
  const service = createSuperWildsLifecycle({ ...f.dependencies, getApprovedGambleModel: async () => candidate, gambleEnabled: () => true });
  await rejects(service.gamble(f.request(), body), 'SUPERWILDS_APPROVED_GAMBLE_MODEL_REQUIRED');
  assert.deepEqual(f.snapshot(), before);
});

test('entropy/hold/journal/request failures roll back the complete existing transaction', async () => {
  for (const [where, colors] of [['increase', ['RED']], ['lose', ['BLACK']], ['insertGamble', ['RED']], ['release', ['BLACK']], ['insertRequest', ['RED']]]) {
    const f = game({ colors }), spin = await f.service.spin(f.request(), f.action()), before = f.snapshot();
    f.controls.failAt = where;
    await assert.rejects(f.service.gamble(f.request(), f.body(spin)), error => error.code === 'FIXTURE_FAILURE_' + where);
    assert.deepEqual(f.snapshot(), before, where);
  }
  const f = game(), spin = await f.service.spin(f.request(), f.action()), before = f.snapshot(); f.control.failEntropy = true;
  await assert.rejects(f.service.gamble(f.request(), f.body(spin)), /ISOLATED_ENTROPY_FAILURE/); assert.deepEqual(f.snapshot(), before);
});

test('corrupt immutable gamble history cannot change restored pending or collection', async () => {
  const f = game(), spin = await f.service.spin(f.request(), f.action()); await f.service.gamble(f.request(), f.body(spin));
  f.mutate(value => value.gambles.get(spin.roundId)[0].pendingWinAfter = '9.00'); const before = f.snapshot();
  await rejects(f.service.takeWin(f.request(), f.take(spin)), 'SUPERWILDS_GAMBLE_JOURNAL_INVALID');
  await rejects(f.service.state(f.request()), 'SUPERWILDS_GAMBLE_JOURNAL_INVALID'); assert.deepEqual(f.snapshot(), before);
});
