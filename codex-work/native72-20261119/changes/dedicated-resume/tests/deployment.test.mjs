import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { installDedicatedReleases, validateReleasePin } from '../deployment/handler.mjs';
import { buildReleaseModules } from '../deployment/build-pins.mjs';
import { createProductionHandler } from './fixtures/native72habesha3-routes.mjs';

globalThis.crypto ??= webcrypto;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const encoder = new TextEncoder();
const presencePath = '/player-v236/presence.63ed199a80b6c700.mjs';
const identities = {
  shared: { release: 'zplay-native-shared-20261119-r1' },
  habesha: { release: 'zplay-native-machines-20261119-habesha-r8', gameId: 'habesha_fortune_5_native' },
  deluxe: { release: 'zplay-native-machines-20261119-mh5deluxe-r2', gameId: 'multi_hot_5_deluxe_native' },
};

function pinFor(manifest) {
  const inlineManifest = JSON.stringify(manifest);
  const manifestSha256 = digest(inlineManifest);
  return { release: manifest.release, ...(manifest.gameId ? { gameId: manifest.gameId } : {}),
    manifestKey: `native72/manifests/${manifestSha256}`, manifestSha256,
    manifestSize: Buffer.byteLength(inlineManifest), inlineManifest };
}

function assetFor(release, text, type = 'application/javascript; charset=utf-8') {
  const body = encoder.encode(text);
  const sha256 = digest(body);
  return { body, descriptor: { kvKey: `native72/${release}/${sha256}`, size: body.byteLength, sha256, type } };
}

function fixture({ mutatePins, read, production = createProductionHandler } = {}) {
  const values = new Map(), manifests = {}, pins = {};
  for (const [name, identity] of Object.entries(identities)) {
    const files = name === 'shared' ? { 'wallet.mjs': `export const shared = 'foundation';` }
      : { 'controller.mjs': `export const game = '${name}';`, [`${name}-model.mjs`]: `export const model = '${name}';` };
    const assets = {};
    for (const [file, content] of Object.entries(files)) {
      const { body, descriptor } = assetFor(identity.release, content);
      assets[file] = descriptor;
      values.set(descriptor.kvKey, body);
    }
    const manifest = { ...identity, ...(identity.gameId ? {
      htmlTemplate: `<!doctype html><html><body data-game="{{PRESENTATION_GAME}}" data-machine="{{GAME}}"><!-- Itoobiya—Somali --><script type="module" src="/${identity.release}/controller.mjs"></script></body></html>`,
    } : {}), assets };
    manifests[name] = manifest;
    pins[name] = pinFor(manifest);
  }
  mutatePins?.(pins, manifests);
  const calls = [], reads = [];
  const previous = {
    marker: 'existing-worker',
    fetch(request, env, ctx) { calls.push({ request, env, ctx, owner: this }); return new Response('retained', { status: 202 }); },
    scheduled(event, env, ctx) { return { owner: this, event, env, ctx }; },
    queue(batch, env, ctx) { return { owner: this, batch, env, ctx }; },
  };
  Object.defineProperty(previous, 'nonEnumerable', { enumerable: false, value: 42 });
  Object.defineProperty(previous, 'currentMarker', { get() { return this.marker; }, enumerable: true });
  const env = { PORTAL: 'player', SSG_OFFICIAL_REFERENCES: { async get(key, type) {
    reads.push({ key, type });
    if (read) return read(key, type, reads.length, values);
    const bytes = values.get(key);
    return bytes ? new Uint8Array(bytes).buffer : null;
  } } };
  const worker = installDedicatedReleases(previous, {
    shared: pins.shared, games: [pins.habesha, pins.deluxe], presencePath, createProductionHandler: production,
  });
  const request = (path, options) => new Request(`https://fixture.invalid${path}`, options);
  return { worker, env, previous, calls, reads, request, values, manifests, pins };
}

test('retains all event handlers, property descriptors and original method receiver', async () => {
  const f = fixture(), event = {}, ctx = {};
  assert.equal(f.worker.nonEnumerable, 42);
  assert.equal(Object.getOwnPropertyDescriptor(f.worker, 'nonEnumerable').enumerable, false);
  assert.equal(f.worker.currentMarker, 'existing-worker');
  assert.deepEqual(f.worker.scheduled(event, f.env, ctx), { owner: f.previous, event, env: f.env, ctx });
  assert.equal(f.worker.queue([], f.env, ctx).owner, f.previous);
  const request = f.request('/api/session');
  assert.equal((await f.worker.fetch(request, f.env, ctx)).status, 202);
  assert.deepEqual(f.calls[0], { request, env: f.env, ctx, owner: f.previous });
});

test('entry reexports the exact previous named exports and adds no baseline asset import', async () => {
  const source = await readFile(new URL('../deployment/entry.mjs', import.meta.url), 'utf8');
  assert.match(source, /export \* from '\.\.\/native72habesha7\/entry\.mjs'/);
  assert.match(source, /import previous from '\.\.\/native72habesha7\/entry\.mjs'/);
  assert.match(source, /native72habesha3\/routes\.mjs/);
  assert.doesNotMatch(source, /native-machine-assets/);
  const retained = await readFile(new URL('./fixtures/native72habesha3-routes.mjs', import.meta.url));
  assert.equal(digest(retained), '2d677af6bf3a35a845c56e9fe334342d0a132d3803d21e21a3bfefea7f0016d9');
});

for (const name of ['habesha', 'deluxe']) {
  test(`${name} HTML preserves production bootstrap, presence and security policy exactly`, async () => {
    const f = fixture(), manifest = f.manifests[name];
    const request = f.request(`/games/${manifest.gameId}?session=opaque`, { headers: { Cookie: 'player=session' } });
    const expected = createProductionHandler({ assets: {}, htmlTemplate: manifest.htmlTemplate,
      gameId: manifest.gameId, release: manifest.release, presencePath, published: true })(request, f.env);
    const actual = await f.worker.fetch(request, f.env, {});
    assert.equal(actual.status, expected.status);
    assert.deepEqual([...actual.headers], [...expected.headers]);
    const html = await actual.text();
    assert.equal(html, await expected.text());
    assert.match(html, new RegExp(`data-game="${manifest.gameId}"`));
    assert.match(html, new RegExp(presencePath.replaceAll('.', '\\.')));
    assert.doesNotMatch(html, /\{\{GAME\}\}|\{\{PRESENTATION_GAME\}\}/);
    assert.equal(f.reads.length, 0, 'exact inline manifest avoids an extra eventual-consistency read');
    assert.equal(f.calls.length, 0);
  });

  test(`${name} HEAD has the production headers and no body`, async () => {
    const f = fixture(), manifest = f.manifests[name];
    const response = await f.worker.fetch(f.request(`/games/${manifest.gameId}/`, { method: 'HEAD' }), f.env, {});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-zplay-release'), manifest.release);
    assert.equal(await response.text(), '');
    assert.equal(f.reads.length, 0);
  });
}

test('shared immutable asset verifies exact bytes, MIME, length and hash before serving', async () => {
  const f = fixture(), manifest = f.manifests.shared, asset = manifest.assets['wallet.mjs'];
  const response = await f.worker.fetch(f.request(`/${manifest.release}/wallet.mjs?cache=1`), f.env, {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), asset.type);
  assert.equal(response.headers.get('content-length'), String(asset.size));
  assert.equal(response.headers.get('etag'), `"${asset.sha256}"`);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(digest(new Uint8Array(await response.arrayBuffer())), asset.sha256);
  assert.deepEqual(f.reads, [{ key: asset.kvKey, type: 'arrayBuffer' }]);
});

test('game and shared namespaces cannot read another package file', async () => {
  const f = fixture();
  for (const [release, name] of [[identities.habesha.release, 'deluxe-model.mjs'],
    [identities.deluxe.release, 'habesha-model.mjs'], [identities.shared.release, 'controller.mjs']]) {
    assert.equal((await f.worker.fetch(f.request(`/${release}/${name}`), f.env, {})).status, 404);
  }
  assert.equal(f.reads.length, 0);
  assert.equal(f.calls.length, 0);
});

test('HEAD validates an asset but never returns a body', async () => {
  const f = fixture(), release = identities.shared.release;
  const response = await f.worker.fetch(f.request(`/${release}/wallet.mjs`, { method: 'HEAD' }), f.env, {});
  assert.equal(response.status, 200);
  assert.equal(Number(response.headers.get('content-length')), f.manifests.shared.assets['wallet.mjs'].size);
  assert.equal(await response.text(), '');
  assert.equal(f.reads.length, 1);
});

test('rejects encoded separators, traversal, double decoding and malformed asset names', async () => {
  const f = fixture(), release = identities.shared.release;
  const invalid = ['', '/', '%2e%2e%2fwallet.mjs', '..%2fwallet.mjs', '%252e%252e%252fwallet.mjs',
    '%5cwallet.mjs', 'wallet.mjs%00', '%77allet.mjs', '%ZZ', 'folder/wallet.mjs', '__proto__'];
  for (const path of invalid) {
    const response = await f.worker.fetch(f.request(`/${release}/${path}`), f.env, {});
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal((await f.worker.fetch(f.request(`/${release}`), f.env, {})).status, 404);
  assert.equal(f.reads.length, 0);
});

test('old asset releases, protected games, API calls and non-player portal delegate unchanged', async () => {
  const f = fixture(), ctx = {};
  const paths = ['/zplay-native-machines-20261119-habesha-r7/controller.mjs',
    '/zplay-native-machines-20261119-mh5deluxe-r1/controller.mjs',
    '/games/multi_hot_5_native', '/games/foxy_hot_20_native', '/api/native/spin', '/', '/api/session'];
  for (const path of paths) {
    const request = f.request(path);
    assert.equal((await f.worker.fetch(request, f.env, ctx)).status, 202);
    assert.equal(f.calls.at(-1).request, request);
  }
  const env = { ...f.env, PORTAL: 'admin' };
  const request = f.request(`/games/${identities.habesha.gameId}`);
  assert.equal((await f.worker.fetch(request, env, ctx)).status, 202);
  assert.equal(f.calls.at(-1).env, env);
  assert.equal(f.reads.length, 0);
});

test('POST to a new presentation route forwards the untouched request and body', async () => {
  const f = fixture();
  for (const path of [`/games/${identities.habesha.gameId}`, `/${identities.shared.release}/wallet.mjs`]) {
    const request = f.request(path, { method: 'POST', body: 'untouched=idempotency-token' });
    assert.equal((await f.worker.fetch(request, f.env, {})).status, 202);
    assert.equal(f.calls.at(-1).request, request);
    assert.equal(request.bodyUsed, false);
    assert.equal(await request.text(), 'untouched=idempotency-token');
  }
  assert.equal(f.reads.length, 0);
});

test('manifest hash mismatch fails closed without using KV or the previous game', async () => {
  const f = fixture({ mutatePins(pins) {
    pins.habesha.manifestSha256 = '0'.repeat(64);
    pins.habesha.manifestKey = `native72/manifests/${'0'.repeat(64)}`;
  } });
  const response = await f.worker.fetch(f.request(`/games/${identities.habesha.gameId}`), f.env, {});
  assert.equal(response.status, 503);
  assert.equal(await response.text(), 'Release verification failed');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(f.calls.length, 0);
  assert.equal(f.reads.length, 0);
  assert.equal((await f.worker.fetch(f.request('/games/foxy_hot_20_native'), f.env, {})).status, 202);
});

test('manifest validator rejects mismatched release, game, byte count, MIME and content key', () => {
  const f = fixture();
  assert.throws(() => validateReleasePin({ ...f.pins.shared, manifestSize: f.pins.shared.manifestSize + 1 }), /SIZE_MISMATCH/);
  assert.throws(() => validateReleasePin({ ...f.pins.shared, release: 'foreign-release' }), /RELEASE_MISMATCH/);
  assert.throws(() => validateReleasePin({ ...f.pins.habesha, gameId: 'foreign_game' }, { game: true }), /GAME_MANIFEST/);
  assert.throws(() => validateReleasePin(f.pins.habesha), /SHARED_MANIFEST/);
  for (const mutate of [
    m => { m.assets['wallet.mjs'].type = 'text/html'; },
    m => { m.assets['wallet.mjs'].type = 'application/javascript; charset=utf-8\r\nX-Unsafe: 1'; },
    m => { m.assets['wallet.mjs'].kvKey = 'native72/other/' + '0'.repeat(64); },
    m => { m.assets['wallet.mjs'].size = -1; },
    m => { m.assets['../wallet.mjs'] = m.assets['wallet.mjs']; },
  ]) {
    const manifest = structuredClone(f.manifests.shared);
    mutate(manifest);
    assert.throws(() => validateReleasePin(pinFor(manifest)), /INVALID_ASSET/);
  }
});

for (const firstRead of ['missing', 'throw']) {
  test(`one bounded retry recovers a ${firstRead} KV read`, async () => {
    const f = fixture({ read(key, type, count, values) {
      if (count === 1) {
        if (firstRead === 'throw') throw new Error('transient');
        return null;
      }
      return new Uint8Array(values.get(key)).buffer;
    } });
    const response = await f.worker.fetch(f.request(`/${identities.shared.release}/wallet.mjs`), f.env, {});
    assert.equal(response.status, 200);
    assert.equal(f.reads.length, 2);
  });
}

test('missing asset failures are not cached and HEAD errors have no body', async () => {
  const f = fixture(), asset = f.manifests.shared.assets['wallet.mjs'];
  const body = f.values.get(asset.kvKey);
  f.values.delete(asset.kvKey);
  const request = () => f.request(`/${identities.shared.release}/wallet.mjs`, { method: 'HEAD' });
  const failed = await f.worker.fetch(request(), f.env, {});
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get('cache-control'), 'no-store');
  assert.equal(await failed.text(), '');
  assert.equal(f.reads.length, 2);
  f.values.set(asset.kvKey, body);
  assert.equal((await f.worker.fetch(request(), f.env, {})).status, 200);
  assert.equal(f.reads.length, 3);
});

for (const corruption of ['length', 'hash']) {
  test(`corrupt asset ${corruption} fails closed without immutable caching or content leak`, async () => {
    const f = fixture(), asset = f.manifests.shared.assets['wallet.mjs'];
    const bytes = new Uint8Array(f.values.get(asset.kvKey));
    if (corruption === 'hash') bytes[0] ^= 1;
    f.values.set(asset.kvKey, corruption === 'length' ? bytes.slice(1) : bytes);
    const response = await f.worker.fetch(f.request(`/${identities.shared.release}/wallet.mjs`), f.env, {});
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.has('etag'), false);
    assert.equal(await response.text(), 'Asset verification failed');
    assert.equal(f.reads.length, 1);
  });
}

test('offline builder pins exact UTF-8 manifest bytes and only three additive modules', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dedicated-release-test-'));
  try {
    const f = fixture(), packages = [];
    for (const [name, pin] of Object.entries(f.pins)) {
      await writeFile(join(directory, `${name}-manifest.json`), pin.inlineManifest);
      packages.push({ name, release: pin.release, gameId: pin.gameId,
        manifestKey: pin.manifestKey, manifestSha256: pin.manifestSha256, manifestBytes: pin.manifestSize });
    }
    await writeFile(join(directory, 'package-report.json'), JSON.stringify({ packages }));
    const inventory = await buildReleaseModules(directory, join(directory, 'modules'));
    assert.equal(inventory.mainModule, 'native72dedicatedr1/entry.mjs');
    assert.equal(inventory.baselineVersion, '11ec5499-9697-4063-bf3f-92252c32f89d');
    assert.equal(inventory.modules.length, 3);
    assert.equal(inventory.preserveExistingModules, true);
    assert.equal(inventory.preserveExistingBindings, true);
    assert.equal(inventory.preserveExistingAssets, true);
    for (const module of inventory.modules) {
      const bytes = await readFile(module.file);
      assert.equal(bytes.length, module.size);
      assert.equal(digest(bytes), module.sha256);
    }
    const { releasePins } = await import(pathToFileURL(join(directory, 'modules/release-pins.mjs')));
    assert.equal(releasePins.shared.inlineManifest, f.pins.shared.inlineManifest);
    assert.deepEqual(releasePins.games.map(pin => pin.gameId), ['habesha_fortune_5_native', 'multi_hot_5_deluxe_native']);
    assert.equal(releasePins.games[0].manifestSize, Buffer.byteLength(releasePins.games[0].inlineManifest));
    assert.ok(releasePins.games[0].manifestSize > releasePins.games[0].inlineManifest.length);
    packages[0].manifestSha256 = '0'.repeat(64);
    await writeFile(join(directory, 'package-report.json'), JSON.stringify({ packages }));
    await assert.rejects(buildReleaseModules(directory, join(directory, 'rejected')), /PACKAGE_REPORT_MISMATCH/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
