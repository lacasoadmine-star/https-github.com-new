import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {buildM20Recovery,writeM20Recovery} from './build.mjs';
import {createM20RecoveryWorker,GAME_PATH} from './worker.mjs';
import {renderGameHTML,KV_PREFIX} from '../../new-games90-20261123/m20-release/worker.mjs';
import {PAYLINES} from '../../new-games90-20261123/m20/presentation-quote.mjs';

const output=resolve(process.env.ZPLAY_M20_QA_OUTPUT||''),media=resolve(process.env.ZPLAY_M20_QA_MEDIA||'');
assert(process.env.ZPLAY_M20_QA_OUTPUT&&process.env.ZPLAY_M20_QA_MEDIA,'Explicit private scratch output and verified same-game media directories required');
const repository=resolve(new URL('../../../',import.meta.url).pathname);
const currentMedia=resolve(process.env.ZPLAY_M20_QA_CURRENT_MEDIA||resolve(media,'../m20-current-media'));
assert(!currentMedia.startsWith(repository+'/'),'Keep current verified official media outside source');
assert(!output.startsWith(repository+'/')&&!media.startsWith(repository+'/'),'Keep private media/captures outside the repository');
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const revision='79bb7e48737feb68a2e905f8',oldHash='d4c20fdb220638287477a1464c4b47e5bfb6e6f2b7b49988d344d3cc8d1250e6';
const oldPath=`/_zplay/new90-m20/${revision}/app.${oldHash}.mjs`,styleHash='d8ab90003813abb3b223129b25bd1d3f4fe276b092004ef716ab4b5e758bc246',manifestHash='c757c008212e6e6f2accd7d19e0030685b6331d99d826defd555337bd18c7c94';
const base=`/_zplay/new90-m20/${revision}/`,manifest=JSON.parse(await readFile(resolve(media,'assets.json'),'utf8'));
manifest.baseUrl='./assets/';
const build=await buildM20Recovery({activeMainModule:'new90m20r1/entry.mjs',baselineRevision:revision,previousAppPath:oldPath,previousStylePath:base+`style.${styleHash}.css`,sourceCommit:process.env.GITHUB_SHA||null});
await mkdir(output,{recursive:true});await writeM20Recovery(resolve(output,'build'),build);
const originalConfig={enabled:true,revision,appSha256:oldHash,styleSha256:styleHash,manifestSha256:manifestHash,appSource:'fixture-old-app',styleSource:'',manifestSource:JSON.stringify(manifest),
  media:Object.entries(manifest.files).map(([name,pin])=>({name,key:KV_PREFIX+name,...pin}))};
// The retained CSS fixture deliberately omits current controls: only the
// emitted, SHA-checked stylesheet may supply the new presentation.
const style='/* retained stylesheet fixture */';
const viewports=process.env.ZPLAY_M20_QA_ONLY==='startup'?[]:[{width:360,height:844},{width:390,height:844},{width:430,height:844},{width:1280,height:900},{width:844,height:390},{width:390,height:320}];
const model={id:'fresh_multihot20',currency:'ETB',reels:5,rows:3,paylines:20,foundationBet:1,maxWinMultiplier:1000,symbols:['seven','bell','grape','watermelon','lemon','plum','orange','cherry'],
  multiplierValues:[1,2,3,4,5],betLevels:['1.00','2.00'],availableBetLevels:['1.00','2.00'],enabled:true,freshReleaseReady:true,productionApproved:true,probabilityModelAudited:true,wagerAvailability:'available',
  mathVersion:'isolated-browser-fixture',engineVersion:'isolated-browser-fixture',mathSha256:'b'.repeat(64)};
const accepted=new Map(),calls=[],blocked=[],reports=[],assetRequests=[];let balance='100.00',browser,failure,failStateOnce=false,delayAssetOnce=false,blockedByActiveGame=null;
let heldAudio=null;
const grid=[['bell','bell','watermelon','lemon','bell'],['bell','orange','bell','bell','watermelon'],['seven','orange','bell','bell','watermelon']];
const previous={async fetch(request){const url=new URL(request.url),path=url.pathname;
  if(path==='/')return new Response('<!doctype html><a href="'+GAME_PATH+'">PLAY Multi Hot 20</a>',{headers:{'Content-Type':'text/html'}});
  if(path===GAME_PATH)return new Response(renderGameHTML(originalConfig),{headers:{'Content-Type':'text/html; charset=utf-8','X-Zplay-M20-Release':revision,
    'Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'"}});
  if(path===base+`style.${styleHash}.css`)return new Response(style,{headers:{'Content-Type':'text/css'}});
  if(path===base+`assets.${manifestHash}.json`)return Response.json(manifest);
  if(path.startsWith(base+'assets/')){const name=path.slice((base+'assets/').length);assetRequests.push(name);assert(Object.hasOwn(manifest.files,name));if(heldAudio&&name==='music.mp3')await heldAudio;if(delayAssetOnce&&name==='atlas-0.png'){delayAssetOnce=false;await new Promise(done=>setTimeout(done,16000));}return new Response(await readFile(resolve(media,name)),{headers:{'Content-Type':manifest.files[name].contentType}});}
  if(path==='/api/slots/fresh-state'){calls.push({path,method:request.method});if(failStateOnce){failStateOnce=false;return Response.json({error:'TEMPORARY_NETWORK_FAILURE'},{status:503});}return Response.json({authenticated:true,currency:'ETB',sessionGuard:'a'.repeat(64),balance,blockedByActiveGame,game:model});}
  if(path==='/api/slots/spin'&&request.method==='POST') {
    const action=await request.json();calls.push({path,method:'POST',action});assert.equal(action.gameId,'fresh_multihot20');assert.equal(action.bet,'1.00');
    if(!accepted.has(action.roundToken)) {balance='129.00';accepted.set(action.roundToken,{gameId:'fresh_multihot20',roundId:crypto.randomUUID(),currency:'ETB',bet:'1.00',isFree:false,grid,wheelMultiplier:5,
      winLines:[{line:6,symbol:'bell',count:4,positions:PAYLINES[5].slice(0,4).map((r,c)=>[r,c]),baseWin:'5.00'},{line:18,symbol:'bell',count:3,positions:PAYLINES[17].slice(0,3).map((r,c)=>[r,c]),baseWin:'1.00'}],
      baseWin:'6.00',finalWin:'30.00',maxWinCapped:false,mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:model.mathSha256,
      walletReceipt:{currency:'ETB',balanceBefore:'100.00',chargedStake:'1.00',finalWin:'30.00',balanceAfter:'129.00'}});}
    return Response.json(accepted.get(action.roundToken));
  }
  if(path==='/favicon.ico')return new Response(null,{status:204});return new Response('No fixture handler',{status:404});
}};
const worker=createM20RecoveryWorker(previous,build.config),staticBytes=new Map(build.staticFiles.map(file=>[file.key,new TextEncoder().encode(file.source).buffer]));
const currentPins=(await import('./current-media.mjs')).M20_CURRENT_MEDIA.files;
for(const [name,pin] of Object.entries(currentPins))staticBytes.set(`requested82/m20/media/${pin.sha256}/${name}`,await readFile(resolve(currentMedia,name)));
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const request=new Request('http://fixture'+req.url,{method:req.method,headers:req.headers,...(chunks.length?{body:Buffer.concat(chunks),duplex:'half'}:{})});
  const response=await worker.fetch(request,{SSG_OFFICIAL_REFERENCES:{get:async key=>{if(key.startsWith('requested82/m20/media/')){const name=key.split('/').at(-1);assetRequests.push(name);if(delayAssetOnce&&name==='atlas-0.png'){delayAssetOnce=false;await new Promise(done=>setTimeout(done,16000));}}
    const value=staticBytes.get(key);return value instanceof Uint8Array?value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength):value??null;}}},{});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch(error){res.writeHead(500);res.end(error.message);}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.ZPLAY_QA_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  {
    const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
    calls.length=0;failStateOnce=true;delayAssetOnce=true;page.setDefaultTimeout(40000);
    await page.goto(origin+GAME_PATH);const retry=page.getByRole('button',{name:'Try again',exact:true});await retry.waitFor();
    const size=await retry.boundingBox();assert(size.width>=44&&size.height>=44);
    await retry.click();await page.getByRole('button',{name:'No',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('m20-game').dataset.phase==='READY');
    assert.equal(calls.filter(c=>c.method==='POST').length,0);assert.equal(calls.length,2);
    reports.push({scenario:'failed-start-and-slow-mobile-media',retryOpenedRealNativeGame:true,mediaDelayMs:16000,stateReads:2,financialRequests:0});await context.close();
  }
  {
    calls.length=0;blockedByActiveGame='multihot100_native';
    const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
    await page.goto(origin+GAME_PATH);await page.getByRole('button',{name:'No',exact:true}).click();
    assert(await page.getByRole('button',{name:'HOLD & SPIN',exact:true}).isDisabled());
    blockedByActiveGame=null;await page.evaluate(()=>dispatchEvent(new Event('focus')));
    await page.getByRole('button',{name:'No',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('m20-game').dataset.cashEnabled==='true');
    assert(await page.getByRole('button',{name:'HOLD & SPIN',exact:true}).isEnabled());
    assert.equal(calls.filter(c=>c.method==='POST').length,0);assert.equal(calls.length,2);
    reports.push({scenario:'other-round-finished-before-return',spinReenabledFromFreshState:true,financialRequests:0});await context.close();
  }
  if(process.env.ZPLAY_M20_QA_ONLY!=='startup'){
    calls.length=0;assetRequests.length=0;let releaseAudio;heldAudio=new Promise(done=>releaseAudio=done);
    const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
    await page.addInitScript(()=>{window.nativeAudioPlayCount=0;const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){window.nativeAudioPlayCount++;return play.apply(this,args);};});
    try{
      await page.goto(origin+GAME_PATH);await page.getByRole('button',{name:'Yes',exact:true}).waitFor();
      assert.equal(assetRequests.filter(name=>name.endsWith('.mp3')).length,0);
      const requested=page.waitForRequest('**/music.mp3');await page.getByRole('button',{name:'Yes',exact:true}).click();await requested;
      assert(await page.getByRole('button',{name:'No',exact:true}).isEnabled());
      await page.getByRole('button',{name:'No',exact:true}).click();
      assert.equal(await page.locator('#m20-game').getAttribute('data-phase'),'READY');
      assert(await page.getByRole('button',{name:'HOLD & SPIN',exact:true}).isEnabled());
      const finished=page.waitForResponse('**/music.mp3');releaseAudio();heldAudio=null;await finished;await page.waitForTimeout(100);
      assert.equal(await page.getByRole('button',{name:'Sound',exact:true}).getAttribute('aria-pressed'),'false');
      assert.equal(await page.evaluate(()=>window.nativeAudioPlayCount),0);assert.equal(calls.filter(c=>c.method==='POST').length,0);
      reports.push({scenario:'slow-sound-choice-can-continue-muted',gameAndChoicesShownBeforeAnyAudioRequest:true,mutedChoiceWorksDuringAudioLoad:true,lateAudioCompletionDoesNotUnmute:true,financialRequests:0});
    }finally{releaseAudio();heldAudio=null;await context.close();}
  }
  for(const {width,height} of viewports) {
    accepted.clear();calls.length=0;assetRequests.length=0;balance='100.00';
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,hasTouch:width<700});
    const page=await context.newPage(),errors=[];page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin){blocked.push(u.origin);return route.abort();}return route.continue();});
    await page.addInitScript(()=>{const draw=CanvasRenderingContext2D.prototype.drawImage;window.fixtureFault={armed:true,failures:0};
      CanvasRenderingContext2D.prototype.drawImage=function(...args){if(window.fixtureFault.armed&&this.canvas.getAttribute('data-m20-native-output')==='true'&&document.getElementById('m20-game')?.dataset.phase==='ANIMATING'){
        window.fixtureFault.armed=false;window.fixtureFault.failures++;throw Error('isolated fixture accepted-frame drawing failure');}return draw.apply(this,args);};});
    await page.goto(origin+'/');await page.getByRole('link',{name:'PLAY Multi Hot 20',exact:true}).click();
    await page.getByRole('button',{name:'No',exact:true}).click();
    assert.equal(await page.locator('link[rel=stylesheet]').getAttribute('href'),build.config.stylePath);
    assert.equal(assetRequests.filter(name=>name.endsWith('.mp3')).length,0,'muted PLAY must not download audio');
    await page.getByRole('button',{name:'Sound',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.m20-sound')?.getAttribute('aria-pressed')==='true');
    await page.waitForFunction(()=>[...document.querySelectorAll('.m20-control')].every(node=>node.getBoundingClientRect().bottom<=innerHeight+1));
    const targets=await page.locator('.m20-control').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {name:node.dataset.action,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,visible:getComputedStyle(node).visibility!=='hidden',hit:hit===node||node.contains(hit)};}));
    assert.equal(targets.length,8);
    for(const r of targets){assert(r.x>=-1&&r.y>=0&&r.right<=width+1&&r.bottom<=height+1,r.name);assert(r.width>=44&&r.height>=44,r.name);if(r.visible)assert(r.hit,r.name);}
    assert.equal(await page.locator('#m20-game').getAttribute('data-cash-enabled'),'true');
    assert(await page.getByRole('button',{name:'HOLD & SPIN',exact:true}).isEnabled());
    assert.equal(await page.locator('.m20-spin .m20-control-label').evaluate(node=>getComputedStyle(node).clipPath),'none');
    assert(await page.locator('.m20-spin').evaluate(node=>node.querySelector('.m20-control-label').getBoundingClientRect().width<=node.getBoundingClientRect().width));
    await page.screenshot({path:resolve(output,`m20-native-ready-${width}x${height}.png`)});
    await page.getByRole('button',{name:'Bet',exact:true}).click();assert(await page.getByRole('dialog').isVisible());
    await page.getByRole('button',{name:'1.00',exact:true}).click();
    await page.getByRole('button',{name:'HOLD & SPIN',exact:true}).click();
    await page.getByRole('button',{name:'Recover current round',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.fixtureFault.failures),1);assert.equal(calls.filter(c=>c.method==='POST').length,1);
    const acceptedKey=calls.find(c=>c.method==='POST').action.roundToken;
    await page.screenshot({path:resolve(output,`m20-native-recovery-${width}.png`)});
    await page.getByRole('button',{name:'Recover current round',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('m20-game').dataset.phase==='WIN_PENDING');
    await page.waitForFunction(()=>document.getElementById('m20-connection').hidden);
    assert.equal(await page.locator('.m20-spin .m20-control-label').evaluate(node=>getComputedStyle(node).clipPath),'none');
    assert.equal(calls.filter(c=>c.method==='POST').length,1);assert.equal(accepted.size,1);assert(accepted.has(acceptedKey));
    await page.screenshot({path:resolve(output,`m20-native-restored-${width}.png`)});
    await page.getByRole('button',{name:'Take win',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('m20-game').dataset.phase==='READY');
    assert.equal(calls.filter(c=>c.method==='POST').length,1);assert.equal(balance,'129.00');
    await page.getByRole('button',{name:'Autoplay',exact:true}).click();await page.getByRole('button',{name:'50',exact:true}).click();
    assert.equal(await page.locator('[data-auto-count]').inputValue(),'50');assert.equal(calls.filter(c=>c.method==='POST').length,1);
    const autoTargets=await page.locator('.m20-auto-counts button').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {visible:r.width>0&&r.height>0,hit:hit===node||node.contains(hit)};}));
    for(const target of autoTargets)assert(target.visible&&target.hit,'native AUTO count target');
    await page.screenshot({path:resolve(output,`m20-native-auto-${width}x${height}.png`)});await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Menu',exact:true}).click();assert(await page.getByRole('dialog').isVisible());
    await page.getByRole('button',{name:'Settings',exact:true}).click();assert(await page.getByRole('checkbox',{name:'Music',exact:true}).isVisible());
    await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
    // Playwright routing disables HTTP caching. Repeated control SVGs and
    // native audio voices must use the verified in-memory bytes even then.
    assert.equal(assetRequests.length,13);assert.equal(new Set(assetRequests).size,13);
    assert(await page.locator('.control-art image').evaluateAll(nodes=>nodes.every(n=>n.getAttribute('href').startsWith('blob:'))));
    reports.push({width,height,emittedStylesheetVerified:true,viewportTargetsVerified:8,playOpened:true,nativeMediaVerified:true,drawFailureObserved:true,acceptedReceiptRecoveredLocally:true,unchangedAcceptedKey:true,spinPosts:1,takePosts:0,
      menuAndSettingsResponded:true,audioNotRequestedBeforeConsent:true,verifiedMediaNetworkReads:13,oneNetworkReadPerMediaFileWithHTTPCacheDisabled:true,overflow:false,pageErrors:errors});await context.close();
  }
  assert.deepEqual(blocked,[]);
}catch(error){failure=error.stack;throw error;}
finally{
  await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));
  await writeFile(resolve(output,'browser-report.json'),JSON.stringify({schema:'zplay/m20-built-recovery-browser-qa/v1',testedAt:new Date().toISOString(),passed:!failure&&reports.length===viewports.length+(process.env.ZPLAY_M20_QA_ONLY==='startup'?2:3),failure,
    sourceCommit:build.report.sourceCommit,appSha256:build.config.appSha256,appBytes:build.config.appBytes,workerBytes:build.report.workerBytes,styleSha256:build.config.styleSha256,styleBytes:build.config.styleBytes,
    scope:'Exact release JS through actual mounted DOM, retained native image/audio assets and existing host transport using an isolated HTTP receipt fixture. No production wager, funds or ledger mutation.',
    reports,blocked,productionRequests:0,authenticatedProductionRounds:0,providerParityVerified:false},null,2)+'\n');
}
