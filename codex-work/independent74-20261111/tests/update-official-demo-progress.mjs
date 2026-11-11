import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {entries} from '../client/official74-data.mjs';
const folder=new URL('./evidence/',import.meta.url);
await mkdir(folder,{recursive:true});
const files=(await readdir(folder)).filter(name=>/^official-demo-observations-.+\.json$/.test(name)).sort();
const observations=[];
for(const name of files){const input=JSON.parse(await readFile(new URL(name,folder),'utf8'));for(const row of input.observations||[]){if(!Number.isSafeInteger(row.verifiedCompletedRounds)||row.verifiedCompletedRounds<0)throw Error('INVALID_VERIFIED_COUNT:'+name);observations.push({...row,evidenceFile:name});}}
const games=entries.map((entry,index)=>{
  const evidence=observations.filter(o=>o.gameId===entry.gameId);
  return {gameId:entry.gameId,title:entry.name,protected:entry.protected,officialUrl:entry.officialUrl,demoUrl:entry.demoUrl,
    targetRounds:index<10?136:135,verifiedCompletedRounds:evidence.reduce((sum,o)=>sum+o.verifiedCompletedRounds,0),
    evidenceFiles:[...new Set(evidence.map(o=>o.evidenceFile))],status:evidence.some(o=>o.verifiedCompletedRounds>0)?'observed-rounds':'not-yet-play-verified'};
});
const report={schemaVersion:1,updatedAt:new Date().toISOString(),requestedTotal:10000,interpretation:'total-across-74',
  verifiedCompletedRounds:games.reduce((sum,g)=>sum+g.verifiedCompletedRounds,0),gamesWithVerifiedRounds:games.filter(g=>g.verifiedCompletedRounds>0).length,
  countsExclude:['unconfirmed-autoplay-batches','local-simulations','unit-tests','ledger-fixture-rounds'],games};
await writeFile(new URL('official-demo-progress.json',folder),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({verifiedCompletedRounds:report.verifiedCompletedRounds,gamesWithVerifiedRounds:report.gamesWithVerifiedRounds,target:report.requestedTotal}));
