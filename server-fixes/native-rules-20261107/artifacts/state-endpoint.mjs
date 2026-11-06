// Exact authenticated state route body. Auth/rate checks remain in the production caller.
export function bindState({MATH,fail,pool,modelIdentity,cash,json}){return async function(req,path,uid){
 if(req.method==='GET'&&path.startsWith('/api/state/')){
  const gameId=path.slice('/api/state/'.length);if(!Object.hasOwn(MATH.games,gameId))fail(404,'GAME_NOT_FOUND');
  const r=await pool.query('SELECT remaining,bet FROM sw_nine.free_spins WHERE user_id=$1 AND game_id=$2',[uid,gameId]);
  const remaining=Number(r.rows[0]?.remaining||0),legacyFreeSpins=['hot_foxy_20','multi_hot_5_video'].includes(gameId)&&remaining>0;
  const next=modelIdentity(gameId,{legacy:legacyFreeSpins}),current=modelIdentity(gameId);
  return json({gameId,freeSpinsRemaining:remaining,bet:remaining>0?cash(r.rows[0].bet):null,legacyFreeSpins,...next,activeMathVersion:next.mathVersion,activeEngineVersion:next.engineVersion,activeMathSha256:next.mathSha256,currentMathVersion:current.mathVersion,currentEngineVersion:current.engineVersion,currentMathSha256:current.mathSha256});
 }

return null;};}
