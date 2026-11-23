/**
 * ZPLAY NEW90: own-origin media dependency contract.
 *
 * Keep ZPLAY presentation independent from third-party game demo domains.
 * Never copy or fetch provider media without authorization. This module does
 * not override operator/regulatory permissions for cash gameplay.
 */

export const BURN_MEDIA_BASE = '/new-games90/media/burn-wilds/';

const identifier = /^[a-z][a-z0-9_-]{0,63}$/;
const mediaPath = /^[a-z0-9][a-z0-9_/-]*\.(?:webp|png|svg|ogg|mp3)$/;
const failure = (code) => Object.assign(new Error(code), { code });

function requireOwnOrigin(origin) {
  let url;
  try { url = new URL(origin); } catch { throw failure('MEDIA_ORIGIN_INVALID'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' ||
      url.search || url.hash) throw failure('MEDIA_ORIGIN_INVALID');
  return url;
}

function validateFile(name, type) {
  if (typeof name !== 'string' || !mediaPath.test(name) || name.includes('//') ||
      name.split('/').some(part => part === '.' || part === '..') ||
      (type === 'image' && !/\.(png|webp|svg)$/.test(name)) ||
      (type === 'audio' && !/\.(ogg|mp3)$/.test(name))) {
    throw failure('MEDIA_FILE_INVALID');
  }
  return name;
}

function validateEntries(entries, type) {
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
    throw failure('MEDIA_MANIFEST_INVALID');
  }
  return Object.freeze(Object.fromEntries(Object.entries(entries).map(([key, file]) => {
    if (!identifier.test(key)) throw failure('MEDIA_KEY_INVALID');
    return [key, { file: validateFile(file, type), type }];
  })));
}

/** Build a same-origin media plan. This is not a proxy for SmartSoft assets. */
export function createBurnMediaPlan({ origin, images, sounds, licenseConfirmed = false }) {
  const site = requireOwnOrigin(origin);
  if (licenseConfirmed !== true) throw failure('MEDIA_RIGHTS_UNCONFIRMED');
  const pictures = validateEntries(images, 'image');
  const audio = validateEntries(sounds, 'audio');
  if (!pictures.wild || Object.keys(pictures).length < 2) {
    throw failure('MEDIA_SYMBOLS_MISSING');
  }
  const entries = {};
  for (const [kind, collection] of [['images', pictures], ['sounds', audio]]) {
    entries[kind] = Object.freeze(Object.fromEntries(Object.entries(collection).map(([key, item]) => {
      const url = new URL(BURN_MEDIA_BASE + item.file, site);
      if (url.origin !== site.origin || !url.pathname.startsWith(BURN_MEDIA_BASE)) {
        throw failure('MEDIA_EXTERNAL_DESTINATION');
      }
      return [key, Object.freeze({ url: url.href, type: item.type })];
    })));
  }
  return Object.freeze({ base: site.origin + BURN_MEDIA_BASE, images: entries.images, sounds: entries.sounds });
}

function contentTypeOkay(actual, type) {
  const mime = (actual || '').split(';', 1)[0].trim().toLowerCase();
  return type === 'image' ? ['image/png', 'image/webp', 'image/svg+xml'].includes(mime)
    : ['audio/mpeg', 'audio/ogg', 'application/ogg'].includes(mime);
}

/**
 * Probe own assets without external redirects. A 403/404 is a missing resource,
 * not an excuse to claim a complete game or to create a false balance.
 */
export async function verifyBurnMedia(plan, { fetcher = globalThis.fetch } = {}) {
  if (!plan || typeof fetcher !== 'function') throw failure('MEDIA_DEPENDENCIES_INVALID');
  const files = Object.values(plan.images || {}).concat(Object.values(plan.sounds || {}));
  if (files.length === 0) throw failure('MEDIA_EMPTY');
  const site = new URL(plan.base);
  for (const asset of files) {
    const url = new URL(asset.url);
    if (url.origin !== site.origin || !url.pathname.startsWith(BURN_MEDIA_BASE)) {
      throw failure('MEDIA_EXTERNAL_DESTINATION');
    }
    let response;
    try {
      response = await fetcher(url.href, {
        method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error'
      });
    } catch { throw failure('MEDIA_FETCH_FAILED'); }
    if (!response || !response.ok || response.redirected ||
        (response.url && new URL(response.url).origin !== site.origin) ||
        !contentTypeOkay(response.headers?.get('content-type'), asset.type)) {
      await response?.body?.cancel?.().catch(() => {});
      throw failure('MEDIA_NOT_READY');
    }
    await response.body?.cancel?.().catch(() => {});
  }
  return Object.freeze({ mediaReady: true, checkedCount: files.length, ownOrigin: site.origin });
}

/** No location/locale/geolocation shortcut: backend determines legal access. */
export function canOpenBurnPlayer({ mediaReady, authenticated, serverAuthorized }) {
  return mediaReady === true && authenticated === true && serverAuthorized === true;
}
