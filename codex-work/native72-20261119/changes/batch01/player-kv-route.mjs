// ZPLAY first-ten #4 / #8 route adapter — identical existing Worker and KV.
// Additive read-only GET/HEAD ONLY. All previous APIs, session cookies, wallet
// settlement, Durable Objects, env bindings and existing Player pages are retained.
// No new Worker/service/backend/db. Do not activate an unapproved game/paytable.
const SHA=/^[a-f0-9]{64}$/, ROOT='/new74/';
const mime={
 html:'text/html; charset=utf-8',mjs:'application/javascript; charset=utf-8',
 css:'text/css; charset=utf-8',json:'application/json',png:'image/png',mp3:'audio/mpeg'
};
const CORE_FILES=Object.freeze(['index.html','app.mjs','assets.json','scene.mjs','controller.mjs','session.mjs','assets.mjs','style.css']);
const M20_MEDIA=Object.freeze(['atlas-0.png','atlas-1.png','atlas-2.png','atlas-3.png','atlas-logo.png','background.png',
 'button.mp3','music.mp3','reel-stop.mp3','spin.mp3','win.mp3','wins.png','wins2.png']);
const CSP="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'";
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const asBytes=x=>x instanceof ArrayBuffer?new Uint8Array(x):ArrayBuffer.isView(x)?new Uint8Array(x.buffer,x.byteOffset,x.byteLength):null;
const sha256=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
function reject(status,message){return new Response(message,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
export function validateGamePins(pins){
 if(!isRecord(pins)||pins.schema!=='zplay/batch01-existing-worker-asset-pins/v1'||!isRecord(pins.games)||
    pins.namespaceBinding!=='SSG_OFFICIAL_REFERENCES'||!/^batch01-[0-9]{8}-r[0-9]+$/.test(pins.release||''))
  throw Error('INVALID_BATCH01_RELEASE');
 const allowed=Object.freeze({
  multihot20:{path:'/new74/multi-hot-20/',id:'fresh_multihot20'},
  multihot5burnwilds:{path:'/new74/multi-hot-5-burn-wilds/',id:'fresh_multihot5burnwilds'}
 });
 if(Object.keys(pins.games).length!==2)throw Error('GAMES_MUST_BE_ISOLATED');
 const games={};
 for(const [slug,expected] of Object.entries(allowed)){
  const g=pins.games[slug];if(!isRecord(g)||g.path!==expected.path||g.id!==expected.id||
    typeof g.published!=='boolean'||!isRecord(g.files))throw Error('UNRECOGNIZED_GAME_RELEASE_'+slug);
  const files={};
  for(const [name,item] of Object.entries(g.files)){
   if(!/^(?:assets\/)?[a-zA-Z0-9_.-]{1,120}\.(?:html|mjs|css|json|png|mp3)$/.test(name)||
      name.includes('..')||!isRecord(item)||!SHA.test(item.sha256)||!Number.isSafeInteger(item.bytes)||
      item.bytes<1||item.bytes>25*1024*1024||item.key!=='native72/'+pins.release+'/'+slug+'/'+name||
      item.type!==mime[name.split('.').at(-1)])throw Error('INVALID_GAME_ASSET_PIN_'+slug+'_'+name);
   files[name]=Object.freeze({...item});
  }
  // Retained, closed M20 pins remain valid input to the additive release
  // builder. Published M20 and any package using its original atlases must
  // contain the complete new media set, without stale split-sprite files.
  // Burn retains its existing package requirements independently.
  const m20AtlasPackage=slug==='multihot20'&&(g.published||Object.keys(files).some(name=>
   /^assets\/(?:atlas-[0-3]|atlas-logo|wins2?)\.png$/.test(name)));
  const requiredMedia=m20AtlasPackage?M20_MEDIA.map(name=>'assets/'+name):['assets/seven.png','assets/other-fruits.png'];
  if(CORE_FILES.some(name=>!files[name])||requiredMedia.some(name=>!files[name])||
     m20AtlasPackage&&Object.keys(files).length!==CORE_FILES.length+M20_MEDIA.length)
   throw Error('INCOMPLETE_GAME_PACKAGE_'+slug);
  games[slug]=Object.freeze({...g,files:Object.freeze(files)});
 }
 return Object.freeze({release:pins.release,games:Object.freeze(games)});
}
export function createBatch01Routes({pins,verifyAsset=sha256,allowUnpublishedForQA=false}={}){
 const config=validateGamePins(pins);
 return async function route(request,env){
  if(env?.PORTAL!=='player')return null;
  const url=new URL(request.url);
  let game=null,assetPath=null;
  for(const g of Object.values(config.games)){
   if(url.pathname===g.path.slice(0,-1)){if(!['GET','HEAD'].includes(request.method))return reject(405,'Method not allowed');return Response.redirect(url.origin+g.path+url.search,308)}
   if(url.pathname.startsWith(g.path)){game=g;assetPath=url.pathname.slice(g.path.length)||'index.html';break}
  }
  if(!game)return null;
  if(!['GET','HEAD'].includes(request.method))return reject(405,'Method not allowed');
  if(!game.published&&!allowUnpublishedForQA)return reject(503,'Game is not released for Player wagering.');
  if(assetPath.includes('%')||assetPath.includes('..')||assetPath.includes('\\')||assetPath.startsWith('/'))return reject(404,'Not found');
  const asset=Object.hasOwn(game.files,assetPath)?game.files[assetPath]:null;
  if(!asset)return reject(404,'Not found');
  let record=null;
  try{record=await env.SSG_OFFICIAL_REFERENCES?.getWithMetadata(asset.key,{type:'arrayBuffer'})}
  catch{return reject(503,'Asset verification unavailable')}
  const bytes=asBytes(record?.value);
  if(!bytes||bytes.byteLength!==asset.bytes||record.metadata?.sha256!==asset.sha256||
     record.metadata?.bytes!==asset.bytes||record.metadata?.contentType!==asset.type||
     await verifyAsset(bytes)!==asset.sha256)return reject(503,'Asset integrity check failed');
  const html=assetPath==='index.html';
  const headers=new Headers({
   'Content-Type':asset.type,'Content-Length':String(asset.bytes),
   'Cache-Control':html?'private, no-store':'private, max-age=60',
   'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',
   'Cross-Origin-Resource-Policy':'same-origin','X-Zplay-Release':config.release,
   'ETag':'"'+asset.sha256+'"'
  });
  if(html)headers.set('Content-Security-Policy',CSP);
  if(request.headers.get('If-None-Match')===headers.get('ETag'))
   return new Response(null,{status:304,headers});
  return new Response(request.method==='HEAD'?null:bytes,{status:200,headers});
 };
}
export function wrapBatch01Player(previous,pins,{allowUnpublishedForQA=false}={}){
 if(typeof previous?.fetch!=='function')throw Error('EXISTING_PLAYER_WORKER_REQUIRED');
 const handler=createBatch01Routes({pins,allowUnpublishedForQA});
 const descriptors=Object.getOwnPropertyDescriptors(previous);
 descriptors.fetch={configurable:true,enumerable:true,writable:true,value:async function(request,env,ctx){
  const own=await handler(request,env);
  if(own)return own;
  return previous.fetch.call(previous,request,env,ctx);
 }};
 return Object.create(Object.getPrototypeOf(previous),descriptors);
}
