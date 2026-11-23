export const GAME_ROUTE = '/new-games72/multi-hot-5-super-wilds/';
export const GAME_ID = 'zplay72_multi_hot_5_super_wilds_v1';

/** Adds the real game page to the current Player; old handlers keep ownership
 * of every other URL, including the authenticated API and dashboard. */
export function createSuperWildsPageWorker(previous, config) {
  const stored = Array.isArray(config?.assetPins) && config.assetPins.length === 2;
  const validPin = pin => pin && /^new90\/superwilds\/[a-f0-9]{24}\/game\.(mjs|css)$/.test(pin.key) &&
    /^[a-f0-9]{64}$/.test(pin.sha256) && Number.isSafeInteger(pin.bytes) && pin.bytes > 0;
  if (typeof previous?.fetch !== 'function' || config?.gameId !== GAME_ID || config?.route !== GAME_ROUTE ||
    !/^[a-f0-9]{24}$/.test(config?.assetRevision ?? '') || (stored ?
      !config.assetPins.every(validPin) || new Set(config.assetPins.map(p => p.key)).size !== 2 ||
      !['mjs','css'].every(ext => config.assetPins.some(p => p.key === `new90/superwilds/${config.assetRevision}/game.${ext}`)) :
      typeof config.clientSource !== 'string' || !config.clientSource || typeof config.stylesheetSource !== 'string' || !config.stylesheetSource)) {
    throw Error('SUPERWILDS_PAGE_CONFIG_INVALID');
  }
  const base = '/_zplay/superwilds/' + config.assetRevision + '/';
  const html = `<!doctype html><html lang="so"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#002d21"><meta name="robots" content="noindex"><title>Multi Hot 5 Super Wilds · ZPLAY</title><link rel="stylesheet" href="${base}game.css"><script type="module" src="${base}game.mjs"></script></head><body><main id="zplay-superwilds" aria-label="Multi Hot 5 Super Wilds"><p class="sw-boot-message" role="status">Furitaanka ciyaarta…</p></main></body></html>`;
  const assets = new Map([[GAME_ROUTE, [html, 'text/html; charset=utf-8', 'no-store']]]);
  for (const [ext, source, type] of [['mjs',config.clientSource,'text/javascript'],['css',config.stylesheetSource,'text/css']]) {
    const pin = stored ? config.assetPins.find(p => p.key.endsWith('.'+ext)) : null;
    assets.set(base + 'game.'+ext, [source, type+'; charset=utf-8', 'public, max-age=31536000, immutable', pin]);
  }
  const unavailable = () => new Response('Game asset unavailable. Please retry.', {status:503,
    headers:{'cache-control':'no-store','content-type':'text/plain; charset=utf-8','retry-after':'5'}});
  return { ...previous, async fetch(request, env, ctx) {
    const asset = assets.get(new URL(request.url).pathname);
    if (!asset) return previous.fetch(request, env, ctx);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {
      status: 405, headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' } });
    let body = asset[0];
    if (asset[3]) {
      try {
        body = await env.SSG_OFFICIAL_REFERENCES.get(asset[3].key, {type:'arrayBuffer'});
        if (!(body instanceof ArrayBuffer) || body.byteLength !== asset[3].bytes) return unavailable();
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)), n => n.toString(16).padStart(2,'0')).join('');
        if (digest !== asset[3].sha256) return unavailable();
      } catch { return unavailable(); }
    }
    const headers = { 'content-type': asset[1], 'cache-control': asset[2], 'x-content-type-options': 'nosniff',
      'x-zplay-game': GAME_ID, 'referrer-policy': 'same-origin' };
    if (asset[1].startsWith('text/html')) headers['content-security-policy'] = "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; base-uri 'none'; form-action 'self'; frame-ancestors 'self'";
    return new Response(request.method === 'HEAD' ? null : body, { headers });
  } };
}
