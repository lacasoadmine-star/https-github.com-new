import test from 'node:test';
import assert from 'node:assert/strict';
import { RollXController } from '../controller.mjs';
import { fixtureReceipt, fixtureSession, instruments, deferred, waitUntil } from './fixture-session.mjs';

async function setup(receipts = [fixtureReceipt()], sessionOptions = {}, rendererOptions = {}) {
  const session = fixtureSession(receipts, sessionOptions);
  const playback = instruments(rendererOptions), states = [];
  const controller = new RollXController({
    session, ...playback, onState: state => states.push(state),
    schedule: callback => setImmediate(callback), cancel: clearImmediate,
  });
  await controller.connect();
  return { session, controller, states, ...playback };
}
const sequence = count => Array.from({ length: count }, (_, index) => fixtureReceipt(index + 1, { before: 10000n + BigInt(index) * 8n }));

test('repeated inputs while a request is unresolved submit exactly one bound wager', async () => {
  const pause = deferred();
  const h = await setup(undefined, { beforeSpin: () => pause.promise });
  const first = h.controller.spin();
  const repeated = await Promise.all(Array.from({ length: 20 }, () => h.controller.spin()));
  assert(repeated.every(result => !result.accepted));
  assert.deepEqual(h.session.calls.spin, [{ bet: '0.20', targetBps: 14_000 }]);
  assert.equal(h.controller.setBet('0.50'), false);
  assert.equal(h.controller.setTarget(20_000), false);
  pause.resolve();
  assert.equal((await first).accepted, true);
  assert.equal(h.controller.snapshot.balance, '100.08');
  assert.equal(h.controller.snapshot.fixture, true);
  h.controller.dispose();
});

test('STOP accelerates receipt presentation and never submits another financial action', async () => {
  const h = await setup(undefined, {}, { held: true });
  const play = h.controller.spin();
  await waitUntil(() => h.controller.snapshot.canStop);
  h.controller.stop(); h.controller.stop();
  await play;
  assert.equal(h.session.calls.spin.length, 1);
  assert.equal(h.renderer.calls.length, 1);
  assert.equal(h.controller.snapshot.history.length, 1);
  assert(Object.isFrozen(h.renderer.calls[0].receipt.rollX));
  assert.equal(h.events.filter(event => event === 'spin').length, 1);
  assert.equal(h.events.filter(event => event === 'stop').length, 1);
  assert.equal(h.events.filter(event => event === 'win').length, 1);
  h.controller.dispose();
});

test('history and wheel use the receipt while current balance comes from refreshed account state', async () => {
  const h = await setup(undefined, { refreshBalances: ['99.00'] });
  await h.controller.spin();
  assert.equal(h.controller.snapshot.receipt.walletReceipt.balanceAfter, '100.08');
  assert.equal(h.controller.snapshot.balance, '99.00');
  assert.equal(h.session.calls.refresh, 1);
  h.controller.dispose();
});

test('lost accepted response pauses AUTO and uses recover without a second spin', async () => {
  const h = await setup(undefined, { loseAccepted: true });
  const result = await h.controller.startAuto({ count: 10 });
  assert.equal(result.completed, 0);
  assert.equal(h.controller.snapshot.canSpin, false);
  assert.equal(h.controller.snapshot.canRecover, true);
  assert.equal(h.controller.snapshot.autoActive, false);
  assert.equal((await h.controller.recover()).accepted, true);
  assert.equal(h.session.calls.spin.length, 1);
  assert.equal(h.session.calls.recover, 1);
  assert.equal(h.controller.snapshot.history.length, 1);
  assert.equal(h.controller.snapshot.balance, '100.08');
  h.controller.dispose();
});

test('AUTO performs exactly its confirmed finite count', async () => {
  const h = await setup(sequence(10));
  const result = await h.controller.startAuto({ count: 10 });
  assert.deepEqual(result, { started: true, completed: 10 });
  assert.equal(h.session.calls.spin.length, 10);
  assert.equal(h.session.calls.refresh, 10);
  assert.equal(h.controller.snapshot.autoActive, false);
  assert.equal(h.controller.snapshot.autoRemaining, 0);
  assert.equal(h.controller.autoTimer, null);
  h.controller.dispose();
});

test('AUTO binds the bet and multiplier chosen in its own form for every accepted round', async () => {
  const receipts = Array.from({ length: 10 }, (_, index) => fixtureReceipt(index + 1, {
    before: 10000n + BigInt(index) * 50n, bet: '0.50', payout: '1.00', targetBps: 20_000,
  }));
  const h = await setup(receipts);
  assert.equal(h.controller.snapshot.bet, '0.20');
  assert.equal(h.controller.snapshot.targetBps, 14_000);
  const result = await h.controller.startAuto({ count: 10, bet: '0.50', targetBps: 20_000 });
  assert.deepEqual(result, { started: true, completed: 10 });
  assert.equal(h.controller.snapshot.balance, '105.00');
  assert.equal(h.controller.snapshot.bet, '0.50');
  assert.equal(h.controller.snapshot.targetBps, 20_000);
  assert(h.session.calls.spin.every(wager => wager.bet === '0.50' && wager.targetBps === 20_000));
  h.controller.dispose();
});

test('invalid or stale AUTO selection cannot alter the active choice or start a wager', async () => {
  const h = await setup(undefined, { supportedTargets: [14_000] });
  for (const selection of [
    { bet: '50.00', targetBps: 14_000 },
    { bet: '0.50', targetBps: 20_000 },
    { bet: '0.50', targetBps: 30_000 },
    { bet: null, targetBps: 14_000 },
    { bet: '0.50', targetBps: 14_000, stopOnWin: '-1.00' },
  ]) {
    assert.equal((await h.controller.startAuto({ count: 10, ...selection })).started, false);
    assert.equal(h.controller.snapshot.bet, '0.20');
    assert.equal(h.controller.snapshot.targetBps, 14_000);
    assert.equal(h.controller.snapshot.autoActive, false);
  }
  assert.equal(h.session.calls.spin.length, 0);
  h.controller.dispose();
});

test('AUTO rejects invented, fractional or unbounded counts before any request', async () => {
  const h = await setup();
  for (const count of [0, -1, 1, 7, 10.1, 1001, Infinity, '10', null]) {
    assert.equal((await h.controller.startAuto({ count })).started, false);
  }
  assert.equal(h.session.calls.spin.length, 0);
  h.controller.dispose();
});

test('cancelling AUTO during its pending request permits that accepted round to settle but starts none after it', async () => {
  const pause = deferred();
  const h = await setup(sequence(10), { beforeSpin: () => pause.promise });
  const run = h.controller.startAuto({ count: 10 });
  await waitUntil(() => h.session.calls.spin.length === 1);
  h.controller.stopAuto(); pause.resolve();
  const result = await run;
  assert.equal(result.completed, 1);
  assert.equal(h.session.calls.spin.length, 1);
  assert.equal(h.controller.snapshot.history.length, 1);
  h.controller.dispose();
});

test('AUTO single-win and balance limits stop after confirmed settlement', async () => {
  for (const limits of [{ stopOnWin: '0.10' }, { stopOnGain: '0.05' }]) {
    const h = await setup(sequence(10));
    assert.equal((await h.controller.startAuto({ count: 10, ...limits })).completed, 1);
    assert.equal(h.session.calls.spin.length, 1);
    h.controller.dispose();
  }
});

test('a strict more-than threshold does not stop at equality', async () => {
  const h = await setup(sequence(10));
  assert.equal((await h.controller.startAuto({ count: 10, stopOnWin: '0.28' })).completed, 10);
  h.controller.dispose();
});

test('unbound chosen multiplier cannot be omitted or silently replaced by the adapter', async () => {
  const h = await setup(undefined, { supportedTargets: [14_000] });
  assert.equal(h.controller.setTarget(20_000), true);
  assert.equal(h.controller.snapshot.canSpin, false);
  assert.equal((await h.controller.spin()).accepted, false);
  assert.equal(h.session.calls.spin.length, 0);
  h.controller.dispose();
});

test('hide stops AUTO and presentation audio; resume refreshes without another wager', async () => {
  const h = await setup(undefined, {}, { held: true });
  const play = h.controller.spin();
  await waitUntil(() => h.controller.snapshot.canStop);
  h.controller.setHidden(true);
  const afterHide = h.events.length;
  await play;
  assert(!h.events.slice(afterHide).some(event => ['win', 'stop'].includes(event)));
  assert.equal(h.controller.snapshot.canSpin, false);
  await h.controller.resume();
  assert.equal(h.session.calls.spin.length, 1);
  assert.equal(h.session.calls.refresh, 2);
  h.controller.dispose();
});

test('dispose invalidates late accepted callbacks and closes every owned component', async () => {
  const pause = deferred();
  const h = await setup(undefined, { beforeSpin: () => pause.promise });
  const play = h.controller.spin();
  h.controller.dispose();
  const stateCount = h.states.length;
  pause.resolve(); await play;
  assert.equal(h.states.length, stateCount);
  assert.equal(h.renderer.calls.length, 0);
  assert.equal(h.session.calls.dispose, 1);
  assert.equal(h.renderer.disposed, 1);
  assert.equal(h.events.at(-1), 'disposed');
  assert.equal(h.controller.autoTimer, null);
});

test('balance-refresh failure retains accepted receipt and does not claim the round failed to start', async () => {
  const h = await setup(undefined, { refreshError: true });
  const result = await h.controller.spin();
  assert.equal(result.accepted, true); assert.equal(result.ready, false);
  assert.equal(h.controller.snapshot.receipt.roundId, fixtureReceipt().roundId);
  assert.equal(h.controller.snapshot.canSpin, false);
  assert.match(h.controller.snapshot.message, /Round accepted/);
  assert.equal(h.session.calls.spin.length, 1);
  h.controller.dispose();
});

test('a presentation error retains financial acceptance and cancels animation ownership', async () => {
  const h = await setup();
  let signal;
  h.renderer.presentReceipt = async (_receipt, options) => { signal = options.signal; throw new Error('Renderer unavailable'); };
  const result = await h.controller.spin();
  assert.equal(result.accepted, true); assert.equal(result.ready, false);
  assert.equal(h.controller.snapshot.receipt.roundId, fixtureReceipt().roundId);
  assert.equal(h.controller.snapshot.canSpin, false); assert.equal(h.controller.snapshot.canStop, false);
  assert.equal(signal.aborted, true); assert.equal(h.session.calls.spin.length, 1);
  h.controller.dispose();
});

test('unresolved recovery locks wager controls and restores accepted receipt choice', async () => {
  const receipt = fixtureReceipt(1, { bet: '0.50', payout: '1.00', targetBps: 20_000 });
  const h = await setup([receipt], { loseAccepted: true });
  h.controller.setBet('0.50'); h.controller.setTarget(20_000);
  await h.controller.spin();
  assert.equal(h.controller.snapshot.wagerControlsDisabled, true);
  assert.equal(h.controller.setTarget(14_000), false); assert.equal(h.controller.setBet('0.20'), false);
  // A newly mounted controller starts at the default visual target but must
  // restore the accepted receipt, never overwrite it with that visual default.
  h.controller.state.targetBps = 14_000; h.controller.state.bet = '0.20';
  await h.controller.recover();
  assert.equal(h.controller.snapshot.targetBps, 20_000); assert.equal(h.controller.snapshot.bet, '0.50');
  assert.equal(h.controller.snapshot.receipt.finalWin, '1.00');
  assert.equal(h.session.calls.spin.length, 1); h.controller.dispose();
});

test('Turbo and reduced motion affect only requested presentation duration', async () => {
  const h = await setup();
  h.controller.setTurbo(true);
  await h.controller.spin();
  assert.equal(h.renderer.calls[0].options.duration, 450);
  assert.equal(h.session.calls.spin.length, 1);
  h.controller.dispose();
  const reduced = await setup();
  reduced.controller.reducedMotion = true;
  await reduced.controller.spin();
  assert.equal(reduced.renderer.calls[0].options.duration, 0);
  reduced.controller.dispose();
});
