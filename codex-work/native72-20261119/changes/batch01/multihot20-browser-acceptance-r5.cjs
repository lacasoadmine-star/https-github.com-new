#!/usr/bin/env node
/*
 * Repeatable local acceptance of the ACTUAL Multi Hot 20 app/modules/assets.
 * QA ONLY: this process binds 127.0.0.1, blocks external browser requests and
 * uses an isolated in-memory fixture ledger. No real Player account, wallet,
 * network backend, RNG certification or official visual parity is tested.
 *
 * node multihot20-browser-acceptance-r5.cjs --assets /absolute/fresh-m20-media
 * Optional: --manifest /absolute/assets.json --output /tmp/m20-browser-qa
 *           --viewports 360x800,390x844,412x915,430x932,768x1024,1440x900,844x390
 *           --serve-only (loopback fixture for an authorized visible browser)
 */
'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const os=require('node:os');
const assert=require('node:assert/strict');
const {createHash,randomUUID}=require('node:crypto');
const {pathToFileURL}=require('node:url');
const argv=process.argv.slice(2),option=(name,fallback)=>{const i=argv.indexOf('--'+name);return i>=0?argv[i+1]:fallback};
const gameDir=path.join(__dirname,'multihot20'),mediaDir=option('assets',process.env.M20_QA_ASSETS);
const manifestPath=option('manifest',path.join(gameDir,'assets.json'));
const outputDir=option('output',path.join(os.tmpdir(),'zplay-m20-browser-qa-'+Date.now()));
const widths=option('viewports','360x800,390x844,412x915,430x932,768x1024,1440x900,844x390').split(',').map(pair=>{const [width,height]=pair.split('x').map(Number);assert.ok(width>=300&&height>=300,'invalid viewport');return{width,height}});
const FULL_WIDTH=Number(option('full-width','390'));
const SERVE_ONLY=argv.includes('--serve-only');
const PREFIX='/new74/multi-hot-20/',GAME_ID='fresh_multihot20',GUARD='c'.repeat(64);
const QA_CSS='/__m20_qa__/capture-label.css';
const QA_BADGE_CSS='#qa-capture-label{position:fixed;top:4px;left:4px;z-index:2147483647;background:#731111;color:white;font:10px sans-serif;padding:4px 6px;border-radius:3px;pointer-events:none}';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const money=c=>`${c/100n}.${String(c%100n).padStart(2,'0')}`;
const cents=s=>{assert.match(s,/^\d+\.\d{2}$/);return BigInt(s.replace('.',''))};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const json=(res,body,status=200)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-zplay-qa-fixture':'in-memory-only'});res.end(JSON.stringify(body))};
const report={schema:'zplay/multihot20-browser-acceptance/v1',startedAt:new Date().toISOString(),mode:'LOOPBACK_QA_FIXTURE',
 actualWalletAccess:false,productionMathCertification:false,officialVisualParity:false,physicalMobilePerformance:false,
 audioScope:'HTMLMediaElement decode/play and event mapping only; no audible waveform parity claim',
 mediaDirectory:mediaDir||null,manifestPath,outputDir,viewports:[],externalRequests:[],sourceDigests:{},errors:[]};
let server,browser,evaluator,reference,productionCSP;

async function readBody(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>65536)throw Error('BODY_TOO_LARGE')}return JSON.parse(text)}
function fixture(){
 const model={id:GAME_ID,title:'Multi Hot 20',reels:5,rows:3,paylines:20,enabled:true,freshReleaseReady:true,
  mathVersion:'QA_BROWSER_ONLY_v1',engineVersion:'QA_CAPTURED_EVALUATOR_v1',mathSha256:digest(Buffer.from('QA fixture: not an approved production probability model')),
  betLevels:['1.00','2.00','5.00','8.00','10.00','20.00'],symbols:Object.keys(reference.paytable),paytable:reference.paytable,
  features:{fixedPaylines:20,multipliers:[1,2,3,4,5],gamble:true,freeSpins:false},qaFixture:true};
 const f={balance:100000n,round:null,requests:[],ledger:[],rounds:new Map(),actions:new Map(),failNext:null,failNextAction:null,injectedFaults:[],responseDelay:90,model};
 f.state=()=>({authenticated:true,sessionGuard:GUARD,currency:'ETB',balance:money(f.balance),game:model,round:f.round,qaFixture:true});
 f.spin=body=>{
  assert.equal(body.gameId,GAME_ID);assert.equal(body.sessionGuard,GUARD);assert.ok(model.betLevels.includes(body.bet));
  for(const key of ['mathVersion','engineVersion','mathSha256'])assert.equal(body[key],model[key]);
  const existing=f.rounds.get(body.roundToken);
  if(existing){assert.equal(existing.bet,body.bet);return existing}
  if(body.replayOnly)throw Object.assign(Error('ROUND_NOT_FOUND_FOR_REPLAY'),{status:404});
  // Deliberate deterministic winning arrangement for UI acceptance only.
  // Actual integer evaluator computes the receipt; the browser does not.
  const grid=[['cherry','cherry','cherry','cherry','cherry'],['bell','seven','lemon','plum','orange'],['grape','watermelon','orange','bell','seven']];
  const evaluated=evaluator({gameId:GAME_ID,grid,bet:body.bet,wheelMultiplier:1});
  const stake=cents(body.bet),payout=evaluated.finalWinCents,before=f.balance;
  assert.ok(before>=stake);f.balance=before-stake+payout;
  const receipt={gameId:GAME_ID,roundId:randomUUID(),roundToken:body.roundToken,bet:body.bet,currency:'ETB',isFree:false,
   mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:model.mathSha256,
   grid:evaluated.grid,wheelMultiplier:evaluated.wheelMultiplier,winLines:evaluated.winLines,finalWin:evaluated.finalWin,
   features:{expandedWildReels:[]},walletReceipt:{currency:'ETB',balanceBefore:money(before),chargedStake:body.bet,finalWin:money(payout),balanceAfter:money(f.balance)},qaFixture:true};
  f.rounds.set(body.roundToken,receipt);f.ledger.push({kind:'BET',token:body.roundToken,amount:body.bet});
  if(payout)f.ledger.push({kind:'WIN',token:body.roundToken,amount:money(payout)});
  f.round={result:receipt,gamble:{attempt:0,stake:money(payout),available:payout>0n&&payout<=50000n,maxAttempts:5,maxStake:'500.00',reason:null}};
  return receipt;
 };
 f.gamble=body=>{
  assert.equal(body.gameId,GAME_ID);assert.equal(body.sessionGuard,GUARD);
  const saved=f.actions.get(body.roundToken);if(saved){assert.equal(saved.choice,body.choice);return saved}
  if(body.replayOnly)throw Object.assign(Error('ROUND_NOT_FOUND_FOR_REPLAY'),{status:404});
  assert.equal(body.roundId,f.round.result.roundId);assert.equal(body.expectedAttempt,f.round.gamble.attempt+1);
  assert.equal(body.expectedStake,f.round.gamble.stake);assert.ok(['RED','BLACK'].includes(body.choice));
  for(const key of ['mathVersion','engineVersion','mathSha256'])assert.equal(body[key],model[key]);
  const before=f.balance,stake=cents(body.expectedStake),color='RED',won=body.choice===color,payout=won?2n*stake:0n;
  assert.ok(before>=stake&&stake>0n&&stake<=50000n);f.balance=before-stake+payout;
  const receipt={kind:'GAMBLE',gameId:GAME_ID,actionId:randomUUID(),roundId:body.roundId,roundToken:body.roundToken,
   currency:'ETB',choice:body.choice,color,won,stake:money(stake),payout:money(payout),attempt:body.expectedAttempt,
   maxAttempts:5,maxStake:'500.00',balanceAfter:money(f.balance),
   mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:model.mathSha256,
   walletReceipt:{currency:'ETB',balanceBefore:money(before),chargedStake:money(stake),finalWin:money(payout),balanceAfter:money(f.balance)},qaFixture:true};
  f.actions.set(body.roundToken,receipt);f.ledger.push({kind:'GAMBLE_BET',token:body.roundToken,amount:money(stake)});
  if(payout)f.ledger.push({kind:'GAMBLE_WIN',token:body.roundToken,amount:money(payout)});
  f.round.gamble={...f.round.gamble,attempt:receipt.attempt,stake:money(payout),available:payout>0n&&receipt.attempt<5&&payout<=50000n,lastResult:receipt};
  return receipt;
 };
 return f;
}
let current;
async function verifyMedia(){
 assert.ok(mediaDir,'--assets must name the fresh verified media directory');
 const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 assert.equal(manifest.gameId,GAME_ID);
 const verified=new Map();
 for(const [file,record] of Object.entries(manifest.files)){
  assert.match(file,/^[a-z0-9][a-z0-9._-]*$/i);const bytes=await fs.readFile(path.join(mediaDir,file));
  assert.equal(bytes.length,record.bytes,'byte count: '+file);assert.equal(digest(bytes),record.sha256,'SHA256: '+file);
  verified.set(file,{bytes,mime:record.contentType});
 }
 report.assets={verifiedCount:verified.size,captureDate:manifest.captureDate,revision:manifest.revision,manifestSha256:digest(await fs.readFile(manifestPath)),
  scope:'Integrity checks of supplied local media only. Capture freshness is not established by this harness; retained audio must keep its recorded provenance.'};
 return {manifest,verified};
}
async function serve(media){
 server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://127.0.0.1');
   if(url.pathname.startsWith('/api/')){
    const f=current,body=req.method==='POST'?await readBody(req):null;
    f.requests.push({method:req.method,path:url.pathname,query:url.search,body,at:Date.now()});
    if(req.method==='GET'&&url.pathname==='/api/slots/fresh-state'){assert.equal(url.searchParams.get('gameId'),GAME_ID);return json(res,f.state())}
    if(req.method==='POST'&&url.pathname==='/api/slots/spin'){
     const receipt=f.spin(body);await delay(f.responseDelay);
     if(f.failNext==='AFTER_COMMIT_503'&&!body.replayOnly){f.failNext=null;f.injectedFaults.push({path:url.pathname,status:503});return json(res,{detail:'QA_INJECTED_DISCONNECT_AFTER_COMMIT'},503)}
     return json(res,receipt);
    }
    if(req.method==='POST'&&url.pathname==='/api/slots/gamble'){
     const receipt=f.gamble(body);await delay(f.responseDelay);
     if(f.failNextAction==='AFTER_COMMIT_503'&&!body.replayOnly){f.failNextAction=null;f.injectedFaults.push({path:url.pathname,status:503});return json(res,{detail:'QA_INJECTED_X2_DISCONNECT_AFTER_COMMIT'},503)}
     return json(res,receipt);
    }
    return json(res,{detail:'QA_ROUTE_NOT_FOUND'},404);
   }
   if(url.pathname==='/favicon.ico'){res.writeHead(204);return res.end()}
   if(url.pathname===QA_CSS){res.writeHead(200,{'content-type':'text/css','cache-control':'no-store'});return res.end(QA_BADGE_CSS)}
   if(!url.pathname.startsWith(PREFIX)){res.writeHead(404);return res.end('Local QA game route only')}
   let relative=decodeURIComponent(url.pathname.slice(PREFIX.length))||'index.html';
   if(relative==='assets.json')return json(res,media.manifest);
   if(relative.startsWith('assets/')){
    const value=media.verified.get(relative.slice(7));if(!value){res.writeHead(404);return res.end('Missing verified asset')}
    res.writeHead(200,{'content-type':value.mime,'cache-control':'no-store'});return res.end(value.bytes);
   }
   assert.ok(!relative.includes('..')&&!path.isAbsolute(relative));
   let bytes=await fs.readFile(path.join(gameDir,relative));
   if(SERVE_ONLY&&relative==='index.html')bytes=Buffer.from(bytes.toString().replace('</head>','<link rel="stylesheet" href="'+QA_CSS+'"></head>').replace('<body>','<body><aside id="qa-capture-label">LOCAL QA — NO REAL FUNDS</aside>'));
   const mime={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'}[path.extname(relative)]||'application/octet-stream';
   res.writeHead(200,{'content-type':mime,'cache-control':'no-store',
    'content-security-policy':productionCSP});res.end(bytes);
  }catch(error){if(!res.headersSent)json(res,{detail:error.message},error.status||500);else res.end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return 'http://127.0.0.1:'+server.address().port;
}
function instrument(){
 const qa=window.__m20QA={raf:[],media:[],mediaErrors:[],held:[],holdAuto:false};
 const originalRAF=window.requestAnimationFrame.bind(window),originalMicrotask=window.queueMicrotask.bind(window);
 window.requestAnimationFrame=callback=>{
  const sceneCall=new Error().stack?.includes('/scene.mjs');
  return originalRAF(time=>{if(sceneCall)qa.raf.push(time);callback(time)});
 };
 window.queueMicrotask=callback=>{
  if(qa.holdAuto&&new Error().stack?.includes('/controller.mjs'))qa.held.push(callback);else originalMicrotask(callback);
 };
 qa.releaseAuto=()=>{qa.holdAuto=false;for(const fn of qa.held.splice(0))originalMicrotask(fn)};
 const originalPlay=HTMLMediaElement.prototype.play,originalPause=HTMLMediaElement.prototype.pause;
 HTMLMediaElement.prototype.play=function(...args){
  const event={src:this.currentSrc||this.src,loop:this.loop};qa.media.push({...event,event:'play',at:performance.now()});
  const promise=originalPlay.apply(this,args);
  if(promise?.then)promise.then(()=>qa.media.push({...event,event:'play-resolved',at:performance.now()}),error=>qa.media.push({...event,event:'play-rejected',reason:error.name,at:performance.now()}));
  return promise;
 };
 HTMLMediaElement.prototype.pause=function(...args){qa.media.push({event:'pause',src:this.currentSrc||this.src,loop:this.loop,at:performance.now()});return originalPause.apply(this,args)};
 const NativeAudio=window.Audio;
 window.Audio=new Proxy(NativeAudio,{construct(target,args){const a=new target(...args);a.addEventListener('error',()=>qa.mediaErrors.push({src:a.currentSrc||a.src,code:a.error?.code}));return a}});
}
const count=(f,pathname)=>f.requests.filter(r=>r.method==='POST'&&r.path===pathname).length;
async function ready(page){await page.waitForFunction(()=>{const b=document.getElementById('spin');return b&&!b.disabled&&!/STOP/.test(b.textContent)&&!document.getElementById('loading')?.offsetHeight},{},{timeout:20000})}
async function close(page,id){const dialog=page.locator('#'+id);if(!await dialog.isVisible())return;const button=dialog.getByRole('button',{name:/^close/i}).first();if(await button.count())await button.click();else await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})}
async function audit(page,label,result){
 const value=await page.evaluate(()=>{
  const scope=document.querySelector('dialog[open]')||document.querySelector('main')||document.body;
  const boxes=[...scope.querySelectorAll('button,select,input,a[href]')].map(element=>{
   const target=element.matches('input[type=checkbox]')?element.closest('label')||element:element;
   const r=target.getBoundingClientRect(),style=getComputedStyle(target);
   return {target,id:element.id||element.getAttribute('aria-label')||element.textContent.trim(),x:r.x,y:r.y,w:r.width,h:r.height,visible:r.width>0&&r.height>0&&style.visibility!=='hidden'&&style.display!=='none'};
  }).filter(b=>b.visible);
  const overlap=[];
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const a=boxes[i],b=boxes[j];if(a.target.contains(b.target)||b.target.contains(a.target))continue;const w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
   if(w>2&&h>2)overlap.push([a.id,b.id]);
  }
  // Rounded controls can have intersecting rectangular bounds while their
  // actual pointer areas remain separate. Test reachable control centres too.
  const occluded=boxes.filter(b=>{
   const x=b.x+b.w/2,y=b.y+b.h/2;
   if(x<0||x>=innerWidth||y<0||y>=innerHeight)return false;
   for(let parent=b.target.parentElement;parent;parent=parent.parentElement){
    const r=parent.getBoundingClientRect(),style=getComputedStyle(parent);
    if(['auto','scroll','hidden','clip'].includes(style.overflowY)&&(y<r.top+parent.clientTop||y>=r.top+parent.clientTop+parent.clientHeight))return false;
    if(['auto','scroll','hidden','clip'].includes(style.overflowX)&&(x<r.left+parent.clientLeft||x>=r.left+parent.clientLeft+parent.clientWidth))return false;
   }
   const hit=document.elementFromPoint(x,y);
   return !hit||!b.target.contains(hit);
  }).map(b=>b.id);
  const nestedOverflow=[scope,...scope.querySelectorAll('*')].filter(element=>{
   const r=element.getBoundingClientRect(),style=getComputedStyle(element);
   return r.width>=44&&r.height>0&&['auto','scroll','hidden','clip'].includes(style.overflowX)&&element.scrollWidth>element.clientWidth+1;
  }).map(element=>({id:element.id||element.className||element.tagName,width:element.clientWidth,contentWidth:element.scrollWidth}));
  return {overflow:document.documentElement.scrollWidth>innerWidth+1,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
   minWidth:Math.min(...boxes.map(x=>x.w)),minHeight:Math.min(...boxes.map(x=>x.h)),smallTargets:boxes.filter(b=>b.w<43.5||b.h<43.5).map(({target,...b})=>b),boundingIntersections:overlap,occluded,nestedOverflow};
 });
 result.layouts.push({label,...value});assert.equal(value.overflow,false,label+' horizontal overflow');
 assert.deepEqual(value.smallTargets,[],label+' touch targets below 44px');assert.deepEqual(value.occluded,[],label+' controls cannot receive a centre tap');
 assert.deepEqual(value.nestedOverflow,[],label+' horizontal overflow inside a clipped or scrolling panel');
}
async function screenshot(page,result,label){
 const file=path.join(outputDir,result.name+'-'+label+'.png');
 await page.evaluate(async href=>{
  if(!document.getElementById('qa-capture-style')){
   const link=document.createElement('link');link.id='qa-capture-style';link.rel='stylesheet';link.href=href;
   await new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=()=>reject(Error('QA_CAPTURE_STYLESHEET_BLOCKED'));document.head.append(link)});
  }
  const badge=document.createElement('div');badge.id='qa-capture-label';badge.textContent='LOCAL QA — NO REAL FUNDS';document.body.append(badge);
 },QA_CSS);
 await page.screenshot({path:file,fullPage:true});await page.locator('#qa-capture-label').evaluate(e=>e.remove());result.screenshots.push(file);
}
async function observe(page){return page.evaluate(()=>({raf:__m20QA.raf,media:__m20QA.media,mediaErrors:__m20QA.mediaErrors}))}

async function openSound(page){await page.locator('#sound').click();await page.locator('#sound-dialog').waitFor({state:'visible'})}
async function restorePage(page){
 await page.locator('#loading').waitFor({state:'hidden',timeout:20000});
 if(await page.locator('#sound-prompt').isVisible())await page.locator('#sound-off').click();
 await ready(page);
}
async function exercise(origin,viewport){
 current=fixture();const f=current,result={name:viewport.width+'x'+viewport.height,viewport,scope:viewport.width===FULL_WIDTH?'FULL_ACCEPTANCE':'RESPONSIVE_AND_PLAY',checks:[],layouts:[],screenshots:[],observationChunks:[],consoleErrors:[],pageErrors:[],httpErrors:[],requestFailures:[]};
 report.viewports.push(result);
 const shortSide=Math.min(viewport.width,viewport.height),mobile=shortSide<=430;
 const context=await browser.newContext({viewport,deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:shortSide<=768,reducedMotion:'no-preference'});
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.externalRequests.push(url);return route.abort('blockedbyclient')});
 await context.addInitScript(instrument);const page=await context.newPage();
 page.setDefaultTimeout(10000);page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text())});
 page.on('pageerror',e=>result.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)result.httpErrors.push({url:r.url(),status:r.status()})});
 page.on('requestfailed',r=>result.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
 try{
  await page.goto(origin+PREFIX,{waitUntil:'networkidle'});await page.bringToFront();await restorePage(page);
  assert.equal(count(f,'/api/slots/spin'),0);assert.equal(await page.evaluate(()=>__m20QA.media.filter(x=>x.event==='play').length),0);
  result.checks.push('Boot: verified assets, existing-session GET, no spin, no sound autoplay');await audit(page,'main',result);await screenshot(page,result,'idle');
  await page.locator('#bet').click();await audit(page,'bet-dialog',result);await page.locator('#bet-options button').filter({hasText:/^2(?:\.00)?\s*ETB$/}).click();
  assert.match(await page.locator('#bet-value').innerText(),/2(?:\.00)?/);assert.equal(count(f,'/api/slots/spin'),0);result.checks.push('BET selection is read-only');
  const before=count(f,'/api/slots/spin'),normalStart=Date.now();await page.locator('#spin').click();
  await page.waitForFunction(()=>document.getElementById('spin').textContent.includes('STOP'));await ready(page);
  result.normalSpinMs=Date.now()-normalStart;assert.equal(count(f,'/api/slots/spin'),before+1);assert.equal((await page.locator('#balance').innerText()).replace(/[^0-9.]/g,''),money(f.balance));
  assert.equal(await page.evaluate(()=>__m20QA.media.filter(x=>x.event==='play').length),0);result.checks.push('Normal SPIN: one POST, integer receipt balance, five-reel presentation, sound still off');
  await screenshot(page,result,'settled');
  await page.locator('#menu').click();await audit(page,'menu-dialog',result);await page.locator('#menu-history').click();
  assert.ok((await page.locator('#history-dialog').innerText()).includes(f.round.result.roundId));await close(page,'history-dialog');
  await page.locator('#menu').click();await page.locator('#menu-rules').click();await audit(page,'rules-dialog',result);await screenshot(page,result,'rules');await close(page,'rules-dialog');
  result.checks.push('MENU, HISTORY and RULES operate on settled server state');
  const doubleBefore=count(f,'/api/slots/spin'),stopStart=Date.now();await page.locator('#spin').dblclick({delay:35});await ready(page);
  result.stopSpinMs=Date.now()-stopStart;assert.equal(count(f,'/api/slots/spin'),doubleBefore+1);result.checks.push('Double SPIN/STOP tap: one POST and one settled round');
  await openSound(page);await audit(page,'sound-dialog',result);
  await page.locator('#music-opt').uncheck();
  if(await page.locator('#effects-opt').count())await page.locator('#effects-opt').check();
  const save=page.locator('#sound-save');if(await save.count())await save.click();else await page.locator('#sound-on').click();
  const plays=await page.evaluate(()=>__m20QA.media.filter(x=>x.event==='play').length);await page.locator('#turbo').click();
  await audit(page,'quick-dialog',result);await page.locator('#quick-confirm').click();await page.waitForTimeout(100);
  assert.ok(await page.evaluate(n=>__m20QA.media.filter(x=>x.event==='play').length>n,plays));
  assert.equal(await page.evaluate(()=>__m20QA.media.filter(x=>x.event==='play'&&x.loop).length),0);
  const soundStart=await page.evaluate(()=>__m20QA.media.length),soundSpinBefore=count(f,'/api/slots/spin');
  await page.locator('#spin').click();await ready(page);assert.equal(count(f,'/api/slots/spin'),soundSpinBefore+1);
  const roundSounds=await page.evaluate(start=>__m20QA.media.slice(start),soundStart);
  const audioCount=file=>roundSounds.filter(x=>x.event==='play'&&new URL(x.src).pathname.endsWith('/'+file)).length;
  assert.equal(audioCount('spin.mp3'),1);assert.equal(audioCount('reel-stop.mp3'),5);assert.equal(audioCount('win.mp3'),1);
  assert.ok(roundSounds.some(x=>x.event==='play-resolved'),'user-initiated real audio playback resolved');
  result.checks.push('Opted-in fast SPIN plays one spin, five reel-stop and one win clip from verified audio');
  await openSound(page);
  await page.locator('#effects-opt').uncheck();await page.locator('#music-opt').uncheck();await page.locator('#sound-save').click();
  if(await page.locator('#turbo').getAttribute('aria-pressed')==='true')await page.locator('#turbo').click();result.checks.push('Effects require opt in; music remains off; mute restores silence');
  await page.locator('#auto').click();await audit(page,'auto-dialog',result);const armedBefore=count(f,'/api/slots/spin');
  const countButton=page.locator('[data-auto-count="25"]');if(await countButton.count())await countButton.click();
  else await page.locator('#auto-count').selectOption('5');
  await page.waitForTimeout(100);assert.equal(count(f,'/api/slots/spin'),armedBefore);await screenshot(page,result,'autoplay');
  await close(page,'auto-dialog');result.checks.push('Selecting AUTO count alone cannot place a wager');
  if(viewport.width===FULL_WIDTH){
   await page.locator('#auto').click();await page.evaluate(()=>{__m20QA.holdAuto=true});await page.locator('#auto-start').click();
   await page.waitForFunction(()=>__m20QA.held.length>0);const queuedPosts=count(f,'/api/slots/spin');
   await page.locator('#auto').click();if(await page.locator('#auto-dialog').isVisible())await page.locator('#auto-stop').click();
   await page.evaluate(()=>__m20QA.releaseAuto());await page.waitForTimeout(200);assert.equal(count(f,'/api/slots/spin'),queuedPosts);
   await ready(page);result.checks.push('STOP AUTO cancels the already queued next-round callback');
   f.failNext='AFTER_COMMIT_503';const disconnectBefore=count(f,'/api/slots/spin'),roundsBefore=f.rounds.size;
   await page.locator('#spin').click();await page.locator('#retry').waitFor({state:'visible'});
   const initial=f.requests.filter(x=>x.path==='/api/slots/spin').at(-1).body;await screenshot(page,result,'recover-required');
   assert.equal(f.rounds.size,roundsBefore+1);assert.ok(await page.locator('#spin').isDisabled());
   assert.ok(await page.locator('#win-banner').isHidden());assert.ok(await page.locator('#win-actions').isHidden());
   result.observationChunks.push(await observe(page));await page.reload({waitUntil:'networkidle'});await page.locator('#loading').waitFor({state:'hidden'});
   if(await page.locator('#sound-prompt').isVisible())await page.locator('#sound-off').click();
   await page.locator('#retry').waitFor({state:'visible'});assert.equal(count(f,'/api/slots/spin'),disconnectBefore+1);
   await page.locator('#retry').click();await ready(page);
   const replay=f.requests.filter(x=>x.path==='/api/slots/spin').at(-1).body;
   assert.equal(replay.roundToken,initial.roundToken);assert.equal(replay.bet,initial.bet);assert.equal(replay.replayOnly,true);
   assert.equal(f.rounds.size,roundsBefore+1);assert.equal(f.ledger.filter(x=>x.kind==='BET'&&x.token===initial.roundToken).length,1);
   result.checks.push('Committed-then-503 + reload + retry preserves token and one debit');
   const gambleBefore=count(f,'/api/slots/gamble'),postBefore=f.requests.filter(x=>x.method==='POST').length;
   await page.locator('#gamble').click();await audit(page,'gamble-dialog',result);assert.equal(f.requests.filter(x=>x.method==='POST').length,postBefore);
   await page.locator('#gamble-red').click();await page.waitForFunction(()=>!document.getElementById('spin').disabled);
   assert.equal(count(f,'/api/slots/gamble'),gambleBefore+1);assert.equal(f.actions.size,1);await screenshot(page,result,'gamble-result');
   await close(page,'gamble-dialog');
   // The accepted parent grid must survive a lost X2 response. The comparison
   // is against this session's own settled canvas, not a fixed pixel golden.
   const parentCanvas=await page.locator('#reels').evaluate(canvas=>canvas.toDataURL());
   const parentRound=f.round.result.roundId,actionsBefore=f.actions.size,postsBeforeAction=count(f,'/api/slots/gamble');
   f.failNextAction='AFTER_COMMIT_503';await page.locator('#gamble').click();await page.locator('#gamble-red').click();
   await page.locator('#retry').waitFor({state:'visible'});
   const pendingAction=f.requests.filter(x=>x.path==='/api/slots/gamble').at(-1).body;
   assert.equal(count(f,'/api/slots/gamble'),postsBeforeAction+1);assert.equal(f.actions.size,actionsBefore+1);
   assert.ok(await page.locator('#spin').isDisabled());assert.ok(await page.locator('#win-banner').isHidden());
   assert.ok(await page.locator('#win-actions').isHidden());
   result.observationChunks.push(await observe(page));await page.reload({waitUntil:'networkidle'});
   await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#retry').waitFor({state:'visible'});
   assert.equal(count(f,'/api/slots/gamble'),postsBeforeAction+1,'X2 reload cannot replay automatically');
   assert.equal(await page.locator('#zplay').getAttribute('data-round-id'),parentRound);
   assert.equal(await page.locator('#reels').evaluate(canvas=>canvas.toDataURL()),parentCanvas,'pending X2 restores its already settled parent canvas');
   assert.equal(await page.evaluate(()=>__m20QA.raf.length),0,'parent restore starts no reel animation');
   assert.equal(await page.evaluate(()=>__m20QA.media.filter(x=>x.event==='play').length),0,'parent restore is silent');
   await screenshot(page,result,'gamble-recover-parent');await page.locator('#retry').click();await ready(page);
   const actionReplay=f.requests.filter(x=>x.path==='/api/slots/gamble').at(-1).body;
   assert.equal(actionReplay.roundToken,pendingAction.roundToken);assert.equal(actionReplay.roundId,pendingAction.roundId);
   assert.equal(actionReplay.choice,pendingAction.choice);assert.equal(actionReplay.expectedStake,pendingAction.expectedStake);
   assert.equal(actionReplay.expectedAttempt,pendingAction.expectedAttempt);assert.equal(actionReplay.replayOnly,true);
   assert.equal(f.actions.size,actionsBefore+1);assert.equal(f.ledger.filter(x=>x.kind==='GAMBLE_BET'&&x.token===pendingAction.roundToken).length,1);
   assert.equal(await page.evaluate(()=>__m20QA.raf.length),0,'X2 recovery never spins the parent again');
   assert.equal((await page.locator('#balance').innerText()).replace(/[^0-9.]/g,''),money(f.balance));
   result.checks.push('Committed X2 then503 + reload restores parent silently; same-token replay settles one action/debit');
   const beforeTake=f.requests.length,balanceBeforeTake=f.balance,ledgerBeforeTake=f.ledger.length;
   await page.locator('#take-win').click();await ready(page);
   const takeRequests=f.requests.slice(beforeTake);assert.ok(takeRequests.length>=1);assert.ok(takeRequests.every(x=>x.method==='GET'));
   assert.equal(f.balance,balanceBeforeTake);assert.equal(f.ledger.length,ledgerBeforeTake);result.checks.push('X2 opening does not wager; RED submits one fixture action; TAKE WIN is GET-only and cannot credit twice');
   const beforeReloadPosts=f.requests.filter(x=>x.method==='POST').length;
   result.observationChunks.push(await observe(page));await page.reload({waitUntil:'networkidle'});await restorePage(page);assert.equal(f.requests.filter(x=>x.method==='POST').length,beforeReloadPosts);
   await page.locator('#menu').click();await page.locator('#menu-history').click();assert.ok((await page.locator('#history-dialog').innerText()).includes(f.round.result.roundId));await close(page,'history-dialog');
   result.checks.push('Settled refresh restores round/history without another POST');await screenshot(page,result,'restored');
  }
  const observed=await observe(page),chunks=[...result.observationChunks,observed];
  const intervals=chunks.flatMap(chunk=>{const times=[...new Set(chunk.raf)];return times.slice(1).map((t,i)=>t-times[i]).filter(dt=>dt>1&&dt<200)});
  result.rafCadence={sampleCount:intervals.length,meanFps:intervals.length?1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length):null,
   medianFps:intervals.length?1000/[...intervals].sort((a,b)=>a-b)[Math.floor(intervals.length/2)]:null,claim:'Browser RAF cadence only; not physical device FPS certification'};
  result.mediaEvents=chunks.flatMap(c=>c.media);result.mediaErrors=chunks.flatMap(c=>c.mediaErrors);
  const idleFrames=observed.raf.length;await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>__m20QA.raf.length),idleFrames);
  assert.deepEqual(result.pageErrors,[]);assert.deepEqual(result.mediaErrors,[]);
  assert.deepEqual(result.httpErrors.map(e=>({path:new URL(e.url).pathname,status:e.status})),f.injectedFaults,'only explicitly injected503 responses are permitted');
  assert.ok(result.consoleErrors.every(e=>e.includes('503')&&viewport.width===FULL_WIDTH),'unexpected browser console error');
  assert.deepEqual(result.requestFailures,[]);result.status='PASS';
 }catch(error){result.status='FAIL';result.error=error.stack;await screenshot(page,result,'failure').catch(()=>{});report.errors.push({viewport:result.name,error:error.message})}
 finally{
  result.requests=f.requests;result.ledger=f.ledger;result.injectedFaults=f.injectedFaults;result.roundCount=f.rounds.size;result.actionCount=f.actions.size;result.finalFixtureBalance=money(f.balance);
  await context.close();console.log(JSON.stringify({viewport:result.name,status:result.status,checks:result.checks.length,error:result.error?.split('\n')[0],raf:result.rafCadence}));
 }
}
(async()=>{
 await fs.mkdir(outputDir,{recursive:true});
 try{
  const math=await import(pathToFileURL(path.join(__dirname,'server/official-math.mjs')).href);evaluator=math.evaluateCapturedMath;reference=math.GAME_REFERENCE[GAME_ID];
  const routeSource=await fs.readFile(path.join(__dirname,'player-kv-route.mjs'),'utf8');
  const cspLiteral=routeSource.match(/const CSP=("[^"\n]*");/);assert.ok(cspLiteral,'production route CSP literal must be available');
  productionCSP=JSON.parse(cspLiteral[1]);report.contentSecurityPolicy={policy:productionCSP,source:'player-kv-route.mjs',sourceSha256:digest(Buffer.from(routeSource)),qaInlineException:false};
  const media=await verifyMedia();
  for(const name of ['index.html','style.css','app.mjs','scene.mjs','assets.mjs','controller.mjs','session.mjs','../player-kv-route.mjs'])report.sourceDigests[name]=digest(await fs.readFile(path.join(gameDir,name)));
  if(SERVE_ONLY){
   current=fixture();const origin=await serve(media);report.localOrigin=origin;report.status='MANUAL_QA_SERVER_ONLY';
   console.log(JSON.stringify({mode:report.status,url:origin+PREFIX,verifiedMedia:media.verified.size,realWallet:false,note:'No automated browser checks have run. Stop with SIGINT or SIGTERM.'}));
   await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve)});
   report.manualFixture={requests:current.requests,ledger:current.ledger,roundCount:current.rounds.size,finalBalance:money(current.balance)};
   return;
  }
  let playwrightPath;
  try{playwrightPath=require.resolve('playwright')}catch{
   const modules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules';
   playwrightPath=require.resolve(path.join(modules,'playwright'));
  }
  const {chromium}=require(playwrightPath);
  const systemChromium=await fs.access('/usr/bin/chromium').then(()=>true,()=>false);
  const executable=process.env.M20_QA_CHROMIUM||(systemChromium?'/usr/bin/chromium':chromium.executablePath());report.browser={executable,playwright:playwrightPath};
  const origin=await serve(media);report.localOrigin=origin;
  browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=user-gesture-required']});
  report.browser.version=browser.version();
  for(const viewport of widths)await exercise(origin,viewport);
  assert.deepEqual(report.externalRequests,[],'browser attempted a nonlocal request');
  for(const [name,hash] of Object.entries(report.sourceDigests))assert.equal(digest(await fs.readFile(path.join(gameDir,name))),hash,'source changed during QA: '+name);
  report.status=report.errors.length?'FAIL':'PASS';
 }catch(error){report.status='FAIL';report.errors.push({fatal:error.stack})}
 finally{
  await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));
  report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,report:path.join(outputDir,'report.json'),passed:report.viewports.filter(v=>v.status==='PASS').length,total:report.viewports.length,errors:report.errors}));
  process.exitCode=['PASS','MANUAL_QA_SERVER_ONLY'].includes(report.status)?0:1;
 }
})();
