import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixture, clientSource, statePayload, serverState, STAKE_VALUES } from './fixture.mjs';

test('candidate differs only by tracking pending state reads and skipping overlapping quiet polls', () => {
  const original = clientSource('candidate')
    .replace('let pendingStateReads=0;\n', '')
    .replace(' if(quiet&&!afterAction&&pendingStateReads>0)return null;\n pendingStateReads++;\n', '')
    .replace(' }finally{pendingStateReads--;}\n', ' }\n');
  assert.equal(original, clientSource('baseline'));
});

test('successful states slower than the 1200ms poll connect instead of being discarded forever', async () => {
  const f = createFixture({ latency: 1940 });
  await f.clock.advance(6000);
  assert.equal(f.api.status.connected, true);
  assert.equal(f.api.status.authenticated, true);
  assert.equal(f.node('roundStatus').textContent, 'Ready');
  assert.equal(f.node('holdButton').disabled, false);
  assert.equal(f.calls.length, 3);
  assert.ok(!f.node('notice').textContent.includes('Sign in'));
});

test('the real state shape needs no authenticated flag to connect', async () => {
  const server = await serverState();
  assert.equal(server.status, 200);
  assert.equal(server.upstreamCalls, 1);
  const payload = server.body;
  assert.equal(Object.hasOwn(payload, 'authenticated'), false);
  const f = createFixture({ latency: 20, replies: [{ body: payload }] });
  f.pausePolling(); await f.clock.advance(20);
  assert.equal(f.api.status.connected, true);
  assert.equal(f.api.status.authenticated, true);
  assert.equal(f.node('holdButton').disabled, false);
});

test('quiet refresh during a pending state does not invalidate the pending result', async () => {
  const f = createFixture({ latency: 2000 });
  f.pausePolling();
  await f.clock.advance(1200);
  void f.api.loadState({ quiet: true });
  await f.clock.advance(800);
  assert.equal(f.calls.length, 1);
  assert.equal(f.api.status.connected, true);
});

test('manual refresh retains latest-response ordering when it supersedes a pending read', async () => {
  const f = createFixture({ replies: [
    { delay: 4000, body: statePayload({ balance: '1.00' }) },
    { delay: 100, body: statePayload({ balance: '2.00' }) },
  ] });
  f.pausePolling();
  await f.clock.advance(50);
  const refresh = f.api.loadState();
  await f.clock.advance(100); await refresh;
  assert.equal(f.api.status.balance, '2.00');
  await f.clock.advance(3850);
  assert.equal(f.api.status.balance, '2.00');
  assert.equal(f.calls.length, 2);
});

test('a fresh after-action read is not blocked by a stale pending pre-action read', async () => {
  const f = createFixture({ replies: [
    { delay: 4000, body: statePayload({ balance: '1.00' }) },
    { delay: 100, body: statePayload({ balance: '2.00' }) },
  ] });
  f.pausePolling(); await f.clock.advance(50);
  f.api.status.readGeneration++; f.api.status.working = true;
  const refresh = f.api.loadState({ quiet: true, afterAction: true });
  await f.clock.advance(100); assert.ok(await refresh);
  assert.equal(f.api.status.balance, '2.00');
  f.api.status.working = false; f.api.status.readGeneration++;
  await f.clock.advance(3850);
  assert.equal(f.api.status.balance, '2.00');
  assert.equal(f.calls.length, 2);
});

test('timed-out state read releases the poll guard so a later refresh can recover', async () => {
  const f = createFixture({ replies: [{ never: true }, { delay: 20 }] });
  f.pausePolling(); await f.clock.advance(5000);
  assert.equal(f.api.status.connected, false);
  assert.equal(f.calls[0].aborted, true);
  const refresh = f.api.loadState({ quiet: true });
  await f.clock.advance(20); assert.ok(await refresh);
  assert.equal(f.api.status.connected, true);
  assert.equal(f.calls.length, 2);
});

test('stale completion cannot release another pending read guard', async () => {
  const f = createFixture({ replies: [{ delay: 1000 }, { delay: 2500 }] });
  f.pausePolling(); await f.clock.advance(100);
  void f.api.loadState();
  await f.clock.advance(1000);
  void f.api.loadState({ quiet: true });
  assert.equal(f.calls.length, 2);
  await f.clock.advance(1500);
  assert.equal(f.api.status.connected, true);
});

test('401 and 403 state failures keep controls closed and do not create authentication', async () => {
  for (const identity of [{ authenticated: false }, { identityStatus: 403 }]) {
    const server = await serverState(identity);
    assert.ok([401, 403].includes(server.status));
    assert.equal(server.upstreamCalls, 0);
    const f = createFixture({ latency: 20, replies: [{ status: server.status, body: server.body }] });
    f.pausePolling(); await f.clock.advance(20);
    assert.equal(f.api.status.connected, false);
    assert.equal(f.api.status.authenticated, false);
    assert.equal(f.api.status.session, '');
    assert.equal(f.node('holdButton').disabled, true);
  }
});

test('invalid game identity, currency or session in a 200 response leaves play closed', async () => {
  for (const body of [
    statePayload({ game: { id: 'wrong-fixture' } }),
    statePayload({ currency: 'USD' }),
    statePayload({ sessionId: '' }),
  ]) {
    const f = createFixture({ latency: 20, replies: [{ body }] });
    f.pausePolling(); await f.clock.advance(20);
    assert.equal(f.api.status.connected, false);
    assert.equal(f.api.status.authenticated, false);
    assert.equal(f.node('holdButton').disabled, true);
  }
});

test('HTTP and parse failures release the guard and a manual Refresh retries correctly', async () => {
  for (const first of [{ status: 503, body: { error: 'RETRY_SAME_REQUEST' } }, { invalidJSON: true }, { reject: 'FIXTURE_OUTAGE' }]) {
    const f = createFixture({ latency: 20, replies: [first, {}] });
    f.pausePolling(); await f.clock.advance(20);
    assert.equal(f.api.status.connected, false);
    f.node('refresh').dispatch('click');
    await f.clock.advance(20);
    assert.equal(f.calls.length, 2);
    assert.equal(f.api.status.connected, true);
    assert.equal(f.node('holdButton').disabled, false);
  }
});

test('ordinary quiet reads remain blocked during an action', async () => {
  const f = createFixture({ latency: 20 });
  f.pausePolling(); await f.clock.advance(20);
  f.api.status.working = true; f.api.status.readGeneration++;
  await f.api.loadState({ quiet: true });
  assert.equal(f.calls.length, 1);
});

test('current 1–40000 ETB stake controls and wager-profile mismatch guard are preserved', async () => {
  const f = createFixture({ latency: 20 });
  f.pausePolling(); await f.clock.advance(20);
  assert.deepEqual(f.node('stake').options.map(option => option.value), STAKE_VALUES);
  assert.equal(f.node('stake').value, '1.00');
  assert.equal(f.node('minus').disabled, true);
  assert.equal(f.node('plus').disabled, false);
  f.node('stake').selectedIndex = STAKE_VALUES.length - 1;
  f.api.render();
  assert.equal(f.node('stake').value, '40000.00');
  assert.equal(f.node('plus').disabled, true);
  f.api.status.game.operatorWagerProfile.id = 'unsupported-fixture-profile';
  f.api.render();
  assert.equal(f.node('holdButton').disabled, true);
  assert.equal(f.node('stake').disabled, true);
  assert.equal(f.node('roundStatus').textContent, 'Refresh game settings');
});
