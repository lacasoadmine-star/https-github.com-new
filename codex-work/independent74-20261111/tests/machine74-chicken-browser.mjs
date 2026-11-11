// Local rendering proof only: no server API, provider browser or wallet actions.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {machineMarkup} from '../client/machine74-renderer.mjs';
const require=createRequire(import.meta.url),{chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright');
const id='ind74_official_chickenhighway',d=math.getGameDefinition(id),view=publicLibrary74Definition(d);
const active=math.publicRound(math.startRound({gameId:id,betMinor:'100',rng:()=>0}));
const settled=math.publicRound(math.collectRound(math.startRound({gameId:id,betMinor:'100',rng:()=>0})));
const lost=math.publicRound(math.startRound({gameId:id,betMinor:'100',rng:n=>n-1}));
const css=(await Promise.all(['client/machines74.css','client/machine74-renderer.css'].map(p=>fs.readFile(p,'utf8')))).join('\n');
const dir='reports/current74-chicken-browser';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const report={createdAt:new Date().toISOString(),pass:false,gameId:id,modelVersion:d.mathVersion,officialDemoRounds:0,playerWalletMutations:0,checks:[]};
try{
 for(const width of [360,390,430,1280]){
  const page=await browser.newPage({viewport:{width,height:800},reducedMotion:'reduce'});
  for(const [state,round] of [['ready',null],['active',active],['collected',settled],['lost',lost]]){
   await page.setContent('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+css+'body{margin:0;padding:12px;box-sizing:border-box;background:#101a15}main{width:100%;max-width:900px;margin:auto}</style><main>'+machineMarkup(view,round)+'</main>');
   const check=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth,lanes:document.querySelectorAll('.m74-highway-lane').length,enabled:[...document.querySelectorAll('.m74-highway-target:enabled')].map(b=>b.dataset.m74Cell),carAnimation:getComputedStyle(document.querySelector('.m74-highway-car')).animationName,road:document.querySelector('.m74-highway').getBoundingClientRect().toJSON()}));
   assert(check.bodyWidth<=width,'No document horizontal overflow');assert(check.lanes>0&&check.lanes<=7);
   assert.equal(check.carAnimation,'none');assert.deepEqual(check.enabled,state==='active'?['1']:[]);
   assert(check.road.x>=0&&check.road.right<=width);await page.screenshot({path:dir+'/'+width+'-'+state+'.png',fullPage:true});
   report.checks.push({width,state,...check});
  }await page.close();
 }
 const bundled=await build({entryPoints:['client/machine74-renderer.mjs'],bundle:true,write:false,format:'esm',platform:'browser'});
 const rendererUrl='data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64');
 const page=await browser.newPage({viewport:{width:390,height:800}});
 await page.setContent('<!doctype html><style>'+css+'</style><div id="stage" class="machine-stage"></div>');
 const stopProof=await page.evaluate(async({view,round,rendererUrl})=>{
   const renderer=await import(rendererUrl),stage=document.querySelector('#stage'),before=JSON.stringify(round),actions=[],cues=[];
   const animation=renderer.animateRound(stage,view,null,round,{onAction:a=>actions.push(a),audio:{cue:x=>cues.push(x)}});
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   animation.stop();animation.stop();await animation.promise;
   return {immutable:JSON.stringify(round)===before,actions:actions.length,chickenLane:stage.querySelector('.m74-highway-chicken')?.getAttribute('aria-label'),lanes:stage.querySelectorAll('.m74-highway-lane').length,hasAnimation:stage.classList.contains('m74-animating')};
 },{view,round:active,rendererUrl});
 assert.equal(stopProof.immutable,true);assert.equal(stopProof.actions,0);assert.equal(stopProof.hasAnimation,false);assert.equal(stopProof.chickenLane,'Chicken at lane 1');
 report.repeatedStop=stopProof;await page.close();report.pass=true;
}finally{await browser.close();await fs.writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,modelVersion:report.modelVersion,officialDemoRounds:0,playerWalletMutations:0}));
