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
assert(!output.startsWith(repository+'/')&&!media.startsWith(repository+'/'),'Keep private media/captures outside the repository');
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const revision='79bb7e48737feb68a2e905f8',oldHash='d4c20fdb220638287477a1464c4b47e5bfb6e6f2b7b49988d344d3cc8d1250e6';
const oldPath=`/_zplay/new90-m20/${revision}/app.${oldHash}.mjs`,styleHash='d8ab90003813abb3b223129b25bd1d3f4fe276b092004ef716ab4b5e758bc246',manifestHash='c757c008212e6e6f2accd7d19e0030685b6331d99d826defd555337bd18c7c94';
const base=`/_zplay/new90-m20/${revision}/`,manifest=JSON.parse(await readFile(resolve(media,'assets.json'),'utf8'));
manifest.baseUrl='./assets/';
const build=await buildM20Recovery({activeMainModule:'new90m20r1/entry.mjs',baselineRevision:revision,previousAppPath:oldPath,sourceCommit:process.env.GITHUB_SHA||null});
await mkdir(output,{recursive:true});await writeM20Recovery(resolve(output,'build'),build);
const originalConfig={enabled:true,revision,appSha256:oldHash,styleSha256:styleHash,manifestSha256:manifestHash,appSource:'fixture-old-app',styleSource:'',manifestSource:JSON.stringify(manifest),
  media:Object.entries(manifest.files).map(([name,pin])=>({name,key:KV_PREFIX+name,...pin}))};
const style=await readFile(new URL('../../new-games90-20261123/m20/style.css',import.meta.url),'utf8')+'\n'+await readFile(new URL('../../new-games90-20261123/m20-release/host.css',import.meta.url),'utf8');
const model={id:'fresh_multihot20',currency:'ETB',reels:5,rows:3,paylines:20,foundationBet:1,maxWinMultiplier:1000,symbols:['seven','bell','grape','watermelon','lemon','plum','orange','cherry'],
  multiplierValues:[1,2,3,4,5],betLevels:['1.00','2.00'],availableBetLevels:['1.00','2.00'],enabled:true,freshReleaseReady:true,productionApproved:true,probabilityModelAudited:true,wagerAvailability:'available',
  mathVersion:'isolated-browser-fixture',engineVersion:'isolated-browser-fixture',mathSha256:'b'.repeat(64)};
const accepted=new Map(),calls=[],blocked=[],reports=[];let balance='100.00',browser,failure;
const grid=[['bell','bell','watermelon','lemon','bell'],['bell','orange','bell','bell','watermelon'],['seven','orange','bell','bell','watermelon']];
const previous={async fetch(request){const url=new URL(request.url),path=url.pathname;
  if(path==='/')return new Response('<!doctype html><a href="'+GAME_PATH+'">PLAY Multi Hot 20</a>',{headers:{'Content-Type':'text/html'}});
  if(path===GAME_PATH)return new Response(renderGameHTML(originalConfig),{headers:{'Content-Type':'text/html; charset=utf-8','X-Zplay-M20-Release':revision,
    'Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'"}});
  if(path===base+`style.${styleHash}.css`)return new Response(style,{headers:{'Content-Type':'text/css'}});
  if(path===base+`assets.${manifestHash}.json`)return Response.json(manifest);
  if(path.startsWith(base+'assets/')){const name=path.slice((base+'assets/').length);assert(Object.hasOwn(manifest.files,name));return new Response(await readFile(resolve(media,name)),{headers:{'Content-Type':manifest.files[name].contentType}});}
  if(path==='/api/slots/fresh-state'){calls.push({path,method:request.method});return Response.json({authenticated:true,currency:'ETB',sessionGuard:'a'.repeat(64),balance,blockedByActiveGame:null,game:model});}
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
const worker=createM20RecoveryWorker(previous,build.config),appBytes=new TextEncoder().encode(build.staticFiles[0].source).buffer;
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const request=new Request('http://fixture'+req.url,{method:req.method,headers:req.headers,...(chunks.length?{body:Buffer.concat(chunks),duplex:'half'}:{})});
  const response=await worker.fetch(request,{SSG_OFFICIAL_REFERENCES:{get:async key=>key===build.config.appKey?appBytes:null}},{});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch(error){res.writeHead(500);res.end(error.message);}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.ZPLAY_QA_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  for(const width of [360,390,430,1280]) {
    accepted.clear();calls.length=0;balance='100.00';
    const context=await browser.newContext({viewport:{width,height:width===1280?900:844},deviceScaleFactor:2,hasTouch:width<700});
    const page=await context.newPage(),errors=[];page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin){blocked.push(u.origin);return route.abort();}return route.continue();});
    await page.addInitScript(()=>{const draw=CanvasRenderingContext2D.prototype.drawImage;window.fixtureFault={armed:true,failures:0};
      CanvasRenderingContext2D.prototype.drawImage=function(...args){if(window.fixtureFault.armed&&this.canvas.width===1363&&this.canvas.height===766&&document.getElementById('m20-game')?.dataset.phase==='ANIMATING'){
        window.fixtureFault.armed=false;window.fixtureFault.failures++;throw Error('isolated fixture accepted-frame drawing failure');}return draw.apply(this,args);};});
    await page.goto(origin+'/');await page.getByRole('link',{name:'PLAY Multi Hot 20',exact:true}).click();
    await page.getByRole('button',{name:'No',exact:true}).click();
    assert.equal(await page.locator('#m20-game').getAttribute('data-cash-enabled'),'true');
    assert(await page.getByRole('button',{name:'HOLD & SPIN',exact:true}).isEnabled());
    assert.equal(await page.locator('.m20-spin .m20-control-label').evaluate(node=>getComputedStyle(node).clipPath),'none');
    assert(await page.locator('.m20-spin').evaluate(node=>node.querySelector('.m20-control-label').getBoundingClientRect().width<=node.getBoundingClientRect().width));
    await page.screenshot({path:resolve(output,`m20-native-ready-${width}.png`)});
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
    await page.getByRole('button',{name:'Menu',exact:true}).click();assert(await page.getByRole('dialog').isVisible());
    await page.getByRole('button',{name:'Settings',exact:true}).click();assert(await page.getByRole('checkbox',{name:'Music',exact:true}).isVisible());
    await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
    reports.push({width,playOpened:true,nativeMediaVerified:true,drawFailureObserved:true,acceptedReceiptRecoveredLocally:true,unchangedAcceptedKey:true,spinPosts:1,takePosts:0,
      menuAndSettingsResponded:true,overflow:false,pageErrors:errors});await context.close();
  }
  assert.deepEqual(blocked,[]);
}catch(error){failure=error.stack;throw error;}
finally{
  await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));
  await writeFile(resolve(output,'browser-report.json'),JSON.stringify({schema:'zplay/m20-built-recovery-browser-qa/v1',testedAt:new Date().toISOString(),passed:!failure&&reports.length===4,failure,
    sourceCommit:build.report.sourceCommit,appSha256:build.config.appSha256,appBytes:build.config.appBytes,workerBytes:build.report.workerBytes,
    scope:'Exact release JS through actual mounted DOM, retained native image/audio assets and existing host transport using an isolated HTTP receipt fixture. No production wager, funds or ledger mutation.',
    reports,blocked,productionRequests:0,authenticatedProductionRounds:0,providerParityVerified:false},null,2)+'\n');
}
