import {PREFIX,LIBRARY_PREFIX,SHARED} from './remaining20-ice-audio-index-r9.mjs';
const shared=new Set(SHARED);
const old={demo:'/native-library/remaining20/20261110-new-release-r8/ice/',cash:'/native-library/remaining20/20261110-ice-wallet-entry-r8/'};
const pages=new Map(['burningice10_native','burningice40_native'].flatMap(id=>[['/demo/games/'+id,'demo'],['/games/'+id,'cash']]));
const fail=(code=503)=>new Response('Game resources unavailable',{status:code,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
async function bounded(stream){
 const reader=stream?.getReader();if(!reader)return null;let n=0;const parts=[];
 try{for(;;){const{value,done}=await reader.read();if(done)break;n+=value.byteLength;if(n>131072){void reader.cancel().catch(()=>{});return null;}parts.push(value);}}finally{reader.releaseLock();}
 const b=new Uint8Array(n);let offset=0;for(const part of parts){b.set(part,offset);offset+=part.byteLength;}return b;
}
async function html(response){
 if(Number(response.headers.get('content-length')||0)>131072)return null;
 const encoding=response.headers.get('content-encoding');if(encoding&&!['gzip','identity'].includes(encoding))return null;
 let b=await bounded(response.clone().body);if(!b)return null;
 if(encoding==='gzip'&&b[0]===31&&b[1]===139)b=await bounded(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip')));
 return b?new TextDecoder().decode(b):null;
}
export function installIceAudio(previous){
 if(typeof previous?.fetch!=='function')throw Error('EXISTING_PLAYER_REQUIRED');
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url),p=url.pathname;
  if(p.startsWith(PREFIX)){
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
   const match=p.slice(PREFIX.length).match(/^(demo|cash)\/([a-zA-Z0-9_./-]+)$/);if(!match||match[2].includes('..')||match[2].startsWith('/'))return fail(404);
   const[,mode,name]=match,owned=shared.has(name)||name==='games.json',headers=new Headers();
   for(const k of ['accept','if-none-match'])if(request.headers.has(k))headers.set(k,request.headers.get(k));
   url.search='';url.pathname=owned?LIBRARY_PREFIX+(shared.has(name)?'shared/':mode+'/')+name:old[mode]+name;
   const next=new Request(url,{method:request.method,headers,redirect:'manual',signal:request.signal});
   if(!owned)return previous.fetch(next,env,ctx);
   if(typeof env.EXPANSION100?.fetch!=='function')return fail();
   let r;try{r=await env.EXPANSION100.fetch(next);}catch{return fail();}
   if(r.status>=300&&r.status<400&&r.status!==304)return fail();
   const out=new Headers(r.headers);out.delete('set-cookie');out.set('x-content-type-options','nosniff');
   return new Response(request.method==='HEAD'?null:r.body,{status:r.status,statusText:r.statusText,headers:out});
  }
  const r=await previous.fetch(request,env,ctx),mode=pages.get(p);
  if(!mode||request.method!=='GET'||r.status!==200||!r.headers.get('content-type')?.includes('text/html'))return r;
  let body;try{body=await html(r);}catch{return r;}
  if(!body?.includes(old[mode]+'app.mjs'))return r;
  const updated=body.replaceAll(old[mode],PREFIX+mode+'/'),headers=new Headers(r.headers);
  for(const k of ['content-encoding','content-length','etag','last-modified'])headers.delete(k);headers.set('cache-control','no-store');
  return new Response(updated,{status:r.status,statusText:r.statusText,headers});
 }};
}
