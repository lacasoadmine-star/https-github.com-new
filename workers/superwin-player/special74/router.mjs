// Add only the new namespace. Every existing game and financial route stays with the retained handler.
const PREFIX='/special-games/';
export const ADDITIVE_DISPOSITION='retain-selected-four-dashboard-games-and-add-independent-special-games';
const headers={'x-content-type-options':'nosniff','referrer-policy':'same-origin'};
export function completeRelease(release){
 return release?.ready===true&&release.legacyDisposition===ADDITIVE_DISPOSITION&&Array.isArray(release.entries)&&release.entries.length===74&&
  release.entries.every(e=>e&&typeof e.id==='string'&&e.id.trim()&&e.ready===true&&typeof e.title==='string'&&e.title.trim()&&typeof e.gamePath==='string'&&e.gamePath.startsWith(PREFIX+'play/')&&typeof e.cover==='string'&&e.cover.startsWith(PREFIX+'assets/'))&&
  new Set(release.entries.map(e=>e.id)).size===74&&
  new Set(release.entries.map(e=>e.gamePath)).size===74;
}
export async function routeSpecial74(request,env,release){
 if(!completeRelease(release))return null;
 const url=new URL(request.url);
 if(!url.pathname.startsWith(PREFIX))return null;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...headers,allow:'GET, HEAD'}});
 if(url.pathname===PREFIX+'catalog.json')return new Response(request.method==='HEAD'?null:JSON.stringify({version:release.version,legacyDisposition:release.legacyDisposition,ready:true,entries:release.entries}),{headers:{...headers,'content-type':'application/json','cache-control':'public,max-age=60'}});
 // Only explicitly packaged new assets are reachable. No provider proxy or dynamic URL fetch.
 const asset=release.assets?.[url.pathname];
 if(!asset)return new Response('Not found',{status:404,headers});
 const responseHeaders={...headers,'content-type':asset.contentType,'cache-control':'public,max-age=0,must-revalidate',etag:'"'+asset.sha256+'"'};
 if(asset.contentType.startsWith('text/html'))responseHeaders['content-security-policy']="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'";
 if(request.headers.get('if-none-match')===responseHeaders.etag)return new Response(null,{status:304,headers:responseHeaders});
 const data=await env.SSG_OFFICIAL_REFERENCES.get(release.storagePrefix+asset.key,{type:'arrayBuffer'});
 if(data===null)return new Response('Asset unavailable',{status:503,headers:{...headers,'cache-control':'no-store'}});
 return new Response(request.method==='HEAD'?null:data,{headers:responseHeaders});
}
export function addSpecial74ToPage(request,response,release){
 if(!completeRelease(release)||!['/','/games','/games/'].includes(new URL(request.url).pathname)||!response.headers.get('content-type')?.includes('text/html'))return response;
 return new HTMLRewriter()
  .on('head',{element(element){element.append('<link rel="stylesheet" href="/special-games/catalog.css"><script type="module" src="/special-games/catalog.mjs"></script>',{html:true});}}).transform(response);
}
