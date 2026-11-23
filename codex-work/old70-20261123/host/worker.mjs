export const GAME_PATH='/native-ui/old70/multihot40/';
const CSP="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'none'";
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export function createOld70Worker(previous,{revision,files,media}={}) {
 if(typeof previous?.fetch!=='function'||!/^[a-f0-9]{24}$/.test(revision||'')||!files||!media)throw Error('OLD70_RELEASE_INVALID');
 const safeFiles=new Map(Object.entries(files)),safeMedia=new Map(Object.entries(media));
 const descriptors=Object.getOwnPropertyDescriptors(previous);
 descriptors.fetch={configurable:true,enumerable:true,writable:true,value:async function(request,env,ctx){
  const url=new URL(request.url),path=url.pathname;
  if(path!==GAME_PATH.slice(0,-1)&&!path.startsWith(GAME_PATH))return previous.fetch.call(previous,request,env,ctx);
  const common={'x-content-type-options':'nosniff','referrer-policy':'same-origin','x-zplay-old70-release':revision,'x-zplay-mode':'PRACTICE'};
  const result=(body,status=200,extra={})=>new Response(request.method==='HEAD'?null:body,{status,headers:{...common,'cache-control':'no-store',...extra}});
  if(!['GET','HEAD'].includes(request.method))return result('Method not allowed',405,{allow:'GET, HEAD'});
  if(path===GAME_PATH.slice(0,-1))return result(null,308,{location:GAME_PATH+url.search});
  const file=path.slice(GAME_PATH.length)||'index.html';
  if(safeFiles.has(file)){
   const source=safeFiles.get(file),type=file.endsWith('.mjs')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.json')?'application/json; charset=utf-8':'text/html; charset=utf-8';
   return result(source,200,{'content-type':type,...(file==='index.html'?{'content-security-policy':CSP,'permissions-policy':'camera=(), microphone=(), geolocation=()'}:{})});
  }
  const pin=safeMedia.get(file);
  if(!pin)return result('Game resource not found',404,{'content-type':'text/plain; charset=utf-8'});
  // Only release-pinned public artwork/audio keys are addressable, never arbitrary KV paths.
  if(!env?.OLD70_ART?.get)return result('Game resource unavailable',503);
  try{
   const value=await env.OLD70_ART.get(pin.key,'arrayBuffer');
   if(!(value instanceof ArrayBuffer)||value.byteLength!==pin.bytes||
    hex(new Uint8Array(await crypto.subtle.digest('SHA-256',value)))!==pin.sha256)throw Error('OLD70_ART_INTEGRITY');
   return result(value,200,{'content-type':pin.type,'cache-control':'public, max-age=31536000, immutable'});
  }catch{return result('Game resource unavailable',503,{'content-type':'text/plain; charset=utf-8'});}
 }};
 return Object.create(Object.getPrototypeOf(previous),descriptors);
}
