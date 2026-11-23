// Public operational status from the retained native engine. Discovery and
// presentation evidence alone can never create a playable lobby card.
import {bounded,reply,fail} from './reference-resources-r14.mjs';
export const RELEASE_ID='remaining-native-etb-r16';
export const HEALTH_URL='https://superwin-native-family-engine-staging.up.railway.app/v2/remaining20/health';
export const UI_PATH='/v2/remaining20/construction-r15/queue-ui-r16.mjs';
const PAGE_PATH='/v2/remaining20/construction-r15/games.json';
const CONTROL_PREFIX='/v2/remaining20/construction-r15/';
const CONTROL_FILES=new Set(['mobile-controls-r16.mjs','control-state-r16.mjs','control-data-r16.mjs','mobile-controls-r16b.mjs','control-state-r16b.mjs','control-data-r16b.mjs']);
export const OPERATIONS=Object.freeze([
 ['multihot100_native','multihot100','Multi Hot 100'],
 ['habeshafortune5_native','habeshafortune5','Habesha Fortune 5'],
 ['multihotwildways_native','multihotwildways','Multi Hot Wild Ways'],
 ['multihot5wild_native','multihot5wild','Multi Hot 5 Wild'],
 ['multihot5superwilds_native','multihot5superwilds','Multi Hot 5 Super Wilds'],
 ['multihotdeluxe_native','multihot5deluxe','Multi Hot Deluxe'],
 ['burningice_native','blazinghot','Burning Ice'],
 ['burningice10_native','blazinghot10','Burning Ice 10'],
 ['burningice40_native','blazinghot40','Burning Ice 40'],
].map(([id,providerKey,name])=>Object.freeze({id,providerKey,name,version:'superwin-'+id.replace('_native','')+'-2-etb1-40000-v1'})));

export function operationalGames(health){
 if(health?.ready!==true||health.accepting!==true||!Array.isArray(health.games)||health.games.length>40)return [];
 return OPERATIONS.filter(expected=>{
  const matches=health.games.filter(game=>game.id===expected.id),game=matches[0];
  return matches.length===1&&game.version===expected.version&&game.currency==='ETB'&&game.minStake==='1.00'&&game.maxStake==='40000.00'&&
   game.launchable===true&&game.accepting===true&&game.operatorRelease?.id===RELEASE_ID&&
   game.operatorRelease.providerPrivateMathVerified===false&&game.operatorRelease.completeReferenceParityVerified===false;
 }).map(game=>({...game,href:'/games/'+game.id,status:'operator_live_reference_review_in_progress'}));
}

export function installOperationalLibrary(previous,{uiSource,controlResources={},fetchImpl=fetch,now=Date.now}={}){
 if(typeof previous?.fetch!=='function'||typeof uiSource!=='string')throw Error('EXISTING_LIBRARY_AND_UI_REQUIRED');
 let snapshot=null,pending=null;
 async function status(){
  if(snapshot&&now()-snapshot.at<10000)return snapshot.games;
  if(pending)return pending;
  pending=(async()=>{
   try{
    const response=await fetchImpl(HEALTH_URL,{method:'GET',redirect:'manual',credentials:'omit',headers:{accept:'application/json'},signal:AbortSignal.timeout(5000)});
    if(response.status!==200)throw Error('NATIVE_STATUS_UNAVAILABLE');
    const games=operationalGames(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await bounded(response.body,393216))));
    snapshot={at:now(),games};return games;
   }catch{snapshot=null;return [];}
  })();
  try{return await pending;}finally{pending=null;}
 }
 return {...previous,async fetch(request,env,ctx){
  const url=new URL(request.url);
  const control=url.pathname.startsWith(CONTROL_PREFIX)?url.pathname.slice(CONTROL_PREFIX.length):null;
  if(url.pathname!==PAGE_PATH&&url.pathname!==UI_PATH&&!CONTROL_FILES.has(control))return previous.fetch(request,env,ctx);
  if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);
  if(url.pathname===UI_PATH)return reply(null,uiSource,request.method,'application/javascript; charset=utf-8',true);
  if(CONTROL_FILES.has(control))return typeof controlResources[control]==='string'?reply(null,controlResources[control],request.method,'application/javascript; charset=utf-8',true):fail('CONTROL_SOURCE_UNAVAILABLE');
  // Validate pagination in the original handler before any status request.
  const response=await previous.fetch(new Request(request,{method:'GET'}),env,ctx);
  if(response.status!==200)return request.method==='HEAD'?reply(response,null,'HEAD',response.headers.get('content-type')):response;
  try{
   const page=JSON.parse(new TextDecoder().decode(await bounded(response.body,262144)));
   if(page.schemaVersion!==1||!Array.isArray(page.items)||page.items.length>48)throw Error('INVALID_RETAINED_PAGE');
   const games=await status(),byKey=new Map(games.map(game=>['smartsoft:'+game.providerKey,game]));
   const items=page.items.map(game=>{
    const current=byKey.get(game.queueId);
    return current?{...game,status:current.status,financialRelease:true,nativeId:current.id,playHref:current.href,modelVersion:current.version}:game;
   });
   return reply(response,JSON.stringify({...page,items,operationalGames:games,operationalReleaseId:RELEASE_ID}),request.method,'application/json; charset=utf-8');
  }catch{return fail('QUEUE_UNAVAILABLE');}
 }};
}
