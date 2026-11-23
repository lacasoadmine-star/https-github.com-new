import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadArtwork} from './artwork.mjs';

const ORIGIN = 'https://superwin-player.apdiy61.workers.dev';
const BASE = new URL('/native-ui/old70/multihot40/', ORIGIN);
const delayTurn = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; };

function installBrowser(t, decode) {
  for (const [name, value] of [
    ['location', {href: BASE.href, origin: ORIGIN}],
    ['createImageBitmap', decode]
  ]) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, {value, configurable: true, writable: true});
    t.after(() => { if (original) Object.defineProperty(globalThis, name, original); else delete globalThis[name]; });
  }
}

function fixture() {
  const bytes = [new Uint8Array([1, 11]), new Uint8Array([2, 22]), new Uint8Array([3, 33])];
  const assets = bytes.map(data => {
    const sha256 = createHash('sha256').update(data).digest('hex');
    return {sha256, file: 'media/' + sha256 + '.png', bytes: data.byteLength};
  });
  const descriptor = index => ({
    frame: {x: 4 + index, y: 7, w: index % 2 ? 32 : 20, h: index % 2 ? 20 : 32},
    trim: {x: 12, y: 14, w: 20, h: 32}, sourceSize: {w: 100, h: 100}, rotated: !!(index % 2)
  });
  const manifest = {
    gameId: 'multihot40_native', mode: 'PRACTICE', assets, background: assets[1].sha256,
    sprites: [
      {imageAssetId: assets[0].sha256, frames: Object.fromEntries([0, 1, 2, 3].map(i => ['Box/' + i, descriptor(i)]))},
      {imageAssetId: assets[2].sha256, frames: Object.fromEntries([4, 5, 6, 7].map(i => ['Box/' + i, descriptor(i)]))}
    ], audio: [{label: 'Button.mp3', path: 'media/audio/' + '0'.repeat(64) + '.mp3'}]
  };
  const canvases = [], requests = [];
  const doc = {createElement(tag) {
    assert.equal(tag, 'canvas');
    const operations = [];
    const ctx = Object.fromEntries(['save', 'restore', 'translate', 'rotate', 'drawImage'].map(name =>
      [name, (...args) => operations.push({name, args})]));
    const canvas = {tag, width: 0, height: 0, operations, getContext: () => ctx};
    canvases.push(canvas); return canvas;
  }};
  const fetcher = async (url, options) => {
    requests.push({url: url.href, options});
    if (url.pathname.endsWith('/artwork.json')) return {ok: true, json: async () => manifest};
    const index = assets.findIndex(asset => url.pathname.endsWith('/' + asset.file));
    assert.notEqual(index, -1);
    return {ok: true, arrayBuffer: async () => bytes[index].buffer};
  };
  return {bytes, assets, manifest, canvases, requests, doc, fetcher};
}

function bitmapFactory() {
  const created = [];
  return {created, decode: async input => {
    const bitmap = {id: created.length, width: input.width || 100, height: input.height || 100,
      closeCalls: 0, close() { this.closeCalls++; }};
    created.push(bitmap); return bitmap;
  }};
}

test('late bitmap decodes are closed once after another atlas request rejects', {timeout: 3000}, async t => {
  const f = fixture(), bothDecoding = deferred(), decodes = [];
  let started = 0;
  installBrowser(t, () => {
    const completion = deferred();
    decodes.push(completion);
    if (++started === 2) bothDecoding.resolve();
    return completion.promise;
  });
  const fetcher = async (url, options) => {
    if (url.pathname.endsWith('/' + f.assets[1].file)) {
      await bothDecoding.promise;
      return {ok: false};
    }
    return f.fetcher(url, options);
  };
  await assert.rejects(loadArtwork({base: BASE, fetcher, doc: f.doc}), /MH40_ASSET_UNAVAILABLE/);
  assert.equal(decodes.length, 2);
  const bitmaps = decodes.map((completion, index) => {
    const bitmap = {id: index, closeCalls: 0, close() { this.closeCalls++; }};
    completion.resolve(bitmap); return bitmap;
  });
  await delayTurn(); await delayTurn();
  assert.deepEqual(bitmaps.map(b => b.closeCalls), [1, 1]);
  assert.ok(f.requests.filter(r => !r.url.endsWith('/artwork.json')).every(r => r.options.signal.aborted));
});

test('crops transparent source padding and disposes retained and released bitmaps exactly once', async t => {
  const f = fixture(), bitmaps = bitmapFactory();
  installBrowser(t, bitmaps.decode);
  const artwork = await loadArtwork({base: BASE, fetcher: f.fetcher, doc: f.doc});
  assert.equal(artwork.symbols.length, 8);
  assert.equal(f.canvases.length, 8);
  for (const [index, canvas] of f.canvases.entries()) {
    assert.equal(canvas.width, 20);
    assert.equal(canvas.height, 32);
    assert.deepEqual(artwork.symbols[index].descriptor.sourceSize, {w: 20, h: 32});
    const draw = canvas.operations.find(op => op.name === 'drawImage');
    if (index % 2) {
      assert.deepEqual(canvas.operations.find(op => op.name === 'translate').args, [0, 32]);
      assert.deepEqual(draw.args.slice(-4), [0, 0, 32, 20]);
    } else assert.deepEqual(draw.args.slice(-4), [0, 0, 20, 32]);
  }
  assert.equal(bitmaps.created.length, 11);
  assert.equal(bitmaps.created.filter(b => b.closeCalls === 1).length, 2);
  assert.equal(artwork.background.closeCalls, 0);
  artwork.dispose(); artwork.dispose();
  assert.ok(bitmaps.created.every(b => b.closeCalls === 1));
  assert.ok(f.requests.every(r => r.options.credentials === 'omit' && r.options.redirect === 'error'));
});

test('failed symbol decode releases original atlases and previously cropped symbols', async t => {
  const f = fixture(), bitmaps = bitmapFactory();
  let symbolDecodes = 0;
  installBrowser(t, async input => {
    if (input.tag === 'canvas' && ++symbolDecodes === 3) throw Error('FIXTURE_SYMBOL_DECODE_FAILURE');
    return bitmaps.decode(input);
  });
  await assert.rejects(loadArtwork({base: BASE, fetcher: f.fetcher, doc: f.doc}), /FIXTURE_SYMBOL_DECODE_FAILURE/);
  assert.equal(bitmaps.created.length, 5);
  assert.ok(bitmaps.created.every(b => b.closeCalls === 1));
});

test('corrupt image bytes fail integrity and cannot become accepted symbol artwork', async t => {
  const f = fixture(), bitmaps = bitmapFactory();
  installBrowser(t, bitmaps.decode);
  const fetcher = async (url, options) => {
    if (url.pathname.endsWith('/' + f.assets[0].file))
      return {ok: true, arrayBuffer: async () => new Uint8Array([1, 12]).buffer};
    return f.fetcher(url, options);
  };
  await assert.rejects(loadArtwork({base: BASE, fetcher, doc: f.doc}), /MH40_ASSET_INTEGRITY/);
  await delayTurn(); await delayTurn();
  assert.equal(f.canvases.length, 0);
  assert.ok(bitmaps.created.every(b => b.closeCalls === 1));
});

test('different-origin or different-title manifests cannot load this game artwork', async t => {
  const f = fixture(), bitmaps = bitmapFactory();
  installBrowser(t, bitmaps.decode);
  await assert.rejects(loadArtwork({base: new URL('https://invalid.example/game/'), fetcher: f.fetcher, doc: f.doc}), /SAME_ORIGIN_REQUIRED/);
  assert.equal(f.requests.length, 0);
  f.manifest.gameId = 'a-different-game';
  await assert.rejects(loadArtwork({base: BASE, fetcher: f.fetcher, doc: f.doc}), /ART_MANIFEST_INVALID/);
  assert.equal(f.requests.length, 1);
  assert.equal(bitmaps.created.length, 0);
});
