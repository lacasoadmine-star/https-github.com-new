import {validDemoURL} from './public-demo-catalog.mjs';
const decode=value=>value.replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([a-f\d]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&quot;/g,'"');
async function boundedText(response){
 const reader=response.body?.getReader();if(!reader)throw Error('DEMO_PROVIDER_UNAVAILABLE');
 const decoder=new TextDecoder();let size=0,text='';
 try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>1048576){await reader.cancel();throw Error('DEMO_PROVIDER_RESPONSE_TOO_LARGE');}text+=decoder.decode(r.value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}
}
export async function resolveDemoLauncher(game,{fetcher=fetch,cache=globalThis.caches?.default}={}){
 const known=validDemoURL(game.launch_url);if(known)return known.href;
 const source=new URL(game.source_url);
 if(game.provider_key!=='pragmatic'||source.origin!=='https://www.pragmaticplay.com'||!/^\/en\/games\/[a-z\d-]+\/$/.test(source.pathname)||source.search||source.hash)throw Error('DEMO_LAUNCH_UNAVAILABLE');
 const key=new Request('https://superwin-player.apdiy61.workers.dev/_catalog-cache/20261104/'+game.id);
 if(cache){const hit=await cache.match(key);if(hit){const u=validDemoURL(await hit.text());if(u?.origin==='https://demogamesfree.pragmaticplay.net')return u.href;}}
 let target=source;
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);
 try{
  let response;
  for(let redirects=0;redirects<3;redirects++){
   response=await fetcher(target.href,{headers:{accept:'text/html'},redirect:'manual',signal:abort.signal});
   if(![301,302,303,307,308].includes(response.status))break;
   const location=response.headers.get('location');await response.body?.cancel();if(!location)throw Error('DEMO_PROVIDER_UNAVAILABLE');
   target=new URL(location,target);if(target.origin!==source.origin||!/^\/en\/games\/[a-z\d-]+\/$/.test(target.pathname))throw Error('DEMO_PROVIDER_REDIRECT_REJECTED');
  }
  if(!response?.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error('DEMO_PROVIDER_UNAVAILABLE');
  const html=await boundedText(response),raw=html.match(/<iframe\b[^>]*\bdata-game-src\s*=\s*["']([^"']+)["']/i)?.[1];
  const launcher=raw&&validDemoURL(decode(raw));if(!launcher||launcher.origin!=='https://demogamesfree.pragmaticplay.net')throw Error('DEMO_LAUNCH_UNAVAILABLE');
  if(cache)await cache.put(key,new Response(launcher.href,{headers:{'cache-control':'public,max-age=21600','content-type':'text/plain'}}));
  return launcher.href;
 }finally{clearTimeout(timer);}
}
