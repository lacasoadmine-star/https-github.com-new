export const RELEASE='superwin-jetx-native-20261107-r1';
export const PREFIX='/native-library/jetx/r1/';
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const utf8=new TextEncoder(),hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const digest=value=>crypto.subtle.digest('SHA-256',utf8.encode(value)).then(hex);
const cookie=request=>(request.headers.get('cookie')||'').match(/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/)?.[1]||'';
const binding=request=>digest('zplay-jetx-session:'+cookie(request));
const keys=new Map();
async function limitedBody(request){
 const reader=request.body?.getReader();if(!reader)return '';
 const parts=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();throw Object.assign(new Error('BODY_TOO_LARGE'),{status:413});}parts.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}return new TextDecoder().decode(bytes);
}
export async function signedHeaders(secret,user,method,path,body='',now=Date.now()){
 if(typeof secret!=='string'||secret.length<40)throw new Error('JETX_SIGNING_KEY_UNAVAILABLE');
 if(!keys.has(secret))keys.set(secret,crypto.subtle.importKey('raw',utf8.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']));
 const time=String(now),value=[method,path,time,user,await digest(body)].join('\n');
 return {'x-native-user':user,'x-native-time':time,'x-native-signature':hex(await crypto.subtle.sign('HMAC',await keys.get(secret),utf8.encode(value)))};
}
export const CSP="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'";
export const catalogEntry=Object.freeze({id:'jetx_native',name:'JetX',type:'crash',category:'Flight',studio:'Superwin',available:true,enabled:true,demo:false,thumbnail:PREFIX+'cover.webp',launch:'/games/jetx_native',implementation:'Superwin native client; independent server math',official_provider_game:false});
export function addCatalog(data){
 if(!Array.isArray(data?.games))return data;
 if(data.games.some(g=>g.id===catalogEntry.id))throw new Error('JETX_CATALOG_ID_COLLISION');
 return {...data,games:[...data.games,catalogEntry]};
}
export function installJetX(previous,{presence=''}={}){
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url),read=request.method==='GET'||request.method==='HEAD';
  if(url.pathname==='/native/jetx_native'&&read)return Response.redirect(new URL('/games/jetx_native',url.origin),302);
  if(url.pathname.startsWith(PREFIX)){
   if(!read)return json({error:'METHOD_NOT_ALLOWED'},405);
   const response=await env.NATIVE_LIBRARY_ASSETS.fetch(request),headers=new Headers(response.headers);
   headers.set('X-Zplay-JetX-Release',RELEASE);headers.set('X-Content-Type-Options','nosniff');return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
  }
  if(url.pathname==='/games/jetx_native'){
   if(!read)return json({error:'METHOD_NOT_ALLOWED'},405);
   let response=await env.NATIVE_LIBRARY_ASSETS.fetch(new Request(new URL(PREFIX+'index.html',url.origin),{method:request.method}));
   if(!response.ok)return response;
   if(presence&&request.method==='GET')response=new HTMLRewriter().on('body',{element(element){element.append('<script type="module" src="/player-v236/'+presence+'"></script>',{html:true});}}).transform(response);
   return new Response(request.method==='HEAD'?null:response.body,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':CSP,'referrer-policy':'same-origin','x-content-type-options':'nosniff','X-Zplay-JetX-Release':RELEASE}});
  }
  if(url.pathname.startsWith('/api/jetx/')){
   const operation=url.pathname.slice(10),expected=operation==='action'?'POST':'GET';
   if(!['state','action','events','chat'].includes(operation))return json({error:'NOT_FOUND'},404);
   if(request.method!==expected&&!(operation==='chat'&&request.method==='POST'))return json({error:'METHOD_NOT_ALLOWED'},405);
   if(!cookie(request))return json({error:'UNAUTHORIZED'},401);
   if(request.method==='POST'){
    if(request.headers.get('origin')!==url.origin)return json({error:'INVALID_ORIGIN'},403);
    if(request.headers.get('X-Zplay-JetX-Session')!==await binding(request))return json({error:'JETX_SESSION_CHANGED'},403);
    if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return json({error:'JSON_REQUIRED'},415);
   }
   // The unchanged authenticated route validates the existing session/presence
   // lease and returns the canonical player identity. Client IDs are ignored.
   const identity=await previous.fetch(new Request(new URL('/api/native-families/state?game_id=ssg-jetx',url.origin),{headers:{cookie:request.headers.get('cookie'),accept:'application/json'}}),env,ctx);
   if(!identity.ok)return identity;
   let user,legacyActive;try{const data=await identity.json();user=data.user_id;legacyActive=data.round?.status==='active'?data.round.game_id:data.other_active_game;if(legacyActive==='jetx_native')legacyActive=null;}catch{return json({error:'IDENTITY_UNAVAILABLE'},502);}
   if(typeof user!=='string'||!user||user.length>100||/[\r\n]/.test(user))return json({error:'IDENTITY_UNAVAILABLE'},502);
   let body='';if(request.method==='POST'){
    if(Number(request.headers.get('content-length')||0)>8192)return json({error:'BODY_TOO_LARGE'},413);
    try{body=await limitedBody(request);}catch{return json({error:'BODY_TOO_LARGE'},413);}
   }
   const path='/v2/jetx/'+operation+(operation==='chat'?'?since='+encodeURIComponent(url.searchParams.get('since')||'0'):'');
   const headers={...await signedHeaders(env.NATIVE_ENGINE_SECRET,user,request.method,path,body),'accept':operation==='events'?'text/event-stream':'application/json',...(body?{'content-type':'application/json'}:{})};
   let response;try{response=await fetch(new URL(path,env.NATIVE_ENGINE_ORIGIN),{method:request.method,headers,body:body||undefined,signal:request.signal,redirect:'error'});}catch{return json({error:'RETRY_SAME_REQUEST'},503);}
   const outputHeaders=new Headers({'cache-control':'no-store','x-content-type-options':'nosniff','X-Zplay-JetX-Release':RELEASE});
   if(operation==='events'){outputHeaders.set('content-type',response.headers.get('content-type')||'text/event-stream');return new Response(response.body,{status:response.status,headers:outputHeaders});}
   let data;try{data=await response.json();}catch{return json({error:'RETRY_SAME_REQUEST'},503);}
   outputHeaders.set('content-type','application/json');return new Response(JSON.stringify(response.ok&&operation!=='chat'?{...data,sessionId:await binding(request),otherActiveGame:legacyActive||null}:data),{status:response.status,headers:outputHeaders});
  }
  const response=await previous.fetch(request,env,ctx);
  if(url.pathname==='/api/config'&&request.method==='GET'&&response.ok){
   const data=addCatalog(await response.json()),headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('cache-control','no-store');return new Response(request.method==='HEAD'?null:JSON.stringify(data),{headers});
  }
  if(url.pathname==='/'&&request.method==='GET'&&response.ok&&response.headers.get('content-type')?.includes('text/html')){
   const old='/player-native-catalog-20261107-r1/portal.mjs';
   const headers=new Headers(response.headers);for(const name of ['content-length','content-encoding','etag','last-modified'])headers.delete(name);headers.set('cache-control','no-store');
   return new HTMLRewriter().on('script[src]',{element(element){if(element.getAttribute('src')===old)element.setAttribute('src',PREFIX+'portal.mjs');}}).transform(new Response(response.body,{headers}));
  }
  return response;
 },async scheduled(event,env,ctx){
  if(previous.scheduled)await previous.scheduled(event,env,ctx);
  const path='/v2/jetx/reconcile';
  ctx.waitUntil(fetch(new URL(path,env.NATIVE_ENGINE_ORIGIN),{method:'POST',headers:await signedHeaders(env.NATIVE_ENGINE_SECRET,'@system','POST',path)}).then(r=>{if(!r.ok)throw new Error('JETX_RECONCILIATION_FAILED');}));
 }};
}
