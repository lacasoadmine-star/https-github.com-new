// Only this existing module is replaced. Its parent entry module stays unchanged.
const LEGACY_REVISION = '20261113-pair01-r1';
const FRESH_REVISION = '20261113-all74-r1';
const FRESH_FILES = new Set(["assets/fresh74/031ffbb51a6872668a2d514a95661ae2688bc3b7f02e8a1a1bb0e9c014339d19.jpg","assets/fresh74/03219772e217625f4fd179c7888303fec29b80bc4df9a0b87d197d884d044236.jpg","assets/fresh74/03f093d5be1b0140328739f2a6aa1e84f9c5544bfe7ec40e8793c5d87d08f1a6.jpg","assets/fresh74/07de26cd2693924235a5186a85ddef04f6ba3c6cdc46d9d3ec1c5bb4c4ec7166.jpg","assets/fresh74/0cbbe527b1834b8860199a7787dc5a0878f8f2f0e69ff3a3e80f35f87eccb0a6.jpg","assets/fresh74/0d024403db7e83158b8d09260a3402c52ff67067d108d0fa2f48bb60108902bd.jpg","assets/fresh74/0e057e915b1acea418dd7d1c364fa2b0b9696084d66052044d75d1d970c7be44.jpg","assets/fresh74/0f7c9e726d67551cdaf88dc30b975ebc48e4e83c2a590d404c768dd427e7d011.jpg","assets/fresh74/1319889cfea2431bd5a56a27a087c54c46acda176d34e516fd3d317611cda9c6.jpg","assets/fresh74/1a7bed0d7ae00414fa3173d19390e507418f9f0d0974944f780ca984d26a3f24.jpg","assets/fresh74/1e80191fea4caf86406e4f785e5f82d5944798459e6185cdffeae66b772cc452.jpg","assets/fresh74/1ee36b9c1239a37817cfcc7a7818ac65f007ea28f37e80c7837146f4d99ea423.jpg","assets/fresh74/2707cf6febe0a8e518992515678663fbd9d125fc5b7d22b86232fd7a1c5dbd63.jpg","assets/fresh74/28dc24bf279c97aab13a0a3bd1160ca95890d0e3ade1ef86ddd431d7859c52b1.jpg","assets/fresh74/3b5676feb6881dd554b4f3be09592d9db0cb3f708415bf85d1f394b904c29362.jpg","assets/fresh74/406456ffdc14477e4fa1a9e324330c09bcd548b7348e155a05034babe64ed8a7.jpg","assets/fresh74/41880a089508cfbc315f6f74b7a4ed6436827b454a3fd36366d9e3633cc6efac.jpg","assets/fresh74/4565f3f7805b85c98518806e89f6c30c3f5de137f02ab1d1b9a673ece18f7fa3.jpg","assets/fresh74/4b8d3a24499f790dadda0d41931c56f331ba0bdf19508bc3db3b3dca12c09001.jpg","assets/fresh74/4c3cf1c6446a5adec1c6be06226c6d0d282de863d900a6f5d90649ebd5a55cb1.jpg","assets/fresh74/5be118c6f7e3b4d968953cceca4a114c3e988cdaa21695fb5143a886ed5acaa4.jpg","assets/fresh74/5f80a45421a9f5acca32486bc885b9931d5cfe78a60dcdfbbd7312258c231bd1.jpg","assets/fresh74/613a54446be8d65c617e6e498bb279b79325e46124efb84192533f39374cc4b4.jpg","assets/fresh74/624d6b54d912598ab541f5ff28aaf49c86f794c489ff7dcb635bc884cce55424.jpg","assets/fresh74/64db674d808a227ad846d6dd1a4b5fd8bd0914dea273874335ddf2f11de65c65.jpg","assets/fresh74/65003942132fedc15329bd98ebbbb2a780ed5d9a1fc296a7ba45e4839e42ebd2.jpg","assets/fresh74/6880725435e0f1e4befca57d48c8ce0ffe0e09275127ae3c4c0b14f93eeddfe8.jpg","assets/fresh74/6c199b43b71d3ce3353c662dd5c918269d99fd99463a46ea85e3a6015f36b813.jpg","assets/fresh74/6d58cd152e1ba4d600ef8b731809c72cab0fa9ab53ac7e1c86c49f9978c99370.jpg","assets/fresh74/789c5d7a88fb1b02e8398095e1c70fe57d59dc17bb70a5cfc227ed0573ac1e5f.jpg","assets/fresh74/7e3a64466ce74333e69cb9a777b22bb9adbecd4b33bd5afa72dab73bdc0cb123.jpg","assets/fresh74/87579d2189231949c6c2b033bb33f5966b3323259d43336bfc4e258aeb8684b8.jpg","assets/fresh74/8b1567b164a83637bd783acc6379aabcd0dbed92e99d29fc20e95c7d03a18eb5.jpg","assets/fresh74/8e658abb0db7541f6999ceb7d9dbb756b12bedf98a24419813f5982696b410ec.jpg","assets/fresh74/8f5aaa7f45aa175a6eaa8a5ba7c67b6f684b91c18ede73354af4a95907f68cad.jpg","assets/fresh74/926cc5fe9583c5a029a01c2db3b4910b11905b5970ff95c394534537f5ad4747.jpg","assets/fresh74/976e5dcf8970dc4f13ca35c387630b6906bf8187184580f56aa6c5214f16ace6.jpg","assets/fresh74/9ae3aa7eda37fb0e46dfec128fd2c50c4f2bc328ea1a08018441f2375db4e62a.jpg","assets/fresh74/9e7066182b4e4aa61e3e5572ca72f4f4631b1b30aedb34ae390ba2a1f3bb712e.jpg","assets/fresh74/9ea5dbb93f680149e61300ef9ff92318be34315e75d60520bf4f0ab30ad3282e.jpg","assets/fresh74/9f46062b4d7e666155c4b60e1b40a816f0b1a4e6f0126187d4b2e9e72ee9a5d2.jpg","assets/fresh74/acdb137b42b64334d9a6c25029714872dc5ec1d162adeaf16888d77d5117188c.jpg","assets/fresh74/adac91039e4e26f2a7ea0b18f320a0d47ff6d2f5faa094ddd63a0e510f73e4f3.jpg","assets/fresh74/c03666055283c5726624dcff91c7894d4a4944f48074c3b54d199deebc80bbb3.jpg","assets/fresh74/c0d9f52ece31e83ed3e7e9bc0d0835c9182a44edb85a6d66f7b6a65b614248ad.jpg","assets/fresh74/c4ad53ccdabf78623346d1eb32392d5cb001fb633353662ba65ffa07c3f22fca.jpg","assets/fresh74/c6f49edbea6931c0d92a1bbb15d49a022d1c0e81d654e15f0c2bb9f3f8cf19cb.jpg","assets/fresh74/caa41c63e605cda40220887e6d62f9494f9c34af7c02945d421083a97a0e78d8.jpg","assets/fresh74/d178bcf92ccbcffe6e49a2f7e7ab044a9562447adb44efaab51fabcce9f0d5d4.jpg","assets/fresh74/d5d47d89493f9839e2977102ab244ca6ad76d2bbd44b3b6779ee5baaeee0c30b.jpg","assets/fresh74/db88e3d87335bb7504c6c13d42c3f6df035da06c365000531013e729e5b1769e.jpg","assets/fresh74/db8da438da93efa850272264d74f2e1f5e32ecf2fffef9d9abea648b11c7a02e.jpg","assets/fresh74/dbdb778b6ae2bc35cdd72a65cdb609b941ad1a9289fb371002d83c066c23aa5c.jpg","assets/fresh74/e2e21ccc23f19c73ec52e6735edcab526f6c9e45574d0be89ae446ebfb76ba96.jpg","assets/fresh74/ee637318ff56920f555be9e367ffbbe0f3fcc15d5ced8383aa8dcf556a7b5593.jpg","assets/fresh74/f0087731dcad24951f14cd8bec859e9a125867863746d46d41ee1d442c6f9a02.jpg","assets/fresh74/f12a1517b0c9463965deb76c4f46462f07a3d10b369eddc44e85dd7e3b6af55c.jpg","assets/fresh74/fd9ab70361c049ef16cd739856d2c6985758252b5617c9efec52614257e3664e.jpg","assets/fresh74/fe444153c094ebbefd8456ab0efe2781dc0540a2ceb06f78f813dd6520e32ac3.jpg","entry-link.mjs","index.html","lobby.css","lobby.mjs"]);
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
