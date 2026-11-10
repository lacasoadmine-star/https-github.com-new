// Account entry uses the retained authenticated remaining20 transport. The
// server retains ownership of release decisions, receipts and wallet amounts.
export const PREFIX = '/native-library/remaining20/20261110-account-entry-r13/';
export const PREVIOUS_PREFIX = '/native-library/remaining20/20261110-accepted-controls-r12/';
export const GAME_GROUPS = Object.freeze({
  multihot100_native: '5fddea498e1f0d39',
  habeshafortune5_native: '7161514f85b0565e',
  multihotwildways_native: 'b930310f3d5338cd',
  multihot5wild_native: 'b930310f3d5338cd',
  multihot5superwilds_native: '3d420e4fe5830b46',
  multihotdeluxe_native: 'fe6fe5c2996189a2',
  burningice_native: '3d420e4fe5830b46',
  coinminer_native: '6d57eebb88faa105',
});
const ids = new Set(Object.keys(GAME_GROUPS));
const groups = new Set(Object.values(GAME_GROUPS));
const readOnly = request => ['GET', 'HEAD'].includes(request.method);
const error = (code, status) => Response.json({error: code}, {status, headers: {'cache-control': 'no-store', 'x-content-type-options': 'nosniff'}});

async function textBounded(response, limit) {
  if (Number(response.headers.get('content-length') || 0) > limit) return null;
  const encoding = response.headers.get('content-encoding');
  if (encoding && !['identity', 'gzip'].includes(encoding)) return null;
  const read = async stream => {
    const reader = stream?.getReader();
    if (!reader) return new Uint8Array();
    const parts = [];
    let length = 0;
    try {
      for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > limit) { void reader.cancel().catch(() => {}); return null; }
        parts.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let at = 0;
    for (const part of parts) { bytes.set(part, at); at += part.byteLength; }
    return bytes;
  };
  let bytes = await read(response.body);
  if (bytes && encoding === 'gzip' && bytes[0] === 31 && bytes[1] === 139) {
    bytes = await read(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')));
  }
  return bytes ? new TextDecoder('utf-8', {fatal: true}).decode(bytes) : null;
}

function staticRequest(request, path) {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = '';
  const headers = new Headers();
  for (const name of ['accept', 'if-none-match']) {
    if (request.headers.has(name)) headers.set(name, request.headers.get(name));
  }
  return new Request(url, {method: request.method, headers, redirect: 'manual', signal: request.signal});
}

function replacedResponse(response, body, method, type) {
  const headers = new Headers(response.headers);
  for (const name of ['content-encoding', 'content-length', 'etag', 'last-modified', 'set-cookie']) headers.delete(name);
  headers.set('cache-control', 'no-store');
  headers.set('content-type', type);
  headers.set('x-content-type-options', 'nosniff');
  return new Response(method === 'HEAD' ? null : body, {status: response.status, headers});
}

export function accountConfigs(source, group) {
  if (!Array.isArray(source) || !groups.has(group)) throw Error('INVALID_ACCOUNT_CONFIG');
  const selected = source.filter(game => GAME_GROUPS[game?.id] === group);
  if (selected.length !== Object.values(GAME_GROUPS).filter(value => value === group).length || new Set(selected.map(game => game.id)).size !== selected.length) throw Error('ACCOUNT_CONFIG_SCOPE_MISMATCH');
  return selected.map(game => {
    if (typeof game.version !== 'string' || !game.version || game.minStake !== '1.00' || game.maxStake !== '40000.00') throw Error('ACCOUNT_WAGER_PROFILE_MISMATCH');
    const {demo, demoCreditsOnly, ...config} = game;
    return {...config, currency: 'ETB', launchable: false, published: false,
      ...(config.currencyAdaptation ? {currencyAdaptation: {...config.currencyAdaptation, currency: 'ETB', productionLaunchable: false}} : {}),
    };
  });
}

export function accountApp(source) {
  if (typeof source !== 'string' || !source.includes('async function boot()') || !source.includes('new ExpansionSession(')) throw Error('ACCOUNT_APP_CHANGED');
  const absolute = /gameFetch\((['"])\/native-library\/[a-zA-Z0-9_./-]+\/games\.json\1,/g;
  const relative = "gameFetch(new URL('./games.json',import.meta.url).href,";
  const matches = [...source.matchAll(absolute)];
  if (matches.length === 1 && !source.includes(relative)) return source.replace(absolute, relative);
  if (matches.length === 0 && source.split(relative).length === 2) return source;
  throw Error('ACCOUNT_APP_CONFIG_ROUTE_CHANGED');
}

async function actionGame(request) {
  if (Number(request.headers.get('content-length') || 0) > 8192) return null;
  try {
    const raw = await textBounded(new Response(request.clone().body), 8192);
    return raw ? JSON.parse(raw)?.game_id : null;
  } catch { return null; }
}

export function installAccountEntry(previous, {createTransport, lobbySource} = {}) {
  if (typeof previous?.fetch !== 'function' || typeof createTransport !== 'function' || typeof lobbySource !== 'string') throw Error('RETAINED_ACCOUNT_DEPENDENCIES_REQUIRED');
  const transport = createTransport(previous, {games: [...ids].map(id => ({id, published: true, launchable: false}))});
  if (typeof transport?.fetch !== 'function') throw Error('RETAINED_ACCOUNT_TRANSPORT_REQUIRED');
  return {...previous, async fetch(request, env, ctx) {
    if (env.PORTAL !== 'player') return previous.fetch(request, env, ctx);
    const url = new URL(request.url), path = url.pathname;
    if (path === PREFIX + 'lobby.mjs') {
      if (!readOnly(request)) return error('METHOD_NOT_ALLOWED', 405);
      return new Response(request.method === 'HEAD' ? null : lobbySource, {headers: {'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff'}});
    }
    if (path.startsWith(PREFIX)) {
      if (!readOnly(request)) return error('METHOD_NOT_ALLOWED', 405);
      const match = path.slice(PREFIX.length).match(/^([a-f0-9]{16})\/([a-zA-Z0-9_./-]+)$/);
      if (!match || !groups.has(match[1]) || match[2].includes('..') || match[2].startsWith('/')) return error('NOT_FOUND', 404);
      const [, group, name] = match;
      // Only public static bytes use this route; account credentials are never
      // passed to demo shells, artwork or the library's asset service.
      const target = PREVIOUS_PREFIX + group + '/' + (name === 'games.json' ? 'demo-games.json' : name);
      let resourceRequest = staticRequest(request, target);
      if (name === 'games.json' || name === 'app.mjs') {
        const headers = new Headers(resourceRequest.headers); headers.delete('if-none-match');
        resourceRequest = new Request(resourceRequest, {method: 'GET', headers});
      }
      const resource = await previous.fetch(resourceRequest, env, ctx);
      if (resource.status >= 300 && resource.status < 400 && resource.status !== 304) return error('GAME_RESOURCES_UNAVAILABLE', 503);
      if (name === 'app.mjs' && resource.status === 200) {
        try {
          const source = await textBounded(resource, 131072);
          return replacedResponse(resource, accountApp(source), request.method, 'application/javascript; charset=utf-8');
        } catch { return error('ACCOUNT_APP_UNAVAILABLE', 503); }
      }
      if (name !== 'games.json' || resource.status !== 200) {
        const headers = new Headers(resource.headers); headers.delete('set-cookie');
        return new Response(request.method === 'HEAD' ? null : resource.body, {status: resource.status, headers});
      }
      try {
        const body = await textBounded(resource, 2097152);
        return replacedResponse(resource, JSON.stringify(accountConfigs(JSON.parse(body), group)), request.method, 'application/json; charset=utf-8');
      } catch { return error('ACCOUNT_CONFIG_UNAVAILABLE', 503); }
    }
    const id = path.startsWith('/games/') ? path.slice('/games/'.length) : '';
    if (ids.has(id)) {
      if (!readOnly(request)) return error('METHOD_NOT_ALLOWED', 405);
      const source = await previous.fetch(new Request(staticRequest(request, '/demo/games/' + id), {method: 'GET'}), env, ctx);
      if (source.status !== 200 || !source.headers.get('content-type')?.includes('text/html')) return error('GAME_RESOURCES_UNAVAILABLE', 503);
      let body;
      try { body = await textBounded(source, 131072); } catch { return error('GAME_RESOURCES_UNAVAILABLE', 503); }
      const old = PREVIOUS_PREFIX + GAME_GROUPS[id] + '/';
      if (!body?.includes(old + 'app.mjs') || body.includes('data-credits-demo="true"')) return error('ACCOUNT_SHELL_CHANGED', 503);
      const accountShell = body.replaceAll(old, PREFIX + GAME_GROUPS[id] + '/')
        .replace(/\bCREDITS\b/g, 'ETB')
        .replace('<option value="0.10">0.10 ETB</option>', '<option value="1.00">1.00 ETB</option>');
      return replacedResponse(source, accountShell, request.method, 'text/html; charset=utf-8');
    }
    if ((path === '/api/remaining20/state' || path === '/api/remaining20/history') && ids.has(url.searchParams.get('game_id'))) return transport.fetch(request, env, ctx);
    if (path === '/api/remaining20/action' && request.method === 'POST' && ids.has(await actionGame(request))) return transport.fetch(request, env, ctx);
    const response = await previous.fetch(request, env, ctx);
    if (path !== '/' || request.method !== 'GET' || response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) return response;
    let body;
    try { body = await textBounded(response.clone(), 131072); } catch { return response; }
    const script = '<script data-zplay-account-entry-r13 type="module" src="' + PREFIX + 'lobby.mjs?v=10"></script>';
    if (!body?.includes('</head>') || body.includes('data-zplay-account-entry-r13')) return response;
    return replacedResponse(response, body.replace('</head>', script + '</head>'), 'GET', 'text/html; charset=utf-8');
  }};
}
