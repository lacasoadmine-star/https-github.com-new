// Loopback-only replacement test. The synthetic 74 entries are never a release.
const {chromium,devices}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=path.resolve(__dirname,'..');
(async()=>{
 const selected=JSON.parse(fs.readFileSync(path.resolve(packageRoot,'../../../reports/special74/selected-games.json'),'utf8')).entries;
 const covers=JSON.parse(fs.readFileSync(path.join(packageRoot,'cover-manifest.json'),'utf8')).assets;
 const entries=selected.map(e=>({id:e.id,title:e.selectedName,ready:true,gamePath:'/special-games/play/'+e.id,cover:covers.find(c=>c.id===e.id).runtimePath}));
 const browser=await chromium.launch({executablePath:process.env.SPECIAL74_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({...devices['Pixel 7']}),external=[],errors=[];
  page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4181')external.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
  const fixture='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/special-games/catalog.css"></head><body style="background:#0c192a"><header id="account-shell"><button id="wallet-control">Wallet fixture</button></header><main class="player-main"><section id="sw-v116-games"><article id="legacy-game"><button id="legacy-play">Existing game fixture</button></article></section></main><a id="superwin-new74-entry" href="/new74/">Rejected NEW74 fixture</a><script type="module" src="/special-games/catalog.mjs"></script></body></html>';
  await page.route('**/__catalog-test',r=>r.fulfill({contentType:'text/html',body:fixture}));
  let release={ready:true,legacyDisposition:'replace-existing-game-presentations-after-complete-74-release',version:'synthetic-catalogue-only',entries};
  await page.route('**/special-games/catalog.json',r=>r.fulfill({json:release}));
  // A 73-game result, stale additive result or unfinished entry preserves the old DOM.
  const validRelease=structuredClone(release);
  for(const invalid of [
   {...validRelease,entries:entries.slice(0,73)},
   {...validRelease,legacyDisposition:'retain-existing-games-and-add-independent-special-games'},
   {...validRelease,entries:entries.map((e,i)=>i===73?{...e,ready:false}:e)}
  ]){
   release=invalid;await page.goto('http://127.0.0.1:4181/__catalog-test',{waitUntil:'networkidle'});
   assert.equal(await page.locator('#superwin-special74').count(),0);
   assert.equal(await page.locator('#legacy-game').count(),1);
   assert.equal(await page.locator('#superwin-new74-entry').count(),1);
   await page.evaluate(()=>{window.fixtureClicks=0;document.querySelector('#legacy-play').addEventListener('click',()=>window.fixtureClicks++);});
   await page.locator('#legacy-play').click();assert.equal(await page.evaluate(()=>window.fixtureClicks),1);
  }
  release=validRelease;await page.goto('http://127.0.0.1:4181/__catalog-test');
  await page.locator('#superwin-special74 .special74-card').last().waitFor();
  assert.equal(await page.locator('#legacy-game').count(),0);
  assert.equal(await page.locator('#superwin-new74-entry').count(),0);
  assert.equal(await page.locator('#sw-v116-games > #superwin-special74').count(),1);
  assert.equal(await page.locator('#superwin-special74 .special74-card').count(),74);
  const names=await page.locator('.special74-card span').allTextContents();
  assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'en',{numeric:true,sensitivity:'base'})));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const accountMarkup=await page.locator('#account-shell').evaluate(el=>el.outerHTML);
  await page.evaluate(()=>{window.walletClicks=0;document.querySelector('#wallet-control').addEventListener('click',()=>window.walletClicks++);});
  await page.locator('#wallet-control').click();assert.equal(await page.evaluate(()=>window.walletClicks),1);
  // The retained SPA can recreate its games view; the replacement stays singular.
  await page.evaluate(()=>{
   const replacement=document.createElement('main');replacement.className='player-main';
   replacement.innerHTML='<section id="sw-v116-games"><article id="legacy-again">Old game rerender</article></section>';
   document.querySelector('main').replaceWith(replacement);
  });
  await page.locator('#superwin-special74').waitFor();
  assert.equal(await page.locator('#superwin-special74').count(),1);
  assert.equal(await page.locator('#legacy-again').count(),0);
  // A wallet SPA view is never treated as a catalogue or rewritten.
  const walletMarkup=await page.evaluate(()=>{
   const replacement=document.createElement('main');replacement.className='player-main';
   replacement.innerHTML='<article id="wallet-fixture"><button id="wallet-action">Account action</button></article>';
   document.querySelector('main').replaceWith(replacement);
   window.accountActions=0;document.querySelector('#wallet-action').addEventListener('click',()=>window.accountActions++);
   return replacement.outerHTML;
  });
  await page.waitForFunction(()=>!document.querySelector('#superwin-special74'));
  assert.equal(await page.locator('main').evaluate(el=>el.outerHTML),walletMarkup);
  await page.locator('#wallet-action').click();assert.equal(await page.evaluate(()=>window.accountActions),1);
  assert.equal(await page.locator('#account-shell').evaluate(el=>el.outerHTML),accountMarkup);
  await page.locator('#wallet-control').click();assert.equal(await page.evaluate(()=>window.walletClicks),2);
  await page.evaluate(()=>{
   const host=document.createElement('section');host.id='sw-v116-games';
   host.innerHTML='<article id="legacy-return">Old game on return</article>';
   document.querySelector('main').replaceChildren(host);
   const shortcut=document.createElement('a');shortcut.id='superwin-new74-entry';shortcut.href='/new74/';document.body.append(shortcut);
  });
  await page.locator('#superwin-special74').waitFor();
  assert.equal(await page.locator('#superwin-special74').count(),1);
  assert.equal(await page.locator('#superwin-special74 .special74-card').count(),74);
  assert.equal(await page.locator('#legacy-return').count(),0);
  assert.equal(await page.locator('#superwin-new74-entry').count(),0);
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  fs.mkdirSync(path.join(packageRoot,'test-results'),{recursive:true});
  const report={passed:true,scope:'Synthetic complete-release replacement only; not 74 completed games',cards:74,incompleteReleasePreservesExistingGames:true,staleAdditiveReleaseRejected:true,oldCatalogueReplaced:true,rejectedNew74ShortcutRemoved:true,remountWithoutDuplicates:true,walletViewUnchanged:true,walletEventHandlersRetained:true,absentFromNonGameViews:true,alphabetical:true,mobileOverflow:false,externalRequests:0};
  fs.writeFileSync(path.join(packageRoot,'test-results/catalog-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
