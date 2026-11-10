import {PREFIX,LIBRARY_PREFIX,GROUPS,PAGES} from './remaining20-accepted-controls-index-r12.mjs';
const fail=(status=503)=>new Response('Game resources unavailable',{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
async function bounded(stream){
 const reader=stream?.getReader();if(!reader)return null;let length=0;const parts=[];
 try{for(;;){const{value,done}=await reader.read();if(done)break;length+=value.length;if(length>131072){void reader.cancel().catch(()=>{});return null;}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
async function html(response){
 if(Number(response.headers.get('content-length')||0)>131072)return null;
 const encoding=response.headers.get('content-encoding');if(encoding&&!['gzip','identity'].includes(encoding))return null;
 let bytes=await bounded(response.clone().body);if(!bytes)return null;
 if(encoding==='gzip'&&bytes[0]===31&&bytes[1]===139)bytes=await bounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')));
 return bytes?new TextDecoder().decode(bytes):null;
}
export function installAcceptedControls(previous){
 if(typeof previous?.fetch!=='function')throw Error('EXISTING_PLAYER_REQUIRED');
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url),p=url.pathname;
  if(p.startsWith(PREFIX)){
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
   const match=p.slice(PREFIX.length).match(/^([a-f0-9]{16})\/([a-zA-Z0-9_./-]+)$/);if(!match||match[2].includes('..')||match[2].startsWith('/'))return fail(404);
   const[,group,name]=match,config=Object.hasOwn(GROUPS,group)?GROUPS[group]:null;if(!config)return fail(404);
   const owned=name==='app.mjs'||name==='accepted-controls.mjs',headers=new Headers();
   for(const key of ['accept','if-none-match'])if(request.headers.has(key))headers.set(key,request.headers.get(key));
   url.search='';url.pathname=owned?LIBRARY_PREFIX+(name==='app.mjs'?group+'/':'')+name:config.old+name;
   const next=new Request(url,{method:request.method,headers,redirect:'manual',signal:request.signal});
   if(!owned)return previous.fetch(next,env,ctx);
   if(typeof env.EXPANSION100?.fetch!=='function')return fail();
   let response;try{response=await env.EXPANSION100.fetch(next);}catch{return fail();}
   if(response.status>=300&&response.status<400&&response.status!==304)return fail();
   const out=new Headers(response.headers);out.delete('set-cookie');out.set('x-content-type-options','nosniff');
   return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers:out});
  }
  const response=await previous.fetch(request,env,ctx),group=PAGES[p];
  if(!group||request.method!=='GET'||response.status!==200||!response.headers.get('content-type')?.includes('text/html'))return response;
  let body;try{body=await html(response);}catch{return response;}
  const old=GROUPS[group].old;if(!body?.includes(old+'app.mjs'))return response;
  const headers=new Headers(response.headers);for(const key of ['content-encoding','content-length','etag','last-modified'])headers.delete(key);headers.set('cache-control','no-store');
  return new Response(body.replaceAll(old,PREFIX+group+'/'),{status:response.status,statusText:response.statusText,headers});
 }};
}
