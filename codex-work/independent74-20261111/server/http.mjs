import { parseJsonBody, readRequestBody, verifyNativeRequest } from './auth.mjs';
import { fail, publicError } from './errors.mjs';

const PREFIX = '/v1/independent74/';
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}

export function createHttpHandler({ service, secret, now = () => Date.now(), productionLedgerVerified = false, enableNewRounds = false, allowTestLedger = false, log = entry => console.log(JSON.stringify(entry)) } = {}) {
  if (!service) throw new TypeError('A game service is required.');
  return async request => {
    const url = new URL(request.url);
    if (url.pathname === '/healthz' && request.method === 'GET') return json({ ok: true, service: 'superwin-independent74', financial_enabled: productionLedgerVerified === true });
    let requestId;
    try {
      if (!url.pathname.startsWith(PREFIX)) fail('NOT_FOUND', 'Endpoint not found.', 404);
      const route = url.pathname.slice(PREFIX.length);
      if (!['state', 'history', 'action'].includes(route)) fail('NOT_FOUND', 'Endpoint not found.', 404);
      const expectedMethod = route === 'action' ? 'POST' : 'GET';
      if (request.method !== expectedMethod) fail('METHOD_NOT_ALLOWED', 'This endpoint requires ' + expectedMethod + '.', 405);
      const bytes = await readRequestBody(request);
      const principal = await verifyNativeRequest(request, bytes, { secret, now: now() });
      if (route !== 'action' && bytes.byteLength !== 0) fail('INVALID_BODY', 'Read requests cannot contain a body.', 400);
      if (url.searchParams.size > (url.searchParams.has('game_id') ? 1 : 0)) fail('INVALID_QUERY', 'Unexpected query parameters.', 400);
      const gameId = url.searchParams.get('game_id') || undefined;
      if (gameId !== undefined && !/^ind74_[a-z0-9_]{1,80}$/.test(gameId)) fail('INVALID_GAME', 'Select an independent game.', 422);
      let result;
      if (route === 'action') {
        if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) fail('UNSUPPORTED_CONTENT_TYPE', 'Use application/json.', 415);
        const input = parseJsonBody(bytes); requestId = typeof input.request_id === 'string' ? input.request_id : undefined;
        if (productionLedgerVerified !== true && allowTestLedger !== true) fail('LEDGER_NOT_VERIFIED', 'Account play is disabled until the production ledger is verified.', 503);
        if (input.type === 'play' && enableNewRounds !== true) fail('GAME_DISABLED', 'New rounds are currently disabled.', 503);
        result = await service.action(principal.sessionHash, input);
      } else result = await service[route](principal.sessionHash, gameId);
      return json(result);
    } catch (error) {
      const response = publicError(error);
      log({ event: 'independent74_request_failed', path: url.pathname, status: response.status, code: response.body.error.code, ...(requestId ? { request_id: requestId } : {}) });
      return json(response.body, response.status);
    }
  };
}
