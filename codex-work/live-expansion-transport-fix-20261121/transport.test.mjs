import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  fixture, makeRequest, source, hash, workersRequest, FIXTURE_SECRET,
  FIXTURE_COOKIE, ENGINE_ORIGIN, PLAYER_ORIGIN, gameId,
} from './fixture.mjs';

test('pinned candidates change only redirect mode and explicit redirect rejection', () => {
  for (const kind of ['expansion', 'balloon']) {
    const restored = source(kind)
      .replace("redirect:'manual'", "redirect:'error'")
      .replace("   // Workers accepts manual/follow only; never forward signed requests to a redirect target.\n", '')
      .replace("   if(response.status>=300&&response.status<400){try{await response.body?.cancel();}catch{}return json({error:'RETRY_SAME_REQUEST'},503);}\n", '');
    assert.equal(restored, source(kind, 'baseline'));
  }
});

test('recorded Workers constructor constraint rejects error and accepts manual', () => {
  assert.throws(() => workersRequest(ENGINE_ORIGIN, { redirect: 'error' }), /Invalid redirect value/);
  assert.equal(workersRequest(ENGINE_ORIGIN, { redirect: 'manual' }).redirect, 'manual');
});

test('retained signer matches deterministic HMAC without changing authentication', async () => {
  const { sign } = fixture('expansion');
  const time = 1795290000000, path = '/v2/library/state?game_id=multihot40_native', user = '@session:' + hash(FIXTURE_COOKIE);
  const headers = await sign(FIXTURE_SECRET, user, 'GET', path, '', time);
  const encoded = ['GET', path, String(time), user, hash('')].join('\n');
  assert.equal(headers['x-native-signature'], createHmac('sha256', FIXTURE_SECRET).update(encoded).digest('hex'));
  assert.equal(headers['x-native-user'], user);
  assert.equal(headers['x-native-time'], String(time));
});

for (const kind of ['expansion', 'balloon']) {
  test(kind + ': authenticated state makes one correctly signed request and returns the current state', async () => {
    const f = fixture(kind), request = makeRequest(kind), response = await f.run(request), body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.fixture, true);
    assert.match(body.sessionId, /^[a-f0-9]{64}$/);
    if (kind === 'expansion') assert.equal(body.authenticated, true);
    assert.equal(f.calls.length, 1);
    const call = f.calls[0], path = '/v2/library/state?game_id=' + gameId(kind);
    assert.equal(call.input, ENGINE_ORIGIN + path);
    assert.equal(call.request.redirect, 'manual');
    assert.equal(call.request.method, 'GET');
    assert.equal(call.init.signal, request.signal);
    assert.equal(call.request.headers.has('cookie'), false);
    assert.equal(call.request.headers.has('authorization'), false);
    assert.equal(call.request.headers.get('x-native-user'), '@session:' + hash(FIXTURE_COOKIE));
    const time = call.request.headers.get('x-native-time');
    const encoded = ['GET', path, time, '@session:' + hash(FIXTURE_COOKIE), hash('')].join('\n');
    assert.equal(call.request.headers.get('x-native-signature'), createHmac('sha256', FIXTURE_SECRET).update(encoded).digest('hex'));
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(f.previousCalls.length, 1);
    assert.equal(new URL(f.previousCalls[0].url).pathname, '/api/machine-session');
  });
}

test('expansion history preserves game, sort, signature and single-call behavior', async () => {
  const f = fixture('expansion'), response = await f.run(makeRequest('expansion', 'history', { sort: 'wins' }));
  assert.equal(response.status, 200);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].input, ENGINE_ORIGIN + '/v2/library/history?game_id=multihot40_native&sort=wins');
});

test('both action routes preserve exact request body and never replay or place another request', async () => {
  for (const kind of ['expansion', 'balloon']) {
    const raw = '{ "game_id": "' + gameId(kind) + '", "request_id":"fixture-token", "action":"start", "stake":"5.00" }';
    const f = fixture(kind), response = await f.run(makeRequest(kind, 'action', { body: raw }));
    assert.equal(response.status, 200);
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].input, ENGINE_ORIGIN + '/v2/library/action');
    assert.equal(f.calls[0].request.method, 'POST');
    assert.equal(await f.calls[0].request.text(), raw);
    assert.equal(f.calls[0].request.headers.get('content-type'), 'application/json');
  }
});

test('both routes reject every 3xx without following Location or exposing redirect content', async () => {
  for (const kind of ['expansion', 'balloon']) for (const status of [300, 301, 302, 303, 304, 305, 307, 308]) {
    let cancelled = 0;
    const f = fixture(kind, { upstream: async () => new Response(status === 304 ? null : new ReadableStream({
      cancel() { cancelled++; },
    }), { status, headers: { location: 'https://redirect.example.test/private', 'content-type': 'application/json' } }) });
    const response = await f.run(), body = await response.json();
    assert.equal(f.calls.length, 1);
    assert.equal(response.status, 503);
    assert.deepEqual(body, { error: 'RETRY_SAME_REQUEST' });
    assert.equal(response.headers.has('location'), false);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(cancelled, status === 304 ? 0 : 1);
  }
});

test('redirect body cancellation failure cannot conceal the explicit no-store failure', async () => {
  const f = fixture('expansion', { upstream: async () => new Response(new ReadableStream({
    cancel() { throw new Error('fixture cancel failure'); },
  }), { status: 307 }) });
  const response = await f.run();
  assert.equal(f.calls.length, 1);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'RETRY_SAME_REQUEST' });
});

test('network errors retain the same retry response with no second attempt', async () => {
  for (const kind of ['expansion', 'balloon']) {
    const f = fixture(kind, { upstream: async () => { throw new Error('fixture transport outage'); } });
    const response = await f.run();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'RETRY_SAME_REQUEST' });
    assert.equal(f.calls.length, 1);
  }
});

test('ordinary upstream JSON errors retain original status and payload', async () => {
  for (const kind of ['expansion', 'balloon']) {
    const f = fixture(kind, { upstream: async () => Response.json({ error: 'FIXTURE_UPSTREAM_UNAVAILABLE' }, { status: 503 }) });
    const response = await f.run();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'FIXTURE_UPSTREAM_UNAVAILABLE' });
    assert.equal(f.calls.length, 1);
  }
});

test('non-JSON upstream response remains an explicit engine response error', async () => {
  for (const kind of ['expansion', 'balloon']) {
    const f = fixture(kind, { upstream: async () => new Response('fixture non-json', { status: 200 }) });
    const response = await f.run();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'INVALID_ENGINE_RESPONSE' });
    assert.equal(f.calls.length, 1);
  }
});

test('anonymous requests remain unauthorized without contacting identity or engine', async () => {
  for (const kind of ['expansion', 'balloon']) {
    const f = fixture(kind), response = await f.run(makeRequest(kind, 'state', { headers: { cookie: null } }));
    assert.equal(response.status, 401);
    assert.equal(f.calls.length, 0);
    assert.equal(f.previousCalls.length, 0);
  }
});

test('identity rejection is preserved and never reaches engine', async () => {
  for (const kind of ['expansion', 'balloon']) {
    const f = fixture(kind, { identity: async () => Response.json({ error: 'FIXTURE_IDENTITY_UNAVAILABLE' }, { status: 503 }) });
    const response = await f.run();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'FIXTURE_IDENTITY_UNAVAILABLE' });
    assert.equal(f.calls.length, 0);
  }
});

test('wrong origin or changed library session still prevents actions', async () => {
  for (const kind of ['expansion', 'balloon']) {
    const header = kind === 'balloon' ? 'X-Zplay-Balloon-Session' : 'X-Zplay-Library-Session';
    for (const headers of [{ origin: 'https://wrong.example.test' }, { [header]: 'fixture-wrong-session' }]) {
      const f = fixture(kind), response = await f.run(makeRequest(kind, 'action', { headers }));
      assert.equal(response.status, 403);
      assert.equal(f.calls.length, 0);
      assert.equal(f.previousCalls.length, 0);
    }
  }
});

test('oversized and malformed actions retain existing rejection before engine access', async () => {
  for (const kind of ['expansion', 'balloon']) for (const [body, status] of [['{not-json', 400], ['x'.repeat(8193), 413]]) {
    const f = fixture(kind), response = await f.run(makeRequest(kind, 'action', { body }));
    assert.equal(response.status, status);
    assert.equal(f.calls.length, 0);
    assert.equal(f.previousCalls.length, 0);
  }
});

test('wrong methods, invalid game and invalid history sort remain rejected', async () => {
  for (const kind of ['expansion', 'balloon']) {
    const f = fixture(kind), wrongMethod = await f.run(makeRequest(kind, 'state', { method: 'DELETE' }));
    assert.equal(wrongMethod.status, 405);
    const wrongGame = await f.run(makeRequest(kind, 'state', { gameId: 'unregistered_fixture' }));
    assert.equal(wrongGame.status, 422);
    assert.equal(f.calls.length, 0);
  }
  const f = fixture('expansion'), invalidSort = await f.run(makeRequest('expansion', 'history', { sort: 'invalid' }));
  assert.equal(invalidSort.status, 422);
  assert.equal(f.calls.length, 0);
});

test('other portal and unrelated legacy paths delegate unchanged', async () => {
  for (const kind of ['expansion', 'balloon']) {
    const f = fixture(kind, { env: { PORTAL: 'admin' } }), request = makeRequest(kind);
    const response = await f.run(request);
    assert.deepEqual(await response.json(), { legacy: true });
    assert.equal(f.previousCalls[0], request);
    assert.equal(f.calls.length, 0);
    const legacy = fixture(kind), original = new Request(PLAYER_ORIGIN + '/api/unrelated');
    assert.deepEqual(await (await legacy.run(original)).json(), { legacy: true });
    assert.equal(legacy.previousCalls[0], original);
    assert.equal(legacy.calls.length, 0);
  }
});
