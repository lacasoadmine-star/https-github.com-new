import legacy,{sharedWallet,engineSecret,verifyNative,readNativeBody,engineEnabled,engineReady} from './native-family-preserved.mjs';
import {AsyncLocalStorage} from 'node:async_hooks';
import {JetXService} from './jetx-service.mjs';
import {resolveSessionUser} from './jetx-auth.mjs';
import {IMPLEMENTATION} from './jetx-rules.mjs';

const jetx=sharedWallet?new JetXService(sharedWallet,{accepting:engineEnabled&&process.env.JETX_NATIVE_ACCEPT_NEW_ROUNDS==='true',autoTimers:true}):{ready:false,accepting:false};
if(engineReady&&engineEnabled){
 try{await jetx.migrate();void jetx.recoverTimers().catch(()=>console.error('jetx_recovery_schedule_failed'));}
 catch(error){console.error(JSON.stringify({event:'jetx_initialization_failed',code:typeof error.code==='string'?error.code:'JETX_INITIALIZATION_FAILED'}));}
}

// Replaying a legacy receipt remains valid. A new legacy interactive round
// cannot overlap the four JetX positions on the same canonical player account.
if(sharedWallet&&jetx.ready){
 const context=new AsyncLocalStorage(),perform=sharedWallet.perform.bind(sharedWallet),transaction=sharedWallet.transaction.bind(sharedWallet),reconcile=sharedWallet.reconcile.bind(sharedWallet),snapshot=sharedWallet.snapshot.bind(sharedWallet);
 sharedWallet.perform=(user,body,...options)=>context.run(body?.type==='start'?{request:body.request_id}:null,()=>perform(user,body,...options));
 sharedWallet.transaction=(user,callback,options)=>transaction(user,async(tx,account)=>{
  const starting=context.getStore();
  if(starting){
   const replay=await tx.unsafe('SELECT request_id FROM sw_native_family.requests WHERE user_id=$1 AND request_id=$2',[user,starting.request]);
   if(!replay.length){
    await jetx.advance(tx,user,Date.now());
    const active=await tx.unsafe("SELECT id FROM sw_jetx_native.bets WHERE user_id=$1 AND status='active' LIMIT 1",[user]);
    if(active.length)throw Object.assign(new Error('FINISH_ACTIVE_ROUND:jetx_native'),{status:409});
   }
  }
  return callback(tx,account);
 },options);
 sharedWallet.reconcile=async limit=>{const existing=await reconcile(limit);return {...existing,jetx:await jetx.reconcile(limit)};};
 sharedWallet.snapshot=async(user,game)=>{
  const result=await snapshot(user,game);if(result.other_active_game)return result;
  const active=await sharedWallet.sql.unsafe("SELECT id FROM sw_jetx_native.bets WHERE user_id=$1 AND status='active' LIMIT 1",[user]);
  return active.length?{...result,other_active_game:'jetx_native'}:result;
 };
}
const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export default {...legacy,async fetch(request){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/v2/jetx/'))return legacy.fetch(request);
 if(path==='/v2/jetx/health')return reply({ready:jetx.ready,accepting:jetx.accepting,gameId:'jetx_native',implementation:IMPLEMENTATION},jetx.ready?200:503);
 if(!jetx.ready)return reply({error:'JETX_UNAVAILABLE'},503);
 try{
  const body=await readNativeBody(request),subject=verifyNative(request,body,engineSecret);
  if(!subject)return reply({error:'UNAUTHORIZED'},401);
  if(path==='/v2/jetx/reconcile'&&request.method==='POST'){
   if(subject!=='@system')return reply({error:'FORBIDDEN'},403);return reply(await jetx.reconcile(100));
  }
  const user=await resolveSessionUser(sharedWallet,subject);
  if(path==='/v2/jetx/state'&&request.method==='GET')return reply(await jetx.state(user));
  if(path==='/v2/jetx/events'&&request.method==='GET')return jetx.eventStream(user,request.signal);
  if(path==='/v2/jetx/chat'&&['GET','POST'].includes(request.method)){
   let message=null;try{if(request.method==='POST')message=JSON.parse(body);}catch{return reply({error:'INVALID_JSON'},400);}
   return reply(await jetx.chat(user,url.searchParams.get('since')||'0',message));
  }
  if(path==='/v2/jetx/action'&&request.method==='POST'){
   if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return reply({error:'JSON_REQUIRED'},415);
   let data;try{data=JSON.parse(body);}catch{return reply({error:'INVALID_JSON'},400);}
   return reply(await jetx.action(user,data));
  }
  return reply({error:'NOT_FOUND'},404);
 }catch(error){
  if(Number.isInteger(error.status)&&error.status>=400&&error.status<500)return reply({error:error.message},error.status);
  console.error(JSON.stringify({event:'jetx_request_failed',code:typeof error.code==='string'?error.code:'INTERNAL_ERROR'}));return reply({error:'RETRY_SAME_REQUEST'},503);
 }
}};
