// Targeted regression: mobile dock plus one round against local test ledger.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {startBrowserFixture,FIXTURE_TOKEN} from './browser-fixture.mjs';
const {chromium}=createRequire(import.meta.url)('/opt/codex/cua_node/lib/node_modules/playwright');
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),'artifacts');
const fixture=await startBrowserFixture();
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const report={scope:'LOCAL-QA-ONLY',usesProductionWallet:false,viewport:{width:390,height:844},checks:[],errors:[]};
const check=async(name,fn)=>{try{await fn();report.checks.push({name,pass:true});}catch(e){report.checks.push({name,pass:false,error:e.message});}};
function within(r){assert.ok(r.width>=44&&r.height>=44,JSON.stringify(r));assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=391&&r.y+r.height<=845,JSON.stringify(r));}
try{
 await context.addCookies([{name:'sw_session',value:FIXTURE_TOKEN,url:fixture.origin}]);const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(fixture.origin+'/independent74/?game=ind74_mineisland2',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#connection-state')?.textContent==='Account connected');
 const rect=async id=>page.locator('#'+id).boundingBox();
 await check('initial bet and START/COLLECT are visible in first844px with44px targets',async()=>{const r={bet:await rect('bet-amount'),start:await rect('play-button'),collect:await rect('collect-button'),minus:await rect('bet-less'),plus:await rect('bet-more')};Object.values(r).forEach(within);assert.ok(r.bet.y+r.bet.height<=r.start.y);assert.ok(r.start.x+r.start.width<=r.collect.x);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);report.initialBounds=r;});
 await page.screenshot({path:path.join(dir,'mine-island2-first-viewport-ready.png'),fullPage:false});
 const initialTotal=BigInt(fixture.repository.data.balance)+BigInt(fixture.repository.data.house.balanceMinor);
 await check('one mobile tap round uses server-confirmed debit, step and collection',async()=>{
   await page.locator('#play-button').tap();await page.waitForFunction(()=>document.querySelector('#step-count')?.textContent.trim()==='1 / 10'&&!document.querySelector('#refresh-state')?.disabled);
   assert.equal(await page.locator('#wallet-balance').innerText(),'999.90 ETB');within(await rect('jump-button'));within(await rect('collect-button'));within(await rect('bet-amount'));
   await page.locator('#jump-button').tap();await page.waitForFunction(()=>document.querySelector('#step-count')?.textContent.trim()==='2 / 10'&&!document.querySelector('#refresh-state')?.disabled);
   await page.locator('#collect-button').tap();await page.waitForFunction(()=>document.querySelector('#round-status')?.textContent==='COLLECTED'&&!document.querySelector('#refresh-state')?.disabled);
   assert.equal(await page.locator('#wallet-balance').innerText(),'1,000.02 ETB');assert.equal(fixture.repository.data.ledger.filter(x=>x.type==='debit').length,1);assert.equal(fixture.repository.data.ledger.filter(x=>x.type==='credit').length,1);
   assert.equal(BigInt(fixture.repository.data.balance)+BigInt(fixture.repository.data.house.balanceMinor),initialTotal);assert.equal(fixture.repository.data.house.liabilities.size,0);
 });
 await page.screenshot({path:path.join(dir,'mine-island2-first-viewport-collected.png'),fullPage:false});
 await check('targeted mobile run has no runtime errors',async()=>assert.deepEqual(report.errors,[]));
}catch(e){report.fatal=e.stack;}finally{await context.close();await browser.close();await fixture.close();await fs.writeFile(path.join(dir,'mine-island2-first-viewport-report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));if(report.fatal||report.checks.some(x=>!x.pass))process.exitCode=1;
