// Isolated real-browser verification of the public demo UI and server credit
// engine. No production endpoints, player identities or account ledgers.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {handleDemo74Request,demo74Catalog} from '../server/demo74-worker.mjs';
import {entries} from '../client/official74-data.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),artifacts=join(root,'reports/current74-demo-ui');
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
    if(req.method==='POST')demoActions++;
    response=await handleDemo74Request(ctx,new Request('http://demo.internal/independent74-demo-internal/'+route+url.search,{method:req.method,headers:{'x-demo-session-guard':guard,'content-type':'application/json'},...(body?{body}:{})}),{random:()=>0});
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
const report={pass:false,environment:'isolated localhost + actual demo credit server + Chromium',games:72,entryButtons:74,currency:'DEMO',playerWalletMutations:0,screenshots:[]};
try{
 await page.goto(base+'/independent74/compare74.html?qa=1');await page.locator('.card').nth(73).waitFor();
 assert.equal(await page.locator('.card-play-now').count(),74);assert.equal(await page.locator('.card-play-demo').count(),74);assert.equal(await page.locator('.card-select').count(),74);
 assert.equal(await page.locator('button a,a button').count(),0);
 for(const game of entries){const card=page.locator('.card[data-game-id="'+game.gameId+'"]');
  const now=await card.locator('.card-play-now').getAttribute('href'),demo=await card.locator('.card-play-demo').getAttribute('href');
  if(!game.protected){assert(now.endsWith('#'+game.gameId));assert(!now.includes('mode=demo'));assert(demo.includes('?mode=demo#'+game.gameId));}
  else{assert.equal(now,game.gameId.endsWith('multihot5')?'/games/multi_hot_5_video':'/games/hot_foxy_20');assert(demo.includes('ssgportal.com'));assert(demo.includes('DEMO'));}
 }
 for(const width of [360,390,430,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const file='gallery-'+width+'.png';await page.screenshot({path:join(artifacts,file)});report.screenshots.push(file);}
 await page.goto(base+'/independent74/machines74.html?mode=demo#ind74_official_rollx');await page.waitForFunction(()=>!document.querySelector('#play').disabled);
 assert.equal(await page.locator('body').getAttribute('data-mode'),'demo');assert.equal(await page.locator('[data-currency]').allTextContents().then(x=>x.join(',')),'DEMO,DEMO');
 assert((await page.locator('#win-label').textContent()).includes('DEMO'));assert.equal(await page.locator('#balance').textContent(),'10000.00');
 assert.equal(await page.locator('.m74-rollx-dial').count(),1);assert.equal(await page.locator('#play').textContent(),'SPIN');
 await page.locator('#bet').fill('1.00');await page.locator('#play').click();await page.locator('#stop').waitFor({state:'visible'});
 assert.equal(await page.locator('.m74-rollx-readout').evaluate(el=>getComputedStyle(el).visibility),'hidden');
 await page.locator('#stop').evaluate(el=>{el.click();el.click();});await page.waitForFunction(()=>!document.querySelector('#play').disabled);
 const balance=await page.locator('#balance').textContent();assert.equal(balance,'10000.92');assert.equal(await page.locator('.m74-rollx-readout>span').textContent(),'WON');
 await page.locator('.history summary').click();await page.locator('#history li').waitFor();assert((await page.locator('#history li').textContent()).includes('DEMO'));assert(!(await page.locator('#history li').textContent()).includes('ETB'));
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#play').disabled);assert.equal(await page.locator('#balance').textContent(),balance);assert.equal(demoActions,1);
 for(const width of [360,390,430,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.locator('#stage').evaluate(stage=>stage.querySelector('.m74-machine').getBoundingClientRect().bottom<=stage.getBoundingClientRect().bottom+1));await page.evaluate(()=>scrollTo(0,0));const file='rollx-demo-'+width+'.png';await page.screenshot({path:join(artifacts,file),fullPage:true});report.screenshots.push(file);}
 await page.locator('#rules').click();assert(!(await page.locator('#rules-body').textContent()).includes(' ETB'));assert((await page.locator('#rules-body').textContent()).includes('DEMO'));await page.locator('#close-rules').click();
 assert.equal(accountRequests,0);assert.deepEqual(errors,[]);report.pass=true;report.accountRequests=accountRequests;report.demoActions=demoActions;report.after=balance;report.pageErrors=errors;report.repeatedStopSettlementOnce=true;report.reloadRecovered=true;
}finally{await writeFile(join(artifacts,'report.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify(report));
