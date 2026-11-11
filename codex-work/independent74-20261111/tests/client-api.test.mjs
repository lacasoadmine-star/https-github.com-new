import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStake, formatMinor, inputMinor, request, ApiError} from '../client/api.mjs';

test('money input keeps exact integer minor units beyond Number precision', () => {
  assert.equal(parseStake('1'), '100');
  assert.equal(parseStake('0.05'), '5');
  assert.equal(parseStake('123456789012345678901.99'), '12345678901234567890199');
  for (const invalid of ['-1', '+1', '1e3', 'NaN', 'Infinity', '1.234', '1,000', '']) {
    assert.equal(parseStake(invalid), null, invalid);
  }
  assert.equal(inputMinor('12345678901234567890199'), '123456789012345678901.99');
  assert.equal(formatMinor('12345', 'ETB'), '123.45 ETB');
});

test('request sends one exact POST and does not retry an unknown result', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({url, options});
    throw new TypeError('connection closed after send');
  };
  try {
    await assert.rejects(request('action', {method: 'POST', body: {stake_minor: '100'}}), error => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.ambiguous, true);
      return true;
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/independent74/api/action');
    assert.equal(calls[0].options.credentials, 'same-origin');
    assert.equal(calls[0].options.redirect, 'error');
    assert.equal(calls[0].options.body, '{"stake_minor":"100"}');
  } finally { globalThis.fetch = original; }
});

test('financial POST 5xx and unreadable responses stay ambiguous', async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [
      new Response('{"error":"ACCOUNT_UNAVAILABLE"}', {status: 503, headers: {'content-type': 'application/json'}}),
      new Response('invalid json', {status: 200, headers: {'content-type': 'application/json'}}),
      new Response('<h1>Proxy error</h1>', {status: 502, headers: {'content-type': 'text/html'}}),
    ]) {
      globalThis.fetch = async () => response;
      await assert.rejects(request('action', {method: 'POST', body: {}}), e => e instanceof ApiError && e.ambiguous);
    }
  } finally { globalThis.fetch = original; }
});

test('rejected unauthenticated action is not treated as a successful round', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"ok":false,"error":"AUTH_REQUIRED"}', {status: 401, headers: {'content-type': 'application/json'}});
  try {
    await assert.rejects(request('action', {method: 'POST', body: {}}), e => e instanceof ApiError && e.code === 'AUTH_REQUIRED' && !e.ambiguous);
  } finally { globalThis.fetch = original; }
});
