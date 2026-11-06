// Focused trusted input regressions against the opt-in, disposable localhost QA server.
import {createRequire} from 'node:module';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {gameConfig} from '../public/registry.mjs';
import {validateRound} from '../public/contract.mjs';
if(!process.argv.includes('--qa'))throw Error('Pass --qa for synthetic localhost-only verification.');
const option=(name,fallback)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const port=Number(option('port','8767')),origin='http://127.0.0.1:'+port,out=option('out',fileURLToPath(new URL('../.qa-autostop-results/',import.meta.url)));
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid QA port.');
const games=['multi_hot_5_video','hot_foxy_20','wild_multi_stars','multi_hot_100'];
const health=await fetch(origin+'/health').then(r=>r.json());if(!health.synthetic||health.productionConnected!==false)throw Error('Synthetic local server required.');
let chromium;try{({chromium}=await import('playwright'));}catch{({chromium}=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/entry.js')('playwright'));}
const hash=async()=>{const h={};for(const name of(await readdir(new URL('../public/',import.meta.url))).sort())h[name]=createHash('sha256').update(await readFile(new URL('../public/'+name,import.meta.url))).digest('hex');return h;};
await mkdir(out,{recursive:true});const source=await hash(),browser=await chromium.launch({executablePath:process.env.SUPERWIN_QA_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
async function run(game){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'}),page=await context.newPage(),record={game,synthetic:true,startedAt:new Date().toISOString(),checks:[],requests:[],errors:[],auto:[],free:[]};
 const check=(label,ok)=>{record.checks.push({label,ok:!!ok});if(!ok)throw Error(label);};
 page.on('pageerror',e=>record.errors.push(String(e)));page.on('request',r=>{if(r.url()===origin+'/api/slots/spin'&&r.method()==='POST'){const b=r.postDataJSON();record.requests.push({at:Date.now(),gameId:b.gameId,bet:b.bet,roundToken:b.roundToken});}});
 const call=async(path,data)=>{const r=data?await context.request.post(origin+path,{data,maxRetries:2}):await context.request.get(origin+path,{maxRetries:2});if(!r.ok())throw Error(path+':'+r.status());return r.json();},report=()=>call('/qa/report'),plan=data=>call('/qa/plan',{gameId:game,...data});
 const snapshot=()=>page.evaluate(async()=>{const d=(await import(document.querySelector('script[type=module][src]').src)).diagnostics();return {at:Date.now(),state:document.body.dataset.state,autoDisabled:document.querySelector('#auto').disabled,autoLabel:document.querySelector('#auto-label').textContent,spinDisabled:document.querySelector('#spin').disabled,notice:document.querySelector('#notice-text').textContent,free:document.querySelector('#free-spins').textContent,balance:document.querySelector('#balance').textContent,savedRound:[...Array(sessionStorage.length)].map((_,i)=>sessionStorage.key(i)).some(k=>k.startsWith('zplay.machine.pending.')&&!k.endsWith('.gamble')),diagnostics:d};});
 const ready=()=>page.waitForFunction(()=>document.body.dataset.state==='ready',null,{timeout:15000});
 const waitAutoZero=async()=>{for(let n=0;n<100;n++){if((await snapshot()).diagnostics.autoRemaining===0)return;await page.waitForTimeout(20);}throw Error('AUTO did not cancel');};
 try{
  await call('/qa/session',{balance:'100000.00'});await page.goto(origin+'/games/'+game,{waitUntil:'domcontentloaded'});await ready();await page.locator('#sound-yes').tap();
  for(const [count,phase]of[[10,'requesting'],[25,'animating']]){
   await plan({nextOutcome:'loss',delayNextSpinMs:phase==='requesting'?1800:0});const before=await report(),box=await page.locator('#auto').boundingBox(),point={x:box.x+box.width/2,y:box.y+box.height/2};
   await page.locator('#auto').tap();await page.locator(`[data-auto="${count}"]`).tap();await page.waitForFunction(expected=>document.body.dataset.state===expected&&[...Array(sessionStorage.length)].map((_,i)=>sessionStorage.key(i)).some(k=>k.startsWith('zplay.machine.pending.')&&!k.endsWith('.gamble')),phase,{timeout:6000});const active=await snapshot();
   check('AUTO'+count+' reaches '+phase,active.state===phase&&active.diagnostics.autoRemaining===count);
   check('AUTO'+count+' cancel remains enabled with saved round',active.savedRound&&!active.autoDisabled);
   const tappedAt=Date.now();await page.touchscreen.tap(point.x,point.y);await waitAutoZero();const cancelled=await snapshot();check('trusted AUTO'+count+' cancellation clears queue',cancelled.diagnostics.autoRemaining===0);
   await ready();await page.waitForTimeout(1100);const after=await report(),settled=await snapshot(),receipt=after.rounds.at(-1);
   check('AUTO'+count+' cancellation settles only current receipt',after.spinPosts===before.spinPosts+1&&after.roundSettlements===before.roundSettlements+1);
   check('AUTO'+count+' cancellation preserves validated balance',settled.balance===after.balance&&after.ledgerBalanced);
   record.auto.push({count,phase,point,tappedAt,active,cancelled,settled,before,after,currentRoundId:receipt.roundId,extraSpinTap:false});
  }
  if(gameConfig(game).features.freeSpins.spins>0){
   await plan({seedFreeAtZero:true});const seeded=await report();await page.reload({waitUntil:'domcontentloaded'});await ready();const restored=await snapshot();
   check('zero-balance earned-free reload has no deposit notice',restored.balance==='0.00'&&restored.free==='FREE SPINS: 2'&&!restored.spinDisabled&&!/deposit|balance is empty/i.test(restored.notice));
   check('zero-balance reload submits no wager',(await report()).spinPosts===seeded.spinPosts);
   for(let n=1;n<=2;n++){
    await plan({nextOutcome:'loss'});const before=await report(),response=page.waitForResponse(r=>r.url()===origin+'/api/slots/spin'&&r.request().method()==='POST');await page.locator('#spin').tap();const http=await response,receipt=await http.json();validateRound(receipt,gameConfig(game),receipt.bet);await ready();const after=await report(),state=await snapshot();
    check('earned free '+n+' settles without charging stake',receipt.isFree&&receipt.chargedStake==='0.00'&&receipt.freeSpinsRemaining===2-n&&after.spinPosts===before.spinPosts+1&&after.roundSettlements===before.roundSettlements+1&&after.balance==='0.00'&&after.ledgerBalanced);
    if(n===1)check('remaining free round stays playable without deposit notice',!state.spinDisabled&&!/deposit|balance is empty/i.test(state.notice));
    if(n===2)check('exhausted zero-balance account disables paid SPIN',state.spinDisabled&&/deposit/i.test(state.notice));
    record.free.push({index:n,receipt,state,after});
   }
  }
  record.final=await report();record.finalState=await snapshot();check('browser stays error-free',record.errors.length===0);check('final synthetic ledger balances',record.final.ledgerBalanced);await page.screenshot({path:out+'/'+game+'-final.png'});
 }catch(error){record.error=String(error);record.final=await report().catch(()=>null);record.finalState=await snapshot().catch(()=>null);await page.screenshot({path:out+'/'+game+'-failure.png'}).catch(()=>{});}
 record.endedAt=new Date().toISOString();await context.close();await writeFile(out+'/'+game+'.json',JSON.stringify(record,null,2));console.log(JSON.stringify({game,checks:record.checks.length,passed:record.checks.filter(c=>c.ok).length,error:record.error,settled:record.final?.roundSettlements}));return record;
}
let results;try{results=await Promise.all(games.map(run));}finally{await browser.close();}
const sourceAfter=await hash(),sameSource=JSON.stringify(source)===JSON.stringify(sourceAfter);await writeFile(out+'/results.json',JSON.stringify({synthetic:true,origin,source,sourceAfter,sameSource,results},null,2));if(!sameSource||results.some(r=>r.error||r.checks.some(c=>!c.ok)))process.exitCode=1;
