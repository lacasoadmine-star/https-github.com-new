export class ApiError extends Error {
  constructor(message, {status = 0, code = '', ambiguous = false} = {}) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code; this.ambiguous = ambiguous;
  }
}

const BASE = '/independent74/api/';
export async function request(path, {method = 'GET', body, signal, sessionGuard} = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, {once: true});
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(BASE + path, {
      method, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: {...(body ? {'content-type': 'application/json', 'accept': 'application/json'} : {'accept': 'application/json'}), ...(sessionGuard ? {'X-Independent74-Session': sessionGuard} : {})},
      body: body ? JSON.stringify(body) : undefined, signal: controller.signal,
    });
    const type = response.headers.get('content-type') || '';
    if (!type.includes('application/json')) throw new ApiError('The account server returned an unexpected response. Try again.', {status: response.status, ambiguous: method === 'POST'});
    let value;
    try { value = await response.json(); } catch { throw new ApiError('The server response could not be read. Check the round before playing again.', {status: response.status, ambiguous: method === 'POST'}); }
    if (!response.ok || value?.ok === false || value?.success === false) {
      const code = typeof value.error === 'string' ? value.error : value.error?.code || value.code || '';
      const message = value.error?.message || value.message || readableCode(code) || 'The account service is unavailable.';
      throw new ApiError(message, {status: response.status, code, ambiguous: method === 'POST' && response.status >= 500});
    }
    return value;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted ? 'The request timed out. Check this round before playing again.' : 'Connection lost. Check this round before playing again.', {ambiguous: method === 'POST'});
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

function readableCode(code) {
  const messages = {
    ACCOUNT_UNAVAILABLE: 'Your account wallet is currently unavailable.',
    WALLET_UNAVAILABLE: 'Your account wallet is currently unavailable.',
    AUTH_REQUIRED: 'Sign in to your Superwin account to play.',
    UNAUTHORIZED: 'Sign in to your Superwin account to play.',
    INSUFFICIENT_FUNDS: 'Your account balance is too low for this bet.',
    GAME_DISABLED: 'This game is not available for account play yet.',
    RATE_LIMITED: 'Please wait a moment before trying again.',
  };
  return messages[code] || (code ? code.replaceAll('_', ' ').toLowerCase().replace(/^./, x => x.toUpperCase()) : '');
}

export function parseStake(text, decimals = 2) {
  const value = String(text).trim();
  if (!new RegExp('^\\d+(?:\\.\\d{0,' + decimals + '})?$').test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  try { return BigInt(whole + fraction.padEnd(decimals, '0')).toString(); } catch { return null; }
}

export function formatMinor(value, currency = '', decimals = 2) {
  if (!/^-?\d+$/.test(String(value))) return '—';
  let number = BigInt(value); const sign = number < 0n ? '−' : ''; if (number < 0n) number = -number;
  const divisor = 10n ** BigInt(decimals), whole = number / divisor;
  const fraction = decimals ? '.' + (number % divisor).toString().padStart(decimals, '0') : '';
  return sign + whole.toLocaleString('en-US') + fraction + (currency ? ' ' + currency : '');
}

export function inputMinor(value, decimals = 2) {
  if (!/^\d+$/.test(String(value))) return '';
  const text = BigInt(value).toString().padStart(decimals + 1, '0');
  return decimals ? text.slice(0, -decimals) + '.' + text.slice(-decimals) : text;
}

export function savePending(value) {
  try { value ? sessionStorage.setItem('ind74.pending.v1', JSON.stringify(value)) : sessionStorage.removeItem('ind74.pending.v1'); } catch {}
}
export function loadPending() {
  try {
    const value = JSON.parse(sessionStorage.getItem('ind74.pending.v1') || 'null');
    if (value && typeof value.request_id === 'string' && /^ind74_[a-z0-9_]+$/.test(value.game_id) && ['play','reveal','collect'].includes(value.type)) return value;
  } catch {}
  return null;
}
