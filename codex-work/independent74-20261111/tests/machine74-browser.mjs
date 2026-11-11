// Actual-browser QA for a disposable PGlite fixture. No production URLs or
// credentials are accepted; every browser request is restricted to localhost.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createLocalMachine74Harness} from './support/machine74-local-harness.mjs';
import {seededRandom} from '../server/tests/support/retained-library/library-service.mjs';

if (!process.argv.includes('--isolated') || process.env.DATABASE_URL) throw Error('EXPLICIT_ISOLATED_BROWSER_QA_REQUIRED');
const directory=fileURLToPath(new URL('../',import.meta.url));
const artifacts=join(directory,'work','machine74-browser');
await mkdir(artifacts,{recursive:true});
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=runtime?await import(pathToFileURL(join(runtime,'playwright','index.mjs')).href):await import('playwright');
const widths=[360,390,430,1280];
const report={pass:false,environment:'isolated local PGlite + retained LibraryService + actual Chromium UI',
  productionRequests:0,createdAt:new Date().toISOString(),games:[],checks:[],screenshots:[],blockedRequests:[],pageErrors:[]};
let harness,browser,context,page,currentGame='startup',sequence=0,clockOffset=0,recoveredActive=false;
const snapshots=new Map();

try {
  harness=await createLocalMachine74Harness({isolated:true,
    now:()=>Date.now()+clockOffset,
    seed:()=> '42'.repeat(32),
    id:()=> '00000000-0000-4000-8000-'+(++sequence).toString(16).padStart(12,'0'),
  });
  const origin=new URL(harness.base);
  assert.equal(origin.hostname,'127.0.0.1');
  const initialWallets=(await harness.fixture.sql.unsafe('SELECT SUM(balance)::text AS total FROM sw_rebuild.wallets'))[0].total;
  const definitions=harness.fixture.facade.definitions();
  assert.equal(definitions.length,72);
  browser=await chromium.launch({headless:true,executablePath:process.env.MACHINE74_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',
    args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run',
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost']});
  context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference',serviceWorkers:'block'});
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin===origin.origin)return route.continue();
    report.blockedRequests.push({origin:url.origin,path:url.pathname});
    return route.abort('blockedbyclient');
  });
  await context.addCookies([{name:'sw_session',value:harness.token,url:harness.base,httpOnly:true,sameSite:'Lax'}]);
  page=await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror',error=>report.pageErrors.push({game:currentGame,message:error.message}));
  page.on('response',async response=>{
    if(!response.url().startsWith(harness.base+'/independent74/account-api/'))return;
    try{const value=await response.json();if(value?.game?.id&&value.authenticated)snapshots.set(value.game.id,value);}catch{}
  });

  async function idle() {
    await page.waitForFunction(()=>{
      const refresh=document.getElementById('refresh'),stop=document.getElementById('stop');
      return refresh&&!refresh.disabled&&stop?.hidden;
    });
    const error=await page.locator('#message').evaluate(element=>element.classList.contains('error')?element.textContent:null);
    if(error)throw new Error(currentGame+': '+error);
  }
  async function select(game) {
    currentGame=game.id;
    await page.locator('#game-select').selectOption(game.id);
    await page.waitForFunction(id=>document.querySelector('.m74-machine')?.dataset.profile===id,game.id);
    await idle();
    await page.locator('#play').waitFor({state:'visible'});
    assert.equal(await page.locator('#play').isEnabled(),true,game.id+' must be playable in isolated fixture');
    const hold=page.locator('[data-option="holdWin"]');
    if(await hold.count())await hold.uncheck();
    await page.locator('#turbo').check();
  }
  async function perform(selector) {
    const responsePromise=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/independent74/account-api/action');
    await page.locator(selector).click();
    const response=await responsePromise,value=await response.json();
    assert.equal(response.status(),200,currentGame+': '+JSON.stringify(value.error||value.message||value));
    assert.equal(value.authenticated,true);assert.equal(value.currency,'ETB');
    assert.equal(value.game.id,currentGame);snapshots.set(currentGame,value);
    await idle();return value;
  }
  async function settle(game) {
    for(let step=0;step<8;step++) {
      await idle();
      if(await page.locator('#play').isEnabled())break;
      // Exercise the retained expiry path with the fixture server's clock.
      // Waiting for an independently sampled high crash point would make
      // responsive QA unbounded; a public UI click must never change it.
      if(game.family==='crash') {
        const rows=await harness.fixture.sql.unsafe('SELECT expires_at,status FROM sw_native_library.rounds WHERE game_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[game.id]);
        if(rows[0]?.status==='active')clockOffset=Math.max(clockOffset,Number(rows[0].expires_at)-Date.now()+1);
        await page.locator('#refresh').click();await idle();
        assert.equal(await page.locator('#play').isEnabled(),true,game.id+' fixture deadline must settle through account refresh');
        break;
      }
      if(await page.locator('#collect').isVisible()&&await page.locator('#collect').isEnabled())await perform('#collect');
      else if(game.family==='mines'&&await page.locator('.m74-mine-cell:enabled').count())await perform('.m74-mine-cell:enabled >> nth=0');
      else if(await page.locator('#next').isVisible()&&await page.locator('#next').isEnabled())await perform('#next');
      else {
        await page.waitForFunction(()=>!document.getElementById('play').disabled||!document.getElementById('collect').disabled);
      }
    }
    await idle();
    assert.equal(await page.locator('#play').isEnabled(),true,game.id+' did not reach a settled result');
    const rows=await harness.fixture.sql.unsafe('SELECT id,status,total_stake::text,state FROM sw_native_library.rounds WHERE game_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[game.id]);
    assert.equal(rows[0]?.status,'settled',game.id+' stored round must be settled');
    const state=typeof rows[0].state==='string'?JSON.parse(rows[0].state):rows[0].state;
    return {roundId:rows[0].id,status:rows[0].status,stakeMinor:rows[0].total_stake,payoutMinor:state.payoutMinor};
  }
  async function layout(game,width) {
    await page.setViewportSize({width,height:width===1280?900:844});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const geometry=await page.evaluate(()=>{
      const body=document.documentElement,stage=document.getElementById('stage'),machine=stage.querySelector('.m74-machine'),board=stage.querySelector('.m74-reels');
      const rect=machine.getBoundingClientRect();
      return {width:innerWidth,documentWidth:body.scrollWidth,stageWidth:stage.clientWidth,stageScrollWidth:stage.scrollWidth,
        machineWidth:rect.width,rows:board?Number(board.dataset.rows):null,columns:board?Number(board.dataset.columns):null,
        symbols:stage.querySelectorAll('.m74-symbol').length,buckets:stage.querySelectorAll('[data-bucket]').length,
        visibleActionHeights:[...document.querySelectorAll('.actions button')].filter(el=>!el.hidden).map(el=>el.getBoundingClientRect().height)};
    });
    assert.ok(geometry.documentWidth<=width+1,game.id+' horizontal document overflow at '+width+': '+JSON.stringify(geometry));
    assert.ok(geometry.stageScrollWidth<=geometry.stageWidth+1,game.id+' stage overflow at '+width);
    assert.ok(geometry.machineWidth<=geometry.stageWidth+1,game.id+' machine exceeds its stage at '+width);
    assert.ok(geometry.visibleActionHeights.every(height=>height>=42),game.id+' action tap target too small at '+width);
    if(game.family==='slots'){
      assert.equal(geometry.rows,game.layout?.rows??game.rows);assert.equal(geometry.columns,game.layout?.columns??game.cols);
      assert.equal(geometry.symbols,geometry.rows*geometry.columns);
    }
    if(game.family==='plinko')assert.equal(geometry.buckets,game.rows+1);
    return geometry;
  }
  async function rulesAndHistory(game) {
    const before=harness.metrics.actions;
    await page.locator('#rules').click();
    assert.equal(await page.locator('#rules-dialog').isVisible(),true);
    assert.ok((await page.locator('#rules-body').innerText()).length>40);
    await page.locator('#close-rules').click();
    await page.locator('.history summary').click();
    await page.waitForFunction(()=>document.querySelectorAll('#history li').length>0||document.getElementById('history-status').textContent.includes('lama helin'));
    assert.ok(await page.locator('#history li').count()>0,game.id+' history should include its UI round');
    await page.locator('.history summary').click();
    assert.equal(harness.metrics.actions,before,'rules/history must not create game actions');
  }
  async function screenshot(name) {
    const path=join(artifacts,name+'.png');await page.screenshot({path,fullPage:true});report.screenshots.push('work/machine74-browser/'+name+'.png');
  }

  await page.goto(harness.base+'/independent74/machines74.html',{waitUntil:'networkidle'});
  await idle();
  assert.equal(await page.locator('#game-select option').count(),72);
  const optionIds=await page.locator('#game-select option').evaluateAll(nodes=>nodes.map(node=>node.value));
  assert.equal(optionIds.includes('ind74_official_multihot5'),false);
  assert.equal(optionIds.includes('ind74_official_foxyhot20'),false);
  report.checks.push('catalogue has 72 enabled isolated definitions and excludes both retained games');
  await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
  await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
  report.checks.push('explicit sound gesture toggles mute state');

  const represented=new Set();
  for(const game of definitions) {
    await select(game);
    const startActions=harness.metrics.actions;
    const started=await perform('#play');
    if(!recoveredActive&&started.round.status==='active'&&['ladder','mines'].includes(game.family)) {
      assert.equal(started.round.status,'active');
      const actions=harness.metrics.actions,balance=started.current_balance??started.balance,id=started.round.round_id;
      const responsePromise=page.waitForResponse(response=>new URL(response.url()).pathname==='/independent74/account-api/state');
      await page.reload({waitUntil:'networkidle'});
      const recovered=await (await responsePromise).json();await idle();
      assert.equal(recovered.round.round_id,id);assert.equal(recovered.round.status,'active');
      assert.equal(recovered.current_balance??recovered.balance,balance);assert.equal(harness.metrics.actions,actions);
      await page.locator('#turbo').check();
      recoveredActive=true;
      report.checks.push('active interactive round reload restores the same round and balance without a new action');
    }
    const result=await settle(game),layouts=[];
    for(const width of widths)layouts.push(await layout(game,width));
    if(!represented.has(game.family)) {
      await page.setViewportSize({width:390,height:844});await rulesAndHistory(game);await screenshot(game.family+'-'+game.id.replace('ind74_official_',''));represented.add(game.family);
    }
    report.games.push({id:game.id,title:game.catalogName||game.title,family:game.family,modelVersion:game.version,
      initialStatus:started.round.status,...result,actions:harness.metrics.actions-startActions,layouts});
    console.log(JSON.stringify({checked:report.games.length,total:72,game:game.id,status:result.status}));
  }
  assert.deepEqual([...represented].sort(),['crash','dice','ladder','plinko','slots','wheel']);

  // STOP must shorten the animation while preserving the one server result.
  const slot=definitions.find(game=>game.id==='ind74_official_multihot100');await select(slot);await page.locator('#turbo').uncheck();
  const stopBefore=harness.metrics.actions;
  const stopResponse=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/independent74/account-api/action');
  await page.locator('#play').click();const stopSnapshot=await (await stopResponse).json();
  await page.locator('#stop').waitFor({state:'visible'});await page.locator('#stop').click();await idle();
  assert.equal(harness.metrics.actions,stopBefore+1,'STOP must not send a financial or game action');
  assert.equal(await page.locator('#win').innerText(),((BigInt(stopSnapshot.round.payoutMinor??stopSnapshot.round.winMinor)/100n).toString()+'.'+String(BigInt(stopSnapshot.round.payoutMinor??stopSnapshot.round.winMinor)%100n).padStart(2,'0')));
  const displayed=await page.locator('.m74-symbol').evaluateAll(nodes=>nodes.map(node=>({row:Number(node.dataset.row),col:Number(node.dataset.col),symbol:node.dataset.symbol})));
  for(const cell of displayed)assert.equal(cell.symbol,stopSnapshot.round.outcome.grid[cell.row][cell.col]);
  report.checks.push('STOP produces no additional action and preserves the exact server grid and payout');
  await screenshot('multihot100-stop-final');

  // Reloading a settled round must restore its receipt rather than creating one.
  const reloadBefore=harness.metrics.actions,reloadBalance=await page.locator('#balance').innerText();
  await page.reload({waitUntil:'networkidle'});await idle();
  assert.equal(harness.metrics.actions,reloadBefore);assert.equal(await page.locator('#balance').innerText(),reloadBalance);
  assert.equal(await page.locator('.m74-symbol').count(),20);report.checks.push('settled reload preserves balance and four-row grid');

  // Exercise held-win choices through the outer UI where the definition offers them.
  const heldGames=definitions.filter(game=>game.gamble?.enabled);
  for(const game of heldGames) {
    await select(game);
    const hold=page.locator('[data-option="holdWin"]');assert.equal(await hold.count(),1);await hold.check();
    // Select a deterministic winning fixture seed before the UI start. This
    // covers the held-win controls without making their verification depend
    // on an arbitrary number of random losing wagers. No production input
    // accepts this seed and no simulation is counted as an official round.
    const nextId='00000000-0000-4000-8000-'+(sequence+1).toString(16).padStart(12,'0');
    const model=harness.fixture.service.registry.get(game.id);let chosenSeed=null;
    for(let index=1;index<=2000;index++) {
      const seed=index.toString(16).padStart(64,'0');
      const result=model.adapter.start(game.id,{stakeMinor:'100',holdWin:true},seededRandom(seed,nextId+':0'),Date.now()+clockOffset);
      if(result.state.status==='active'){chosenSeed=seed;break;}
    }
    assert.ok(chosenSeed,game.id+' deterministic held-win fixture is unavailable');
    harness.fixture.service.seed=()=>chosenSeed;
    const held=await perform('#play');assert.equal(held.round.status,'active');
    assert.match(await page.locator('.m74-pending-win').innerText(),/WIN TO COLLECT/);
    const debitsBefore=(await harness.fixture.sql.unsafe("SELECT COUNT(*)::int AS count FROM sw_rebuild.transfers WHERE sender=$1 AND kind='casino_bet'",[harness.fixture.fixtureUserId]))[0].count;
    const gambled=await perform('#gamble-red');
    const entry=gambled.round.gambleHistory.at(-1);
    assert.equal(entry.color,'red');assert.ok(['red','black'].includes(entry.revealedColor));
    assert.equal(await page.locator('.m74-card').last().getAttribute('aria-label'),'Revealed '+entry.revealedColor+' card');
    if(gambled.round.status==='active')await perform('#collect');
    await settle(game);
    const debitsAfter=(await harness.fixture.sql.unsafe("SELECT COUNT(*)::int AS count FROM sw_rebuild.transfers WHERE sender=$1 AND kind='casino_bet'",[harness.fixture.fixtureUserId]))[0].count;
    assert.equal(debitsAfter,debitsBefore,'gamble/collect must not debit a second stake');
    report.checks.push(game.id+' held win → red/black result → settlement uses one original stake');
  }

  const instant=definitions.find(game=>game.family==='dice');await select(instant);await page.locator('#turbo').check();
  const autoBefore=harness.metrics.actions;await page.locator('#auto').click();
  await page.waitForFunction(()=>document.getElementById('auto').textContent==='AUTO · 5'&&!document.getElementById('auto').disabled,null,{timeout:20000});
  assert.equal(harness.metrics.actions,autoBefore+5);report.checks.push('AUTO runs its explicit five UI rounds and stops');

  // Authentication failure remains read-only and prevents play.
  await context.clearCookies();await page.reload({waitUntil:'networkidle'});
  await page.locator('#login').waitFor({state:'visible'});
  assert.equal(await page.locator('#play').isEnabled(),false);report.checks.push('unauthenticated UI shows login and disables play');

  const finalWallets=(await harness.fixture.sql.unsafe('SELECT SUM(balance)::text AS total FROM sw_rebuild.wallets'))[0].total;
  assert.equal(finalWallets,initialWallets,'all fixture wallet balances must conserve value');
  assert.equal((await harness.fixture.sql.unsafe("SELECT COUNT(*)::int AS count FROM sw_native_library.rounds WHERE status='active'"))[0].count,0);
  assert.equal((await harness.fixture.sql.unsafe('SELECT COUNT(*)::int AS count FROM sw_rebuild.wallets WHERE balance<0'))[0].count,0);
  assert.equal((await harness.fixture.sql.unsafe('SELECT transfer_id FROM sw_rebuild.ledger GROUP BY transfer_id HAVING SUM(delta)<>0')).length,0);
  report.checks.push('all UI rounds settled; fixture wallets conserve total value; transfer ledger balances');
  assert.equal(report.blockedRequests.length,0,'app attempted an external request');
  assert.deepEqual(report.pageErrors,[],'browser page errors occurred');
  report.totals={games:report.games.length,viewports:widths,layoutChecks:report.games.reduce((sum,game)=>sum+game.layouts.length,0),
    actions:harness.metrics.actions,states:harness.metrics.states,history:harness.metrics.history,settledFamilies:represented.size};
  report.pass=true;
  await writeFile(join(directory,'tests','machine74-browser-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({pass:true,...report.totals,report:'tests/machine74-browser-report.json'}));
} catch(error) {
  report.failure={game:currentGame,message:error.message,stack:error.stack};
  if(page){try{report.failure.ui=await page.locator('body').innerText();await page.screenshot({path:join(artifacts,'failure.png'),fullPage:true});}catch{}}
  await writeFile(join(artifacts,'failure-report.json'),JSON.stringify(report,null,2)+'\n');
  console.error(JSON.stringify({pass:false,game:currentGame,message:error.message,report:'work/machine74-browser/failure-report.json'}));
  process.exitCode=1;
} finally {
  await context?.close().catch(()=>{});await browser?.close().catch(()=>{});await harness?.close().catch(()=>{});
}
