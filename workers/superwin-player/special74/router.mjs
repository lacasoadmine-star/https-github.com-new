// Called before the retained player handler. An incomplete release never retires a route.
const PREFIX='/special-games/';
export const REPLACEMENT_DISPOSITION='replace-existing-game-presentations-after-complete-74-release';
// Grounded in new74/router.mjs and the deployed native-game-entry-r23.mjs aliases
// observed on player version b286069d-6c8e-427a-be61-9a26b515206b. Do not broaden
// this to /games/* or /api/*: the games index and retained financial APIs are live.
const retiredGamePaths=new Set([
 '/games/safari-simba','/games/safarisimba_fresh','/games/fresh_safarisimba',
 '/games/multihotwildways_native','/games/multihot5wild_native',
 '/games/multihot5superwilds_native','/games/multihot100_native',
 '/games/burningice_native','/games/burningice10_native','/games/burningice40_native',
 '/games/habeshafortune5_native','/games/multihotdeluxe_native',
 '/independent74/fresh74.html'
]);
const headers={'x-content-type-options':'nosniff','referrer-policy':'same-origin'};
export function completeRelease(release){
 return release?.ready===true&&release.legacyDisposition===REPLACEMENT_DISPOSITION&&Array.isArray(release.entries)&&release.entries.length===74&&
  release.entries.every(e=>e&&typeof e.id==='string'&&e.id.trim()&&e.ready===true&&typeof e.title==='string'&&e.title.trim()&&typeof e.gamePath==='string'&&e.gamePath.startsWith(PREFIX+'play/')&&typeof e.cover==='string'&&e.cover.startsWith(PREFIX+'assets/'))&&
  new Set(release.entries.map(e=>e.id)).size===74&&
  new Set(release.entries.map(e=>e.gamePath)).size===74;
}
export async function routeSpecial74(request,env,release){
 if(!completeRelease(release))return null;
 const url=new URL(request.url);
 const retired=url.pathname==='/new74'||url.pathname.startsWith('/new74/')||retiredGamePaths.has(url.pathname.replace(/\/$/,''));
 if(retired){
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...headers,allow:'GET, HEAD'}});
  return new Response(null,{status:302,headers:{...headers,location:url.origin+'/games','cache-control':'no-store'}});
 }
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
  .on('script[src="/new74/entry-link.mjs"]',{element(element){element.remove();}})
  .on('head',{element(element){element.append('<link rel="stylesheet" href="/special-games/catalog.css"><script type="module" src="/special-games/catalog.mjs"></script>',{html:true});}}).transform(response);
}
