import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {startBrowserFixture,FIXTURE_TOKEN} from './browser-fixture.mjs';
const require=createRequire(import.meta.url),{chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright');
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),'artifacts');
const fixture=await startBrowserFixture();
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={scope:'LOCAL-QA-ONLY',viewport:{width:390,height:844},usesProductionWallet:false,checks:[],errors:[]};
const context=await browser.newContext({viewport:report.viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const check=async(name,fn)=>{try{await fn();report.checks.push({name,pass:true});}catch(error){report.checks.push({name,pass:false,error:error.message});}};
try{
  await context.addCookies([{name:'sw_session',value:FIXTURE_TOKEN,url:fixture.origin,sameSite:'Lax'}]);
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(fixture.origin+'/independent74/?game=ind74_mineisland2',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#connection-state')?.textContent==='Account connected');
  await check('fixed mobile controls provide44px touch targets and no horizontal overflow',async()=>{
    const sizes=await page.evaluate(()=>['play-button','collect-button','bet-more','bet-less','sound-button','rules-button','auto-toggle','refresh-state','mode-select'].flatMap(id=>{const e=document.getElementById(id);if(!e||!e.getClientRects().length)return[];const r=e.getBoundingClientRect();return[{id,x:r.x,width:r.width,height:r.height}];}));
    report.controlSizes=sizes;
    for(const r of sizes){assert.ok(r.width>=44&&r.height>=44,JSON.stringify(r));assert.ok(r.x>=-1&&r.x+r.width<=391,JSON.stringify(r));}
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false);
  });
  await check('paced bounded AUTO can stop after first debit and preserves open round',async()=>{
    await page.locator('#auto-toggle').click();await page.locator('#auto-steps').selectOption('1');await page.locator('#auto-start').click();
    await page.waitForFunction(()=>document.querySelector('#step-count')?.textContent.trim()==='1 / 10');
    await page.locator('#auto-toggle').click();
    await page.waitForFunction(()=>!document.querySelector('#refresh-state')?.disabled);
    assert.equal((await page.locator('#auto-toggle').innerText()).includes('Stop auto'),false);
    assert.equal(fixture.repository.data.ledger.filter(x=>x.type==='debit').length,1);
    assert.equal([...fixture.repository.data.rounds.values()].filter(x=>x.status==='active').length,1);
    assert.equal(await page.locator('#collect-button').isEnabled(),true);
  });
  await check('active receipt is not displayed as a completed loss',async()=>{assert.equal(await page.locator('#round-history .history-row').filter({hasText:'Passage ended'}).count(),0);});
  await page.screenshot({path:path.join(dir,'mine-island2-mobile-rechecked.png'),fullPage:true});
  await check('mobile recheck has no runtime errors',async()=>assert.deepEqual(report.errors,[]));
}catch(error){report.fatal=error.stack;}
finally{await context.close();await browser.close();await fixture.close();await fs.writeFile(path.join(dir,'mine-island2-mobile-recheck.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));if(report.fatal||report.checks.some(x=>!x.pass))process.exitCode=1;
