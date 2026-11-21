import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRollXKeyboard, handleRollXPageHide, handleRollXPageShow } from '../app.mjs';

function environment() {
  const calls = { spin: 0, stop: 0, resume: 0, dispose: 0, hidden: [] };
  const controller = { snapshot: { canSpin: true, canStop: false }, unlockAudio: async () => {},
    spin: async () => { calls.spin++; }, stop: () => { calls.stop++; },
    setHidden: hidden => calls.hidden.push(hidden), resume: async () => { calls.resume++; } };
  return { controller, calls, dispose: () => { calls.dispose++; }, root: { querySelector: () => null } };
}
function key({ code = 'Enter', repeat = false, tagName = 'BODY', wager = false } = {}) {
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperties(event, { code: { value: code }, repeat: { value: repeat },
    target: { value: { tagName, closest: () => wager ? {} : null } } });
  return event;
}

test('held Enter/Space on SPIN, STOP or AUTO controls prevents synthesized repeat clicks', () => {
  const env = environment();
  for (const code of ['Enter', 'Space']) {
    const event = key({ code, repeat: true, tagName: 'BUTTON', wager: true });
    handleRollXKeyboard(event, env);
    assert.equal(event.defaultPrevented, true);
  }
  assert.equal(env.calls.spin, 0); assert.equal(env.calls.stop, 0);
  // A fresh keydown on a button retains its single native click behavior.
  const first = key({ tagName: 'BUTTON', wager: true }); handleRollXKeyboard(first, env);
  assert.equal(first.defaultPrevented, false); assert.equal(env.calls.spin, 0);
});

test('global keyboard starts one action and repeated keydown cannot cross STOP into a new wager', () => {
  const env = environment();
  const first = key({ code: 'Space' }); handleRollXKeyboard(first, env);
  assert.equal(first.defaultPrevented, true); assert.equal(env.calls.spin, 1);
  for (const canStop of [true, false, true, false]) {
    env.controller.snapshot = { canSpin: !canStop, canStop };
    const repeat = key({ code: 'Space', repeat: true }); handleRollXKeyboard(repeat, env);
    assert.equal(repeat.defaultPrevented, true);
  }
  assert.equal(env.calls.spin, 1); assert.equal(env.calls.stop, 0);
  env.controller.snapshot = { canSpin: false, canStop: true };
  handleRollXKeyboard(key(), env); assert.equal(env.calls.stop, 1);
});

test('AUTO form repeated Enter is cancelled while normal text input remains unaffected', () => {
  const env = environment();
  const auto = key({ tagName: 'INPUT', repeat: true, wager: true }); handleRollXKeyboard(auto, env);
  assert.equal(auto.defaultPrevented, true);
  const text = key({ code: 'Space', tagName: 'INPUT', repeat: true }); handleRollXKeyboard(text, env);
  assert.equal(text.defaultPrevented, false); assert.equal(env.calls.spin, 0);
});

test('BFCache pagehide pauses owned work and pageshow refreshes without disposing or wagering', () => {
  const env = environment();
  handleRollXPageHide({ persisted: true }, env);
  assert.deepEqual(env.calls.hidden, [true]); assert.equal(env.calls.dispose, 0);
  handleRollXPageShow({ persisted: true }, env);
  assert.equal(env.calls.resume, 1); assert.equal(env.calls.spin, 0);
  handleRollXPageShow({ persisted: false }, env); assert.equal(env.calls.resume, 1);
  handleRollXPageHide({ persisted: false }, env); assert.equal(env.calls.dispose, 1);
});
