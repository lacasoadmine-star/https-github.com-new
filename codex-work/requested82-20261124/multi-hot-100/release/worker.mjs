export const GAME_PATH='/new-games72/multi-hot-100/';
export const MEDIA_PREFIX='/_zplay/requested82-m100/';
export const KV_PREFIX='requested82/m100/sha256/';
export const GAME_ID='zplay72_multi_hot_100_v1';
export const BACKEND_GAME_ID='multihot100_native';
export const MEDIA_NAMES=Object.freeze([
  ...Array.from({length:8},(_,i)=>[`Sprites/Images-${i}.json`,`Sprites/Images-${i}.png`]).flat(),
  'Spine/Logo/multi hot 100 logo.json','Spine/Logo/multi hot 100 logo.atlas.txt','Spine/Logo/multi hot 100 logo.png','background.png'
]);
export const AUDIO_NAMES=Object.freeze(['Start/Background.mp3','Buttons/Spin.mp3','Start/ObjectMoveFast.mp3',
  ...Array.from({length:5},(_,i)=>`Start/ReelStop${i+1}.mp3`),'Start/WinMultiplier.mp3']);
const HASH=/^[a-f0-9]{64}$/,COMMIT=/^[a-f0-9]{40}$/,UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const encodePath=name=>name.split('/').map(encodeURIComponent).join('/');
const error=(message,status)=>new Response(message,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function resourceType(name){
  if(typeof name!=='string')return null;
  if(name==='app.mjs')return 'text/javascript; charset=utf-8';
  if(name==='page.css')return 'text/css; charset=utf-8';
  if(name==='asset-pins.json'||name.startsWith('media/')&&MEDIA_NAMES.includes(name.slice(6))){
    if(name.endsWith('.png'))return 'image/png';
    if(name.endsWith('.json'))return 'application/json; charset=utf-8';
    if(name.endsWith('.atlas.txt'))return 'text/plain; charset=utf-8';
  }
  if(name.startsWith('audio/')&&AUDIO_NAMES.includes(name.slice(6)))return 'audio/mpeg';
  return null;
}
export function resourcePath(config,record){
  const base=MEDIA_PREFIX+config.revision+'/';
  if(record.name==='app.mjs')return base+'app.'+record.sha256+'.mjs';
  if(record.name==='page.css')return base+'page.'+record.sha256+'.css';
  if(record.name==='asset-pins.json')return base+'asset-pins.'+record.sha256+'.json';
  return base+encodePath(record.name);
}
export function validConfig(config){
  if(config?.schema!=='zplay/m100-existing-host-release/v1'||typeof config.enabled!=='boolean'||
    config.gameId!==GAME_ID||config.backendGameId!==BACKEND_GAME_ID||!HASH.test(config.revision||'')||!COMMIT.test(config.sourceCommit||'')||
    !UUID.test(config.baseline?.versionId||'')||!Number.isSafeInteger(config.baseline.versionNumber)||config.baseline.versionNumber<1||
    !/^[-A-Za-z0-9_./]+\.mjs$/.test(config.baseline.mainModule||'')||config.baseline.mainModule.startsWith('/')||config.baseline.mainModule.split('/').includes('..')||
    !Number.isSafeInteger(config.baseline.moduleCount)||config.baseline.moduleCount<1||!Number.isSafeInteger(config.baseline.totalBytes)||config.baseline.totalBytes<1||
    !Array.isArray(config.resources)||![23,31,32].includes(config.resources.length))return false;
  const names=new Set();
  for(const record of config.resources){
    if(!record||names.has(record.name)||!resourceType(record.name)||record.contentType!==resourceType(record.name)||!HASH.test(record.sha256||'')||
      !Number.isSafeInteger(record.bytes)||record.bytes<1||record.bytes>8*1024*1024||record.key!==KV_PREFIX+record.sha256+'/'+record.name)return false;
    names.add(record.name);
  }
  if(!['app.mjs','page.css','asset-pins.json',...MEDIA_NAMES.map(name=>'media/'+name)].every(name=>names.has(name)))return false;
  return config.resources.length===23 || (config.resources.length===31?AUDIO_NAMES.slice(0,8):AUDIO_NAMES).every(name=>names.has('audio/'+name));
}

export function renderGameHTML(config){
  if(!validConfig(config))throw Error('M100_RELEASE_CONFIG_INVALID');
  const find=name=>config.resources.find(record=>record.name===name),base=MEDIA_PREFIX+config.revision+'/';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#00271f"><meta name="color-scheme" content="dark"><meta name="robots" content="noindex"><title>Multi Hot 100 · ZPLAY</title>'+
    '<link rel="stylesheet" href="'+resourcePath(config,find('page.css'))+'"><script type="module" src="'+resourcePath(config,find('app.mjs'))+'"></script></head><body>'+
    '<p id="m100-connection" role="status" aria-live="polite">Loading your game…</p><main id="m100-game" data-game-id="'+GAME_ID+'" data-asset-base="'+base+'media/" data-asset-pins-url="'+resourcePath(config,find('asset-pins.json'))+'" data-audio-base="'+(find('audio/'+AUDIO_NAMES[0])?base+'audio/':'')+'" aria-label="Multi Hot 100"></main>'+
    '<noscript>Enable JavaScript to play Multi Hot 100. <a href="/">Back to ZPLAY</a></noscript></body></html>';
}

/** Own one new same-game page and static namespace; every financial/auth/dashboard request delegates unchanged. */
export function createM100ReleaseWorker(previous,config){
  if(typeof previous?.fetch!=='function'||!validConfig(config))throw Error('M100_RELEASE_CONFIG_INVALID');
  const base=MEDIA_PREFIX+config.revision+'/',resources=new Map(config.resources.map(record=>[resourcePath(config,record),record]));
  return {...previous,async fetch(request,env,ctx){
    if(!config.enabled)return previous.fetch(request,env,ctx);
    const path=new URL(request.url).pathname,page=path===GAME_PATH,redirect=path===GAME_PATH.slice(0,-1),record=resources.get(path);
    if(!page&&!redirect&&!path.startsWith(base))return previous.fetch(request,env,ctx);
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
    if(redirect)return new Response(null,{status:308,headers:{Location:GAME_PATH,'Cache-Control':'no-store'}});
    const common={'X-Content-Type-Options':'nosniff','X-Zplay-M100-Release':config.revision,'Referrer-Policy':'same-origin'};
    if(page)return new Response(request.method==='HEAD'?null:renderGameHTML(config),{headers:{...common,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; base-uri 'none'; form-action 'self'; frame-ancestors 'self'"}});
    if(!record)return error('M100_RESOURCE_NOT_FOUND',404);
    let body;
    try{body=await env?.SSG_OFFICIAL_REFERENCES?.get(record.key,{type:'arrayBuffer'});}catch{return error('M100_MEDIA_UNAVAILABLE',503);}
    if(!(body instanceof ArrayBuffer))return error('M100_MEDIA_UNAVAILABLE',503);
    if(body.byteLength!==record.bytes||await digest(body)!==record.sha256)return error('M100_MEDIA_INTEGRITY_FAILED',502);
    return new Response(request.method==='HEAD'?null:body,{headers:{...common,'Content-Type':record.contentType,'Content-Length':String(record.bytes),
      'Cache-Control':'public, max-age=31536000, immutable',ETag:'"'+record.sha256+'"'}});
  }};
}
