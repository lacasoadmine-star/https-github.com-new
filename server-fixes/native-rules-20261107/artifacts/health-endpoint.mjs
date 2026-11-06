// Exact production health route; only dependencies are injected for tests.
export function bindHealth({pool,redis,json,MATH,Originals,accepting,mathSha256,revised,loaded,modelIdentity,nativeSchemaProbe}){return async function(path){
 if(path==='/health'){await pool.query('SELECT 1');await redis.ping();return json({brand:'SUPERWIN.BET',db:'up',redis:'up',games:Object.keys(MATH.games).length,originalGames:Originals.GAMES.length,originalVersion:Originals.VERSION,enabled:accepting,mathSha256,engineVersion:revised.ENGINE_VERSION,legacyEngineVersion:loaded.ENGINE_VERSION,nativeSchemaCompatibility:nativeSchemaProbe.get(),activeModels:Object.fromEntries(["foxy_hot_20_native","multi_hot_5_native"].map(id=>[id,modelIdentity(id)]))});}

return null;};}
