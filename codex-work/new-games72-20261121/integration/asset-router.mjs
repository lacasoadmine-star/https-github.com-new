/**
 * Unmounted, Worker-compatible router for reviewed new72 runtime assets.
 *
 * createPinnedAssetRouter({ active, retained, readAsset }) takes trusted release
 * snapshots, never request-supplied activation data. Each snapshot contains the
 * existing registry, publication, release-evidence manifest, and a Map of the
 * pinned per-game asset-manifest paths to their UTF-8 bytes. The existing release
 * gate must approve a publication before the host supplies it here; validating
 * these hashes is not that approval and does not authorize a wallet action.
 *
 * The host may call the returned async handler before its existing router:
 * `const response = await assets(request); if (response) return response;`.
 * Every path outside /new-games72/ returns null, including all legacy routes.
 * Canonical game launch pages are a separate integration: runtime assets use
 * pinnedAssetPath(publication, file.publicPath), not mutable canonical URLs.
 *
 * readAsset(file, release) reads exactly one immutable stored object and returns
 * Uint8Array/ArrayBuffer or null. It must use the supplied release/source/hash
 * identity, not fall back to another release. No storage binding is selected or
 * created here. One GET/HEAD reads once and verifies size/SHA-256 before success.
 *
 * Explicit retained snapshots preserve historical immutable assets needed by
 * accepted rounds even while the active publication is absent, closed or invalid.
 * Each release is validated independently and compiled atomically. A failure in
 * one release cannot expose its partial index or disable another retained one.
 * Retained assets confer no right to start new rounds. This module never
 * deletes assets, replaces a publication, changes live routing, or deploys.
 */
import { additiveCatalog } from './catalog.mjs';

const ROOT = '/new-games72/';
const SHA = /^[a-f0-9]{64}$/;
const RELEASE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const MAX_FILE_BYTES = 32 * 1024 * 1024;
const RUNTIME_KINDS_FORBIDDEN = new Set(['reference-screenshot', 'reference-video', 'screen-playback']);
const MIME = /^(?:application|audio|font|image|text|video)\/[a-zA-Z0-9.+-]+$/;
const encoder = new TextEncoder();
const fail = code => { throw new Error(code); };
const check = (condition, code) => { if (!condition) fail(code); };
const stable = value => value === null || typeof value !== 'object' ? JSON.stringify(value)
  : Array.isArray(value) ? '[' + value.map(stable).join(',') + ']'
    : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
const safePath = value => typeof value === 'string' && /^[A-Za-z0-9_.\/-]+$/.test(value) &&
  !value.includes('//') && value.split('/').filter(Boolean).every(part => part !== '.' && part !== '..');
const relativePath = value => safePath(value) && !value.startsWith('/') && !value.endsWith('/');
const bytesOf = value => value instanceof Uint8Array ? value
  : value instanceof ArrayBuffer ? new Uint8Array(value) : null;

export function pinnedAssetPath(publication, publicPath) {
  check(RELEASE.test(publication?.releaseId ?? '') && /^[a-f0-9]{40}$/.test(publication?.sourceCommit ?? '') &&
    safePath(publicPath) && publicPath.startsWith(ROOT) && !publicPath.endsWith('/'), 'NEW72_INVALID_PINNED_PATH');
  return `${ROOT}releases/${publication.releaseId}/${publication.sourceCommit}/${publicPath.slice(ROOT.length)}`;
}

function errorResponse(code, status, method, extra = {}) {
  return new Response(method === 'HEAD' ? null : JSON.stringify({ error: code }), {
    status, headers: { 'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra },
  });
}

export async function createPinnedAssetRouter({ active = null, retained = [], readAsset,
  subtle = globalThis.crypto?.subtle } = {}) {
  const index = new Map(), prefixes = new Set();
  const failedPrefixes = new Map();
  let configurationError = null, activeError = 'NEW72_PUBLICATION_INACTIVE';
  const errorCode = error => /^NEW72_[A-Z0-9_]+$/.test(error.message ?? '') ? error.message : 'NEW72_PUBLICATION_INVALID';
  const digest = async bytes => [...new Uint8Array(await subtle.digest('SHA-256', bytes))]
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
  const verifyBytes = async (bytes, descriptor, code) => {
    const original = bytesOf(bytes);
    check(original && original.byteLength === descriptor.byteLength, code);
    const value = new Uint8Array(original);
    check(await digest(value) === descriptor.sha256, code);
    return value;
  };
  const compileRelease = async supplied => {
      const compiled = new Map();
      const registry = structuredClone(supplied.registry), publication = structuredClone(supplied.publication);
      const manifest = structuredClone(supplied.manifest);
      check(publication?.state === 'ACTIVE' && RELEASE.test(publication.releaseId ?? ''), 'NEW72_COMPLETE_PUBLICATION_REQUIRED');
      additiveCatalog({ legacyGames: [], registry, publication });
      check(manifest?.schema === 'zplay/new-games72-release-evidence/v1' &&
        manifest.releaseId === publication.releaseId && manifest.sourceCommit === publication.sourceCommit &&
        typeof manifest.frontendVersion === 'string' && !!manifest.frontendVersion &&
        typeof manifest.backendVersion === 'string' && !!manifest.backendVersion &&
        await digest(encoder.encode(stable(manifest))) === publication.releaseManifestSha256 &&
        await digest(encoder.encode(stable(registry))) === manifest.registrySha256,
      'NEW72_RELEASE_MANIFEST_MISMATCH');
      check(Array.isArray(manifest.games) && manifest.games.length === 72 &&
        new Set(manifest.games.map(game => game.gameId)).size === 72 && supplied.assetManifests instanceof Map,
      'NEW72_COMPLETE_ASSET_MANIFESTS_REQUIRED');
      const entries = new Map(manifest.games.map(game => [game.gameId, game]));
      const publicationGames = new Map(publication.games.map(game => [game.gameId, game]));
      const release = Object.freeze({ releaseId: publication.releaseId, sourceCommit: publication.sourceCommit,
        releaseManifestSha256: publication.releaseManifestSha256, frontendVersion: manifest.frontendVersion });
      const prefix = `${ROOT}releases/${release.releaseId}/${release.sourceCommit}/`;
      for (const game of registry.games) {
        const published = publicationGames.get(game.gameId), pin = entries.get(game.gameId)?.pins?.assets;
        check(safePath(game.assets.prefix) && game.assets.prefix.startsWith(ROOT) && game.assets.prefix.endsWith('/') &&
          published.frontendVersion === manifest.frontendVersion && pin?.path === game.assets.manifestPath &&
          pin.mediaType === 'application/json' && SHA.test(pin.sha256 ?? '') &&
          Number.isSafeInteger(pin.byteLength) && pin.byteLength > 0 && pin.byteLength <= MAX_FILE_BYTES,
        'NEW72_GAME_VERSION_OR_ASSET_PIN_MISMATCH');
        const manifestBytes = await verifyBytes(supplied.assetManifests.get(pin.path), pin, 'NEW72_ASSET_MANIFEST_HASH_MISMATCH');
        let assets; try { assets = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes)); }
        catch { fail('NEW72_INVALID_ASSET_MANIFEST'); }
        check(assets.schema === 'zplay/new72-assets/v1' && assets.gameId === game.gameId &&
          Array.isArray(assets.files) && assets.files.length > 0, 'NEW72_INVALID_ASSET_MANIFEST');
        const filePaths = new Set();
        let coverPresent = false;
        for (const file of assets.files) {
          check(relativePath(file.path) && !filePaths.has(file.path) && safePath(file.publicPath) &&
            file.publicPath.startsWith(game.assets.prefix) && !file.publicPath.endsWith('/') &&
            SHA.test(file.sha256 ?? '') && Number.isSafeInteger(file.byteLength) &&
            file.byteLength > 0 && file.byteLength <= MAX_FILE_BYTES && MIME.test(file.mediaType ?? '') &&
            !RUNTIME_KINDS_FORBIDDEN.has(file.kind), 'NEW72_INVALID_RUNTIME_ASSET');
          filePaths.add(file.path);
          const url = pinnedAssetPath(publication, file.publicPath);
          check(!compiled.has(url), 'NEW72_DUPLICATE_ASSET_URL');
          if (file.publicPath === published.coverPath && file.sha256 === published.coverSha256) coverPresent = true;
          compiled.set(url, { file: Object.freeze({ ...file }), release });
        }
        check(coverPresent, 'NEW72_PINNED_COVER_MISSING');
      }
      return { compiled, prefix };
  };
  try {
    check(typeof readAsset === 'function' && typeof subtle?.digest === 'function', 'NEW72_ASSET_STORAGE_UNAVAILABLE');
    check(Array.isArray(retained), 'NEW72_INVALID_RETAINED_RELEASES');
  } catch (error) {
    configurationError = errorCode(error);
  }
  if (!configurationError) {
    const seenPrefixes = new Set();
    for (const [position, supplied] of [active, ...retained].entries()) {
      const pub = supplied?.publication;
      const suppliedPrefix = RELEASE.test(pub?.releaseId ?? '') && /^[a-f0-9]{40}$/.test(pub?.sourceCommit ?? '')
        ? `${ROOT}releases/${pub.releaseId}/${pub.sourceCommit}/` : null;
      try {
        if (position === 0) check(pub?.state === 'ACTIVE', 'NEW72_PUBLICATION_INACTIVE');
        if (suppliedPrefix) {
          check(!seenPrefixes.has(suppliedPrefix), 'NEW72_DUPLICATE_RELEASE_ID');
          seenPrefixes.add(suppliedPrefix);
          // An invalid active snapshot cannot be silently replaced by a retained
          // snapshot advertising the same immutable URL identity.
          check(!failedPrefixes.has(suppliedPrefix), 'NEW72_DUPLICATE_RELEASE_ID');
        }
        const { compiled, prefix } = await compileRelease(supplied);
        for (const [url, entry] of compiled) index.set(url, entry);
        prefixes.add(prefix);
        if (position === 0) activeError = null;
      } catch (error) {
        const code = errorCode(error);
        if (suppliedPrefix) failedPrefixes.set(suppliedPrefix, code);
        if (position === 0) activeError = code;
      }
    }
  }

  return async request => {
    let url, rawPath;
    try {
      url = new URL(request.url);
      rawPath = request.url.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]*(\/[^?#]*)/i)?.[1] ?? '/';
    } catch { return null; }
    let decodedPath = rawPath;
    try { decodedPath = decodeURIComponent(rawPath); } catch { /* Scoped malformed paths fail below. */ }
    const inScope = value => value === '/new-games72' || value.startsWith(ROOT);
    if (![rawPath, decodedPath, url.pathname].some(inScope)) return null;
    const method = request.method?.toUpperCase();
    if (!safePath(rawPath) || rawPath !== url.pathname || url.search || url.hash || !inScope(rawPath))
      return errorResponse('NEW72_INVALID_ASSET_PATH', 400, method);
    if (!['GET', 'HEAD'].includes(method)) return errorResponse('NEW72_METHOD_NOT_ALLOWED', 405, method, { allow: 'GET, HEAD' });
    if (configurationError) return errorResponse(configurationError, 503, method);
    const failed = [...failedPrefixes].find(([prefix]) => rawPath.startsWith(prefix));
    if (failed) return errorResponse(failed[1], 503, method);
    const entry = index.get(rawPath);
    if (!entry) {
      if ([...prefixes].some(prefix => rawPath.startsWith(prefix))) return errorResponse('NEW72_ASSET_NOT_FOUND', 404, method);
      return errorResponse(activeError ?? 'NEW72_RELEASE_NOT_AVAILABLE', activeError ? 503 : 404, method);
    }
    let supplied;
    try { supplied = await readAsset(entry.file, entry.release); }
    catch { return errorResponse('NEW72_ASSET_READ_FAILED', 503, method); }
    if (supplied == null) return errorResponse('NEW72_ASSET_MISSING', 503, method);
    const raw = bytesOf(supplied);
    if (!raw || raw.byteLength !== entry.file.byteLength) return errorResponse('NEW72_ASSET_SIZE_MISMATCH', 503, method);
    const bytes = new Uint8Array(raw); // Snapshot mutable storage buffers before hashing or returning.
    try { if (await digest(bytes) !== entry.file.sha256) return errorResponse('NEW72_ASSET_HASH_MISMATCH', 503, method); }
    catch { return errorResponse('NEW72_ASSET_VERIFICATION_FAILED', 503, method); }
    return new Response(method === 'HEAD' ? null : bytes, { status: 200, headers: {
      'content-type': entry.file.mediaType, 'content-length': String(bytes.byteLength),
      'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff',
      etag: `"sha256-${entry.file.sha256}"`, 'x-zplay-release': entry.release.releaseId,
      'x-zplay-source': entry.release.sourceCommit,
    } });
  };
}
