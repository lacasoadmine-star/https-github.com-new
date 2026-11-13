export const FREEZE_RELEASE = 'pair-baseline-20261114';
export const FREEZE_PREFIX = '/' + FREEZE_RELEASE + '/';
export const GAME_IDS = Object.freeze(['multi_hot_5_native', 'foxy_hot_20_native']);
const allowed = new Set(GAME_IDS);
const oldPortal = '/player-native-catalog-20261107-r1/portal.mjs';
const retiredPrefixes = ['/new74', '/independent74', '/native-expansion100', '/native-library', '/native-ui'];
const retiredAPIs = ['/api/game-construction-queue', '/api/official-references', '/api/reference-capture'];

export function pausedPath(path) {
  if (path.startsWith('/games/')) return !/^\/games\/(multi_hot_5_native|foxy_hot_20_native)\/?$/.test(path);
  if (path.startsWith('/play/') || path === '/slots/game.html') return true;
  return [...retiredPrefixes, ...retiredAPIs].some(prefix => path === prefix || path.startsWith(prefix + '/'));
}

function freshHeaders(response, type) {
  const headers = new Headers(response?.headers);
  for (const name of ['Content-Length', 'Content-Encoding', 'ETag', 'Last-Modified']) headers.delete(name);
  if (type) headers.set('Content-Type', type);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Zplay-Active-Baseline', 'native-machines-r1');
  headers.set('X-Zplay-Expansion-State', 'paused');
  headers.set('X-Zplay-Freeze-Release', FREEZE_RELEASE);
  return headers;
}

function pausedResponse(request) {
  const path = new URL(request.url).pathname;
  const api = path.startsWith('/api/');
  const headers = freshHeaders(null, api ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8');
  const body = api ? JSON.stringify({error: 'EXPANSION_PAUSED'}) : '<!doctype html><html lang="so"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ciyaarta lama heli karo</title><main><h1>Ciyaartan hadda lama soo bandhigayo</h1><p><a href="/">Ku noqo ciyaaraha</a></p></main></html>';
  return new Response(request.method === 'HEAD' ? null : body, {status: 410, headers});
}

// Only presentation is reverted. Existing account, ledger, historical receipt
// recovery, Durable Object exports and scheduled reconciliation remain current.
export function installPairFreeze(current, baseline, catalogSource) {
  const inherited = Object.fromEntries(Object.entries(current).map(([key, value]) => [key, typeof value === 'function' ? value.bind(current) : value]));
  return {...inherited, async fetch(request, env, ctx) {
    if (env.PORTAL !== 'player') return current.fetch.call(current, request, env, ctx);
    const url = new URL(request.url), path = url.pathname;
    const read = request.method === 'GET' || request.method === 'HEAD';
    // Historical independent74 clients kept authenticated state/action/history
    // outside /api. Preserve those existing recovery transports before hiding UI.
    if (/^\/independent74\/(?:account-api|api)\/(?:state|action|history)\/?$/.test(path)) return current.fetch.call(current, request, env, ctx);
    if (pausedPath(path)) return pausedResponse(request);

    if (path.startsWith(FREEZE_PREFIX)) {
      if (!read) return new Response('Method not allowed', {status: 405, headers: {Allow: 'GET, HEAD'}});
      if (path === FREEZE_PREFIX + 'catalog.mjs') return new Response(request.method === 'HEAD' ? null : catalogSource, {headers: freshHeaders(null, 'application/javascript; charset=utf-8')});
      if (path === FREEZE_PREFIX + 'status.json') return new Response(request.method === 'HEAD' ? null : JSON.stringify({release: FREEZE_RELEASE, baseline: 'zplay-native-machines-20261107-r1', baselineCommit: '042f06e4425a6257cda332e626abaa6ec538f657', games: GAME_IDS, previousExpansion: 'paused', freshDevelopment: 'official-demo-evidence-required'}), {headers: freshHeaders(null, 'application/json; charset=utf-8')});
      if (path !== FREEZE_PREFIX + 'portal.mjs') return new Response('Not found', {status: 404});
      const sourceURL = new URL(oldPortal, url);
      const source = await baseline.fetch(new Request(sourceURL, {method: 'GET', headers: {Accept: 'application/javascript'}}), env, ctx);
      if (source.status !== 200) return source;
      const original = await source.text();
      const anchor = "from './native-catalog.mjs'";
      if (!original.includes(anchor)) return new Response('Catalogue temporarily unavailable', {status: 503, headers: freshHeaders(null, 'text/plain; charset=utf-8')});
      const body = original.replace(anchor, "from '" + FREEZE_PREFIX + "catalog.mjs'");
      return new Response(request.method === 'HEAD' ? null : body, {headers: freshHeaders(source, 'application/javascript; charset=utf-8')});
    }

    // Financial operations and their idempotent replays use the exact currently
    // deployed transport. Do not infer whether a request is a new or old round.
    if (path.startsWith('/api/')) {
      const response = await current.fetch.call(current, request, env, ctx);
      if (path !== '/api/config' || request.method !== 'GET' || response.status !== 200) return response;
      let data;
      try { data = await response.clone().json(); } catch { return response; }
      if (!data || !Array.isArray(data.games)) return response;
      const result = {...data, games: data.games.filter(game => allowed.has(game?.id))};
      return new Response(JSON.stringify(result), {status: response.status, headers: freshHeaders(response, 'application/json; charset=utf-8')});
    }

    const response = await baseline.fetch(request, env, ctx);
    if (path !== '/' || request.method !== 'GET' || response.status !== 200 || !response.headers.get('Content-Type')?.includes('text/html')) return response;
    const original = await response.text();
    if (!original.includes(oldPortal)) return new Response('Catalogue temporarily unavailable', {status: 503, headers: freshHeaders(null, 'text/plain; charset=utf-8')});
    const body = original.replaceAll(oldPortal, FREEZE_PREFIX + 'portal.mjs');
    return new Response(body, {status: response.status, headers: freshHeaders(response)});
  }};
}
