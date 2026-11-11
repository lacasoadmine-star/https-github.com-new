const scope={"candidateIds":["multihot100_native","multihotwildways_native","multihot5wild_native","multihot5superwilds_native","multihotdeluxe_native","burningice_native","burningice10_native","burningice40_native","habeshafortune5_native","moonstone_native","magicgarden_native","bookofmagic_native","samurai_native","vegasnights_native","towerx_native","towerrush_native","egyptianlegends_native","olympianlegends_native","coinminer_native"]};
import {sign} from './balloon-worker-20261108.mjs';

// This wrapper owns only additional routes. Every existing route, asset,
// handler and Durable Object export is delegated to the retained live Worker.
export const RELEASE='remaining20-20261109-r1';
export const CLIENT_PREFIX='/native-library/remaining20/20261109/';
export const ART_PREFIX='/native-library/remaining20/reference-art/r1/';
export const API_PREFIX='/api/remaining20/';
const CANDIDATES=new Set(scope.candidateIds),encoder=new TextEncoder();
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
const cookie=request=>(request.headers.get('cookie')||'').match(/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/)?.[1]||'';
const session=request=>hash('zplay-library-session:'+cookie(request));
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','x-zplay-remaining20-release':RELEASE}});
const jsonError=(code,status)=>json({error:code},status);
const readOnly=request=>request.method==='GET'||request.method==='HEAD';
const origin=env=>{
 const url=new URL(env.NATIVE_ENGINE_ORIGIN);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('INVALID_ENGINE_ORIGIN');
 return url.origin;
};

async function readBody(request){
 if(Number(request.headers.get('content-length')||0)>8192)throw Object.assign(Error('BODY_TOO_LARGE'),{status:413});
 if(!request.body)return '';
 const reader=request.body.getReader(),parts=[];let length=0;
 try{
  for(;;){const{done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>8192){await reader.cancel();throw Object.assign(Error('BODY_TOO_LARGE'),{status:413});}parts.push(value);}
 }finally{reader.releaseLock();}
 const data=new Uint8Array(length);let at=0;for(const part of parts){data.set(part,at);at+=part.byteLength;}
 return new TextDecoder('utf-8',{fatal:true}).decode(data);
}

export function appendRemainingGames(data,games){
 if(!Array.isArray(data?.games))return data;
 const existing=new Set(data.games.map(game=>game.id));
 const additions=games.filter(game=>game.launchable===true&&!existing.has(game.id)).map(game=>({
  id:game.id,name:game.name,type:game.type,category:['slots','cascade'].includes(game.type)?'Slots':'Arcade',studio:'ZPLAY',
  available:true,enabled:true,demo:false,thumbnail:CLIENT_PREFIX+'covers/'+game.id+'.svg',launch:'/games/'+game.id,
  implementation:'Independent ZPLAY machine; server-settled wallet',official_provider_game:false,
 }));
 return additions.length?{...data,games:[...data.games,...additions]}:data;
}

export function installRemainingGames(previous,{games=[],fetchImpl=(...args)=>globalThis.fetch(...args),signer=sign}={}){
 if(!previous||typeof previous.fetch!=='function')throw Error('EXISTING_PLAYER_REQUIRED');
 const ids=new Set();
 for(const game of games){if(!CANDIDATES.has(game?.id)||ids.has(game.id))throw Error('NEW_GAME_SCOPE_VIOLATION');ids.add(game.id);}
 const published=new Map(games.filter(game=>game.published===true||game.launchable===true).map(game=>[game.id,game]));
 async function publicAsset(request,env,path){
  let target;try{target=new URL(path,origin(env));}catch{return jsonError('NATIVE_ENGINE_ORIGIN_UNAVAILABLE',503);}
  let response;try{response=await fetchImpl(target,{method:request.method,headers:{accept:request.headers.get('accept')||'*/*'},redirect:'manual',signal:request.signal});}catch{return jsonError('NEW_GAME_ASSET_UNAVAILABLE',503);}
  if(response.status>=300&&response.status<400){await response.body?.cancel().catch(()=>{});return jsonError('NEW_GAME_ASSET_UNAVAILABLE',503);}
  const headers=new Headers(response.headers);headers.delete('set-cookie');headers.set('x-zplay-remaining20-release',RELEASE);
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers});
 }
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url),path=url.pathname;
  if(path.startsWith(CLIENT_PREFIX)){
   if(!readOnly(request))return jsonError('METHOD_NOT_ALLOWED',405);
   const name=path.slice(CLIENT_PREFIX.length);
   if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.includes('..')||name.startsWith('/'))return jsonError('NOT_FOUND',404);
   return publicAsset(request,env,'/v2/remaining20/client/'+name);
  }
  if(path.startsWith(ART_PREFIX)){
   if(!readOnly(request))return jsonError('METHOD_NOT_ALLOWED',405);
   const relative=path.slice(ART_PREFIX.length);
   if(!/^(smartsoft|remaining-slots|arcade|legends)\/assets\/[a-f0-9]{64}\.(png|jpg|jpeg|webp|gif|svg|mp3|ogg|wav|otf|ttf|woff|woff2|json|txt|atlas)$/.test(relative))return jsonError('NOT_FOUND',404);
   // Reuse immutable public bytes when available. A request carries no player
   // credentials and cannot address the private wallet or another origin.
   const binding=typeof env.EXPANSION100?.fetch==='function'?env.EXPANSION100:env.NATIVE_LIBRARY_ASSETS;
   if(typeof binding?.fetch==='function'){
    try{
     const asset=await binding.fetch(new Request(new URL(ART_PREFIX+relative,url.origin),{method:request.method,signal:request.signal}));
     if(asset.status===200){const headers=new Headers(asset.headers);headers.delete('set-cookie');headers.set('x-content-type-options','nosniff');headers.set('cache-control','public, max-age=31536000, immutable');return new Response(request.method==='HEAD'?null:asset.body,{status:200,headers});}
     if(asset.status!==404)return jsonError('NEW_GAME_ASSET_UNAVAILABLE',503);
    }catch{return jsonError('NEW_GAME_ASSET_UNAVAILABLE',503);}
   }
   return publicAsset(request,env,'/v2/remaining20/art/'+relative);
  }
  const gameId=path.startsWith('/games/')?path.slice('/games/'.length):'';
  if(CANDIDATES.has(gameId)){
   if(!readOnly(request))return jsonError('METHOD_NOT_ALLOWED',405);
   if(!published.has(gameId))return jsonError('GAME_REFERENCE_PENDING',503);
   return publicAsset(new Request(request,{method:request.method}),env,'/v2/remaining20/client/index.html');
  }
  if(path.startsWith(API_PREFIX)){
   const operation=path.slice(API_PREFIX.length);
   if(!['state','action','history'].includes(operation))return jsonError('NOT_FOUND',404);
   const action=operation==='action',method=action?'POST':'GET';
   if(request.method!==method)return jsonError('METHOD_NOT_ALLOWED',405);
   if(!cookie(request))return jsonError('UNAUTHORIZED',401);
   let body='',id=url.searchParams.get('game_id');
   if(action){
    if(request.headers.get('origin')!==url.origin)return jsonError('INVALID_ORIGIN',403);
    if(request.headers.get('X-Zplay-Library-Session')!==await session(request))return jsonError('LIBRARY_SESSION_CHANGED',403);
    if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return jsonError('JSON_REQUIRED',415);
    try{body=await readBody(request);id=JSON.parse(body)?.game_id;}catch(error){return jsonError(error.status===413?'BODY_TOO_LARGE':'INVALID_JSON',error.status||400);}
   }
   if(!published.has(id))return jsonError('INVALID_GAME_ID',422);
   const identity=await previous.fetch(new Request(new URL('/api/machine-session',url.origin),{headers:{cookie:request.headers.get('cookie'),accept:'application/json'}}),env,ctx);
   if(!identity.ok)return identity;
   try{if((await identity.json()).authenticated!==true)return jsonError('PLAYER_LOGIN_REQUIRED',401);}catch{return jsonError('IDENTITY_UNAVAILABLE',502);}
   const sort=url.searchParams.get('sort')||'recent';if(operation==='history'&&!['recent','wins'].includes(sort))return jsonError('INVALID_HISTORY_QUERY',422);
   const upstream='/v2/remaining20/'+(action?'action':operation==='history'?'history?game_id='+id+'&sort='+sort:'state?game_id='+id);
   let target;try{target=new URL(upstream,origin(env));}catch{return jsonError('NATIVE_ENGINE_ORIGIN_UNAVAILABLE',503);}
   let response;
   try{response=await fetchImpl(target,{method,headers:{...await signer(env.NATIVE_ENGINE_SECRET,'@session:'+await hash(cookie(request)),method,upstream,body),accept:'application/json',...(action?{'content-type':'application/json'}:{})},body:action?body:undefined,signal:request.signal,redirect:'manual'});}catch{return jsonError('RETRY_SAME_REQUEST',503);}
   if(response.status>=300&&response.status<400){await response.body?.cancel().catch(()=>{});return jsonError('RETRY_SAME_REQUEST',503);}
   let data;try{data=await response.json();}catch{return jsonError('INVALID_ENGINE_RESPONSE',503);}
   return json(response.ok?{...data,authenticated:true,sessionId:await session(request)}:data,response.status);
  }
  const response=await previous.fetch(request,env,ctx);
  if(path!=='/api/config'||request.method!=='GET'||!response.ok)return response;
  let data;try{data=await response.clone().json();}catch{return response;}
  const extended=appendRemainingGames(data,[...published.values()]);if(extended===data)return response;
  const headers=new Headers(response.headers);for(const key of['content-length','content-encoding','etag','last-modified'])headers.delete(key);
  headers.set('cache-control','no-store');headers.set('content-type','application/json; charset=utf-8');
  return new Response(JSON.stringify(extended),{status:response.status,headers});
 }};
}
