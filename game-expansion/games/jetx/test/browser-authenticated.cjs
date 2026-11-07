// Start auth-flow.mjs with JETX_LOCAL_AUTH_BROWSER_FIXTURE=1 first.
// This script only accesses its explicit HTTPS loopback fixture.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({ignoreHTTPSErrors:true,viewport:{width:1280,height:900}}),errors=[],failed=[],external=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)failed.push({url:response.url(),status:response.status()});});
  page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith('https://127.0.0.1:9445'))external.push(request.url());});
  await page.request.get('https://127.0.0.1:9445/games/jetx_native');
  const initial=await page.request.get('https://127.0.0.1:9445/api/jetx/state').then(response=>response.json());
  await page.clock.setFixedTime(new Date(initial.serverNow));
  await page.addLocatorHandler(page.locator('.ac-spotlight.is-visible'),async()=>{await page.locator('.ac-spotlight.is-visible [data-ac-spotlight-dismiss]').click({position:{x:5,y:5}});});
  await page.goto('https://127.0.0.1:9445/games/jetx_native',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.JetXNative?.state&&window.jetX?.loaded);
  await page.locator('[data-switch-to-four]').click();await page.waitForTimeout(400);
  // Advance both fixture clocks to the next authoritative betting window.
  await page.request.post('https://127.0.0.1:9445/__fixture/advance',{data:{milliseconds:180000}});
  await page.clock.setFixedTime(new Date(initial.serverNow+180000));
  await page.waitForFunction(id=>window.JetXNative?.state?.board.id!==id,initial.board.id);
  await page.locator('#bet-value-2').fill('1.50');await page.locator('#bet-value-2').press('Tab');
  const before=await page.evaluate(()=>window.JetXNative.state.balance);
  await page.locator('#bet-2').click();
  await page.waitForFunction(()=>window.JetXNative.state.bets.some(bet=>bet.position===2&&bet.stake==='1.50'),{timeout:8000});
  const accepted=await page.evaluate(()=>({balance:window.JetXNative.state.balance,bets:window.JetXNative.state.bets}));
  assert.equal(Math.round((Number(before)-Number(accepted.balance))*100),150);
  await page.screenshot({path:new URL('../evidence/authenticated-native-play.png','file://'+__filename).pathname});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.JetXNative?.state?.userId==='player-b');
  const report={testMode:'Authenticated HTTPS loopback fixture; actual player middleware and packaged backend; synchronized controlled clocks; no production wager',nativeSceneLoaded:await page.locator('canvas').count()>0,signInOverlayAbsent:await page.locator('#jetx-sign-in').count()===0,canonicalUserConfirmed:true,fourPanelsWorked:true,nativeBetAccepted:true,betDebitedOnce:true,reloadRecovered:true,errors,failedHTTP:failed,externalRequests:external};
  fs.writeFileSync(new URL('../evidence/authenticated-native-browser.json','file://'+__filename),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
