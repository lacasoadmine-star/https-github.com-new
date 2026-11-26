const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const results=[];await fs.mkdir(__dirname+'/../test-results',{recursive:true});
 try{for(const id of ['001-multi-hot-5','002-multi-hot-10']){
  const context=await browser.newContext({...devices['Pixel 7']}),page=await context.newPage(),errors=[],posts=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')posts.push(r);assert.equal(new URL(r.url()).origin,'http://127.0.0.1:4177','No external host in a game runtime');});
  await page.goto('http://127.0.0.1:4177/new74/'+id);await page.locator('#sound-no').click();assert.equal(await page.locator('#balance').textContent(),'100.00');
  await page.locator(id.startsWith('001')?'#more':'#bet').click();if(id.startsWith('002'))await page.locator('#bet-list button').filter({hasText:'0.20 ETB'}).click();
  await page.locator('#spin').click();await page.locator('#spin').click();await page.waitForFunction(()=>document.querySelector('#spin').dataset.busy==='false');assert.equal(posts.length,1,'A second tap stops animation without another wager');assert.equal(JSON.parse(posts[0].postData()).bet,'0.20');assert.equal(await page.locator('#balance').textContent(),'99.80');
  const beforeHold=posts.length,box=await page.locator('#spin').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(800);await page.mouse.up();await page.waitForFunction(()=>document.querySelector('#spin').dataset.busy==='false');await page.waitForTimeout(1000);assert.equal(posts.length,beforeHold+1,'Releasing hold cancels further wagers');
  await page.locator('#auto').click();await page.locator('#auto-start').click();await page.waitForTimeout(150);await page.locator('#spin').click();await page.waitForFunction(()=>document.querySelector('#spin').dataset.busy==='false');const stopped=posts.length;await page.waitForTimeout(1600);assert.equal(posts.length,stopped,'Stop cancels autoplay');
  await page.screenshot({path:__dirname+'/../test-results/'+id+'-portrait.png',scale:'css'});
  await page.setViewportSize({width:839,height:412});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:__dirname+'/../test-results/'+id+'-landscape.png',scale:'css'});
  assert.deepEqual(errors,[]);results.push({id,portrait:true,landscape:true,doubleTap:'one wager',holdRelease:'cancelled',autoplayStop:'cancelled',pageErrors:0});await context.close();
 }
 const c=await browser.newContext({...devices['Pixel 7']}),p=await c.newPage();await p.route('**/api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{"detail":"SIGN_IN"}'}));await p.goto('http://127.0.0.1:4177/new74/002-multi-hot-10');await p.locator('#sound-no').click();assert.equal(await p.locator('#spin').isEnabled(),false);assert.equal(await p.locator('#balance').textContent(),'—');results.push({signedOut:'spin disabled; no invented balance'});await c.close();
 await fs.writeFile(__dirname+'/../test-results/browser.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
