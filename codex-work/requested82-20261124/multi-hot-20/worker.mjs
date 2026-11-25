export const GAME_PATH='/new-games72/multi-hot-20/';
const HASH=/^[a-f0-9]{64}$/;
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
const unavailable=()=>new Response('Multi Hot 20 temporarily unavailable. Please retry.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

/** Existing page/media/auth remain delegated; only its exact app script changes. */
export function createM20RecoveryWorker(previous,config) {
  if(typeof previous?.fetch!=='function'||!HASH.test(config?.appSha256||'')||!Number.isSafeInteger(config.appBytes)||config.appBytes<1||config.appBytes>1048576||
     config.appKey!==`requested82/m20/recovery/${config.appSha256}/app.mjs`||
     config.appPath!==`/_zplay/requested82-m20/${config.appSha256}/app.mjs`||
     !/^[a-f0-9]{24}$/.test(config.baselineRevision||'')||
     !new RegExp('^/_zplay/new90-m20/'+config.baselineRevision+'/app\\.[a-f0-9]{64}\\.mjs$').test(config.previousAppPath||''))throw Error('M20_RECOVERY_CONFIG_INVALID');
  return {...previous,async fetch(request,env,ctx) {
    const path=new URL(request.url).pathname;
    if(path===config.appPath) {
      if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
      try {
        const body=await env?.SSG_OFFICIAL_REFERENCES?.get(config.appKey,{type:'arrayBuffer'});
        if(!(body instanceof ArrayBuffer)||body.byteLength!==config.appBytes||await hash(body)!==config.appSha256)return unavailable();
        return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'public, max-age=31536000, immutable',
          'X-Content-Type-Options':'nosniff',ETag:'"'+config.appSha256+'"','X-Zplay-M20-Recovery':config.appSha256}});
      }catch{return unavailable();}
    }
    const response=await previous.fetch(request,env,ctx);
    if(path!==GAME_PATH||request.method!=='GET'||response.status!==200||!/^text\/html\b/i.test(response.headers.get('content-type')||''))return response;
    if(response.headers.get('x-zplay-m20-release')!==config.baselineRevision)return unavailable();
    const oldTag='<script type="module" src="'+config.previousAppPath+'"></script>',html=await response.text();
    if(html.split(oldTag).length!==2||!html.includes('id="m20-game"'))return unavailable();
    const headers=new Headers(response.headers);
    for(const name of ['content-length','etag','content-md5','last-modified'])headers.delete(name);
    headers.set('Cache-Control','no-store');headers.set('X-Zplay-M20-Recovery',config.appSha256);
    return new Response(html.replace(oldTag,'<script type="module" src="'+config.appPath+'"></script>'),{status:response.status,statusText:response.statusText,headers});
  }};
}
