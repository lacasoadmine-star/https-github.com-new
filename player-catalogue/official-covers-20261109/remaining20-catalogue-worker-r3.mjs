import {ASSETS} from './remaining20-catalogue-assets-r3.mjs';
export const PREFIX='/remaining20-catalogue/20261109-r3/';
export const MARKER='remaining20-catalogue-assets-r3';
const MAX_HTML_BYTES=131072;
const PREVIOUS_ADDITION='<link id="remaining20-credits-lobby-assets-r2" rel="stylesheet" href="/remaining20-credits-lobby/20261109-r2/lobby.css"><script type="module" src="/remaining20-credits-lobby/20261109-r2/lobby.mjs"></script>';

async function boundedBytes(stream){
 const reader=stream?.getReader();if(!reader)return null;
 const parts=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_HTML_BYTES){void reader.cancel();return null;}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let at=0;for(const part of parts){bytes.set(part,at);at+=part.byteLength;}
 return bytes;
}
async function htmlText(response){
 const declared=Number(response.headers.get('content-length')||0);
 if(declared>MAX_HTML_BYTES)return null;
 const encoding=response.headers.get('content-encoding');
 if(encoding&&encoding!=='identity'&&encoding!=='gzip')return null;
 let bytes=await boundedBytes(response.clone().body);if(!bytes)return null;
 if(encoding==='gzip'&&bytes[0]===31&&bytes[1]===139)bytes=await boundedBytes(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')));
 return bytes?new TextDecoder().decode(bytes):null;
}
export function installCreditsLobby(previous){
 if(typeof previous?.fetch!=='function')throw Error('EXISTING_PLAYER_REQUIRED');
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const path=new URL(request.url).pathname;
  if(path.startsWith(PREFIX)){
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
   const name=path.slice(PREFIX.length);if(!Object.hasOwn(ASSETS,name))return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
   const asset=ASSETS[name],headers=new Headers({'content-type':asset.type,'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff','etag':'"'+asset.sha256+'"','content-length':String(asset.bytes)});
   if(request.headers.get('if-none-match')===headers.get('etag')){headers.delete('content-length');return new Response(null,{status:304,headers});}
   return new Response(request.method==='HEAD'?null:asset.encoding==='base64'?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body,{headers});
  }
  const response=await previous.fetch(request,env,ctx);
  if(path!=='/'||request.method!=='GET'||response.status!==200||!response.headers.get('content-type')?.includes('text/html'))return response;
  let source;try{source=await htmlText(response);}catch{return response;}
  if(!source?.includes('zplay-portal-r9-css')||source.includes(MARKER)||!source.includes('</head>'))return response;
  const addition='<link id="'+MARKER+'" rel="stylesheet" href="'+PREFIX+'lobby.css"><script type="module" src="'+PREFIX+'lobby.mjs"></script>';
  const headers=new Headers(response.headers);for(const key of ['content-encoding','content-length','etag','last-modified'])headers.delete(key);headers.set('cache-control','no-store');
  // Replace the exact earlier adapter pair so both browser versions cannot race.
  if(source.includes('remaining20-credits-lobby-assets-r2')&&!source.includes(PREVIOUS_ADDITION))return response;
  const body=source.includes(PREVIOUS_ADDITION)?source.replace(PREVIOUS_ADDITION,addition):source.replace('</head>',addition+'</head>');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
 }};
}

