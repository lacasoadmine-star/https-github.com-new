import test from 'node:test';
import assert from 'node:assert/strict';
import { MultiHot20Controls } from './controls.mjs';
import { MultiHot20Renderer } from './render/renderer.mjs';
import { MultiHot20Controller } from './controller.mjs';

const GAME_ID = 'zplay72_multi_hot_20_v1';
const grid = [['watermelon','grapes','plum','cherry','cherry'],['grapes','cherry','orange','bell','bell'],['watermelon','cherry','lemon','grapes','cherry']];
const context = new Proxy({ globalAlpha: 1 }, { get: (o, key) => key in o ? o[key] : () => {} });
const receipt = (intent, index = 1) => ({ gameId: GAME_ID, requestKey: intent.requestKey, roundId: `synthetic-round-${String(index).padStart(4,'0')}`,
  bet: intent.bet, grid: structuredClone(grid), multiplier: 2, winAmount: '0.00', balance: null });
const defer = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function setup({ submit, recover } = {}) {
  let clock = 0, ordinal = 0; const calls = [], errors = [], jobs = [];
  const controls = new MultiHot20Controls({ roundIntentsEnabled: true });
  const renderer = new MultiHot20Renderer({ canvas: { getContext: () => context }, atlas: { draw() {} }, background: { width: 1363, height: 766 } });
  const transport = { submit: intent => { calls.push(structuredClone(intent)); return submit ? submit(intent) : receipt(intent, calls.length); },
    recover: intent => { calls.push({ ...structuredClone(intent), recovered: true }); return recover ? recover(intent) : receipt(intent); } };
  const controller = new MultiHot20Controller({ controls, renderer, transport, now: () => clock,
    keyFactory: () => `synthetic-request-${String(++ordinal).padStart(4,'0')}`, schedule: job => jobs.push(job), onError: error => errors.push(error) });
  return { controls, renderer, controller, calls, errors, jobs, at(value) { clock = value; controller.frame(value); } };
}

test('one accepted manual input creates one request and STOP creates none', async () => {
  const s = setup(); assert.equal(await s.controller.spin(), true); assert.equal(s.calls.length, 1);
  assert.equal(await s.controller.spin(), true); assert.equal(s.calls.length, 1);
  s.at(500); assert.equal(s.controls.snapshot().phase, 'READY'); assert.deepEqual(s.renderer.snapshot().grid, grid);
});
test('a second input before the first response changes presentation only', async () => {
  const pending = defer(), s = setup({ submit: () => pending.promise });
  const first = s.controller.spin(); await Promise.resolve(); assert.equal(s.calls.length, 1);
  assert.equal(await s.controller.spin(), true); assert.equal(s.calls.length, 1);
  pending.resolve(receipt(s.calls[0])); await first; s.at(500); assert.equal(s.controls.snapshot().phase, 'READY');
});
test('lost response keeps the original request payload and resumes exactly that receipt', async () => {
  const s = setup({ submit: () => { throw new Error('lost reply'); } });
  assert.equal(await s.controller.spin(), false); const original = s.calls[0];
  assert.equal(s.controls.snapshot().phase, 'RECOVERY_REQUIRED'); assert.equal(s.errors.length, 1);
  assert.equal(await s.controller.recover(), true);
  const { recovered, ...payload } = s.calls[1]; assert.deepEqual(payload, original); assert.equal(recovered, true);
  s.at(3000); assert.equal(s.controls.snapshot().phase, 'READY'); assert.equal(s.renderer.snapshot().seenRoundCount, 1);
});
test('pending request blocks BET and independent SPIN until recovery', async () => {
  const s = setup({ submit: () => Promise.reject(new Error('offline')) }); await s.controller.spin();
  assert.throws(() => s.controls.selectBet('0.40'), /BET_LOCKED/);
  assert.equal(await s.controller.spin(), true); assert.equal(s.calls.length, 1);
});
test('AUTO starts from its dialog and dispatches exactly the selected count', async () => {
  const s = setup(); s.controls.openModal('auto'); s.controller.configureAuto({ count: 25 });
  s.controller.startAuto(); assert.equal(s.controls.snapshot().modal, null);
  for (let index = 0; index < 25; index++) { assert.equal(s.jobs.length, 1); await s.jobs.shift()(); s.at((index + 1) * 3000); }
  assert.equal(s.calls.length, 25); assert.equal(s.jobs.length, 0); assert.equal(s.controls.snapshot().auto.active, false);
  assert.equal(s.controls.snapshot().auto.remaining, 0); assert.equal(s.controls.snapshot().phase, 'READY');
});
test('AUTO input cancels queued continuation before another request is created', async () => {
  const s = setup(); s.controller.configureAuto({ count: 25 }); s.controller.startAuto();
  s.controller.stopAuto(); await s.jobs.shift()(); assert.equal(s.calls.length, 0);
});
test('hidden lifecycle cancels AUTO continuation without losing an accepted receipt', async () => {
  const s = setup(); s.controller.configureAuto({ count: 25 }); s.controller.startAuto(); await s.jobs.shift()();
  s.controller.setHidden(true); s.at(3000); assert.equal(s.controls.snapshot().phase, 'READY'); assert.equal(s.calls.length, 1);
  s.controller.setHidden(false); assert.equal(s.jobs.length, 0); assert.equal(s.renderer.snapshot().seenRoundCount, 1);
});
test('late reply while hidden is retained and cannot restart AUTO', async () => {
  const pending = defer(), s = setup({ submit: () => pending.promise });
  s.controller.configureAuto({ count: 25 }); s.controller.startAuto(); const job = s.jobs.shift()(); await Promise.resolve();
  s.controller.setHidden(true); pending.resolve(receipt(s.calls[0])); await job; s.at(3000);
  assert.equal(s.calls.length, 1); assert.equal(s.jobs.length, 0); assert.equal(s.controls.snapshot().phase, 'READY');
});
test('duplicate and conflicting renderer receipts retain immutable first result', async () => {
  const s = setup(); await s.controller.spin(); const input = receipt(s.calls[0]);
  assert.equal(s.renderer.accept(input, 20), false); input.multiplier = 3;
  assert.throws(() => s.renderer.accept(input, 20), /CONFLICTING_RENDER_REPLAY/);
  s.at(3000); assert.equal(s.renderer.snapshot().round.multiplier, 2); assert.equal(s.calls.length, 1);
});
test('invalid receipt enters recovery and does not authorize a displayed outcome', async () => {
  const s = setup({ submit: intent => ({ ...receipt(intent), requestKey: 'different-request-0001' }) });
  assert.equal(await s.controller.spin(), false); assert.equal(s.controls.snapshot().phase, 'RECOVERY_REQUIRED');
  assert.equal(s.renderer.snapshot().seenRoundCount, 0); assert.equal(s.controls.snapshot().financialEnabled, false);
});
test('a stale accepted receipt during a later SPIN recovers the later original key', async () => {
  let first;
  const s = setup({ submit: intent => first ||= receipt(intent), recover: intent => receipt(intent, 2) });
  assert.equal(await s.controller.spin(), true); s.at(3000);
  const accepted = s.controls.snapshot().round;
  assert.equal(await s.controller.spin(), false);
  const later = s.calls[1];
  assert.notEqual(later.requestKey, accepted.requestKey);
  assert.equal(s.controls.snapshot().phase, 'RECOVERY_REQUIRED');
  assert.equal(s.controls.snapshot().pending.requestKey, later.requestKey);
  assert.equal(s.errors.at(-1).message, 'M20_RECEIPT_BINDING_MISMATCH');
  assert.deepEqual(s.controls.snapshot().round, accepted);
  assert.equal(s.renderer.snapshot().seenRoundCount, 1);
  assert.equal(await s.controller.recover(), true); s.at(6000);
  const { recovered, ...payload } = s.calls[2];
  assert.equal(recovered, true); assert.deepEqual(payload, later);
  assert.equal(s.controls.snapshot().round.requestKey, later.requestKey);
  assert.equal(s.controls.snapshot().phase, 'READY');
  assert.equal(s.calls.length, 3);
});
test('a duplicate accepted receipt stays idempotent without another pending request', async () => {
  const s = setup(); await s.controller.spin(); const accepted = receipt(s.calls[0]);
  assert.equal(s.controls.acceptReceipt(accepted), false);
  s.at(3000); assert.equal(s.controls.acceptReceipt(accepted), false);
  assert.equal(s.controls.snapshot().phase, 'READY');
  assert.equal(s.calls.length, 1);
});
test('dispose invalidates queued AUTO and prevents late response changes', async () => {
  const s = setup(); s.controller.configureAuto({ count: 25 }); s.controller.startAuto(); s.controller.dispose();
  await s.jobs.shift()(); assert.equal(await s.controller.spin(), false); assert.equal(s.calls.length, 0);
});
test('preview controls cannot create any round intent', () => {
  const controls = new MultiHot20Controls(); assert.throws(() => controls.requestSpin('synthetic-request-0001'), /ROUND_INTENTS_DISABLED/);
  assert.throws(() => controls.startAuto(), /AUTO_START_UNAVAILABLE/); assert.equal(controls.snapshot().financialEnabled, false);
});
test('stopping then restarting AUTO before the old scheduled job cannot strand the new sequence', async () => {
  const s = setup(); s.controller.configureAuto({count:25}); s.controller.startAuto();
  const old = s.jobs.shift(); s.controller.stopAuto(); s.controller.startAuto();
  assert.equal(s.jobs.length, 1); await old(); assert.equal(s.calls.length, 0);
  assert.equal(s.controller.startAuto(), false); await s.jobs.shift()();
  assert.equal(s.calls.length, 1); s.at(3000); assert.equal(s.jobs.length, 1);
  s.controller.stopAuto(); await s.jobs.shift()(); assert.equal(s.calls.length, 1);
});
test('a lost TAKE response recovers the same TAKE key and amount without another SPIN', async () => {
  const winning = [['bell','bell','watermelon','lemon','bell'],['bell','orange','bell','bell','watermelon'],['seven','orange','bell','bell','watermelon']];
  const s = setup({submit: intent => {
    if (intent.action === 'TAKE') throw new Error('accepted TAKE reply lost');
    return {...receipt(intent), grid:winning, multiplier:5, winAmount:'6.00'};
  }, recover:intent => ({...intent,collected:true,amount:'6.00',balance:'105.80'})});
  await s.controller.spin(); s.at(3000); assert.equal(s.controls.snapshot().phase, 'WIN_PENDING');
  assert.equal(await s.controller.take(), false); assert.equal(s.controls.snapshot().phase, 'RECOVERY_REQUIRED');
  const original = s.calls[1]; assert.equal(original.action, 'TAKE');
  assert.equal(await s.controller.recover(), true); const {recovered,...intent} = s.calls[2];
  assert.deepEqual(intent, original); assert.equal(recovered,true); assert.equal(s.calls.filter(x=>x.action==='SPIN').length,1);
  assert.equal(s.controls.snapshot().balance,'105.80'); assert.equal(s.controls.snapshot().phase,'READY');
  assert.equal(s.renderer.snapshot().winVisible,false); assert.equal(await s.controller.recover(),false);
});
test('manual TAKE cancels the queued automatic wager without losing collection', async () => {
  const winning = [['bell','bell','watermelon','lemon','bell'],['bell','orange','bell','bell','watermelon'],['seven','orange','bell','bell','watermelon']];
  const s = setup({submit:intent => intent.action==='TAKE'?{...intent,collected:true,amount:'6.00',balance:'105.80'}:
    {...receipt(intent),grid:winning,multiplier:5,winAmount:'6.00'}});
  s.controller.configureAuto({count:25});s.controller.startAuto();await s.jobs.shift()();s.at(3000);
  assert.equal(s.jobs.length,1); assert.equal(await s.controller.take(),true);await s.jobs.shift()();
  assert.equal(s.calls.length,2);assert.equal(s.calls[1].action,'TAKE');assert.equal(s.controls.snapshot().auto.active,false);
  assert.equal(s.controls.snapshot().phase,'READY');
});
