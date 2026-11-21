import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { createPinnedAssetRouter, pinnedAssetPath } from './asset-router.mjs';

// Independent regressions: rollback disables new publication, not the explicitly
// retained immutable URLs needed to present already accepted rounds. Synthetic
// snapshots below do not approve games or access production storage.
const sha = value => createHash('sha256').update(value).digest('hex');
const canonical = value => value === null || typeof value !== 'object' ? JSON.stringify(value)
  : Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
    : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
const bytes = value => new TextEncoder().encode(JSON.stringify(value));
const key = (file, release) => `${release.releaseId}:${release.sourceCommit}:${file.path}`;
const request = path => new Request(`https://fixture.invalid${path}`);

function snapshot(releaseId, sourceCommit) {
  const assetManifests = new Map(), storage = new Map();
  const registry = { schema: 'zplay/new-games72-registry/v1', releaseId,
    games: Array.from({ length: 72 }, (_, i) => ({
      gameId: `review_game_${i + 1}`, officialName: `Review ${i + 1}`,
      route: `/new-games72/review-${i + 1}/`, modulePath: `review/game-${i + 1}`,
      provider: 'test', category: 'test', backend: { rulesVersion: 'rules-v1' },
      assets: { prefix: `/new-games72/review-${i + 1}/assets/`, manifestPath: `review/game-${i + 1}/assets.json` },
    })) };
  const publication = { schema: 'zplay/new-games72-publication/v1', state: 'ACTIVE', releaseId, sourceCommit,
    releaseManifestSha256: '0'.repeat(64), games: [] };
  const manifest = { schema: 'zplay/new-games72-release-evidence/v1', releaseId, sourceCommit,
    frontendVersion: 'frontend-v1', backendVersion: 'backend-v1', registrySha256: sha(canonical(registry)), games: [] };
  for (const game of registry.games) {
    const content = new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg"><text>${releaseId}:${game.gameId}</text></svg>`);
    const file = { path: `${game.modulePath}/cover.svg`, publicPath: `${game.assets.prefix}cover.svg`,
      sha256: sha(content), byteLength: content.byteLength, mediaType: 'image/svg+xml', kind: 'runtime-original' };
    const assetBytes = bytes({ schema: 'zplay/new72-assets/v1', gameId: game.gameId, files: [file] });
    assetManifests.set(game.assets.manifestPath, assetBytes);
    storage.set(key(file, publication), content);
    publication.games.push({ gameId: game.gameId, route: game.route, coverPath: file.publicPath,
      coverSha256: file.sha256, frontendVersion: manifest.frontendVersion, rulesVersion: 'rules-v1' });
    manifest.games.push({ gameId: game.gameId, pins: { assets: { path: game.assets.manifestPath,
      sha256: sha(assetBytes), byteLength: assetBytes.byteLength, mediaType: 'application/json' } } });
  }
  publication.releaseManifestSha256 = sha(canonical(manifest));
  return { config: { registry, publication, manifest, assetManifests }, storage,
    path: pinnedAssetPath(publication, publication.games[0].coverPath) };
}

async function router(active, retained) {
  const stored = new Map([active, ...retained].filter(Boolean).flatMap(item => [...item.storage]));
  const reads = [];
  const handler = await createPinnedAssetRouter({
    active: active?.config ?? null, retained: retained.map(item => item.config), subtle: webcrypto.subtle,
    readAsset: async (file, release) => { reads.push(release.releaseId); return stored.get(key(file, release)) ?? null; },
  });
  return { handler, reads };
}

test('retained historical assets remain addressable when no new publication is active', async () => {
  const old = snapshot('retained-only', 'a'.repeat(40)), { handler, reads } = await router(null, [old]);
  const response = await handler(request(old.path));
  assert.equal(response.status, 200, 'accepted-round assets must survive disabling new activation');
  assert.equal(response.headers.get('x-zplay-release'), 'retained-only');
  assert.deepEqual(reads, ['retained-only']);
  assert.notEqual((await handler(request('/new-games72/review-1/assets/cover.svg'))).status, 200);
});

test('broken new release cannot hide explicitly requested independently pinned historical assets', async () => {
  const current = snapshot('broken-new', 'b'.repeat(40)), old = snapshot('accepted-old', 'a'.repeat(40));
  current.config.manifest.frontendVersion = 'unapproved-change';
  const { handler, reads } = await router(current, [old]);
  assert.notEqual((await handler(request(current.path))).status, 200, 'broken active release remains closed');
  const response = await handler(request(old.path));
  assert.equal(response.status, 200, 'old URL is explicit retention, not fallback for a new URL');
  assert.equal(response.headers.get('x-zplay-source'), 'a'.repeat(40));
  assert.deepEqual(reads, ['accepted-old']);
});

test('one corrupt retained snapshot cannot disable other independently valid release URLs', async () => {
  const current = snapshot('current-good', 'c'.repeat(40));
  const old = snapshot('older-good', 'a'.repeat(40));
  const corrupt = snapshot('older-corrupt', 'b'.repeat(40));
  corrupt.config.assetManifests.delete(corrupt.config.registry.games[71].assets.manifestPath);
  const { handler, reads } = await router(current, [old, corrupt]);
  assert.equal((await handler(request(current.path))).status, 200);
  assert.equal((await handler(request(old.path))).status, 200);
  assert.notEqual((await handler(request(corrupt.path))).status, 200);
  assert.deepEqual(reads, ['current-good', 'older-good']);
});
