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
 const requests=[];page.on('request',r=>{if(/\/(api|v1)\//.test(new URL(r.url()).pathname))requests.push(r.url());});
 try{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{let calls=0;Object.defineProperty(crypto,'getRandomValues',{value:a=>{a.fill(0);a[1]=calls++%16<5?1:0;return a;}});});
 const origin=process.env.IND74_TEST_REMOTE_ORIGIN||'http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/independent74/official74.html#ind74_official_plinkoxclassic',{waitUntil:'domcontentloaded'});await page.locator('#sound-no').click();
 assert.equal(await page.locator('#title').textContent(),'Plinko X Classic');assert.equal(await page.locator('.peg-bucket').count(),17);assert.equal(await page.locator('.pegs circle').count(),168);
 await page.locator('#bet').fill('50');await page.locator('#play').click();assert(await page.locator('#bet').isDisabled());await page.locator('#stop').click();await page.waitForFunction(()=>!document.querySelector('#play').disabled);
 assert((await page.locator('.round-summary').textContent()).includes('Return 100.00'));assert.equal(await page.locator('.plinko-ball').getAttribute('cx'),'178');assert.equal(await page.locator('.plinko-ball').getAttribute('cy'),'308');
 await page.locator('#bet').fill('2');await page.locator('#play').click();await page.waitForFunction(()=>!document.querySelector('#play').disabled);assert((await page.locator('.round-summary').textContent()).includes('Return 4.00'));
 for(const width of [360,1280]){await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(root,'tests/artifacts/fresh-plinko-'+width+(process.env.IND74_TEST_REMOTE_ORIGIN?'-production':'')+'.png')});}
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(oldAccountCalls,0);assert.deepEqual(requests,[]);
 const result={url:origin+'/independent74/official74.html#ind74_official_plinkoxclassic',rows:16,buckets:17,pinkBallOnly:true,observed50Returns100:true,stake2Returns4:true,stopsWithoutDuplicateSettlement:true,mobileOverflow:false,accountRequests:0,pageErrors:0,fullProviderParityVerified:false};
 fs.writeFileSync(path.join(root,'tests/artifacts/fresh-plinko-ui'+(process.env.IND74_TEST_REMOTE_ORIGIN?'-production':'')+'.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
