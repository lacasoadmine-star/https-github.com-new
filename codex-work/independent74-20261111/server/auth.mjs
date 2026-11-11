import { fail } from './errors.mjs';

const encoder = new TextEncoder();
export const MAX_BODY_BYTES = 8192;
export const MAX_CLOCK_SKEW_MS = 30_000;
const SUBJECT = /^@session:([a-f0-9]{64})$/;
const HEX = /^[a-f0-9]{64}$/;

export async function sha256(value) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
}

export function signatureMessage({ method, path, timestamp, subject, bodyHash }) {
  return [method.toUpperCase(), path, timestamp, subject, bodyHash].join('\n');
}

export async function readRequestBody(request) {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) fail('BODY_TOO_LARGE', 'Request body is too large.', 413);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); fail('BODY_TOO_LARGE', 'Request body is too large.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function verifyNativeRequest(request, bodyBytes, { secret, now = Date.now() } = {}) {
  if (typeof secret !== 'string' || secret.length < 16) fail('SERVICE_NOT_CONFIGURED', 'The account service is not configured.', 503);
  const subject = request.headers.get('x-native-user') || '';
  const timestamp = request.headers.get('x-native-time') || '';
  const signature = request.headers.get('x-native-signature') || '';
  const match = SUBJECT.exec(subject);
  if (!match || !/^\d{13}$/.test(timestamp) || !HEX.test(signature)) fail('UNAUTHORIZED', 'A signed account session is required.', 401);
  const milliseconds = Number(timestamp);
  if (!Number.isSafeInteger(milliseconds) || Math.abs(now - milliseconds) > MAX_CLOCK_SKEW_MS) fail('SIGNATURE_EXPIRED', 'The signed request has expired.', 401);
  const url = new URL(request.url);
  const bodyHash = await sha256(bodyBytes);
  const message = signatureMessage({ method: request.method, path: url.pathname + url.search, timestamp, subject, bodyHash });
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const signatureBytes = Uint8Array.from(signature.match(/../g), x => Number.parseInt(x, 16));
  // Web Crypto performs the HMAC comparison; do not compare secret digests as strings.
  const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(message));
  if (!valid) fail('UNAUTHORIZED', 'The signed request is invalid.', 401);
  return { sessionHash: match[1], subject };
}

export function parseJsonBody(bytes) {
  let value;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail('INVALID_JSON', 'Provide a valid JSON object.', 400); }
  if (!value || Array.isArray(value) || typeof value !== 'object') fail('INVALID_JSON', 'Provide a valid JSON object.', 400);
  return value;
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
