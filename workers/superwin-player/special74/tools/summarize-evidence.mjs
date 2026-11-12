import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const folder=resolve(root,'reports/special74');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const selected=(await json(resolve(folder,'selected-games.json'))).entries;
const pages=await json(resolve(folder,'fresh-official-pages/index.json'));
const models=(await json(resolve(folder,'selected-backend-candidates.json'))).entries;
const manifest=await json(resolve(folder,'manifest.json'));
const entries=[];
for(const entry of selected){
 let observation=null;
 try{observation=await json(resolve(folder,'fresh-observations',entry.id,'observation.json'));}catch(error){if(error.code!=='ENOENT')throw error;}
 if(observation&&observation.selectedName!==entry.selectedName)throw Error('Reference identity mismatch: '+entry.id);
 const page=pages.find(p=>p.id===entry.id),model=models.find(m=>m.id===entry.id);
 let screenshot=null;
 if(observation?.screenshot){const file=resolve(root,observation.screenshot);if((await stat(file)).isFile())screenshot={path:observation.screenshot,sha256:createHash('sha256').update(await readFile(file)).digest('hex')};}
 let interactive=null,ui=null,visual=null;
 for(const [name,set]of [['interactive-rounds.json',value=>interactive=value],['interactive-observation.json',value=>ui=value],['visual-review.json',value=>visual=value]]){
  try{const value=await json(resolve(folder,'fresh-observations',entry.id,name));if(value.id!==entry.id||value.selectedName!==entry.selectedName)throw Error('Interactive identity mismatch');set(value);}catch(error){if(error.code!=='ENOENT')throw error;}
 }
 const rounds=[...new Set([...(observation?.confirmedRoundIds??[]),...(interactive?.confirmedRoundIds??[])])];
 entries.push({id:entry.id,displayOrder:entry.displayOrder,requestedName:entry.requestedName,selectedName:entry.selectedName,provider:entry.selectedProvider,category:entry.selectedCategory,replacement:entry.replacement,
  officialPage:entry.officialIdentity.url,providerPageArchived:page?.status==='archived',
  launchStatus:observation?.status??'queued',freshConfirmedRoundIds:rounds,
  completedRoundsObservedInUI:ui?.completedRoundsObservedInUI??0,
  idleLayoutVisuallyReviewed:visual?.idlePresentationVisible===true,loaderOnlyVisuallyReviewed:visual?.idlePresentationVisible===false,
  sufficientBehaviorCoverage:false,visualParityVerified:false,screenshot,
  backendCandidates:model?.candidates??[],providerProbabilityModelVerified:false,
  presentation:manifest.entries.find(e=>e.id===entry.id)?.presentation??'not-built-v2',ready:false});
}
const totals={selected:entries.length,officialPagesArchived:entries.filter(e=>e.providerPageArchived).length,
 launchAttempts:entries.filter(e=>e.launchStatus!=='queued').length,
 canvasesObserved:entries.filter(e=>e.launchStatus==='canvas-loaded-needs-visual-and-gameplay-review').length,
 freshGamesWithConfirmedRounds:entries.filter(e=>e.freshConfirmedRoundIds.length).length,
 gamesWithCompletedRoundObservedInUI:entries.filter(e=>e.completedRoundsObservedInUI>0).length,
 sufficientBehaviorCoverage:0,verifiedProviderProbabilityModels:0,releaseReady:0};
const report={updatedAt:new Date().toISOString(),scope:'Add 74 new SmartSoft titles alongside existing games; no production change',totals,entries};
await writeFile(resolve(folder,'current-status.json'),JSON.stringify(report,null,2)+'\n');
const lines=['# Special Games — actual evidence status','',
 'Existing games remain unchanged. This catalogue has not been deployed. A loaded canvas or screenshot is not gameplay verification or a completed game.','',
 `${totals.officialPagesArchived}/74 official provider pages archived; ${totals.launchAttempts}/74 demo launches attempted; ${totals.freshGamesWithConfirmedRounds}/74 games with confirmed rounds in the current fresh pass.`,
 '', 'The earlier independent Burning Ice 10 draft and its 20 observed rounds are retained as separately dated work; they do not automatically satisfy the new all-title pass. Private reel distributions and exact provider probabilities have not been established.','',
 '| Official selected title | Requested name | Demo observation | Confirmed rounds in fresh pass | New implementation |',
 '| --- | --- | --- | ---: | --- |',
 ...entries.map(e=>`| [${e.selectedName}](${e.officialPage}) | ${e.requestedName} | ${e.launchStatus} | ${e.freshConfirmedRoundIds.length} | ${e.presentation} |`),''];
await writeFile(resolve(folder,'current-status.md'),lines.join('\n'));
console.log(JSON.stringify(totals));
