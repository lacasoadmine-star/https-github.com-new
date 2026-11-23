import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuperWildsHttpHandler, HTTP_BASE } from './http.mjs';
import { createSuperWildsHttpTransport } from '../client/http-transport.mjs';
import { fixture } from './test-support.mjs';
import { GAME_ID } from './lifecycle.mjs';
const origin = 'https://isolated-http.invalid';
function host(options = {}) {
  const f = fixture(), received = [], delegated = [];
  const lifecycle = Object.fromEntries(['state','spin','takeWin'].map(name => [name, (...args) => {
    received.push({ name, request: args[0] }); return f.service[name](...args);
  }]));
  const handler = createSuperWildsHttpHandler({ lifecycle, assertWriteOrigin: request => request.headers.get('origin') === origin,
    existingFetch: async request => { delegated.push(request); return new Response('original host response', { status: 202 }); }, ...options });
  const fetchImpl = (url, init = {}) => handler(new Request(new URL(url, origin), { ...init,
    headers: { ...init.headers, origin, cookie: 'existing-authenticated-test-cookie' } }));
  return { f, handler, fetchImpl, received, delegated };
}
test('same-site HTTP facade carries one authoritative SPIN/TAKE and immutable replay through existing lifecycle', async () => {
  const h = host(), transport = createSuperWildsHttpTransport({ fetchImpl: h.fetchImpl });
  const state = await transport.state(), action = transport.prepare({ gameId: GAME_ID, action: 'SPIN',
    requestKey: 'abcdefab-cdef-4abc-8def-abcdefabcdef', betMinor: state.betLevelsMinor[0] });
  const spin = await transport.dispatch(action); assert.equal(spin.balanceMinor, 9900); assert.equal(spin.winMinor, 300);
  assert.deepEqual(await transport.recover(action), spin);
  assert.equal(h.f.snapshot().ledger.length, 1);
  const taken = await transport.dispatch({ gameId: GAME_ID, action: 'TAKE', requestKey: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', roundId: spin.roundId });
  assert.equal(taken.collected, true); assert.equal(taken.balanceMinor, 10200); assert.equal(h.f.snapshot().ledger.length, 2);
  assert.ok(h.received.every(row => row.request instanceof Request && row.request.headers.get('cookie') === 'existing-authenticated-test-cookie'));
});
test('lost HTTP reply recovers the original accepted key without another debit after model retirement', async () => {
  const h = host(); let drop = true;
  const transport = createSuperWildsHttpTransport({ fetchImpl: async (url, init) => {
    const response = await h.fetchImpl(url, init);
    if (url.endsWith('/spin') && drop) { drop = false; throw new Error('isolated response lost'); }
    return response;
  } });
  const state = await transport.state(), action = transport.prepare({ gameId: GAME_ID, action: 'SPIN', requestKey: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', betMinor: state.betLevelsMinor[0] });
  await assert.rejects(transport.dispatch(action), /isolated response lost/);
  h.f.controls.release = false; h.f.controls.modelAvailable = false;
  const result = await transport.recover(action); assert.equal(result.balanceMinor, 9900); assert.equal(h.f.snapshot().ledger.length, 1);
});
test('old route request and response are delegated byte-for-byte without consuming its POST body', async () => {
  const h = host(), request = new Request(origin + '/api/slots/spin', { method: 'POST', body: 'original payload' });
  const response = await h.handler(request); assert.equal(response.status, 202); assert.equal(await response.text(), 'original host response');
  assert.equal(h.delegated[0], request); assert.equal(await request.text(), 'original payload'); assert.equal(h.received.length, 0);
});
test('origin, method, type, length and malformed-body failures occur before financial callbacks', async () => {
  const h = host(), base = { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(h.f.action()) };
  const cases = [
    [{ ...base, headers: { 'content-type':'application/json', origin:'https://untrusted.invalid' } }, 403],
    [{ method:'GET' }, 405],
    [{ ...base, headers:{ origin, 'content-type':'text/plain' } }, 415],
    [{ ...base, body:'{' }, 400],
    [{ ...base, body: JSON.stringify({ gameId:GAME_ID, data:'x'.repeat(9000) }) }, 413],
  ];
  for (const [init, status] of cases) assert.equal((await h.handler(new Request(origin + HTTP_BASE + '/spin', init))).status, status);
  assert.equal(h.received.length, 0); assert.equal(h.f.snapshot().ledger.length, 0);
});
test('client-submitted grid authority cannot pass the server semantic action contract', async () => {
  const h = host(), response = await h.fetchImpl(HTTP_BASE + '/spin', { method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({ ...h.f.action(), grid:[['forged']] }) });
  assert.equal(response.status, 400); assert.equal((await response.json()).detail, 'SUPERWILDS_CLIENT_AUTHORITY_REJECTED');
  assert.equal(h.f.snapshot().ledger.length, 0);
});
test('unauthenticated state stays an error and cannot fall back to invented credits', async () => {
  const h = host(); h.f.controls.userId = null;
  const transport = createSuperWildsHttpTransport({ fetchImpl:h.fetchImpl });
  await assert.rejects(transport.state(), /PLAYER_LOGIN_REQUIRED/); assert.equal(h.f.snapshot().ledger.length, 0);
});
test('unexpected backend exceptions are redacted from public responses', async () => {
  const h = host({ lifecycle:{ state:()=>{throw Error('private SQL and credential details');}, spin(){}, takeWin(){} } });
  const response = await h.handler(new Request(origin + HTTP_BASE + '/state'));
  assert.equal(response.status, 503); assert.deepEqual(await response.json(), {detail:'SUPERWILDS_REQUEST_UNAVAILABLE'});
});
test('browser HTTP requests keep credentials on the same site and reject a login HTML response', async () => {
  const requests = [], transport = createSuperWildsHttpTransport({ fetchImpl:async (url,init) => {
    requests.push({url,init}); return new Response('<html>sign in</html>', {headers:{'content-type':'text/html'}});
  } });
  await assert.rejects(transport.state(), /SUPERWILDS_SERVER_RESPONSE_REQUIRED/);
  assert.equal(requests[0].url, HTTP_BASE + '/state'); assert.equal(requests[0].init.credentials, 'same-origin');
  assert.equal(requests[0].init.redirect, 'error');
});
