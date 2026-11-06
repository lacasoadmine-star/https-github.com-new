// Local-only presentation QA; all catalogue/account responses are disposable fixtures.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {installNativeCatalog,PREFIX} from '../worker/native-catalog.mjs';
import {assets} from '../worker/native-catalog-assets.mjs';
const {chromium}=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/entry.js')('playwright');
const fixture=JSON.parse(await readFile(new URL('./live-catalog.fixture.json',import.meta.url),'utf8'));
const out=process.argv[2]||'/workspace/work/native-catalog/browser';await mkdir(out,{recursive:true});
const calls=[],results=[];let saved=['hot-777','multi_hot_5_native'],ignoreNativeWrite=false;
const html=signed=>`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/player-portal-20261106-r9/portal.css"><link rel="stylesheet" href="/player-portal-20261106-r9/surfaces.css"><script type="module" src="/player-portal-20261106-r9/portal.mjs"></script></head><body><div id="root"><div class="app player"><header class="player-header ${signed?'signed-in-header':''}">${signed?'<span class="balance-chip">123.45</span>':'<button class="login-button" onclick="window.loginOpened=true">Login</button>'}</header><main class="player-main"><section class="fixture-original">Existing original player surface</section></main><nav class="bottom-nav"><button class="active">Home</button><button>Games</button><button>Account</button></nav></div></div><script>for(const button of document.querySelectorAll('.bottom-nav button'))button.onclick=()=>{for(const b of document.querySelectorAll('.bottom-nav button'))b.classList.toggle('active',b===button);document.querySelector('.fixture-original').classList.toggle('account-page',button.textContent==='Account');document.querySelector('.fixture-original').textContent='Existing original player surface'};</script></body></html>`;
const previous={async fetch(request){const url=new URL(request.url);if(url.pathname==='/')return new Response(html(url.searchParams.has('signed')),{headers:{'Content-Type':'text/html'}});if(url.pathname==='/api/config')return Response.json(fixture);if(url.pathname==='/api/favourites'){calls.push({path:url.pathname,method:request.method});if(request.method==='POST'){const body=await request.json();calls.at(-1).body=body;if(ignoreNativeWrite&&body.game.endsWith('_native'))return Response.json(saved);saved=saved.filter(id=>id!==body.game);if(body.enabled)saved.push(body.game);}return Response.json(saved);}if(url.pathname.startsWith('/player-portal-20261106-r9/')){const name=url.pathname.split('/').at(-1);if(!['portal.css','surfaces.css','cover-art.mjs'].includes(name))return new Response('not found',{status:404});return new Response(await readFile(new URL('../portal/'+name,import.meta.url)),{headers:{'Content-Type':name.endsWith('.css')?'text/css':'application/javascript'}});}if(url.pathname.startsWith('/games/'))return new Response('Local launch '+url.pathname);return new Response('',{status:404});}};
const worker=installNativeCatalog(previous,assets);
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const request=new Request('http://127.0.0.1'+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});const response=await worker.fetch(request,{PORTAL:'player'},{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(error){res.writeHead(500);res.end(String(error));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
function check(label,condition){assert.ok(condition,label);results.push({label,pass:true});}
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base);await page.waitForFunction(()=>window[Symbol.for('zplay.portal.reference.r9')]?.diagnostics().loaded);
  check(width+' home shows new2 plus all previous6 cards',await page.locator('.portal-r9-card-open').count()===8);
  check(width+' new labels appear on both new cards',await page.locator('.portal-r9-grid .portal-native-new').count()===2);
  check(width+' covers preserve original aspect ratio',await page.locator('[data-native-machine=true]>img').first().evaluate(img=>getComputedStyle(img).objectFit==='contain'));
  await page.getByRole('button',{name:'Games',exact:true}).click();
  await page.waitForFunction(()=>window[Symbol.for('zplay.portal.reference.r9')]?.diagnostics().surface==='games'&&document.querySelectorAll('.portal-r9-card-open').length===59);
  check(width+' all59 entries visible in Games',await page.locator('.portal-r9-card-open').count()===59);
  for(const [id,title,reels,lines]of [['foxy_hot_20_native','Foxy Hot 20',5,20],['multi_hot_5_native','Multi Hot 5',3,5]]){
   await page.locator('.portal-r9-card-open[data-game="'+id+'"]').click();
   check(width+' '+id+' opens distinct new route',await page.locator('.portal-r9-sheet-play').getAttribute('href')==='/games/'+id);
   await page.getByRole('button',{name:'Game details',exact:true}).click();
   const details=await page.locator('.portal-r9-game-details').innerText();check(width+' '+id+' accurate details',details.includes(title)&&details.includes('Reels: '+reels)&&details.includes('Lines: '+lines));
   await page.getByRole('button',{name:'Close game details',exact:true}).click();
  }
  for(const id of ['multi_hot_5_video','hot_foxy_20','wild_multi_stars','multi_hot_100']){await page.locator('.portal-r9-card-open[data-game="'+id+'"]').click();check(width+' old '+id+' launch preserved',await page.locator('.portal-r9-sheet-play').getAttribute('href')==='/games/'+id);await page.getByRole('button',{name:'Close game details',exact:true}).click();}
  await page.locator('#portal-r9-search').fill('Multi Hot 5');check(width+' search returns old and new MH5',await page.locator('.portal-r9-card-open').count()===2);await page.locator('#portal-r9-search').fill('');
  await page.locator('[data-category="Slots"]').click();check(width+' Slots includes two new cabinets',await page.locator('.portal-r9-grid .portal-native-new').count()===2);
  await page.locator('[data-provider="ZPLAY"]').click();check(width+' provider filter includes two new cabinets',await page.locator('.portal-r9-grid .portal-native-new').count()===2);
  await page.locator('.portal-r9-card-open[data-game="foxy_hot_20_native"]').click();await page.locator('.portal-r9-sheet-favourite').click();
  check(width+' guest favourite opens original login without API write',await page.evaluate(()=>window.loginOpened===true)&&!calls.some(c=>c.method==='POST'));
  await page.getByRole('button',{name:'Account',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#portal-r9-gallery'));check(width+' account surface retained',await page.locator('.fixture-original.account-page').innerText()==='Existing original player surface');
  await page.getByRole('button',{name:'Games',exact:true}).click();await page.waitForSelector('.portal-r9-card-open');await page.screenshot({path:out+'/catalog-'+width+'.png',fullPage:true});
  check(width+' no browser exceptions',errors.length===0);await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:900}}),page=await context.newPage();await page.goto(base+'/?signed');await page.waitForFunction(()=>window[Symbol.for('zplay.portal.reference.r9')]?.diagnostics().loaded);await page.getByRole('button',{name:'Games',exact:true}).click();await page.waitForFunction(()=>window[Symbol.for('zplay.portal.reference.r9')]?.diagnostics().surface==='games');await page.locator('[data-view="saved"]').click();
 await page.waitForFunction(()=>document.querySelector('.portal-r9-count').textContent==='2 games');
 check('signed-in saved keys distinguish old and native MH5',await page.locator('.portal-r9-card-open[data-game="multi_hot_5_native"]').count()===1&&await page.locator('.portal-r9-card-open[data-game="multi_hot_5_video"]').count()===1);
 await page.locator('[data-view="all"]').click();await page.locator('.portal-r9-card-open[data-game="foxy_hot_20_native"]').click();await page.locator('.portal-r9-sheet-favourite').click();await page.waitForFunction(()=>document.querySelector('.portal-r9-sheet-favourite').getAttribute('aria-pressed')==='true');
 check('new favourite posts exact new ID',calls.some(c=>c.method==='POST'&&c.body.game==='foxy_hot_20_native'&&c.body.enabled));
 ignoreNativeWrite=true;await page.locator('.portal-r9-sheet-favourite').click();await page.waitForFunction(()=>document.querySelector('.portal-r9-sheet-status').textContent.includes('could not be updated'));check('ignored native favourite write keeps real saved state and shows failure',await page.locator('.portal-r9-sheet-favourite').getAttribute('aria-pressed')==='true'&&await page.evaluate(()=>JSON.parse(localStorage.getItem('zplaybet.saved.v217')).includes('foxy_hot_20_native')));
 await page.locator('.portal-r9-sheet-play').click();check('native Play Now navigates new path',new URL(page.url()).pathname==='/games/foxy_hot_20_native');await context.close();
 await writeFile(out+'/results.json',JSON.stringify({checks:results,calls,scope:'Local disposable account; no production writes.'},null,2)+'\n');console.log(JSON.stringify({checks:results.length,pass:true,output:out}));
}finally{await browser.close();server.close();}
