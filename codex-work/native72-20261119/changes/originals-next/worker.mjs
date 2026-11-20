const prefix = '/zplay-originals/';
const mime = {
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

export function installOriginalGames(previous, { assets, games, previewOnly = true, Rewriter = globalThis.HTMLRewriter }) {
  const pages = new Map(games.map(game => [
    prefix + game.slug,
    assets['index.html'].replaceAll('{{TITLE}}', game.title)
      .replace('{{GAME}}', game.slug).replace('{{THEME}}', game.theme)
      .replace('{{DESCRIPTION}}', game.description),
  ]));
  const cards = '<section class="zplay-original-games" id="zplay-original-games" aria-labelledby="zplay-original-games-title">' +
    '<h2 id="zplay-original-games-title">New games</h2>' +
    games.map(game => '<article><strong>' + game.title + '</strong><a href="' +
      prefix + game.slug + '/" aria-label="Play Now · ' + game.title + '">Play Now</a></article>').join('') +
    '</section>';
  const descriptors = Object.getOwnPropertyDescriptors(previous);
  delete descriptors.fetch;
  for (const descriptor of Object.values(descriptors)) {
    if (typeof descriptor.value === 'function') descriptor.value = descriptor.value.bind(previous);
    if (descriptor.get) descriptor.get = descriptor.get.bind(previous);
    if (descriptor.set) descriptor.set = descriptor.set.bind(previous);
  }
  const worker = Object.create(Object.getPrototypeOf(previous), descriptors);
  Object.defineProperty(worker, 'fetch', { enumerable: true, async value(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const method = request.method;
    if (env.PORTAL !== 'player' || (previewOnly && env.ZPLAY_ORIGINALS_QA !== 'true') ||
        (method !== 'GET' && method !== 'HEAD')) {
      return previous.fetch.call(previous, request, env, ctx);
    }
    const page = pages.get(pathname.replace(/\/$/, ''));
    const name = pathname.slice(prefix.length);
    if (page || pathname.startsWith(prefix) && name !== 'index.html' && Object.hasOwn(assets, name)) {
      const body = page ?? assets[name];
      const type = page ? mime['.html'] : mime[name.slice(name.lastIndexOf('.'))];
      return new Response(method === 'HEAD' ? null : body, { headers: {
        'Content-Type': type,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
      } });
    }
    const response = await previous.fetch.call(previous, request, env, ctx);
    if (pathname !== '/' || method !== 'GET' || !response.ok ||
        !response.headers.get('content-type')?.includes('text/html')) return response;
    const transformed = new Rewriter()
      .on('head', { element: node => node.append('<link rel="stylesheet" href="/zplay-originals/lobby.css">', { html: true }) })
      .on('body', { element: node => node.append(cards, { html: true }) })
      .transform(response);
    const headers = new Headers(transformed.headers);
    for (const name of ['content-length', 'etag', 'last-modified']) headers.delete(name);
    return new Response(transformed.body, { status: transformed.status, headers });
  } });
  return worker;
}
