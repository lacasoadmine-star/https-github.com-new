// Trusted browser interactions against localhost HTTP APIs and disposable QA ledger.
// No fetch overrides, production credentials, production wallet or production origin.
import {createRequire} from 'node:module';
import {mkdir,readdir,writeFile,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {getGame,publicGames,visibleGrid,receiptGame} from '../test/current-core.mjs';
import {gameConfig,gameConfigForReceipt,legacyGameConfig} from '../public/registry.mjs';
import {evaluate,units,decimal,validateModel,validateRound,validateGamble} from '../public/contract.mjs';
let chromium;try{({chromium}=await import('playwright'));}catch(error){if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw Error('Install the optional Playwright browser QA dependency before running this script.');({chromium}=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/entry.js')('playwright'));}
if(!process.argv.includes('--qa'))throw Error('Pass --qa to use an invented local test account.');
const qaPort=Number(process.argv.find(x=>x.startsWith('--port='))?.split('=')[1]||8767);
if(!Number.isInteger(qaPort)||qaPort<1024||qaPort>65535)throw Error('Invalid local QA port');
const origin='http://127.0.0.1:'+qaPort,width=Number(process.argv.find(x=>x.startsWith('--width='))?.split('=')[1]||390),out=process.argv.find(x=>x.startsWith('--out='))?.slice(6)||fileURLToPath(new URL('../.qa-player-results/',import.meta.url)),results=[],regularRounds=Number(process.argv.find(x=>x.startsWith('--rounds='))?.split('=')[1]||16);
const allGames=['multi_hot_5_video','hot_foxy_20','wild_multi_stars','multi_hot_100'],selectedGames=process.argv.find(x=>x.startsWith('--games='))?.slice(8).split(',')||allGames;
const userAgent=process.env.SUPERWIN_QA_USER_AGENT||'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const minimumPlayMs=Number(process.argv.find(x=>x.startsWith('--min-play-ms='))?.split('=')[1]||0);
const extendedControls=minimumPlayMs>0||process.argv.includes('--extended-controls');
const nativeBundleCounts=Object.freeze({multi_hot_5_video:4,hot_foxy_20:12});
const nativeSymbolCounts=Object.freeze({multi_hot_5_video:9,hot_foxy_20:8});
const backgroundDurations={multi_hot_5_video:87.1706122449,multi_hot_100:1.465,hot_foxy_20:96};
if(!Number.isInteger(minimumPlayMs)||minimumPlayMs<0||minimumPlayMs>3600000)throw Error('Invalid minimum play duration');
if(!Number.isInteger(width)||width<320||width>1024||!Number.isInteger(regularRounds)||regularRounds<1||regularRounds>1000||!selectedGames.length||selectedGames.some(id=>!allGames.includes(id)))throw Error('Invalid QA width, rounds or game selection');
await mkdir(out,{recursive:true});
const executablePath=process.env.SUPERWIN_QA_CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
const browser=await chromium.launch({...(executablePath?{executablePath}:{}),headless:true,args:['--no-sandbox']});
async function publicSource(){const hashes={};for(const name of (await readdir(new URL('../public/',import.meta.url))).sort())hashes[name]=createHash('sha256').update(await readFile(new URL('../public/'+name,import.meta.url))).digest('hex');return hashes;}
const source=await publicSource();
async function run(id){
 const caseStartedAt=Date.now();
 let local,engine;const nativeControls=!!nativeBundleCounts[id],autoCounts=id==='hot_foxy_20'?[25,50,100,500,1000]:id==='multi_hot_5_video'?[10,25,50,75,Infinity]:[10,25];const expectedShape={multi_hot_5_video:[3,3,5],hot_foxy_20:[5,3,20],wild_multi_stars:[5,3,20],multi_hot_100:[5,4,100]}[id];
 const contextOptions={viewport:{width,height:width===360?800:width===430?932:844},deviceScaleFactor:width===360?3:2,isMobile:true,hasTouch:true,userAgent},context=await browser.newContext(contextOptions);
 const page=await context.newPage(),errors=[],requests=[],checks=[];
 page.on('pageerror',e=>errors.push(String(e.stack||e)));page.on('request',r=>requests.push({method:r.method(),url:r.url()}));
 const check=(label,ok)=>{checks.push({label,ok:!!ok});if(!ok)throw Error(label);};
 const call=async(path,body)=>{const r=body===undefined?await context.request.get(origin+path,{maxRetries:2}):await context.request.post(origin+path,{data:body,maxRetries:2});if(!r.ok())throw Error(path+': '+r.status()+' '+await r.text());return r.json();};
 const report=()=>call('/qa/report'),plan=values=>call('/qa/plan',{gameId:id,...values});
 const diag=()=>page.evaluate(async()=>{const src=document.querySelector('script[type="module"][src]').src;return (await import(src)).diagnostics();});
 const untilDiagnostics=async(predicate,label,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){const d=await diag();if(predicate(d))return d;await page.waitForTimeout(40);}throw Error('Timed out '+label);};
 const ready=async()=>{await page.waitForFunction(()=>document.body.dataset.state==='ready',{},{timeout:15000});if(nativeBundleCounts[id]){await untilDiagnostics(d=>d.nativeAnimation?.ready&&d.nativeAnimation.instances===nativeBundleCounts[id]&&d.nativeAnimation.draws>0&&(id!=='multi_hot_5_video'||d.nativeAnimation.decodedPages>=4),'native decorative timelines loaded and rendered',45000);await page.waitForFunction(id=>document.querySelector('#auto-dialog')?.dataset.nativeDialogReady==='true'&&(id!=='hot_foxy_20'||document.querySelector('#settings')?.dataset.nativeBetReady==='true'),id,{timeout:15000});}};
 const tap=async selector=>{const startedAt=Date.now();await page.locator(selector).tap({timeout:6000});outcome.controlInteractions.push({selector,startedAt,endedAt:Date.now()});};
 const close=async dialog=>{
  if(!await page.locator('#'+dialog).evaluate(el=>el.open))return;
  if(dialog==='auto-dialog'&&nativeControls)await tap('#auto-dialog .official-auto-close');
  else if(dialog==='settings'&&await page.locator('#settings').evaluate(el=>el.classList.contains('official-bet-foxy'))){const startedAt=Date.now();await page.keyboard.press('Escape');outcome.controlInteractions.push({selector:'#settings',input:'native Escape dismissal',startedAt,endedAt:Date.now()});}
  else await tap(`[data-close="${dialog}"]`);
  await page.waitForFunction(id=>!document.getElementById(id).open,dialog,{timeout:6000});
 };
 const openMenu=async()=>tap(await page.locator('#menu-top').isVisible()?'#menu-top':'#menu');
 const openBets=async()=>{
  if(await page.locator('#settings').evaluate(el=>el.open)){if(await page.locator('#bets').isVisible())return;await tap('[data-panel="bets"]');return;}
  if(id==='hot_foxy_20')await tap('#bet-quick');
  else if(id==='multi_hot_5_video'){await openMenu();await tap('[data-panel="bets"]');}
  else await tap('#bet-open');
  await page.locator('#bets').waitFor({state:'visible'});
 };
 const chooseStake=async value=>{
  await openBets();const selector=`[data-bet="${value}"]`;
  if(id==='hot_foxy_20'){
   for(let step=0;!await page.locator(selector).isVisible();step++){
    if(step>local.betLevels.length)throw Error('Native bet picker could not reveal '+value);
    const indices=await page.locator('#bet-options').evaluate((root,value)=>{const buttons=Array.from(root.querySelectorAll('[data-bet]'));return{target:buttons.findIndex(b=>b.dataset.bet===value),first:buttons.findIndex(b=>!b.hidden)};},value);
    if(indices.target<0||indices.first<0)throw Error('Missing native bet option '+value);
    await tap(indices.target<indices.first?'.official-bet-up':'.official-bet-down');
   }
  }
  await tap(selector);check('legal stake picker selects '+value,await page.locator('#bet-value').textContent()===value);
  if(id==='hot_foxy_20')check('native Foxy stake choice closes popup',!await page.locator('#settings').evaluate(el=>el.open));
 };
 const checkBalance=async(report,label='displayed balance reconciles credited win')=>{
  const d=await diag(),available=units(report.balance,2),held=units(d.pendingDisplayWin||'0.00')/100n;
  check('authoritative controller balance equals HTTP ledger',d.authoritativeBalance===report.balance);
  check(label,await page.locator('#balance').textContent()===(held<=available?decimal(available-held):report.balance));return d;
 };
 const chooseAutoCount=async count=>{
  if(nativeControls){const before=await report();await tap(`[data-auto-count="${count}"]`);const after=await report();check('AUTO count selection changes no wallet action',after.spinPosts===before.spinPosts&&after.gamblePosts===before.gamblePosts&&after.balance===before.balance);check('AUTO count selection waits for explicit START',await page.locator('#auto-dialog').evaluate(el=>el.open)&&await page.locator(`[data-auto-count="${count}"]`).getAttribute('aria-pressed')==='true');}
  else await tap(`[data-auto="${count}"]`);
 };
 const awaitGambleReady=async()=>{if(nativeControls)await page.waitForFunction(()=>document.querySelector('#gamble-dialog .native-gamble-stage')?.dataset.phase==='ready',{},{timeout:6000});};

 const stopIfAnimating=async point=>{if(await page.locator('body').getAttribute('data-state')!=='animating')return false;const startedAt=Date.now();await page.touchscreen.tap(point.x,point.y);outcome.controlInteractions.push({selector:'#spin',input:'native touchscreen STOP while animating',startedAt,endedAt:Date.now()});return true;};
 let outcome={game:id,width,userAgent,synthetic:true,regularRounds,minimumPlayMs,extendedControls,primaryRounds:[],controlInteractions:[],autoCancellationEvidence:[],timedSteps:[],source:await publicSource(),checks,errors},spinShotTaken=false,lossShotTaken=false,lastPositiveWin='0.00',playClock=0;
 async function controlStep(index){
  const before=await report(),startedAt=Date.now(),step=index%8;let action='';
  if(step===0){
   action='all legal stake options';if(!(await diag()).freeSpinsRemaining){for(const value of local.betLevels)await chooseStake(value);await chooseStake('2.00');await close('settings');}else action+=' (free-spin lock verified)';
  }else if(step===1){
   action='sound settings, test clip and volume keys';await openMenu();await tap('[data-panel="audio"]');await tap('#sound-test');const input=page.locator('#volume'),prior=Number(await input.inputValue());await input.press('ArrowLeft');check('trusted volume key changes slider',Number(await input.inputValue())===Math.max(0,prior-1));await input.press('ArrowRight');check('trusted volume key restores slider',Number(await input.inputValue())===prior);await close('settings');
  }else if(step===2){
   action='history and refresh';await openMenu();await tap('[data-panel="history"]');await tap('#history-refresh');await page.waitForFunction(()=>document.querySelector('#history-items').textContent!=='Loading…',{},{timeout:6000});check('history displays settled rounds',await page.locator('#history-items article').count()>0);await close('settings');
  }else if(step===3){
   action='mute and restore sound';await tap('#sound');await page.waitForTimeout(60);check('trusted mute button is enabled',await page.locator('#sound').getAttribute('aria-pressed')==='true');await tap('#sound');check('trusted sound restore is enabled',await page.locator('#sound').getAttribute('aria-pressed')==='false');
  }else if(step===4){
   if(await page.locator('#turbo').isVisible()){
    action='turbo confirmation, cancellation and restore';
    if(id==='hot_foxy_20'){
     await tap('#turbo');check('Quick Play asks before enabling',await page.locator('#quick-play-dialog').evaluate(el=>el.open)&&!(await diag()).turbo);
     if(!outcome.quickPlayScreenshot){await page.screenshot({path:`${out}/${id}-quick-play-dialog.png`});outcome.quickPlayScreenshot=true;}
     await tap('#quick-play-no');check('Quick Play No keeps normal speed',!await page.locator('#quick-play-dialog').evaluate(el=>el.open)&&!(await diag()).turbo);const no=await report();check('Quick Play No creates no wallet action',no.spinPosts===before.spinPosts&&no.gamblePosts===before.gamblePosts&&no.balance===before.balance);
     await tap('#turbo');await tap('#quick-play-close');check('Quick Play Close keeps normal speed',!await page.locator('#quick-play-dialog').evaluate(el=>el.open)&&!(await diag()).turbo);const closed=await report();check('Quick Play Close creates no wallet action',closed.spinPosts===before.spinPosts&&closed.gamblePosts===before.gamblePosts&&closed.balance===before.balance);
     await tap('#turbo');await tap('#quick-play-enable');check('Quick Play explicit enable activates turbo',!await page.locator('#quick-play-dialog').evaluate(el=>el.open)&&(await diag()).turbo);
    }else await tap('#turbo');
    check('trusted turbo enabled',(await diag()).turbo);await tap('#turbo');check('trusted turbo restored',!(await diag()).turbo);if(id==='hot_foxy_20')check('Quick Play disables immediately without confirmation',!await page.locator('#quick-play-dialog').evaluate(el=>el.open));
   }else{action='legal previous and next stake buttons';if(await page.locator('#bet-more').isEnabled()){const beforeBet=await page.locator('#bet-value').textContent();await tap('#bet-more');await tap('#bet-less');check('stake increment/decrement restores selected stake',await page.locator('#bet-value').textContent()===beforeBet);if(id==='multi_hot_5_video'){await tap('#stake-open');check('MH5 next-stake carousel selects next ladder value',await page.locator('#bet-value').textContent()===local.betLevels[local.betLevels.indexOf(beforeBet)+1]&&!await page.locator('#settings').evaluate(el=>el.open));await tap('#bet-less');}else{await tap('#stake-open');await close('settings');}}}
  }else if(step===5){
   action='paytable and fullscreen button';await tap(await page.locator('#menu-top').isVisible()?'#menu-top':'#menu');await tap('[data-panel="rules"]');check('paytable contains symbol rows',await page.locator('#paytable .pay-row').count()>0);const viewportBefore=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));await tap('#fullscreen');await page.waitForFunction(()=>!document.querySelector('#settings').open||document.querySelector('#notice-text').textContent.includes('Fullscreen is unavailable'),{},{timeout:6000});const entered=await page.evaluate(()=>!!document.fullscreenElement);if(entered)await page.keyboard.press('Escape');if(await page.evaluate(()=>!!document.fullscreenElement))await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(v=>!document.fullscreenElement&&innerWidth===v.width&&innerHeight===v.height,viewportBefore,{timeout:6000});if(await page.locator('#settings').evaluate(el=>el.open))await close('settings');outcome.fullscreenObserved=entered;
  }else if(step===6){
   action='autoplay chooser without a wager';await tap('#auto');for(const count of autoCounts)check('official autoplay count '+count+' is present',await page.locator(nativeControls?`[data-auto-count="${count}"]`:`[data-auto="${count}"]`).isVisible());if(nativeControls){await chooseAutoCount(autoCounts[0]);check('native AUTO has separate START control',await page.locator('#official-auto-start').isVisible());}await close('auto-dialog');
  }else{
   action='eligible gamble/collect controls';if(await page.locator('#gamble-menu').isEnabled()){await openMenu();await tap('#gamble-menu');check('eligible gamble choices visible',await page.locator('#red').isVisible()&&await page.locator('#black').isVisible());await close('gamble-dialog');}if(await page.locator('#collect').isVisible()&&await page.locator('#collect').isEnabled())await tap('#collect');
  }
  const after=await report();check('timed control step changes no wallet balance',after.balance===before.balance&&after.spinPosts===before.spinPosts&&after.gamblePosts===before.gamblePosts);outcome.timedSteps.push({index,action,startedAt,endedAt:Date.now(),elapsedPlayMs:performance.now()-playClock,spinPosts:after.spinPosts,gamblePosts:after.gamblePosts,balance:after.balance});
 }
 async function chooseSoundYes(){
  await page.waitForFunction(()=>document.querySelector('#sound-consent')?.open,{},{timeout:15000});const before=await report();
  check('first authenticated entry asks for sound',await page.locator('#sound-consent').isVisible());await page.screenshot({path:`${out}/${id}-sound-consent.png`});await tap('#sound-yes');
  await page.waitForFunction(()=>!document.querySelector('#sound-consent').open,{},{timeout:6000});const after=await report();
  check('sound Yes submits no wager or gamble',after.spinPosts===before.spinPosts&&after.gamblePosts===before.gamblePosts&&after.balance===before.balance);
  check('sound Yes stores persistent choice',await page.evaluate(()=>localStorage.getItem('zplay:sound-choice'))==='yes');
  check('sound Yes enables sound',await page.locator('#sound').getAttribute('aria-pressed')==='false');
 }
 async function checkSoundNo(){
  const fresh=await browser.newContext(contextOptions),freshPage=await fresh.newPage(),freshErrors=[],freshRequests=[];
  freshPage.on('pageerror',e=>freshErrors.push(String(e)));freshPage.on('request',r=>freshRequests.push(r.url()));
  const freshReport=async()=>{const r=await fresh.request.get(origin+'/qa/report');if(!r.ok())throw Error('Fresh sound-choice QA report unavailable');return r.json();};
  try{
   const session=await fresh.request.post(origin+'/qa/session',{data:{balance:'100000.00'}});if(!session.ok())throw Error('Fresh sound-choice QA session unavailable');
   await freshPage.goto(origin+'/games/'+id,{waitUntil:'domcontentloaded'});await freshPage.waitForFunction(()=>document.body.dataset.state==='ready'&&document.querySelector('#sound-consent')?.open,{},{timeout:15000});
   check('fresh browser context has no saved sound choice',await freshPage.evaluate(()=>localStorage.getItem('zplay:sound-choice'))===null);const before=await freshReport();
   await freshPage.locator('#sound-no').tap();await freshPage.waitForFunction(()=>!document.querySelector('#sound-consent').open,{},{timeout:6000});const after=await freshReport();
   check('sound No mutes and persists choice',await freshPage.locator('#sound').getAttribute('aria-pressed')==='true'&&await freshPage.evaluate(()=>localStorage.getItem('zplay:sound-choice'))==='no');
   check('sound No submits no wager or gamble',after.spinPosts===before.spinPosts&&after.gamblePosts===before.gamblePosts&&after.balance===before.balance);
   await freshPage.reload({waitUntil:'domcontentloaded'});await freshPage.waitForFunction(()=>document.body.dataset.state==='ready',{},{timeout:15000});
   check('sound No remains muted after reload',!await freshPage.locator('#sound-consent').evaluate(el=>el.open)&&await freshPage.locator('#sound').getAttribute('aria-pressed')==='true');
   const final=await freshReport();check('sound-choice reload submits no wager',final.spinPosts===0&&final.gamblePosts===0&&final.balance==='100000.00');check('fresh sound-choice context stays local and error-free',freshErrors.length===0&&freshRequests.every(url=>url.startsWith(origin)||url.startsWith('data:')));
   outcome.soundNo={choice:'no',muted:true,balance:final.balance,spinPosts:final.spinPosts,gamblePosts:final.gamblePosts,errors:freshErrors};
  }finally{await fresh.close();}
 }
 async function round(desired,{natural=false}={}){
  await ready();if(desired)await plan({nextOutcome:desired});const before=await report(),previous=before.rounds.at(-1),spinBox=await page.locator('#spin').boundingBox(),spinPoint={x:spinBox.x+spinBox.width/2,y:spinBox.y+spinBox.height/2};
  const response=page.waitForResponse(r=>r.url()===origin+'/api/slots/spin'&&r.request().method()==='POST');await tap('#spin');const http=await response;check('spin HTTP200',http.status()===200);const receipt=await http.json();const receiptModel=gameConfigForReceipt(receipt),receiptEngine=receiptGame(id,receipt);validateRound(receipt,receiptModel,receipt.bet);check('receipt belongs to a known authoritative engine',!!receiptEngine);check('HTTP receipt independently verifies pinned math',true);check('HTTP receipt has expected rows and reels',receipt.grid.length===expectedShape[1]&&receipt.grid.every(row=>row.length===expectedShape[0]));check('linear game settles exactly one stage',receipt.stages.length===1);
  await page.waitForFunction(()=>['animating','pending','ready'].includes(document.body.dataset.state),{},{timeout:5000});
  if(await page.locator('body').getAttribute('data-state')==='animating'){if(!natural)await stopIfAnimating(spinPoint);else if(!spinShotTaken){await page.screenshot({path:`${out}/${id}-spinning.png`});spinShotTaken=true;}}await ready();const after=await report(),r=after.rounds.at(-1),d=await diag();
  check('trusted SPIN STOP creates one round',after.roundSettlements===before.roundSettlements+1&&after.spinPosts===before.spinPosts+1);
  if(id==='multi_hot_5_video'){
   if(previous&&Number(previous.finalWin)>0)check('first MH5 tap after a win submits exactly one wager',after.spinPosts===before.spinPosts+1&&after.roundSettlements===before.roundSettlements+1);
   if(Number(r.finalWin)>0)lastPositiveWin=r.finalWin;
   check('MH5 ready center displays selected bet',await page.locator('#spin').getAttribute('data-multi-face')==='bet'&&await page.locator('.multi-spin-win').textContent()===r.bet);
   check('MH5 medal retains latest positive validated round',await page.locator('#last-win').textContent()===lastPositiveWin);
   if(desired==='loss'&&!lossShotTaken){await page.screenshot({path:`${out}/${id}-loss-retains-medal.png`});lossShotTaken=true;}
  }
  await checkBalance(after);check('round win stays separate from presented balance only when eligible',d.pendingDisplayWin===(nativeControls&&Number(receipt.finalWin)>0&&!receipt.freeSpinsRemaining?receipt.finalWin:'0.00'));
  check('displayed win equals authoritative receipt',await page.locator('#win').textContent()===r.finalWin);
  check('authoritative final grid rendered',JSON.stringify(d.grid)===JSON.stringify(visibleGrid(receiptEngine,receipt.stops)));check('authoritative final multiplier rendered',d.multiplier===r.wheelMultiplier);
  check('trusted interaction unlocks actual audio',d.audioState==='running'&&d.decodedSoundSamples===(d.gameId==='hot_foxy_20'?15:7));
  if(minimumPlayMs){const expectedDuration=backgroundDurations[id];check('background audio matches verified game mapping',expectedDuration?d.backgroundAudio?.playing&&Math.abs(d.backgroundAudio.durationSeconds-expectedDuration)<.02:!d.backgroundAudio?.loaded&&!d.backgroundAudio?.playing);}
  check('ledger balances after round',after.ledgerBalanced);return {...receipt,...r,qa:{renderedGridMatchesAuthority:JSON.stringify(d.grid)===JSON.stringify(visibleGrid(receiptEngine,receipt.stops)),renderedMultiplier:d.multiplier,audioState:d.audioState,decodedSoundSamples:d.decodedSoundSamples,backgroundAudio:d.backgroundAudio,nativeAnimation:d.nativeAnimation,turbo:d.turbo,ledgerBalanced:after.ledgerBalanced,motionMode:natural?'natural':'trusted STOP',observedAt:Date.now(),elapsedPlayMs:playClock?performance.now()-playClock:null}};
 }
 try{
  local=gameConfig(id);engine=getGame(id);if(id==='multi_hot_5_video'&&width===390)await checkSoundNo();
  await call('/qa/session',{balance:'100000.00'});const remote=await call('/api/slots/games/'+id),pinned=publicGames().find(game=>game.id===id);validateModel(remote,local);check('HTTP model matches frontend registry',true);check('HTTP model matches authoritative public engine',JSON.stringify(remote)===JSON.stringify({...pinned,enabled:true}));check('game has exact reference geometry and line count',remote.reels===expectedShape[0]&&remote.rows===expectedShape[1]&&remote.paylines===expectedShape[2]&&remote.linePaths.length===expectedShape[2]);check('all payline rows fit exact game geometry',remote.linePaths.every(line=>line.length===expectedShape[0]&&line.every(row=>Number.isInteger(row)&&row>=0&&row<expectedShape[1])));check('frontend reel strips match authoritative engine',JSON.stringify(local.strips)===JSON.stringify(engine.reelStrips));outcome.model={reels:remote.reels,rows:remote.rows,paylines:remote.paylines,mathVersion:remote.mathVersion,engineVersion:remote.engineVersion,freeSpins:remote.features.freeSpins};await page.goto(origin+'/games/'+id,{waitUntil:'domcontentloaded'});await ready();
  await chooseSoundYes();await untilDiagnostics(d=>d.artworkLoaded&&d.cabinetArtworkLoaded&&(d.gameId!=='multi_hot_5_video'||d.multiArtworkLoaded)&&d.decodedSoundSamples===(d.gameId==='hot_foxy_20'?15:7)&&(!nativeSymbolCounts[id]||(d.nativeArtworkLoaded&&d.nativeSymbolCount===nativeSymbolCounts[id]&&(id!=='hot_foxy_20'||d.nativeForegroundLoaded))),'decoded cabinet artwork and selected-game foreground samples',45000);
  if(minimumPlayMs&&backgroundDurations[id])await untilDiagnostics(d=>d.backgroundAudio?.playing,'consented user-sourced background loop');
  check('real authenticated HTTP session',await page.locator('#balance').textContent()==='100000.00');check('fresh authenticated WIN starts at zero',await page.locator('#win').textContent()==='0.00');
  const bootDiagnostics=await diag();check('canvas geometry matches actual game rows and reels',bootDiagnostics.geometry.columns===expectedShape[0]&&bootDiagnostics.geometry.rows===expectedShape[1]);check('one live machine canvas without video or iframe',await page.locator('canvas#machine-canvas').count()===1&&await page.locator('video,iframe').count()===0);
  if(nativeBundleCounts[id]){check('native presentation bundle count matches selected game',bootDiagnostics.nativeAnimation?.ready&&bootDiagnostics.nativeAnimation.instances===nativeBundleCounts[id]);check('native decorative timelines rendered',bootDiagnostics.nativeAnimation.draws>0);if(id==='multi_hot_5_video')check('all native MH5 logo pages decoded',bootDiagnostics.nativeAnimation.decodedPages>=4);}else check('other games retain existing presentation',bootDiagnostics.nativeAnimation===null&&!bootDiagnostics.nativeArtworkLoaded&&bootDiagnostics.nativeSymbolCount===0);
  const expectedDefault=id==='multi_hot_5_video'?'0.05':id==='hot_foxy_20'?'0.20':'2.00';check('fresh game uses its official current default stake',await page.locator('#bet-value').textContent()===expectedDefault);
  if(nativeControls)await page.screenshot({path:`${out}/${id}-official-default.png`});
  const beforeBaselineBet=await report();await chooseStake('2.00');await close('settings');const afterBaselineBet=await report();check('explicit2ETB QA stake selection creates no wallet action',afterBaselineBet.balance===beforeBaselineBet.balance&&afterBaselineBet.spinPosts===beforeBaselineBet.spinPosts&&afterBaselineBet.gamblePosts===beforeBaselineBet.gamblePosts);
  const alternateBet=remote.betLevels.includes('4.00')?'4.00':'5.00';await chooseStake(alternateBet);check('trusted stake change to legal alternate bet',await page.locator('#bet-value').textContent()===alternateBet);await chooseStake('2.00');await close('settings');
  if(id==='multi_hot_5_video'){
   check('MH5 selected betting face shows authorized2ETB stake',await page.locator('#spin').getAttribute('data-multi-face')==='bet'&&await page.locator('.multi-spin-win').textContent()==='2.00');
   check('MH5 medal is visible while selected-bet mirror is hidden',await page.locator('#last-win').isVisible()&&!await page.locator('#bet-value').isVisible());
   const nextBet=remote.betLevels[Math.min(remote.betLevels.indexOf('2.00')+1,remote.betLevels.length-1)];check('MH5 right stake previews next authorized bet',await page.locator('#stake-amount').textContent()===nextBet);
   const beforePicker=await report();await tap('#stake-open');check('MH5 right stake selects next carousel value',await page.locator('#bet-value').textContent()===nextBet&&!await page.locator('#settings').evaluate(el=>el.open));await tap('#bet-less');check('MH5 carousel previous step restores selected stake',await page.locator('#bet-value').textContent()==='2.00');await tap('#bet-open');check('MH5 LAST WIN medal does not open a bet popup',!await page.locator('#settings').evaluate(el=>el.open)&&await page.locator('#bet-value').textContent()==='2.00');const afterPicker=await report();check('MH5 stake carousel changes no wager or balance',afterPicker.spinPosts===beforePicker.spinPosts&&afterPicker.balance===beforePicker.balance);
  }
  if(nativeControls){const before=await report();await tap('#auto');const defaultCount=id==='hot_foxy_20'?100:Infinity;check('native AUTO opens with official default count',await page.locator(`[data-auto-count="${defaultCount}"]`).getAttribute('aria-pressed')==='true');check('native AUTO includes exact official count list',JSON.stringify(await page.locator('[data-auto-count]').evaluateAll(nodes=>nodes.map(n=>n.dataset.autoCount)))===JSON.stringify(autoCounts.map(String)));check('native AUTO stop limits begin unselected and empty',await page.locator('#auto-dialog input').evaluateAll(nodes=>nodes.every(n=>n.type==='checkbox'?!n.checked:n.value==='')));await close('auto-dialog');const after=await report();check('opening and dismissing native AUTO creates no wallet action',after.balance===before.balance&&after.spinPosts===before.spinPosts&&after.gamblePosts===before.gamblePosts);}
  await page.screenshot({path:`${out}/${id}-idle.png`});
  playClock=performance.now();outcome.playStartedAt=new Date().toISOString();
  for(let i=0;i<regularRounds;i++){if(minimumPlayMs){const remaining=playClock+i*minimumPlayMs/regularRounds-performance.now();if(remaining>0)await page.waitForTimeout(remaining);}const r=await round(i%4===0?'win':i%4===1?'loss':undefined,{natural:minimumPlayMs>0&&i%3!==1});const item={index:i+1,roundId:r.roundId,bet:r.bet,chargedStake:r.chargedStake,finalWin:r.finalWin,balanceAfter:r.balanceAfter,stops:r.stops,grid:r.grid,wheelMultiplier:r.wheelMultiplier,qa:r.qa};outcome.primaryRounds.push(item);if(i===0){await page.waitForTimeout(Number(r.finalWin)/Number(r.bet)>=20?2750:800);await page.screenshot({path:`${out}/${id}-win.png`});}if(minimumPlayMs){item.frame=`${id}-round-${String(i+1).padStart(2,'0')}.jpg`;await page.screenshot({path:`${out}/${item.frame}`,type:'jpeg',quality:65});await controlStep(i);await writeFile(`${out}/progress.json`,JSON.stringify({game:id,synthetic:true,minimumPlayMs,elapsedPlayMs:performance.now()-playClock,completedPrimary:outcome.primaryRounds.length,primaryRounds:outcome.primaryRounds,timedSteps:outcome.timedSteps},null,2));if((i+1)%5===0)console.log(JSON.stringify({game:id,completedPrimary:i+1,elapsedPlayMs:Math.round(performance.now()-playClock)}));}if(i===regularRounds-1)await page.screenshot({path:`${out}/${id}-primary-${regularRounds}.png`});}
  check('exact requested primary rounds were played',outcome.primaryRounds.length===regularRounds&&new Set(outcome.primaryRounds.map(r=>r.roundId)).size===regularRounds);
  outcome.primaryReport=await report();outcome.freeCompletionRounds=0;while((await report()).free[id]?.remaining>0){await round('loss');if(++outcome.freeCompletionRounds>500)throw Error('Free-spin completion exceeded validated limit');}
  if(extendedControls&&id==='hot_foxy_20'){await tap('#turbo');await tap('#quick-play-enable');check('explicit confirmation enables faster round',(await diag()).turbo);outcome.confirmedTurboRound=await round('loss',{natural:true});check('confirmed faster round validates with turbo active',outcome.confirmedTurboRound.qa.turbo===true);await tap('#turbo');check('faster trial restores normal presentation',!(await diag()).turbo&&!await page.locator('#quick-play-dialog').evaluate(el=>el.open));}
  if(extendedControls)for(const count of autoCounts.slice(0,2)){await plan({nextOutcome:'loss'});const before=await report(),box=await page.locator('#auto').boundingBox(),point={x:box.x+box.width/2,y:box.y+box.height/2};await tap('#auto');await chooseAutoCount(count);if(nativeControls)await tap('#official-auto-start');await page.waitForFunction(()=>document.body.dataset.state==='animating',{},{timeout:6000});const cancelledAt=Date.now();await page.touchscreen.tap(point.x,point.y);outcome.controlInteractions.push({selector:'#auto',input:'native touchscreen cancellation',startedAt:cancelledAt,endedAt:Date.now()});await ready();await page.waitForTimeout(1200);const after=await report();outcome.autoCancellationEvidence.push({count,cancelledAt,point,before:{spinPosts:before.spinPosts,settlements:before.roundSettlements},after:{spinPosts:after.spinPosts,settlements:after.roundSettlements},extraSpinTap:false});check('AUTO'+count+' cancel submits exactly one round',after.roundSettlements===before.roundSettlements+1&&after.spinPosts===before.spinPosts+1&&(await diag()).autoRemaining===0);}
  await round('win');const beforeCollect=await report();
  if(await page.locator('#collect').isVisible()){await tap('#collect');const after=await report();check('collect changes no wallet balance',after.balance===beforeCollect.balance&&after.spinPosts===beforeCollect.spinPosts);await checkBalance(after,'collect displays the full already-credited balance');check('collect releases held display win',(await diag()).pendingDisplayWin==='0.00');if(id==='multi_hot_5_video')check('MH5 collect keeps last positive round medal',await page.locator('#last-win').textContent()===lastPositiveWin);}
  const gambleParent=await round('win');await plan({nextGamble:'win'});
  if(await page.locator('#gamble').isVisible()){await tap('#gamble');check('main gamble button opens eligible choices',await page.locator('#gamble-dialog').evaluate(el=>el.open));}else{await openMenu();await tap('#gamble-menu');}
  await awaitGambleReady();const beforeGamble=await report(),gambleResponse=page.waitForResponse(r=>r.url()===origin+'/api/slots/gamble'&&r.request().method()==='POST');await tap('#red');const g1=await (await gambleResponse).json();await page.waitForFunction(()=>document.querySelector('#gamble-message').textContent.startsWith('WIN'));
  validateGamble(g1,gameConfigForReceipt(gambleParent),{roundId:gambleParent.roundId,choice:'RED',expectedStake:gambleParent.finalWin,expectedAttempt:1,parentWin:gambleParent.finalWin});const afterGamble=await report();check('trusted gamble win reconciles exactly one wallet action',g1.won&&afterGamble.gambleSettlements===beforeGamble.gambleSettlements+1&&units(afterGamble.balance,2)===units(beforeGamble.balance,2)-units(g1.stake)/100n+units(g1.payout)/100n);await checkBalance(afterGamble,'won gamble keeps pending display amount separate from credited ledger');
  if(nativeControls){await page.waitForFunction(colour=>document.querySelector('.native-gamble-card')?.alt===colour+' card colour',g1.cardColor,{timeout:3000});check('native card reveal shows validated server colour',true);await awaitGambleReady();}
  await plan({nextGamble:'lose'});const loseResponse=page.waitForResponse(r=>r.url()===origin+'/api/slots/gamble'&&r.request().method()==='POST');await tap('#black');const g2=await (await loseResponse).json();await page.waitForFunction(()=>document.querySelector('#gamble-message').textContent.startsWith('LOSE'));validateGamble(g2,gameConfigForReceipt(gambleParent),{roundId:gambleParent.roundId,choice:'BLACK',expectedStake:g1.payout,expectedAttempt:2,parentWin:gambleParent.finalWin});const afterLoss=await report();check('trusted gamble loss debits only its prior credited amount',!g2.won&&units(afterLoss.balance,2)===units(afterGamble.balance,2)-units(g2.stake)/100n&&await page.locator('#red').isDisabled()&&await page.locator('#black').isDisabled());await checkBalance(afterLoss,'lost gamble restores full authoritative balance display');
  if(nativeControls)await page.waitForFunction(()=>!document.querySelector('#gamble-dialog').open,{},{timeout:6000});else await close('gamble-dialog');if(id==='multi_hot_5_video')check('MH5 gamble keeps last positive round medal',await page.locator('#last-win').textContent()===lastPositiveWin);
  if(extendedControls&&nativeControls){await round('win');const beforeTake=await report();await openMenu();await tap('#gamble-menu');await awaitGambleReady();await tap('.native-gamble-take');check('native TAKE WIN closes gamble and releases display win',!await page.locator('#gamble-dialog').evaluate(el=>el.open)&&(await diag()).pendingDisplayWin==='0.00');const afterTake=await report();check('native TAKE WIN creates no wallet action',afterTake.balance===beforeTake.balance&&afterTake.spinPosts===beforeTake.spinPosts&&afterTake.gamblePosts===beforeTake.gamblePosts);await checkBalance(afterTake,'native TAKE WIN displays the credited balance');}
  await round('loss');const holdBefore=await report(),box=await page.locator('#spin').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(700);
  if(id==='multi_hot_5_video'){const whileHeld=await report();check('MH5 long press starts no wager or hidden AUTO',whileHeld.spinPosts===holdBefore.spinPosts&&whileHeld.roundSettlements===holdBefore.roundSettlements&&(await diag()).autoRemaining===0);}
  await page.mouse.up();await page.waitForFunction(()=>document.body.dataset.state==='animating',{},{timeout:5000});await stopIfAnimating({x:box.x+box.width/2,y:box.y+box.height/2});await ready();await page.waitForTimeout(1300);const holdAfter=await report();check(id==='multi_hot_5_video'?'MH5 release performs one ordinary spin':'trusted HOLD release creates one round',holdAfter.roundSettlements===holdBefore.roundSettlements+1&&(await diag()).autoRemaining===0);
  await plan({nextOutcome:'loss',dropNextSpinResponse:true});const recoveryBefore=await report();await tap('#spin');await page.waitForFunction(()=>document.body.dataset.state==='pending',{},{timeout:6000});check('lost HTTP response offers CONFIRM',await page.locator('#spin-label').textContent()==='CONFIRM');await tap('#spin');await page.waitForFunction(()=>document.body.dataset.state==='animating',{},{timeout:5000});await stopIfAnimating({x:box.x+box.width/2,y:box.y+box.height/2});await ready();const recoveryAfter=await report();check('HTTP recovery does not settle twice',recoveryAfter.roundSettlements===recoveryBefore.roundSettlements+1&&recoveryAfter.spinPosts===recoveryBefore.spinPosts+2);
  let last=await round('win');if(id==='multi_hot_5_video')last=await round('loss');const beforeReload=await report();await page.reload({waitUntil:'domcontentloaded'});await ready();const afterReload=await report();check('reload never creates a wager',beforeReload.spinPosts===afterReload.spinPosts&&beforeReload.balance===afterReload.balance);check('reload preserves displayed balance',await page.locator('#balance').textContent()===afterReload.balance);check('sound Yes persists without prompting after reload',!await page.locator('#sound-consent').evaluate(el=>el.open)&&await page.evaluate(()=>localStorage.getItem('zplay:sound-choice'))==='yes'&&await page.locator('#sound').getAttribute('aria-pressed')==='false');if(id==='multi_hot_5_video')check('MH5 reload preserves positive medal after losing last round',await page.locator('#last-win').textContent()===lastPositiveWin);
  outcome.reload={winShown:await page.locator('#win').textContent(),expectedWin:last.finalWin,diagnostics:await diag()};
  check('reload restores last win',await page.locator('#win').textContent()===last.finalWin);const restored=await diag();check('reload restores authoritative round identity',restored.restoredRoundId===last.roundId);check('reload restores authoritative grid',JSON.stringify(restored.grid)===JSON.stringify(visibleGrid(receiptGame(id,last),last.stops)));check('reload restores authoritative multiplier',restored.multiplier===last.wheelMultiplier);
  if(nativeControls){
   const legacyBet='1000.00',old=legacyGameConfig(id),roundToken=randomUUID(),session=await call('/api/machine-session'),beforeSeed=await report();
   check('legacy replay stake was removed from current paid ladder',old.betLevels.includes(legacyBet)&&!local.betLevels.includes(legacyBet));
   await plan({seedLegacyPending:{bet:legacyBet,roundToken,outcome:'loss'}});const seeded=await report(),seededReceipt=(await call('/api/slots/rounds')).items.find(row=>row.result_json?.gameId===id)?.result_json;
   validateRound(seededReceipt,gameConfigForReceipt(seededReceipt),legacyBet);
   check('synthetic legacy seed settles exactly one old loss',seeded.roundSettlements===beforeSeed.roundSettlements+1&&seeded.spinPosts===beforeSeed.spinPosts&&units(seeded.balance,2)===units(beforeSeed.balance,2)-units(legacyBet,2)&&seededReceipt.mathVersion===old.mathVersion&&seededReceipt.finalWin==='0.00');
   await plan({nextOutcome:'loss'});const laterReceipt=await call('/api/slots/spin',{gameId:id,bet:'2.00',roundToken:randomUUID(),mathVersion:local.mathVersion}),advanced=await report();validateRound(laterReceipt,gameConfigForReceipt(laterReceipt),'2.00');
   check('later paid action advances wallet beyond historical receipt',laterReceipt.mathVersion===local.mathVersion&&laterReceipt.finalWin==='0.00'&&advanced.roundSettlements===seeded.roundSettlements+1&&advanced.spinPosts===seeded.spinPosts+1&&units(advanced.balance,2)===units(seeded.balance,2)-units('2.00',2)&&advanced.balance!==seededReceipt.balanceAfter);
   const storageKey='zplay.machine.pending.'+session.sessionId+'.'+id,saved={gameId:id,bet:legacyBet,roundToken,sessionId:session.sessionId};
   await page.evaluate(({key,value})=>sessionStorage.setItem(key,JSON.stringify(value)),{key:storageKey,value:saved});await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.body.dataset.state==='pending',{},{timeout:15000});await untilDiagnostics(d=>d.nativeAnimation?.ready&&d.nativeAnimation.instances===nativeBundleCounts[id]&&d.nativeAnimation.draws>0,'legacy pending replay presentation ready',45000);
   const pendingModel=await diag(),beforeConfirm=await report();check('unversioned old pending token preserves CONFIRM and removed stake',await page.locator('#spin-label').textContent()==='CONFIRM'&&await page.locator('#bet-value').textContent()===legacyBet&&pendingModel.mathVersion===old.mathVersion&&pendingModel.currentMathVersion===local.mathVersion);
   check('loading old pending token creates no additional wallet action',beforeConfirm.balance===advanced.balance&&beforeConfirm.spinPosts===advanced.spinPosts&&beforeConfirm.roundSettlements===advanced.roundSettlements);
   const spinRequests=[],capture=request=>{if(request.url()===origin+'/api/slots/spin'&&request.method()==='POST')spinRequests.push(request.postDataJSON());};page.on('request',capture);
   let replay;
   try{
    const response=page.waitForResponse(r=>r.url()===origin+'/api/slots/spin'&&r.request().method()==='POST'),box=await page.locator('#spin').boundingBox();await tap('#spin');const http=await response;check('old pending confirmation returns HTTP200',http.status()===200);replay=await http.json();validateRound(replay,gameConfigForReceipt(replay),legacyBet);
    await page.waitForFunction(()=>['animating','ready'].includes(document.body.dataset.state),{},{timeout:6000});await stopIfAnimating({x:box.x+box.width/2,y:box.y+box.height/2});await ready();
   }finally{page.off('request',capture);}
   const afterConfirm=await report(),replayedModel=await diag();
   check('old pending confirmation reuses the exact original token once',spinRequests.length===1&&spinRequests[0].roundToken===roundToken&&spinRequests[0].gameId===id&&spinRequests[0].bet===legacyBet);
   check('old pending confirmation returns unchanged historical receipt',JSON.stringify(replay)===JSON.stringify(seededReceipt));
   check('old pending replay causes no second debit or settlement',afterConfirm.balance===advanced.balance&&afterConfirm.roundSettlements===advanced.roundSettlements&&afterConfirm.ledgerEntries===advanced.ledgerEntries&&afterConfirm.spinPosts===advanced.spinPosts+1&&afterConfirm.ledgerBalanced);
   check('confirmed old pending token clears only after validated replay',await page.evaluate(key=>sessionStorage.getItem(key),storageKey)===null);
   check('legacy replay renders its own strips while new paid model is selected',replayedModel.mathVersion===local.mathVersion&&replayedModel.currentMathVersion===local.mathVersion&&replayedModel.renderMathVersion===old.mathVersion&&local.betLevels.includes(await page.locator('#bet-value').textContent())&&JSON.stringify(replayedModel.grid)===JSON.stringify(visibleGrid(receiptGame(id,replay),replay.stops)));
   await checkBalance(afterConfirm,'legacy replay keeps newer wallet balance instead of historical receipt balance');
   outcome.legacyPendingReplay={saved,request:spinRequests[0],receipt:replay,laterReceipt,seededBalance:seeded.balance,balanceBeforeConfirm:advanced.balance,balanceAfterConfirm:afterConfirm.balance,settlementsBeforeConfirm:advanced.roundSettlements,settlementsAfterConfirm:afterConfirm.roundSettlements,ledgerEntriesBeforeConfirm:advanced.ledgerEntries,ledgerEntriesAfterConfirm:afterConfirm.ledgerEntries,diagnostics:replayedModel};
  }
  if(local.features.freeSpins.spins>0||id==='hot_foxy_20'){
   const legacyBet=id==='hot_foxy_20'?'4000.00':undefined;await plan({seedFreeAtZero:true,...(legacyBet?{bet:legacyBet}:{})});await page.reload({waitUntil:'domcontentloaded'});await ready();check('zero balance permits free spin',await page.locator('#balance').textContent()==='0.00'&&!await page.locator('#spin').isDisabled());
   const f1=await round('loss');check('first HTTP free spin charges zero',f1.chargedStake==='0.00'&&f1.freeSpinsRemaining===1);const f2=await round('loss');check('final HTTP free spin charges zero',f2.chargedStake==='0.00'&&f2.freeSpinsRemaining===0);check('zero balance disables paid spins',await page.locator('#spin').isDisabled());if(id==='hot_foxy_20'){const old=legacyGameConfig(id),afterLegacy=await diag();check('owed Foxy free spins preserve legacy model and removed paid stake',f1.mathVersion===old.mathVersion&&f2.mathVersion===old.mathVersion&&f1.bet===legacyBet&&f2.bet===legacyBet);check('completed legacy free entitlement switches next paid rules without changing last receipt',afterLegacy.mathVersion===local.mathVersion&&afterLegacy.renderMathVersion===old.mathVersion&&afterLegacy.freeSpinsRemaining===0);}
   if(id==='wild_multi_stars'){
    await plan({seedFreeAtZero:true});await page.reload({waitUntil:'domcontentloaded'});await ready();const freeWin=await round('win'),paid=evaluate(local,freeWin.grid,freeWin.bet,freeWin.wheelMultiplier,false),free=evaluate(local,freeWin.grid,freeWin.bet,freeWin.wheelMultiplier,true);check('Wild Stars free line wins use exact2x multiplier',freeWin.isFree&&freeWin.chargedStake==='0.00'&&units(freeWin.stages[0].lineWin)===paid.line*2n&&free.line===paid.line*2n);check('Wild Stars scatter award is unchanged in free spins',free.scatter===paid.scatter);
   }
  }
  if(minimumPlayMs){let step=regularRounds;while(performance.now()-playClock<minimumPlayMs){await controlStep(step++);const remaining=minimumPlayMs-(performance.now()-playClock);if(remaining>0)await page.waitForTimeout(Math.min(1000,remaining));}outcome.actualPlayDurationMs=performance.now()-playClock;outcome.playEndedAt=new Date().toISOString();check('actual active play meets requested duration',outcome.actualPlayDurationMs>=minimumPlayMs);}
  await page.screenshot({path:`${out}/${id}-final.png`});const final=await report();outcome.report=final;outcome.diagnostics=await diag();
  check('local HTTP requests only',requests.every(r=>r.url.startsWith(origin)||r.url.startsWith('data:')));check('no browser JavaScript errors',errors.length===0);check('final ledger balances',final.ledgerBalanced);
  outcome.sourceAfter=await publicSource();check('public source unchanged throughout trusted case',JSON.stringify(outcome.source)===JSON.stringify(outcome.sourceAfter));
 }catch(e){outcome.error=String(e);outcome.actualPlayDurationMs=playClock?performance.now()-playClock:0;outcome.playEndedAt=new Date().toISOString();outcome.sourceAfter=await publicSource().catch(()=>null);outcome.state=await page.locator('body').getAttribute('data-state').catch(()=>null);outcome.notice=await page.locator('#notice-text').textContent().catch(()=>null);outcome.report=await report().catch(()=>null);await page.screenshot({path:`${out}/${id}-failure.png`}).catch(()=>{});}
 outcome.requestCount=requests.length;outcome.elapsedMs=Date.now()-caseStartedAt;results.push(outcome);await writeFile(`${out}/results.json`,JSON.stringify({synthetic:true,origin,network:'real localhost HTTP requests; no fetch overrides',source,results},null,2));console.log(JSON.stringify({game:id,checks:checks.length,passed:checks.filter(c=>c.ok).length,error:outcome.error,primaryRounds:outcome.primaryRounds.length,totalRounds:outcome.report?.roundSettlements,ledgerBalanced:outcome.report?.ledgerBalanced,elapsedMs:outcome.elapsedMs}));await context.close();
}
try{for(const id of selectedGames)await run(id);}finally{await browser.close();}
if(results.some(result=>result.error||result.checks.some(check=>!check.ok)))process.exitCode=1;
