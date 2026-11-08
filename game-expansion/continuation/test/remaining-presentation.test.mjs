import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  sha256, selectLock, validateStaticURL, verifyBytes, decodeInlineTexture,
  fetchRemainingAssets, MAX_TRANSFER_BYTES,
} from '../scripts/fetch-remaining-slot-assets.mjs';
import {buildRemainingManifests} from '../presentation/remaining-slots/build-manifests.mjs';
import {
  createRemainingScene, createStaticReviewScene, reviewFixture, paylineCells,
  validateStaticSvg, RemainingAssetStore,
} from '../presentation/remaining-slots/renderer.mjs';

const root = new URL('../presentation/remaining-slots/', import.meta.url);
const json = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const inventory = await json('source-inventory.json'), lock = await json('assets.lock.json');
const manifests = buildRemainingManifests(inventory, lock);
const byId = Object.fromEntries(manifests.map(item => [item.id, item]));
const vegas = byId.vegasnights_native, book = byId.bookofmagic_native;
function directLock(bytes) {
  const hash = sha256(bytes), file = hash + '.png';
  return {
    schemaVersion: 1, games: {fixture: {name: 'Isolated image fixture'}}, groups: {},
    sources: [{id: 'source', url: 'https://prod.cdn.amusnet.io/826/images/fixture.png', sha256: hash, bytes: bytes.length}],
    assets: [{file, sha256: hash, bytes: bytes.length, games: ['fixture'], sourceId: 'source'}],
  };
}

test('all five generated manifests reproduce checked-in data and stay closed', async () => {
  for (const manifest of manifests) {
    assert.deepEqual(manifest, await json('manifests/' + manifest.id + '.json'));
    assert.equal(manifest.productionLaunchEnabled, false);
    assert.equal(manifest.financialActions, false);
    assert.equal(manifest.browserVerified, false);
    assert.equal(manifest.providerRuntimeIncluded, false);
    assert.ok(manifest.fidelityGaps.length >= 2);
  }
});

test('every normalized frame stays inside its hash-locked source image', () => {
  for (const manifest of manifests) for (const frame of Object.values(manifest.frames)) {
    const file = manifest.files[frame.file]; assert.ok(file);
    assert.equal(frame.textureSha256, file.sha256);
    assert.ok(frame.x >= 0 && frame.y >= 0);
    assert.ok(frame.x + frame.packedWidth <= file.width);
    assert.ok(frame.y + frame.packedHeight <= file.height);
    assert.ok(frame.trim.x + frame.trim.width <= frame.original.width);
    assert.ok(frame.trim.y + frame.trim.height <= frame.original.height);
  }
});

test('Book portrait rotation, exact core geometry and thirteen symbol identities survive extraction', () => {
  const background = book.frames[book.background.frame];
  assert.equal(background.rotated, true);
  assert.equal(background.width, 810); assert.equal(background.height, 1440);
  assert.equal(background.packedWidth, 1440); assert.equal(background.packedHeight, 810);
  assert.equal(background.unrotateDegrees, -90);
  assert.deepEqual(book.layout.grid, {x: 9, y: 288, cellWidth: 144, cellHeight: 144, columnGap: 18});
  assert.equal(book.layout.exactProviderCoreGeometry, true);
  assert.equal(book.layout.exactProviderControlPlacement, false);
  assert.deepEqual(Object.values(book.symbols).map(item => item.providerId), Array.from({length: 13}, (_, index) => index));
  assert.equal(book.symbols.wild.providerId, 11); assert.equal(book.symbols.scatter.providerId, 12);
  assert.equal(Object.keys(book.frames).filter(name => name.startsWith('controls/')).length, 12);
});

test('Vegas keeps three distinct wild identities and each source idle/blur/thumbnail/fallback mapping', () => {
  assert.deepEqual(Object.values(vegas.symbols).map(item => item.providerId), Array.from({length: 13}, (_, index) => index + 1));
  const wilds = ['wild', 'royal-wild', 'gold'].map(id => vegas.symbols[id]);
  assert.deepEqual(wilds.map(symbol => symbol.providerId), [2, 12, 13]);
  assert.equal(new Set(wilds.map(symbol => vegas.frames[symbol.frame].file)).size, 3);
  for (const symbol of Object.values(vegas.symbols)) {
    for (const key of ['frame', 'blurFrame', 'thumbnailFrame', 'winFallbackFrame']) assert.ok(vegas.frames[symbol[key]], key);
  }
  assert.equal(vegas.layout.exactProviderViewportArrangement, false);
});

test('opaque Vegas reel artwork is behind visible symbols and all fixtures use valid mapped IDs', () => {
  for (const manifest of [vegas, book]) {
    const scene = createStaticReviewScene(manifest), boardIndex = scene.commands.findIndex(command => command.frame === manifest.board.frame);
    const fixture = reviewFixture(manifest.id);
    assert.equal(fixture.grid.length, 5);
    for (const column of fixture.grid) for (const id of column) {
      assert.ok(manifest.symbols[id]);
      assert.ok(scene.commands.findIndex(command => command.frame === manifest.symbols[id].frame) > boardIndex);
    }
    assert.equal(scene.commands.filter(command => command.clip && command.type === 'sprite').length, 15);
  }
});

test('missing or invalid server grids display no fabricated symbol outcome', () => {
  for (const manifest of [vegas, book]) {
    const symbols = new Set(Object.values(manifest.symbols).map(item => item.frame));
    for (const snapshot of [{}, {grid: [['unknown']]}, {round: {grid: []}, balance: '999999'}]) {
      const scene = createRemainingScene(manifest, snapshot);
      assert.equal(scene.commands.filter(command => symbols.has(command.frame)).length, 0);
      assert.equal(scene.commands.some(command => String(command.text).includes('999999')), false);
      assert.equal(scene.financialActions, false);
    }
  }
});

test('all exact paylines are valid and highlights only mark requested reference cells', () => {
  for (const [manifest, count] of [[vegas, 25], [book, 20]]) {
    assert.equal(manifest.paylines.length, count);
    assert.equal(new Set(manifest.paylines.map(path => path.join(','))).size, count);
    for (const path of manifest.paylines) assert.ok(path.length === 5 && path.every(row => Number.isInteger(row) && row >= 0 && row < 3));
    assert.deepEqual(paylineCells(manifest, 1), [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]]);
    assert.deepEqual(paylineCells(manifest, count + 1), []);
    const scene = createStaticReviewScene(manifest, {selectedLine: count});
    assert.equal(scene.commands.filter(command => command.type === 'outline').length, 5);
  }
});

test('free-spin presentation uses the actual Vegas alternate backgrounds without inventing a round', () => {
  const scene = createRemainingScene(vegas, {...reviewFixture(vegas.id), phase: 'free-spins'});
  assert.ok(scene.commands.some(command => command.frame === vegas.background.freeSpinsFrame));
  assert.ok(scene.commands.some(command => command.frame === vegas.board.freeSpinsFrame));
  assert.equal(Object.hasOwn(scene, 'roundId'), false);
  assert.equal(Object.hasOwn(scene, 'payoutMinor'), false);
  assert.equal(scene.productionLaunchEnabled, false);
});

test('help-only and unresolved games cannot become generic gameplay substitutes', () => {
  for (const id of ['moonstone_native', 'samurai_native', 'magicgarden_native']) {
    const manifest = byId[id], scene = createStaticReviewScene(manifest);
    assert.equal(manifest.grid, null); assert.deepEqual(manifest.symbols, {}); assert.deepEqual(manifest.controls, {});
    assert.equal(scene.commands.some(command => command.type === 'sprite'), false);
    assert.equal(scene.financialActions, false);
  }
  assert.deepEqual(byId.magicgarden_native.files, {});
  assert.equal(byId.magicgarden_native.presentationStatus, 'no-verified-public-art');
  assert.equal(byId.samurai_native.helpPanels.filter(item => Number.isInteger(item.providerSymbolId)).length, 10);
});

test('all scene asset dependencies are locked and review mode cannot be promoted by a caller', () => {
  for (const manifest of manifests) {
    const scene = createStaticReviewScene(manifest, {canStart: true});
    for (const command of scene.commands) {
      if (command.type === 'sprite') assert.ok(manifest.frames[command.frame]);
      if (command.type === 'image') assert.ok(manifest.files[command.file]);
      if (command.box) for (const value of Object.values(command.box)) assert.ok(Number.isFinite(value));
    }
    assert.equal(scene.reviewOnly, true); assert.equal(scene.productionLaunchEnabled, false);
    assert.throws(() => createRemainingScene({...manifest, productionLaunchEnabled: true}), /closed/);
  }
});

test('public asset selection is bounded and excludes scripts, credentials, sessions and wagering paths', () => {
  const selected = selectLock(lock);
  assert.equal(selected.assets.length, 79);
  assert.ok(selected.transferBytes < MAX_TRANSFER_BYTES);
  assert.equal(selectLock(lock, ['magicgarden_native']).transferBytes, 0);
  for (const source of selected.sources) assert.ok(validateStaticURL(source.url));
  for (const url of [
    'http://prod.cdn.amusnet.io/826/images/reelImages.png',
    'https://user:pass@prod.cdn.amusnet.io/826/images/reelImages.png',
    'https://prod.cdn.amusnet.io/826/Config.js',
    'https://prod.cdn.amusnet.io/826/images/reelImages.png?token=secret',
    'https://demogamesfree.pragmaticplay.net/gs2c/ge/v3/gameService?symbol=vs25vegas&action=doSpin',
    'https://unrelated.example/image.png',
  ]) assert.throws(() => validateStaticURL(url));
});

test('the transfer limit applies before any requested bytes are received', () => {
  const synthetic = directLock(Buffer.from('a'));
  synthetic.sources = Array.from({length: 7}, (_, i) => ({...synthetic.sources[0], id: 'source' + i, bytes: 16_000_000}));
  synthetic.assets = synthetic.sources.map(source => ({...synthetic.assets[0], sourceId: source.id}));
  assert.throws(() => selectLock(synthetic), /budget/);
});

test('inline package extraction decodes image data only and rejects malformed or executable resources', () => {
  const bytes = Buffer.from('isolated image byte fixture');
  const document = {resources: [{id: 'image', type: 'Texture', isInline: true, data: 'data:image/png;base64,' + bytes.toString('base64')}, {id: 'code', type: 'Script', isInline: true, data: 'throw new Error("must never run")'}]};
  assert.deepEqual(decodeInlineTexture(Buffer.from(JSON.stringify(document)), 'image'), bytes);
  assert.throws(() => decodeInlineTexture(Buffer.from(JSON.stringify(document)), 'code'), /Missing/);
  document.resources[0].data = 'data:image/svg+xml;base64,' + bytes.toString('base64');
  assert.throws(() => decodeInlineTexture(Buffer.from(JSON.stringify(document)), 'image'), /Invalid/);
  assert.throws(() => verifyBytes({sha256: sha256(bytes), bytes: bytes.length}, Buffer.from('corrupted')));
});

test('cached art is fully rehashed with no network, and corruption cannot pass verify-only mode', async () => {
  const cache = await mkdtemp(join(tmpdir(), 'zplay-remaining-art-test-'));
  try {
    const bytes = Buffer.from('local verified image fixture'), fixture = directLock(bytes), file = fixture.assets[0].file;
    await writeFile(join(cache, file), bytes);
    let calls = 0;
    const options = {cacheDir: cache, verifyOnly: true, fetchImpl: async () => {calls++; throw Error('No network allowed');}};
    assert.equal((await fetchRemainingAssets(fixture, options)).assets, 1);
    assert.equal(calls, 0);
    await writeFile(join(cache, file), Buffer.alloc(bytes.length));
    await assert.rejects(fetchRemainingAssets(fixture, options), /hash mismatch/);
    assert.equal(calls, 0);
  } finally {await rm(cache, {recursive: true, force: true});}
});

test('an incorrect download never becomes a cached source or image', async () => {
  const cache = await mkdtemp(join(tmpdir(), 'zplay-remaining-art-test-'));
  try {
    const fixture = directLock(Buffer.from('expected'));
    await assert.rejects(fetchRemainingAssets(fixture, {cacheDir: cache, fetchImpl: async () => new Response('invalid!')}), /hash mismatch/);
    assert.deepEqual(await readdir(cache), ['sources']);
    assert.deepEqual(await readdir(join(cache, 'sources')), []);
  } finally {await rm(cache, {recursive: true, force: true});}
});

test('SVG controls reject active content and external references before decoding', () => {
  const bytes = value => new TextEncoder().encode(value);
  assert.ok(validateStaticSvg(bytes('<svg width="10" height="10"><path fill="url(#local)"/></svg>')));
  for (const source of ['<svg><script>1</script></svg>', '<svg onload="x()"/>', '<svg><image href="https://remote.example/x"/></svg>', '<svg><path fill="url(https://remote.example/x)"/></svg>', '<svg><foreignObject/></svg>']) {
    assert.throws(() => validateStaticSvg(bytes(source)));
  }
});

test('SVG loading still requires the original full-byte hash before a decode is attempted', async () => {
  const bytes = Buffer.from('<svg width="10" height="10" xmlns="http://www.w3.org/2000/svg"></svg>');
  const hash = sha256(bytes), file = hash + '.svg';
  const manifest = {files: {[file]: {bytes: bytes.length, sha256: hash}}, fonts: [], audio: {}};
  const store = new RemainingAssetStore(manifest, {baseURL: 'https://assets.example/', fetchImpl: async () => new Response(Buffer.alloc(bytes.length))});
  await assert.rejects(store.loadImage(file), /hash mismatch/);
  assert.equal(store.images.size, 0);
  assert.equal(store.buffers.size, 0);
});
