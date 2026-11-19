// This wrapper only serves the new immutable presentation releases. All API,
// wallet, authentication and other game requests remain with the previous Worker.
const encoder = new TextEncoder();
const SHA256 = /^[0-9a-f]{64}$/;
const IDENTIFIER = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const MAX_VALUE_BYTES = 25 * 1024 * 1024;
const MIME = Object.freeze({
  mjs: 'application/javascript; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  otf: 'font/otf',
  ttf: 'font/ttf',
  woff: 'font/woff',
  woff2: 'font/woff2',
});

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isAssetName(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/.test(value)
    && value !== '.' && value !== '..';
}

function fail(message) {
  throw new Error(message);
}

// Exported for the offline package builder. Parsing and validation are synchronous;
// no request I/O or request-scoped promises are stored in module state.
export function validateReleasePin(pin, { game = false } = {}) {
  if (!isRecord(pin) || !IDENTIFIER.test(pin.release || '')) fail('INVALID_RELEASE_PIN');
  if (!SHA256.test(pin.manifestSha256 || '')
    || pin.manifestKey !== `native72/manifests/${pin.manifestSha256}`
    || !Number.isSafeInteger(pin.manifestSize) || pin.manifestSize < 2
    || pin.manifestSize > 1024 * 1024 || typeof pin.inlineManifest !== 'string') {
    fail('INVALID_MANIFEST_PIN');
  }
  const manifestBytes = encoder.encode(pin.inlineManifest);
  if (manifestBytes.byteLength !== pin.manifestSize) fail('MANIFEST_SIZE_MISMATCH');
  let manifest;
  try { manifest = JSON.parse(pin.inlineManifest); } catch { fail('INVALID_MANIFEST_JSON'); }
  if (!isRecord(manifest) || manifest.release !== pin.release || !isRecord(manifest.assets)) {
    fail('MANIFEST_RELEASE_MISMATCH');
  }
  if (game) {
    if (!IDENTIFIER.test(pin.gameId || '') || manifest.gameId !== pin.gameId
      || typeof manifest.htmlTemplate !== 'string'
      || !manifest.htmlTemplate.includes('{{GAME}}')
      || !manifest.htmlTemplate.includes('{{PRESENTATION_GAME}}')
      || !manifest.htmlTemplate.includes('</body>')) fail('INVALID_GAME_MANIFEST');
  } else if (pin.gameId !== undefined || manifest.gameId !== undefined
    || manifest.htmlTemplate !== undefined) {
    fail('INVALID_SHARED_MANIFEST');
  }
  const assets = Object.create(null);
  for (const [name, asset] of Object.entries(manifest.assets)) {
    if (!isAssetName(name) || !isRecord(asset)) fail('INVALID_ASSET_NAME');
    const type = MIME[name.slice(name.lastIndexOf('.') + 1).toLowerCase()];
    if (!type || asset.type !== type) fail('INVALID_ASSET_MIME');
    if (!SHA256.test(asset.sha256 || '') || !Number.isSafeInteger(asset.size)
      || asset.size < 0 || asset.size > MAX_VALUE_BYTES
      || typeof asset.kvKey !== 'string'
      || !/^native72\/[a-z0-9][a-z0-9_-]*\/[0-9a-f]{64}$/.test(asset.kvKey)
      || !asset.kvKey.endsWith(`/${asset.sha256}`)) fail('INVALID_ASSET_PIN');
    assets[name] = Object.freeze({ kvKey: asset.kvKey, sha256: asset.sha256, size: asset.size, type });
  }
  if (!Object.keys(assets).length) fail('EMPTY_RELEASE');
  return Object.freeze({
    release: pin.release,
    gameId: game ? pin.gameId : undefined,
    prefix: `/${pin.release}/`,
    manifestSha256: pin.manifestSha256,
    manifestBytes,
    htmlTemplate: game ? manifest.htmlTemplate : undefined,
    assets: Object.freeze(assets),
  });
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

function unavailable(request, release, message = 'Asset unavailable') {
  return new Response(request.method === 'HEAD' ? null : message, {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '1',
      'X-Content-Type-Options': 'nosniff',
      'X-Zplay-Release': release,
    },
  });
}

function notFound(request, release) {
  return new Response(request.method === 'HEAD' ? null : 'Not found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Zplay-Release': release,
    },
  });
}

function bytesOf(value) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

async function serveAsset(request, env, release, asset) {
  let bytes = null;
  // One bounded retry allows a transient read failure without retaining a failed
  // promise for subsequent users. A corrupt content-addressed value is never served.
  for (let attempt = 0; attempt < 2; attempt++) {
    try { bytes = bytesOf(await env.SSG_OFFICIAL_REFERENCES.get(asset.kvKey, 'arrayBuffer')); }
    catch { bytes = null; }
    if (bytes !== null) break;
  }
  if (bytes === null) return unavailable(request, release);
  if (bytes.byteLength !== asset.size || await sha256(bytes) !== asset.sha256) {
    return unavailable(request, release, 'Asset verification failed');
  }
  return new Response(request.method === 'HEAD' ? null : bytes, {
    headers: {
      'Content-Type': asset.type,
      'Content-Length': String(asset.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': `"${asset.sha256}"`,
      'X-Content-Type-Options': 'nosniff',
      'X-Zplay-Release': release,
    },
  });
}

function retainedHandlers(previous, fetch) {
  const descriptors = Object.getOwnPropertyDescriptors(previous);
  delete descriptors.fetch;
  for (const descriptor of Object.values(descriptors)) {
    if (typeof descriptor.value === 'function') descriptor.value = descriptor.value.bind(previous);
    if (descriptor.get) descriptor.get = descriptor.get.bind(previous);
    if (descriptor.set) descriptor.set = descriptor.set.bind(previous);
  }
  descriptors.fetch = { value: fetch, enumerable: true, configurable: true, writable: true };
  return Object.create(Object.getPrototypeOf(previous), descriptors);
}

export function installDedicatedReleases(previous, { shared, games, presencePath, createProductionHandler }) {
  if (typeof previous?.fetch !== 'function' || typeof createProductionHandler !== 'function'
    || !Array.isArray(games) || games.length !== 2) fail('INVALID_INSTALLATION');
  const releases = [validateReleasePin(shared), ...games.map(pin => validateReleasePin(pin, { game: true }))];
  if (new Set(releases.map(item => item.release)).size !== releases.length
    || new Set(games.map(item => item.gameId)).size !== games.length) fail('DUPLICATE_RELEASE');
  const pages = new Map(releases.filter(item => item.gameId).map(item => [item.gameId,
    createProductionHandler({
      // Assets are handled above the retained HTML handler so every GET and HEAD
      // receives the same byte, MIME and hash checks under the new prefixes.
      assets: Object.create(null),
      htmlTemplate: item.htmlTemplate,
      presencePath,
      published: true,
      gameId: item.gameId,
      release: item.release,
    }),
  ]));
  return retainedHandlers(previous, async function fetch(request, env, ctx) {
    if (env.PORTAL !== 'player' || !['GET', 'HEAD'].includes(request.method)) {
      return previous.fetch.call(previous, request, env, ctx);
    }
    const path = new URL(request.url).pathname;
    const release = releases.find(item => path.startsWith(item.prefix)
      || path === item.prefix.slice(0, -1)
      || (item.gameId && (path === `/games/${item.gameId}` || path === `/games/${item.gameId}/`)));
    if (!release) return previous.fetch.call(previous, request, env, ctx);
    try {
      if (await sha256(release.manifestBytes) !== release.manifestSha256) {
        return unavailable(request, release.release, 'Release verification failed');
      }
      if (release.gameId && (path === `/games/${release.gameId}` || path === `/games/${release.gameId}/`)) {
        // Preserve the production HTML/session bootstrap, presence injection,
        // security policy, cache behavior and placeholders without a new auth path.
        return await pages.get(release.gameId)(request, env)
          ?? unavailable(request, release.release, 'Release unavailable');
      }
      const raw = path.slice(release.prefix.length);
      let name;
      try { name = decodeURIComponent(raw); } catch { return notFound(request, release.release); }
      // Only canonical immutable names are exposed; encoded separators, traversal,
      // double decoding, backslashes and alternative aliases cannot select assets.
      if (name !== raw || !isAssetName(name) || !Object.hasOwn(release.assets, name)) {
        return notFound(request, release.release);
      }
      return await serveAsset(request, env, release.release, release.assets[name]);
    } catch {
      return unavailable(request, release.release);
    }
  });
}
