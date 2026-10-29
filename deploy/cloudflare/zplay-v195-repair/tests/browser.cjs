const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const assert=require('assert/strict');
const root=path.resolve(__dirname,'..');const models=JSON.parse(fs.readFileSync(path.join(root,'slots/catalog.json'))).games;
const image=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="gold"/><text x="50" y="200" font-size="80">TEST FIXTURE</text></svg>');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const report={assetFixture:'Synthetic SVG used for missing live image files; these are functional layout tests, not visual-parity tests',viewports:[],rounds:0,requests:0,errors:[]};
for(const width of [360,390,430,768,1280]){
 const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});let model=models[0],mode='normal',requests=[],results=new Map();
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url()),p=u.pathname;
  const json=x=>route.fulfill({json:x});
  if(p.startsWith('/api/slots/')){
   if(p.endsWith('/session'))return json({authenticated:true});
   if(p.includes('/games/')){if(mode==='offline')return route.fulfill({status:503,json:{detail:'offline'}});return json({...model,enabled:true});}
   if(p.endsWith('/balance'))return json({balance:'100.00'});
   if(p.endsWith('/rounds'))return json({items:[]});
   if(p.endsWith('/spin')){const b=req.postDataJSON();requests.push(b);report.requests++;
    if(mode==='timeout'){mode='normal';return route.abort('timedout');}
    if(mode==='malformed'){mode='normal';return json({balanceAfter:'9999.00',roundId:'bad'});}
    if(!results.has(b.roundToken)){results.set(b.roundToken,{roundId:b.roundToken,gameId:b.gameId,bet:b.bet,balanceAfter:'98.00',finalWin:'0.0000',wheelMultiplier:model.wheel.values[0],grid:Array.from({length:model.rows},(_,r)=>model.previewReels.map(s=>s[r])),winLines:[],freeSpinsRemaining:0});report.rounds++;}
    await new Promise(r=>setTimeout(r,80));return json(results.get(b.roundToken));
   }
  }
  if(/\.(png|webp|jpg)$/.test(p))return route.fulfill({body:image,contentType:'image/svg+xml'});
  const file=path.join(root,p);if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({body:fs.readFileSync(file),contentType:p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':/\.(js|mjs)$/.test(p)?'application/javascript':'text/html'});
  return route.fulfill({status:404,body:'Not available in isolated fixture'});
 });
 for(const m of models){model=m;await page.goto('http://zplay.test/slots/game.html?game='+m.id);await page.waitForSelector('html[data-sw-ready="true"]');assert.equal(await page.locator('#game-title').getAttribute('aria-label'),m.id==='hot_foxy_20'?'Foxy Hot 20':m.name);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow '+m.id+' '+width);
  await page.locator('#spin').click();await page.locator('#spin').click();await page.waitForFunction(()=>document.body.dataset.spinState==='IDLE');assert.equal(requests.at(-1).gameId,m.id);
 }
 // Ambiguous requests must reuse their token and leave the displayed wallet untouched.
 model=models[1];await page.goto('http://zplay.test/slots/game.html?game='+model.id);await page.waitForSelector('html[data-sw-ready="true"]');
 mode='malformed';await page.locator('#spin').click();await page.waitForFunction(()=>document.body.dataset.spinState==='RETRYABLE_PENDING');assert.equal(await page.locator('#balance').textContent(),'100.00');const token=requests.at(-1).roundToken;
 await page.locator('#spin').click();await page.locator('#spin').click();await page.waitForFunction(()=>document.body.dataset.spinState==='IDLE');assert.equal(requests.at(-1).roundToken,token);
 mode='timeout';await page.locator('#spin').click();await page.waitForFunction(()=>document.body.dataset.spinState==='RETRYABLE_PENDING');const retryToken=requests.at(-1).roundToken;
 await page.locator('#spin').click();await page.locator('#spin').click();await page.waitForFunction(()=>document.body.dataset.spinState==='IDLE');assert.equal(requests.at(-1).roundToken,retryToken);
 mode='offline';await page.reload();await page.waitForSelector('html[data-sw-ready="true"]');assert.equal(await page.locator('#spin').isDisabled(),true);assert.equal(await page.locator('#math-status').textContent(),'GAME OFFLINE');
 report.viewports.push({width,cabinets:models.length,overflow:false,retryTokensPreserved:true,offlineWagerLocked:true});await page.close();
}
await browser.close();fs.writeFileSync(path.join(root,'tests/browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.deepEqual(report.errors,[]);
})().catch(e=>{console.error(e);process.exit(1)});
