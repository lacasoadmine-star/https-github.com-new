export const PREFIX='/mh5-video-v1/';
export const GAME_ROUTE='/play/multi-hot-5-new';
export function assetReply(asset,head){return new Response(head?null:asset.encoding==='base64'?Uint8Array.from(atob(asset.content),c=>c.charCodeAt(0)):asset.content,{headers:{'Content-Type':asset.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-MH5-Source':'42726.mp4'}});}
export function install(previous,assets){return async(request,env,ctx)=>{
 const url=new URL(request.url),head=request.method==='HEAD';
 if(request.method!=='GET'&&!head)return previous.fetch(request,env,ctx);
 if(url.pathname.startsWith(PREFIX)){const key=url.pathname.substring(PREFIX.length);return Object.hasOwn(assets,key)?assetReply(assets[key],head):new Response('Not found',{status:404});}
 if(url.pathname===GAME_ROUTE){const r=assetReply(assets['index.html'],head);r.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");return r;}
 return previous.fetch(request,env,ctx);
};}
