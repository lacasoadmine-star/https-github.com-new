import previous from '../native72deluxefix20261121/entry.mjs';
export * from '../native72deluxefix20261121/entry.mjs';

const RELEASE = 'zplay-balloon-state-20261121-r2';
const PREFIX = '/native-library/balloon/20261121-state-r2/';
const HASH = 'a957319895ffca907db5a828608af684df1dd0ce4e78ebf1e81ebc31508761b9';
const ASSET = PREFIX + 'balloon.' + HASH + '.js';
const FILES = Object.freeze({
  ['balloon.' + HASH + '.js']: { hash: HASH, size: 23399 },
  'wager-profile-client.mjs': { hash: '34ce4a93a0ec5b530cdff846a26eb62364bcc789a5cdfc8d7a1ac0e7e1965b79', size: 1661 },
});
const OLD_SCRIPT = 'src="/native-library/existing-new/20261110-etb1-40000-r1/balloon/balloon.js"';
const json = (error, status) => Response.json({ error }, {
  status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
});
const sha = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');

async function client(request, env, path) {
  if (!['GET', 'HEAD'].includes(request.method)) return json('METHOD_NOT_ALLOWED', 405);
  const name = path.slice(PREFIX.length);
  if (!Object.hasOwn(FILES, name)) return json('NOT_FOUND', 404);
  const record = FILES[name], key = 'native72/' + RELEASE + '/' + record.hash;
  let bytes;
  try { bytes = await env.SSG_OFFICIAL_REFERENCES?.get(key, 'arrayBuffer'); }
  catch { return json('BALLOON_UI_ASSET_UNAVAILABLE', 503); }
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength !== record.size || await sha(bytes) !== record.hash) {
    return json('BALLOON_UI_ASSET_UNAVAILABLE', 503);
  }
  return new Response(request.method === 'HEAD' ? null : bytes, { headers: {
    'content-type': 'application/javascript; charset=utf-8',
    'content-length': String(record.size),
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'x-zplay-balloon-ui-release': RELEASE,
    'x-zplay-balloon-ui-sha256': record.hash,
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
