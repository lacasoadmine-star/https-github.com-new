import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { createPinnedAssetRouter, pinnedAssetPath } from './asset-router.mjs';

// Synthetic complete-publication shapes only. These fixtures do not approve any
// real game, grant asset rights, or call live storage, Workers or wallet APIs.
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => value === null || typeof value !== 'object' ? JSON.stringify(value)
  : Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
    : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
const encode = value => new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value));
const request = (path, method = 'GET') => ({ url: 'https://fixture.invalid' + path, method });
const storageKey = (file, release) => `${release.releaseId}:${release.sourceCommit}:${file.path}`;

function fixture({ releaseId = 'fixture-r1', sourceCommit = 'a'.repeat(40) } = {}) {
  const assets = new Map(), stored = new Map();
  const registry = { schema: 'zplay/new-games72-registry/v1', releaseId,
    games: Array.from({ length: 72 }, (_, i) => ({ gameId: `test_game_${i + 1}`, officialName: `Fixture ${i + 1}`,
      route: `/new-games72/fixture-${i + 1}/`, modulePath: `fixture/game-${i + 1}`,
      category: 'test', provider: 'test', backend: { rulesVersion: 'fixture-rules-v1' },
      assets: { prefix: `/new-games72/fixture-${i + 1}/assets/v1/`, manifestPath: `fixture/game-${i + 1}/assets.json` } })) };
  const publication = { schema: 'zplay/new-games72-publication/v1', state: 'ACTIVE', releaseId, sourceCommit,
    releaseManifestSha256: '0'.repeat(64), games: [] };
  const manifest = { schema: 'zplay/new-games72-release-evidence/v1', releaseId, sourceCommit,
    frontendVersion: 'fixture-frontend-v1', backendVersion: 'fixture-backend-v1',
    registrySha256: sha(canonical(registry)), games: [] };
  for (const game of registry.games) {
    const content = encode(`<svg xmlns="http://www.w3.org/2000/svg"><text>${game.gameId}</text></svg>`);
    const file = { path: `${game.modulePath}/cover.svg`, publicPath: game.assets.prefix + 'cover.svg',
      byteLength: content.length, sha256: sha(content), mediaType: 'image/svg+xml', kind: 'runtime-original' };
    const assetManifest = encode({ schema: 'zplay/new72-assets/v1', gameId: game.gameId, files: [file] });
    assets.set(game.assets.manifestPath, assetManifest);
    stored.set(storageKey(file, publication), content);
    manifest.games.push({ gameId: game.gameId, pins: { assets: { path: game.assets.manifestPath,
      byteLength: assetManifest.length, sha256: sha(assetManifest), mediaType: 'application/json' } } });
    publication.games.push({ gameId: game.gameId, route: game.route, coverPath: file.publicPath,
      coverSha256: file.sha256, frontendVersion: manifest.frontendVersion, rulesVersion: game.backend.rulesVersion });
  }
  publication.releaseManifestSha256 = sha(canonical(manifest));
  return { active: { registry, publication, manifest, assetManifests: assets }, stored,
    path: pinnedAssetPath(publication, publication.games[0].coverPath) };
}

async function build(f, options = {}) {
  const calls = [];
  const handler = await createPinnedAssetRouter({ active: f?.active, retained: options.retained ?? [],
    subtle: webcrypto.subtle, readAsset: async (file, release) => {
      calls.push({ file, release });
      return options.readAsset ? options.readAsset(file, release) : f.stored.get(storageKey(file, release)) ?? null;
    } });
  return { handler, calls };
}

async function expectError(response, status, code) {
  assert.ok(response instanceof Response); assert.equal(response.status, status);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.has('etag'), false);
  assert.deepEqual(await response.json(), { error: code });
}

test('every legacy path passes through unchanged even when new publication is invalid', async () => {
  const f = fixture(); f.active.publication.sourceCommit = 'wrong';
  const { handler, calls } = await build(f);
  for (const path of ['/', '/games/multihot5', '/new74/', '/api/slots/spin', '/agent/login', '/new-games720/file.js'])
    assert.equal(await handler(request(path, 'POST')), null);
  assert.equal(calls.length, 0);
});

test('no active publication serves no new files and performs no storage read', async () => {
  const { handler, calls } = await build(null);
  await expectError(await handler(request('/new-games72/example.js')), 503, 'NEW72_PUBLICATION_INACTIVE');
  assert.equal(calls.length, 0);
});

test('GET serves exact pinned bytes with immutable release/source headers after one read', async () => {
  const f = fixture(), { handler, calls } = await build(f), result = await handler(request(f.path));
  assert.equal(result.status, 200); assert.equal(calls.length, 1);
  assert.equal(result.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal(result.headers.get('x-zplay-release'), 'fixture-r1');
  assert.equal(result.headers.get('x-zplay-source'), 'a'.repeat(40));
  const bytes = new Uint8Array(await result.arrayBuffer());
  assert.deepEqual(bytes, f.stored.get(storageKey(calls[0].file, calls[0].release)));
  assert.equal(result.headers.get('etag'), `"sha256-${sha(bytes)}"`);
  assert.equal(result.headers.get('content-length'), String(bytes.length));
});

test('HEAD verifies once and returns matching headers without a response body', async () => {
  const f = fixture(), { handler, calls } = await build(f), result = await handler(request(f.path, 'HEAD'));
  assert.equal(result.status, 200); assert.equal(await result.text(), ''); assert.equal(calls.length, 1);
  assert.equal(result.headers.get('content-length'), String(calls[0].file.byteLength));
  assert.equal(result.headers.get('etag'), `"sha256-${calls[0].file.sha256}"`);
});

test('invalid method returns explicit no-store 405 before reading storage', async () => {
  const f = fixture(), { handler, calls } = await build(f), result = await handler(request(f.path, 'POST'));
  assert.equal(result.headers.get('allow'), 'GET, HEAD');
  await expectError(result, 405, 'NEW72_METHOD_NOT_ALLOWED'); assert.equal(calls.length, 0);
});

test('same-size corrupt stored asset cannot be hidden by its expected cache hash', async () => {
  const f = fixture(), { handler, calls } = await build(f, { readAsset: file => new Uint8Array(file.byteLength) });
  await expectError(await handler({ ...request(f.path), headers: new Headers({ 'If-None-Match': 'expected-old-hash' }) }),
    503, 'NEW72_ASSET_HASH_MISMATCH');
  assert.equal(calls.length, 1);
});

test('wrong-size stored asset is rejected before serving any bytes', async () => {
  const f = fixture(), { handler, calls } = await build(f, { readAsset: () => new Uint8Array(1) });
  await expectError(await handler(request(f.path)), 503, 'NEW72_ASSET_SIZE_MISMATCH'); assert.equal(calls.length, 1);
});

test('missing published file produces no-store failure with no old-release fallback', async () => {
  const current = fixture(), old = fixture({ releaseId: 'fixture-old', sourceCommit: 'b'.repeat(40) });
  const { handler, calls } = await build(current, { retained: [old.active], readAsset: (file, release) =>
    release.releaseId === old.active.publication.releaseId ? old.stored.get(storageKey(file, release)) : null });
  await expectError(await handler(request(current.path)), 503, 'NEW72_ASSET_MISSING');
  assert.equal(calls.length, 1); assert.equal(calls[0].release.releaseId, 'fixture-r1');
});

test('storage error is explicit and is not replaced with another release', async () => {
  const f = fixture(), { handler, calls } = await build(f, { readAsset: () => { throw Error('private storage detail'); } });
  await expectError(await handler(request(f.path)), 503, 'NEW72_ASSET_READ_FAILED'); assert.equal(calls.length, 1);
});

test('unknown release/source and mutable canonical URL cannot load current or old assets', async () => {
  const f = fixture(), { handler, calls } = await build(f);
  for (const path of [f.path.replace('fixture-r1', 'stale-r0'), f.path.replace('a'.repeat(40), 'b'.repeat(40)),
    f.active.publication.games[0].coverPath])
    await expectError(await handler(request(path)), 404, 'NEW72_RELEASE_NOT_AVAILABLE');
  assert.equal(calls.length, 0);
});

test('unknown file in known release returns no-store 404 without a storage probe', async () => {
  const f = fixture(), { handler, calls } = await build(f);
  await expectError(await handler(request(f.path.replace('cover.svg', 'absent.js'))), 404, 'NEW72_ASSET_NOT_FOUND');
  assert.equal(calls.length, 0);
});

test('traversal, encoding, alternate separators and query hash overrides never read storage', async () => {
  const f = fixture(), { handler, calls } = await build(f);
  for (const path of ['/new-games72/../legacy.js', '/new-games72/%2e%2e/legacy.js', '/new-games72//file.js',
    '/new-games72/abc\\def.js', '/new-games72/./file.js', '/new-games72%2fhidden.js', f.path + '?hash=old', f.path + '#old'])
    await expectError(await handler(request(path)), 400, 'NEW72_INVALID_ASSET_PATH');
  assert.equal(calls.length, 0);
});

test('changed release manifest bytes or source identity fail closed without storage reads', async () => {
  for (const alter of [f => { f.active.manifest.frontendVersion = 'different'; },
    f => { f.active.publication.sourceCommit = 'b'.repeat(40); },
    f => { f.active.registry.games[0].officialName = 'changed after approval'; }]) {
    const f = fixture(); alter(f); const { handler, calls } = await build(f);
    await expectError(await handler(request(f.path)), 503, 'NEW72_RELEASE_MANIFEST_MISMATCH');
    assert.equal(calls.length, 0);
  }
});

test('per-game frontend version mismatch cannot be served under the new release hash', async () => {
  const f = fixture(); f.active.publication.games[0].frontendVersion = 'old-frontend';
  const { handler, calls } = await build(f);
  await expectError(await handler(request(f.path)), 503, 'NEW72_GAME_VERSION_OR_ASSET_PIN_MISMATCH');
  assert.equal(calls.length, 0);
});

test('missing or corrupt per-game asset manifest invalidates the whole new publication', async () => {
  for (const value of [null, encode('{}')]) {
    const f = fixture(); f.active.assetManifests.set(f.active.registry.games[71].assets.manifestPath, value);
    const { handler, calls } = await build(f);
    await expectError(await handler(request(f.path)), 503, 'NEW72_ASSET_MANIFEST_HASH_MISMATCH');
    assert.equal(calls.length, 0);
  }
});

test('71 games or duplicate publication IDs cannot partially expose the new release', async () => {
  for (const alter of [f => f.active.publication.games.pop(),
    f => { f.active.publication.games[71] = f.active.publication.games[0]; }]) {
    const f = fixture(); alter(f); const { handler, calls } = await build(f);
    await expectError(await handler(request(f.path)), 503, 'NEW72_PUBLICATION_INVALID');
    assert.equal(calls.length, 0);
  }
});

test('runtime descriptor cannot map a retained source file onto a legacy public path', async () => {
  const f = fixture(), path = f.active.registry.games[0].assets.manifestPath;
  const assets = JSON.parse(new TextDecoder().decode(f.active.assetManifests.get(path)));
  assets.files[0].publicPath = '/legacy/game.js';
  const bytes = encode(assets); f.active.assetManifests.set(path, bytes);
  f.active.manifest.games[0].pins.assets.byteLength = bytes.length;
  f.active.manifest.games[0].pins.assets.sha256 = sha(bytes);
  f.active.publication.releaseManifestSha256 = sha(canonical(f.active.manifest));
  const { handler, calls } = await build(f);
  await expectError(await handler(request(f.path)), 503, 'NEW72_INVALID_RUNTIME_ASSET');
  assert.equal(calls.length, 0);
});

test('explicit retained snapshot serves its original immutable bytes and source identity', async () => {
  const current = fixture(), old = fixture({ releaseId: 'fixture-old', sourceCommit: 'b'.repeat(40) });
  const store = new Map([...current.stored, ...old.stored]);
  const { handler, calls } = await build(current, { retained: [old.active], readAsset: (file, release) => store.get(storageKey(file, release)) });
  for (const f of [current, old]) {
    const response = await handler(request(f.path)); assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-zplay-source'), f.active.publication.sourceCommit);
    assert.equal(response.headers.get('x-zplay-release'), f.active.publication.releaseId);
  }
  assert.equal(calls.length, 2);
});

test('mutating supplied publication after construction cannot change served release identity', async () => {
  const f = fixture(), { handler } = await build(f);
  f.active.publication.sourceCommit = 'b'.repeat(40); f.active.publication.games.length = 0;
  f.active.registry.games[0].assets.prefix = '/legacy/';
  const response = await handler(request(f.path)); assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-zplay-source'), 'a'.repeat(40));
});

test('an inactive publication stays closed while exact retained assets remain available', async () => {
  const current = fixture(), old = fixture({ releaseId: 'fixture-old', sourceCommit: 'b'.repeat(40) });
  current.active.publication.state = 'INACTIVE';
  const { handler, calls } = await build(current, { retained: [old.active],
    readAsset: (file, release) => old.stored.get(storageKey(file, release)) });
  await expectError(await handler(request(current.path)), 503, 'NEW72_PUBLICATION_INACTIVE');
  await expectError(await handler(request(current.active.publication.games[0].coverPath)), 503, 'NEW72_PUBLICATION_INACTIVE');
  assert.equal(calls.length, 0);
  const historic = await handler(request(old.path));
  assert.equal(historic.status, 200); assert.equal(historic.headers.get('x-zplay-release'), 'fixture-old');
  assert.equal(calls.length, 1);
});
