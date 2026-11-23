import test from 'node:test';
import assert from 'node:assert/strict';
import { createBurnMediaPlan, verifyBurnMedia, canOpenBurnPlayer, BURN_MEDIA_BASE } from './geo-independent-assets.mjs';

const config = {
  origin: 'https://superwin-player.apdiy61.workers.dev/',
  images: { wild: 'burn/wild.webp', seven: 'burn/seven.png' },
  sounds: { spin: 'audio/spin.ogg' }, licenseConfirmed: true
};
const plan = () => createBurnMediaPlan(config);

test('keeps all media requests on the ZPLAY Player origin', () => {
  const p = plan();
  assert.equal(p.images.wild.url, config.origin.slice(0, -1) + BURN_MEDIA_BASE + 'burn/wild.webp');
  assert.equal(p.sounds.spin.type, 'audio');
});

test('no provider assets are allowed without confirmed usage rights', () => {
  assert.throws(() => createBurnMediaPlan({ ...config, licenseConfirmed: false }), /MEDIA_RIGHTS_UNCONFIRMED/);
});

test('rejects external CDN URL and traversal', () => {
  assert.throws(() => createBurnMediaPlan({ ...config, images: { wild: 'https://other.example/wild.webp', seven: 'seven.png' } }), /MEDIA_FILE_INVALID/);
  assert.throws(() => createBurnMediaPlan({ ...config, images: { wild: '../wild.webp', seven: 'seven.png' } }), /MEDIA_FILE_INVALID/);
});

test('rejects missing reel asset and wrong sound MIME extension', () => {
  assert.throws(() => createBurnMediaPlan({ ...config, images: { seven: 'seven.png' } }), /MEDIA_SYMBOLS_MISSING/);
  assert.throws(() => createBurnMediaPlan({ ...config, sounds: { spin: 'spin.webp' } }), /MEDIA_FILE_INVALID/);
});

test('successfully probes same-origin image and audio files only', async () => {
  const observed = [];
  const fetcher = async (url, opts) => {
    observed.push({ url, opts });
    return { ok: true, redirected: false, url, headers: { get: () => url.endsWith('.ogg') ? 'audio/ogg' : 'image/webp' }, body: { cancel: async () => {} } };
  };
  const response = await verifyBurnMedia(plan(), { fetcher });
  assert.equal(response.checkedCount, 3);
  assert.equal(response.mediaReady, true);
  assert.ok(observed.every(o => new URL(o.url).origin === new URL(config.origin).origin && o.opts.redirect === 'error'));
});

test('rejects missing assets and HTML country-denial pages', async () => {
  await assert.rejects(verifyBurnMedia(plan(), { fetcher: async url => ({ ok: false, redirected: false, url, headers: { get: () => 'text/html' } }) }), /MEDIA_NOT_READY/);
  await assert.rejects(verifyBurnMedia(plan(), { fetcher: async url => ({ ok: true, redirected: false, url, headers: { get: () => 'text/html' } }) }), /MEDIA_NOT_READY/);
});

test('rejects redirects and malicious media origins', async () => {
  await assert.rejects(verifyBurnMedia(plan(), { fetcher: async () => ({ ok: true, redirected: true, headers: { get: () => 'image/png' } }) }), /MEDIA_NOT_READY/);
  assert.throws(() => createBurnMediaPlan({ ...config, origin: 'http://insecure.local/' }), /MEDIA_ORIGIN_INVALID/);
});

test('player launch depends on lawful backend decision and assets, not browser country locale', () => {
  assert.equal(canOpenBurnPlayer({ mediaReady: true, authenticated: true, serverAuthorized: true }), true);
  assert.equal(canOpenBurnPlayer({ mediaReady: true, authenticated: true, serverAuthorized: false }), false);
  assert.equal(canOpenBurnPlayer({ mediaReady: false, authenticated: true, serverAuthorized: true }), false);
});
