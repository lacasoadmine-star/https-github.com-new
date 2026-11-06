// Trusted browser interactions against localhost HTTP APIs and disposable QA ledger.
// No fetch overrides, production credentials, production wallet or production origin.
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {getGame,visibleGrid} from '../test/server-core-snapshot.mjs';
let chromium;try{({chromium}=await import('playwright'));}catch(error){if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw Error('Install the optional Playwright browser QA dependency before running this script.');({chromium}=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/entry.js')('playwright'));}
if(!process.argv.includes('--qa'))throw Error('Pass --qa to use an invented local test account.');
const qaPort=Number(process.argv.find(x=>x.startsWith('--port='))?.split('=')[1]||8767);
if(!Number.isInteger(qaPort)||qaPort<1024||qaPort>65535)throw Error('Invalid local QA port');
const origin='http://127.0.0.1:'+qaPort,width=Number(process.argv.find(x=>x.startsWith('--width='))?.split('=')[1]||390),out=process.argv.find(x=>x.startsWith('--out='))?.slice(6)||fileURLToPath(new URL('../.qa-player-results/',import.meta.url)),results=[],regularRounds=Number(process.argv.find(x=>x.startsWith('--rounds='))?.split('=')[1]||16);
await mkdir(out,{recursive:true});
const executablePath=process.env.SUPERWIN_QA_CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
const browser=await chromium.launch({...(executablePath?{executablePath}:{}),headless:true,args:['--no-sandbox']});
const source={};for(const name of ['controller.mjs','renderer.mjs','style.css','audio.mjs'])source[name]=createHash('sha256').update(await readFile(new URL('../public/'+name,import.meta.url))).digest('hex');
async function run(id){
 const context=await browser.newContext({viewport:{width,height:width===360?800:width===430?932:844},deviceScaleFactor:width===360?3:2,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],requests=[],checks=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>requests.push({method:r.method(),url:r.url()}));
 const check=(label,ok)=>{checks.push({label,ok:!!ok});if(!ok)throw Error(label);};
 const call=async(path,body)=>{const r=body===undefined?await context.request.get(origin+path):await context.request.post(origin+path,{data:body});if(!r.ok())throw Error(path+': '+r.status()+' '+await r.text());return r.json();};
 const report=()=>call('/qa/report'),plan=values=>call('/qa/plan',{gameId:id,...values});
 const diag=()=>page.evaluate(async()=>{const src=document.querySelector('script[type="module"][src]').src;return (await import(src)).diagnostics();});
 const ready=()=>page.waitForFunction(()=>document.body.dataset.state==='ready',{},{timeout:15000});
 const tap=selector=>page.locator(selector).tap({timeout:6000});
 const close=dialog=>tap(`[data-close="${dialog}"]`);
 let outcome={game:id,width,synthetic:true,checks,errors},spinShotTaken=false;
 async function acknowledge(){
  if(await page.locator('#spin').getAttribute('data-multi-face')==='win'){
   const before=await report();await tap('#spin');await ready();const after=await report();check('center WIN acknowledges without a wager',after.spinPosts===before.spinPosts&&after.balance===before.balance);
  }
 }
 async function round(desired){
  await ready();await acknowledge();if(desired)await plan({nextOutcome:desired});const before=await report();
  const response=page.waitForResponse(r=>r.url()===origin+'/api/slots/spin'&&r.request().method()==='POST');await tap('#spin');const http=await response;check('spin HTTP200',http.status()===200);
  await page.waitForFunction(()=>['animating','pending','ready'].includes(document.body.dataset.state),{},{timeout:5000});
  if(await page.locator('body').getAttribute('data-state')==='animating'){if(!spinShotTaken){await page.screenshot({path:`${out}/${id}-spinning.png`});spinShotTaken=true;}await tap('#spin');}await ready();const after=await report(),r=after.rounds.at(-1),d=await diag();
  check('trusted SPIN STOP creates one round',after.roundSettlements===before.roundSettlements+1&&after.spinPosts===before.spinPosts+1);
  check('displayed balance equals HTTP ledger',await page.locator('#balance').textContent()===after.balance);
  check('displayed win equals authoritative receipt',await page.locator('#win').textContent()===r.finalWin);
  check('authoritative final grid rendered',JSON.stringify(d.grid)===JSON.stringify(visibleGrid(getGame(id),r.stops)));check('authoritative final multiplier rendered',d.multiplier===r.wheelMultiplier);
  check('trusted interaction unlocks actual audio',d.audioState==='running'&&d.decodedSoundSamples===7);
  check('ledger balances after round',after.ledgerBalanced);return r;
 }
 try{
  await call('/qa/session',{balance:'100000.00'});await page.goto(origin+'/games/'+id,{waitUntil:'domcontentloaded'});await ready();
  await page.waitForFunction(async()=>{const d=(await import(document.querySelector('script[type="module"][src]').src)).diagnostics();return d.artworkLoaded&&d.cabinetArtworkLoaded&&(d.gameId!=='multi_hot_5_video'||d.multiArtworkLoaded);},{},{timeout:15000});
  check('real authenticated HTTP session',await page.locator('#balance').textContent()==='100000.00');
  await tap('#bet-open');await tap('[data-bet="4.00"]');check('trusted stake change to4',await page.locator('#bet-value').textContent()==='4.00');await tap('[data-bet="2.00"]');await close('settings');
  await page.screenshot({path:`${out}/${id}-idle.png`});
  for(let i=0;i<regularRounds;i++){const r=await round(i%4===0?'win':i%4===1?'loss':undefined);if(i===0){await page.waitForTimeout(Number(r.finalWin)/Number(r.bet)>=20?2750:800);await page.screenshot({path:`${out}/${id}-win.png`});}}
  await round('win');const beforeCollect=await report();
  if(await page.locator('#spin').getAttribute('data-multi-face')==='win')await acknowledge();
  else if(await page.locator('#collect').isVisible()){await tap('#collect');const after=await report();check('collect changes no wallet balance',after.balance===beforeCollect.balance&&after.spinPosts===beforeCollect.spinPosts);}
  await round('win');await plan({nextGamble:'win'});
  if(await page.locator('#gamble').isVisible())await tap('#gamble');else{await tap('#menu');await tap('#gamble-menu');}
  const gambleResponse=page.waitForResponse(r=>r.url()===origin+'/api/slots/gamble'&&r.request().method()==='POST');await tap('#red');const g1=await (await gambleResponse).json();await page.waitForFunction(()=>document.querySelector('#gamble-message').textContent.startsWith('WIN'));
  check('trusted gamble wins from server receipt',g1.won&&await page.locator('#balance').textContent()===(await report()).balance);
  await plan({nextGamble:'lose'});const loseResponse=page.waitForResponse(r=>r.url()===origin+'/api/slots/gamble'&&r.request().method()==='POST');await tap('#black');const g2=await (await loseResponse).json();await page.waitForFunction(()=>document.querySelector('#gamble-message').textContent.startsWith('LOSE'));check('trusted gamble loses from server receipt',!g2.won&&await page.locator('#red').isDisabled()&&await page.locator('#black').isDisabled());await close('gamble-dialog');
  await round('loss');await acknowledge();const holdBefore=await report(),box=await page.locator('#spin').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(700);await page.mouse.up();
  await page.waitForFunction(()=>document.body.dataset.state==='animating',{},{timeout:5000});await tap('#spin');await ready();await page.waitForTimeout(1300);const holdAfter=await report();check('trusted HOLD release creates one round',holdAfter.roundSettlements===holdBefore.roundSettlements+1&&(await diag()).autoRemaining===0);
  await acknowledge();await plan({nextOutcome:'loss',dropNextSpinResponse:true});const recoveryBefore=await report();await tap('#spin');await page.waitForFunction(()=>document.body.dataset.state==='pending',{},{timeout:6000});check('lost HTTP response offers CONFIRM',await page.locator('#spin-label').textContent()==='CONFIRM');await tap('#spin');await page.waitForFunction(()=>document.body.dataset.state==='animating',{},{timeout:5000});await tap('#spin');await ready();const recoveryAfter=await report();check('HTTP recovery does not settle twice',recoveryAfter.roundSettlements===recoveryBefore.roundSettlements+1&&recoveryAfter.spinPosts===recoveryBefore.spinPosts+2);
  const last=await round('win'),beforeReload=await report();await page.reload({waitUntil:'domcontentloaded'});await ready();const afterReload=await report();check('reload never creates a wager',beforeReload.spinPosts===afterReload.spinPosts&&beforeReload.balance===afterReload.balance);check('reload preserves displayed balance',await page.locator('#balance').textContent()===afterReload.balance);
  outcome.reload={winShown:await page.locator('#win').textContent(),expectedWin:last.finalWin,diagnostics:await diag()};
  // Root is implementing read-only history restoration; preserve evidence until enabled.
  check('reload restores last win',await page.locator('#win').textContent()===last.finalWin);const restored=await diag();check('reload restores authoritative round identity',restored.restoredRoundId===last.roundId);check('reload restores authoritative grid',JSON.stringify(restored.grid)===JSON.stringify(visibleGrid(getGame(id),last.stops)));check('reload restores authoritative multiplier',restored.multiplier===last.wheelMultiplier);
  if(id==='hot_foxy_20'){
   await plan({seedFreeAtZero:true});await page.reload({waitUntil:'domcontentloaded'});await ready();check('zero balance permits free spin',await page.locator('#balance').textContent()==='0.00'&&!await page.locator('#spin').isDisabled());
   const f1=await round('loss');check('first HTTP free spin charges zero',f1.chargedStake==='0.00'&&f1.freeSpinsRemaining===1);const f2=await round('loss');check('final HTTP free spin charges zero',f2.chargedStake==='0.00'&&f2.freeSpinsRemaining===0);check('zero balance disables paid spins',await page.locator('#spin').isDisabled());
  }
  await page.screenshot({path:`${out}/${id}-final.png`});const final=await report();outcome.report=final;outcome.diagnostics=await diag();
  check('local HTTP requests only',requests.every(r=>r.url.startsWith(origin)||r.url.startsWith('data:')));check('no browser JavaScript errors',errors.length===0);check('final ledger balances',final.ledgerBalanced);
 }catch(e){outcome.error=String(e);outcome.state=await page.locator('body').getAttribute('data-state').catch(()=>null);outcome.notice=await page.locator('#notice-text').textContent().catch(()=>null);outcome.report=await report().catch(()=>null);await page.screenshot({path:`${out}/${id}-failure.png`}).catch(()=>{});}
 outcome.requestCount=requests.length;results.push(outcome);await writeFile(`${out}/results.json`,JSON.stringify({synthetic:true,origin,network:'real localhost HTTP requests; no fetch overrides',source,results},null,2));console.log(JSON.stringify({game:id,checks:checks.length,passed:checks.filter(c=>c.ok).length,error:outcome.error,rounds:outcome.report?.roundSettlements,ledgerBalanced:outcome.report?.ledgerBalanced}));await context.close();
}
try{for(const id of ['multi_hot_5_video','hot_foxy_20'])await run(id);}finally{await browser.close();}
