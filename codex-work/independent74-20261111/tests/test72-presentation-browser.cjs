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
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!==(process.env.IND74_TEST_REMOTE_ORIGIN?new URL(process.env.IND74_TEST_REMOTE_ORIGIN).hostname:'127.0.0.1')){external.push(u.origin);return route.abort();}return route.continue();});
 const results=[],accountRequests=[];page.on('request',r=>{if(/\/api\/|\/v1\//.test(new URL(r.url()).pathname))accountRequests.push(new URL(r.url()).pathname);});

 try{
  // Deterministic browser-only point fixtures. Never runs against account APIs.
  await page.addInitScript(()=>{let calls=0;Object.defineProperty(crypto,'getRandomValues',{value:array=>{array.fill(0);calls++;if(calls%21===0)array[1]=4;return array;}});});
  const base=process.env.IND74_TEST_REMOTE_ORIGIN||'http://127.0.0.1:'+server.address().port;
  await page.goto(base+'/independent74/test72.html',{waitUntil:'domcontentloaded'});
  await page.locator('#sound-yes').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.reel-column').count(),5);assert.equal(await page.locator('.reel-column .symbol').count(),20);
  assert.equal(await page.locator('.symbol svg').count(),20);
  await page.locator('#play').click();
  assert(await page.locator('#bet').isDisabled());assert(await page.locator('#bet-more').isDisabled());
  await page.locator('#stop').click();await page.waitForFunction(()=>!document.querySelector('#play').disabled);
  assert.equal(await page.locator('.win-label').getAttribute('data-tier'),'fantastic');assert((await page.locator('#balance').textContent()).includes('102,499.00'));
  await page.locator('#bet-more').click();assert.equal(await page.locator('#bet').inputValue(),'2');
  await page.locator('#play').click();await page.waitForFunction(()=>!document.querySelector('#play').disabled);
  assert((await page.locator('.round-summary').textContent()).includes('Bet 2.00'));assert((await page.locator('.round-summary').textContent()).includes('Return 5,000.00'));
  await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#history li').count(),2);
  for(const width of [360,430,1280]){
   await page.setViewportSize({width,height:width===1280?800:844});await page.evaluate(()=>scrollTo(0,0));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width);
   const file='multihot100-r2-'+width+(process.env.IND74_TEST_REMOTE_ORIGIN?'-production':'')+'.png';
   await page.screenshot({path:path.join(root,'tests/artifacts',file),fullPage:false});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(oldAccountCalls,0);assert.deepEqual(accountRequests,[]);
  const result={mode:'test points with explicit deterministic fixture',reelColumns:5,rows:4,stop:true,betControlsLockedDuringSpin:true,bet1Return:2500,bet2Return:5000,soundPromptAndToggle:true,widths:[360,430,1280],accountRequests:0,pageErrors:0,officialGraphicsAudioParity:false};
  fs.writeFileSync(path.join(root,'tests/artifacts/multihot100-r2-ui'+(process.env.IND74_TEST_REMOTE_ORIGIN?'-production':'')+'.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
