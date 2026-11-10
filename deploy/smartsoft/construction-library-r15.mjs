import {constructionQueue,queuePage,LIBRARY_PREFIX} from './construction-queue-r15.mjs';
import {fail,bundledResource,reply,bounded,digest,verifiedAsset} from './reference-resources-r14.mjs';

export function installConstructionLibrary(previous,sources,{fetchImpl=fetch,cache=globalThis.caches?.default}={}){
 if(typeof previous?.fetch!=='function'||!sources?.queue||!sources?.resources)throw Error('EXISTING_LIBRARY_REQUIRED');
 const queue=constructionQueue(sources.queue),byId=new Map(queue.games.map(game=>[game.queueId,game]));
 return {...previous,async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(!url.pathname.startsWith(LIBRARY_PREFIX))return previous.fetch(request,env,ctx);
  if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);
  const name=url.pathname.slice(LIBRARY_PREFIX.length);
  if(name==='games.json'){
   try{return reply(null,JSON.stringify(queuePage(queue,url)),request.method,'application/json; charset=utf-8');}
   catch{return fail('INVALID_QUEUE_QUERY',400);}
  }
  if(Object.hasOwn(sources.resources,name))return bundledResource(sources.resources[name],request.method);
  const background=name.match(/^backgrounds\/([a-f0-9]{64}\.(?:png|jpg))$/);
  if(background&&Object.hasOwn(sources.backgroundAssets||{},background[1]))return verifiedAsset(request,sources.backgroundAssets[background[1]],{fetchImpl,cache,ctx});
  const cover=name.match(/^covers\/([a-z0-9]+:[A-Za-z0-9_-]{1,100})$/);
  if(!cover)return fail('NOT_FOUND',404);
  const game=byId.get(cover[1]),asset=game?.cover;
  // Only downloaded and hash-checked public icons are exposed on our origin.
  if(!asset||!/^[a-f0-9]{64}$/.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<=0||asset.bytes>4194304||!/^image\/(?:png|jpeg|webp|avif)$/.test(asset.type))return fail('COVER_UNAVAILABLE',404);
  const cacheUrl=new URL(url);cacheUrl.pathname=LIBRARY_PREFIX+'verified-covers/'+asset.sha256;cacheUrl.search='';
  const key=new Request(cacheUrl),cached=await cache?.match(key);
  if(cached)return reply(cached,cached.body,request.method,asset.type,true);
  try{
   const response=await fetchImpl(game.officialIcon,{method:'GET',redirect:'manual',credentials:'omit',headers:{accept:asset.type}});
   if(response.status!==200)return fail('COVER_UNAVAILABLE');
   const bytes=await bounded(response.body,asset.bytes);
   if(bytes.length!==asset.bytes||await digest(bytes)!==asset.sha256)return fail('COVER_INTEGRITY_FAILED');
   const result=reply(null,bytes,'GET',asset.type,true);
   if(cache){const saved=cache.put(key,result.clone());if(ctx?.waitUntil)ctx.waitUntil(saved);else await saved;}
   return reply(result,bytes,request.method,asset.type,true);
  }catch{return fail('COVER_UNAVAILABLE');}
 }};
}
