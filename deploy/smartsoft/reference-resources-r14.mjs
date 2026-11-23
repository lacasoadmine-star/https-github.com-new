// Public reference resources only. No wallet or provider wager API.
const PREFIX='/native-library/remaining20/20261110-reference-mobile-r14/';
export const fail=(code,status=503)=>Response.json({error:code},{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export async function bounded(body,limit){
 const reader=body?.getReader();if(!reader)return new Uint8Array();
 const chunks=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){void reader.cancel().catch(()=>{});throw Error('RESOURCE_TOO_LARGE');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}return bytes;
}
export function reply(response,body,method,type,immutable=false){
 const headers=new Headers(response?.headers);for(const key of ['set-cookie','content-length','content-encoding','etag','last-modified'])headers.delete(key);
 headers.set('content-type',type);headers.set('x-content-type-options','nosniff');headers.set('cache-control',immutable?'public, max-age=31536000, immutable':'no-store');
 return new Response(method==='HEAD'?null:body,{status:response?.status||200,headers});
}
// An allowlisted public image is mirrored on our existing origin. Exact byte
// size and SHA-256 are checked before it reaches the browser or public cache.
export async function verifiedAsset(request,asset,{fetchImpl=fetch,cache=globalThis.caches?.default,ctx}={}){
 if(!asset||!/^https:\/\/static\.ssg-public\.com\//.test(asset.url)||!Number.isSafeInteger(asset.bytes)||asset.bytes<=0||asset.bytes>8388608||!/^[a-f0-9]{64}$/.test(asset.sha256))return fail('ASSET_NOT_FOUND',404);
 const key=new Request(new URL(PREFIX+'verified-assets/'+asset.sha256,new URL(request.url).origin));
 const cached=await cache?.match(key);if(cached)return reply(cached,cached.body,request.method,asset.type,true);
 // Workers supports manual/follow redirects. Read only a direct 200 response.
 const response=await fetchImpl(asset.url,{method:'GET',redirect:'manual',credentials:'omit',headers:{accept:asset.type}});
 if(response.status!==200)return fail('REFERENCE_ASSET_UNAVAILABLE');
 const bytes=await bounded(response.body,asset.bytes);
 if(bytes.length!==asset.bytes||await digest(bytes)!==asset.sha256)return fail('REFERENCE_ASSET_INTEGRITY_FAILED');
 const result=reply(null,bytes,'GET',asset.type,true);
 if(cache){const saved=cache.put(key,result.clone());if(ctx?.waitUntil)ctx.waitUntil(saved);else await saved;}
 return reply(result,bytes,request.method,asset.type,true);
}

export async function bundledResource(resource,method='GET'){
 let bytes=resource.base64?Uint8Array.from(atob(resource.base64),c=>c.charCodeAt(0)):new TextEncoder().encode(resource.text);
 if(resource.gzip)bytes=await bounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),resource.bytes);
 if(resource.sha256&&(bytes.length!==resource.bytes||await digest(bytes)!==resource.sha256))return fail('LOCAL_RESOURCE_INTEGRITY_FAILED');
 return reply(null,bytes,method,resource.type,true);
}
