import test from 'node:test';
import assert from 'node:assert/strict';
import { createSameOriginTransport } from './round-recovery.mjs';
const path = '/api/slots/fresh-state?gameId=new72_recovery_fixture';
const pendingBody = signal => ({ status: 200, ok: true, headers: new Headers(),
  json: () => new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error('aborted'));
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }) });
test('timeout while reading response body is not invalid JSON', async () => {
  const request = createSameOriginTransport({ timeoutMs: 10,
    fetcher: async (_, options) => pendingBody(options.signal) });
  await assert.rejects(request(path), { code: 'REQUEST_TIMEOUT', status: 0 });
});
test('caller abort while reading response body is cancellation', async () => {
  const controller = new AbortController();
  const request = createSameOriginTransport({ fetcher: async (_, options) => {
    queueMicrotask(() => controller.abort());
    return pendingBody(options.signal);
  } });
  await assert.rejects(request(path, undefined, { signal: controller.signal }), { code: 'REQUEST_ABORTED', status: 0 });
});
test('pre-aborted operation never invokes transport', async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  const request = createSameOriginTransport({ fetcher: async () => { calls++; return Response.json({ ok: true }); } });
  await assert.rejects(request(path, undefined, { signal: controller.signal }), { code: 'REQUEST_ABORTED' });
  assert.equal(calls, 0);
});
test('transport ignoring abort cannot deliver a late result', async () => {
  const controller = new AbortController();
  const request = createSameOriginTransport({ fetcher: async () => {
    return { status: 200, ok: true, headers: new Headers(), json: async () => {
      controller.abort(); return { ok: true };
    } };
  } });
  await assert.rejects(request(path, undefined, { signal: controller.signal }), { code: 'REQUEST_ABORTED' });
});
test('ordinary malformed JSON remains an invalid server response', async () => {
  const request = createSameOriginTransport({ fetcher: async () => new Response('bad JSON', { status: 200 }) });
  await assert.rejects(request(path), { code: 'INVALID_SERVER_RESPONSE', status: 200 });
});
test('valid response succeeds', async () => {
  const request = createSameOriginTransport({ fetcher: async () => Response.json({ ok: true }) });
  assert.deepEqual(await request(path), { ok: true });
});
