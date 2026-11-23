import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {GAME_ID,SYMBOLS,OBSERVED_BETS_MINOR,quoteGrid} from '../rules.mjs';

// This executable is an isolated synthetic host integration test. It is never
// mounted on the Player and cannot authenticate or access a production wallet.
const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(process.env.ZPLAY_SUPERWILDS_QA_OUTPUT||'/tmp/zplay-superwilds-browser-proof');
const moduleRoot=process.env.ZPLAY_QA_NODE_MODULES||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=moduleRoot?await import(pathToFileURL(join(moduleRoot,'playwright/index.mjs')).href):await import('playwright');
await mkdir(output,{recursive:true});
const banks=new Map(),requests=[],reports=[],forbidden=[],errors=[],stopTraces=[],controlTraces=[];
let browser,failure=null,origin,assertions=0;
const check=(condition,message)=>{assert.ok(condition,message);assertions++;};
const getBank=key=>{
  if(!banks.has(key))banks.set(key,{balance:10000,pending:0,last:null,rounds:0,debits:0,credits:0,actions:new Map(),dropNext:false,holdNext:false,held:null,gambleEnabled:false,gambles:[],nextCard:'RED'});
  return banks.get(key);
};
const gamble=b=>({available:b.gambleEnabled&&b.pending>0,reason:b.gambleEnabled?null:'ISOLATED_GAMBLE_DISABLED',roundId:b.last?.roundId??null,
  attempt:b.gambles.length,nextAttempt:b.gambles.length+1,pendingWinMinor:b.pending,targetWinMinor:b.gambleEnabled&&b.pending>0?b.pending*2:null,
  version:'isolated-gamble',sha256:'d'.repeat(64),history:b.gambles});
const state=(b,key)=>({gameId:GAME_ID,currency:'ETB',subject:`qa-${key}`,canPlay:true,canDouble:b.gambleEnabled&&b.pending>0,betLevelsMinor:OBSERVED_BETS_MINOR,betMinor:10,
  balanceMinor:b.balance,pendingWinMinor:b.pending,gamble:gamble(b),round:b.last?{...b.last,winPending:b.pending>0,pendingWinMinor:b.pending}:null});
const send=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));};
const fixtureCode=`
import {mountSuperWilds} from '/superwilds/client/main.mjs';
const key=new URL(location.href).searchParams.get('case');
const api=async(path,body)=>{const response=await fetch('/__qa__/'+path+'?case='+key,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw Error('ISOLATED_REPLY_LOST');return response.json();};
const transport={state:()=>api('state'),prepare:intent=>({...intent,authority:{fixture:'synthetic-client-qa',betMinor:intent.betMinor,collectRoundId:intent.collectRoundId??null}}),dispatch:intent=>api('dispatch',intent),recover:intent=>api('recover',intent)};
window.__SW_QA__={exitCount:0,mount:mountSuperWilds({root:document.querySelector('#game'),transport,subject:'qa-'+key,onExit:()=>{window.__SW_QA__.exitCount++;}}),api};
`;
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://fixture.local');requests.push({method:req.method,path:url.pathname});
    const key=url.searchParams.get('case')||'default',b=getBank(key);
    if(url.pathname==='/fixture.html'){
      res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Super Wilds isolated synthetic QA</title><link rel="stylesheet" href="/superwilds/client/style.css"><style>html,body{margin:0;background:#001812}#fixture-label{position:fixed;top:0;left:0;z-index:100;color:white;background:#173;font:9px Arial;pointer-events:none}</style></head><body><span id="fixture-label">ISOLATED SYNTHETIC QA</span><main id="game"></main><script type="module" src="/fixture.mjs"></script></body></html>');return;
    }
    if(url.pathname==='/fixture.mjs'){res.writeHead(200,{'content-type':'application/javascript'});res.end(fixtureCode);return;}
    if(url.pathname==='/__qa__/state'){send(res,200,state(b,key));return;}
    if(url.pathname==='/__qa__/stats'){send(res,200,{debits:b.debits,credits:b.credits,rounds:b.rounds,balance:b.balance,pending:b.pending,gambles:b.gambles.length,heldReply:!!b.held,keys:[...b.actions.keys()]});return;}
    if(url.pathname.startsWith('/__qa__/')){
      let body='';for await(const chunk of req)body+=chunk;const action=JSON.parse(body||'{}');
      if(url.pathname==='/__qa__/control'){
        if(action.dropNext!==undefined)b.dropNext=action.dropNext===true;
        if(action.holdNext!==undefined)b.holdNext=action.holdNext===true;
        if(action.gambleEnabled!==undefined)b.gambleEnabled=action.gambleEnabled===true;
        if(['RED','BLACK'].includes(action.nextCard))b.nextCard=action.nextCard;
        if(action.releaseHeld===true){if(!b.held){send(res,409,{error:'ISOLATED_HELD_REPLY_REQUIRED'});return;}
          const held=b.held;b.held=null;send(held.res,200,held.receipt);}
        send(res,200,{ok:true});return;
      }
      if(action.gameId!==GAME_ID||!action.authority||!['SPIN','TAKE','DOUBLE'].includes(action.action)){send(res,422,{error:'ISOLATED_ACTION_INVALID'});return;}
      const encoded=JSON.stringify(action),saved=b.actions.get(action.requestKey);
      if(saved){if(saved.encoded!==encoded){send(res,409,{error:'ISOLATED_KEY_CONFLICT'});return;}send(res,200,saved.receipt);return;}
      if(url.pathname==='/__qa__/recover'){send(res,404,{error:'ISOLATED_NOT_ACCEPTED'});return;}
      let receipt;
      if(action.action==='SPIN'){
        if(b.pending){if(action.collectRoundId!==b.last?.roundId){send(res,409,{error:'ISOLATED_COLLECTION_MISMATCH'});return;}b.balance+=b.pending;b.credits++;b.pending=0;}
        b.balance-=action.betMinor;b.debits++;b.rounds++;b.gambles=[];
        const symbol=SYMBOLS[b.rounds%SYMBOLS.length],grid=Array.from({length:5},()=>[symbol,symbol,symbol]),multiplier=b.rounds%5+1;
        const quote=quoteGrid({grid,betMinor:action.betMinor,multiplier});b.pending=quote.winMinor;
        receipt={gameId:GAME_ID,currency:'ETB',requestKey:action.requestKey,roundId:randomUUID(),betMinor:action.betMinor,grid,multiplier,
          winningLines:quote.winningLines,winMinor:quote.winMinor,balanceMinor:b.balance,pendingWinMinor:b.pending,action:'SPIN'};b.last=receipt;
        receipt={...receipt,gamble:gamble(b)};
      }else if(action.action==='DOUBLE'){
        if(!b.gambleEnabled||!b.pending||action.roundId!==b.last?.roundId||action.expectedPendingWinMinor!==b.pending||action.expectedAttempt!==b.gambles.length+1){send(res,409,{error:'ISOLATED_GAMBLE_CHANGED'});return;}
        const before=b.pending,color=b.nextCard,won=action.choice===color;b.pending=won?before*2:0;
        const event={kind:'GAMBLE',gameId:GAME_ID,currency:'ETB',requestKey:action.requestKey,roundId:action.roundId,choice:action.choice,color,won,
          attempt:b.gambles.length+1,pendingWinBeforeMinor:before,pendingWinAfterMinor:b.pending,gambleVersion:'isolated-gamble',gambleSha256:'d'.repeat(64)};
        b.gambles.push(event);receipt={...event,balanceMinor:b.balance,pendingWinMinor:b.pending,action:'DOUBLE',gamble:gamble(b)};
      }else{
        if(!b.pending||action.roundId!==b.last?.roundId){send(res,409,{error:'ISOLATED_WIN_MISMATCH'});return;}
        const amountMinor=b.pending;b.balance+=amountMinor;b.pending=0;b.credits++;
        receipt={gameId:GAME_ID,currency:'ETB',requestKey:action.requestKey,roundId:action.roundId,amountMinor,collected:true,balanceMinor:b.balance,action:'TAKE',gamble:gamble(b)};
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
    const beforeControls=await page.evaluate(()=>window.__SW_QA__.api('stats'));
    const initialPresentation=await page.evaluate(()=>{
      const mount=window.__SW_QA__.mount,view=mount.renderer.snapshot(),canvas=document.querySelector('.sw-scene');
      const rect=view.layout.cabinet,pad=Math.max(3,rect.width*.007),width=(rect.width-pad*2)/5,height=(rect.height-pad*2)/3;
      const scale=canvas.width/view.layout.width,context=canvas.getContext('2d'),colorCounts=[];
      for(let column=0;column<5;column++){
        const pixels=context.getImageData(Math.round((rect.x+pad+column*width+width*.25)*scale),
          Math.round((rect.y+pad+height*.25)*scale),Math.max(1,Math.round(width*.5*scale)),Math.max(1,Math.round(height*.5*scale))).data;
        let colored=0;for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
          if(r>120&&g>50&&b<170&&r>g*.9)colored++;}
        colorCounts.push(colored);
      }
      return{colorCounts,symbolAspect:width/height,receipt:view.receipt,controllerRound:mount.snapshot().round};
    });
    check(initialPresentation.receipt===null&&initialPresentation.controllerRound===null,'fresh idle artwork creates no accepted financial result');
    check(initialPresentation.colorCounts.every(count=>count>30),'every initial reel visibly contains original symbol artwork before the first SPIN');
    if(width!==1280)check(initialPresentation.symbolAspect>.92&&initialPresentation.symbolAspect<1.08,'portrait symbols retain their near-square proportions');
    await page.locator('.sw-menu').click();check(await page.getByRole('heading',{name:'RULES & PAYTABLE'}).isVisible(),'rules opens at same control');
    const menuGeometry=await page.locator('.sw-menu-panel').evaluate(panel=>{
      const r=panel.getBoundingClientRect(),tabs=[...panel.querySelectorAll('[role=tab]')].map(node=>{
        const rect=node.getBoundingClientRect(),hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
        return{x:rect.x,y:rect.y,width:rect.width,height:rect.height,hit:hit===node||node.contains(hit)};
      });return{x:r.x,y:r.y,width:r.width,height:r.height,tabs};
    });
    check(menuGeometry.tabs.length===3,'menu has exactly three bottom tabs');
    check(menuGeometry.tabs.every(tab=>tab.hit&&tab.height>=44&&Math.abs(tab.width-menuGeometry.width/3)<1),'bottom tabs have three equal visible hitboxes');
    check(menuGeometry.x>=0&&menuGeometry.y>=0&&menuGeometry.x+menuGeometry.width<=width+.5&&menuGeometry.y+menuGeometry.height<=(width===1280?900:844)+.5,'menu stays inside viewport');
    if(width===1280)check(menuGeometry.width===900&&menuGeometry.height===602,'observed desktop menu dimensions are retained');
    check(await page.locator('.sw-paylines svg').count()===5,'five actual payline paths rendered');
    await page.getByRole('tab',{name:'Settings',exact:true}).click();await page.locator('[data-setting=effects]').uncheck();
    check(await page.locator('[data-setting=music]').isChecked()===false,'effects OFF also turns music OFF');
    check(await page.evaluate(()=>window.__SW_QA__.mount.audio.ambient===null),'muting stops ambient audio node');
    await page.locator('[data-setting=effects]').check();
    await page.getByRole('tab',{name:'Settings',exact:true}).press('ArrowRight');
    check(await page.getByRole('tab',{name:'History',exact:true}).getAttribute('aria-selected')==='true','keyboard selects the next real menu tab');
    await page.getByRole('tab',{name:'History',exact:true}).press('Home');
    check(await page.getByRole('heading',{name:'RULES & PAYTABLE'}).isVisible(),'Home selects the first menu tab');
    await page.getByRole('tab',{name:'Rules',exact:true}).press('Tab');
    check(await page.evaluate(()=>document.activeElement?.dataset.action)==='exit','Tab from the selected last focusable tab wraps inside menu');
    await page.getByRole('button',{name:'↤ Exit',exact:true}).press('Shift+Tab');
    check(await page.evaluate(()=>document.activeElement?.dataset.action)==='rules','Shift+Tab wraps back to the selected menu tab');
    await page.getByRole('button',{name:'×',exact:true}).click();
    const spinColor=()=>page.locator('.sw-scene').evaluate(canvas=>{
      const rect=document.querySelector('.sw-spin').getBoundingClientRect(),scene=canvas.getBoundingClientRect(),scale=canvas.width/scene.width;
      const width=Math.round(rect.width*scale),height=Math.round(rect.height*scale),pixels=canvas.getContext('2d').getImageData(Math.round((rect.x-scene.x)*scale),Math.round((rect.y-scene.y)*scale),width,height).data;
      let yellow=0,white=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        if(Math.hypot(x-width/2,y-height/2)>Math.min(width,height)*.415)continue;
        const offset=(y*width+x)*4,r=pixels[offset],g=pixels[offset+1],b=pixels[offset+2];
        if(r>220&&g>160&&b<140)yellow++;if(r>220&&g>220&&b>220)white++;
      }return{yellow,white};
    });
    const whiteSpin=await spinColor();
    await page.locator('.sw-quick').click();check(await page.getByRole('heading',{name:'QUICK PLAY',exact:true}).isVisible(),'lightning opens QUICK confirmation');
    await page.getByRole('button',{name:'NO',exact:true}).click();check(await page.locator('#game').getAttribute('data-quick')==='false','NO leaves quick disabled');
    await page.locator('.sw-quick').click();await page.getByRole('button',{name:'×',exact:true}).click();
    check(await page.locator('#game').getAttribute('data-quick')==='false','X leaves quick disabled');
    await page.locator('.sw-quick').click();await page.getByRole('button',{name:'ENABLE QUICK PLAY',exact:true}).press('Enter');
    check(await page.locator('#game').getAttribute('data-quick')==='true','keyboard confirms quick play');
    const yellowSpin=await spinColor();check(yellowSpin.yellow>whiteSpin.yellow+50,'enabled QUICK visibly changes the main spin arrow to yellow');
    await page.locator('.sw-quick').click();check(await page.locator('#game').getAttribute('data-modal')===''&&await page.locator('#game').getAttribute('data-quick')==='false','enabled lightning directly disables quick without another dialog');
    const restoredSpin=await spinColor();check(restoredSpin.white>yellowSpin.white,'disabling QUICK restores the white spin arrow');
    await page.locator('.sw-quick').click();await page.getByRole('button',{name:'ENABLE QUICK PLAY',exact:true}).click();
    await page.locator('.sw-bet').click();
    const betValues=()=>page.locator('.sw-bet-row').allTextContents();
    const expectedValues=offset=>OBSERVED_BETS_MINOR.slice(offset,offset+5).map(value=>`${(value/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ETB`);
    check(JSON.stringify(await betValues())===JSON.stringify(expectedValues(0)),'BET opens with five tall native-order host values');
    check(await page.getByRole('button',{name:'Previous bet values',exact:true}).isDisabled(),'BET first-page UP is disabled');
    await page.getByRole('button',{name:'Next bet values',exact:true}).click();
    check(JSON.stringify(await betValues())===JSON.stringify(expectedValues(5)),'BET DOWN moves by five values');
    const pickerGeometry=await page.locator('.sw-bet-panel').evaluate(panel=>[...panel.querySelectorAll('button')].map(node=>{
      const rect=node.getBoundingClientRect(),hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
      return{action:node.dataset.action,x:rect.x,y:rect.y,width:rect.width,height:rect.height,hit:hit===node||node.contains(hit)};
    }));
    check(pickerGeometry.every(node=>node.width>=44&&node.height>=44&&node.hit),'BET rows and each arrow have independent usable visible hitboxes');
    await page.locator('.sw-overlay').click({position:{x:5,y:5}});await page.locator('.sw-bet').click();
    check(JSON.stringify(await betValues())===JSON.stringify(expectedValues(5)),'closing outside and reopening retains the exact BET window');
    await page.getByRole('button',{name:'Previous bet values',exact:true}).press('Enter');
    check(JSON.stringify(await betValues())===JSON.stringify(expectedValues(0)),'BET UP reverses five positions through keyboard input');
    const reached=new Set();for(let n=0;n<7;n++){
      for(const value of await page.locator('.sw-bet-row').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.value))))reached.add(value);
      if(await page.getByRole('button',{name:'Next bet values',exact:true}).isDisabled())break;
      await page.getByRole('button',{name:'Next bet values',exact:true}).click();
    }
    check(reached.size===OBSERVED_BETS_MINOR.length,'five-row BET picker reaches every host-approved value');
    check(await page.getByRole('button',{name:'Next bet values',exact:true}).isDisabled(),'BET final-page DOWN is disabled');
    for(let n=0;n<7&&await page.getByRole('button',{name:'Previous bet values',exact:true}).isEnabled();n++)await page.getByRole('button',{name:'Previous bet values',exact:true}).click();
    await page.locator('[data-action=choose-bet][data-value="20"]').click();
    check(await page.evaluate(()=>window.__SW_QA__.mount.snapshot().betMinor)===20,'host-supplied bet choice updates input');
    const afterControls=await page.evaluate(()=>window.__SW_QA__.api('stats'));check(afterControls.debits===beforeControls.debits&&afterControls.credits===beforeControls.credits,'menu, QUICK and BET interactions create no financial actions');
    controlTraces.push({width,initialPresentation,menuGeometry,pickerGeometry,whiteSpin,yellowSpin,restoredSpin,beforeControls,afterControls});
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
    await page.locator('.sw-auto').click();
    check(await page.locator('[data-action=auto-count][data-value="100"]').getAttribute('aria-pressed')==='true','reopening a completed AUTO sequence resets selection to 100');
    check(await page.locator('[data-limit-toggle]').evaluateAll(nodes=>nodes.every(node=>node.checked===false)),'reopened AUTO conditions reset to OFF');
    check(await page.locator('[data-limit-value]').evaluateAll(nodes=>nodes.every(node=>node.value==='')),'reopened AUTO conditions are blank');
    await page.getByRole('button',{name:'×',exact:true}).click();
    await page.evaluate(()=>window.__SW_QA__.api('control',{dropNext:true}));await page.locator('.sw-spin').click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='RECOVERY');
    const original=await page.evaluate(()=>window.__SW_QA__.mount.snapshot().pending),beforeReload=await page.evaluate(()=>window.__SW_QA__.api('stats'));
    await page.reload();await page.getByRole('button',{name:'No',exact:true}).click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='RECOVERY');
    check((await page.evaluate(()=>window.__SW_QA__.mount.snapshot().pending)).requestKey===original.requestKey,'reload preserves original action key');
    await page.getByRole('button',{name:'Recover current round',exact:true}).click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='WIN_PENDING');
    const afterReload=await page.evaluate(()=>window.__SW_QA__.api('stats'));check(afterReload.debits===beforeReload.debits,'reload recovery adds zero debits');
    await page.locator('.sw-menu').click();await page.getByRole('tab',{name:'History',exact:true}).click();check(await page.getByRole('heading',{name:'HISTORY',exact:true}).isVisible(),'accepted recovery enters live session history');
    await page.getByRole('button',{name:'×',exact:true}).click();
    await page.screenshot({path:resolve(output,`superwilds-${width}-recovered.png`)});
    await page.locator('.sw-menu').click();await page.getByRole('button',{name:'↤ Exit',exact:true}).click();
    check(await page.evaluate(()=>window.__SW_QA__.exitCount)===1,'menu Exit invokes its existing-host navigation callback once');
    // Deterministic synthetic server cards test actual mounted controls only.
    // Their result choices are not a provider RNG or visual-parity claim.
    await page.evaluate(async()=>{await window.__SW_QA__.api('control',{gambleEnabled:true,nextCard:'RED'});await window.__SW_QA__.mount.controller.connect();});
    const baseBeforeGamble=await page.evaluate(()=>window.__SW_QA__.mount.snapshot().round),beforeGamble=await page.evaluate(()=>window.__SW_QA__.api('stats'));
    await page.locator('.sw-double').click();check(await page.getByText('Gamble amount',{exact:true}).isVisible(),'X2 shows current accepted gamble amount');
    check(await page.getByText('Gamble to win',{exact:true}).isVisible(),'X2 shows server-supplied target');
    await page.locator('[data-action=guess][data-value=RED]').click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().gamble?.history.length===1);
    check(await page.locator('[data-gamble-feedback]').innerText()==='RED · WIN','accepted RED card remains visible in the dialog');
    check(await page.locator('[data-gamble-history] [role=listitem]').count()===1,'only accepted server card history is shown');
    check(JSON.stringify(await page.evaluate(()=>window.__SW_QA__.mount.snapshot().round))===JSON.stringify(baseBeforeGamble),'GAMBLE preserves immutable accepted base SPIN view');
    const afterGamble=await page.evaluate(()=>window.__SW_QA__.api('stats'));
    check(afterGamble.debits===beforeGamble.debits&&afterGamble.balance===beforeGamble.balance,'GAMBLE changes pending liability without a new wager or fake wallet credit');
    await page.locator('[data-action=gamble-close]').click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='READY');
    const afterGambleClose=await page.evaluate(()=>window.__SW_QA__.api('stats'));check(afterGambleClose.credits===beforeGamble.credits+1&&afterGambleClose.pending===0,'X after accepted winning gamble explicitly collects once');
    await page.locator('.sw-spin').click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='WIN_PENDING');
    await page.evaluate(()=>window.__SW_QA__.api('control',{nextCard:'BLACK',dropNext:true}));await page.locator('.sw-double').click();
    await page.locator('[data-action=guess][data-value=BLACK]').click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='RECOVERY');
    const gambleOriginal=await page.evaluate(()=>window.__SW_QA__.mount.snapshot().pending),acceptedGambleStats=await page.evaluate(()=>window.__SW_QA__.api('stats'));
    await page.locator('[data-action=recover-gamble]').click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='WIN_PENDING');
    check(await page.locator('[data-gamble-feedback]').innerText()==='BLACK · WIN','accepted BLACK card is shown after original-key recovery');
    const recoveredGambleStats=await page.evaluate(()=>window.__SW_QA__.api('stats'));check(recoveredGambleStats.gambles===acceptedGambleStats.gambles&&recoveredGambleStats.debits===acceptedGambleStats.debits,'DOUBLE recovery adds no new card or wager');
    check(recoveredGambleStats.keys.includes(gambleOriginal.requestKey),'recovered DOUBLE retains the accepted original key');
    await page.locator('.sw-panel [data-action=take]').click();await page.waitForFunction(()=>window.__SW_QA__.mount.snapshot().phase==='READY');
    check(caseErrors.length===0,`no ${width}px browser errors`);errors.push(...caseErrors);
    reports.push({width,assertions,geometry,rounds:receipts,stats:afterReload,pageErrors:caseErrors});await context.close();
  }
  check(forbidden.length===0,'no production or off-fixture requests');
}catch(error){
  failure=error.stack||String(error);
  if(browser){let index=0;for(const context of browser.contexts())for(const page of context.pages()){
    try{await page.screenshot({path:resolve(output,`superwilds-failure-${++index}.png`)});}catch{}
  }}
  throw error;
}
finally{
  if(browser)await browser.close();server.closeAllConnections();await new Promise(done=>server.close(done));
  const paths=['client/main.mjs','client/controller.mjs','client/audio.mjs','client/style.css','client/browser-qa.mjs','render/renderer.mjs','render/layout.mjs','render/artwork.mjs','rules.mjs'];
  const pins=[];for(const path of paths){const bytes=await readFile(resolve(sourceRoot,path));pins.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
  await writeFile(resolve(output,'browser-report.json'),JSON.stringify({schema:'zplay/superwilds-client-qa/v1',testedAt:new Date().toISOString(),
    environment:'isolated synthetic server receipts and fixture wallet; no production/player/provider session or financial round',passed:failure===null&&reports.length===4,
    failure,assertions,reports,stopTraces,controlTraces,forbiddenRequests:forbidden,requests,sourceCommit:process.env.GITHUB_SHA??null,sourcePins:pins,audibleProviderParityVerified:false},null,2)+'\n');
}
