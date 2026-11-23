/**
 * Preserve every existing Player request, authenticated game and wallet route.
 * Remove the incomplete NEW90 launcher injection from the root dashboard only.
 * This does not mark a game complete or bypass an ETB financial gate.
 */
export function createCleanPlayerLobby(previous, Rewriter = globalThis.HTMLRewriter) {
  if (!previous || typeof previous.fetch !== 'function' || typeof Rewriter !== 'function')
    throw Error('CLEAN_PLAYER_LOBBY_HOST_REQUIRED');
  return { ...previous, async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    const response = await previous.fetch(request, env, ctx);
    if (request.method !== 'GET' || path !== '/' || response.status !== 200 ||
        !/^text\/html\b/i.test(response.headers.get('content-type') || '')) return response;
    const headers = new Headers(response.headers);
    for (const name of ['content-length', 'etag', 'content-md5', 'last-modified']) headers.delete(name);
    headers.set('cache-control', 'no-store');
    return new Rewriter()
      .on('script#zplay-new90-loader', {element(el) {el.remove();}})
      .on('link[data-zplay-new90-style]', {element(el) {el.remove();}})
      .on('#zplay-requested90', {element(el) {el.remove();}})
      .transform(new Response(response.body, {status:response.status, statusText:response.statusText, headers}));
  } };
}
