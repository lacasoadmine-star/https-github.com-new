import {OLDER_NEW_PATHS,ZOOM_PREFIX,VIEWPORT_CONTENT} from './older-new-zoom-policy-r1.mjs';
import {OLDER_ZOOM_ASSETS} from './older-new-zoom-assets-r1.mjs';
const selected=new Set(OLDER_NEW_PATHS);
const limit=131072;
async function bounded(stream){
 const reader=stream?.getReader();if(!reader)return null;
 const parts=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){void reader.cancel();return null;}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
async function htmlText(response){
 if(Number(response.headers.get('content-length')||0)>limit)return null;
 const encoding=response.headers.get('content-encoding');if(encoding&&!['identity','gzip'].includes(encoding))return null;
 let bytes=await bounded(response.clone().body);if(!bytes)return null;
 if(encoding==='gzip'&&bytes[0]===31&&bytes[1]===139)bytes=await bounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')));
 return bytes?new TextDecoder().decode(bytes):null;
}
function recognizedHtml(html,pathname){
 if(pathname==='/games/multihot40_native')return html.includes('id="machine"')&&['/native-library/expansion/r1/multihot40-app.mjs','/native-library/existing-new/20261110-etb1-40000-r1/multihot40/multihot40-app.mjs'].some(script=>html.includes(script));
 if(pathname==='/games/balloon_native')return html.includes('id="holdButton"')&&['/native-library/balloon/v1/balloon.js','/native-library/existing-new/20261110-etb1-40000-r1/balloon/balloon.js'].some(script=>html.includes(script));
 if(pathname==='/games/jetx_native')return html.includes('id="jetx-app"')&&html.includes('<base href="/observed/jetx/">')&&html.includes('src="./client.mjs"');
 return false;
}
export function patchOlderNewGameHtml(html,pathname){
 if(html.includes('data-zplay-older-zoom-script')||!recognizedHtml(html,pathname)||!/<\/head\s*>/i.test(html))return html;
 const viewport=/<meta\b(?=[^>]*\bname\s*=\s*["']viewport["'])[^>]*>/i;
 const meta='<meta name="viewport" content="'+VIEWPORT_CONTENT+'">';
 const next=viewport.test(html)?html.replace(viewport,meta):html.replace(/<head\b[^>]*>/i,match=>match+meta);
 // The blocking script installs gesture handling before any game module runs.
 const insert='<link rel="stylesheet" href="'+ZOOM_PREFIX+'zoom.css">\n<script data-zplay-older-zoom-script src="'+ZOOM_PREFIX+'zoom.js"></script>\n';
 return next.replace(/<meta\b(?=[^>]*\bname\s*=\s*["']viewport["'])[^>]*>/i,match=>match+'\n'+insert);
}
export function installOlderNewZoomWorker(previous){
 if(typeof previous?.fetch!=='function')throw Error('EXISTING_PLAYER_REQUIRED');
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url);
  if(url.pathname.startsWith(ZOOM_PREFIX)){
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
   const name=url.pathname.slice(ZOOM_PREFIX.length);
   if(!Object.hasOwn(OLDER_ZOOM_ASSETS,name))return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
   const asset=OLDER_ZOOM_ASSETS[name];
   const headers={'content-type':asset.type,'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff','etag':'"'+asset.sha256+'"'};
   if(request.headers.get('if-none-match')===headers.etag)return new Response(null,{status:304,headers});
   headers['content-length']=String(asset.bytes);
   return new Response(request.method==='HEAD'?null:asset.body,{status:200,headers});
  }
  const response=await previous.fetch(request,env,ctx);
  if(!selected.has(url.pathname)||request.method!=='GET'||response.status!==200||!response.headers.get('content-type')?.includes('text/html'))return response;
  let html;try{html=await htmlText(response);}catch{return response;}
  if(!html)return response;
  const next=patchOlderNewGameHtml(html,url.pathname);if(next===html)return response;
  const headers=new Headers(response.headers);for(const key of ['content-encoding','content-length','etag','last-modified'])headers.delete(key);
  headers.set('cache-control','no-store');
  return new Response(next,{status:response.status,statusText:response.statusText,headers});
 }};
}
