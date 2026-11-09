import {COVER_PREFIX,patchOfficialNewCoversHtml} from './official-new-covers-html-r1.mjs';
const LIBRARY_PREFIX='/v2/remaining20/client/official-new-covers-r1/';
const NAMES=new Set(['covers.mjs','covers.css','balloon_native.webp','jetx_native.webp']),LIMIT=131072;
const fail=(status=503)=>new Response('Game resources unavailable',{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
async function bounded(stream){const r=stream?.getReader();if(!r)return null;const parts=[];let size=0;try{for(;;){const{done,value}=await r.read();if(done)break;size+=value.length;if(size>LIMIT){void r.cancel();return null;}parts.push(value);}}finally{r.releaseLock();}const out=new Uint8Array(size);let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;}
async function readHtml(response){if(Number(response.headers.get('content-length')||0)>LIMIT)return null;const encoding=response.headers.get('content-encoding');if(encoding&&!['identity','gzip'].includes(encoding))return null;let b=await bounded(response.clone().body);if(!b)return null;if(encoding==='gzip'&&b[0]===31&&b[1]===139)b=await bounded(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip')));return b?new TextDecoder().decode(b):null;}
export function installOfficialNewCoversWorker(previous){
 if(typeof previous?.fetch!=='function')throw Error('EXISTING_PLAYER_REQUIRED');
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url);
  if(url.pathname.startsWith(COVER_PREFIX)){
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
   const name=url.pathname.slice(COVER_PREFIX.length);if(!NAMES.has(name))return fail(404);
   if(typeof env.EXPANSION100?.fetch!=='function')return fail();
   const headers=new Headers();for(const key of ['accept','if-none-match'])if(request.headers.has(key))headers.set(key,request.headers.get(key));
   let response;try{response=await env.EXPANSION100.fetch(new Request(new URL(LIBRARY_PREFIX+name,url.origin),{method:request.method,headers,redirect:'manual',signal:request.signal}));}catch{return fail();}
   if(response.status>=300&&response.status<400&&response.status!==304)return fail();
   const out=new Headers(response.headers);out.delete('set-cookie');return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers:out});
  }
  const response=await previous.fetch(request,env,ctx);
  if(!['/','/games','/games/'].includes(url.pathname)||request.method!=='GET'||response.status!==200||!response.headers.get('content-type')?.includes('text/html'))return response;
  let html;try{html=await readHtml(response);}catch{return response;}if(!html)return response;
  const next=patchOfficialNewCoversHtml(html,url.pathname);if(next===html)return response;
  const headers=new Headers(response.headers);for(const key of ['content-encoding','content-length','etag','last-modified'])headers.delete(key);headers.set('cache-control','no-store');
  return new Response(next,{status:response.status,statusText:response.statusText,headers});
 }};
}
