import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { ASSETS } from '../baseline/balloon-assets-20261108.mjs';
import { PINS, sha, currentPageHTML, CURRENT_CLIENT_PATH, CURRENT_DEPENDENCY_PATH } from '../fixture.mjs';

const source = readFileSync(new URL('./entry.mjs', import.meta.url), 'utf8');
const clientBytes = readFileSync(new URL('../candidate/balloon.js', import.meta.url));
const dependencyBytes = readFileSync(new URL('../candidate/wager-profile-client.mjs', import.meta.url));
const hash = PINS.candidate;
const prefix = '/native-library/balloon/20261121-state-r2/';
const assetPath = prefix + 'balloon.' + hash + '.js';
const assetKey = 'native72/zplay-balloon-state-20261121-r2/' + hash;
const dependencyPath = prefix + 'wager-profile-client.mjs';
const dependencyKey = 'native72/zplay-balloon-state-20261121-r2/' + PINS.dependency;
const zoomPath = '/native-library/remaining20/20261110-older-new-zoom-r1/zoom.js';
const retainedHTML = currentPageHTML.replace('</head>', '<script src="' + zoomPath + '"></script></head>');
const origin = 'https://player.example.test';
function fixture(options = {}) {
  const calls = [], reads = [];
  const previous = {
    async scheduled() { return 'retained-scheduled'; },
    async fetch(request, env, ctx) {
      calls.push({ request, env, ctx });
      if (options.previous) return options.previous(request);
      if (new URL(request.url).pathname === '/games/balloon_native') return new Response(retainedHTML, {
        headers: { 'content-type': 'text/html; charset=utf-8', 'content-length': '2781', etag: '"old-fixture"', 'content-security-policy': "default-src 'self'" },
      });
      return new Response('retained-route', { headers: { 'x-retained': 'true' } });
    },
  };
  const env = { PORTAL: 'player', SSG_OFFICIAL_REFERENCES: {
    async get(key, type) {
      reads.push({ key, type });
      if (options.storageError) throw new Error('fixture storage unavailable');
      if (Object.hasOwn(options, 'stored')) return options.stored;
      if (key === assetKey) return new Uint8Array(clientBytes).buffer;
      if (key === dependencyKey) return new Uint8Array(dependencyBytes).buffer;
      throw new Error('Unexpected fixture asset key');
    },
  }, ...options.env };
  const body = source
    .replace(/^import previous .*;\n/m, '')
    .replace(/^export \* .*;\n/m, '')
    .replace('export default {', 'return {');
  const handler = new vm.Script('(function(){\'use strict\';\n' + body + '\n})()').runInNewContext({
    previous, Response, Request, Headers, URL, ArrayBuffer, Uint8Array, crypto: webcrypto,
  });
  const ctx = {};
  return { handler, previous, env, ctx, calls, reads,
    run(path, method = 'GET', init = {}) {
      return handler.fetch(new Request(origin + path, { method, ...init }), env, ctx);
    } };
}

test('new client path and KV key bind the exact candidate bytes', () => {
  assert.equal(clientBytes.byteLength, 23399);
  assert.equal(sha(clientBytes), hash);
  assert.match(source, /^export \* from '\.\.\/native72deluxefix20261121\/entry\.mjs';$/m);
});

test('canonical GET changes only the script reference and preserves existing page policy', async () => {
  const f = fixture(), response = await f.run('/games/balloon_native');
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(html.replace('src="' + assetPath + '"', 'src="' + CURRENT_CLIENT_PATH + '"'), retainedHTML);
  assert.ok(html.includes('<script type="module" src="' + assetPath + '"'));
  assert.ok(html.includes('src="' + zoomPath + '"'));
  assert.ok(html.includes('value="1.00"') && html.includes('value="40000.00"'));
  assert.ok(!html.includes('value="0.10"'));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('content-security-policy'), "default-src 'self'");
  assert.equal(response.headers.has('etag'), false);
  assert.equal(response.headers.has('content-length'), false);
  assert.equal(f.calls.length, 1);
  assert.equal(f.reads.length, 0);
});

test('canonical HEAD validates the retained GET template and returns no body', async () => {
  const f = fixture(), response = await f.run('/games/balloon_native', 'HEAD');
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].request.method, 'GET');
  assert.equal(f.reads.length, 0);
});

test('new immutable asset GET and HEAD each perform one verified storage read', async () => {
  for (const method of ['GET', 'HEAD']) {
    const f = fixture(), response = await f.run(assetPath, method);
    assert.equal(response.status, 200);
    assert.deepEqual(f.reads, [{ key: assetKey, type: 'arrayBuffer' }]);
    assert.equal(f.calls.length, 0);
    assert.equal(response.headers.get('x-zplay-balloon-ui-sha256'), hash);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    const body = new Uint8Array(await response.arrayBuffer());
    assert.equal(body.length, method === 'HEAD' ? 0 : clientBytes.byteLength);
    if (method === 'GET') assert.equal(sha(body), hash);
  }
});

test('unchanged relative wager-profile dependency resolves under the new immutable prefix', async () => {
  assert.ok(clientBytes.toString().startsWith("import {supportsWagerProfile} from './wager-profile-client.mjs';\n"));
  assert.equal(new URL('./wager-profile-client.mjs', origin + assetPath).pathname, dependencyPath);
  assert.equal(dependencyBytes.byteLength, 1661);
  assert.equal(sha(dependencyBytes), PINS.dependency);
  for (const method of ['GET', 'HEAD']) {
    const f = fixture(), response = await f.run(dependencyPath, method);
    assert.equal(response.status, 200);
    assert.deepEqual(f.reads, [{ key: dependencyKey, type: 'arrayBuffer' }]);
    assert.equal(response.headers.get('x-zplay-balloon-ui-sha256'), PINS.dependency);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    const body = new Uint8Array(await response.arrayBuffer());
    if (method === 'GET') assert.equal(sha(body), PINS.dependency);
    else assert.equal(body.byteLength, 0);
  }
  const missing = fixture({ stored: null }), response = await missing.run(dependencyPath);
  assert.equal(response.status, 503);
  assert.equal(missing.calls.length, 0);
});

test('missing, wrong-size, corrupt and unavailable new assets return explicit no-store errors', async () => {
  const corrupt = new Uint8Array(clientBytes); corrupt[0] ^= 1;
  for (const options of [
    { stored: null }, { stored: new ArrayBuffer(1) }, { stored: corrupt.buffer },
    { storageError: true }, { env: { SSG_OFFICIAL_REFERENCES: undefined } },
  ]) {
    const f = fixture(options), response = await f.run(assetPath);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { error: 'BALLOON_UI_ASSET_UNAVAILABLE' });
    assert.equal(f.calls.length, 0);
  }
});

test('unknown new asset or unsupported method never falls back to old code', async () => {
  for (const [path, method, status] of [[prefix + 'missing.js', 'GET', 404], [assetPath, 'POST', 405]]) {
    const f = fixture(), response = await f.run(path, method);
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(f.reads.length, 0);
    assert.equal(f.calls.length, 0);
  }
});

test('unexpected retained HTML fails visibly without substituting a stale page', async () => {
  for (const html of ['<html>missing script</html>', ASSETS['index.html'], retainedHTML + '<script src="' + CURRENT_CLIENT_PATH + '"></script>']) {
    const f = fixture({ previous: async () => new Response(html, { headers: { 'content-type': 'text/html' } }) });
    const response = await f.run('/games/balloon_native');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'BALLOON_UI_SOURCE_MISMATCH' });
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('old assets, other games and existing API actions delegate without reading their bodies', async () => {
  for (const [path, method] of [
    ['/native-library/balloon/v1/balloon.js', 'GET'],
    [CURRENT_CLIENT_PATH, 'GET'], [CURRENT_DEPENDENCY_PATH, 'GET'],
    ['/games/multi_hot_5_deluxe_native', 'GET'], ['/games/multihot40_native', 'GET'],
    ['/api/library/state?game_id=balloon_native', 'GET'], ['/api/library/action', 'POST'],
  ]) {
    const f = fixture(), request = new Request(origin + path, { method, ...(method === 'POST' ? { body: 'fixture-action-body' } : {}) });
    const response = await f.handler.fetch(request, f.env, f.ctx);
    assert.equal(await response.text(), 'retained-route');
    assert.equal(f.calls[0].request, request);
    assert.equal(request.bodyUsed, false);
    assert.equal(f.calls[0].env, f.env);
    assert.equal(f.calls[0].ctx, f.ctx);
    assert.equal(f.reads.length, 0);
  }
});

test('non-player portals, upstream failures and scheduled behavior remain delegated', async () => {
  const f = fixture({ env: { PORTAL: 'admin' } });
  assert.equal(await (await f.run(assetPath)).text(), 'retained-route');
  assert.equal(f.reads.length, 0);
  assert.equal(await f.handler.scheduled(), 'retained-scheduled');
  const failed = fixture({ previous: async () => new Response('identity failure fixture', { status: 401 }) });
  const response = await failed.run('/games/balloon_native');
  assert.equal(response.status, 401);
  assert.equal(await response.text(), 'identity failure fixture');
});
