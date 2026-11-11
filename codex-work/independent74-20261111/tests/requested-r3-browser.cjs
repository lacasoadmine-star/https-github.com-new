const {createServer}=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(__dirname,'..');
async function main(){
 const {createGateway}=await import(path.join(root,'gateway.mjs'));
 const {listGameDefinitions}=await import(path.join(root,'math/requested72.mjs'));
 const definitions=listGameDefinitions();
 const assets=Object.fromEntries(fs.readdirSync(path.join(root,'client')).filter(n=>/\.(?:html|mjs|css)$/.test(n)).map(n=>['/'+n,{body:fs.readFileSync(path.join(root,'client',n),'utf8'),type:n.endsWith('.html')?'text/html':n.endsWith('.css')?'text/css':'application/javascript',etag:'"local-test-'+n+'"'}]));
 let oldAccountCalls=0;
 const route=createGateway({previous:{fetch(){oldAccountCalls++;return new Response('No account requests allowed',{status:403});}},games:definitions,assets,fetchImpl(){throw Error('No external requests allowed');}});
 const server=createServer(async(req,res)=>{try{const r=await route(new Request('http://127.0.0.1:'+server.address().port+req.url),{},{});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}catch(e){res.writeHead(500);res.end(e.message);}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!==(process.env.IND74_TEST_REMOTE_ORIGIN?new URL(process.env.IND74_TEST_REMOTE_ORIGIN).hostname:'127.0.0.1')){external.push(u.origin);return route.abort();}return route.continue();});
 const results=[],accountRequests=[];page.on('request',r=>{if(/\/api\/|\/v1\//.test(new URL(r.url()).pathname))accountRequests.push(new URL(r.url()).pathname);});

 try{
  await page.addInitScript(()=>{Object.defineProperty(crypto,'getRandomValues',{value:a=>{a.fill(0);return a;}});});
  const base=process.env.IND74_TEST_REMOTE_ORIGIN||'http://127.0.0.1:'+server.address().port;
  await page.goto(base+'/independent74/test72.html',{waitUntil:'domcontentloaded'});await page.locator('#sound-no').click();await page.locator('#turbo').check();
  async function select(title){const i=await page.locator('#games .game').evaluateAll((bs,t)=>bs.findIndex(b=>b.firstChild.textContent.replace(/^\d+\.\s*/, '')===t),title);assert(i>=0);await page.locator('#games .game').nth(i).click();}
  await select('Coin Miner');assert.equal(await page.locator('#mine-count').inputValue(),'1');assert.equal(await page.locator('[data-cell]').count(),25);
  await page.locator('#bet').fill('2');await page.locator('#play').click();assert(await page.locator('#mine-count').isDisabled());
  await page.locator('[data-cell="24"]').click();assert((await page.locator('.mine-stats').textContent()).includes('Next 1.02×'));
  await page.locator('#collect').click();assert((await page.locator('.round-summary').textContent()).includes('Return 1.96'));
  await page.locator('#mine-count').fill('12');await page.locator('#play').click();
  assert((await page.locator('.mine-stats').textContent()).includes('Mines 12'));
  await page.locator('[data-cell="24"]').click();await page.locator('#collect').click();
  for(const width of [360,430]){await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(root,'tests/artifacts/coinminer-r3-'+width+(process.env.IND74_TEST_REMOTE_ORIGIN?'-production':'')+'.png')});}
  await select('Speed Crash');await page.locator('#bet').fill('2');await page.locator('#target').fill('2.00');await page.locator('#play').click();await page.waitForFunction(()=>!document.querySelector('#play').disabled);
  assert((await page.locator('.round-summary').textContent()).includes('Return 4.00'));assert(await page.locator('#collect').isDisabled());
  const balance=await page.locator('#balance').textContent();await page.locator('#target').fill('1.00');await page.locator('#play').click();assert.equal(await page.locator('#balance').textContent(),balance);assert((await page.locator('#message').textContent()).includes('1.05'));
  await page.locator('#target').fill('1.05');await page.locator('#bet').fill('1');await page.locator('#play').click();await page.waitForFunction(()=>!document.querySelector('#play').disabled);assert((await page.locator('.round-summary').textContent()).includes('Return 1.05'));
  await page.screenshot({path:path.join(root,'tests/artifacts/speedcrash-r3'+(process.env.IND74_TEST_REMOTE_ORIGIN?'-production':'')+'.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(oldAccountCalls,0);assert.deepEqual(accountRequests,[]);
  const result={mode:'deterministic test points only',coinMiner:{cells:25,mineCountsTested:[1,12],stake2FirstSafeReturn:'1.96',settingsLockedDuringRound:true},speedCrash:{targetSelection:true,stake2Target2Return:'4.00',minimumTarget:1.05,invalidTargetNoDebit:true,manualCollectDisabled:true},accountRequests:0,pageErrors:0};
  fs.writeFileSync(path.join(root,'tests/artifacts/requested-r3-ui'+(process.env.IND74_TEST_REMOTE_ORIGIN?'-production':'')+'.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
