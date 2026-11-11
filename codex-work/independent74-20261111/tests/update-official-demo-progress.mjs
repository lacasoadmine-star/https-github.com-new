import {readdir,readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {entries} from '../client/official74-data.mjs';
const folder=process.env.IND74_EVIDENCE_DIRECTORY?pathToFileURL(resolve(process.env.IND74_EVIDENCE_DIRECTORY)+sep):new URL('./evidence/',import.meta.url);
const output=process.env.IND74_PROGRESS_OUTPUT?pathToFileURL(resolve(process.env.IND74_PROGRESS_OUTPUT)):new URL('official-demo-progress.json',folder);
await mkdir(folder,{recursive:true});
const files=(await readdir(folder)).filter(name=>/^official-demo-observations-.+\.json$/.test(name)).sort();
const observations=[];
const providerName=url=>{try{return new URL(url).searchParams.get('GameName')}catch{return null}};
for(const name of files){
 const input=JSON.parse(await readFile(new URL(name,folder),'utf8'));
 for(const row of input.observations||[]){
  const entry=entries.find(entry=>entry.gameId===row.gameId);
  if(!entry)throw Error('UNKNOWN_OFFICIAL_GAME_ID:'+name+':'+row.gameId);
  if(row.mode&&row.mode!=='official-demo')throw Error('NON_OFFICIAL_OBSERVATION_MODE:'+name);
  if(!Number.isSafeInteger(row.verifiedCompletedRounds)||row.verifiedCompletedRounds<0)throw Error('INVALID_VERIFIED_COUNT:'+name);
  const actual=providerName(row.demoUrl||row.sourceUrl),expected=providerName(entry.demoUrl);
  if(actual&&expected&&actual!==expected)throw Error('PROVIDER_IDENTITY_MISMATCH:'+name+':'+actual+':'+expected);
  observations.push({...row,evidenceFile:name});
 }
}
function identities(row){
 const count=row.verifiedCompletedRounds;if(!count)return [];
 if(row.providerRoundRanges?.length){
  const result=[];
  for(const r of row.providerRoundRanges){
   if(!r.nativeSessionId||!Number.isSafeInteger(r.firstCompletedCounter)||!Number.isSafeInteger(r.lastCompletedCounter)||r.firstCompletedCounter<0||r.lastCompletedCounter<r.firstCompletedCounter||r.lastCompletedCounter-r.firstCompletedCounter>100000)throw Error('INVALID_PROVIDER_RANGE:'+row.evidenceFile);
   for(let n=r.firstCompletedCounter;n<=r.lastCompletedCounter;n++)result.push('provider:'+r.nativeSessionId+'.'+n);
  }
  if(new Set(result).size!==count)throw Error('RANGE_COUNT_MISMATCH:'+row.gameId);
  return [...new Set(result)];
 }
 if(row.providerObservationKeys?.length){if(new Set(row.providerObservationKeys).size!==count)throw Error('OBSERVATION_KEY_COUNT:'+row.gameId);return row.providerObservationKeys.map(k=>'observation:'+k)}
 if(row.rounds?.length===count)return row.rounds.map((r,index)=>{
  const id=r.spinId||r.publicResult?.spinId||r.providerDealNumber;
  if(id)return 'provider:'+id;
  if(r.screenshotSha256)return 'screenshot-hash:'+r.screenshotSha256;
  if(r.screenshot)return 'screenshot-path:'+r.screenshot;
  const hash=createHash('sha256').update(JSON.stringify(r)).digest('hex');return 'result:'+hash;
 });
 const c=row.countEvidence;
 if(c&&typeof c==='object'){
  const last=c.lastSpinId||c.settledSpinId||c.spinId;
  if(typeof last==='string'&&/^\d+\.\d+$/.test(last)){
   const [session,endString]=last.split('.'),end=Number(endString),start=end-count+1;
   if(start>=0)return Array.from({length:count},(_,i)=>'provider:'+session+'.'+(start+i));
  }
 }
 // Retained completed native batches without per-round IDs remain documentary
 // evidence. Identical copied journals share a content identity and add zero.
 const hash=createHash('sha256').update(JSON.stringify({gameId:row.gameId,count,countEvidence:row.countEvidence,batches:row.batches,rounds:row.rounds})).digest('hex');
 return Array.from({length:count},(_,i)=>'documentary:'+hash+':'+i);
}
const games=entries.map(entry=>{
 const evidence=observations.filter(o=>o.gameId===entry.gameId),seen=new Set(),evidenceCounts=[];
 let historicalImported=0,reported=0;
 for(const row of evidence){
  const keys=identities(row);let accepted=0;
  for(const key of keys)if(!seen.has(key)){seen.add(key);accepted++}
  reported+=row.verifiedCompletedRounds;if(row.historicalImport)historicalImported+=accepted;
  evidenceCounts.push({evidenceFile:row.evidenceFile,reportedCompletedRounds:row.verifiedCompletedRounds,uniqueCompletedRoundsAdded:accepted,duplicateIdentitiesExcluded:keys.length-accepted,historicalImport:!!row.historicalImport});
 }
 const count=seen.size;
 return {gameId:entry.gameId,title:entry.name,protected:entry.protected,officialUrl:entry.officialUrl,demoUrl:entry.demoUrl,targetRounds:20,verifiedCompletedRounds:count,reportedCompletedRounds:reported,duplicatesExcluded:reported-count,historicalImportedCompletedRounds:historicalImported,remainingRounds:Math.max(0,20-count),furtherRoundsAllowed:count<20,evidenceFiles:[...new Set(evidence.map(o=>o.evidenceFile))],evidenceCounts,status:count>=20?'quota-met-no-further-rounds':count>0?'observed-rounds-below-target':'not-yet-play-verified'};
});
const sum=key=>games.reduce((n,g)=>n+g[key],0);
const report={schemaVersion:2,updatedAt:new Date().toISOString(),requestedTotal:1480,interpretation:'20-completed-rounds-per-title-preserve-historical-counts',targetPerGame:20,revisionReason:'Latest user instruction replaces the former10,000-total plan. Do not schedule further rounds for any title already at20. Historical discoveries and all genuine fresh rounds are retained.',dedupePolicy:'Distinct provider session+completed counter/round ID, explicit observation keys or identical retained screenshot/result records count once. Local evaluations and unresolved historical claims are excluded.',verifiedCompletedRounds:sum('verifiedCompletedRounds'),reportedCompletedRounds:sum('reportedCompletedRounds'),duplicateIdentitiesExcluded:sum('duplicatesExcluded'),historicalImportedCompletedRounds:sum('historicalImportedCompletedRounds'),gamesWithVerifiedRounds:games.filter(g=>g.verifiedCompletedRounds>0).length,gamesMeetingTarget:games.filter(g=>g.verifiedCompletedRounds>=20).length,remainingRequiredRounds:sum('remainingRounds'),creditedTowardTarget:games.reduce((sum,g)=>sum+Math.min(20,g.verifiedCompletedRounds),0),countsExclude:['unconfirmed-autoplay-batches','clicks-or-debits-only','local-simulations','unit-tests','ledger-fixture-rounds','duplicate-provider-round-identities','unresolved-historical-overlap'],games};
const temporary=new URL(output.href+'.'+process.pid+'.tmp');await writeFile(temporary,JSON.stringify(report,null,2)+'\n');await rename(temporary,output);
console.log(JSON.stringify({verifiedCompletedRounds:report.verifiedCompletedRounds,gamesWithVerifiedRounds:report.gamesWithVerifiedRounds,target:report.requestedTotal,duplicatesExcluded:report.duplicateIdentitiesExcluded}));
