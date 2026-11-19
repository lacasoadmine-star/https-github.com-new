import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRefreshSafariOnResume } from './resume-sync.mjs';
const base = { active: true, hidden: false, focused: true, modalOpen: false,
  roundBusy: false, autoActive: false, pending: false, phase: 'ready' };
test('idle and focused Safari game can reconcile authoritative ETB balance', () => {
  assert.equal(shouldRefreshSafariOnResume(base), true);
});
for (const [key, value] of [
  ['active', false], ['hidden', true], ['focused', false], ['modalOpen', true],
  ['roundBusy', true], ['autoActive', true], ['pending', true],
  ['phase', 'uncertain'], ['phase', 'disconnected'], ['phase', 'settling'],
]) {
  test(`Safari foreground balance reconciliation is blocked when ${key}=${value}`, () => {
    assert.equal(shouldRefreshSafariOnResume({ ...base, [key]: value }), false);
  });
}
