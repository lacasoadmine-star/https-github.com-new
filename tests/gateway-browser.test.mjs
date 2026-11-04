import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {wrapPlayer} from '../deploy/cloudflare/player-compat.mjs';

const {chromium}=createRequire(import.meta.url)('playwright');
const gatewayScript=await readFile(new URL('../deploy/cloudflare/gateway-player.mjs',import.meta.url),'utf8');
const account={authenticated:false,identity:'isolated-browser-player',balance:'123.45',currency:'ETB',enabled:true};
let mutations=0;
const game={id:'multi_hot_5_video',title:'Multi Hot 5',name:'Multi Hot 5',slug:'multi-hot-5',enabled:true};
const original={async fetch(request){
 const path=new URL(request.url).pathname;
 if(path==='/api/slots/games')return Response.json({games:[game]});
 if(path==='/player-live-v244/presence.mjs')return new Response('',{headers:{'Content-Type':'text/javascript'}});
 if(path.startsWith('/play/'))return new Response('<!doctype html><h1>Isolated native engine</h1>',{headers:{'Content-Type':'text/html'}});
 return new Response('<!doctype html><nav class="drawer-navigation"></nav>',{headers:{'Content-Type':'text/html'}});
}};
const worker=wrapPlayer(original,{gatewayScript,GAMES:{[game.id]:game},sessionHeaders:headers=>headers,
 legacy:async()=>Response.json({...account})});
const server=createServer(async(req,res)=>{
 try{
  if(req.method==='POST')mutations++;
  const response=await worker.fetch(new Request('http://127.0.0.1:'+server.address().port+req.url,{method:req.method,headers:req.headers}),{});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){res.writeHead(500);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://demo.smartsoftgaming.com/**',route=>route.fulfill({status:404,contentType:'text/html',body:'Demo availability unverified'}));
 const base='http://127.0.0.1:'+server.address().port;
 await page.goto(base+'/gateway');
 await page.waitForFunction(()=>document.querySelectorAll('#demo-list .card').length===30);
 await page.waitForFunction(()=>document.getElementById('balance').textContent==='Soo gal');
 assert.equal(await page.locator('#native-list .card').count(),1);
 assert.equal(await page.locator('#play-etb').isDisabled(),true);
 assert.match(await page.locator('#category').innerText(),/aan la xaqiijin/);
 account.authenticated=true;account.balance='9007199254740991.99';
 await page.locator('#retry-wallet').click();await page.waitForFunction(()=>document.getElementById('balance').textContent.includes('.99 ETB'));
 assert.equal((await page.locator('#balance').innerText()).replaceAll(',',''),'9007199254740991.99 ETB');
 assert.equal(await page.locator('#play-etb').isDisabled(),true);
 await page.locator('#play-demo').click();await page.waitForFunction(()=>document.getElementById('game-frame').src.includes('/games/jetx'));
 assert.equal(mutations,0);
 await page.locator('#close-game').click();
 await page.locator('#search').fill('PlinkoX');assert.equal(await page.locator('#demo-list .card:visible').count(),1);
 await page.locator('#search').fill('');
 await page.locator('#native-list .card').click();await page.waitForFunction(()=>!document.getElementById('play-etb').disabled);
 assert.equal(await page.locator('#play-demo').isDisabled(),true);
 await page.locator('#play-etb').click();await page.waitForFunction(()=>document.getElementById('game-frame').src.includes('/play/multi-hot-5'));
 account.balance='321.00';
 const frame=page.frames().find(frame=>frame.url().includes('/play/multi-hot-5'));
 await frame.waitForSelector('h1');
 await frame.evaluate(()=>window.dispatchEvent(new CustomEvent('mh5:round')));
 await page.waitForFunction(()=>document.getElementById('balance').textContent==='321.00 ETB');
 await page.evaluate(()=>window.dispatchEvent(new Event('zplay:logout')));
 assert.equal(await page.locator('#balance').innerText(),'Soo gal');assert.equal(await page.locator('#play-etb').isDisabled(),true);
 assert.equal(await page.locator('#game-frame').isHidden(),true);
 for(const width of [320,390,760,1280]){
  await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow at '+width);
 }
 await page.goto(base+'/');assert.equal(await page.locator('a[href="/gateway"]').count(),1);
 assert.deepEqual(errors,[]);assert.equal(mutations,0);
 console.log('PASS: 30 entries, auth gating, exact money formatting, demo isolation, search, native launch, wallet refresh, logout, lobby link, four viewport widths, no JS errors or writes');
}finally{
 await browser?.close();await new Promise(resolve=>server.close(resolve));
}
