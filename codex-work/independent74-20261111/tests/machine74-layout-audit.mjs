// Pure local presentation audit: actual renderMachine + public server adapter
// fixtures. No HTTP game action, account ledger, provider or player funds.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,extname} from 'node:path';
import {createExistingLibrary74Adapter} from '../server/existing-library74-adapter.mjs';
import {listGameDefinitions} from '../math/official72.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=await import(pathToFileURL(runtime?join(runtime,'playwright/index.mjs'):'/opt/codex/cua_node/lib/node_modules/playwright/index.mjs').href);
const definitions=listGameDefinitions(),ids=definitions.map(game=>game.id),now=1700000000000;
assert.equal(ids.length,72);
const adapter=createExistingLibrary74Adapter({reviewedGameIds:ids,allowNewRounds:true,
 gameLimits:Object.fromEntries(ids.map(id=>[id,{maxBetMinor:'2000',maxWinMinor:'999999999999999'}]))});
const fixtures=[];
for(const full of definitions){
 const definition=adapter.definitions[full.id];
 if(full.id==='ind74_official_multihotwildways'){assert.equal(definition.ways,27);assert.equal(definition.paylines,undefined);assert.equal(definition.rows,3);assert.equal(definition.cols,3);}
 let state=adapter.start(full.id,{stakeMinor:'100'},()=>0,now).state;
 if(state.status==='active')state=adapter.expire(state,()=>0,state.expiresAt).state;
 assert.equal(state.status,'settled',full.id);
 const round=adapter.publicState(state,state.lastActionAt);
 assert.equal(round.status,'settled');assert.equal(round.private,undefined);
 fixtures.push({id:full.id,name:full.catalogName,family:full.family,definition,round});
}
const label=process.argv.find(value=>value.startsWith('--label='))?.slice(8)||'current';
assert.match(label,/^[a-z0-9-]+$/);
const recordOnly=process.argv.includes('--record-only');
const directory=join(root,'reports/current74-layout-audit');await mkdir(directory,{recursive:true});
const report={pass:false,environment:'Local actual renderMachine + public adapter fixtures; no financial HTTP or providers',
 fixtureStates:['ready','settled'],widths:[360,390,430,1280],gameCount:72,caseCount:576,playerWalletMutations:0,providerWagers:0,
 pageErrors:[],requests:[],records:[]};
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/audit'){
   res.writeHead(200,{'content-type':'text/html','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'"});
   res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/client/machines74.css"><link rel="stylesheet" href="/client/machine74-renderer.css"></head><body><main><section class="machine"><div id="stage" class="machine-stage"></div><div class="controls"><button>Controls below stage</button></div></section></main></body></html>');return;
  }
  if(!/^\/client\/[a-zA-Z0-9-]+\.(mjs|css)$/.test(path))throw Error('Unexpected local path');
  const body=await readFile(join(root,path));res.writeHead(200,{'content-type':extname(path)==='.css'?'text/css':'application/javascript'});res.end(body);
 }catch(error){res.writeHead(404);res.end(error.message);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.MACHINE74_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({reducedMotion:'reduce'});
page.on('pageerror',error=>report.pageErrors.push(error.message));
await page.route('**/*',route=>{
 const request=route.request(),url=new URL(request.url());
 report.requests.push({path:url.pathname,method:request.method(),local:url.origin===origin});
 if(url.origin!==origin||request.method()!=='GET')return route.abort();return route.continue();
});
try{
 await page.goto(origin+'/audit');
 for(const width of report.widths){
  await page.setViewportSize({width,height:900});
  const records=await page.evaluate(async({fixtures,width})=>{
   const {renderMachine}=await import('/client/machine74-renderer.mjs');
   const stage=document.querySelector('#stage'),records=[];
   for(const fixture of fixtures)for(const state of ['ready','settled']){
    renderMachine(stage,fixture.definition,state==='ready'?null:fixture.round,{reduced:true,disabled:true});
    const box=stage.getBoundingClientRect(),inner=stage.querySelector('.m74-machine').getBoundingClientRect();
    const controls=document.querySelector('.controls').getBoundingClientRect();
    records.push({id:fixture.id,name:fixture.name,family:fixture.family,width,state,
     stageHeight:box.height,contentHeight:inner.height,verticalClipPx:Math.max(0,inner.bottom-box.bottom),
     horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
     contentRightOverflowPx:Math.max(0,inner.right-box.right),
     controlsBelowStage:controls.top>=box.bottom-1,
     rows:fixture.definition.rows??null,columns:fixture.definition.cols??fixture.definition.columns??null,
     publicWays:fixture.definition.ways??null,waysLabelCorrect:!fixture.definition.ways||stage.querySelector('.m74-stage-strip')?.textContent.includes(fixture.definition.ways+' WAYS'),
     visibleSteps:stage.querySelectorAll('.m74-step').length});
   }
   return records;
  },{fixtures,width});
  report.records.push(...records);
 }
 report.failures=report.records.filter(row=>row.verticalClipPx>1||row.horizontalOverflow||row.contentRightOverflowPx>1||!row.controlsBelowStage||!row.waysLabelCorrect||row.id==='ind74_official_mineisland2'&&row.visibleSteps!==10);
 report.byFamily=Object.fromEntries([...new Set(fixtures.map(f=>f.family))].map(family=>[family,{cases:report.records.filter(row=>row.family===family).length,failures:report.failures.filter(row=>row.family===family).length,maxVerticalClipPx:Math.max(0,...report.records.filter(row=>row.family===family).map(row=>row.verticalClipPx))}]));
 report.pass=report.failures.length===0&&report.pageErrors.length===0&&report.requests.every(request=>request.local&&request.method==='GET')&&report.records.length===576;
 await writeFile(join(directory,label+'.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({pass:report.pass,cases:report.records.length,failures:report.failures.length,byFamily:report.byFamily,report:'reports/current74-layout-audit/'+label+'.json'}));
 if(!recordOnly){assert.deepEqual(report.pageErrors,[]);assert.equal(report.failures.length,0,'Some game content is clipped; see saved layout report.');assert.equal(report.records.length,576);assert(report.requests.every(request=>request.local&&request.method==='GET'));}
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
