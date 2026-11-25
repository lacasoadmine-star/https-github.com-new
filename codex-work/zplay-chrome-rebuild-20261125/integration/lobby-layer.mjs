/** New dashboard assets only. Existing accounts, games and financial routes stay with the host. */
export const STATIC_PREFIX = '/_zplay/rebuild-20261125/';
export const PREVIEW_PATH = STATIC_PREFIX + 'preview/';
const DIGEST = /^[a-f0-9]{64}$/;
const TYPES = new Set(['text/html; charset=utf-8', 'text/css; charset=utf-8', 'text/javascript; charset=utf-8', 'application/json; charset=utf-8', 'image/svg+xml', 'image/webp', 'image/png', 'font/woff2']);

function safeFile(name) {
  return typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(name) &&
    !name.split('/').some(part => !part || part === '.' || part === '..');
}

export async function sha256(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, value => value.toString(16).padStart(2, '0')).join('');
}

export function assetPath(release, file) {
  if (!DIGEST.test(release) || !safeFile(file)) throw new TypeError('Invalid dashboard asset path');
  return STATIC_PREFIX + release + '/' + file;
}

/**
 * readAsset(record) supplies exactly the bytes in the independently reviewed manifest.
 * This layer has no payment/auth handlers, secret reads, RNG, balances, or game logic.
 * publishAtRoot stays false until the new dashboard passes visual and integration review.
 */
export function createReferenceLobbyLayer(previous, { release, assets, readAsset, publishAtRoot = false } = {}) {
  if (typeof previous?.fetch !== 'function' || !DIGEST.test(release || '') ||
      !Array.isArray(assets) || typeof readAsset !== 'function' || typeof publishAtRoot !== 'boolean') {
    throw new TypeError('Invalid dashboard layer configuration');
  }
  const records = new Map();
  for (const item of assets) {
    if (!item || !safeFile(item.file) || !DIGEST.test(item.sha256 || '') ||
        !Number.isSafeInteger(item.bytes) || item.bytes < 1 || !TYPES.has(item.contentType)) {
      throw new TypeError('Invalid dashboard asset record');
    }
    const path = assetPath(release, item.file);
    if (records.has(path)) throw new TypeError('Duplicate dashboard asset');
    records.set(path, Object.freeze({ ...item }));
  }
  const index = records.get(assetPath(release, 'index.html'));
  if (!index || index.contentType !== 'text/html; charset=utf-8') throw new TypeError('Missing dashboard HTML');

  return {
    ...previous,
    async fetch(request, env, ctx) {
      const path = new URL(request.url).pathname;
      const page = path === PREVIEW_PATH || (publishAtRoot && path === '/');
      const ownAsset = path.startsWith(STATIC_PREFIX + release + '/');
      if (!page && !ownAsset) return previous.fetch.call(previous, request, env, ctx);
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } });
      }
      const record = page ? index : records.get(path);
      if (!record) return new Response('Asset not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
      let bytes;
      try {
        const result = await readAsset(record, env, ctx);
        bytes = result instanceof Uint8Array ? result : result instanceof ArrayBuffer ? new Uint8Array(result) : null;
        if (!bytes || bytes.byteLength !== record.bytes || await sha256(bytes) !== record.sha256) throw new Error('Invalid asset');
      } catch {
        return new Response('Dashboard asset unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
      }
      const html = record.contentType.startsWith('text/html');
      if (html) {
        // The fresh source uses relative URLs. Keep all of them in this release,
        // whether the reviewed page is opened at preview/ or later at /.
        let source;
        try { source = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch {}
        if (!source || !/<head(?:\s[^>]*)?>/i.test(source) || /<base\b/i.test(source)) {
          return new Response('Dashboard document unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
        }
        source = source.replace(/<head(?:\s[^>]*)?>/i, match => match + '<base href="' + STATIC_PREFIX + release + '/">');
        // Keep fragment links on this page, not the release asset directory.
        source = source.replace(/href=(["'])#([^"']*)\1/gi, (_, quote, fragment) => 'href=' + quote + path + '#' + fragment + quote);
        bytes = new TextEncoder().encode(source);
      }
      const headers = {
        'Content-Type': record.contentType,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': html ? 'no-store' : 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin',
        'X-Zplay-Rebuild-Release': release,
      };
      if (!html) headers.ETag = '"' + record.sha256 + '"';
      return new Response(request.method === 'HEAD' ? null : bytes, { headers });
    },
  };
}
