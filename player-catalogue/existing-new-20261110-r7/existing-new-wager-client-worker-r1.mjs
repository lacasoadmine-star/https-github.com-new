import {PREFIX,LIBRARY_PREFIX,FAMILIES,ASSET_NAMES,OLD_BALLOON_SELECT,NEW_BALLOON_SELECT} from './existing-new-wager-client-index-r1.mjs';
const overlays=new Set(ASSET_NAMES),LIMIT=131072;
const fail=(status,message)=>new Response(message,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
async function bounded(stream){
 const reader=stream?.getReader();if(!reader)return null;const parts=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>LIMIT){void reader.cancel();return null;}parts.push(value);}}finally{reader.releaseLock();}
 const result=new Uint8Array(length);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.byteLength;}return result;
}
async function htmlText(response){
 if(Number(response.headers.get('content-length')||0)>LIMIT)return null;
 const encoding=response.headers.get('content-encoding');if(encoding&&!['identity','gzip'].includes(encoding))return null;
 let bytes=await bounded(response.clone().body);if(!bytes)return null;
 if(encoding==='gzip'&&bytes[0]===31&&bytes[1]===139)bytes=await bounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')));
 return bytes?new TextDecoder().decode(bytes):null;
}
export function patchExistingNewWagerHtml(html,path){
 const family=FAMILIES.find(item=>item.path===path);if(!family||typeof html!=='string')return html;
 if(family.key==='balloon'){
  if(!html.includes(family.previous+'balloon.js')||html.split(OLD_BALLOON_SELECT).length!==2)return html;
  return html.replace(OLD_BALLOON_SELECT,NEW_BALLOON_SELECT).replaceAll(family.previous,PREFIX+family.key+'/');
 }
 if(!html.includes('id="machine"')||!html.includes(family.previous+'multihot40-app.mjs'))return html;
 return html.replaceAll(family.previous,PREFIX+family.key+'/');
}
export function installExistingNewWagerClient(previous){
 if(typeof previous?.fetch!=='function')throw Error('EXISTING_PLAYER_REQUIRED');
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url);
  if(url.pathname.startsWith(PREFIX)){
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
   const name=url.pathname.slice(PREFIX.length);
   if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.includes('..')||name.startsWith('/'))return fail(404,'Not found');
   if(overlays.has(name)){
    if(typeof env.EXPANSION100?.fetch!=='function')return fail(503,'Assets unavailable');
    const headers=new Headers();for(const key of ['accept','if-none-match'])if(request.headers.has(key))headers.set(key,request.headers.get(key));
    const response=await env.EXPANSION100.fetch(new Request(new URL(LIBRARY_PREFIX+name,url.origin),{method:request.method,headers,redirect:'manual'}));
    if(response.status>=300&&response.status<400&&response.status!==304)return fail(503,'Assets unavailable');
    const returned=new Headers(response.headers);returned.delete('set-cookie');
    return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers:returned});
   }
   const family=FAMILIES.find(item=>name.startsWith(item.key+'/'));if(!family)return fail(404,'Not found');
   url.pathname=family.previous+name.slice(family.key.length+1);
   return previous.fetch(new Request(url,request),env,ctx);
  }
  const response=await previous.fetch(request,env,ctx);
  if(!FAMILIES.some(item=>item.path===url.pathname)||request.method!=='GET'||response.status!==200||!response.headers.get('content-type')?.includes('text/html'))return response;
  let html;try{html=await htmlText(response);}catch{return response;}
  const next=patchExistingNewWagerHtml(html,url.pathname);if(!html||next===html)return response;
  const headers=new Headers(response.headers);for(const key of ['content-encoding','content-length','etag','last-modified'])headers.delete(key);headers.set('cache-control','no-store');
  return new Response(next,{status:response.status,statusText:response.statusText,headers});
 }};
}
