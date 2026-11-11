// Isolated real-browser verification of the public demo UI and server credit
// engine. No production endpoints, player identities or account ledgers.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {handleDemo74Request,demo74Catalog} from '../server/demo74-worker.mjs';
import {getGameDefinition} from '../math/official72.mjs';
const wheelDefinition=getGameDefinition('ind74_official_wheelofdestiny');let target=0;const submitted=[];
const root=fileURLToPath(new URL('../',import.meta.url)),artifacts=join(root,'reports/current74-wheel-demo-ui');
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=await import(pathToFileURL(runtime?join(runtime,'playwright/index.mjs'):'/opt/codex/cua_node/lib/node_modules/playwright/index.mjs').href);
const data=new Map(),guard='a'.repeat(64);let queue=Promise.resolve();
const ctx={storage:{transaction(operation){const pending=queue.then(async()=>{const next=structuredClone(data),tx={get:async key=>structuredClone(next.get(key)),put:async(key,value)=>next.set(key,structuredClone(value))};const result=await operation(tx);data.clear();for(const[key,value]of next)data.set(key,value);return result;});queue=pending.catch(()=>{});return pending;}}};
let accountRequests=0,demoActions=0;
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');let response;
  if(url.pathname.startsWith('/independent74/account-api/')){accountRequests++;response=Response.json({error:'REAL_ACCOUNT_PROHIBITED'},{status:403});}
  else if(url.pathname.startsWith('/independent74/demo-api/')){
   const route=url.pathname.slice('/independent74/demo-api/'.length);
   if(route==='catalog')response=Response.json(demo74Catalog());
   else{let body='';for await(const chunk of req)body+=chunk;
    if(req.method==='POST'&&req.headers['x-demo-session-guard']!==guard)throw Error('Missing demo action guard');
    if(req.method==='POST'){demoActions++;submitted.push(JSON.parse(body));}
    response=await handleDemo74Request(ctx,new Request('http://demo.internal/independent74-demo-internal/'+route+url.search,{method:req.method,headers:{'x-demo-session-guard':guard,'content-type':'application/json'},...(body?{body}:{})}),{random:()=>target/2**53});
   }
  }else{
   const name=url.pathname.slice('/independent74/'.length);
   if(!url.pathname.startsWith('/independent74/')||!/^[-a-zA-Z0-9.]+$/.test(name))response=new Response('Not found',{status:404});
   else response=new Response(await readFile(resolve(root,'client',name)),{headers:{'content-type':name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'application/javascript'}});
  }
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){res.writeHead(500);res.end(error.message);}
});
await mkdir(artifacts,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
const report={pass:false,environment:'isolated localhost + actual demo credit server + Chromium',games:1,title:'Wheel Of Destiny',currency:'DEMO',playerWalletMutations:0,screenshots:[]};
try{
 await page.goto(base+'/independent74/machines74.html?mode=demo#ind74_official_wheelofdestiny');await page.waitForFunction(()=>!document.querySelector('#play').disabled);
 assert.equal(await page.locator('body').getAttribute('data-mode'),'demo');assert.equal(await page.locator('#play').textContent(),'SPIN');assert.equal(await page.locator('[data-sector]').count(),50);assert.equal(await page.locator('[data-wheel-symbol]').count(),9);assert.equal(await page.locator('[data-wheel-symbol="8"]').isDisabled(),false);
 assert.equal(await page.locator('#wheel-total-preview').textContent(),'TOTAL BET 1.00 DEMO');
 await page.locator('#play').click();await page.locator('#stop').waitFor({state:'visible'});await page.locator('#stop').evaluate(el=>{el.click();el.click();});await page.waitForFunction(()=>!document.querySelector('#play').disabled);assert.equal(await page.locator('#balance').textContent(),'9999.00');assert.equal(demoActions,1);
 await page.locator('[data-wheel-edit="clear"]').click();assert.equal(await page.locator('#play').isDisabled(),true);await page.locator('[data-wheel-symbol="0"]').click();await page.locator('[data-wheel-symbol="1"]').click();assert.equal(await page.locator('#wheel-total-preview').textContent(),'TOTAL BET 2.00 DEMO');
 target=wheelDefinition.sectors.findIndex(s=>s.symbolIndex===0);
 await page.locator('#play').click();await page.locator('#stop').waitFor({state:'visible'});await page.locator('#stop').evaluate(el=>{el.click();el.click();});await page.waitForFunction(()=>!document.querySelector('#play').disabled);assert.equal(await page.locator('#balance').textContent(),'10000.00');assert.equal(demoActions,2);
 assert.equal(submitted[1].stake,'2.00');assert.deepEqual(submitted[1].options.bets,[{symbolIndex:0,amountMinor:'100'},{symbolIndex:1,amountMinor:'100'}]);
 await page.locator('[data-wheel-edit="clear"]').click();await page.locator('[data-wheel-symbol="8"]').click();target=0;
 await page.locator('#play').click();await page.locator('[data-bonus-frame="0"]').waitFor();await page.locator('#stop').evaluate(el=>{el.click();el.click();});await page.waitForFunction(()=>!document.querySelector('#play').disabled);assert.equal(await page.locator('[data-bonus-frame]').getAttribute('data-bonus-frame'),'2');assert.equal(await page.locator('#balance').textContent(),'11199.00');assert.equal(demoActions,3);
 await page.locator('.history summary').click();await page.locator('#history li').nth(2).waitFor();assert.equal(await page.locator('#history li').count(),3);
 for(const width of [360,390,430,1280]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.locator('#stage').evaluate(stage=>stage.querySelector('.m74-machine').getBoundingClientRect().bottom<=stage.getBoundingClientRect().bottom+1));const file='settled-'+width+'.png';await page.screenshot({path:join(artifacts,file),fullPage:true});report.screenshots.push(file);}
 await page.locator('[data-wheel-edit="clear"]').click();await page.locator('[data-wheel-edit="all"]').click();assert.equal(await page.locator('#wheel-total-preview').textContent(),'TOTAL BET 9.00 DEMO');assert.equal(await page.locator('[data-wheel-symbol="8"]').isDisabled(),false);await page.locator('[data-wheel-edit="undo"]').click();assert.equal(await page.locator('#play').isDisabled(),true);
 await page.locator('#bet').fill('10.00');await page.locator('[data-wheel-symbol="0"]').click();await page.locator('[data-wheel-symbol="1"]').click();assert.equal(await page.locator('#play').isDisabled(),false);await page.locator('[data-wheel-symbol="2"]').click();assert.equal(await page.locator('#play').isDisabled(),true);assert((await page.locator('#wheel-total-preview').textContent()).includes('Above the current total-bet limit'));
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#play').disabled);assert.equal(await page.locator('#balance').textContent(),'11199.00');assert.equal(await page.locator('#wheel-total-preview').textContent(),'TOTAL BET 1.00 DEMO');assert.equal(demoActions,3);assert.equal(accountRequests,0);assert.deepEqual(errors,[]);
 report.pass=true;report.accountRequests=accountRequests;report.demoActions=demoActions;report.after='11199.00';report.pageErrors=errors;report.repeatedStopDoesNotAddAction=true;report.reloadRestoresServerAllocations=true;report.clientTotalCap=20;report.sourceBackedBonusReplayed=true;report.doubleStopDuringBonus=true;report.submitted=submitted;
}finally{await writeFile(join(artifacts,'report.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify(report));
