import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFERRED_PATHS } from './backend/deferred-protocol.mjs';
import { mountFixture, until, flush } from './tests/main-entry-harness.mjs';

test('hosted AUTO starts through its open modal and stops after exactly the selected 25 accepted rounds', async t => {
  const h = await mountFixture(); t.after(() => h.app.dispose());
  await h.startAuto();
  await until(() => h.posts.length === 1, 'AUTO modal must permit the first hosted SPIN');
  await until(() => h.app.renderer.snapshot.phase === 'SETTLING');
  assert.equal(h.app.snapshot.autoRemaining, 24);
  for (let count = 1; count <= 25; count++) {
    assert.equal(h.posts.length, count); assert.equal(h.app.snapshot.autoRemaining, 25 - count);
    await h.finish();
    if (count < 25) await until(() => h.app.renderer.snapshot.phase === 'SETTLING' && h.posts.length === count + 1);
  }
  await flush();
  assert.equal(h.posts.length, 25); assert.equal(h.accepted.size, 25);
  assert.equal(h.app.snapshot.autoRunning, false); assert.equal(h.app.snapshot.autoRemaining, 0);
  assert.equal(new Set(h.posts.map(row => row.body.roundToken)).size, 25);
});

test('AUTO cannot be started by a stale start action outside its visible selection dialog', async t => {
  const h = await mountFixture(); t.after(() => h.app.dispose());
  await h.app.action('auto-start'); await flush();
  assert.equal(h.posts.length, 0); assert.equal(h.app.snapshot.autoRunning, false);
});

test('BET and fresh AUTO stay disabled while a received result is still animating', async t => {
  const h = await mountFixture(); t.after(() => h.app.dispose());
  await h.app.action('spin');
  assert.equal(h.app.renderer.snapshot.phase, 'SETTLING');
  assert.equal(h.buttons.get('bet').disabled, true); assert.equal(h.buttons.get('auto').disabled, true);
  await h.app.action('bet'); assert.equal(h.app.controls.snapshot.modal, null);
  await h.app.action('auto'); assert.equal(h.app.controls.snapshot.modal, null);
  await h.app.action('spin'); assert.equal(h.posts.length, 1); assert.equal(h.app.renderer.snapshot.stopRequested, true);
  await h.finish();
  assert.equal(h.buttons.get('bet').disabled, false); assert.equal(h.buttons.get('auto').disabled, false);
});

test('AUTO stop before a pending hosted reply preserves that request and does not restart at presentation end', async t => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const h = await mountFixture({ before: async (path, body) => { if (path === DEFERRED_PATHS.spin && body) await gate; } });
  t.after(() => { release(); h.app.dispose(); });
  await h.startAuto(); await until(() => h.posts.length === 1);
  const key = h.posts[0].body.roundToken;
  await h.app.action('auto'); assert.equal(h.app.snapshot.autoRunning, false);
  release(); await until(() => h.app.renderer.snapshot.phase === 'SETTLING');
  assert.equal(h.app.controls.snapshot.round.requestKey, key);
  await h.finish(); assert.equal(h.posts.length, 1);
});

test('a lost accepted hosted reply stops AUTO and keeps its key for replay-only recovery', async t => {
  let fail = true;
  const h = await mountFixture({ after: async (path, body, result) => {
    if (path === DEFERRED_PATHS.spin && !body.replayOnly && fail) {
      fail = false; throw Object.assign(new Error('NETWORK_UNAVAILABLE'), { code: 'NETWORK_UNAVAILABLE', status: 0 });
    }
    return result;
  } });
  t.after(() => h.app.dispose());
  await h.startAuto(); await until(() => h.app.controller.snapshot.phase === 'PENDING' && !h.app.controller.snapshot.busy);
  assert.equal(h.app.snapshot.autoRunning, false); assert.equal(h.accepted.size, 1);
  const key = h.posts[0].body.roundToken;
  await h.app.controller.recover(); h.app.sync();
  assert.equal(h.posts.length, 2); assert.equal(h.posts[1].body.replayOnly, true); assert.equal(h.posts[1].body.roundToken, key);
  await h.finish(); assert.equal(h.accepted.size, 1); assert.equal(h.posts.length, 2);
});

test('hiding and restoring the page never resumes an old AUTO run', async t => {
  const h = await mountFixture(); t.after(() => h.app.dispose());
  await h.startAuto(); await until(() => h.app.renderer.snapshot.phase === 'SETTLING');
  h.document.hidden = true; h.document.emit('visibilitychange');
  assert.equal(h.app.snapshot.autoRunning, false);
  await h.finish(); h.document.hidden = false; h.document.emit('visibilitychange'); await flush();
  assert.equal(h.posts.length, 1); assert.equal(h.app.snapshot.autoRunning, false);
});

test('a window blur stops future AUTO requests while retaining the accepted result', async t => {
  const h = await mountFixture(); t.after(() => h.app.dispose());
  await h.startAuto(); await until(() => h.app.renderer.snapshot.phase === 'SETTLING');
  h.window.emit('blur'); await h.finish();
  assert.equal(h.posts.length, 1); assert.equal(h.app.snapshot.autoRunning, false);
});

test('controller disconnect immediately clears AUTO; late presentation cannot submit another request', async t => {
  const h = await mountFixture(); t.after(() => h.app.dispose());
  await h.startAuto(); await until(() => h.app.renderer.snapshot.phase === 'SETTLING');
  h.app.controller.disconnect(); assert.equal(h.app.snapshot.autoRunning, false);
  await h.finish(); assert.equal(h.posts.length, 1);
});

test('session change detected at result refresh stops AUTO and keeps new requests closed', async t => {
  const h = await mountFixture(); t.after(() => h.app.dispose());
  await h.startAuto(); await until(() => h.app.renderer.snapshot.phase === 'SETTLING');
  h.changeSession(); await h.finish();
  assert.equal(h.app.controller.snapshot.phase, 'AUTH_REQUIRED'); assert.equal(h.posts.length, 1);
  assert.equal(h.app.snapshot.autoRunning, false);
});

test('default-disabled hosted integration cannot initiate manual or AUTO rounds', async t => {
  const h = await mountFixture({ allowNewRounds: false }); t.after(() => h.app.dispose());
  await h.app.action('spin'); await h.startAuto(); await flush();
  assert.equal(h.posts.length, 0); assert.equal(h.app.snapshot.autoRunning, false);
});
