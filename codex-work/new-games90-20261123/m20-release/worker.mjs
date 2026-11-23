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
