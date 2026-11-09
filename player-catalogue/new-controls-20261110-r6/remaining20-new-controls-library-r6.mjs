import {ASSETS} from './remaining20-new-controls-assets-r6.mjs';
const PREFIX='/v2/remaining20/client/new-controls-r6/';
export function installNewControlsR6Assets(previous){
 return {...previous,async fetch(request,env,ctx){
  const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX))return previous.fetch(request,env,ctx);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
  const name=url.pathname.slice(PREFIX.length);if(!Object.hasOwn(ASSETS,name))return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  const item=ASSETS[name],headers=new Headers({'content-type':item.type,'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff','etag':'"'+item.sha256+'"','x-zplay-remaining-sha256':item.sha256});
  if(request.headers.get('if-none-match')===headers.get('etag'))return new Response(null,{status:304,headers});
  headers.set('content-length',String(item.bytes));
  return new Response(request.method==='HEAD'?null:item.body,{headers});
 }};
}
