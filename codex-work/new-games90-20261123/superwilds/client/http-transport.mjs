import { createSuperWildsTransport } from '../server/transport.mjs';
const BASE = '/api/slots/new-games90/superwilds';

/** Same-site browser transport for the existing authenticated server. The
 * HTTP-only player session cookie is sent by fetch, never read by this UI.
 * No local wallet/outcome fallback and no cross-origin credential forwarding.
 */
export function createSuperWildsHttpTransport({ fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('SUPERWILDS_FETCH_REQUIRED');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new TypeError('SUPERWILDS_TIMEOUT_INVALID');
  const api = async (path, body) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
    const response = await fetchImpl(BASE + '/' + path, { method: body ? 'POST' : 'GET', credentials: 'same-origin',signal:controller.signal,
      cache: 'no-store', redirect: 'error', headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response || typeof response.json !== 'function' ||
      response.headers?.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new Error('SUPERWILDS_SERVER_RESPONSE_REQUIRED');
    const result = await response.json();
    if (!response.ok) {
      const detail = /^[A-Z0-9_:.-]{1,160}$/.test(result?.detail ?? '') ? result.detail : 'SUPERWILDS_REQUEST_UNAVAILABLE';
      const error = new Error(detail); error.status = response.status; throw error;
    }
    return result;
    } finally { clearTimeout(timer); }
  };
  return createSuperWildsTransport({ request: () => null, service: {
    state: () => api('state'), spin: (_request, body) => api('spin', body), takeWin: (_request, body) => api('take-win', body),
    gamble: (_request, body) => api('gamble', body),
  } });
}
