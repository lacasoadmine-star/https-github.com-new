// Manifest policy stays in the pinned build and client, without runtime duplication.
export const TRIAL_PREFIX='/_zplay/requested82-pair/';
export const TRIAL_KV_PREFIX='requested82/first-pair/sha256/';
const names=['app.mjs','style.css','manifest.json'];
const types=['text/javascript','text/css','application/json'];
const hash=/^[a-f0-9]{64}$/;
export function validTrialConfig(c){return c?.v===1&&typeof c.on==='boolean'&&hash.test(c.r)&&Array.isArray(c.a)&&c.a.length===3&&c.a.every(a=>hash.test(a?.[0])&&Number.isSafeInteger(a[1])&&a[1]>0);}
export function trialResourcePath(c,record){return TRIAL_PREFIX+c.r+'/'+record.name.replace('.','.'+record.sha256+'.');}
export function renderTrialHead(c){const path=i=>trialResourcePath(c,{name:names[i],sha256:c.a[i][0]});return `<link rel="stylesheet" href="${path(1)}" data-zplay-requested82-pair-style><script type="module" id="zplay-requested82-pair-loader" data-manifest-url="${path(2)}" src="${path(0)}"></script>`;}
export function createFirstPairWorker(previous,c,Rewriter=globalThis.HTMLRewriter){
  if(typeof previous?.fetch!=='function'||!validTrialConfig(c))throw Error('FIRST_PAIR_CONFIG_INVALID');
  const base=TRIAL_PREFIX+c.r+'/',paths=c.a.map((a,i)=>trialResourcePath(c,{name:names[i],sha256:a[0]}));
  const reply=(body,status,headers={})=>new Response(body,{status,headers:{'Cache-Control':'no-store',...headers}});
  return {...previous,async fetch(request,env,ctx){
    if(!c.on)return previous.fetch(request,env,ctx);const path=new URL(request.url).pathname;
    if(path.startsWith(base)){
      if(!['GET','HEAD'].includes(request.method))return reply(null,405,{Allow:'GET, HEAD'});
      const i=paths.indexOf(path);if(i<0)return reply(null,404);
      let body;try{body=await env.SSG_OFFICIAL_REFERENCES.get(TRIAL_KV_PREFIX+c.a[i][0]+'/'+names[i],{type:'arrayBuffer'});}catch{}
      if(!(body instanceof ArrayBuffer)||body.byteLength!==c.a[i][1])return reply(null,503);
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),n=>n.toString(16).padStart(2,'0')).join('');
      if(digest!==c.a[i][0])return reply(null,503);
      return reply(request.method==='HEAD'?null:body,200,{'Content-Type':types[i],'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff',ETag:'"'+digest+'"'});
    }
    const response=await previous.fetch(request,env,ctx);
    if(path!=='/'||request.method!=='GET'||response.status!==200||!/^text\/html\b/i.test(response.headers.get('Content-Type')||'')||typeof Rewriter!=='function')return response;
    const headers=new Headers(response.headers);for(const name of ['content-length','etag','content-md5','last-modified'])headers.delete(name);
    headers.set('Cache-Control','no-store');headers.set('X-Zplay-First-Pair',c.r);
    const rewriter=new Rewriter();for(const selector of ['script#zplay-new90-loader','link[data-zplay-new90-style]','#zplay-requested90','script#zplay-requested82-pair-loader','link[data-zplay-requested82-pair-style]'])rewriter.on(selector,{element(el){el.remove();}});
    rewriter.on('head',{element(el){el.append(renderTrialHead(c),{html:true});}});
    return rewriter.transform(new Response(response.body,{headers}));
  }};
}
