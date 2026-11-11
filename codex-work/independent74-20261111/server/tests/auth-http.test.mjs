import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson, parseJsonBody, readRequestBody, sha256, signatureMessage, verifyNativeRequest } from '../auth.mjs';
import { createHttpHandler } from '../http.mjs';
import { createGameService } from '../service.mjs';
import { MemoryRepository } from './support/memory-repository.mjs';
import { GAME_ID } from '../../math/mine-island2.mjs';

const secret = 'local-test-only-secret-never-production';
const sessionHash = 'a'.repeat(64);
const subject = '@session:' + sessionHash;
const now = 1794355200000;
async function signedRequest(path, { method = 'GET', body = '', timestamp = String(now), headers = {}, useSecret = secret } = {}) {
  const bodyBytes = new TextEncoder().encode(body);
  const message = signatureMessage({ method, path, timestamp, subject, bodyHash: await sha256(bodyBytes) });
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(useSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
  const signature = Array.from(digest, value => value.toString(16).padStart(2, '0')).join('');
  return new Request('https://account.internal' + path, { method, headers: { 'x-native-user': subject, 'x-native-time': timestamp, 'x-native-signature': signature, ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, ...(method === 'POST' ? { body } : {}) });
}
async function verifies(request, clock = now) { return verifyNativeRequest(request, await readRequestBody(request), { secret, now: clock }); }
async function rejectsCode(promise, code) { await assert.rejects(promise, error => error.code === code); }
function handler(repository = new MemoryRepository()) {
  if (!repository.sessions.has(sessionHash)) repository.addAccount(sessionHash, { balanceMinor: '10000' });
  return createHttpHandler({ service: createGameService({ repository, rng: () => 0 }), secret, now: () => now, allowTestLedger: true, enableNewRounds: true, log: () => {} });
}

test('valid HMAC binds method, exact query, timestamp, session subject and raw body', async () => {
  const req = await signedRequest('/v1/independent74/action', { method: 'POST', body: '{"type":"play"}' });
  const principal = await verifies(req); assert.equal(principal.sessionHash, sessionHash);
});

test('different body invalidates a previously signed request', async () => {
  const signed = await signedRequest('/v1/independent74/action', { method: 'POST', body: '{"stake_minor":"100"}' });
  const changed = new Request(signed.url, { method: 'POST', headers: signed.headers, body: '{"stake_minor":"200"}' });
  await rejectsCode(verifies(changed), 'UNAUTHORIZED');
});

test('different path or query invalidates the signature', async () => {
  const signed = await signedRequest('/v1/independent74/state?game_id=' + GAME_ID);
  const changed = new Request('https://account.internal/v1/independent74/history?game_id=' + GAME_ID, { headers: signed.headers });
  await rejectsCode(verifies(changed), 'UNAUTHORIZED');
  const query = new Request(signed.url + '&x=1', { headers: signed.headers });
  await rejectsCode(verifies(query), 'UNAUTHORIZED');
});

test('wrong secret, missing headers and malformed subjects are rejected', async () => {
  await rejectsCode(verifies(await signedRequest('/v1/independent74/state', { useSecret: 'different-local-test-secret' })), 'UNAUTHORIZED');
  await rejectsCode(verifies(new Request('https://account.internal/v1/independent74/state')), 'UNAUTHORIZED');
  await rejectsCode(verifies(await signedRequest('/v1/independent74/state', { headers: { 'x-native-user': '@session:not-a-digest' } })), 'UNAUTHORIZED');
});

test('expired and excessively future timestamps are rejected', async () => {
  await rejectsCode(verifies(await signedRequest('/v1/independent74/state', { timestamp: String(now - 30001) })), 'SIGNATURE_EXPIRED');
  await rejectsCode(verifies(await signedRequest('/v1/independent74/state', { timestamp: String(now + 30001) })), 'SIGNATURE_EXPIRED');
  await verifies(await signedRequest('/v1/independent74/state', { timestamp: String(now - 30000) }));
});

test('declared and actual body sizes are bounded', async () => {
  await rejectsCode(readRequestBody(new Request('https://account.internal', { method: 'POST', headers: { 'content-length': '9000' }, body: '{}' })), 'BODY_TOO_LARGE');
  await rejectsCode(readRequestBody(new Request('https://account.internal', { method: 'POST', body: 'x'.repeat(8193) })), 'BODY_TOO_LARGE');
});

test('invalid UTF-8, invalid JSON and arrays cannot become actions', () => {
  assert.throws(() => parseJsonBody(Uint8Array.of(255)), error => error.code === 'INVALID_JSON');
  assert.throws(() => parseJsonBody(new TextEncoder().encode('[')), error => error.code === 'INVALID_JSON');
  assert.throws(() => parseJsonBody(new TextEncoder().encode('[]')), error => error.code === 'INVALID_JSON');
});

test('canonical payload hashes ignore object insertion order without changing array order', () => {
  assert.equal(canonicalJson({ b: 2, a: { d: 4, c: 3 } }), canonicalJson({ a: { c: 3, d: 4 }, b: 2 }));
  assert.notEqual(canonicalJson({ a: [1, 2] }), canonicalJson({ a: [2, 1] }));
});

test('HTTP state verifies signed auth and returns real repository balance', async () => {
  const response = await handler()(await signedRequest('/v1/independent74/state?game_id=' + GAME_ID));
  assert.equal(response.status, 200); const value = await response.json();
  assert.equal(value.wallet.balance_minor, '10000'); assert.equal(value.game.id, GAME_ID); assert.equal(value.activeRound, null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('HTTP action and explicit same-ID retry debit exactly once', async () => {
  const handle = handler();
  const body = JSON.stringify({ request_id: crypto.randomUUID(), game_id: GAME_ID, type: 'play', stake_minor: '100' });
  const first = await handle(await signedRequest('/v1/independent74/action', { method: 'POST', body }));
  const second = await handle(await signedRequest('/v1/independent74/action', { method: 'POST', body }));
  assert.equal(first.status, 200); assert.equal(second.status, 200);
  const result = await second.json(); assert.equal(result.replayed, true); assert.equal(result.wallet.balance_minor, '9900');
});

test('HTTP failures preserve status taxonomy and never expose private errors', async () => {
  const repository = new MemoryRepository(); repository.addAccount(sessionHash);
  repository.beforeCommit = () => { throw new Error('database password=SECRET'); };
  const response = await handler(repository)(await signedRequest('/v1/independent74/state?game_id=' + GAME_ID));
  assert.equal(response.status, 503); const text = await response.text();
  assert.match(text, /WALLET_UNAVAILABLE/); assert.doesNotMatch(text, /SECRET|password/);
});

test('no signed session and incorrect HTTP method fail without a financial call', async () => {
  const handle = handler();
  assert.equal((await handle(new Request('https://account.internal/v1/independent74/state'))).status, 401);
  assert.equal((await handle(new Request('https://account.internal/v1/independent74/action'))).status, 405);
  assert.equal((await handle(await signedRequest('/v1/independent74/state?game_id=' + GAME_ID + '&extra=1'))).status, 400);
});

test('health reports financial disabled for fixture-backed service', async () => {
  const response = await handler()(new Request('https://account.internal/healthz'));
  assert.deepEqual(await response.json(), { ok: true, service: 'superwin-independent74', financial_enabled: false });
});

test('default HTTP handler refuses financial actions even with a working repository', async () => {
  const repository = new MemoryRepository(); repository.addAccount(sessionHash, { balanceMinor: '10000' });
  const handle = createHttpHandler({ service: createGameService({ repository }), secret, now: () => now, log: () => {} });
  const body = JSON.stringify({ request_id: crypto.randomUUID(), game_id: GAME_ID, type: 'play', stake_minor: '100' });
  const response = await handle(await signedRequest('/v1/independent74/action', { method: 'POST', body }));
  assert.equal(response.status, 503); assert.equal((await response.json()).error.code, 'LEDGER_NOT_VERIFIED');
  assert.equal(repository.snapshot(sessionHash).balanceMinor, '10000');
});

test('disabling new rounds preserves collection for a previously verified active round', async () => {
  const repository = new MemoryRepository(); repository.addAccount(sessionHash, { balanceMinor: '10000' });
  const service = createGameService({ repository, rng: () => 0 });
  const started = await service.action(sessionHash, { request_id: crypto.randomUUID(), game_id: GAME_ID, type: 'play', stake_minor: '100' });
  const handle = createHttpHandler({ service, secret, now: () => now, productionLedgerVerified: true, enableNewRounds: false, log: () => {} });
  const body = JSON.stringify({ request_id: crypto.randomUUID(), game_id: GAME_ID, type: 'collect', round_id: started.round.id, expected_version: started.round.version });
  const response = await handle(await signedRequest('/v1/independent74/action', { method: 'POST', body }));
  assert.equal(response.status, 200); assert.equal((await response.json()).wallet.balance_minor, '10010');
});
