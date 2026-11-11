const encoder = new TextEncoder();
const PREFIX = '/independent74';
const ACCOUNT_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store', vary: 'Cookie', 'x-content-type-options': 'nosniff' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class GatewayError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const reject = (status, code, message) => { throw new GatewayError(status, code, message); };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: ACCOUNT_HEADERS });
const hex = bytes => [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('');
export async function hash(value) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
export async function csrfGuard(token) { return hash('independent74-session-v1:' + token); }

async function readBody(stream, limit) {
  if (!stream) return '';
  const reader = stream.getReader(), chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); reject(413, 'BODY_TOO_LARGE', 'Request exceeds the size limit.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { reject(400, 'INVALID_ENCODING', 'UTF-8 is required.'); }
}

function parse(text) {
  try { return JSON.parse(text); }
  catch { reject(400, 'INVALID_JSON', 'A JSON request is required.'); }
}

function sessionToken(request) {
  const matches = (request.headers.get('cookie') || '').split(';').map(s => s.trim()).filter(s => s.startsWith('sw_session='));
  if (matches.length !== 1) reject(401, 'SIGN_IN_REQUIRED', 'Sign in to your player account.');
  const token = matches[0].slice('sw_session='.length);
  if (!token || token.length > 4096) reject(401, 'SIGN_IN_REQUIRED', 'Sign in to your player account.');
  return token;
}

async function constantEqual(left, right) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(right), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(right));
  return crypto.subtle.verify('HMAC', key, signature, encoder.encode(left));
}

function validateAction(input, ids) {
  if (!input || Array.isArray(input) || typeof input !== 'object') reject(400, 'INVALID_ACTION', 'Invalid action.');
  if (!UUID.test(input.request_id) || !ids.has(input.game_id)) reject(400, 'INVALID_ACTION', 'Invalid request or game identity.');
  const allowed = new Set(['request_id', 'game_id', 'type', 'options']);
  if (input.type === 'play') allowed.add('stake_minor');
  else if (['reveal', 'collect'].includes(input.type)) {
    allowed.add('round_id'); allowed.add('expected_version');
    if (!UUID.test(input.round_id) || !Number.isSafeInteger(input.expected_version) || input.expected_version < 0) reject(400, 'INVALID_ROUND', 'A current round version is required.');
  } else reject(400, 'INVALID_ACTION', 'Unsupported action.');
  if (Object.keys(input).some(key => !allowed.has(key))) reject(400, 'INVALID_ACTION', 'Unsupported action fields.');
  if (input.type === 'play' && (typeof input.stake_minor !== 'string' || !/^[1-9][0-9]{0,8}$/.test(input.stake_minor))) reject(400, 'INVALID_STAKE', 'Stake must be a positive minor-unit integer.');
  if (input.options !== undefined) {
    if (!input.options || Array.isArray(input.options) || typeof input.options !== 'object') reject(400, 'INVALID_OPTIONS', 'Invalid options.');
    const options = new Set(['cell', 'target', 'targetBps', 'risk', 'rows', 'choice', 'steps', 'mode']);
    if (Object.keys(input.options).some(key => !options.has(key))) reject(400, 'INVALID_OPTIONS', 'Unsupported game option.');
    for (const [key, value] of Object.entries(input.options)) {
      if (['cell', 'target', 'targetBps', 'rows', 'steps'].includes(key) && (!Number.isSafeInteger(value) || value < 0 || value > 100000000)) reject(400, 'INVALID_OPTIONS', 'Invalid numeric game option.');
      if (['risk', 'choice', 'mode'].includes(key) && (typeof value !== 'string' || !/^[a-z0-9_-]{1,24}$/i.test(value))) reject(400, 'INVALID_OPTIONS', 'Invalid game option.');
    }
  }
  return input;
}

function carryIdentity(response, identity) {
  const marker = identity.headers.get('x-zplay-session');
  if (marker) response.headers.set('x-zplay-session', marker);
  const cookies = identity.headers.getSetCookie?.() || [];
  for (const cookie of cookies) response.headers.append('set-cookie', cookie);
  return response;
}

export function createGateway({ previous, assets = {}, games = [], fetchImpl = (...args) => fetch(...args) }) {
  if (typeof previous?.fetch !== 'function') throw new Error('Legacy handler required.');
  const ids = new Set(games.map(game => game.id));
  return async function independent74(request, env, ctx) {
    const url = new URL(request.url), path = url.pathname;
    if (path !== PREFIX && !path.startsWith(PREFIX + '/')) return previous.fetch(request, env, ctx);
    try {
      if (path === PREFIX) return new Response(null, { status: 308, headers: { location: PREFIX + '/', 'cache-control': 'no-store' } });
      if (path === PREFIX + '/api/catalog') {
        if (!['GET', 'HEAD'].includes(request.method)) reject(405, 'METHOD_NOT_ALLOWED', 'GET is required.');
        const response = json({ edition: 'Independent edition', officialProviderMath: false, games });
        return request.method === 'HEAD' ? new Response(null, { headers: response.headers }) : response;
      }
      if (path.startsWith(PREFIX + '/api/')) {
        const action = path.slice((PREFIX + '/api/').length);
        if (!['state', 'history', 'action'].includes(action)) reject(404, 'NOT_FOUND', 'Endpoint not found.');
        if (request.method !== (action === 'action' ? 'POST' : 'GET')) reject(405, 'METHOD_NOT_ALLOWED', 'Unsupported method.');
        if (action === 'action' && (request.headers.get('origin') !== url.origin || !/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || ''))) reject(403, 'SAME_ORIGIN_REQUIRED', 'A same-origin JSON request is required.');
        const token = sessionToken(request);
        const identity = await previous.fetch(new Request(new URL('/api/machine-session', url), { headers: { cookie: request.headers.get('cookie'), accept: 'application/json' } }), env, ctx);
        if (!identity.ok) { await identity.body?.cancel(); return carryIdentity(json({ error: { code: 'SIGN_IN_REQUIRED', message: 'Sign in to your existing player account.' }, retryable: false }, 401), identity); }
        let identityData;
        try { identityData = JSON.parse(await readBody(identity.body, 16384)); }
        catch { reject(502, 'INVALID_ACCOUNT_RESPONSE', 'The identity service returned an unreadable response.'); }
        if (!identityData || typeof identityData !== 'object' || Array.isArray(identityData)) reject(502, 'INVALID_ACCOUNT_RESPONSE', 'The identity service returned an invalid response.');
        if (identityData.authenticated !== true) return carryIdentity(json({ error: { code: 'SIGN_IN_REQUIRED', message: 'Sign in to your existing player account.' }, retryable: false }, 401), identity);
        const guard = await csrfGuard(token);
        let body = '', backendPath = '/v1/independent74/' + action;
        if (action === 'action') {
          if (url.search || !await constantEqual(request.headers.get('x-independent74-session') || '', guard)) reject(403, 'SESSION_REFRESH_REQUIRED', 'Refresh the account state before playing.');
          body = JSON.stringify(validateAction(parse(await readBody(request.body, 8192)), ids));
        } else {
          for (const key of url.searchParams.keys()) if (key !== 'game_id' || url.searchParams.getAll(key).length !== 1) reject(400, 'INVALID_QUERY', 'Unsupported query parameter.');
          const gameId = url.searchParams.get('game_id');
          if (!ids.has(gameId)) reject(400, 'UNKNOWN_GAME', 'Unknown independent game.');
          backendPath += '?game_id=' + encodeURIComponent(gameId);
        }
        if (!env.NATIVE_ENGINE_ORIGIN || !env.NATIVE_ENGINE_SECRET) reject(503, 'ACCOUNT_SERVICE_UNAVAILABLE', 'The existing account service is unavailable.');
        let origin;
        try { origin = new URL(env.NATIVE_ENGINE_ORIGIN); } catch { reject(503, 'ACCOUNT_SERVICE_UNAVAILABLE', 'The existing account service is unavailable.'); }
        if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) reject(503, 'ACCOUNT_SERVICE_UNAVAILABLE', 'The account service is unavailable.');
        const target = new URL(backendPath, origin), timestamp = String(Date.now()), subject = '@session:' + await hash(token);
        const payload = [request.method, target.pathname + target.search, timestamp, subject, await hash(body)].join('\n');
        const key = await crypto.subtle.importKey('raw', encoder.encode(env.NATIVE_ENGINE_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const signature = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
        let upstream, result;
        try {
          upstream = await fetchImpl(target, { method: request.method, headers: { accept: 'application/json', 'content-type': 'application/json', 'x-native-user': subject, 'x-native-time': timestamp, 'x-native-signature': signature }, ...(body ? { body } : {}), redirect: 'manual', signal: controller.signal });
          if (upstream.status >= 300 && upstream.status < 400) { await upstream.body?.cancel(); reject(502, 'INVALID_ACCOUNT_RESPONSE', 'Unexpected account-service redirect.'); }
          try { result = JSON.parse(await readBody(upstream.body, 2 * 1024 * 1024)); }
          catch { reject(502, 'INVALID_ACCOUNT_RESPONSE', 'The account service returned an unreadable response.'); }
          if (!result || typeof result !== 'object' || Array.isArray(result)) reject(502, 'INVALID_ACCOUNT_RESPONSE', 'The account service returned an invalid response.');
        } catch (error) {
          if (error instanceof GatewayError) throw error;
          reject(503, 'ACTION_UNCONFIRMED', 'The account service did not confirm this action. Refresh the round before retrying.');
        } finally { clearTimeout(timeout); }
        if (upstream.ok && (result.authenticated !== true || result.currency !== 'ETB' || result.game?.id !== (action === 'action' ? JSON.parse(body).game_id : url.searchParams.get('game_id')) || !/^[0-9]+$/.test(result.wallet?.balance_minor || ''))) reject(502, 'INVALID_ACCOUNT_RESPONSE', 'The account response could not be verified.');
        return carryIdentity(json(upstream.ok ? { ...result, sessionGuard: guard } : result, upstream.status), identity);
      }
      if (!['GET', 'HEAD'].includes(request.method)) reject(405, 'METHOD_NOT_ALLOWED', 'GET is required.');
      const asset = assets[path === PREFIX + '/' ? (assets['/test72.html'] ? '/test72.html' : '/index.html') : path.slice(PREFIX.length)];
      if (!asset) reject(404, 'NOT_FOUND', 'Asset not found.');
      if (request.headers.get('if-none-match') === asset.etag) return new Response(null, { status: 304, headers: { etag: asset.etag } });
      const headers = { 'content-type': asset.type, etag: asset.etag, 'cache-control': asset.type.includes('html') ? 'no-store' : 'public, max-age=300', 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin' };
      if (asset.type.includes('html')) headers['content-security-policy'] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'";
      return new Response(request.method === 'HEAD' ? null : asset.body, { headers });
    } catch (error) {
      if (error instanceof GatewayError) return json({ error: { code: error.code, message: error.message }, retryable: error.status >= 500 }, error.status);
      console.error(JSON.stringify({ event: 'independent74_gateway_error', name: error?.name || 'Error' }));
      return json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'The game service is temporarily unavailable.' }, retryable: true }, 503);
    }
  };
}
