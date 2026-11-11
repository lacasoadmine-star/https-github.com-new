// Read-only: no accounts, balances, wagers, resets, or substituted games.
import {readFile,writeFile} from 'node:fs/promises';
const catalogue=JSON.parse(await readFile(new URL('./official-catalogue.json',import.meta.url),'utf8'));
const official='https://www.smartsoftgaming.com',seen=new Set();
if(catalogue.count!==74||catalogue.games.length!==74)throw Error('OFFICIAL_CATALOGUE_COUNT_CHANGED');
for(const game of catalogue.games){
 if(seen.has(game.id)||new URL(game.officialPage).origin!==official||!game.demo)throw Error('INVALID_OFFICIAL_REFERENCE');
 seen.add(game.id);
}
const engine='https://superwin-native-family-engine-staging.up.railway.app';
const sources=[engine+'/health',engine+'/v2/library/health',engine+'/v2/remaining20/health'];
const observations=await Promise.all(sources.map(async url=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(20000),redirect:'error'});
 if(!response.ok)throw Error('EXISTING_ENGINE_UNAVAILABLE:'+response.status);
 return {url,data:await response.json(),status:response.status};
}));
const models=observations.flatMap(source=>(source.data.games||[]).map(model=>({model,source:source.url})));
const games=catalogue.games.map(game=>{
 // Similar names or generic families do not establish a game's wallet contract.
 const matches=models.filter(({model})=>model.officialReference===game.officialPage);
 return {id:game.id,name:game.name,officialPage:game.officialPage,models:matches.map(({model,source})=>({serverId:model.id,version:model.version,source,launchable:model.launchable===true,accepting:model.accepting===true})),referenceContractPresent:matches.length>0};
});
const matched=games.filter(game=>game.referenceContractPresent).length;
const report={observedAt:new Date().toISOString(),scope:74,source:catalogue.source,existingWalletOnly:true,newWalletCreated:false,productionWagersPlaced:0,liveDeploymentChanged:false,readiness:'INCOMPLETE',exactPublicReferenceContracts:matched,missingExactPublicReferenceContracts:74-matched,
 engineChecks:observations.map(({url,status,data})=>({url,status,ready:data.ready??data.database_ready,accepting:data.accepting??data.new_rounds_enabled,definitions:data.games?.length,officialPrivateMathVerified:data.officialPrivateMathVerified??null})),
 limitation:'These routes describe the existing library and remaining-game integrations, not every internal Superwin route. Missing exact public references mean unverified support, not proof that no similar internal game exists.',games};
await writeFile(new URL('./server-contract-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({scope:74,matched,unverified:74-matched,readiness:report.readiness,liveChanged:false}));
