// Public construction inventory. A discovered demo never authorizes a wager.
export const PUBLIC_PREFIX='/native-library/remaining20/20261110-construction-r15/';
export const LIBRARY_PREFIX='/v2/remaining20/construction-r15/';
export const QUEUE_API='/api/game-construction-queue';
const STAGES=new Set(['reference_identified','demo_observed','in_development','verification_pending']);
const HTTPS=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const normalize=value=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('en');

export function constructionQueue(source){
 if(source?.schemaVersion!==1||source.targetCount!==1000||!Array.isArray(source.games)||source.games.length>source.targetCount||source.referenceCount!==source.games.length||source.walletLedger!=='existing-postgresql')throw Error('INVALID_CONSTRUCTION_QUEUE');
 const ids=new Set(),demos=new Set();
 const games=source.games.map(game=>{
  if(typeof game.queueId!=='string'||!/^[a-z0-9]+:[A-Za-z0-9_-]{1,100}$/.test(game.queueId)||ids.has(game.queueId)||demos.has(game.officialDemo)||typeof game.name!=='string'||!game.name.trim()||typeof game.studio!=='string'||!game.studio.trim()||!HTTPS(game.officialPage)||!HTTPS(game.officialDemo)||!HTTPS(game.officialIcon)||!/^[a-f0-9]{64}$/.test(game.sourceSha256||'')||!STAGES.has(game.status)||game.financialRelease!==false||game.presentationVerified!==false||typeof game.demoObserved!=='boolean')throw Error('UNVERIFIED_QUEUE_IDENTITY');
  ids.add(game.queueId);demos.add(game.officialDemo);
  return Object.freeze({...game,search:normalize(game.name+' '+game.studio)});
 });
 const providers=Object.freeze([...new Set(games.map(game=>game.studio))].sort());
 return Object.freeze({targetCount:1000,referenceCount:games.length,providers,games:Object.freeze(games)});
}

function number(value,fallback,maximum){
 if(value===null)return fallback;
 if(!/^(0|[1-9]\d{0,5})$/.test(value)||Number(value)>maximum)throw Error('INVALID_QUEUE_PAGE');
 return Number(value);
}

export function queuePage(queue,url){
 const values=url.searchParams;
 if([...values.keys()].some(key=>!['offset','limit','q','studio'].includes(key))||[...new Set(values.keys())].some(key=>values.getAll(key).length!==1))throw Error('INVALID_QUEUE_QUERY');
 const offset=number(values.get('offset'),0,1000),limit=number(values.get('limit'),24,48);
 if(limit<1)throw Error('INVALID_QUEUE_PAGE');
 const query=values.get('q')||'',studio=values.get('studio')||'';
 if(query.length>120||studio.length>120||studio&&!queue.providers.includes(studio))throw Error('INVALID_QUEUE_QUERY');
 const needle=normalize(query.trim());
 const matches=queue.games.filter(game=>(!needle||game.search.includes(needle))&&(!studio||game.studio===studio));
 const items=matches.slice(offset,offset+limit).map(({search,...game})=>game);
 return {schemaVersion:1,targetCount:queue.targetCount,referenceCount:queue.referenceCount,
  total:matches.length,offset,limit,nextOffset:offset+items.length<matches.length?offset+items.length:null,
  providers:queue.providers,items};
}
