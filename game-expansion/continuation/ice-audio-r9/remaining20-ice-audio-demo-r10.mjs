const PREFIX='/native-library/remaining20/20261110-ice-audio-r10/';
const PREVIOUS='/native-library/remaining20/20261110-ice-audio-r9/demo/';
const pages=new Set(['/demo/games/burningice10_native','/demo/games/burningice40_native']);
// The retained createDemoMode deliberately redirects games.json to
// demo-games.json. Preserve that boundary while selecting the newly pinned
// catalogue. All existing r9 URLs remain immutable, including their fallback.
export function installIceAudioDemo(previous){
 if(typeof previous?.fetch!=='function')throw Error('EXISTING_PLAYER_REQUIRED');
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url);
  if(url.pathname.startsWith(PREFIX)){
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
   let name=url.pathname.slice(PREFIX.length);
   if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.includes('..')||name.startsWith('/'))return new Response('Not found',{status:404});
   if(name==='demo-games.json')name='games.json';
   url.pathname=PREVIOUS+name;url.search='';
   const headers=new Headers();for(const key of ['accept','if-none-match'])if(request.headers.has(key))headers.set(key,request.headers.get(key));
   return previous.fetch(new Request(url,{method:request.method,headers,redirect:'manual',signal:request.signal}),env,ctx);
  }
  const response=await previous.fetch(request,env,ctx);
  if(!pages.has(url.pathname)||request.method!=='GET'||response.status!==200||!response.headers.get('content-type')?.includes('text/html'))return response;
  if(response.headers.has('content-encoding')||Number(response.headers.get('content-length')||0)>131072)return response;
  const reader=response.clone().body.getReader();const chunks=[];let length=0;
  try{for(;;){const{value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>131072){void reader.cancel().catch(()=>{});return response;}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  const html=new TextDecoder().decode(bytes);if(!html.includes(PREVIOUS+'app.mjs'))return response;
  const headers=new Headers(response.headers);for(const k of ['content-length','etag','last-modified'])headers.delete(k);headers.set('cache-control','no-store');
  return new Response(html.replaceAll(PREVIOUS,PREFIX),{status:response.status,statusText:response.statusText,headers});
 }};
}
