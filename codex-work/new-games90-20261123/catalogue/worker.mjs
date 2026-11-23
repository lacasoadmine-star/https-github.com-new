import {CATALOGUE_PATH, SECTION_PATH, renderPage, validCatalogue} from './public.mjs';

/** Wrap the active Player entry. Existing game, account, wallet and payment handlers are delegated. */
export function createNew90Worker(previous, config, Rewriter = globalThis.HTMLRewriter) {
  if (!previous || typeof previous.fetch !== 'function' || !/^[a-f0-9]{24}$/.test(config?.assetRevision || '')
    || !validCatalogue(config.catalogue)) throw Error('NEW90_WORKER_CONFIG_INVALID');
  const root = '/_zplay/new90/' + config.assetRevision + '/';
  const assets = new Map([
    [CATALOGUE_PATH, [JSON.stringify(config.catalogue), 'application/json; charset=utf-8', 'no-store']],
    [SECTION_PATH, [renderPage(config.catalogue, root + 'styles.css', root + 'client.mjs'), 'text/html; charset=utf-8', 'no-store']],
    [root + 'client.mjs', [config.clientSource, 'text/javascript; charset=utf-8', 'public, max-age=31536000, immutable']],
    [root + 'public.mjs', [config.publicSource, 'text/javascript; charset=utf-8', 'public, max-age=31536000, immutable']],
    [root + 'styles.css', [config.stylesheetSource, 'text/css; charset=utf-8', 'public, max-age=31536000, immutable']]
  ]);
  return {
    ...previous,
    async fetch(request, env, ctx) {
      const url = new URL(request.url), asset = assets.get(url.pathname);
      if (asset) {
        if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405, headers:{Allow:'GET, HEAD', 'Cache-Control':'no-store'}});
        const headers = {'Content-Type':asset[1], 'Cache-Control':asset[2], 'X-Content-Type-Options':'nosniff', 'X-Zplay-New90':config.catalogue.releaseId};
        if (url.pathname === SECTION_PATH) headers['Content-Security-Policy'] = "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";
        return new Response(request.method === 'HEAD' ? null : asset[0], {headers});
      }
      const response = await previous.fetch(request, env, ctx);
      if (request.method !== 'GET' || url.pathname !== '/' || response.status !== 200
        || !/^text\/html\b/i.test(response.headers.get('content-type') || '') || typeof Rewriter !== 'function') return response;
      const headers = new Headers(response.headers);
      for (const name of ['content-length', 'etag', 'content-md5', 'last-modified']) headers.delete(name);
      headers.set('Cache-Control', 'no-store'); headers.set('X-Zplay-New90', config.catalogue.releaseId);
      const input = new Response(response.body, {status:response.status, statusText:response.statusText, headers});
      return new Rewriter()
        .on('script#zplay-new71-loader', {element(element) { element.remove(); }})
        .on('link[data-zplay-new71-style]', {element(element) { element.remove(); }})
        .on('script#zplay-new90-loader', {element(element) { element.remove(); }})
        .on('link[data-zplay-new90-style]', {element(element) { element.remove(); }})
        .on('#zplay-requested90', {element(element) { element.remove(); }})
        .on('head', {element(element) { element.append(`<link rel="stylesheet" href="${root}styles.css" data-zplay-new90-style><script type="module" id="zplay-new90-loader" src="${root}client.mjs"></script>`, {html:true}); }})
        .transform(input);
    }
  };
}

/** Load pinned catalogue/browser assets as data; KV text is never executed here. */
export function createStoredNew90Worker(previous, pin, Rewriter = globalThis.HTMLRewriter) {
  if (!previous || typeof previous.fetch !== 'function'
    || !/^[A-Z][A-Z0-9_]*$/.test(pin?.bindingName || '')
    || !/^[a-f0-9]{64}$/.test(pin.sha256 || '')
    || pin.key !== 'new90/catalogue/' + pin.sha256.slice(0,24) + '/config.json'
    || !Number.isSafeInteger(pin.bytes) || pin.bytes < 1 || pin.bytes > 1048576
    || !/^[a-f0-9]{24}$/.test(pin.assetRevision || '')) throw Error('NEW90_STORED_CONFIG_INVALID');
  const root = '/_zplay/new90/' + pin.assetRevision + '/';
  const own = new Set([CATALOGUE_PATH, SECTION_PATH, root+'client.mjs', root+'public.mjs', root+'styles.css']);
  let binding, pending;
  async function load(env) {
    const namespace = env?.[pin.bindingName];
    if (!namespace || typeof namespace.get !== 'function') throw Error('NEW90_CONFIG_UNAVAILABLE');
    if (!pending || binding !== namespace) {
      binding = namespace;
      pending = (async () => {
        const value = await namespace.get(pin.key, {type:'arrayBuffer'});
        if (!(value instanceof ArrayBuffer) || value.byteLength !== pin.bytes) throw Error('NEW90_CONFIG_BYTES');
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', value)),
          n=>n.toString(16).padStart(2,'0')).join('');
        if (digest !== pin.sha256) throw Error('NEW90_CONFIG_HASH');
        const config = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(value));
        if (config.assetRevision !== pin.assetRevision
          || !['clientSource','publicSource','stylesheetSource'].every(name=>typeof config[name]==='string')) throw Error('NEW90_CONFIG_DATA');
        return createNew90Worker(previous, config, Rewriter);
      })().catch(error=>{if(binding===namespace)pending=null;throw error;});
    }
    return pending;
  }
  return {...previous, async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname, isOwn = own.has(path);
    if (!isOwn && !(path==='/' && request.method==='GET')) return previous.fetch(request,env,ctx);
    if (isOwn && !['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',
      {status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
    let worker;
    try {worker=await load(env);}
    catch {
      if (!isOwn) return previous.fetch(request,env,ctx);
      return new Response(request.method==='HEAD'?null:'New games temporarily unavailable',
        {status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    }
    return worker.fetch(request,env,ctx);
  }};
}
