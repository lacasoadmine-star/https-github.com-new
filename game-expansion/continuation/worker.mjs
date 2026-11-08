import {ASSETS, GAMES, REFERENCE_ART_FILES} from './client-assets.mjs';
import {sign} from '../games/balloon/worker.mjs';

export const RELEASE='zplay-expansion-20261108-r1';
export const PREFIX='/native-library/expansion/r1/';
export const REFERENCE_ART_PREFIX='/native-library/reference-art/r1/';
const publishedGames=GAMES.filter(game=>game.launchable===true);
const encoder=new TextEncoder();
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
const cookie=request=>(request.headers.get('cookie')||'').match(/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/)?.[1]||'';
const session=request=>digest('zplay-library-session:'+cookie(request));
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','x-zplay-expansion-release':RELEASE}});
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'";
const contentType=name=>name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')||name.endsWith('.mjs')?'application/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':name.endsWith('.json')?'application/json; charset=utf-8':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.webp')?'image/webp':name.endsWith('.png')?'image/png':'application/octet-stream';
function asset(name,head=false){
 if(!Object.hasOwn(ASSETS,name))return json({error:'NOT_FOUND'},404);
 const headers=new Headers({'content-type':contentType(name),'cache-control':name.endsWith('.html')?'no-store':'public, max-age=3600','x-content-type-options':'nosniff','x-zplay-expansion-release':RELEASE});
 if(name.endsWith('.html')){headers.set('content-security-policy',CSP);headers.set('referrer-policy','same-origin');}
 return new Response(head?null:ASSETS[name],{status:200,headers});
}
async function referenceAsset(request,env,path){
 if(!Object.hasOwn(REFERENCE_ART_FILES,path))return json({error:'NOT_FOUND'},404);
 if(request.method!=='GET'&&request.method!=='HEAD')return json({error:'METHOD_NOT_ALLOWED'},405);
 const host=typeof env.EXPANSION100?.fetch==='function'?env.EXPANSION100:env.NATIVE_LIBRARY_ASSETS;
 if(typeof host?.fetch!=='function')return json({error:'REFERENCE_ASSETS_UNAVAILABLE'},503);
 const record=REFERENCE_ART_FILES[path];
 // This uses only the retained same-origin static binding. Player cookies,
 // provider URLs and financial requests never enter the artwork path.
 let response;
 try{response=await host.fetch(new Request(new URL(path,request.url),{method:request.method,signal:request.signal}));}
 catch{return json({error:'REFERENCE_ASSETS_UNAVAILABLE'},503);}
 if(response.status!==200)return json({error:response.status===404?'NOT_FOUND':'REFERENCE_ASSETS_UNAVAILABLE'},response.status===404?404:503);
 const headers=new Headers({'content-type':record.mime,'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff','x-zplay-reference-sha256':record.sha256,'x-zplay-expansion-release':RELEASE});
 // The client independently verifies the complete bytes before decoding. This
 // expected hash header does not claim the Worker streamed and verified them.
 if(record.mime==='image/svg+xml')headers.set('content-security-policy',"default-src 'none'; sandbox");
 return new Response(request.method==='HEAD'?null:response.body,{status:200,headers});
}
export function catalogueEntry(game){return {id:game.id,name:game.name,type:game.type,category:['slots','cascade'].includes(game.type)?'Slots':'Arcade',studio:'ZPLAY',available:true,enabled:true,demo:false,thumbnail:'/assets/zplay-'+game.id+'.svg',launch:'/games/'+game.id,implementation:'Independent ZPLAY machine; server-settled wallet',official_provider_game:false};}
export function extendCatalogue(data,available=publishedGames){
 if(!Array.isArray(data?.games))return data;
 const ids=new Set(data.games.map(game=>game.id));
 return {...data,games:[...data.games,...available.filter(game=>!ids.has(game.id)).map(catalogueEntry)]};
}
async function readBody(request){
 if(Number(request.headers.get('content-length')||0)>8192)throw Object.assign(Error('BODY_TOO_LARGE'),{status:413});
 const body=await request.text();if(encoder.encode(body).byteLength>8192)throw Object.assign(Error('BODY_TOO_LARGE'),{status:413});return body;
}
export function installExpansion(previous,{gameConfigs=GAMES}={}){
 const available=gameConfigs.filter(game=>game.launchable===true);
 const games=new Map(available.map(game=>[game.id,game]));
 const requested=new Map(gameConfigs.map(game=>[game.id,game]));
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url),path=url.pathname,read=request.method==='GET'||request.method==='HEAD';
  if(path.startsWith(REFERENCE_ART_PREFIX))return referenceAsset(request,env,path);
  const gameId=path.startsWith('/games/')?path.slice(7):'';
  if(requested.has(gameId)){
   if(!read)return json({error:'METHOD_NOT_ALLOWED'},405);
   if(!games.has(gameId))return json({error:'GAME_REFERENCE_PENDING'},503);
   return asset(gameId==='multihot40_native'?'multihot40.html':'index.html',request.method==='HEAD');
  }
  if(path.startsWith(PREFIX)){
   if(!read)return json({error:'METHOD_NOT_ALLOWED'},405);
   return asset(path.slice(PREFIX.length),request.method==='HEAD');
  }
  if(path.startsWith('/assets/zplay-')&&path.endsWith('_native.svg')){
   const id=path.slice('/assets/zplay-'.length,-4);
   if(games.has(id)){if(!read)return json({error:'METHOD_NOT_ALLOWED'},405);return asset('covers/'+id+'.svg',request.method==='HEAD');}
  }
  if(path==='/api/expansion/state'||path==='/api/expansion/action'||path==='/api/expansion/history'){
   const action=path.endsWith('/action'),history=path.endsWith('/history'),method=action?'POST':'GET';
   if(request.method!==method)return json({error:'METHOD_NOT_ALLOWED'},405);
   if(!cookie(request))return json({error:'UNAUTHORIZED'},401);
   let body='',id=url.searchParams.get('game_id');
   if(action){
    if(request.headers.get('origin')!==url.origin)return json({error:'INVALID_ORIGIN'},403);
    if(request.headers.get('X-Zplay-Library-Session')!==await session(request))return json({error:'LIBRARY_SESSION_CHANGED'},403);
    if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return json({error:'JSON_REQUIRED'},415);
    try{body=await readBody(request);id=JSON.parse(body)?.game_id;}catch(error){return json({error:error.status===413?'BODY_TOO_LARGE':'INVALID_JSON'},error.status||400);}
   }
   if(!games.has(id))return json({error:'INVALID_GAME_ID'},422);
   const identity=await previous.fetch(new Request(new URL('/api/machine-session',url.origin),{headers:{cookie:request.headers.get('cookie'),accept:'application/json'}}),env,ctx);
   if(!identity.ok)return identity;
   try{if((await identity.json()).authenticated!==true)return json({error:'PLAYER_LOGIN_REQUIRED'},401);}catch{return json({error:'IDENTITY_UNAVAILABLE'},502);}
   const subject='@session:'+await digest(cookie(request));
   const sort=url.searchParams.get('sort')||'recent';
   if(history&&!['recent','wins'].includes(sort))return json({error:'INVALID_HISTORY_QUERY'},422);
   const upstreamPath='/v2/library/'+(action?'action':history?'history?game_id='+id+'&sort='+sort:'state?game_id='+id);
   let target;try{target=new URL(upstreamPath,env.NATIVE_ENGINE_ORIGIN);if(target.protocol!=='https:')throw Error('INVALID_ORIGIN');}catch{return json({error:'NATIVE_ENGINE_ORIGIN_UNAVAILABLE'},503);}
   let response;
   try{response=await fetch(target,{method,headers:{...await sign(env.NATIVE_ENGINE_SECRET,subject,method,upstreamPath,body),accept:'application/json',...(action?{'content-type':'application/json'}:{})},body:action?body:undefined,signal:request.signal,redirect:'error'});}catch{return json({error:'RETRY_SAME_REQUEST'},503);}
   let data;try{data=await response.json();}catch{return json({error:'INVALID_ENGINE_RESPONSE'},503);}
   return json(response.ok?{...data,authenticated:true,sessionId:await session(request)}:data,response.status);
  }
  const response=await previous.fetch(request,env,ctx);
  if(path==='/api/config'&&request.method==='GET'&&response.ok){
   let data;try{data=await response.clone().json();}catch{return response;}
   const headers=new Headers(response.headers);for(const key of ['content-length','content-encoding','etag','last-modified'])headers.delete(key);
   headers.set('cache-control','no-store');headers.set('content-type','application/json; charset=utf-8');
   return new Response(JSON.stringify(extendCatalogue(data,available)),{status:response.status,headers});
  }
  if(path==='/'&&request.method==='GET'&&response.ok&&response.headers.get('content-type')?.includes('text/html')){
   const headers=new Headers(response.headers);for(const key of ['content-length','content-encoding','etag','last-modified'])headers.delete(key);headers.set('cache-control','no-store');
   return new HTMLRewriter().on('script[src]',{element(element){if(element.getAttribute('src')==='/native-library/balloon/v1/lobby.mjs')element.setAttribute('src',PREFIX+'lobby.mjs');}}).transform(new Response(response.body,{status:response.status,headers}));
  }
  return response;
 }};
}
