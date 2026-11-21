import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRollXKeyboard } from '../app.mjs';

test('focused Space repeat cancels its native default across pending, STOP and READY without a second action', () => {
  const actions = [];
  const controller = { snapshot: {}, unlockAudio: async () => actions.push('audio'),
    spin: async () => actions.push('spin'), stop: () => actions.push('stop') };
  const root = { querySelector: () => null };
  for (const state of [
    { canSpin: false, canStop: false },
    { canSpin: false, canStop: true },
    { canSpin: false, canStop: false },
    { canSpin: true, canStop: false },
  ]) {
    controller.snapshot = state;
    const event = new Event('keydown', { cancelable: true });
    Object.defineProperties(event, { code: { value: 'Space' }, repeat: { value: true },
      target: { value: { tagName: 'BUTTON', closest: () => ({ id: 'spin' }) } } });
    handleRollXKeyboard(event, { controller, root });
    assert.equal(event.defaultPrevented, true);
  }
  assert.deepEqual(actions, []);
});
