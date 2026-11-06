// Isolated presentation proof: actual Chromium, original assets, no wager API.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=fileURLToPath(new URL('../public/',import.meta.url)),out=process.argv[2]||'/workspace/work/r13-startup-proof';await mkdir(out,{recursive:true});
const errors=[],apiRequests=[],checks=[];
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){apiRequests.push(url.pathname);res.writeHead(500).end();return;}
 if(url.pathname==='/fixture'){
  let html=await readFile(root+'index.html','utf8');html=html.replace('{{GAME}}',url.searchParams.get('game')).replace(/<script type="module"[^>]*src=[^>]*><\/script>/g,'').replace(/\/zplay-machines-[^/]+\//g,'/');
  res.setHeader('Content-Type','text/html');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'");res.end(html);return;
 }
 const name=basename(url.pathname),bytes=await readFile(root+name);res.setHeader('Content-Type',/\.(mjs|js)$/.test(name)?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.gif')?'image/gif':'application/octet-stream');res.end(bytes);
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 for(const game of ['hot_foxy_20','multi_hot_5_video']){
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/fixture?game='+game);
  await page.waitForFunction(()=>window.__officialStartupGuard);
  assert.equal(await page.locator('#official-startup').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.querySelector('#machine').inert),true);
  assert.ok(await page.evaluate(()=>getComputedStyle(document.querySelector('.official-loader-logo')).backgroundImage.includes('official-startup-logo.gif')));
  await page.screenshot({path:out+'/'+game+'-first-paint.png'});
  await page.evaluate(async game=>{
   localStorage.removeItem('zplay:sound-choice');document.body.dataset.state='loading';globalThis.choices=[];globalThis.audioConstructors=0;globalThis.AudioContext=class{constructor(){audioConstructors++;}};
   const {createOfficialStartup}=await import('/official-startup.mjs');globalThis.makeStartup=()=>createOfficialStartup({document,gameId:game,onSoundChoice:async value=>{choices.push(value);localStorage.setItem('zplay:sound-choice',value?'yes':'no');await new Promise(resolve=>setTimeout(resolve,20));}});
   globalThis.startup=makeStartup();startup.begin();await startup.ready;
   globalThis.nativePending=new Promise(resolve=>globalThis.releaseNative=resolve);globalThis.startupDone=startup.complete([Promise.resolve(),nativePending]);
  },game);
  await page.waitForFunction(()=>startup.diagnostics().progress>0);
  assert.equal(await page.evaluate(()=>document.querySelector('#machine').inert),true);
  assert.equal(await page.evaluate(()=>startup.askSound()),false);
  const clip=await page.locator('.official-loader-logo').boundingBox();
  await page.waitForTimeout(300);const frame1=await page.screenshot({clip});await page.waitForTimeout(800);const frame2=await page.screenshot({clip});
  assert.notEqual(createHash('sha256').update(frame1).digest('hex'),createHash('sha256').update(frame2).digest('hex'),'original GIF changes frames');
  await page.screenshot({path:out+'/'+game+'-loader.png'});
  await page.evaluate(()=>releaseNative());assert.equal(await page.evaluate(()=>startupDone),true);
  assert.equal(await page.evaluate(()=>document.querySelector('#machine').inert),false);
  assert.equal(await page.evaluate(()=>document.querySelector('#official-startup').hidden),true);
  await page.evaluate(()=>document.body.dataset.state='ready');assert.equal(await page.evaluate(()=>startup.askSound()),true);
  await page.screenshot({path:out+'/'+game+'-sound.png'});
  const style=await page.evaluate(()=>({text:document.querySelector('#sound-question').textContent,font:getComputedStyle(document.querySelector('#sound-question')).fontFamily,rect:document.querySelector('#sound-consent').getBoundingClientRect().toJSON()}));
  assert.equal(style.text,'Would you like sound?');assert.ok(style.font.includes('Official Startup'));assert.equal(style.rect.height,190);assert.equal(style.rect.top,340);
  await page.evaluate(()=>{document.querySelector('#sound-yes').click();document.querySelector('#sound-yes').click();});
  await page.waitForFunction(()=>!document.querySelector('#sound-consent').open);
  assert.deepEqual(await page.evaluate(()=>choices),[true]);assert.equal(await page.evaluate(()=>startup.diagnostics().choiceCalls),1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('zplay:sound-choice')),'yes');assert.equal(await page.evaluate(()=>audioConstructors),0);
  assert.equal(await page.evaluate(()=>startup.askSound()),false);
  await page.evaluate(async()=>{startup.destroy();localStorage.removeItem('zplay:sound-choice');startup=makeStartup();startup.begin();await startup.complete([]);await startup.askSound();});
  await page.click('#sound-no');await page.waitForFunction(()=>!document.querySelector('#sound-consent').open);
  assert.deepEqual(await page.evaluate(()=>choices),[true,false]);assert.equal(await page.evaluate(()=>localStorage.getItem('zplay:sound-choice')),'no');
  await page.evaluate(()=>{startup.begin();globalThis.cancelledDone=startup.complete([new Promise(()=>{})]);document.body.dataset.state='error';});
  assert.equal(await page.evaluate(()=>cancelledDone),false);assert.equal(await page.evaluate(()=>document.querySelector('#official-startup').hidden),true);assert.equal(await page.evaluate(()=>document.querySelector('#machine').inert),false);
  await page.evaluate(()=>{document.body.dataset.state='loading';startup.begin();globalThis.previousDone=startup.complete([new Promise(()=>{})]);startup.begin();});
  assert.equal(await page.evaluate(()=>previousDone),false);assert.equal(await page.evaluate(()=>startup.complete([])),true);
  await page.evaluate(()=>{document.querySelector('#machine').inert=true;startup.begin();globalThis.destroyedDone=startup.complete([new Promise(()=>{})]);startup.destroy();});
  assert.equal(await page.evaluate(()=>destroyedDone),false);assert.equal(await page.evaluate(()=>document.querySelector('#machine').inert),true);assert.equal(await page.locator('#official-startup').count(),0);
  checks.push({game,firstPaintBeforeModule:true,gifAnimated:true,readinessGate:true,noEarlyPrompt:true,nativeFontAndGeometry:true,yesOnce:true,noPersists:true,noAudioPlayer:true,fatalUncovered:true,retryCancels:true,destroyCancels:true,inertRestored:true});await page.close();
 }
 for(const game of ['multi_hot_100','wild_multi_stars']){
  const page=await browser.newPage({viewport:{width:390,height:844}}),gifRequests=[];page.on('request',r=>{if(r.url().endsWith('official-startup-logo.gif'))gifRequests.push(r.url());});await page.goto(base+'/fixture?game='+game);await page.waitForTimeout(100);assert.equal(await page.locator('#official-startup').count(),0);assert.deepEqual(gifRequests,[]);assert.equal(await page.evaluate(()=>document.querySelector('#machine').inert),false);checks.push({game,unchanged:true,noStartupGifRequest:true});await page.close();
 }
 const failurePage=await browser.newPage({viewport:{width:390,height:844}});await failurePage.goto(base+'/fixture?game=hot_foxy_20');await failurePage.evaluate(()=>{const s=document.createElement('script');s.type='module';s.src='/missing-controller.mjs';document.head.append(s);});await failurePage.waitForFunction(()=>document.querySelector('#official-startup').hidden);assert.equal(await failurePage.evaluate(()=>document.querySelector('#machine').inert),false);assert.equal(await failurePage.locator('#official-startup-reload').isVisible(),true);checks.push({moduleLoadFailureUncovered:true,reloadLink:true});await failurePage.close();
 const timeoutPage=await browser.newPage({viewport:{width:390,height:844}});await timeoutPage.addInitScript(()=>{const schedule=window.setTimeout.bind(window);window.setTimeout=(fn,ms,...args)=>schedule(fn,ms===30000?50:ms,...args);});await timeoutPage.goto(base+'/fixture?game=multi_hot_5_video');await timeoutPage.waitForFunction(()=>document.querySelector('#official-startup').hidden);assert.equal(await timeoutPage.evaluate(()=>document.querySelector('#machine').inert),false);checks.push({moduleTimeoutUncovered:true});await timeoutPage.close();
 assert.deepEqual(errors,[]);assert.deepEqual(apiRequests,[]);
 const result={passed:true,checks,errors,apiRequests};await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
