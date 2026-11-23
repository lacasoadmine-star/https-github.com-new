import { GAME_ID, SuperWildsError } from './lifecycle.mjs';
export const HTTP_BASE = '/api/slots/new-games90/superwilds';
// The existing Player gateway rewrites /api/slots/* to /api/* upstream.
// Both exact paths use the same authenticated lifecycle and origin policy.
export const UPSTREAM_HTTP_BASE = '/api/new-games90/superwilds';
const routes = new Map([HTTP_BASE, UPSTREAM_HTTP_BASE].flatMap(base => [
  [base + '/state', 'state'], [base + '/spin', 'spin'], [base + '/take-win', 'takeWin'], [base + '/gamble', 'gamble']]));
const MAX_BODY_BYTES = 8192;
const json = (value, status = 200, extra = {}) => new Response(JSON.stringify(value), { status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra } });
const fail = (code, status) => { throw new SuperWildsError(code, status); };
async function actionBody(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') fail('SUPERWILDS_JSON_REQUIRED', 415);
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) fail('SUPERWILDS_BODY_TOO_LARGE', 413);
  if (!request.body) fail('SUPERWILDS_ACTION_INVALID', 400);
  const reader = request.body.getReader(), chunks = []; let count = 0;
  try {
    while (true) {
      const item = await reader.read(); if (item.done) break;
      count += item.value.byteLength; if (count > MAX_BODY_BYTES) fail('SUPERWILDS_BODY_TOO_LARGE', 413);
      chunks.push(item.value);
    }
  } finally { try { await reader.cancel(); } finally { reader.releaseLock(); } }
  const bytes = new Uint8Array(count); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let body;
  try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail('SUPERWILDS_ACTION_INVALID', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || body.gameId !== GAME_ID) fail('SUPERWILDS_ACTION_INVALID', 400);
  return body;
}

/** Attach to the EXISTING server fetch chain. The lifecycle authenticates
 * the original request/cookie inside its transaction. The original host's
 * actual origin policy is required, not a new session/auth implementation.
 * No listener, DB connection, wallet, synthetic session or model is created.
 */
export function createSuperWildsHttpHandler({ lifecycle, assertWriteOrigin, existingFetch } = {}) {
  if (!['state', 'spin', 'takeWin'].every(name => typeof lifecycle?.[name] === 'function') ||
    typeof assertWriteOrigin !== 'function' || typeof existingFetch !== 'function') fail('SUPERWILDS_EXISTING_HTTP_HOST_REQUIRED', 503);
  return async request => {
    if (!(request instanceof Request)) fail('INVALID_EXISTING_REQUEST', 400);
    const url = new URL(request.url), operation = routes.get(url.pathname);
    // Do not consume/clone bodies, alter methods or patch old responses.
    if (!operation) return existingFetch(request);
    const method = operation === 'state' ? 'GET' : 'POST';
    if (request.method !== method) return json({ detail: 'METHOD_NOT_ALLOWED' }, 405, { allow: method });
    try {
      if (url.search) fail('SUPERWILDS_QUERY_NOT_SUPPORTED', 400);
      if (operation === 'state') return json(await lifecycle.state(request, GAME_ID));
      if (await assertWriteOrigin(request) !== true) fail('SUPERWILDS_ORIGIN_REJECTED', 403);
      if (typeof lifecycle[operation] !== 'function') fail('SUPERWILDS_GAMBLE_UNAVAILABLE', 503);
      return json(await lifecycle[operation](request, await actionBody(request)));
    } catch (error) {
      const known = error instanceof SuperWildsError && Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 &&
        /^[A-Z0-9_:.-]{1,160}$/.test(error.code ?? '');
      // Never expose SQL, credentials, account internals or a raw exception.
      return json({ detail: known ? error.code : 'SUPERWILDS_REQUEST_UNAVAILABLE' }, known ? error.status : 503);
    }
  };
}
