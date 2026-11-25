import test from 'node:test';
import assert from 'node:assert/strict';
import { createReferenceLobbyLayer, assetPath, PREVIEW_PATH, sha256 } from './lobby-layer.mjs';

const release = 'a'.repeat(64);
const encode = text => new TextEncoder().encode(text);
async function fixture(options = {}) {
  const bodies = { 'index.html': encode('<!doctype html><html><head><title>Reference lobby</title></head><body><a href="#all">Home</a></body></html>'), 'lobby.mjs': encode('export const ready=true;') };
  const assets = await Promise.all(Object.entries(bodies).map(async ([file, bytes]) => ({ file, bytes: bytes.byteLength, sha256: await sha256(bytes), contentType: file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' })));
  const calls = [], host = {
    async fetch(request, env, ctx) {
      calls.push({ request, env, ctx, receiver: this });
      return new Response('retained host', { status: 202, headers: { 'Set-Cookie': 'retained=test; HttpOnly; Secure', 'X-Host': 'unchanged' } });
    },
    scheduled() { return 'retained schedule'; },
  };
  const layer = createReferenceLobbyLayer(host, { release, assets, readAsset: item => bodies[item.file], ...options });
  return { layer, host, calls, assets, bodies };
}

test('default configuration preserves root, every API and every existing game route', async () => {
  const { layer, calls, host } = await fixture();
  const env = { marker: 1 }, ctx = { marker: 2 };
  for (const path of ['/', '/games/', '/games/multi_hot_5_native', '/new74/037-safari-simba/', '/new-games72/multi-hot-100/', '/api/me', '/api/config', '/api/slots/session', '/api/history']) {
    const request = new Request('https://player.test' + path, { headers: { Cookie: 'test-session-only' } });
    const response = await layer.fetch(request, env, ctx);
    assert.equal(response.status, 202);
    assert.equal(response.headers.get('set-cookie'), 'retained=test; HttpOnly; Secure');
    assert.equal(calls.at(-1).request, request);
    assert.equal(calls.at(-1).env, env);
    assert.equal(calls.at(-1).ctx, ctx);
    assert.equal(calls.at(-1).receiver, host);
  }
  assert.equal(layer.scheduled, host.scheduled);
});

test('auth, presence and financial writes pass through without reading or changing their bodies', async () => {
  const { layer, calls } = await fixture();
  for (const path of ['/api/login', '/api/logout', '/_player/presence', '/api/spin', '/api/remaining20/action', '/api/withdrawal']) {
    const body = JSON.stringify({ opaqueTest: 'not a real account or bet' });
    const request = new Request('https://player.test' + path, { method: 'POST', body });
    const response = await layer.fetch(request, {}, {});
    assert.equal(response.status, 202);
    assert.equal(calls.at(-1).request, request);
    assert.equal(request.bodyUsed, false);
    assert.equal(await request.text(), body);
  }
});

test('preview and exact immutable resources use verified bytes; HEAD has no body', async () => {
  const { layer } = await fixture();
  const preview = await layer.fetch(new Request('https://player.test' + PREVIEW_PATH), {}, {});
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get('cache-control'), 'no-store');
  const html = await preview.text();
  assert.match(html, /Reference lobby/);
  const base = html.match(/<base href="([^"]+)"/)[1];
  assert.equal(new URL('./lobby.mjs', 'https://player.test' + base).pathname, assetPath(release, 'lobby.mjs'));
  assert.ok(html.includes('href="' + PREVIEW_PATH + '#all"'));
  const path = assetPath(release, 'lobby.mjs');
  const script = await layer.fetch(new Request('https://player.test' + path), {}, {});
  assert.match(script.headers.get('cache-control'), /immutable/);
  assert.equal(await script.text(), 'export const ready=true;');
  const head = await layer.fetch(new Request('https://player.test' + path, { method: 'HEAD' }), {}, {});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.ok(Number(head.headers.get('content-length')) > 0);
});

test('missing and corrupted resources fail without leaking data or mutating the retained host', async () => {
  const { layer, calls } = await fixture({ readAsset: () => encode('corrupted') });
  const bad = await layer.fetch(new Request('https://player.test' + PREVIEW_PATH), {}, {});
  assert.equal(bad.status, 503);
  const absent = await layer.fetch(new Request('https://player.test' + assetPath(release, 'missing.js')), {}, {});
  assert.equal(absent.status, 404);
  const post = await layer.fetch(new Request('https://player.test' + PREVIEW_PATH, { method: 'POST' }), {}, {});
  assert.equal(post.status, 405);
  assert.equal(calls.length, 0);
});

test('root publication is explicit and leaves account/game requests with the host', async () => {
  const { layer, calls } = await fixture({ publishAtRoot: true });
  assert.equal((await layer.fetch(new Request('https://player.test/'), {}, {})).status, 200);
  assert.equal((await layer.fetch(new Request('https://player.test/api/me'), {}, {})).status, 202);
  assert.equal(calls.length, 1);
});

test('asset manifest rejects traversal, duplicates and invalid digest', async () => {
  const { host, assets } = await fixture();
  const config = { release, assets, readAsset: () => null };
  for (const file of ['../api/me', 'a/../b', '/api/me', 'a//b']) assert.throws(() => assetPath(release, file));
  assert.throws(() => createReferenceLobbyLayer(host, { ...config, assets: [...assets, assets[0]] }));
  assert.throws(() => createReferenceLobbyLayer(host, { ...config, assets: [{ ...assets[0], sha256: 'not-a-hash' }] }));
});
