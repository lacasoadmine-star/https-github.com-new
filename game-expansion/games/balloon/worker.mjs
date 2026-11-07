import {ASSETS} from './client-assets.mjs';
export const BALLOON_PREFIX='/native-library/balloon/v1/';
export const BALLOON_GAME='balloon_native';
export const BALLOON_RELEASE='zplay-balloon-native-20261107-r1';
export const BALLOON_COVER='/assets/zplay-balloon-native-v1.svg';
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const encoder=new TextEncoder();
const toHex=bytes=>Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
const digest=value=>crypto.subtle.digest('SHA-256',encoder.encode(value)).then(toHex);
const cookie=req=>(req.headers.get('cookie')||'').match(/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/)?.[1]||'';
const session=req=>digest('zplay-balloon-session:'+cookie(req));
const keys=new Map();
export async function sign(secret,user,method,path,body='',time=Date.now()){
 if(typeof secret!=='string'||secret.length<40)throw Error('NATIVE_ENGINE_SECRET_MISSING');
 if(!keys.has(secret))keys.set(secret,crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']));
 const encoded=[method,path,String(time),user,await digest(body)].join('\n');
 return {'x-native-user':user,'x-native-time':String(time),'x-native-signature':toHex(await crypto.subtle.sign('HMAC',await keys.get(secret),encoder.encode(encoded)))};
}
export const catalogEntry=Object.freeze({id:BALLOON_GAME,name:'Balloon',type:'crash',category:'Flight',studio:'Superwin',available:true,enabled:true,demo:false,thumbnail:BALLOON_COVER,launch:'/games/balloon_native',implementation:'Native canvas; independent server-side math',official_provider_game:false});
export function addCatalog(data){
 if(!Array.isArray(data?.games))return data;
 if(data.games.some(game=>game.id===BALLOON_GAME))return data;
 return {...data,games:[...data.games,catalogEntry]};
}
const TYPES=Object.freeze({'index.html':'text/html; charset=utf-8','balloon.js':'application/javascript; charset=utf-8','balloon.css':'text/css; charset=utf-8','cover.svg':'image/svg+xml','lobby.mjs':'application/javascript; charset=utf-8','catalog.mjs':'application/javascript; charset=utf-8'});
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'";
function asset(name,head=false){
 if(!Object.hasOwn(ASSETS,name))return json({error:'NOT_FOUND'},404);
 const headers=new Headers({'content-type':TYPES[name],'cache-control':name==='index.html'?'no-store':'public, max-age=86400, immutable','x-content-type-options':'nosniff','x-zplay-balloon-release':BALLOON_RELEASE});
 if(name==='index.html'){headers.set('content-security-policy',CSP);headers.set('referrer-policy','same-origin');}
 return new Response(head?null:ASSETS[name],{status:200,headers});
}
async function checkedBody(req){
 if(Number(req.headers.get('content-length')||0)>8192)throw Object.assign(Error('BODY_TOO_LARGE'),{status:413});
 const body=await req.text();if(encoder.encode(body).byteLength>8192)throw Object.assign(Error('BODY_TOO_LARGE'),{status:413});return body;
}
export function installBalloon(previous){
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url),path=url.pathname,read=request.method==='GET'||request.method==='HEAD';
  if(path===BALLOON_COVER){
   if(!read)return json({error:'METHOD_NOT_ALLOWED'},405);
   return asset('cover.svg',request.method==='HEAD');
  }
  if(path==='/games/balloon_native'){
   if(!read)return json({error:'METHOD_NOT_ALLOWED'},405);return asset('index.html',request.method==='HEAD');
  }
  if(path.startsWith(BALLOON_PREFIX)){
   if(!read)return json({error:'METHOD_NOT_ALLOWED'},405);
   return asset(path.slice(BALLOON_PREFIX.length),request.method==='HEAD');
  }
  if(path==='/api/library/state'||path==='/api/library/action'){
   const action=path.endsWith('/action'),method=action?'POST':'GET';
   if(request.method!==method)return json({error:'METHOD_NOT_ALLOWED'},405);
   if(!cookie(request))return json({error:'UNAUTHORIZED'},401);
   let body='';
   if(action){
    if(request.headers.get('origin')!==url.origin)return json({error:'INVALID_ORIGIN'},403);
    if(request.headers.get('X-Zplay-Balloon-Session')!==await session(request))return json({error:'BALLOON_SESSION_CHANGED'},403);
    if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return json({error:'JSON_REQUIRED'},415);
    try{body=await checkedBody(request);if(JSON.parse(body)?.game_id!==BALLOON_GAME)return json({error:'INVALID_GAME_ID'},422);}catch(e){return json({error:e.status===413?'BODY_TOO_LARGE':'INVALID_JSON'},e.status||400);}
   }else if(url.searchParams.get('game_id')!==BALLOON_GAME)return json({error:'INVALID_GAME_ID'},422);
   const identity=await previous.fetch(new Request(new URL('/api/machine-session',url.origin),{headers:{cookie:request.headers.get('cookie'),accept:'application/json'}}),env,ctx);
   if(!identity.ok)return identity;
   try{if((await identity.json()).authenticated!==true)return json({error:'PLAYER_LOGIN_REQUIRED'},401);}catch{return json({error:'IDENTITY_UNAVAILABLE'},502);}
   const user='@session:'+await digest(cookie(request));
   const upstreamPath='/v2/library/'+(action?'action':'state'+('?game_id='+BALLOON_GAME));
   let target;try{target=new URL(upstreamPath,env.NATIVE_ENGINE_ORIGIN);if(target.protocol!=='https:')throw Error('INVALID_ORIGIN');}
   catch{return json({error:'NATIVE_ENGINE_ORIGIN_UNAVAILABLE'},503);}
   const headers={...await sign(env.NATIVE_ENGINE_SECRET,user,method,upstreamPath,body),accept:'application/json',...(action?{'content-type':'application/json'}:{})};
   let response;try{response=await fetch(target,{method,headers,body:action?body:undefined,signal:request.signal,redirect:'error'});}catch{return json({error:'RETRY_SAME_REQUEST'},503);}
   let data;try{data=await response.json();}catch{return json({error:'INVALID_ENGINE_RESPONSE'},503);}
   const output=response.ok?{...data,sessionId:await session(request)}:data;
   return new Response(JSON.stringify(output),{status:response.status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-zplay-balloon-release':BALLOON_RELEASE}});
  }
  const res=await previous.fetch(request,env,ctx);
  if(path==='/api/config'&&request.method==='GET'&&res.ok){
   let parsed;try{parsed=await res.json();}catch{return res;}
   const next=addCatalog(parsed),headers=new Headers(res.headers);for(const x of ['content-length','content-encoding','etag','last-modified'])headers.delete(x);
   headers.set('cache-control','no-store');headers.set('content-type','application/json; charset=utf-8');
   return new Response(JSON.stringify(next),{headers,status:res.status});
  }
  if(path==='/'&&request.method==='GET'&&res.ok&&res.headers.get('content-type')?.includes('text/html')){
   const headers=new Headers(res.headers);for(const name of ['content-length','content-encoding','etag','last-modified'])headers.delete(name);
   headers.set('cache-control','no-store');
   // Replace the single active catalogue module in its existing script position.
   // Its UI code is retained; the imported catalogue adds Balloon once.
   return new HTMLRewriter().on('script[src]',{element(element){
    if(element.getAttribute('src')==='/native-library/jetx/r1/portal.mjs')element.setAttribute('src',BALLOON_PREFIX+'lobby.mjs');
   }}).transform(new Response(res.body,{status:res.status,headers}));
  }
  return res;
 },async scheduled(event,env,ctx){
   if(previous.scheduled)await previous.scheduled(event,env,ctx);
   if(!env.NATIVE_ENGINE_ORIGIN||!env.NATIVE_ENGINE_SECRET)return;
   const path='/v2/library/reconcile';ctx.waitUntil(fetch(new URL(path,env.NATIVE_ENGINE_ORIGIN),{method:'POST',headers:await sign(env.NATIVE_ENGINE_SECRET,'@system','POST',path)}).then(r=>{if(!r.ok)throw Error('BALLOON_RECONCILE_FAILED');}));
 }};
}
