// Repeatable browser QA of the actual Play Now app with existing live artwork.
// Every financial request is intercepted; this script cannot submit a live wager.
// Usage: node browser-qa.cjs [artifact-directory]
require('node:dns').setDefaultResultOrder('ipv4first');
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const ORIGIN='https://superwin-player.apdiy61.workers.dev';
const PREFIX='/native-library/existing-new/20261110-etb1-40000-r1/multihot40/';
const ID='multihot40_native';
// Original provider Baraban is row-major; native receipts are five columns.
const FINAL_GRID=[[7,7,7,7],[6,6,5,5],[3,2,2,7],[2,2,2,2],[4,4,5,5]];
const output=path.resolve(process.argv[2]||process.env.MH40_QA_OUTPUT||'work/mh40-browser-qa');
const sourceDir=__dirname;
(async()=>{
 await fs.mkdir(output,{recursive:true});
 await fs.rm(path.join(output,'failure.png'),{force:true});
 const browser=await chromium.launch({headless:true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{}),executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const page=await context.newPage();
 const report={scope:'Browser network-intercept QA with existing live assets; no live Player session, ETB debit or settlement',route:ORIGIN+'/games/'+ID,startedAt:new Date().toISOString(),checks:[],screenshots:[],actions:[],forwardedMutationRequests:[],blockedMutationRequests:[],pageErrors:[],assetReads:[],sourceHashes:{}};
 let config=null,round=null,balance='100.00',launchable=true,releaseAction=null,actionDelay=false,failConfig=false,winningFixture=false;
 const observedWin=JSON.parse(await fs.readFile(path.join(sourceDir,'../../qa/evidence/mh40-r4/official-win.json'),'utf8')).win;
 const decimal=n=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;
 const cache=new Map();
 const app=await fs.readFile(path.join(sourceDir,'multihot40-app.mjs'),'utf8');
 const overrides=new Map([
 ['/zplay-fixes/mh40-20261117/multihot40-app.mjs',app.replace(/void boot\(\);\s*$/,`globalThis.__mh40qa={events:[],audioEvents:[],installAudioSpy:()=>{const audio=presenter.audio,play=audio.play.bind(audio);audio.play=(key,options={})=>{const result=play(key,options);globalThis.__mh40qa.audioEvents.push({key,loop:options.loop===true,played:result!==null,time:performance.now()});return result;};},snapshot:()=>({state,operation,visualBusy,auto:auto.snapshot(),holdActive:hold?.active,motion:{phase:presenter.motion.phase,grid:presenter.motion.grid,multiplier:presenter.motion.multiplier,reelStopped:presenter.motion.reelStopped},audio:{hidden:presenter.audio?.hidden,effects:presenter.audio?.effects,music:presenter.audio?.music,buffers:presenter.audio?.buffers.size,contextState:presenter.audio?.context?.state,nodes:presenter.audio?.nodes.size}}),refresh:()=>session.refresh({quiet:true}),start:()=>doStart()};const qaEvent=presenter.event.bind(presenter);presenter.event=event=>{globalThis.__mh40qa.events.push({...event,time:performance.now()});qaEvent(event);};void boot();`)],
 [PREFIX+'multihot40-presentation.mjs',await fs.readFile(path.join(sourceDir,'multihot40-presentation.mjs'),'utf8')],
 [PREFIX+'presentation/multihot40-motion.mjs',await fs.readFile(path.join(sourceDir,'multihot40-motion.mjs'),'utf8')],
 ['/native-library/reference-art/r1/smartsoft/assets/78c1090bbcdb90e0714e4ad43bc06a1a9030d17ee9b1f39490a880a11a681fbe.mp3',await fs.readFile(path.join(sourceDir,'assets/nice-win.mp3'))],
 ]);
 for(const [url,body] of overrides)report.sourceHashes[url]=crypto.createHash('sha256').update(body).digest('hex');
 report.productionAppSourceSha256=crypto.createHash('sha256').update(app).digest('hex');
 const state=()=>({authenticated:true,sessionId:'qa-only-no-live-auth',currency:'ETB',balance,game:{id:ID,version:config.version,launchable,minStake:config.minStake,maxStake:config.maxStake},round,accepting:true,other_active_game:null,server_now:Date.now()});
 page.on('pageerror',error=>report.pageErrors.push(error.message));
 await page.route('**/*',async route=>{
  try{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==ORIGIN){if(!['GET','HEAD','OPTIONS'].includes(request.method())){report.blockedMutationRequests.push(url.origin+url.pathname);return route.abort();}return route.continue();}
  if(overrides.has(url.pathname))return route.fulfill({status:200,contentType:url.pathname.endsWith('.mp3')?'audio/mpeg':'application/javascript; charset=utf-8',body:overrides.get(url.pathname)});
  if(url.pathname==='/api/expansion/state')return route.fulfill({json:state()});
  if(url.pathname==='/api/expansion/action'){
   const body=request.postDataJSON();report.actions.push(body);
   assert.equal(body.game_id,ID);
   if(body.type==='action'){
    assert.equal(body.action,'collect');assert.equal(round?.status,'active');assert.equal(body.round_id,round.round_id);
    balance=decimal(BigInt(balance.replace('.',''))+BigInt(round.currentCashoutMinor));
    round={...round,status:'settled',version:round.version+1,payoutMinor:round.currentCashoutMinor,actions:[]};
    return route.fulfill({json:{...state(),status:'SUCCESS',request_id:body.request_id,game_id:ID,replayed:false}});
   }
   assert.equal(body.type,'start');
   if(actionDelay)await new Promise(resolve=>{releaseAction=resolve;});
   round={game_id:ID,round_id:crypto.randomUUID(),model_version:config.version,status:'settled',version:1,stakeMinor:String(BigInt(body.stake.replace('.',''))),payoutMinor:'0',grid:FINAL_GRID,wins:[],feature:{multiplier:1},actions:[]};
   const stake=BigInt(body.stake.replace('.',''));
   balance=decimal(BigInt(balance.replace('.',''))-stake);
   if(winningFixture){
    // Original DMO receipt normalized to the requested QA stake. This is only
    // the intercepted server fixture, never production payout calculation.
    const payout=BigInt(observedWin.TotalWin)*stake/BigInt(observedWin.LinePlay*observedWin.BetPerLine);
    round={...round,status:'active',currentCashoutMinor:String(payout),baseWinMinor:String(payout/BigInt(observedWin.Multiplier)),
     feature:{multiplier:observedWin.Multiplier},actions:['collect','gamble'],
     grid:Array.from({length:5},(_,col)=>Array.from({length:4},(_,row)=>observedWin.Baraban[row*5+col])),
     wins:observedWin.WinLinesStrips.map(line=>({line:line.LineNumber+1,symbol:line.Strip,cells:line.Indexes.map(index=>[index%5,Math.floor(index/5)]),payoutMinor:String(BigInt(line.Win)*stake*BigInt(observedWin.Multiplier)/BigInt(observedWin.LinePlay*observedWin.BetPerLine))}))};
   }
   return route.fulfill({json:{...state(),status:'SUCCESS',request_id:body.request_id,game_id:ID,replayed:false}});
  }
  if(!['GET','HEAD','OPTIONS'].includes(request.method())){report.blockedMutationRequests.push(url.pathname);return route.abort();}
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:401,json:{error:'PLAYER_LOGIN_REQUIRED'}});
  if(url.pathname.endsWith('/games.json')&&url.pathname.startsWith(PREFIX)){
   if(failConfig){failConfig=false;return route.abort('failed');}
   const response=await route.fetch();const body=await response.text();config=JSON.parse(body).find(game=>game.id===ID);assert.ok(config);return route.fulfill({response,body});
  }
  // Reuse exact live GET bytes across viewport checks. No assets are generated.
  if(cache.has(request.url()))return route.fulfill(cache.get(request.url()));
  const response=await route.fetch();const body=await response.body();
  if(url.pathname.startsWith('/native-library/'))report.assetReads.push({path:url.pathname,status:response.status(),bytes:body.length,sha256:crypto.createHash('sha256').update(body).digest('hex')});
  const value={status:response.status(),headers:response.headers(),body};cache.set(request.url(),value);return route.fulfill(value);
  }catch(error){report.routeError=error.message;await route.fulfill({status:599,body:'QA transport failure'}).catch(()=>{});}
 });
 try{
  const response=await page.goto(report.route,{waitUntil:'domcontentloaded',timeout:45000});assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.querySelector('#soundNo')&&!document.querySelector('#soundConsent').hidden,{timeout:60000});
  await page.locator('#soundNo').click();
  await page.waitForFunction(()=>!document.querySelector('#spin').disabled);
  report.checks.push('Actual app loaded verified live artwork with original manifest hashes');
  const beforeQuickPlay=report.actions.length;
  await page.locator('#turbo').click();
  await page.locator('#quickPlayDialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#turbo').getAttribute('aria-pressed'),'false');
  await page.locator('#quickPlayCancel').click();
  assert.equal(await page.locator('#turbo').getAttribute('aria-pressed'),'false');
  await page.locator('#turbo').click();await page.locator('#quickPlayConfirm').click();
  assert.equal(await page.locator('#turbo').getAttribute('aria-pressed'),'true');
  await page.locator('#turbo').click();
  assert.equal(await page.locator('#turbo').getAttribute('aria-pressed'),'false');
  await page.locator('#turbo').click();await page.locator('#quickPlayDialog').waitFor({state:'visible'});
  await page.screenshot({path:path.join(output,'mh40-quick-play.png')});report.screenshots.push('mh40-quick-play.png');
  await page.locator('#quickPlayCancel').click();assert.equal(report.actions.length,beforeQuickPlay);
  report.checks.push('Official QUICK PLAY consent required on every enable; NO/confirm toggle only speed and send no wager');
  await page.locator('#sound').click();
  await page.waitForFunction(()=>globalThis.__mh40qa.snapshot().audio.contextState==='running'&&globalThis.__mh40qa.snapshot().audio.buffers>0);
  report.decodedAudioBuffers=await page.evaluate(()=>globalThis.__mh40qa.snapshot().audio.buffers);
  await page.evaluate(()=>globalThis.__mh40qa.installAudioSpy());
  report.checks.push('Original audio bytes decoded and AudioContext unlocked; auditory parity remains unverified');
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});await page.waitForTimeout(160);
   const controls=await page.evaluate(()=>Object.fromEntries(['spin','auto','bet','menu','sound','turbo'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return[id,{x:r.x,y:r.y,width:r.width,height:r.height}];})));
   for(const [id,r]of Object.entries(controls)){assert.ok(r.width>=44&&r.height>=44,`${width}px ${id} target: ${JSON.stringify(r)}`);assert.ok(r.x>=-.5&&r.x+r.width<=width+.5,`${id} outside viewport`);}
   const overlap=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>.5&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>.5;
   assert.equal(overlap(controls.turbo,controls.spin),false);assert.equal(overlap(controls.turbo,controls.bet),false);
   const screenshot=`mh40-${width}.png`;await page.screenshot({path:path.join(output,screenshot)});report.screenshots.push(screenshot);report.checks.push({width,controls});
  }
  await page.setViewportSize({width:1440,height:900});
  actionDelay=true;
  await page.evaluate(()=>{document.querySelector('#spin').click();document.querySelector('#spin').click();});
  await page.waitForFunction(()=>globalThis.__mh40qa.snapshot().operation==='start');
  while(!releaseAction)await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(report.actions.length,1);
  const spinAudio=await page.evaluate(()=>globalThis.__mh40qa.audioEvents.slice(0,2));
  assert.deepEqual(spinAudio.map(event=>event.key),['Start/ObjectMoveFast.mp3','Buttons/Spin.mp3']);
  assert.ok(spinAudio.every(event=>event.played&&!event.loop));
  report.spinAudio=spinAudio;
  await page.screenshot({path:path.join(output,'mh40-spinning.png')});report.screenshots.push('mh40-spinning.png');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  assert.equal(await page.evaluate(()=>globalThis.__mh40qa.snapshot().auto.active),false);
  assert.equal(await page.evaluate(()=>globalThis.__mh40qa.snapshot().audio.nodes),0);
  assert.equal(await page.evaluate(()=>globalThis.__mh40qa.snapshot().audio.hidden),true);
  releaseAction();releaseAction=null;actionDelay=false;
  await page.waitForFunction(()=>globalThis.__mh40qa.snapshot().state.round?.status==='settled');
  assert.equal(await page.evaluate(()=>globalThis.__mh40qa.snapshot().state.balance),'99.00');
  await page.waitForFunction(()=>!globalThis.__mh40qa.snapshot().visualBusy);
  const settled=await page.evaluate(()=>globalThis.__mh40qa.snapshot());
  assert.deepEqual(settled.motion.grid,FINAL_GRID);assert.equal(settled.motion.multiplier,1);assert.equal(report.actions.length,1);
  assert.deepEqual(await page.evaluate(()=>globalThis.__mh40qa.events.filter(event=>event.type==='reel-stop').map(event=>event.column)),[0,1,2,3,4]);
  assert.equal(await page.evaluate(()=>globalThis.__mh40qa.audioEvents.some(event=>event.key==='Start/WinMultiplier.mp3')),false);
  assert.equal(await page.evaluate(()=>globalThis.__mh40qa.start()),false);
  await page.screenshot({path:path.join(output,'mh40-settled.png')});report.screenshots.push('mh40-settled.png');
  report.checks.push('Double SPIN sent one intercepted action; blur preserved submitted-round confirmation, exact 5x4 grid, balance and ordered reel stops');
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(()=>!document.querySelector('#spin').disabled);
  await page.locator('#auto').click();await page.locator('#autoCount').selectOption('25');await page.locator('#autoForm button[type=submit]').click();
  await page.waitForFunction(()=>globalThis.__mh40qa.snapshot().auto.active);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(()=>!globalThis.__mh40qa.snapshot().visualBusy);
  const count=report.actions.length;await page.waitForTimeout(600);assert.equal(report.actions.length,count);
  assert.equal(await page.evaluate(()=>globalThis.__mh40qa.snapshot().auto.active),false);
  assert.equal(await page.evaluate(()=>globalThis.__mh40qa.snapshot().holdActive),false);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(100);assert.equal(report.actions.length,count);
  report.checks.push('Blur stopped real AUTO controller and hold state; focus did not restart AUTO');
  launchable=false;await page.evaluate(()=>globalThis.__mh40qa.refresh());
  assert.equal(await page.locator('#spin').isDisabled(),true);assert.equal(report.actions.length,count);
  report.checks.push('Production launchability gate remains closed when backend configuration is disabled');
  report.events=await page.evaluate(()=>globalThis.__mh40qa.events);
  // A transport failure must expose a usable loader retry without deleting
  // saved recovery state or sending a new financial action.
  await page.evaluate(()=>sessionStorage.setItem('qa-loader-pending-marker','retain-original-token'));
  failConfig=true;await page.reload({waitUntil:'domcontentloaded'});
  const retryLoading=page.getByRole('button',{name:'Retry loading',exact:true});
  await retryLoading.waitFor({state:'visible'});
  const reload=page.waitForNavigation({waitUntil:'domcontentloaded'});await retryLoading.click();await reload;
  await page.waitForFunction(()=>document.querySelector('#soundConsent')&&!document.querySelector('#soundConsent').hidden);
  await page.locator('#soundNo').click();
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('qa-loader-pending-marker')),'retain-original-token');
  assert.equal(report.actions.length,count);assert.equal(await page.locator('#spin').isDisabled(),true);
  report.checks.push('Aborted configuration load exposed Retry loading; retry reloaded verified assets, preserved sessionStorage and sent no new wager');
  winningFixture=true;launchable=true;await page.evaluate(()=>globalThis.__mh40qa.refresh());
  await page.locator('#sound').click();await page.waitForFunction(()=>globalThis.__mh40qa.snapshot().audio.contextState==='running');
  await page.evaluate(()=>globalThis.__mh40qa.installAudioSpy());
  const beforeWinActions=report.actions.length;
  await page.locator('#spin').click();
  await page.waitForFunction(()=>globalThis.__mh40qa.audioEvents.some(event=>event.key==='Win/NiceWin.mp3'&&event.played));
  const winAudio=await page.evaluate(()=>globalThis.__mh40qa.audioEvents.find(event=>event.key==='Win/NiceWin.mp3'));
  assert.equal(winAudio.loop,false);report.niceWinAudio=winAudio;
  assert.equal(await page.evaluate(()=>globalThis.__mh40qa.snapshot().state.balance),'97.00');
  await page.screenshot({path:path.join(output,'mh40-nice-win.png')});report.screenshots.push('mh40-nice-win.png');
  await page.waitForFunction(()=>!globalThis.__mh40qa.snapshot().visualBusy);
  await page.evaluate(()=>{document.querySelector('#collect').click();document.querySelector('#collect').click();});
  await page.waitForFunction(()=>globalThis.__mh40qa.snapshot().state.round?.status==='settled'&&!globalThis.__mh40qa.snapshot().state.busy);
  assert.equal(report.actions.length,beforeWinActions+2);
  assert.equal(await page.evaluate(()=>globalThis.__mh40qa.snapshot().state.balance),'115.00');
  report.checks.push('Original positive receipt drove NICE WIN and verified audio; active win credited only after one double-click-safe collect action');
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.forwardedMutationRequests,[]);assert.equal(report.routeError,undefined);
  report.result='PASS';report.completedAt=new Date().toISOString();
 }catch(error){report.result='FAIL';report.error=error.stack;await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}
 finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log(JSON.stringify({result:report.result,checks:report.checks.length,interceptedActions:report.actions.length,realWagers:0,assetReads:report.assetReads.length,pageErrors:report.pageErrors,output}));
})().catch(error=>{console.error(error);process.exitCode=1;});
