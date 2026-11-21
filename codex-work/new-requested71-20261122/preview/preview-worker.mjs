/** Additive visual preview only. No account, wallet or round transport. */
export const PREVIEW_PATH = '/new-games72/multi-hot-10/preview/';
export const IMMUTABLE_PREFIX = '/_zplay/m10-preview/';
export const REPOSITORY = 'lacasoadmine-star/https-github.com-new';
export const MODULE_ROOT = '/new-games72/games/multi-hot-10/';
export const REPOSITORY_ROOT = 'codex-work/new-games72-20261121/games/multi-hot-10/';
export const SHARED_PATH = '/new-games72/shared/round-recovery.mjs';
export const SHARED_REPOSITORY_PATH = 'codex-work/new-games72-20261121/shared/round-recovery.mjs';
export const RUNTIME_FILES = Object.freeze([
  'main.mjs', 'controls.mjs', 'evaluator.mjs', 'style.css',
  'render/atlas.mjs', 'render/renderer.mjs', 'render/layout.mjs',
  'render/dialogs.mjs', 'render/audio.mjs', 'render/logo.mjs',
  'backend/contract.mjs', 'backend/deferred-client.mjs',
  'backend/deferred-controller.mjs', 'backend/deferred-protocol.mjs',
  ...[0, 1, 2, 3].flatMap(i => [`assets/runtime/Images-${i}.json`, `assets/runtime/Images-${i}.png`]),
  'assets/runtime/background.png', 'assets/runtime/logo.atlas.txt',
  'assets/runtime/logo-skeleton.json', 'assets/runtime/logo.png',
  ...['button', 'music', 'multiplier-win', 'quick-stop', 'reel-motion',
    'reel-stop-1', 'reel-stop-2', 'reel-stop-3', 'reel-stop-4', 'reel-stop-5',
    'spin', 'take-win', 'win', 'win-counter'].map(name => `assets/sound/${name}.mp3`),
]);
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
const TYPES = Object.freeze({
  mjs: ['text/javascript; charset=utf-8', ['text/javascript', 'application/javascript', 'text/plain']],
  css: ['text/css; charset=utf-8', ['text/css', 'text/plain']],
  json: ['application/json; charset=utf-8', ['application/json', 'text/plain']],
  txt: ['text/plain; charset=utf-8', ['text/plain']],
  png: ['image/png', ['image/png']],
  mp3: ['audio/mpeg', ['audio/mpeg', 'audio/mp3']],
});
const EXPECTED = new Map(RUNTIME_FILES.map(name => [MODULE_ROOT + name, REPOSITORY_ROOT + name]));
EXPECTED.set(SHARED_PATH, SHARED_REPOSITORY_PATH);
const utf8 = new TextEncoder();
export function typeFor(path) { return TYPES[path.split('.').at(-1)]?.[0] ?? null; }
export async function sha256(bytes, cryptoImpl = globalThis.crypto) {
  return Array.from(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
}
export function immutableBase(config) {
  return `${IMMUTABLE_PREFIX}${config.sourceCommit}/${config.revision}`;
}
export function validateManifest(config, { allowUnpinned = false } = {}) {
  if (config?.schema !== 'zplay/m10-visual-preview/v1' || config.repository !== REPOSITORY ||
      config.entry !== MODULE_ROOT + 'main.mjs' || config.visualPreviewOnly !== true || config.financialOperations !== false ||
      !/^[a-f0-9]{24}$/.test(config.revision ?? '') ||
      !(allowUnpinned && config.sourceCommit === null) && !/^[a-f0-9]{40}$/.test(config.sourceCommit ?? '') ||
      !Array.isArray(config.entries) || config.entries.length !== EXPECTED.size) throw Error('PREVIEW_MANIFEST_INVALID');
  const seen = new Set(); let total = 0;
  for (const entry of config.entries) {
    if (seen.has(entry.path) || EXPECTED.get(entry.path) !== entry.repositoryPath ||
        typeFor(entry.path) !== entry.contentType || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? '') ||
        !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > MAX_FILE_BYTES) throw Error('PREVIEW_ENTRY_INVALID');
    seen.add(entry.path); total += entry.bytes;
  }
  if (total > 32 * 1024 * 1024) throw Error('PREVIEW_TOTAL_TOO_LARGE');
  return config;
}
function responseHeaders(type, cache = 'no-store') {
  return {
    'Content-Type': type, 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Zplay-Preview': 'multi-hot-10-visual-only',
  };
}
function plain(request, text, status, extra = {}) {
  return new Response(request.method === 'HEAD' ? null : text, {
    status, headers: { ...responseHeaders('text/plain; charset=utf-8'), ...extra },
  });
}
async function boundedBytes(response, expectedBytes) {
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > expectedBytes)) throw Error('PREVIEW_SIZE_MISMATCH');
  const reader = response.body?.getReader();
  if (!reader) throw Error('PREVIEW_EMPTY_ASSET');
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > expectedBytes) { await reader.cancel(); throw Error('PREVIEW_SIZE_MISMATCH'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (length !== expectedBytes) throw Error('PREVIEW_SIZE_MISMATCH');
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
function csp(origin, base, nonce) {
  const source = origin + base + '/';
  return [`default-src 'none'`, `script-src 'nonce-${nonce}' ${source}`,
    `style-src 'unsafe-inline' ${source}`, `img-src ${source} data:`,
    `media-src ${source}`, `connect-src ${source}`, `font-src 'none'`,
    `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `frame-ancestors 'none'`].join('; ');
}
export function previewHTML(base, nonce) {
  const stylesheet = base + MODULE_ROOT + 'style.css';
  // Map only this exact M10 module tree and its one infrastructure import.
  // This retains original absolute specifiers while resolving to immutable URLs.
  const importMap = JSON.stringify({ imports: {
    [MODULE_ROOT]: base + MODULE_ROOT,
    [SHARED_PATH]: base + SHARED_PATH,
  } });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="dark"><meta name="robots" content="noindex,nofollow">
<title>Multi Hot 10 visual preview · ZPLAY</title>
<link rel="stylesheet" href="${stylesheet}">
<style>.m10-preview-label{margin:0;padding:10px 16px;background:#15241f;color:#f4df8c;font:14px/1.45 Arial,sans-serif;text-align:center;border-bottom:1px solid #5c5738}.m10-preview-label strong{color:#fff}.m10-preview-note{color:#c9d7cf}.m10-preview-loading{padding:32px;text-align:center}.m10-preview-error{padding:24px;color:#ffdfb0;text-align:center}</style>
<script type="importmap" nonce="${nonce}">${importMap}</script></head>
<body><header class="m10-topbar"><a href="/" aria-label="Back to games">ZPLAY</a><span>Multi Hot 10</span></header>
<p class="m10-preview-label"><strong>Visual preview — bets disabled.</strong> <span class="m10-preview-note">Explore the artwork, menu, settings and bet display. No rounds or wallet transactions are available.</span></p>
<main id="multi-hot-10" aria-label="Multi Hot 10 visual preview"><p class="m10-preview-loading" role="status">Loading game artwork…</p></main>
<noscript><p class="m10-preview-error">Enable JavaScript to view the artwork and controls.</p></noscript>
<script type="module" nonce="${nonce}">
globalThis.__M10_MANUAL_MOUNT__ = true;
const root = document.getElementById('multi-hot-10');
try {
  const { mountMultiHot10 } = await import(${JSON.stringify(MODULE_ROOT + 'main.mjs')});
  const app = await mountMultiHot10({ root, previewOnly: true });
  if (!app.snapshot.previewOnly || app.snapshot.financialHostConnected || app.snapshot.isolated || app.snapshot.cashEnabled) {
    app.dispose(); throw new Error('Preview boundary failed');
  }
  root.dataset.visualPreview = 'true';
} catch {
  root.replaceChildren(); const error = document.createElement('p');
  error.className = 'm10-preview-error'; error.setAttribute('role','alert');
  error.textContent = 'The visual preview could not load. Please reload.'; root.append(error);
}
</script></body></html>`;
}
/** Preserve all prior exports and responses outside the dedicated preview scope.
 * Unpinned or malformed manifests fail closed only for this new preview route.
 */
export function createVisualPreviewWorker(previous, config, {
  fetchImpl = globalThis.fetch, cryptoImpl = globalThis.crypto,
  cache = globalThis.caches?.default, timeoutMs = 15000,
} = {}) {
  if (!previous || typeof previous.fetch !== 'function') throw Error('PREVIOUS_WORKER_REQUIRED');
  let valid = false;
  try {
    validateManifest(config);
    config = Object.freeze({ ...config, entries: config.entries.map(entry => Object.freeze({ ...entry })) });
    valid = true;
  } catch { /* Only this new preview stays unavailable. */ }
  const entries = new Map(valid ? config.entries.map(entry => [entry.path, Object.freeze({ ...entry })]) : []);
  const base = valid ? immutableBase(config) : null;
  const inflight = new Map();
  async function verified(entry, canonicalURL, ctx) {
    const key = new Request(canonicalURL, { method: 'GET' });
    let cached;
    try { cached = await cache?.match(key); } catch { /* Cache is optional. */ }
    if (cached?.status === 200 && cached.headers.get('content-type') === entry.contentType &&
        cached.headers.get('etag') === `"sha256-${entry.sha256}"`) {
      try {
        const bytes = await boundedBytes(cached, entry.bytes);
        if (await sha256(bytes, cryptoImpl) === entry.sha256) return bytes;
      } catch { /* Never serve an incomplete or mismatched cached response. */ }
    }
    if (inflight.has(canonicalURL)) return inflight.get(canonicalURL);
    const pending = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(Math.max(timeoutMs, 1), 30000));
      try {
        // Build a fresh fixed-host request. Never copy incoming headers, cookies,
        // bearer tokens, referrers, query strings, or Cloudflare credentials.
        const source = `https://raw.githubusercontent.com/${REPOSITORY}/${config.sourceCommit}/${entry.repositoryPath}`;
        // Workers supports manual/follow, not redirect:error. Manual prevents a
        // redirected source from being fetched; the status check below rejects it.
        const upstream = await fetchImpl(source, { method: 'GET', credentials: 'omit',
          redirect: 'manual', cache: 'no-store', headers: { Accept: '*/*' }, signal: controller.signal });
        const upstreamType = (upstream.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
        if (upstream.status !== 200 || upstream.redirected || !TYPES[entry.path.split('.').at(-1)][1].includes(upstreamType)) throw Error('PREVIEW_SOURCE_REJECTED');
        const bytes = await boundedBytes(upstream, entry.bytes);
        if (await sha256(bytes, cryptoImpl) !== entry.sha256) throw Error('PREVIEW_HASH_MISMATCH');
        if (cache?.put) {
          const copy = new Response(bytes, { headers: assetHeaders(entry) });
          const save = Promise.resolve(cache.put(key, copy)).catch(() => {});
          if (ctx?.waitUntil) ctx.waitUntil(save); else await save;
        }
        return bytes;
      } finally { clearTimeout(timer); }
    })();
    inflight.set(canonicalURL, pending);
    try { return await pending; } finally { inflight.delete(canonicalURL); }
  }
  function assetHeaders(entry) {
    return { ...responseHeaders(entry.contentType, 'public, max-age=31536000, immutable'),
      'Content-Length': String(entry.bytes), ETag: `"sha256-${entry.sha256}"`,
      'X-Zplay-Source-Commit': config.sourceCommit, 'X-Zplay-Content-Sha256': entry.sha256 };
  }
  return {
    ...previous,
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      const page = url.pathname === PREVIEW_PATH || url.pathname === PREVIEW_PATH.slice(0, -1);
      const immutable = url.pathname.startsWith(IMMUTABLE_PREFIX);
      // Absolute imports are scoped by the preview document's import map.
      // Never replace existing unversioned game or shared-infrastructure URLs.
      if (!page && !immutable) return previous.fetch(request, env, ctx);
      if (!['GET', 'HEAD'].includes(request.method)) return plain(request, 'Method not allowed', 405, { Allow: 'GET, HEAD' });
      if (url.search || /%|\\/.test(url.pathname)) return plain(request, 'Unknown preview resource', 404);
      if (!valid) return plain(request, 'The visual preview is being prepared.', 503);
      if (page) {
        if (!url.pathname.endsWith('/')) return plain(request, '', 308, { Location: PREVIEW_PATH });
        const nonce = Array.from(cryptoImpl.getRandomValues(new Uint8Array(18)), x => x.toString(16).padStart(2, '0')).join('');
        return new Response(request.method === 'HEAD' ? null : previewHTML(base, nonce), { headers: {
          ...responseHeaders('text/html; charset=utf-8'), 'Content-Security-Policy': csp(url.origin, base, nonce),
          'X-Frame-Options': 'DENY', 'Cross-Origin-Opener-Policy': 'same-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), fullscreen=(self)',
        } });
      }
      if (!url.pathname.startsWith(base + '/')) return plain(request, 'Unknown preview resource', 404);
      const entry = entries.get(url.pathname.slice(base.length));
      if (!entry) return plain(request, 'Unknown preview resource', 404);
      try {
        const bytes = await verified(entry, url.origin + url.pathname, ctx);
        return new Response(request.method === 'HEAD' ? null : bytes, { headers: assetHeaders(entry) });
      } catch { return plain(request, 'The preview artwork could not be verified. Please reload.', 502); }
    },
  };
}
