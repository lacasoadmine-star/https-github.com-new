import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-support.mjs';
import { GAME_ID } from './lifecycle.mjs';
import { createSuperWildsTransport } from './transport.mjs';
const setup = () => {
  const f = fixture(); return { f, transport: createSuperWildsTransport({ service: f.service, request: f.request }) };
};
const spin = (f, changes = {}) => ({ gameId: GAME_ID, action: 'SPIN', requestKey: f.nextId(), betMinor: 100, ...changes });
test('renderer transport exposes safe exact minor units and transposes the authoritative grid', async () => {
  const { f, transport: t } = setup(), state = await t.state();
  assert.equal(state.subject, 'fixture-player'); assert.equal(state.balanceMinor, 10000); assert.equal(state.canPlay, true);
  assert.equal(state.canDouble, false); assert.deepEqual(state.betLevelsMinor, [100, 200]);
  const prepared = t.prepare(spin(f)), r = await t.dispatch(prepared);
  assert.equal(r.grid.length, 5); assert.equal(r.grid[0].length, 3); assert.deepEqual(r.grid[0], ['wild', 'wild', 'wild']);
  assert.equal(r.balanceMinor, 9900); assert.equal(r.winMinor, 300); assert.equal(r.multiplier, 1); assert.equal(r.betMinor, 100);
  assert.ok(Object.isFrozen(r.grid[0])); assert.deepEqual(r.acceptedAction, prepared);
});
test('same prepared action recovers exactly across a new transport instance and new authenticated session guard', async () => {
  const { f, transport: t } = setup(); await t.state(); const prepared = t.prepare(spin(f));
  const r = await t.dispatch(prepared); f.controls.guard = 'b'.repeat(64);
  const restored = createSuperWildsTransport({ service: f.service, request: f.request });
  const recovered = await restored.recover(prepared);
  assert.deepEqual(recovered, r); assert.equal(f.snapshot().ledger.length, 1); assert.equal(f.controls.sampled, 1);
});
test('next transport SPIN uses the actual pending collection, and TAKE credits exactly once', async () => {
  const { f, transport: t } = setup(); await t.state();
  const a = await t.dispatch(t.prepare(spin(f)));
  const nextAction = t.prepare(spin(f)); assert.equal(nextAction.authority.collectRoundId, a.roundId);
  const b = await t.dispatch(nextAction); assert.equal(b.balanceMinor, 10100);
  const take = t.prepare({ gameId: GAME_ID, action: 'TAKE', requestKey: f.nextId(), roundId: b.roundId });
  const collected = await t.dispatch(take); assert.equal(collected.balanceMinor, 10400); assert.equal(collected.pendingWinMinor, 0);
  assert.equal(collected.collected, true); assert.equal(collected.requestKey, take.requestKey);
  assert.deepEqual(await t.recover(take), collected); assert.equal(f.snapshot().ledger.filter(e => e.kind === 'WIN').length, 2);
});
test('recovery refuses to reconstruct an old financial action from current UI values', async () => {
  const { f, transport: t } = setup();
  await assert.rejects(t.recover(spin(f)), e => e.code === 'SUPERWILDS_ORIGINAL_ACTION_REQUIRED');
  assert.equal(f.snapshot().ledger.length, 0);
});
test('fresh server readback prevents stale ETB balance and double TAKE after another tab collects', async () => {
  const f = fixture();
  const service = { ...f.service, spin: async (request, body) => {
    const accepted = await f.service.spin(request, body);
    // Simulate an authorized second tab taking the accepted win before the first tab sees its reply.
    await f.service.takeWin(request, f.take(accepted));
    return accepted;
  } };
  const t = createSuperWildsTransport({ service, request: f.request });
  await t.state();
  const receipt = await t.dispatch(t.prepare(spin(f)));
  assert.equal(receipt.winMinor, 300);
  assert.equal(receipt.balanceMinor, 10200);
  assert.equal(receipt.pendingWinMinor, 0);
  assert.equal((await t.state()).pendingWinMinor, 0);
  assert.equal(f.snapshot().ledger.length, 2); // one BET and one WIN, not an extra credit
});
test('missing approved DOUBLE rules disables the capability and cannot produce an outcome', async () => {
  const { f, transport: t } = setup(); assert.equal((await t.state()).canDouble, false);
  await assert.rejects(t.dispatch(spin(f, { action: 'DOUBLE' })), e => e.code === 'SUPERWILDS_APPROVED_DOUBLE_MODEL_REQUIRED');
  assert.equal(f.snapshot().ledger.length, 0);
});
test('transport rejects unsafe numeric UI amounts instead of rounding a wager', async () => {
  const { f, transport: t } = setup(); await t.state();
  for (const betMinor of [NaN, Infinity, 0.1, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => t.prepare(spin(f, { betMinor })), e => e.code === 'SUPERWILDS_UI_MINOR_INVALID');
  }
  assert.equal(f.snapshot().ledger.length, 0);
});
