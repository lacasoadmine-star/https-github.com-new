const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const model=process.env.SPECIAL74_TEST_GAME||'burningice10_native';
 if(!['burningice10_native','burningice40_native'].includes(model))throw Error('Unknown fixture game');
 const forty=model==='burningice40_native',stake=forty?80:20,entry=forty?'008-burning-ice-40':'007-burning-ice-10',label=forty?'ice40':'ice10';
 const browser=await chromium.launch({executablePath:process.env.SPECIAL74_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let releaseFirstResponse=()=>{};
 try{
 const context=await browser.newContext({...devices['Pixel 7']});const page=await context.newPage();const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4181')external.push(r.url());});
 await page.request.get('http://127.0.0.1:4181/__fixture/reset?game='+model);
 await page.goto('http://127.0.0.1:4181/special-games/'+entry);await page.locator('#sound-no').click();
 await page.waitForFunction(()=>!document.querySelector('#spin').disabled);
 assert.equal(await page.evaluate(()=>document.fonts.check('22px IntroBlackCaps')&&document.fonts.check('18px IntroRegular')&&[...document.fonts].filter(f=>f.status==='loaded').length===2),true);
 await page.locator('#plus').click();
 // Two awaited locator.click calls can be separated by a complete round under
 // CPU load. Hold the first wager response so both real touch inputs occur while
 // that same wager is in flight, without relying on renderer animation timing.
 let firstStart=true,resolveSubmitted,rejectSubmitted;
 const submitted=new Promise((resolve,reject)=>{resolveSubmitted=resolve;rejectSubmitted=reject;});
 const responseGate=new Promise(resolve=>{releaseFirstResponse=resolve;});
 await page.route('**/api/remaining20/action',async route=>{
  if(firstStart&&route.request().postDataJSON()?.type==='start'){
   firstStart=false;
   try{const response=await route.fetch();resolveSubmitted();await responseGate;await route.fulfill({response});}
   catch(error){rejectSubmitted(error);await route.abort().catch(()=>{});}
  }else await route.continue();
 });
 await page.evaluate(()=>{window.fixtureSpinTouches=[];document.querySelector('#spin').addEventListener('click',()=>window.fixtureSpinTouches.push(performance.now()),true);});
 const spinBox=await page.locator('#spin').boundingBox();assert.ok(spinBox);
 const spinX=spinBox.x+spinBox.width/2,spinY=spinBox.y+spinBox.height/2;
 const submitTimeout=setTimeout(()=>rejectSubmitted(Error('First spin did not reach the fixture within 30 seconds')),30000);
 try{await page.touchscreen.tap(spinX,spinY);await submitted;}finally{clearTimeout(submitTimeout);}
 await page.touchscreen.tap(spinX,spinY);
 const touches=await page.evaluate(()=>window.fixtureSpinTouches);
 assert.equal(touches.length,2,'Both touchscreen taps must reach the visible spin control');
 let stats=await(await page.request.get('http://127.0.0.1:4181/__fixture/stats')).json();
 assert.equal(stats.starts,1,'Repeated input while the response is pending must not debit twice');
 assert.equal(stats.balance,10000-stake);
 releaseFirstResponse();
 await page.waitForFunction(()=>!document.querySelector('#collect').disabled);
 stats=await(await page.request.get('http://127.0.0.1:4181/__fixture/stats')).json();assert.equal(stats.starts,1);assert.equal(stats.balance,10000-stake);assert.equal(stats.gameId,model);assert.equal(stats.rows,forty?4:3);
 const collected=page.waitForResponse(r=>r.url().endsWith('/api/remaining20/action')&&r.request().postDataJSON()?.action==='collect');
 await page.locator('#collect').click();await collected;
 await page.waitForFunction(()=>document.querySelector('#collect').disabled&&!document.querySelector('#spin').disabled);
 stats=await(await page.request.get('http://127.0.0.1:4181/__fixture/stats')).json();assert.equal(stats.balance,10100-stake);
 await page.request.get('http://127.0.0.1:4181/__fixture/drop-next');await page.locator('#spin').click();
 await page.locator('#retry').waitFor({state:'visible'});stats=await(await page.request.get('http://127.0.0.1:4181/__fixture/stats')).json();assert.equal(stats.starts,2);
 const ids=stats.requests.slice();await page.locator('#retry').click();await page.waitForFunction(()=>!document.querySelector('#collect').disabled);
 stats=await(await page.request.get('http://127.0.0.1:4181/__fixture/stats')).json();assert.equal(stats.starts,2);assert.deepEqual(stats.requests,ids);
 fs.mkdirSync('workers/superwin-player/special74/test-results',{recursive:true});await page.screenshot({path:'workers/superwin-player/special74/test-results/'+label+'-portrait.png',scale:'css'});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const result={passed:true,gameId:model,rows:forty?4:3,scope:'local synthetic fixture, not production wagers or visual parity',checks:['two real touchscreen taps during a held wager response make one start','selected stake sent to existing contract','collect updates canonical balance','lost response replays same request ID without a second debit','same-origin runtime'],repeatedInput:{touches:touches.length,responseHeldUntilBothInputs:true,starts:1},productionFinancialRequests:0};
 fs.writeFileSync('workers/superwin-player/special74/test-results/browser-'+label+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{releaseFirstResponse();await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
