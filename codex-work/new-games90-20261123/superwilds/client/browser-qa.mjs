import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {GAME_ID,SYMBOLS,quoteGrid} from '../rules.mjs';

// This executable is an isolated synthetic host integration test. It is never
// mounted on the Player and cannot authenticate or access a production wallet.
const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(process.env.ZPLAY_SUPERWILDS_QA_OUTPUT||'/tmp/zplay-superwilds-browser-proof');
const moduleRoot=process.env.ZPLAY_QA_NODE_MODULES||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=moduleRoot?await import(pathToFileURL(join(moduleRoot,'playwright/index.mjs')).href):await import('playwright');
await mkdir(output,{recursive:true});
const banks=new Map(),requests=[],reports=[],forbidden=[],errors=[],stopTraces=[];
let browser,failure=null,origin,assertions=0;
const check=(condition,message)=>{assert.ok(condition,message);assertions++;};
const getBank=key=>{
  if(!banks.has(key))banks.set(key,{balance:10000,pending:0,last:null,rounds:0,debits:0,credits:0,actions:new Map(),dropNext:false,holdNext:false,held:null});
  return banks.get(key);
};
const state=(b,key)=>({gameId:GAME_ID,currency:'ETB',subject:`qa-${key}`,canPlay:true,canDouble:false,betLevelsMinor:[10,20,30],betMinor:10,
  balanceMinor:b.balance,pendingWinMinor:b.pending,round:b.last?{...b.last,winPending:b.pending>0,pendingWinMinor:b.pending}:null});
const send=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));};
const fixtureCode=`
import {mountSuperWilds} from '/superwilds/client/main.mjs';
const key=new URL(location.href).searchParams.get('case');
const api=async(path,body)=>{const response=await fetch('/__qa__/'+path+'?case='+key,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw Error('ISOLATED_REPLY_LOST');return response.json();};
const transport={state:()=>api('state'),prepare:intent=>({...intent,authority:{fixture:'synthetic-client-qa',betMinor:intent.betMinor,collectRoundId:intent.collectRoundId??null}}),dispatch:intent=>api('dispatch',intent),recover:intent=>api('recover',intent)};
window.__SW_QA__={mount:mountSuperWilds({root:document.querySelector('#game'),transport,subject:'qa-'+key}),api};
`;
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://fixture.local');requests.push({method:req.method,path:url.pathname});
    const key=url.searchParams.get('case')||'default',b=getBank(key);
    if(url.pathname==='/fixture.html'){
      res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Super Wilds isolated synthetic QA</title><link rel="stylesheet" href="/superwilds/client/style.css"><style>html,body{margin:0;background:#001812}#fixture-label{position:fixed;top:0;left:0;z-index:100;color:white;background:#173;font:9px Arial}</style></head><body><span id="fixture-label">ISOLATED SYNTHETIC QA</span><main id="game"></main><script type="module" src="/fixture.mjs"></script></body></html>');return;
    }
    if(url.pathname==='/fixture.mjs'){res.writeHead(200,{'content-type':'application/javascript'});res.end(fixtureCode);return;}
    if(url.pathname==='/__qa__/state'){send(res,200,state(b,key));return;}
    if(url.pathname==='/__qa__/stats'){send(res,200,{debits:b.debits,credits:b.credits,rounds:b.rounds,balance:b.balance,pending:b.pending,heldReply:!!b.held,keys:[...b.actions.keys()]});return;}
    if(url.pathname.startsWith('/__qa__/')){
      let body='';for await(const chunk of req)body+=chunk;const action=JSON.parse(body||'{}');
      if(url.pathname==='/__qa__/control'){
        if(action.dropNext!==undefined)b.dropNext=action.dropNext===true;
        if(action.holdNext!==undefined)b.holdNext=action.holdNext===true;
        if(action.releaseHeld===true){if(!b.held){send(res,409,{error:'ISOLATED_HELD_REPLY_REQUIRED'});return;}
          const held=b.held;b.held=null;send(held.res,200,held.receipt);}
        send(res,200,{ok:true});return;
      }
      if(action.gameId!==GAME_ID||!action.authority||!['SPIN','TAKE'].includes(action.action)){send(res,422,{error:'ISOLATED_ACTION_INVALID'});return;}
      const encoded=JSON.stringify(action),saved=b.actions.get(action.requestKey);
      if(saved){if(saved.encoded!==encoded){send(res,409,{error:'ISOLATED_KEY_CONFLICT'});return;}send(res,200,saved.receipt);return;}
      if(url.pathname==='/__qa__/recover'){send(res,404,{error:'ISOLATED_NOT_ACCEPTED'});return;}
      let receipt;
      if(action.action==='SPIN'){
        if(b.pending){if(action.collectRoundId!==b.last?.roundId){send(res,409,{error:'ISOLATED_COLLECTION_MISMATCH'});return;}b.balance+=b.pending;b.credits++;b.pending=0;}
        b.balance-=action.betMinor;b.debits++;b.rounds++;
        const symbol=SYMBOLS[b.rounds%SYMBOLS.length],grid=Array.from({length:5},()=>[symbol,symbol,symbol]),multiplier=b.rounds%5+1;
        const quote=quoteGrid({grid,betMinor:action.betMinor,multiplier});b.pending=quote.winMinor;
        receipt={gameId:GAME_ID,currency:'ETB',requestKey:action.requestKey,roundId:randomUUID(),betMinor:action.betMinor,grid,multiplier,
          winningLines:quote.winningLines,winMinor:quote.winMinor,balanceMinor:b.balance,pendingWinMinor:b.pending,action:'SPIN'};b.last=receipt;
      }else{
        if(!b.pending||action.roundId!==b.last?.roundId){send(res,409,{error:'ISOLATED_WIN_MISMATCH'});return;}
        const amountMinor=b.pending;b.balance+=amountMinor;b.pending=0;b.credits++;
        receipt={gameId:GAME_ID,currency:'ETB',requestKey:action.requestKey,roundId:action.roundId,amountMinor,collected:true,balanceMinor:b.balance,action:'TAKE'};
      }
      b.actions.set(action.requestKey,{encoded,receipt});
      if(b.dropNext){b.dropNext=false;send(res,503,{error:'ISOLATED_ACCEPTED_REPLY_LOST'});return;}
      if(b.holdNext){b.holdNext=false;b.held={res,receipt};return;}
      send(res,200,receipt);return;
    }
    if(url.pathname.startsWith('/superwilds/')){
      const file=resolve(sourceRoot,url.pathname.slice('/superwilds/'.length));
      if(!file.startsWith(sourceRoot)){res.writeHead(403);res.end();return;}
      const bytes=await readFile(file);res.writeHead(200,{'content-type':extname(file)==='.css'?'text/css':'application/javascript'});res.end(bytes);return;
    }
    res.writeHead(404);res.end();
  }catch(error){send(res,500,{error:String(error.message)});}
});
await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
origin=`http://127.0.0.1:${server.address().port}`;
try{
  browser=await chromium.launch({headless:true,...(process.env.ZPLAY_QA_CHROMIUM_PATH?{executablePath:process.env.ZPLAY_QA_CHROMIUM_PATH}:{})});
  for(const width of [360,390,430,1280]){
    const context=await browser.newContext({viewport:{width,height:width===1280?900:844},deviceScaleFactor:2});
    const page=await context.newPage(),caseErrors=[];
    page.on('pageerror',error=>caseErrors.push(String(error.message)));
    await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin){forbidden.push(u.origin+u.pathname);route.abort();}else route.continue();});
    await page.goto(`${origin}/fixture.html?case=${width}`);await page.getByRole('button',{name:'Yes',exact:true}).click();
    await page.waitForFunction(()=>window.__SW_QA__?.mount.snapshot().connected===true);
    check(await page.locator('.sw-root').getAttribute('data-phase')==='READY','authenticated fixture ready');
    const geometry=await page.locator('.sw-control:not([hidden])').evaluateAll(nodes=>nodes.filter(n=>!n.disabled).map(n=>{
      const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return{action:n.dataset.action,x:r.x,y:r.y,width:r.width,height:r.height,hit:hit===n||n.contains(hit)};
    }));
    for(const g of geometry){check(g.width>=43.9&&g.height>=43.9,`${width} ${g.action} minimum touch size`);check(g.x>=0&&g.y>=0&&g.x+g.width<=width+.5&&g.y+g.height<= (width===1280?900:844)+.5,`${width} ${g.action} viewport`);check(g.hit,`${width} ${g.action} rendered hitbox`);}
    await page.locator('.sw-menu').click();check(await page.getByRole('heading',{name:'RULES & PAYTABLE'}).isVisible(),'rules opens at same control');
    check(await page.locator('.sw-paylines svg').count()===5,'five actual payline paths rendered');
    await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('[data-setting=effects]').uncheck();
    check(await page.locator('[data-setting=music]').isChecked()===false,'effects OFF also turns music OFF');
    check(await page.evaluate(()=>window.__SW_QA__.mount.audio.ambient===null),'muting stops ambient audio node');
    await page.locator('[data-setting=effects]').check();await page.getByRole('button',{name:'×',exact:true}).click();
    await page.locator('.sw-quick').click();await page.locator('[data-setting=quick]').check();await page.getByRole('button',{name:'×',exact:true}).click();
    await page.locator('.sw-bet').click();await page.locator('[data-action=choose-bet][data-value="20"]').click();
    check(await page.evaluate(()=>window.__SW_QA__.mount.snapshot().betMinor)===20,'host-supplied bet choice updates input');
    await page.screenshot({path:resolve(output,`superwilds-${width}-ready.png`)});
    const receipts=[];
    for(let i=0;i<10;i++){
      const before=await page.evaluate(()=>window.__SW_QA__.api('stats'));
      // Keep the first accepted response pending until STOP has been observed.
      // Two unbounded clicks can legitimately span a complete QUICK round on
      // a slow desktop runner and would test SPIN→SPIN instead of SPIN→STOP.
      if(i===0)await page.evaluate(()=>window.__SW_QA__.api('control',{holdNext:true}));
      await page.locator('.sw-spin').click();
      if(i===0){
        await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='WAITING');
        const beforeStop=await page.evaluate(()=>({controller:window.__SW_QA__.mount.snapshot(),renderer:window.__SW_QA__.mount.renderer.snapshot()}));
        const accepted=await page.evaluate(()=>window.__SW_QA__.api('stats'));
        check(accepted.heldReply&&accepted.debits===before.debits+1,`${width}px first response is held after exactly one accepted debit`);
        await page.locator('.sw-spin').click();
        const afterStop=await page.evaluate(()=>({controller:window.__SW_QA__.mount.snapshot(),renderer:window.__SW_QA__.mount.renderer.snapshot()}));
        const afterStopStats=await page.evaluate(()=>window.__SW_QA__.api('stats'));
        stopTraces.push({width,before:beforeStop,acceptedStats:accepted,after:afterStop,afterStats:afterStopStats});
        check(beforeStop.controller.phase==='WAITING'&&afterStop.controller.phase==='WAITING','STOP is pressed while the original reply is pending');
        check(beforeStop.controller.pending.requestKey===afterStop.controller.pending.requestKey,'STOP preserves the original request key');
        check(afterStop.renderer.stopRequested===true,'STOP accelerates the existing renderer presentation');
        check(afterStopStats.debits===accepted.debits,'STOP creates zero additional fixture debits');
        await page.evaluate(()=>window.__SW_QA__.api('control',{releaseHeld:true}));
      }
      await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='WIN_PENDING');
      const s=await page.evaluate(()=>window.__SW_QA__.mount.snapshot());receipts.push({roundId:s.round.roundId,multiplier:s.round.multiplier,grid:s.round.grid,winMinor:s.round.winMinor});
      const after=await page.evaluate(()=>window.__SW_QA__.api('stats'));check(after.debits===before.debits+1,'one server fixture debit for SPIN/STOP');
      if(i===0){await page.screenshot({path:resolve(output,`superwilds-${width}-win.png`)});const p1=page.locator('.sw-take').click();await p1;
        await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='READY');const take=await page.evaluate(()=>window.__SW_QA__.api('stats'));check(take.credits===after.credits+1,'TAKE credits accepted fixture win once');}
    }
    check(new Set(receipts.map(r=>r.roundId)).size===10,'ten distinct round receipts');check(new Set(receipts.map(r=>JSON.stringify([r.grid,r.multiplier]))).size===10,'ten distinct accepted grid/multiplier views');
    await page.locator('.sw-take').click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='READY');
    const beforeHeld=await page.evaluate(()=>window.__SW_QA__.api('stats'));await page.locator('#game').focus();
    await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='WIN_PENDING');await page.keyboard.down('Enter');await page.keyboard.up('Enter');
    const afterHeld=await page.evaluate(()=>window.__SW_QA__.api('stats'));check(afterHeld.debits===beforeHeld.debits+1,'held Enter never creates next wager');
    await page.locator('.sw-take').click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='READY');
    await page.locator('.sw-auto').click();await page.locator('[data-action=auto-count][data-value="25"]').click();
    await page.locator('[data-limit-toggle=winLimit]').check();await page.locator('[data-limit-value=winLimit]').fill('0.01');await page.getByRole('button',{name:'START PLAY',exact:true}).click();
    await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().auto?.reason==='LIMIT');
    check(await page.evaluate(()=>window.__SW_QA__.mount.snapshot().auto.remaining)===24,'AUTO limit stops after its accepted first round');
    await page.locator('.sw-take').click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='READY');
    await page.evaluate(()=>window.__SW_QA__.api('control',{dropNext:true}));await page.locator('.sw-spin').click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='RECOVERY');
    const original=await page.evaluate(()=>window.__SW_QA__.mount.snapshot().pending),beforeReload=await page.evaluate(()=>window.__SW_QA__.api('stats'));
    await page.reload();await page.getByRole('button',{name:'No',exact:true}).click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='RECOVERY');
    check((await page.evaluate(()=>window.__SW_QA__.mount.snapshot().pending)).requestKey===original.requestKey,'reload preserves original action key');
    await page.getByRole('button',{name:'Recover current round',exact:true}).click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='WIN_PENDING');
    const afterReload=await page.evaluate(()=>window.__SW_QA__.api('stats'));check(afterReload.debits===beforeReload.debits,'reload recovery adds zero debits');
    await page.locator('.sw-menu').click();await page.getByRole('button',{name:'History',exact:true}).click();check(await page.getByRole('heading',{name:'HISTORY',exact:true}).isVisible(),'accepted recovery enters live session history');
    await page.getByRole('button',{name:'×',exact:true}).click();
    await page.screenshot({path:resolve(output,`superwilds-${width}-recovered.png`)});
    check(caseErrors.length===0,`no ${width}px browser errors`);errors.push(...caseErrors);
    reports.push({width,assertions,geometry,rounds:receipts,stats:afterReload,pageErrors:caseErrors});await context.close();
  }
  check(forbidden.length===0,'no production or off-fixture requests');
}catch(error){failure=error.stack||String(error);throw error;}
finally{
  if(browser)await browser.close();server.closeAllConnections();await new Promise(done=>server.close(done));
  const paths=['client/main.mjs','client/controller.mjs','client/audio.mjs','client/style.css','client/browser-qa.mjs','render/renderer.mjs','render/layout.mjs','render/artwork.mjs','rules.mjs'];
  const pins=[];for(const path of paths){const bytes=await readFile(resolve(sourceRoot,path));pins.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
  await writeFile(resolve(output,'browser-report.json'),JSON.stringify({schema:'zplay/superwilds-client-qa/v1',testedAt:new Date().toISOString(),
    environment:'isolated synthetic server receipts and fixture wallet; no production/player/provider session or financial round',passed:failure===null&&reports.length===4,
    failure,assertions,reports,stopTraces,forbiddenRequests:forbidden,requests,sourceCommit:process.env.GITHUB_SHA??null,sourcePins:pins,audibleProviderParityVerified:false},null,2)+'\n');
}
