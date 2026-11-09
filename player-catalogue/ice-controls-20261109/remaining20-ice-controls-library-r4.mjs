import {ASSETS} from './remaining20-ice-controls-assets-r4.mjs';
export const PREFIX='/v2/remaining20/client/ice-controls-r4/';
export function installIceAssets(previous){
 return {...previous,async fetch(request,env,ctx){
  const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX))return previous.fetch(request,env,ctx);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
  const name=url.pathname.slice(PREFIX.length);if(!Object.hasOwn(ASSETS,name))return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  const asset=ASSETS[name],headers=new Headers({'content-type':asset.type,'content-length':String(asset.bytes),'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff','etag':'"'+asset.sha256+'"','x-zplay-remaining-sha256':asset.sha256});
  if(request.headers.get('if-none-match')===headers.get('etag')){headers.delete('content-length');return new Response(null,{status:304,headers});}
  return new Response(request.method==='HEAD'?null:asset.encoding==='base64'?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body,{headers});
 }};
}
