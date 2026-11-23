/**
 * Verify caller-supplied asset descriptors and load them from one same-origin
 * directory. This module contains no application identifiers, asset filenames,
 * storage keys, stored hashes, service credentials, or source provenance.
 *
 * Descriptor fields: id, path, sha256, byteLength, mediaType.
 * Supply descriptors from trusted application configuration.
 * Importing the module performs no requests and creates no media playback.
 */
export async function loadPinnedAssets({
  descriptors,
  baseURL,
  origin = globalThis.location?.origin,
  fetcher = globalThis.fetch,
  imageDecoder = globalThis.createImageBitmap,
  decodeImages = true,
  signal,
  concurrency = 4,
  maxTotalBytes = 64 * 1024 * 1024
} = {}) {
  const fail = code => { throw new Error(code); };
  const aborted = () => Object.assign(new Error('ASSET_LOAD_ABORTED'), { name: 'AbortError' });
  if (!Array.isArray(descriptors) || !baseURL || !origin || typeof fetcher !== 'function') fail('INVALID_ASSET_LOADER_OPTIONS');
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 16 ||
      !Number.isSafeInteger(maxTotalBytes) || maxTotalBytes < 1) fail('INVALID_ASSET_LOADER_LIMITS');

  const base = new URL(baseURL, origin);
  if (!/^https?:$/.test(base.protocol) || base.origin !== origin || base.username ||
      base.password || base.search || base.hash || !base.pathname.endsWith('/')) fail('SAME_ORIGIN_ASSET_DIRECTORY_REQUIRED');

  const identifiers = new Set(), paths = new Set();
  let total = 0;
  const pins = descriptors.map(value => {
    if (!value || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value.id || '') ||
        !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value.path || '') ||
        value.path.split('/').some(part => !part || part === '.' || part === '..') ||
        !/^[a-f0-9]{64}$/.test(value.sha256 || '') ||
        !Number.isSafeInteger(value.byteLength) || value.byteLength < 1 ||
        typeof value.mediaType !== 'string' || !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(value.mediaType)) fail('INVALID_ASSET_DESCRIPTOR');
    if (identifiers.has(value.id) || paths.has(value.path)) fail('DUPLICATE_ASSET_DESCRIPTOR');
    identifiers.add(value.id); paths.add(value.path);
    total += value.byteLength;
    if (!Number.isSafeInteger(total) || total > maxTotalBytes) fail('ASSET_SIZE_LIMIT');
    const url = new URL(value.path, base);
    if (url.origin !== origin || url.pathname !== base.pathname + value.path) fail('INVALID_ASSET_PATH');
    return Object.freeze({
      id: value.id, path: value.path, url: url.href,
      sha256: value.sha256, byteLength: value.byteLength, mediaType: value.mediaType
    });
  });

  const aborter = new AbortController(), records = new Map(), bitmaps = new Set();
  let disposed = false, index = 0, firstError = null;
  const onAbort = () => aborter.abort();
  if (signal?.aborted) throw aborted();
  signal?.addEventListener('abort', onAbort, { once: true });
  const live = () => { if (disposed || aborter.signal.aborted) throw aborted(); };

  async function boundedBody(response, limit) {
    if (!response.body?.getReader) {
      const result = new Uint8Array(await response.arrayBuffer());
      if (result.byteLength !== limit) fail('ASSET_LENGTH_MISMATCH');
      return result;
    }
    const reader = response.body.getReader(), chunks = [];
    let count = 0;
    try {
      while (true) {
        live();
        const next = await reader.read();
        if (next.done) break;
        count += next.value.byteLength;
        if (count > limit) {
          await reader.cancel();
          fail('ASSET_LENGTH_MISMATCH');
        }
        chunks.push(next.value);
      }
      if (count !== limit) fail('ASSET_LENGTH_MISMATCH');
      const bytes = new Uint8Array(count);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return bytes;
    } finally {
      reader.releaseLock();
    }
  }

  async function load(pin) {
    live();
    const response = await fetcher(pin.url, {
      credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { accept: pin.mediaType }, signal: aborter.signal
    });
    live();
    if (!response.ok || response.redirected) fail('ASSET_RESPONSE_REJECTED');
    if (response.url && new URL(response.url).href !== pin.url) fail('ASSET_RESPONSE_URL_CHANGED');
    const bytes = await boundedBody(response, pin.byteLength);
    live();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const actual = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    if (actual !== pin.sha256) fail('ASSET_HASH_MISMATCH');

    let image = null;
    if (decodeImages && /^image\/(?:png|jpeg|webp|avif|gif|bmp)$/.test(pin.mediaType)) {
      if (typeof imageDecoder !== 'function') fail('IMAGE_DECODER_REQUIRED');
      image = await imageDecoder(new Blob([bytes], { type: pin.mediaType }));
      if (disposed || aborter.signal.aborted) { image.close?.(); throw aborted(); }
      if (!Number.isInteger(image.width) || !Number.isInteger(image.height) ||
          image.width <= 0 || image.height <= 0) {
        image.close?.(); fail('INVALID_DECODED_IMAGE');
      }
      bitmaps.add(image);
    }
    live();
    records.set(pin.id, Object.freeze({
      id: pin.id, url: pin.url, mediaType: pin.mediaType,
      byteLength: pin.byteLength, sha256: pin.sha256, image,
      copyBytes() { live(); return bytes.slice().buffer; },
      blob() { live(); return new Blob([bytes], { type: pin.mediaType }); }
    }));
  }

  async function worker() {
    try {
      while (index < pins.length) {
        const pin = pins[index++];
        await load(pin);
      }
    } catch (error) {
      if (!firstError) firstError = error;
      aborter.abort();
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    aborter.abort();
    signal?.removeEventListener('abort', onAbort);
    for (const bitmap of bitmaps) bitmap.close?.();
    bitmaps.clear(); records.clear();
  }

  await Promise.allSettled(Array.from({ length: Math.min(concurrency, pins.length) }, worker));
  signal?.removeEventListener('abort', onAbort);
  if (firstError || signal?.aborted) {
    dispose();
    throw firstError || aborted();
  }
  return Object.freeze({
    get(id) { live(); if (!records.has(id)) fail('UNKNOWN_ASSET_ID'); return records.get(id); },
    ids() { live(); return Object.freeze(pins.map(pin => pin.id)); },
    totalBytes: total,
    dispose
  });
}
