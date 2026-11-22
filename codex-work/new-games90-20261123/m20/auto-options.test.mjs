import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTO_LIMIT_FIELDS, readAutoOptions } from './auto-options.mjs';
import { MultiHot20Controls } from './controls.mjs';

const grid = [['bell','bell','watermelon','lemon','bell'],['bell','orange','bell','bell','watermelon'],['seven','orange','bell','bell','watermelon']];
function form(values = {}) {
  const fields = { '[data-auto-count]': { value: '25' } };
  for (const {name} of AUTO_LIMIT_FIELDS) {
    fields[`[data-auto-enabled="${name}"]`] = { checked: values[name] !== undefined };
    fields[`[data-auto-limit="${name}"]`] = { value: values[name] ?? '', focus() { this.focused = true; } };
  }
  return { fields, querySelector(selector) { return fields[selector]; } };
}
function settle(controls, { balance = '99.80', ordinal = 1 } = {}) {
  const intent = controls.requestSpin(`synthetic-limit-request-${ordinal}`, { auto: true });
  const receipt = { gameId: 'zplay72_multi_hot_20_v1', requestKey: intent.requestKey,
    roundId: `synthetic-limit-round-${ordinal}`, bet: intent.bet, grid, multiplier: 5, winAmount: '6.00', balance };
  controls.acceptReceipt(receipt); controls.finishPresentation(receipt.roundId);
}

test('AUTO dialog carries all three enabled limits as canonical amounts', () => {
  assert.deepEqual(readAutoOptions(form({ winLimit: '6', decreaseLimit: '1.2', increaseLimit: '10.00' })),
    { count: 25, winLimit: '6.00', decreaseLimit: '1.20', increaseLimit: '10.00' });
  assert.deepEqual(readAutoOptions(form()), { count: 25, winLimit: null, decreaseLimit: null, increaseLimit: null });
});
test('AUTO does not silently drop an enabled invalid limit or invent a value', () => {
  for (const value of ['', '0', '-1', '1e3', '0.001', 'NaN', '100000000000']) {
    assert.throws(() => readAutoOptions(form({ winLimit: value })), /AMOUNT|INVALID/);
  }
  const panel = form({ winLimit: '' }); assert.throws(() => readAutoOptions(panel));
  assert.equal(panel.fields['[data-auto-limit="winLimit"]'].focused, true);
});
test('AUTO win reaches-or-exceeds boundary stops on the accepted receipt once', () => {
  const c = new MultiHot20Controls({ roundIntentsEnabled: true }); c.setBalance('100.00');
  c.configureAuto({ count: 25, winLimit: '6.00' }); c.startAuto(); settle(c);
  assert.equal(c.snapshot().auto.active, false); assert.equal(c.snapshot().auto.remaining, 24);
  assert.equal(c.finishPresentation(c.snapshot().round.roundId), false);
  assert.equal(c.snapshot().auto.remaining, 24);
});
test('AUTO balance limits use the server balance at actual start and exact minor-unit boundary', () => {
  for (const [name, balance] of [['decreaseLimit', '109.00'], ['increaseLimit', '111.00']]) {
    const c = new MultiHot20Controls({ roundIntentsEnabled: true }); c.setBalance('100.00');
    c.configureAuto({ count: 25, [name]: '1.00' }); c.setBalance('110.00'); c.startAuto();
    assert.equal(c.snapshot().auto.startBalance, 11000); settle(c, {balance});
    assert.equal(c.snapshot().auto.active, false); assert.equal(c.snapshot().balance, balance);
  }
});
test('AUTO cannot promise a balance guard without a current authoritative balance', () => {
  const c = new MultiHot20Controls({ roundIntentsEnabled: true }); c.configureAuto({ count: 25, decreaseLimit: '1.00' });
  assert.throws(() => c.startAuto(), /AUTO_BALANCE_REQUIRED/); assert.equal(c.snapshot().auto.active, false);
  c.setBalance('100.00'); c.startAuto(); settle(c, {balance: null});
  assert.equal(c.snapshot().auto.active, false); assert.equal(c.snapshot().phase, 'WIN_PENDING');
});
test('AUTO configuration cannot replace a running sequence between accepted rounds', () => {
  const c = new MultiHot20Controls({ roundIntentsEnabled: true }); c.configureAuto({count:25}); c.startAuto();
  assert.throws(() => c.configureAuto({count:50}), /AUTO_CONFIGURATION_INVALID/);
  assert.throws(() => c.startAuto(), /AUTO_START_UNAVAILABLE/);
  assert.equal(c.snapshot().auto.count, 25);
});
