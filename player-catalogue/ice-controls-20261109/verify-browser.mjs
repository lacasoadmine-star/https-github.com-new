import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ASSETS} from './remaining20-ice-controls-assets-r4.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const {chromium}=await import(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs'));
const ORIGIN='https://superwin-player.apdiy61.workers.dev';
const PREFIX='/native-library/remaining20/20261109-ice-controls-r4/';
const OLD='/native-library/remaining20/20261109-r5-seven-review1/';
const ART='/native-library/remaining20/reference-art/r1/smartsoft/assets/';
const LIVE=process.env.LIVE==='1';
const LABEL=LIVE?'live':'preview';
const ROUNDS=Number(process.env.ROUNDS||25);
assert(Number.isInteger(ROUNDS)&&ROUNDS>=1&&ROUNDS<=25);
const reports=[];
function minor(v){assert.match(String(v),/^\d+\.\d{2}$/);return BigInt(String(v).replace('.',''));}
function action(request){try{return JSON.parse(request.postData()||'{}');}catch{return{};}}
const browser=await chromium.launch({
 executablePath:'/workspace/scratch/14a9686e6662/browser-runtime/chromium',
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],
 ...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})
});
async function run(game){
 const report={game,scope:LABEL,requestedRounds:ROUNDS,rounds:[],checks:[],errors:[],http:[],blockedWrites:[]};
 reports.push(report);
 const context=await browser.newContext({viewport:{width:1365,height:850},ignoreHTTPSErrors:false});
 // Establish browser/proxy TLS before the retained client's 7-second initial
 // state timeout. This read has no demo session yet and performs no action.
 const warm=await context.newPage(),warmStarted=Date.now();
 const warmResponse=await warm.goto(ORIGIN+'/api/remaining20/demo/state?game_id='+game,{waitUntil:'domcontentloaded',timeout:60000});
 report.connectionWarmup={method:'GET',status:warmResponse.status(),milliseconds:Date.now()-warmStarted};
 console.log(JSON.stringify({game,event:'connection-warmed',...report.connectionWarmup}));
 await warm.close();
 const actions=[];
 const cachedArt=new Set();
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(!['GET','HEAD'].includes(req.method())&&url.origin===ORIGIN&&!url.pathname.startsWith('/api/remaining20/demo/')){
   report.blockedWrites.push({method:req.method(),path:url.pathname});await route.abort('blockedbyclient');return;
  }
  if(!LIVE&&url.origin===ORIGIN&&url.pathname.startsWith(PREFIX)){
   const name=url.pathname.slice(PREFIX.length),asset=ASSETS[name];
   if(asset){await route.fulfill({status:200,body:asset.encoding==='base64'?Buffer.from(asset.body,'base64'):asset.body,contentType:asset.type,headers:{'cache-control':'no-store','x-zplay-preview-sha256':asset.sha256}});return;}
   if(/^art\/[a-f0-9]{64}\.[a-z0-9]+$/.test(name)){
    try{
     const file=name.slice(4),body=await fs.readFile('/workspace/scratch/14a9686e6662/reference-cache/smartsoft/'+file);
     assert.equal(createHash('sha256').update(body).digest('hex'),file.slice(0,64));
     const types={png:'image/png',webp:'image/webp',jpg:'image/jpeg',jpeg:'image/jpeg',json:'application/json',txt:'text/plain',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',woff:'font/woff',woff2:'font/woff2'};
     await route.fulfill({status:200,body,contentType:types[file.split('.').at(-1)]||'application/octet-stream'});cachedArt.add(file);return;
    }catch(error){if(error.code!=='ENOENT')throw error;}
   }
   const target=ORIGIN+(name.startsWith('art/')?ART+name.slice(4):OLD+name);
   const response=await route.fetch({url:target});await route.fulfill({response});return;
  }
  if(!LIVE&&url.origin===ORIGIN&&url.pathname==='/demo/games/'+game){
   const response=await route.fetch();const body=await response.text();assert(body.includes(OLD+'app.mjs'),'Current game page no longer uses the expected retained client');
   await route.fulfill({response,body:body.replaceAll(OLD,PREFIX)});return;
  }
  await route.continue();
 });
 const page=await context.newPage();
 page.on('pageerror',error=>report.errors.push(String(error).slice(0,700)));
 page.on('requestfailed',request=>console.log(JSON.stringify({game,event:'request-failed',path:new URL(request.url()).pathname,error:request.failure()?.errorText})));
 page.on('response',response=>{if(response.status()>=400)report.http.push({path:new URL(response.url()).pathname,status:response.status()});});
 page.on('request',request=>{if(new URL(request.url()).pathname==='/api/remaining20/demo/action'&&request.method()==='POST')actions.push(action(request));});
 const state=async()=>{
  const value=await page.evaluate(async id=>{const r=await fetch('/api/remaining20/demo/state?game_id='+id,{cache:'no-store'});if(!r.ok)throw Error('Credits state '+r.status);return r.json();},game);
  assert.equal(value.currency,'CREDITS');assert.equal(value.demoCreditsOnly,true);return value;
 };
 const responseTo=(type)=>page.waitForResponse(r=>{
  if(new URL(r.url()).pathname!=='/api/remaining20/demo/action'||r.request().method()!=='POST')return false;
  const body=action(r.request());return type==='collect'?body.type==='action'&&body.action==='collect':body.type===type;
 },{timeout:45000});
 const start=async()=>{
  await page.goto(ORIGIN+'/demo/games/'+game,{waitUntil:'domcontentloaded',timeout:60000});
  if(LIVE){assert((await page.content()).includes(PREFIX+'app.mjs'),'Live HTML does not select the activated controls client');report.liveClientPrefix=PREFIX;}
  console.log(JSON.stringify({game,event:'html-ready'}));
  await page.locator('#startupYes').click({timeout:45000});
  console.log(JSON.stringify({game,event:'startup-confirmed'}));
  await page.getByRole('button',{name:'Select next bet',exact:true}).waitFor({timeout:45000});
 };
 try{
  await start();
  const initial=await state();report.initialBalance=initial.balance;
  const next=page.getByRole('button',{name:'Select next bet',exact:true});
  const prev=page.getByRole('button',{name:'Select previous bet',exact:true});
  await page.locator('#stake').selectOption('1.00',{force:true});assert(await prev.isDisabled());
  await next.click();assert.equal(await page.locator('#stake').inputValue(),'2.00');assert(!(await page.locator('#betDialog').isVisible()));
  await prev.click();assert.equal(await page.locator('#stake').inputValue(),'1.00');
  await page.locator('#stake').selectOption('40000.00',{force:true});assert(await next.isDisabled());
  await page.locator('#stake').selectOption('1.00',{force:true});await next.click();assert.equal(await page.locator('#stake').inputValue(),'2.00');
  assert.equal(actions.length,0);assert.equal((await state()).balance,initial.balance);
  report.checks.push('Native stake rows: 1/2/40000 bounds, no modal and no wager/debit');
  await page.screenshot({path:path.join(ROOT,game+'-'+LABEL+'-desktop.png')});
  let collectedWins=0,stops=0;
  for(let i=0;i<ROUNDS;i++){
   const before=await state(),startCount=actions.filter(a=>a.type==='start').length;
   const pending=responseTo('start');
   await page.getByRole('button',{name:'SPIN',exact:true}).click({timeout:45000});
   const response=await pending;assert.equal(response.status(),200);const spin=await response.json();
   assert.equal(spin.round.game_id,game);assert.equal(spin.round.stakeMinor,'200');
   const stop=page.getByRole('button',{name:'Stop animation',exact:true});
   if(await stop.isVisible()){await stop.click({timeout:1500});stops++;}
   if(spin.round.status==='active'){
    const pendingCollect=responseTo('collect');
    await page.locator('[data-control="collect"]').click({timeout:45000});
    const collect=await pendingCollect;assert.equal(collect.status(),200);const collected=await collect.json();
    assert.equal(collected.round.round_id,spin.round.round_id);assert.equal(collected.round.status,'settled');collectedWins++;
   }
   await page.waitForFunction(()=>{const b=document.querySelector('[data-control="nextBet"]');return b&&!b.disabled;},{},{timeout:45000});
   const final=await state();assert.equal(final.round.status,'settled');assert.equal(final.round.round_id,spin.round.round_id);
   const expected=minor(before.balance)-200n+BigInt(final.round.payoutMinor);
   assert.equal(minor(final.balance),expected);assert.equal(actions.filter(a=>a.type==='start').length-startCount,1);
   report.rounds.push({index:i+1,stakeMinor:final.round.stakeMinor,payoutMinor:final.round.payoutMinor,before:before.balance,after:final.balance,roundId:final.round.round_id,collected:spin.round.status==='active'});
   if((i+1)%5===0)console.log(JSON.stringify({game,scope:LABEL,rounds:i+1,collectedWins,stops}));
  }
  report.collectedWins=collectedWins;report.stopClicks=stops;
  report.checks.push(ROUNDS+' visible SPIN rounds, one start per round, exact BigInt balance conservation');
  if(collectedWins)report.checks.push('Original native COLLECT settled '+collectedWins+' server-confirmed wins');
  const last=await state();await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  try{await page.locator('#startupYes').click({timeout:7000});}catch{}
  await next.waitFor({timeout:45000});const recovered=await state();assert.equal(recovered.round.round_id,last.round.round_id);assert.equal(recovered.balance,last.balance);
  report.checks.push('Reload retains exact final receipt and balance');
  report.finalBalance=recovered.balance;
  for(const width of [360,390,430]){
   await page.setViewportSize({width,height:844});await page.waitForTimeout(700);
   assert(await page.locator('#scene').isVisible());
   const rect=await page.locator('#scene').boundingBox();assert(rect&&rect.width>0&&rect.width<=width+2);
   await page.screenshot({path:path.join(ROOT,game+'-'+LABEL+'-'+width+'.png')});
  }
  report.checks.push('Portrait canvas rendered at 360/390/430 widths');
  assert.deepEqual(report.blockedWrites,[]);assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);
  if(ROUNDS>=25)assert(collectedWins>0,'25 rounds completed without a winning COLLECT opportunity');
  report.passed=true;
 }catch(error){report.error=String(error);report.stack=error.stack;await page.screenshot({path:path.join(ROOT,game+'-'+LABEL+'-failure.png')}).catch(()=>{});report.passed=false;}
 finally{report.hashVerifiedCachedArt=cachedArt.size;await fs.writeFile(path.join(ROOT,LABEL+'-browser-node.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify({game,scope:LABEL,passed:report.passed,rounds:report.rounds.length,collectedWins:report.collectedWins,error:report.error,errors:report.errors,http:report.http}));await context.unrouteAll({behavior:'ignoreErrors'});await context.close();}
}
try{await Promise.all(['burningice10_native','burningice40_native'].map(run));}finally{await browser.close();}
process.exitCode=reports.every(r=>r.passed)?0:1;
