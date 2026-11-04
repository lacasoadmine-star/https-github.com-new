import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {wrapPlayer} from '../deploy/cloudflare/player-compat.mjs';
import {integrateLobbyScript} from '../deploy/cloudflare/integrated-lobby.mjs';
const {chromium}=createRequire(new URL('../apps/native-engine/package.json',import.meta.url))('playwright');
const html=await readFile(new URL('./fixtures/live-lobby-v244.html',import.meta.url),'utf8');
const css=await readFile(new URL('./fixtures/live-lobby-v244.css',import.meta.url),'utf8');
const lobbyScript=integrateLobbyScript(await readFile(new URL('./fixtures/live-lobby-v244.mjs',import.meta.url),'utf8'));
const account={authenticated:false,identity:'isolated-browser-player',balance:'123.45',currency:'ETB',enabled:true};
let mutations=0;
const GAMES={multi_hot_5_video:{id:'multi_hot_5_video',title:'Multi Hot 5',slug:'multi-hot-5',enabled:true},hot_foxy_20:{id:'hot_foxy_20',title:'Foxy Hot 20',slug:'hot-foxy-20',enabled:true},safari_simba:{id:'safari_simba',title:'Safari Simba',slug:'safari-simba',enabled:true}};
const original={async fetch(request){
 const path=new URL(request.url).pathname;
 if(path==='/api/slots/games')return Response.json({games:Object.values(GAMES)});
 if(path==='/api/slots/originals/session')return Response.json({...account});
 if(path==='/player-live-v244/presence.mjs')return new Response('',{headers:{'Content-Type':'text/javascript'}});
 if(path==='/player-live-v244/lobby.css')return new Response(css,{headers:{'Content-Type':'text/css'}});
 if(path.endsWith('.webp'))return new Response(null,{status:204,headers:{'Content-Type':'image/webp'}});
 if(path.startsWith('/play/'))return new Response('<!doctype html><h1>Isolated native engine</h1>',{headers:{'Content-Type':'text/html'}});
 return new Response(html,{headers:{'Content-Type':'text/html'}});
}};
const worker=wrapPlayer(original,{lobbyScript,GAMES,sessionHeaders:headers=>headers,legacy:async()=>Response.json({...account})});
const server=createServer(async(req,res)=>{
 try{
  if(req.method==='POST')mutations++;
  const response=await worker.fetch(new Request('http://127.0.0.1:'+server.address().port+req.url,{method:req.method,headers:req.headers}),{});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){res.writeHead(500);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://demo.smartsoftgaming.com/**',route=>route.fulfill({status:404,contentType:'text/html',body:'Demo availability unverified'}));
 const base='http://127.0.0.1:'+server.address().port;
 await page.goto(base+'/');await page.waitForFunction(()=>document.querySelectorAll('#game-grid .game-tile').length===33);
 assert.equal(await page.title(),'ZPLAYBET · Casino');
 assert.deepEqual(await page.locator('#game-grid .game-tile').evaluateAll(nodes=>nodes.slice(0,3).map(n=>n.dataset.game)),Object.keys(GAMES));
 assert.equal(await page.locator('#provider-count').innerText(),'3');assert.equal(await page.locator('#smartsoft-count').innerText(),'30');
 await page.locator('[data-game="jetx"] .game-preview').click();
 await page.waitForFunction(()=>document.getElementById('play-label').textContent==='Sign in to play');assert.equal(await page.locator('#play').getAttribute('href'),'/account?view=login');assert.equal(await page.locator('#play-demo').getAttribute('aria-disabled'),null);
 await page.locator('#play-demo').click();await page.waitForFunction(()=>document.getElementById('demo-player').open);
 assert.equal(new URL(page.url()).pathname,'/');assert.match(await page.locator('#embedded-demo').getAttribute('src'),/games\/jetx$/);
 assert.match(await page.locator('.embedded-note').innerText(),/aan la xaqiijin/);assert.equal(mutations,0);
 await page.locator('#close-demo').click();assert.equal(await page.locator('#embedded-demo').getAttribute('src'),null);
 await page.locator('[data-provider="internal"]').click();assert.equal(await page.locator('.game-tile').count(),30);
 await page.locator('[data-filter="crash"]').click();assert.equal(await page.locator('.game-tile').count(),7);
 await page.goto(base+'/?provider=zplaybet');await page.waitForFunction(()=>document.querySelectorAll('.game-tile').length===3);
 await page.locator('[data-game="multi_hot_5_video"] .game-preview').click();
 await page.waitForFunction(()=>document.getElementById('play-label').textContent==='Sign in to play');
 assert.equal(await page.locator('#play-demo').getAttribute('aria-disabled'),'true');
 account.authenticated=true;account.balance='9007199254740991.99';await page.evaluate(()=>window.dispatchEvent(new Event('zplay:session-ready')));
 await page.waitForFunction(()=>document.getElementById('play-label').textContent==='PLAY (ETB)');
 assert.equal(await page.locator('#play').getAttribute('href'),'/play/multi-hot-5');
 await page.locator('#close-detail').click();await page.goto(base+'/');await page.waitForFunction(()=>document.querySelectorAll('.game-tile').length===33);await page.locator('[data-game=jetx] .game-preview').click();await page.waitForFunction(()=>document.getElementById('play-label').textContent==='PLAY (ETB)');assert.equal(await page.locator('#play').getAttribute('href'),'/native/jetx');
 assert.equal((await page.locator('#account-balance').innerText()).replaceAll(',',''),'9007199254740991.99 ETB');
 await page.evaluate(()=>window.dispatchEvent(new Event('zplay:logout')));assert.equal(await page.locator('#account-balance').innerText(),'');
 assert.equal(await page.locator('#play-label').innerText(),'Sign in to play');await page.locator('#close-detail').click();
 await page.goto(base+'/');await page.waitForFunction(()=>document.querySelectorAll('.game-tile').length===33);
 await page.locator('#search').fill('PlinkoX');assert.equal(await page.locator('.game-tile').count(),1);
 await page.locator('#search').fill('');await page.locator('[data-game="jetx"] .tile-favourite').click();
 await page.locator('#saved-tab').click();assert.equal(await page.locator('.game-tile').count(),1);
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.game-tile').length===1);assert.equal(await page.locator('.game-tile').getAttribute('data-game'),'jetx');
 await page.goto(base+'/');await page.waitForFunction(()=>document.querySelectorAll('.game-tile').length===33);
 for(const width of [320,390,760,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow at '+width);}
 await page.goto(base+'/gateway');assert.equal(new URL(page.url()).pathname,'/');await page.waitForFunction(()=>document.querySelectorAll('.game-tile').length===33);
 assert.deepEqual(errors,[]);assert.equal(mutations,0);
 console.log('PASS: original lobby, 33 tiles, native order and auth, same-page demo, provider/category filters, exact wallet, logout, search, saved games/reload, gateway redirect, four viewport widths, no JS errors or writes');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
