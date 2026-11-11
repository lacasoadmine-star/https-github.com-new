// Isolated local browser QA. Never uses a production URL, wallet or credential.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {startBrowserFixture,FIXTURE_TOKEN} from './browser-fixture.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright');
const here=path.dirname(fileURLToPath(import.meta.url));
const dir=path.join(here,'artifacts');await fs.mkdir(dir,{recursive:true});
const fixture=await startBrowserFixture();
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={gameId:'ind74_mineisland2',scope:'LOCAL-QA-ONLY',usesRealServerMath:true,usesProductionWallet:false,viewport:{width:390,height:844},checks:[],errors:[],failedResponses:[],screenshots:[]};
let context;
const check=async(name,operation)=>{try{await operation();report.checks.push({name,pass:true});}catch(error){report.checks.push({name,pass:false,error:error.message});}};
try{
  context=await browser.newContext({viewport:report.viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await context.addCookies([{name:'sw_session',value:FIXTURE_TOKEN,url:fixture.origin,sameSite:'Lax'}]);
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)report.failedResponses.push({path:new URL(response.url()).pathname,status:response.status()});});
  await page.goto(fixture.origin+'/independent74/?game=ind74_mineisland2',{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#connection-state')?.textContent==='Account connected',{},{timeout:12000});
  const ready=async()=>page.waitForFunction(()=>!document.querySelector('#refresh-state')?.disabled,{},{timeout:12000});
  const step=async expected=>{await page.waitForFunction(value=>document.querySelector('#step-count')?.textContent?.trim()===value,expected+' / 10',{timeout:12000});await ready();};
  await check('initial mobile page loads authenticated local fixture state',async()=>{assert.equal(await page.locator('#bet-amount').inputValue(),'0.10');assert.equal(await page.locator('#wallet-balance').innerText(),'1,000.00 ETB');assert.equal(await page.locator('#play-button').isEnabled(),true);});
  await check('mobile document has no horizontal overflow',async()=>{const size=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth}));assert.ok(size.document<=size.width+1,JSON.stringify(size));});
  await check('bet plus and minus change exact 0.10 steps',async()=>{await page.locator('#bet-more').click();assert.equal(await page.locator('#bet-amount').inputValue(),'0.20');await page.locator('#bet-less').click();assert.equal(await page.locator('#bet-amount').inputValue(),'0.10');});
  await page.screenshot({path:path.join(dir,'mine-island2-mobile-ready.png'),fullPage:true});report.screenshots.push('mine-island2-mobile-ready.png');
  await check('mobile actionable controls fit viewport and have touch targets',async()=>{
    const results=await page.evaluate(()=>['play-button','collect-button','bet-more','bet-less','sound-button','rules-button','auto-toggle','refresh-state'].map(id=>{const x=document.getElementById(id),r=x.getBoundingClientRect();return{id,x:r.x,width:r.width,height:r.height,hidden:!x.getClientRects().length};}));
    for(const r of results){if(r.hidden)continue;assert.ok(r.x>=-1&&r.x+r.width<=391,JSON.stringify(r));assert.ok(r.height>=40&&r.width>=40,JSON.stringify(r));}report.controlSizes=results;
  });
  await check('PLAY debits once and confirms first safe jump from real server math',async()=>{await page.locator('#play-button').click();await step(1);assert.equal(await page.locator('#wallet-balance').innerText(),'999.90 ETB');assert.equal(await page.locator('#current-multiplier').innerText(),'1.10×');assert.equal(await page.locator('#collect-button').isEnabled(),true);assert.equal(await page.locator('#bet-amount').isDisabled(),true);assert.equal(fixture.repository.data.ledger.filter(x=>x.type==='debit').length,1);});
  await check('JUMP advances state and COLLECT settles exact amount once',async()=>{await page.locator('#jump-button').click();await step(2);assert.equal(await page.locator('#current-multiplier').innerText(),'1.20×');await page.locator('#collect-button').click();await page.waitForFunction(()=>document.querySelector('#round-status')?.textContent==='COLLECTED');await ready();assert.equal(await page.locator('#wallet-balance').innerText(),'1,000.02 ETB');assert.equal(fixture.repository.data.ledger.filter(x=>x.type==='credit').length,1);assert.equal(fixture.repository.data.ledger.at(-1).amount,'12');});
  await check('rules disclose ten authored step payouts and close on mobile',async()=>{await page.locator('#rules-button').click();await page.locator('#rules-dialog').waitFor({state:'visible'});assert.equal(await page.locator('#rules-body tbody tr').count(),10);await page.locator('#rules-done').click();assert.equal(await page.locator('#rules-dialog').isVisible(),false);});
  await check('sound toggle changes accessible state',async()=>{const button=page.locator('#sound-button');await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');await button.click();assert.equal(await button.getAttribute('aria-pressed'),'false');});
  await page.screenshot({path:path.join(dir,'mine-island2-mobile-collected.png'),fullPage:true});report.screenshots.push('mine-island2-mobile-collected.png');
  await check('lost first jump ends round without credit',async()=>{await fetch(fixture.origin+'/__qa__/lose-next');const credits=fixture.repository.data.ledger.filter(x=>x.type==='credit').length;await page.locator('#play-button').click();await page.waitForFunction(()=>document.querySelector('#round-status')?.textContent==='PASSAGE ENDED');await ready();assert.equal(await page.locator('#wallet-balance').innerText(),'999.92 ETB');assert.equal(fixture.repository.data.ledger.filter(x=>x.type==='credit').length,credits);assert.equal(await page.locator('#collect-button').isDisabled(),true);});
  await fetch(fixture.origin+'/__qa__/reset');await page.reload({waitUntil:'networkidle'});await ready();
  await check('unknown action response blocks new bet and recovers original request id',async()=>{
    await fetch(fixture.origin+'/__qa__/fail-next');const begin=fixture.calls.length;await page.locator('#play-button').click();await page.locator('#recover-button').waitFor({state:'visible'});await ready();assert.equal(await page.locator('#play-button').isDisabled(),true);assert.equal(fixture.repository.data.ledger.length,0);
    const first=fixture.calls.slice(begin).find(x=>x.body?.type==='play').body.request_id;
    await page.locator('#recover-button').click();await step(1);assert.equal(await page.locator('#recover-button').isVisible(),false);
    const actions=fixture.calls.slice(begin).filter(x=>x.body?.type==='play');assert.equal(actions.length,2);assert.equal(actions[1].body.request_id,first);assert.equal(fixture.repository.data.ledger.filter(x=>x.type==='debit').length,1);
  });
  await check('reload resumes open server round without another stake',async()=>{const debits=fixture.repository.data.ledger.filter(x=>x.type==='debit').length;await page.reload({waitUntil:'networkidle'});await step(1);assert.equal(fixture.repository.data.ledger.filter(x=>x.type==='debit').length,debits);assert.equal(await page.locator('#play-button').isVisible(),false);await page.locator('#collect-button').click();await page.waitForFunction(()=>document.querySelector('#round-status')?.textContent==='COLLECTED');await ready();});
  await check('bounded AUTO stops and leaves any open round under player control',async()=>{await page.locator('#auto-toggle').click();await page.locator('#auto-steps').selectOption('1');await page.locator('#auto-start').click();await page.waitForFunction(()=>document.querySelector('#auto-toggle')?.textContent.includes('Stop auto'));await page.locator('#auto-toggle').click();await ready();assert.equal((await page.locator('#auto-toggle').innerText()).includes('Stop auto'),false);const rounds=[...fixture.repository.data.rounds.values()];assert.ok(rounds.length<=3,'Stopped auto should not complete all scheduled rounds');});
  await page.screenshot({path:path.join(dir,'mine-island2-mobile-final.png'),fullPage:true});report.screenshots.push('mine-island2-mobile-final.png');
  await check('no browser runtime errors',async()=>assert.deepEqual(report.errors,[]));
  report.finalFixtureBalance=fixture.repository.data.balance;report.fixtureLedger=fixture.repository.data.ledger;
}catch(error){report.fatal=error.stack;}
finally{await context?.close();await browser.close();await fixture.close();await fs.writeFile(path.join(dir,'mine-island2-browser-report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
if(report.fatal||report.checks.some(c=>!c.pass))process.exitCode=1;
