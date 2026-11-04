import {SQL} from 'bun';
import {GAMES,gameById} from './catalog.mjs';
import {NativeStore} from './store.mjs';
import {limitedBody,verifySignature} from './auth.mjs';
import {nativeHTML,NATIVE_CSS,NATIVE_CLIENT} from './web-assets.mjs';

const secret=process.env.NATIVE_ENGINE_SECRET||'';
const allowNewRounds=process.env.NATIVE_ENGINE_ACCEPT_NEW_ROUNDS!=='false';
const enabled=process.env.NATIVE_ENGINE_ENABLED==='true';
let sql,store,ready=false;
if(process.env.DATABASE_URL){
 try{sql=new SQL(process.env.DATABASE_URL,{max:8});store=new NativeStore(sql);await store.migrate();ready=true;}
 catch(error){console.error(JSON.stringify({event:'native_initialization_failed',code:typeof error.code==='string'?error.code:'INITIALIZATION_FAILED'}));}
}
const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
const json=(data,status=200)=>Response.json(data,{status,headers});
export default {async fetch(request){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/health')return json({status:ready?'ready':'unavailable',version:'superwin-native-families-v1',new_rounds_enabled:allowNewRounds,database_ready:ready,dashboard_sync_ready:ready&&store.liveDashboardReady===true,financial_ready:ready&&enabled&&secret.length>=40,configured_games:ready&&enabled&&allowNewRounds?30:0,recovery_games:ready&&enabled?30:0,families:[...new Set(Object.values(GAMES).map(g=>g.family))]},ready?200:503);
 if(path==='/assets/client.mjs')return new Response(request.method==='HEAD'?null:NATIVE_CLIENT,{headers:{...headers,'content-type':'text/javascript; charset=utf-8'}});
 if(path==='/assets/style.css')return new Response(request.method==='HEAD'?null:NATIVE_CSS,{headers:{...headers,'content-type':'text/css; charset=utf-8'}});
 if(!ready||!enabled)return json({error:'NATIVE_ENGINE_UNAVAILABLE'},503);
 if(!request.headers.has('x-native-signature'))return json({error:'UNAUTHORIZED'},401);
 try{
  const body=await limitedBody(request);const userId=verifySignature(request,body,secret);
  if(!userId)return json({error:'UNAUTHORIZED'},401);
  if(path==='/v1/reconcile'&&request.method==='POST'){
   if(userId!=='@system')return json({error:'FORBIDDEN'},403);
   return json(await store.reconcile(50));
  }
  if(path==='/v1/catalog'&&request.method==='GET')return json({games:Object.values(GAMES),currency:'ETB',implementation:'Superwin internal',official_provider_game:false});
  if(path.startsWith('/game/')&&request.method==='GET'){
   const game=gameById(path.slice('/game/'.length));
   await store.transaction(userId,async()=>true);
   return new Response(nativeHTML(game),{headers:{...headers,'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",'referrer-policy':'no-referrer'}});
  }
  if(path==='/v1/state'&&request.method==='GET')return json({...(await store.snapshot(userId,url.searchParams.get('game_id'))),user_id:userId});
  if(path==='/v1/action'&&request.method==='POST'){
   if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return json({error:'JSON_REQUIRED'},415);
   let payload;try{payload=JSON.parse(body);}catch{return json({error:'INVALID_JSON'},400);}
   return json(await store.perform(userId,payload,{allowNewRounds}));
  }
  return json({error:'NOT_FOUND'},404);
 }catch(error){
  if(Number.isInteger(error.status)&&error.status>=400&&error.status<500)return json({error:error.message},error.status);
  console.error(JSON.stringify({event:'native_request_failed',code:typeof error.code==='string'?error.code:'INTERNAL_ERROR',sqlstate:typeof error.errno==='string'?error.errno:undefined}));
  return json({error:'RETRY_SAME_REQUEST'},503);
 }
}};
