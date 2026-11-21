import previous from '../native72deluxefix20261121/entry.mjs';
export * from '../native72deluxefix20261121/entry.mjs';

const RELEASE = 'zplay-balloon-state-20261121-r1';
const PREFIX = '/native-library/balloon/20261121-state-r1/';
const HASH = 'e341d1b4e3bc6d6b312fdca9b6fb12c7fd0ba034d7ebcdee24b58d1b4fa6f5ed';
const SIZE = 23050;
const ASSET = PREFIX + 'balloon.' + HASH + '.js';
const KEY = 'native72/' + RELEASE + '/' + HASH;
const OLD_SCRIPT = 'src="/native-library/balloon/v1/balloon.js"';
const json = (error, status) => Response.json({ error }, {
  status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
});
const sha = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');

async function client(request, env, path) {
  if (!['GET', 'HEAD'].includes(request.method)) return json('METHOD_NOT_ALLOWED', 405);
  if (path !== ASSET) return json('NOT_FOUND', 404);
  let bytes;
  try { bytes = await env.SSG_OFFICIAL_REFERENCES?.get(KEY, 'arrayBuffer'); }
  catch { return json('BALLOON_UI_ASSET_UNAVAILABLE', 503); }
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength !== SIZE || await sha(bytes) !== HASH) {
    return json('BALLOON_UI_ASSET_UNAVAILABLE', 503);
  }
  return new Response(request.method === 'HEAD' ? null : bytes, { headers: {
    'content-type': 'application/javascript; charset=utf-8',
    'content-length': String(SIZE),
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'x-zplay-balloon-ui-release': RELEASE,
    'x-zplay-balloon-ui-sha256': HASH,
  } });
}

export default {
  ...previous,
  async fetch(request, env, ctx) {
    if (env.PORTAL !== 'player') return previous.fetch(request, env, ctx);
    const path = new URL(request.url).pathname;
    if (path.startsWith(PREFIX)) return client(request, env, path);
    if (path !== '/games/balloon_native' || !['GET', 'HEAD'].includes(request.method)) {
      return previous.fetch(request, env, ctx);
    }
    // A HEAD request verifies the same retained page template as GET, but emits
    // no response body. This reads a page only and never calls a wager route.
    const original = await previous.fetch(request.method === 'HEAD' ? new Request(request, { method: 'GET' }) : request, env, ctx);
    if (original.status !== 200 || !original.headers.get('content-type')?.includes('text/html')) return original;
    const html = await original.text();
    if (html.split(OLD_SCRIPT).length !== 2) return json('BALLOON_UI_SOURCE_MISMATCH', 503);
    const headers = new Headers(original.headers);
    for (const name of ['content-length', 'content-encoding', 'etag', 'last-modified']) headers.delete(name);
    headers.set('cache-control', 'no-store');
    headers.set('x-zplay-balloon-ui-release', RELEASE);
    return new Response(request.method === 'HEAD' ? null : html.replace(OLD_SCRIPT, 'src="' + ASSET + '"'), { status: 200, headers });
  },
};
