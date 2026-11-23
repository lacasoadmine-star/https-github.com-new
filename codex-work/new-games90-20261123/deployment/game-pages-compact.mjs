export const GAME_ROUTE = '/new-games72/multi-hot-5-super-wilds/';
export const GAME_ID = 'zplay72_multi_hot_5_super_wilds_v1';

/** Adds the real game page to the current Player; old handlers keep ownership
 * of every other URL, including the authenticated API and dashboard. */
export function createSuperWildsPageWorker(previous, config) {
  const stored = Array.isArray(config?.assetPins) && config.assetPins.length === 2;
  const validPin = pin => pin && /^new90\/superwilds\/[a-f0-9]{24}\/game\.(mjs|css)$/.test(pin.key) &&
    /^[a-f0-9]{64}$/.test(pin.sha256) && Number.isSafeInteger(pin.bytes) && pin.bytes > 0;
  if (typeof previous?.fetch !== 'function' || config?.gameId !== GAME_ID || config?.route !== GAME_ROUTE ||
    !/^[a-f0-9]{24}$/.test(config?.assetRevision ?? '') || (stored ?
      !config.assetPins.every(validPin) || new Set(config.assetPins.map(p => p.key)).size !== 2 ||
      !['mjs','css'].every(ext => config.assetPins.some(p => p.key === `new90/superwilds/${config.assetRevision}/game.${ext}`)) :
      typeof config.clientSource !== 'string' || !config.clientSource || typeof config.stylesheetSource !== 'string' || !config.stylesheetSource)) {
    throw Error('SUPERWILDS_PAGE_CONFIG_INVALID');
  }
  const base = '/_zplay/superwilds/' + config.assetRevision + '/';
  const html = `<!doctype html><html lang="so"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#002d21"><meta name="robots" content="noindex"><title>Multi Hot 5 Super Wilds · ZPLAY</title><link rel="stylesheet" href="${base}game.css"><script type="module" src="${base}game.mjs"></script></head><body><main id="zplay-superwilds" aria-label="Multi Hot 5 Super Wilds"><p class="sw-boot-message" role="status">Furitaanka ciyaarta…</p></main></body></html>`;
  const assets = new Map([[GAME_ROUTE, [html, 'text/html; charset=utf-8', 'no-store']]]);
  for (const [ext, source, type] of [['mjs',config.clientSource,'text/javascript'],['css',config.stylesheetSource,'text/css']]) {
    const pin = stored ? config.assetPins.find(p => p.key.endsWith('.'+ext)) : null;
    assets.set(base + 'game.'+ext, [source, type+'; charset=utf-8', 'public, max-age=31536000, immutable', pin]);
  }
  const unavailable = () => new Response('Game asset unavailable. Please retry.', {status:503,
    headers:{'cache-control':'no-store','content-type':'text/plain; charset=utf-8','retry-after':'5'}});
  return { ...previous, async fetch(request, env, ctx) {
    const asset = assets.get(new URL(request.url).pathname);
    if (!asset) return previous.fetch(request, env, ctx);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {
      status: 405, headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' } });
    let body = asset[0];
    if (asset[3]) {
      try {
        body = await env.SSG_OFFICIAL_REFERENCES.get(asset[3].key, {type:'arrayBuffer'});
        if (!(body instanceof ArrayBuffer) || body.byteLength !== asset[3].bytes) return unavailable();
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)), n => n.toString(16).padStart(2,'0')).join('');
        if (digest !== asset[3].sha256) return unavailable();
      } catch { return unavailable(); }
    }
    const headers = { 'content-type': asset[1], 'cache-control': asset[2], 'x-content-type-options': 'nosniff',
      'x-zplay-game': GAME_ID, 'referrer-policy': 'same-origin' };
    if (asset[1].startsWith('text/html')) headers['content-security-policy'] = "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; base-uri 'none'; form-action 'self'; frame-ancestors 'self'";
    return new Response(request.method === 'HEAD' ? null : body, { headers });
  } };
}

export const GAME_PATH = '/new-games72/multi-hot-20/';
export const KV_PREFIX = 'native72/batch01-20261121-r7/multihot20/assets/';
export const MEDIA_NAMES = Object.freeze(['atlas-0.png','atlas-1.png','atlas-2.png','atlas-3.png','atlas-logo.png',
  'background.png','button.mp3','music.mp3','reel-stop.mp3','spin.mp3','wins.png','wins2.png','win.mp3']);
const SHA256 = /^[a-f0-9]{64}$/;
const hash = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
const escape = text => String(text).replace(/[&<>"']/g,value=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[value]));
const errorResponse = (message,status) => new Response(message,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

export function validConfig(config) {
  if (typeof config?.enabled !== 'boolean' || !/^[a-f0-9]{24}$/.test(config.revision || '')
    || !SHA256.test(config.appSha256 || '') || !SHA256.test(config.styleSha256 || '') || !SHA256.test(config.manifestSha256 || '')
    || !Array.isArray(config.media) || config.media.length !== MEDIA_NAMES.length) return false;
  const inline=typeof config.appSource==='string'&&!!config.appSource&&typeof config.styleSource==='string'&&typeof config.manifestSource==='string';
  const prefix='new90/m20/'+config.revision+'/';
  const external=[['appAsset','app.mjs','appSha256','text/javascript; charset=utf-8'],['styleAsset','style.css','styleSha256','text/css; charset=utf-8'],
    ['manifestAsset','assets.json','manifestSha256','application/json; charset=utf-8']].every(([field,name,sha,type])=>{
      const a=config[field];return a?.key===prefix+name&&a.sha256===config[sha]&&Number.isSafeInteger(a.bytes)&&a.bytes>0&&a.contentType===type;});
  if(!inline&&!external)return false;
  return MEDIA_NAMES.every(name=>config.media.filter(record=>record.name===name).length===1)
    && config.media.every(record=>record.key===KV_PREFIX+record.name && SHA256.test(record.sha256 || '')
      && Number.isSafeInteger(record.bytes) && record.bytes>0
      && record.contentType===(record.name.endsWith('.png')?'image/png':'audio/mpeg'));
}

export function renderGameHTML(config) {
  if (!validConfig(config)) throw Error('M20_RELEASE_CONFIG_INVALID');
  const base='/_zplay/new90-m20/'+config.revision+'/';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#001409"><meta name="robots" content="noindex"><title>Multi Hot 20 · ZPLAY</title>'
    +'<link rel="stylesheet" href="'+base+'style.'+config.styleSha256+'.css"><script type="module" src="'+base+'app.'+config.appSha256+'.mjs"></script></head><body>'
    +'<header class="m20-host-header"><a href="/" aria-label="Back to ZPLAY lobby">← ZPLAY</a><h1>Multi Hot 20</h1></header>'
    +'<p id="m20-connection" role="status" aria-live="polite">Loading your game…</p>'
    +'<main id="m20-game" data-manifest-url="'+escape(base+'assets.'+config.manifestSha256+'.json')+'" aria-label="Multi Hot 20"></main>'
    +'<noscript>Enable JavaScript to play Multi Hot 20.</noscript></body></html>';
}

/** Add one existing-wallet game without intercepting any old account or financial handler. */
export function createM20ReleaseWorker(previous,config) {
  if (!previous || typeof previous.fetch!=='function' || !validConfig(config)) throw Error('M20_RELEASE_CONFIG_INVALID');
  const base='/_zplay/new90-m20/'+config.revision+'/';
  const staticAssets=new Map([
    [base+'app.'+config.appSha256+'.mjs',{body:config.appSource,type:'text/javascript; charset=utf-8',sha256:config.appSha256,record:config.appAsset}],
    [base+'style.'+config.styleSha256+'.css',{body:config.styleSource,type:'text/css; charset=utf-8',sha256:config.styleSha256,record:config.styleAsset}],
    [base+'assets.'+config.manifestSha256+'.json',{body:config.manifestSource,type:'application/json; charset=utf-8',sha256:config.manifestSha256,record:config.manifestAsset}],
  ]);
  const media=new Map(config.media.map(record=>[base+'assets/'+record.name,record]));
  return {...previous,async fetch(request,env,ctx) {
    if (!config.enabled) return previous.fetch(request,env,ctx);
    const path=new URL(request.url).pathname;
    const asset=staticAssets.get(path)||(path===GAME_PATH+'assets.json'?{body:config.manifestSource,type:'application/json; charset=utf-8',sha256:config.manifestSha256,record:config.manifestAsset}:null);
    const record=media.get(path)||asset?.record;
    const page=path===GAME_PATH,manifestAlias=path===GAME_PATH+'assets.json',redirect=path===GAME_PATH.slice(0,-1);
    const owned=page||manifestAlias||redirect||asset||record||path.startsWith(base);
    if (!owned) return previous.fetch(request,env,ctx);
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
    if (redirect) return new Response(null,{status:308,headers:{Location:GAME_PATH,'Cache-Control':'no-store'}});
    const common={'X-Content-Type-Options':'nosniff','X-Zplay-M20-Release':config.revision};
    if (page) return new Response(request.method==='HEAD'?null:renderGameHTML(config),{headers:{...common,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
      'Referrer-Policy':'same-origin'}});
    const immutable={'Cache-Control':'public, max-age=31536000, immutable'};
    if (asset&&typeof asset.body==='string') return new Response(request.method==='HEAD'?null:asset.body,{headers:{...common,...(manifestAlias?{'Cache-Control':'no-store'}:immutable),'Content-Type':asset.type,ETag:'"'+asset.sha256+'"'}});
    if (!record) return errorResponse('M20_RESOURCE_NOT_FOUND',404);
    if (typeof env?.SSG_OFFICIAL_REFERENCES?.get!=='function') return errorResponse('M20_MEDIA_UNAVAILABLE',503);
    let body;
    try {body=await env.SSG_OFFICIAL_REFERENCES.get(record.key,{type:'arrayBuffer'});} catch {return errorResponse('M20_MEDIA_UNAVAILABLE',503);}
    if (!(body instanceof ArrayBuffer)) return errorResponse('M20_MEDIA_UNAVAILABLE',503);
    if (body.byteLength!==record.bytes || await hash(body)!==record.sha256) return errorResponse('M20_MEDIA_INTEGRITY_FAILED',502);
    return new Response(request.method==='HEAD'?null:body,{headers:{...common,...(manifestAlias?{'Cache-Control':'no-store'}:immutable),'Content-Type':record.contentType,'Content-Length':String(record.bytes),ETag:'"'+record.sha256+'"'}});
  }};
}

const SW_CONFIG=Object.freeze({"gameId":"zplay72_multi_hot_5_super_wilds_v1","route":"/new-games72/multi-hot-5-super-wilds/","assetRevision":"10710e868bca219739294b7a","assetPins":[{"key":"new90/superwilds/10710e868bca219739294b7a/game.mjs","sha256":"722de5da98ce01342af879956026a419c83298bba53e3c468486664ce4732065","bytes":62803},{"key":"new90/superwilds/10710e868bca219739294b7a/game.css","sha256":"c1da0e4b263d30453dd602ba4c9db78e04912247e7458c78c8d4c2cbeaa772de","bytes":10775}]});
const M20_CONFIG=Object.freeze({"enabled":true,"revision":"79bb7e48737feb68a2e905f8","appSha256":"d4c20fdb220638287477a1464c4b47e5bfb6e6f2b7b49988d344d3cc8d1250e6","styleSha256":"d8ab90003813abb3b223129b25bd1d3f4fe276b092004ef716ab4b5e758bc246","manifestSha256":"c757c008212e6e6f2accd7d19e0030685b6331d99d826defd555337bd18c7c94","appAsset":{"key":"new90/m20/79bb7e48737feb68a2e905f8/app.mjs","bytes":105646,"sha256":"d4c20fdb220638287477a1464c4b47e5bfb6e6f2b7b49988d344d3cc8d1250e6","contentType":"text/javascript; charset=utf-8"},"styleAsset":{"key":"new90/m20/79bb7e48737feb68a2e905f8/style.css","bytes":4946,"sha256":"d8ab90003813abb3b223129b25bd1d3f4fe276b092004ef716ab4b5e758bc246","contentType":"text/css; charset=utf-8"},"manifestAsset":{"key":"new90/m20/79bb7e48737feb68a2e905f8/assets.json","bytes":1950,"sha256":"c757c008212e6e6f2accd7d19e0030685b6331d99d826defd555337bd18c7c94","contentType":"application/json; charset=utf-8"},"media":[{"name":"atlas-0.png","key":"native72/batch01-20261121-r7/multihot20/assets/atlas-0.png","bytes":1623108,"sha256":"d7f66e65019dfb778968cc1caf1ab7eaf3a4c4099b37c475d09e32cce2799bd5","contentType":"image/png"},{"name":"atlas-1.png","key":"native72/batch01-20261121-r7/multihot20/assets/atlas-1.png","bytes":1265504,"sha256":"b69ddb538b871cbd476a1dc5aee5b0080ae29f121c3146bd523628d8824f617a","contentType":"image/png"},{"name":"atlas-2.png","key":"native72/batch01-20261121-r7/multihot20/assets/atlas-2.png","bytes":1691262,"sha256":"ef1e8f40021865fe853c9625cf5a6bf152dd0f7b3a19e387cad85add6312d8c0","contentType":"image/png"},{"name":"atlas-3.png","key":"native72/batch01-20261121-r7/multihot20/assets/atlas-3.png","bytes":1094836,"sha256":"768f8d203d2a8ef0b4ca67fc315decb86040fe1d5c0","contentType":"image/png"},{"name":"atlas-logo.png","key":"native72/batch01-20261121-r7/multihot20/assets/atlas-logo.png","bytes":375985,"sha256":"737ab58905c24f1302b2d78b2e20dceba1d5dd97b959900f3e87bae8db8b37fd","contentType":"image/png"},{"name":"background.png","key":"native72/batch01-20261121-r7/multihot20/assets/background.png","bytes":1797452,"sha256":"87b4e66861db2f1740601f8638a9c0a1d8ddb4f6b81c139272871d38639819c5","contentType":"image/png"},{"name":"button.mp3","key":"native72/batch01-20261121-r7/multihot20/assets/button.mp3","bytes":10493,"sha256":"ea24786693c8e574ed7739bbbc9b8193aa57d0bcaa01c7003cf5292f21b39003","contentType":"audio/mpeg"},{"name":"music.mp3","key":"native72/batch01-20261121-r7/multihot20/assets/music.mp3","bytes":2096626,"sha256":"0c567009cc1a1256f63396a4295d47318adc29985c7788e441a6a45b5412d9b5","contentType":"audio/mpeg"},{"name":"reel-stop.mp3","key":"native72/batch01-20261121-r7/multihot20/assets/reel-stop.mp3","bytes":22080,"sha256":"d6b01ee2afe2dadd5363d53fc31b96eefba14a0ecabc9e84060aa8e71ea1c946","contentType":"audio/mpeg"},{"name":"spin.mp3","key":"native72/batch01-20261121-r7/multihot20/assets/spin.mp3","bytes":28322,"sha256":"09f3c156b5af5a4d739f0d0ca1009acea9f275b8bff9e26d9f30ae108bee7f87","contentType":"audio/mpeg"},{"name":"wins.png","key":"native72/batch01-20261121-r7/multihot20/assets/wins.png","bytes":584562,"sha256":"a63ebe0fce418b7b670f554fb7b564f4a7b26745592d31c520c1dd44acf29fce","contentType":"image/png"},{"name":"wins2.png","key":"native72/batch01-20261121-r7/multihot20/assets/wins2.png","bytes":208793,"sha256":"036b3430be4bfc4b03e267492b8856ad79bff444301177f73f36c1981dc7e851","contentType":"image/png"},{"name":"win.mp3","key":"native72/batch01-20261121-r7/multihot20/assets/win.mp3","bytes":32644,"sha256":"86c389b42fd8f0ff62a4d1a6e0789cda7a212f8d37297ea499bf19b9a9e0e5a7","contentType":"audio/mpeg"}]});
export function mountRequested90Games(previous) {return createM20ReleaseWorker(createSuperWildsPageWorker(previous,SW_CONFIG),M20_CONFIG);}
