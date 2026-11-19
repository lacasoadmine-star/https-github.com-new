export const RELEASE='zplay-native-machines-20261119-habesha-r2';
export const GAME='habesha_fortune_5_native';
export function createProductionHandler({assets,htmlTemplate,presencePath,published=false,gameId=GAME,release=RELEASE}){
 if(!presencePath?.startsWith('/')||presencePath.startsWith('//')||/["<>\s]/.test(presencePath))throw Error('INVALID_PRESENCE_PATH');
 const prefix='/'+release+'/';
 return function native72Page(request,env){
  if(env.PORTAL!=='player'||!['GET','HEAD'].includes(request.method))return null;
  const url=new URL(request.url),head=request.method==='HEAD';
  if(url.pathname.startsWith(prefix)){
   const name=url.pathname.slice(prefix.length),asset=Object.hasOwn(assets,name)?assets[name]:null;
   if(!asset)return new Response(head?null:'Not found',{status:404});
   if(asset.kvKey)return storedAsset(asset,env,head,release);
   return new Response(head?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','X-Zplay-Release':release}});
  }
  if(!new RegExp('^/games/'+gameId+'/?$').test(url.pathname))return null;
  if(!published&&env.NATIVE72_HABESHA_ENABLED!=='true')return new Response(head?null:'This game is being prepared.',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'300'}});
  const html=htmlTemplate.replace('{{GAME}}',gameId).replace('{{PRESENTATION_GAME}}',gameId).replace('</body>','<script type="module" src="'+presencePath+'"></script></body>');
  return new Response(head?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Zplay-Release':release,'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'"}});
 };
}
async function storedAsset(asset,env,head,release){
 const body=await env.SSG_OFFICIAL_REFERENCES.get(asset.kvKey,'arrayBuffer');
 if(!body||body.byteLength!==asset.size)return new Response('Asset unavailable',{status:503,headers:{'Cache-Control':'no-store'}});
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==asset.sha256)return new Response('Asset verification failed',{status:503,headers:{'Cache-Control':'no-store'}});
 return new Response(head?null:body,{headers:{'Content-Type':asset.type,'Content-Length':String(asset.size),'Cache-Control':'public, max-age=31536000, immutable','ETag':'"'+hash+'"','X-Content-Type-Options':'nosniff','X-Zplay-Release':release}});
}
export function installProductionGame(previous,page){
 const retained=Object.fromEntries(Object.entries(previous).map(([k,v])=>[k,typeof v==='function'?v.bind(previous):v]));
 return {...retained,fetch(request,env,ctx){return page(request,env)??previous.fetch(request,env,ctx);}};
}
