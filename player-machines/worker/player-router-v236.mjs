import {machineAPI,machinePage} from './machine-routes.mjs';
import {sessionGate,decorateSession} from './player-session-v236.mjs';
import {transform,transformPaths,versionModule,versionCSS,updateHTML} from './player-transforms-v236.mjs';
export const PREFIX='/player-v236/';
const mime=path=>path.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8';
const staticPath=p=>/\.(?:m?js|css|webp|png|jpe?g|svg)$/.test(p)&&/^\/(?:assets\/|zplay[^/]*|mh5-video-v1\/|game-repair-v23[45]\/|slots\/(?:css|art)\/)/.test(p);
async function plain(response){const encoding=response.headers.get('Content-Encoding');let body=response.body;if(encoding==='gzip')body=body.pipeThrough(new DecompressionStream('gzip'));else if(encoding&&encoding!=='identity')return null;return new Response(body).text();}
function freshHeaders(response){const h=new Headers(response.headers);for(const k of ['Content-Encoding','Content-Length','ETag','Last-Modified'])h.delete(k);return h;}
function conditional(request,response){if(request.headers.get('If-None-Match')===response.headers.get('ETag')&&response.headers.has('ETag'))return new Response(null,{status:304,headers:response.headers});if(request.method==='HEAD')return new Response(null,{status:response.status,headers:response.headers});return response;}
export function install(previous,assets,config){return async(request,env,ctx)=>{
 const url=new URL(request.url),path=url.pathname,head=request.method==='HEAD';
 if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
 if(['GET','HEAD'].includes(request.method)&&path.startsWith(PREFIX)){
  const a=assets[path.slice(PREFIX.length)];if(!a)return new Response('Not found',{status:404});
  return conditional(request,new Response(a.body,{headers:{'Content-Type':a.type,'Cache-Control':'public, max-age=31536000, immutable','ETag':a.etag,'X-Content-Type-Options':'nosniff','X-Zplay-Release':'236'}}));
 }
 const gate=await sessionGate(request,env,previous,ctx);
 if(gate)return decorateSession(request,gate,env);
 const machineResponse=await machineAPI(request,env,ctx,previous);if(machineResponse)return decorateSession(request,machineResponse,env);
 const page=machinePage(request,config);if(page)return page;
 if(!['GET','HEAD'].includes(request.method)||path.startsWith('/api/'))return decorateSession(request,await previous.fetch(request,env,ctx),env);
 const versioned=url.searchParams.get('pv')==='236'&&staticPath(path),cache=globalThis.caches?.default;
 const key=new Request(url.href,{method:'GET'});
 if(versioned&&cache){const hit=await cache.match(key);if(hit)return conditional(request,hit);}
 const source=path==='/game-repair-v234/audio-core.mjs'?new Response(config.audio,{headers:{'Content-Type':mime(path)}}):await previous.fetch(versioned?new Request(url.href,{headers:{accept:request.headers.get('accept')||'*/*'}}):request,env,ctx);
 if(source.status!==200)return source;
 const type=source.headers.get('Content-Type')||'',isCode=/javascript|text\/css/.test(type),isHTML=type.includes('text/html');
 let response=source;
 if(isCode||isHTML){
  if(head)return new Response(null,{status:source.status,headers:source.headers});
  const text=await plain(source);if(text===null)return source;
  let body=text;
  if(transformPaths.includes(path))body=transform(path,body);
  if(isHTML){const preloads=path==='/slots/game.html'?config.legacy:path==='/play/multi-hot-5-new'||path==='/mh5-video-v1/index.html'?config.native:[];body=updateHTML(body,{presence:PREFIX+config.presence,preloads});}
  else if(type.includes('javascript'))body=versionModule(body);else body=versionCSS(body,url.href);
  const headers=freshHeaders(source);headers.set('Cache-Control','no-store');headers.set('X-Zplay-Release','236');response=new Response(body,{headers});
 }
 if(versioned&&!response.headers.has('Set-Cookie')&&/javascript|text\/css|image\//.test(type)){
  const bytes=await response.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes),hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  const h=new Headers(response.headers);h.set('Cache-Control','public, max-age=31536000, immutable');h.set('ETag','W/"236-'+hash+'"');h.set('X-Content-Type-Options','nosniff');response=new Response(bytes,{headers:h});
  if(cache)ctx?.waitUntil?.(cache.put(key,response.clone()).catch(()=>{}));
 }
 return conditional(request,response);
};}

