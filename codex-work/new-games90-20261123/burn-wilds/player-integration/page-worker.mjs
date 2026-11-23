export const BURN_TEST_PAGE = '/native-ui/new90/burn-wilds/';
export const BURN_TEST_VIEWPORTS = Object.freeze([360, 390, 430]);
export const BURN_TEST_CLIENT_FILES = Object.freeze([
  'entry.mjs', 'simulation-transport.mjs', 'mount.mjs', 'controller.mjs',
  'audio.mjs', 'fullscreen.mjs', 'scene.mjs', 'rules.mjs', 'expansion.mjs',
  'outcome-audit.mjs', 'own-artwork.mjs', 'layout.mjs', 'flame-overlay.mjs',
  'style.css', 'test-shell.css'
]);

const CLIENT_FILES = new Set(BURN_TEST_CLIENT_FILES);
const REVISION = /^[a-f0-9]{24}$/;
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'";

export function burnTestViewport(search) {
  const value = new URLSearchParams(search).get('viewport');
  return BURN_TEST_VIEWPORTS.some(width => String(width) === value) ? Number(value) : null;
}

export function renderBurnTestPage({revision, viewport = null}) {
  if (!REVISION.test(revision || '') || viewport !== null && !BURN_TEST_VIEWPORTS.includes(viewport)) {
    throw new TypeError('BURN_TEST_PAGE_CONFIG_INVALID');
  }
  const links = [[null, 'Fit screen'], ...BURN_TEST_VIEWPORTS.map(width => [width, width + ' px'])]
    .map(([width, label]) => `<a href="${BURN_TEST_PAGE}${width ? '?viewport=' + width : ''}"${width === viewport ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#001d18"><meta name="robots" content="noindex,nofollow"><title>Game 1 · Multi Hot 5 Burn Wilds · ZPLAY</title><link rel="stylesheet" href="${BURN_TEST_PAGE}style.css"><link rel="stylesheet" href="${BURN_TEST_PAGE}test-shell.css"><script type="module" src="${BURN_TEST_PAGE}entry.mjs"></script></head>
<body class="bw-test-page" data-mode="SIMULATION" data-release="${revision}">
  <header class="bw-test-header"><a class="bw-test-back" href="/">← ZPLAY</a><div><p class="bw-test-eyebrow">GAME 1 / 90</p><h1>Multi Hot 5 Burn Wilds</h1></div><span class="bw-test-badge">SERVER TEST</span></header>
  <main class="bw-test-main">
    <section class="bw-test-notice" aria-label="Test session information"><strong>TEST ETB · Simulation</strong><p>Test credits come from the server test session. They are not your Player wallet and cannot be deposited or withdrawn. Cash play is not enabled.</p></section>
    <div class="bw-test-toolbar"><button id="burn-start-server-test" type="button">Start server test</button><nav aria-label="Layout preview width">${links}</nav></div>
    <p id="burn-test-status" role="status" aria-live="polite">Start a server test to load the game.</p>
    <div class="bw-test-frame"${viewport ? ` data-viewport="${viewport}"` : ''}><div id="burn-wilds-root" hidden aria-label="Multi Hot 5 Burn Wilds server test"></div></div>
    <details id="burn-test-history" class="bw-test-history"><summary>Server test history</summary><button id="burn-refresh-history" type="button">Refresh</button><pre id="burn-history-output">Start a server test to view its history.</pre></details>
    <p class="bw-test-footnote">Test credits expire after two hours or a server restart. This test does not use your Player balance.</p>
    <noscript><p class="bw-test-noscript">JavaScript is required for the native Canvas game.</p></noscript>
  </main>
</body></html>`;
}

/** A bounded static attachment to the EXISTING presentation service. It has
 * no wallet, RNG, game API, account authorization or cookie mutation. */
export function createBurnWildsTestPageWorker(previous, config) {
  if (typeof previous?.fetch !== 'function' || !REVISION.test(config?.revision || '') ||
      !config.assets || typeof config.assets !== 'object' || Array.isArray(config.assets)) {
    throw new TypeError('BURN_TEST_PAGE_CONFIG_INVALID');
  }
  const entries = Object.entries(config.assets);
  if (entries.length !== CLIENT_FILES.size || entries.some(([name, value]) =>
      !CLIENT_FILES.has(name) || typeof value !== 'string' || !value || value.length > 512 * 1024)) {
    throw new TypeError('BURN_TEST_CLIENT_ASSETS_INVALID');
  }
  const assets = new Map(entries);
  const descriptors = Object.getOwnPropertyDescriptors(previous);
  descriptors.fetch = {configurable: true, enumerable: true, writable: true, value: async function (request, env, ctx) {
    const url = new URL(request.url);
    const route = url.pathname;
    if (route !== BURN_TEST_PAGE.slice(0, -1) && !route.startsWith(BURN_TEST_PAGE)) {
      return previous.fetch.call(previous, request, env, ctx);
    }
    const headers = {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin',
      'x-zplay-burn-test-release': config.revision,
      'x-zplay-game-mode': 'SIMULATION'
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', {status: 405, headers: {...headers, allow: 'GET, HEAD'}});
    }
    if (route === BURN_TEST_PAGE.slice(0, -1)) {
      return new Response(null, {status: 308, headers: {...headers, location: BURN_TEST_PAGE + url.search}});
    }
    if (route === BURN_TEST_PAGE) {
      return new Response(request.method === 'HEAD' ? null : renderBurnTestPage({revision: config.revision, viewport: burnTestViewport(url.search)}), {
        headers: {...headers, 'content-type': 'text/html; charset=utf-8', 'content-security-policy': CSP,
          'permissions-policy': 'camera=(), microphone=(), geolocation=()'}
      });
    }
    const name = route.slice(BURN_TEST_PAGE.length);
    if (!assets.has(name)) return new Response(request.method === 'HEAD' ? null : 'Game resource not found', {
      status: 404, headers: {...headers, 'content-type': 'text/plain; charset=utf-8'}
    });
    return new Response(request.method === 'HEAD' ? null : assets.get(name), {
      headers: {...headers, 'content-type': name.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8'}
    });
  }};
  return Object.create(Object.getPrototypeOf(previous), descriptors);
}
