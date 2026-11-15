// ZPLAY native games: scoped, presentation-only hit-area repair.
const SCOPED_GAMES = new Set(['037-safari-simba','multi-hot-5-super-wilds',
  'multi-hot-5-deluxe','multi-hot-100','habesha-fortune-5',
  'multi-hot-wild-ways','multi-hot-5-wild','002-multi-hot-10']);

export const NATIVE_TOUCH_HOTFIX_CSS = `
/* Native touch r1: disabled transparent hit areas must never block active controls. */
#hit-controls button, #controls button {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none; user-select: none;
}
#hit-controls button:disabled, #hit-controls button[hidden],
#controls button:disabled, #controls button[hidden] { pointer-events: none !important; }
#hit-controls button:not(:disabled):not([hidden]) { pointer-events: auto; }
#account-status, #status { pointer-events: none; }
#account-status a, #account-status button { pointer-events: auto; touch-action: manipulation; }
/* Multi Hot 10: expand small landscape targets and clear the SPIN hit area. */
@media (orientation: landscape) {
  #controls button.speed { left: 93%; top: 29%; width: 7%; height: 11%; min-width: 44px; min-height: 44px; }
  #controls button.info { min-width: 44px; min-height: 44px; }
  #controls button.sound { left: 92%; width: 7%; min-width: 44px; min-height: 44px; }
}
`;

export function isTargetNativeCss(request) {
  if (!request || request.method !== 'GET') return false;
  let pathname;
  try { pathname = new URL(request.url).pathname; } catch { return false; }
  const match = /^\/new74\/([a-z0-9-]+)\/style\.css$/.exec(pathname);
  return Boolean(match && SCOPED_GAMES.has(match[1]));
}

export async function patchNativeTouchCss(request, response) {
  if (!isTargetNativeCss(request) || !response || response.status !== 200) return response;
  if (!/text\/css/i.test(response.headers.get('content-type') || '')) return response;
  if (request.headers.has('range')) return response;
  const raw = await response.clone().text();
  const correctUi = raw.includes('#hit-controls button') && raw.includes('#account-status')
    || raw.includes('#controls button') && raw.includes('#status');
  if (raw.length > 100000 || !correctUi || raw.includes('Native touch r1:')) return response;
  const headers = new Headers(response.headers);
  for (const h of ['content-length','content-encoding','etag','last-modified','accept-ranges']) headers.delete(h);
  headers.set('cache-control','no-store');
  headers.set('x-zplay-native-touch','r1');
  headers.set('x-content-type-options','nosniff');
  return new Response(raw + '\n' + NATIVE_TOUCH_HOTFIX_CSS,{status:200,headers});
}
