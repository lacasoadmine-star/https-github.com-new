// Operational release of the retained independent operator models. Reference
// and provider-private certification remain separate and are never promoted.
export const OPERATOR_RELEASE_ID='remaining-native-etb-r16';
export const OPERATOR_IDS=Object.freeze(['multihot100_native','habeshafortune5_native',
 'multihotwildways_native','multihot5wild_native','multihot5superwilds_native',
 'multihotdeluxe_native','burningice_native','burningice10_native','burningice40_native']);
const CORE=Object.freeze(['officialIdentity','paytable','nativeMath','walletSettlement','browserIntegration']);
const fail=code=>{throw Object.assign(Error(code),{status:409});};

export function createOperatorRelease(adapter,{policy,readiness,isEnabled=()=>false}={}){
 if(policy?.schemaVersion!==1||policy.releaseId!==OPERATOR_RELEASE_ID||policy.authorization!=='owner_requested_etb_during_reference_construction'||
  !Number.isFinite(Date.parse(policy.authorizedAt))||!Array.isArray(policy.gameIds)||policy.gameIds.length!==OPERATOR_IDS.length||
  !OPERATOR_IDS.every((id,index)=>policy.gameIds[index]===id)||policy.providerPrivateMathVerified!==false||policy.completeReferenceParityVerified!==false||typeof isEnabled!=='function')throw Error('INVALID_OPERATOR_RELEASE_POLICY');
 if(!adapter?.definitions||!adapter.publicGameConfigs||typeof adapter.evaluateDraftRound!=='function'||
  ['start','act','expire','publicState'].some(key=>typeof adapter[key]!=='function'))throw Error('INVALID_RETAINED_OPERATOR_ADAPTER');
 for(const id of OPERATOR_IDS){
  const definition=adapter.definitions[id],game=adapter.publicGameConfigs[id],entry=readiness?.machines?.[id];
  if(!definition||definition.version!==policy.versions?.[id]||game?.version!==definition.version||entry?.modelVersion!==definition.version||
   game.currency!=='ETB'||game.minStake!=='1.00'||game.maxStake!=='40000.00'||game.math?.kind!=='independent-zplay'||
   !CORE.every(key=>entry.checks?.[key]===true))throw Error('OPERATOR_FINANCIAL_REVIEW_INCOMPLETE:'+id);
 }
 const ids=new Set(OPERATOR_IDS);
 const promote=game=>Object.freeze({...game,published:true,launchable:true,
  operatorRelease:Object.freeze({id:OPERATOR_RELEASE_ID,status:'operator_live_reference_review_in_progress',
   providerPrivateMathVerified:false,completeReferenceParityVerified:false}),
  ...(game.currencyAdaptation?{currencyAdaptation:Object.freeze({...game.currencyAdaptation,productionLaunchable:true})}:{})});
 const definitions=Object.freeze(Object.fromEntries(Object.entries(adapter.definitions).map(([id,game])=>[id,ids.has(id)?promote(game):game])));
 const publicGameConfigs=Object.freeze(Object.fromEntries(Object.entries(adapter.publicGameConfigs).map(([id,game])=>[id,ids.has(id)?promote(game):game])));
 const canStart=definition=>isEnabled()===true&&ids.has(definition?.id)&&definition.version===policy.versions[definition.id]&&
  definition.operatorRelease?.id===OPERATOR_RELEASE_ID&&definition.launchable===true;
 return Object.freeze({...adapter,definitions,publicGameConfigs,publicGames:Object.freeze(Object.values(publicGameConfigs)),
  operatorCanStart:canStart,
  start(id,options,rng,now){
   if(!ids.has(id))return adapter.start(id,options,rng,now);
   if(!canStart(definitions[id]))fail('REMAINING_GAME_NOT_RELEASED');
   return adapter.evaluateDraftRound(id,options,rng,now);
  },
 });
}
