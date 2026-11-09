import {OFFICIAL_COVER_ASSETS} from './official-new-covers-assets-r1.mjs';
const PREFIX='/v2/remaining20/client/official-new-covers-r1/';
export function installOfficialNewCoverAssets(previous){
 if(typeof previous?.fetch!=='function')throw Error('EXISTING_LIBRARY_REQUIRED');
 return {...previous,async fetch(request,env,ctx){
  const path=new URL(request.url).pathname;if(!path.startsWith(PREFIX))return previous.fetch(request,env,ctx);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
  const name=path.slice(PREFIX.length),asset=Object.hasOwn(OFFICIAL_COVER_ASSETS,name)?OFFICIAL_COVER_ASSETS[name]:null;
  if(!asset)return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  const headers=new Headers({'content-type':asset.type,'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff',etag:'"'+asset.sha256+'"'});
  if(request.headers.get('if-none-match')===headers.get('etag'))return new Response(null,{status:304,headers});
  headers.set('content-length',String(asset.bytes));
  const body=request.method==='HEAD'?null:asset.encoding==='base64'?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body;
  return new Response(body,{headers});
 }};
}
