/**
 * ZPLAY read-only route audit.
 *
 * Deliberately never logs in, posts a spin, creates a wallet, or touches ETB.
 * HTTP 200 is NOT proof that a game is playable.
 * A missing Player session in this isolated audit is NOT an engine failure.
 *
 * Run: node tests/zplay-live-route-audit.mjs
 * Optional: ZPLAY_ORIGIN=https://... node tests/zplay-live-route-audit.mjs
 */
const origin = process.env.ZPLAY_ORIGIN || 'https://superwin-player.apdiy61.workers.dev';
const games = [
  ['JetX', '/games/jetx_native'],
  ['Multi Hot 5 Deluxe', '/games/multi_hot_5_deluxe_native'],
  ['Multi Hot 10', '/zplay74/multi-hot-10/'],
  ['Multi Hot 20', '/new-games72/multi-hot-20/'],
  ['Multi Hot 40', '/games/multihot40_native'],
  ['Multi Hot 100', '/games/multihot100_native'],
  ['Bao Slot 5X', '/games/bao_slot_5x_native'],
  ['Double X', '/games/doublex_native'],
  ['Roll X', '/games/rollx_native'],
  ['Balloon', '/games/balloon_native'],
  ['Plinko X Classic', '/games/plinkoxclassic_native'],
  ['Plinko X', '/games/plinkox_native'],
  ['BalloonX', '/games/balloonx_native'],
];
const timeoutMs = 12_000;
export function classify({ status, body, contentType }) {
  if (status === 404) return 'HTTP_404';
  if (status >= 500) return 'HTTP_SERVER_ERROR';
  if (status < 200 || status >= 400) return 'HTTP_' + status;
  if (!/text\/html/i.test(contentType || '')) return 'NON_HTML';
  if (/game unavailable|connection to the live engine is not ready/i.test(body)) return 'GAME_UNAVAILABLE';
  if (/not found/i.test(body.replace(/<[^>]+>/g, ' ').trim()) && body.length < 400) return 'NOT_FOUND_BODY';
  if (/connecting to zplay|loading your game|checking your account/i.test(body)) return 'BOOTSTRAP_PENDING';
  if (/sign in to (your|play)|sign in from zplay|log in to your/i.test(body)) return 'SESSION_REQUIRED_OR_BOOTSTRAP';
  return 'HTML_SHELL_ONLY';
}
async function check(name, path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const base = new URL(origin);
    if (base.protocol !== 'https:') throw new Error('HTTPS_REQUIRED');
    const url = new URL(path, base);
    const response = await fetch(url, {
      method: 'GET', redirect: 'manual', cache: 'no-store', signal: ctrl.signal,
      headers: { 'accept': 'text/html', 'cache-control': 'no-cache' }
    });
    const body = (await response.text()).slice(0, 300_000);
    return {
      name, path, http: response.status,
      verdict: classify({ status: response.status, body, contentType: response.headers.get('content-type') }),
      note: 'Unauthenticated GET only; browser canvas, session, API settlement and SPIN not certified'
    };
  } catch (error) {
    return { name, path, verdict: 'NETWORK_ERROR', error: String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const results = [];
  for (const [name, path] of games) results.push(await check(name, path));
  const blocked = results.filter(x => ['HTTP_404','HTTP_SERVER_ERROR','GAME_UNAVAILABLE','NOT_FOUND_BODY','NETWORK_ERROR','NON_HTML'].includes(x.verdict));
  process.stdout.write(JSON.stringify({
    schema: 'zplay-readonly-route-audit/v1',
    origin, audited: results.length, blocked: blocked.length, results
  }, null, 2) + '\n');
  if (blocked.length) process.exitCode = 1;
}
