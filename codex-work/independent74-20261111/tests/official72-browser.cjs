const {createServer}=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(__dirname,'..');
async function main(){
 const {createGateway}=await import(path.join(root,'gateway.mjs'));
 const {listGameDefinitions}=await import(path.join(root,'math/official72.mjs'));
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
  await page.goto(process.env.IND74_TEST_REMOTE_ORIGIN?process.env.IND74_TEST_REMOTE_ORIGIN+'/independent74/official74.html':'http://127.0.0.1:'+server.address().port+'/independent74/official74.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#sound-no').click();await page.locator('#turbo').check();
  assert.equal(await page.locator('#games .game').count(),74);
  for(const d of definitions){
   const index=await page.locator('#games .game').evaluateAll((buttons,title)=>buttons.findIndex(b=>b.firstChild.textContent.replace(/^\d+\.\s*/, '')===title),d.catalogName);
   assert(index>=0,'Missing requested entry '+d.catalogName);await page.locator('#games .game').nth(index).click();
   await page.waitForFunction(title=>document.querySelector('#title').textContent===title,d.catalogName);
   if(d.family==='lobby'){assert(await page.locator('#play').isDisabled());results.push({name:d.catalogName,status:'navigation-no-wager'});continue;}
   await page.locator('#bet').fill('1');await page.locator('#play').click();
   await page.waitForFunction(()=>!document.querySelector('#stop').disabled);
   await page.waitForTimeout(110);
   for(let i=0;i<4&&await page.locator('#play').isDisabled();i++){
    if(await page.locator('#collect').isEnabled())await page.locator('#collect').evaluate(button=>{if(!button.disabled)button.click();});
    else {const cell=page.locator('#stage [data-cell]:enabled').first();if(await cell.count())await cell.click();else await page.waitForTimeout(100);}
   }
   await page.waitForFunction(()=>!document.querySelector('#play').disabled,undefined,{timeout:3000});
   const message=await page.locator('#message').textContent();
   assert(!/invalid|outside|not implemented|not wagerable|cannot|missing engine/i.test(message),d.catalogName+': '+message);
   results.push({name:d.catalogName,family:d.family,status:'test-round-completed'});if(results.length%20===0)console.log(JSON.stringify({completed:results.length}));
  }
  assert.equal(errors.length,0,errors.join('; '));assert.equal(external.length,0);assert.equal(oldAccountCalls,0);assert.equal(accountRequests.length,0);
  const artifact=path.join(root,'tests/artifacts');fs.mkdirSync(artifact,{recursive:true});
  fs.writeFileSync(path.join(artifact,process.env.IND74_TEST_REMOTE_ORIGIN?'official72-browser-production-testpoints.json':'official72-browser.json'),JSON.stringify({mode:process.env.IND74_TEST_REMOTE_ORIGIN?'deployed test points only; no real money':'isolated local test points only',accountRequests,entries:74,protectedEntries:2,wagerModelsTested:72,lobbies:0,oldAccountCalls,externalRequests:external,pageErrors:errors,officialVisualEquivalenceVerified:false,productionLedgerVerified:false,results},null,2));
  await page.screenshot({path:path.join(artifact,process.env.IND74_TEST_REMOTE_ORIGIN?'official72-production-testbench-mobile.png':'official72-testbench-mobile.png'),fullPage:true});
  console.log(JSON.stringify({requestedEntries:74,wagerModelBrowserRounds:72,lobby:0,pageErrors:errors.length,accountCalls:oldAccountCalls,externalCalls:external.length}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
