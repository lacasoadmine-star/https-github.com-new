import {validTrialManifest} from './trial-public.mjs';
export const TRIAL_PREFIX='/_zplay/requested82-pair/';
export const TRIAL_KV_PREFIX='requested82/first-pair/sha256/';
const HASH=/^[a-f0-9]{64}$/;
const digest=async body=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),n=>n.toString(16).padStart(2,'0')).join('');
export function trialResourcePath(config,record){const names={'app.mjs':'app.','style.css':'style.','manifest.json':'manifest.'};return TRIAL_PREFIX+config.revision+'/'+names[record.name]+record.sha256+(record.name==='app.mjs'?'.mjs':record.name==='style.css'?'.css':'.json');}
const types={'app.mjs':'text/javascript; charset=utf-8','style.css':'text/css; charset=utf-8','manifest.json':'application/json; charset=utf-8'};
export function validTrialConfig(config){
  return config?.schema==='zplay/first-pair-dashboard-release/v1'&&typeof config.enabled==='boolean'&&HASH.test(config.revision||'')&&
    /^[a-f0-9]{40}$/.test(config.sourceCommit||'')&&validTrialManifest(config.manifest)&&Array.isArray(config.resources)&&config.resources.length===3&&
    Object.keys(types).every(name=>config.resources.filter(record=>record?.name===name).length===1)&&config.resources.every(record=>
      HASH.test(record.sha256||'')&&Number.isSafeInteger(record.bytes)&&record.bytes>0&&record.bytes<1048576&&record.contentType===types[record.name]&&record.key===TRIAL_KV_PREFIX+record.sha256+'/'+record.name);
}
export function renderTrialHead(config){
  if(!validTrialConfig(config))throw Error('FIRST_PAIR_CONFIG_INVALID');const get=name=>config.resources.find(record=>record.name===name);
  return `<link rel="stylesheet" href="${trialResourcePath(config,get('style.css'))}" data-zplay-requested82-pair-style><script type="module" id="zplay-requested82-pair-loader" data-manifest-url="${trialResourcePath(config,get('manifest.json'))}" src="${trialResourcePath(config,get('app.mjs'))}"></script>`;
}
/** Exact user-authorized first-pair admission, without a completed-game assertion. */
export function createFirstPairWorker(previous,config,Rewriter=globalThis.HTMLRewriter){
  if(typeof previous?.fetch!=='function'||!validTrialConfig(config))throw Error('FIRST_PAIR_CONFIG_INVALID');
  const base=TRIAL_PREFIX+config.revision+'/',resources=new Map(config.resources.map(record=>[trialResourcePath(config,record),record]));
  return {...previous,async fetch(request,env,ctx){
    if(!config.enabled)return previous.fetch(request,env,ctx);const path=new URL(request.url).pathname;
    if(path.startsWith(base)){
      if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
      const record=resources.get(path);if(!record)return new Response('Resource not found',{status:404,headers:{'Cache-Control':'no-store'}});
      let body;try{body=await env?.SSG_OFFICIAL_REFERENCES?.get(record.key,{type:'arrayBuffer'});}catch{}
      if(!(body instanceof ArrayBuffer)||body.byteLength!==record.bytes||await digest(body)!==record.sha256)return new Response('Game catalogue temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});
      return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':record.contentType,'Content-Length':String(record.bytes),'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff',ETag:'"'+record.sha256+'"'}});
    }
    const response=await previous.fetch(request,env,ctx);
    if(path!=='/'||request.method!=='GET'||response.status!==200||!/^text\/html\b/i.test(response.headers.get('Content-Type')||'')||typeof Rewriter!=='function')return response;
    const headers=new Headers(response.headers);for(const name of ['content-length','etag','content-md5','last-modified'])headers.delete(name);
    headers.set('Cache-Control','no-store');headers.set('X-Zplay-First-Pair',config.revision);
    const rewriter=new Rewriter();for(const selector of ['script#zplay-new90-loader','link[data-zplay-new90-style]','#zplay-requested90',
      'script#zplay-new71-loader','link[data-zplay-new71-style]','#zplay-requested71','script#zplay-requested82-pair-loader','link[data-zplay-requested82-pair-style]'])rewriter.on(selector,{element(el){el.remove();}});
    rewriter.on('head',{element(el){el.append(renderTrialHead(config),{html:true});}});
    return rewriter.transform(new Response(response.body,{status:response.status,statusText:response.statusText,headers}));
  }};
}
