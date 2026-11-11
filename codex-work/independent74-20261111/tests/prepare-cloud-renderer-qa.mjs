// Prepare self-contained browser QA for the existing Cloudflare Browser Run
// connector. All model state is an isolated fixture; no account/network API.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {createExistingLibrary74Adapter} from '../server/existing-library74-adapter.mjs';
import {listGameDefinitions,getGameDefinition} from '../math/official72.mjs';
import {chargingCarryBucket,emptyChargingCarry} from '../math/charging-wilds.mjs';

const root=resolve(import.meta.dirname,'..'),out=resolve(root,'work/cloud-renderer-qa');
const ids=listGameDefinitions().map(game=>game.id);
const adapter=createExistingLibrary74Adapter({reviewedGameIds:ids,allowNewRounds:true,gameLimits:Object.fromEntries(ids.map(id=>[id,{maxBetMinor:'2000',maxWinMinor:'999999999999999'}])),getStartContext:({gameId,stakeMinor,options})=>{
 const game=getGameDefinition(gameId);return game.chargingFeature?{bucket:chargingCarryBucket(game,stakeMinor,options),priorCarry:emptyChargingCarry()}:undefined;
}});
const now=1700000000000,fixtures=[];
for(const id of ids){
 let state=adapter.start(id,{stakeMinor:'100'},()=>0,now).state;
 if(state.status==='active')state=adapter.expire(state,()=>0,state.expiresAt).state;
 if(state.status!=='settled')throw Error('FIXTURE_NOT_SETTLED:'+id);
 fixtures.push({id,definition:adapter.definitions[id],round:adapter.publicState(state,state.lastActionAt)});
}
const bundle=await build({stdin:{contents:`export {renderMachine,animateRound} from ${JSON.stringify(resolve(root,'client/machine74-renderer.mjs'))};`,resolveDir:root},bundle:true,format:'iife',globalName:'MachineQa',write:false,platform:'browser',target:'es2022',minify:true});
const css=(await Promise.all(['machines74.css','machine74-renderer.css'].map(file=>readFile(resolve(root,'client',file),'utf8')))).join('\n');
const script=`${bundle.outputFiles[0].text}
const fixtures=${JSON.stringify(fixtures)};
const report={pass:false,environment:'Cloudflare Chromium; actual renderer with isolated public-state fixtures',width:innerWidth,productionRequests:0,walletMutations:0,cases:[],animations:[],pageErrors:[]};
window.addEventListener('error',event=>report.pageErrors.push(event.message));
window.fetch=()=>{throw Error('NETWORK_FORBIDDEN_IN_ISOLATED_QA');};
(async()=>{
try{
 const stage=document.querySelector('#stage');
 for(const fixture of fixtures)for(const status of ['ready','settled']){
  MachineQa.renderMachine(stage,fixture.definition,status==='ready'?null:fixture.round,{reduced:true,disabled:true});
  const box=stage.getBoundingClientRect(),machine=stage.querySelector('.m74-machine'),inner=machine.getBoundingClientRect(),controls=document.querySelector('.controls').getBoundingClientRect();
  report.cases.push({gameId:fixture.id,status,profile:machine.dataset.profile,verticalClip:Math.max(0,inner.bottom-box.bottom),horizontalOverflow:document.documentElement.scrollWidth>innerWidth,rightOverflow:Math.max(0,inner.right-box.right),controlsDoNotOverlap:controls.top>=box.bottom-1||controls.left>=box.right-1,multiplierWheel:!!stage.querySelector('.m74-multiplier-arc'),selectedMultiplier:stage.querySelector('.m74-multiplier-arc')?.dataset.selectedMultiplier??null});
 }
 for(const fixture of fixtures){
  const errors=[];
  MachineQa.renderMachine(stage,fixture.definition,null,{disabled:true});
  const playback=MachineQa.animateRound(stage,fixture.definition,null,fixture.round,{turbo:false,onError:error=>errors.push(error.message)});
  await new Promise(resolve=>setTimeout(resolve,5));playback.stop();playback.stop();
  const result=await playback.promise,stopped=stage.innerHTML,active=stage.classList.contains('m74-animating');
  MachineQa.renderMachine(stage,fixture.definition,fixture.round,{disabled:true});
  report.animations.push({gameId:fixture.id,resolved:result.cancelled===false,active,errors,confirmedMarkup:stopped===stage.innerHTML});
 }
 const fixture=fixtures.find(x=>x.id==='ind74_official_multihot10');
 MachineQa.renderMachine(stage,fixture.definition,null,{disabled:true});
 const animation=MachineQa.animateRound(stage,fixture.definition,null,fixture.round,{turbo:false});
 await new Promise(resolve=>setTimeout(resolve,30));animation.stop();animation.stop();await animation.promise;
 report.stop={resolved:true,profile:stage.querySelector('.m74-machine')?.dataset.profile,selectedMultiplier:stage.querySelector('.m74-multiplier-arc')?.dataset.selectedMultiplier??null,expectedMultiplier:String(fixture.round.outcome?.reelMultiplier??'')};
 report.failures=report.cases.filter(x=>x.profile!==x.gameId||x.verticalClip>1||x.horizontalOverflow||x.rightOverflow>1||!x.controlsDoNotOverlap);
 report.animationFailures=report.animations.filter(x=>!x.resolved||x.active||x.errors.length||!x.confirmedMarkup);
 report.pass=report.failures.length===0&&report.animationFailures.length===0&&report.animations.length===72&&report.pageErrors.length===0&&report.cases.length===144&&report.stop.selectedMultiplier===report.stop.expectedMultiplier;
}catch(error){report.failure=error.message;report.stack=error.stack;}
const result=document.createElement('pre');result.id='qa-result';result.textContent=JSON.stringify(report);document.body.append(result);document.documentElement.dataset.qaComplete='true';
})();`;
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><main><section class="machine"><div id="stage" class="machine-stage"></div><div class="controls"><button>Controls below stage</button></div></section></main><script>'+script.replaceAll('</script','<\\/script')+'</script></body></html>';
await mkdir(out,{recursive:true});
await writeFile(resolve(out,'request.json'),JSON.stringify({html,rejectRequestPattern:['.*'],actionTimeout:30000,waitForSelector:{selector:'html[data-qa-complete="true"]',timeout:30000}}));
console.log(JSON.stringify({prepared:true,games:fixtures.length,requestBytes:Buffer.byteLength(html),directory:out,financialRequests:0}));
