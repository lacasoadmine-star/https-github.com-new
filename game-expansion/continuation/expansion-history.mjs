// Read-only, account-scoped history. Existing wallet and game modules stay intact.
export function installExpansionHistory(previous,{service,verifyNative,readNativeBody,engineSecret,resolveSessionUser}){
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
 return {...previous,async fetch(request){
  const url=new URL(request.url);
  if(url.pathname!=='/v2/library/history')return previous.fetch(request);
  if(request.method!=='GET')return reply({error:'METHOD_NOT_ALLOWED'},405);
  if(!service.ready)return reply({error:'LIBRARY_UNAVAILABLE'},503);
  try{
   const raw=await readNativeBody(request),subject=verifyNative(request,raw,engineSecret);
   if(!subject||subject==='@system')return reply({error:'UNAUTHORIZED'},401);
   const user=await resolveSessionUser(service.shared,subject),gameId=url.searchParams.get('game_id'),sort=url.searchParams.get('sort')||'recent';
   if(typeof gameId!=='string'||!/^[a-z0-9_]{1,64}$/.test(gameId)||!['recent','wins'].includes(sort))return reply({error:'INVALID_HISTORY_QUERY'},422);
   service.registry.get(gameId);
   const rows=await service.shared.transaction(user,async tx=>{
    // Only these two fixed orderings can enter SQL; identity and game are bound.
    const order=sort==='wins'?"(state->>'payoutMinor')::bigint DESC,created_at DESC,id DESC":'created_at DESC,id DESC';
    return tx.unsafe('SELECT * FROM sw_native_library.rounds WHERE user_id=$1 AND game_id=$2 AND status=\'settled\' ORDER BY '+order+' LIMIT 50',[user,gameId]);
   });
   return reply({game_id:gameId,currency:'ETB',sort,rows:rows.map(row=>({createdAt:Number(row.created_at),settledAt:Number(row.settled_at),round:service.view(row,service.now())}))});
  }catch(error){
   if(Number.isInteger(error.status)&&error.status>=400&&error.status<500)return reply({error:error.message},error.status);
   console.error(JSON.stringify({event:'expansion_history_failed',code:typeof error.code==='string'?error.code:'INTERNAL_ERROR'}));
   return reply({error:'HISTORY_UNAVAILABLE'},503);
  }
 }};
}
