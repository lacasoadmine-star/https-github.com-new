import {LIBRARY_PREFIX} from './remaining20-ice-audio-index-r9.mjs';
// Keep the existing library's startup budget: load this immutable catalogue
// only after a request enters the new namespace. The runtime caches modules.
const assets=()=>import('./remaining20-ice-audio-assets-r9.mjs').then(m=>m.ASSETS);
export function installIceAudioLibrary(previous){
 if(typeof previous?.fetch!=='function')throw Error('EXISTING_LIBRARY_REQUIRED');
 return {...previous,async fetch(request,...args){
  const p=new URL(request.url).pathname;
  if(!p.startsWith(LIBRARY_PREFIX))return previous.fetch(request,...args);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
  const inventory=await assets(),name=p.slice(LIBRARY_PREFIX.length),a=Object.hasOwn(inventory,name)?inventory[name]:null;
  if(!a)return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  const headers=new Headers({'content-type':a.type,'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff',etag:'"'+a.sha256+'"'});
  if(request.headers.get('if-none-match')===headers.get('etag'))return new Response(null,{status:304,headers});
  headers.set('content-length',String(a.bytes));
  const body=request.method==='HEAD'?null:a.encoding==='base64'?Uint8Array.from(atob(a.body),c=>c.charCodeAt(0)):a.body;
  return new Response(body,{headers});
 }};
}
