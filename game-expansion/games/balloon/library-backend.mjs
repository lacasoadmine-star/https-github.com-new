import {AsyncLocalStorage} from 'node:async_hooks';

// The guard executes within the inherited canonical account transaction. Replays
// bypass the new-round guard, preserving every earlier accepted receipt.
export function installCrossActiveGuards(shared,service,{jetx}={}){
 const context=new AsyncLocalStorage(),perform=shared.perform.bind(shared),transaction=shared.transaction.bind(shared),reconcile=shared.reconcile.bind(shared);
 shared.perform=(user,body,...rest)=>context.run(body?.type==='start'?{table:'sw_native_family.requests',request:body.request_id}:null,()=>perform(user,body,...rest));
 if(jetx){const action=jetx.action.bind(jetx);jetx.action=(user,body)=>context.run(body?.type==='bet'?{table:'sw_jetx_native.requests',request:body.request_id}:null,()=>action(user,body));}
 shared.transaction=(user,callback,options)=>transaction(user,async(tx,account)=>{
  const start=context.getStore();
  if(start){const existing=await tx.unsafe(`SELECT request_id FROM ${start.table} WHERE user_id=$1 AND request_id=$2`,[user,start.request]);if(!existing.length)await service.assertNoActive(tx,user);}
  return callback(tx,account);
 },options);
 shared.reconcile=async limit=>({...await reconcile(limit),library:await service.reconcile(limit)});
}

export function installLibrary(previous,{service,verifyNative,readNativeBody,engineSecret,resolveSessionUser}){
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
 return {...previous,async fetch(request){
  const url=new URL(request.url),path=url.pathname;if(!path.startsWith('/v2/library/'))return previous.fetch(request);
  if(path==='/v2/library/health'&&request.method==='GET')return reply({ready:service.ready,accepting:service.accepting,games:Object.values(service.registry.definitions()),officialPrivateMathVerified:false},service.ready?200:503);
  if(!service.ready)return reply({error:'LIBRARY_UNAVAILABLE'},503);
  try{
   const raw=await readNativeBody(request),subject=verifyNative(request,raw,engineSecret);if(!subject)return reply({error:'UNAUTHORIZED'},401);
   if(path==='/v2/library/reconcile'&&request.method==='POST'){if(subject!=='@system')return reply({error:'FORBIDDEN'},403);return reply(await service.reconcile(100));}
   const user=await resolveSessionUser(service.shared,subject);
   if(path==='/v2/library/state'&&request.method==='GET')return reply(await service.state(user,url.searchParams.get('game_id')));
   if(path==='/v2/library/action'&&request.method==='POST'){
    if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return reply({error:'JSON_REQUIRED'},415);
    let body;try{body=JSON.parse(raw);}catch{return reply({error:'INVALID_JSON'},400);}
    return reply(await service.action(user,body));
   }
   return reply({error:'NOT_FOUND'},404);
  }catch(error){if(Number.isInteger(error.status)&&error.status>=400&&error.status<500)return reply({error:error.message},error.status);console.error(JSON.stringify({event:'native_library_request_failed',code:typeof error.code==='string'?error.code:'INTERNAL_ERROR'}));return reply({error:'RETRY_SAME_REQUEST'},503);}
 }};
}
