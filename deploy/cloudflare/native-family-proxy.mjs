import {GAMES as NATIVE_GAMES} from '../../apps/native-engine/catalog.mjs';
import {OFFICIAL_DEMO_CATALOG as SMARTSOFT_CATALOG} from './official-demo-catalog.mjs';

export function internalFamilyCatalog(){return {
 provider:'Superwin internal',environment:'Internal ETB family engines',status:'INTERNAL_ETB',gateway:'Superwin native family engine',
 total_games:30,configured_games_count:30,external_provider_configured_games_count:0,official_provider_game:false,
 games:SMARTSOFT_CATALOG.games.map(game=>({...game,provider:null,official_provider_game:false,implementation:'Independent Superwin internal game',etb_enabled:true,family:NATIVE_GAMES[game.id].family,launch_url:'/native/'+game.id,demo_launcher_url:game.launch_url})),
};}
export function nativeRoute(path){return path.startsWith('/api/native-families/')||path.startsWith('/native/')||path==='/native-assets/client.mjs'||path==='/native-assets/style.css';}
function origin(env){
 if(!env.NATIVE_ENGINE_ORIGIN||!env.NATIVE_ENGINE_SECRET||env.NATIVE_ENGINE_SECRET.length<40)throw Error('NATIVE_ENGINE_NOT_CONFIGURED');
 const url=new URL(env.NATIVE_ENGINE_ORIGIN);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('NATIVE_ENGINE_NOT_CONFIGURED');return url.origin;
}
const bytes=new TextEncoder();
const hex=buffer=>Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
export async function nativeSignature(secret,user,method,path,body='',now=Date.now()){
 const time=String(now),digest=hex(await crypto.subtle.digest('SHA-256',bytes.encode(body)));
 const key=await crypto.subtle.importKey('raw',bytes.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=hex(await crypto.subtle.sign('HMAC',key,bytes.encode([method,path,time,user,digest].join('\n'))));
 return {'x-native-user':user,'x-native-time':time,'x-native-signature':signature};
}
async function bodyText(request){
 const reader=request.body?.getReader();if(!reader)return '';const parts=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>16384){await reader.cancel();throw Object.assign(Error('BODY_TOO_LARGE'),{status:413});}parts.push(value);}}
 finally{reader.releaseLock();}
 const output=new Uint8Array(length);let at=0;for(const value of parts){output.set(value,at);at+=value.byteLength;}return new TextDecoder().decode(output);
}
async function upstream(env,user,method,path,body=''){
 const headers=new Headers(await nativeSignature(env.NATIVE_ENGINE_SECRET,user,method,path,body));
 headers.set('accept','application/json');if(method==='POST')headers.set('content-type','application/json');
 return fetch(origin(env)+path,{method,headers,body:method==='POST'?body:undefined,redirect:'manual',signal:AbortSignal.timeout(18000)});
}
export async function reconcileNativeFamilies(env){
 if(!env.NATIVE_ENGINE_ORIGIN||!env.NATIVE_ENGINE_SECRET)return;
 const response=await upstream(env,'@system','POST','/v1/reconcile','{}');
 if(!response.ok)throw Error('NATIVE_RECONCILE_FAILED_'+response.status);
 await response.body?.cancel();
}
export async function proxyNativeFamily(request,env,{legacy,sessionHeaders}){
 const url=new URL(request.url),path=url.pathname;
 const error=(code,status=503,source)=>Response.json({error:code},{status,headers:sessionHeaders(new Headers({'Cache-Control':'no-store'}),source)});
 try{
  origin(env);let target,publicRequest=false;
  if(path==='/native-assets/client.mjs'){target='/assets/client.mjs';publicRequest=true;}
  else if(path==='/native-assets/style.css'){target='/assets/style.css';publicRequest=true;}
  else if(path==='/api/native-families/status'){target='/health';publicRequest=true;}
  else if(path==='/api/native-families/catalog'){target='/v1/catalog';publicRequest=true;}
  else if(path.startsWith('/native/')){
   const id=path.slice('/native/'.length);if(!Object.hasOwn(NATIVE_GAMES,id))return error('GAME_NOT_FOUND',404);target='/game/'+id+(url.searchParams.get('embed')==='1'?'?embed=1':'');
  }else if(path==='/api/native-families/state'){
   const id=url.searchParams.get('game_id');if(!Object.hasOwn(NATIVE_GAMES,id))return error('GAME_NOT_FOUND',404);target='/v1/state?game_id='+encodeURIComponent(id);
  }else if(path==='/api/native-families/action')target='/v1/action';
  else return error('NOT_FOUND',404);
  if(target==='/v1/action'){
   if(request.method!=='POST')return error('METHOD_NOT_ALLOWED',405);
   if(request.headers.get('origin')!==url.origin)return error('INVALID_ORIGIN',403);
   if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return error('JSON_REQUIRED',415);
  }else if(!['GET','HEAD'].includes(request.method))return error('METHOD_NOT_ALLOWED',405);
  const body=request.method==='POST'?await bodyText(request):'';
  let user='@public',accountResponse;
  if(!publicRequest){
   const accountURL=new URL(request.url);accountURL.pathname='/api/me';accountURL.search='';
   const authHeaders=new Headers(request.headers);for(const name of ['content-length','content-type','x-native-user','x-native-time','x-native-signature'])authHeaders.delete(name);
   accountResponse=await legacy(new Request(accountURL,{headers:authHeaders}),env);
   if(!accountResponse.ok)return error(accountResponse.status===401?'PLAYER_LOGIN_REQUIRED':'ACCOUNT_UNAVAILABLE',accountResponse.status===401?401:503,accountResponse.headers);
   let account;try{account=await accountResponse.json();}catch{return error('ACCOUNT_UNAVAILABLE',503,accountResponse.headers);}
   if(typeof account.id!=='string'||!account.id||account.role!=='player')return error('PLAYER_REQUIRED',403,accountResponse.headers);
   user=account.id;
  }
  const response=await upstream(env,user,request.method==='HEAD'?'GET':request.method,target,body);
  const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');
  if(accountResponse)sessionHeaders(headers,accountResponse.headers);
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers});
 }catch(error){return error?.status===413?Response.json({error:'BODY_TOO_LARGE'},{status:413}):Response.json({error:'NATIVE_ENGINE_UNAVAILABLE_RETRY_SAME_REQUEST'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
