import {OVERLAY_NAMES} from './remaining20-ice-controls-index-r4.mjs';
const overlay=new Set(OVERLAY_NAMES);

export const PREFIX='/native-library/remaining20/20261109-ice-controls-r4/';
const PREVIOUS='/native-library/remaining20/20261109-r5-seven-review1/';
const OLD_ART='/native-library/remaining20/reference-art/r1/smartsoft/assets/';
const GAMES=new Set(['/demo/games/burningice10_native','/demo/games/burningice40_native']);
const reply=(text,status)=>new Response(text,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});

async function bounded(stream){
 const reader=stream?.getReader();if(!reader)return null;
 const parts=[];let length=0;
 try{for(;;){const{done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>131072){void reader.cancel();return null;}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}return bytes;
}
async function htmlText(response){
 if(Number(response.headers.get('content-length')||0)>131072)return null;
 const encoding=response.headers.get('content-encoding');if(encoding&&!['identity','gzip'].includes(encoding))return null;
 let bytes=await bounded(response.clone().body);if(!bytes)return null;
 if(encoding==='gzip'&&bytes[0]===31&&bytes[1]===139)bytes=await bounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')));
 return bytes?new TextDecoder().decode(bytes):null;
}

export function installIceControls(previous){
 if(typeof previous?.fetch!=='function')throw Error('EXISTING_PLAYER_REQUIRED');
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url);
  if(url.pathname.startsWith(PREFIX)){
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
   const name=url.pathname.slice(PREFIX.length);
   if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.includes('..')||name.startsWith('/'))return reply('Not found',404);
   if(overlay.has(name)){
    if(typeof env.EXPANSION100?.fetch!=='function')return reply('Assets unavailable',503);
    const headers=new Headers();for(const key of ['accept','if-none-match'])if(request.headers.has(key))headers.set(key,request.headers.get(key));
    const response=await env.EXPANSION100.fetch(new Request(new URL('/v2/remaining20/client/ice-controls-r4/'+name,url.origin),{method:request.method,headers,redirect:'manual'}));
    if(response.status>=300&&response.status<400&&response.status!==304)return reply('Assets unavailable',503);
    const resultHeaders=new Headers(response.headers);resultHeaders.delete('set-cookie');
    return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers:resultHeaders});
   }
   if(name.startsWith('art/')){
    if(!/^[a-f0-9]{64}\.[a-z0-9]+$/.test(name.slice(4)))return reply('Not found',404);
    url.pathname=OLD_ART+name.slice(4);
   }else url.pathname=PREVIOUS+name;
   return previous.fetch(new Request(url,request),env,ctx);
  }
  const response=await previous.fetch(request,env,ctx);
  if(!GAMES.has(url.pathname)||request.method!=='GET'||response.status!==200||!response.headers.get('content-type')?.includes('text/html'))return response;
  let html;try{html=await htmlText(response);}catch{return response;}
  if(!html?.includes(PREVIOUS+'app.mjs'))return response;
  const headers=new Headers(response.headers);for(const key of ['content-encoding','content-length','etag','last-modified'])headers.delete(key);headers.set('cache-control','no-store');
  return new Response(html.replaceAll(PREVIOUS,PREFIX),{status:response.status,statusText:response.statusText,headers});
 }};
}
