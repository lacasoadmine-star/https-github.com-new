// Only this existing module is replaced. Its parent entry module stays unchanged.
const LEGACY_REVISION = '20261113-pair01-r1';
const FRESH_REVISION = '20261113-all74-r1';
const FRESH_FILES = new Set(__FRESH_PUBLIC_FILES__);
const LEGACY_FILES = new Set(['game.html', 'style.css', 'app.mjs', 'account.mjs', 'art.mjs', 'games.mjs', 'sprites.json']);
const LEGACY_GAMES = new Set(['001-multi-hot-5', '002-multi-hot-10']);
const TYPES = {html:'text/html; charset=utf-8', mjs:'text/javascript; charset=utf-8', css:'text/css; charset=utf-8', json:'application/json', png:'image/png', jpg:'image/jpeg', mp3:'audio/mpeg', otf:'font/otf'};
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; media-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'";

// Single byte ranges cover the existing audio assets. Unsupported multipart or
// malformed ranges are ignored; valid but unsatisfiable byte ranges return 416.
function byteRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value || '');
  if (!match || (!match[1] && !match[2])) return null;
  const first = match[1] === '' ? null : Number(match[1]);
  const last = match[2] === '' ? null : Number(match[2]);
  if ((first !== null && !Number.isSafeInteger(first)) || (last !== null && !Number.isSafeInteger(last))) return null;
  if (size === 0 || (first === null && last === 0)) return {unsatisfiable:true};
  if (first === null) return {start:Math.max(0, size-last), end:size-1};
  if (first >= size || (last !== null && last < first)) return {unsatisfiable:true};
  return {start:first, end:last === null ? size-1 : Math.min(last, size-1)};
}

export async function new74(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/new74' && !url.pathname.startsWith('/new74/')) return null;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405, headers:{Allow:'GET, HEAD'}});
  if (url.pathname === '/new74') return Response.redirect(url.origin+'/new74/', 308);
  const path = url.pathname.slice(7);
  let name, revision;
  if (path === '' || FRESH_FILES.has(path)) {
    name = path || 'index.html'; revision = FRESH_REVISION;
  } else if (LEGACY_GAMES.has(path)) {
    name = 'game.html'; revision = LEGACY_REVISION;
  } else if (LEGACY_FILES.has(path) || /^assets\/(multihot5|multihot10|fonts)\/[a-z0-9.-]+$/.test(path)) {
    name = path; revision = LEGACY_REVISION;
  } else return new Response('Not found', {status:404});

  let entry;
  try {
    entry = await env.SSG_OFFICIAL_REFERENCES.getWithMetadata(`new74/${revision}/${name}`, {type:'arrayBuffer'});
  } catch {
    return new Response('Ciyaarta ayaa soo diyaargaroobaysa.', {status:503, headers:{'Retry-After':'60', 'Cache-Control':'no-store'}});
  }
  if (!entry?.value) return new Response('Ciyaarta ayaa soo diyaargaroobaysa.', {status:503, headers:{'Retry-After':'60', 'Cache-Control':'no-store'}});
  const ext = name.split('.').at(-1);
  const headers = new Headers({
    'Content-Type':TYPES[ext] || 'application/octet-stream',
    'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'same-origin',
    'X-Superwin-New74':revision,
    'Cache-Control':name.startsWith('assets/fresh74/') ? 'public, max-age=31536000, immutable' : name.startsWith('assets/') ? 'public, max-age=86400' : 'no-cache'
  });
  if (ext === 'html') { headers.set('Content-Security-Policy', CSP); headers.set('Cache-Control', 'no-store'); }
  const etag = /^[0-9a-f]{64}$/i.test(entry.metadata?.sha256 || '') ? `"${entry.metadata.sha256}"` : null;
  if (etag) headers.set('ETag', etag);
  if (etag && request.headers.get('If-None-Match') === etag) return new Response(null, {status:304, headers});
  const size = entry.value.byteLength;
  headers.set('Accept-Ranges', 'bytes');
  const ifRange = request.headers.get('If-Range');
  const range = request.method === 'GET' && (!ifRange || (etag && ifRange === etag)) ? byteRange(request.headers.get('Range'), size) : null;
  if (range?.unsatisfiable) {
    headers.set('Content-Range', `bytes */${size}`);
    return new Response(null, {status:416, headers});
  }
  if (range) {
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
    headers.set('Content-Length', String(range.end-range.start+1));
    return new Response(entry.value.slice(range.start, range.end+1), {status:206, headers});
  }
  headers.set('Content-Length', String(size));
  return new Response(request.method === 'HEAD' ? null : entry.value, {headers});
}
