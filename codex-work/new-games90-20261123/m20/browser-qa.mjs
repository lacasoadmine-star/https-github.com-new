import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';

const sourceRoot=resolve(new URL('.',import.meta.url).pathname);
const output=resolve(process.env.ZPLAY_M20_QA_OUTPUT||'');
assert(process.env.ZPLAY_M20_QA_OUTPUT,'Set ZPLAY_M20_QA_OUTPUT to a scratch directory');
assert(!output.startsWith(resolve(sourceRoot,'../../..')+'/'),'Keep browser captures outside the repository');
const require=createRequire(import.meta.url),modules=process.env.ZPLAY_QA_NODE_MODULES||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=require(require.resolve('playwright',{paths:modules?[modules]:undefined}));
const fixture=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/m20/style.css"><style>body{margin:0;background:#000}</style></head><body><main id="game"></main><script type="module">
import {mountMultiHot20} from '/m20/main.mjs';
const grid=[['bell','bell','watermelon','lemon','bell'],['bell','orange','bell','bell','watermelon'],['seven','orange','bell','bell','watermelon']];
const state={calls:[],accepted:new Map(),dropNext:false};
const background=document.createElement('canvas');background.width=1363;background.height=766;
const transport={canPlay:true,currency:'ETB',async submit(intent){state.calls.push({kind:'submit',intent:structuredClone(intent)});let reply;
if(intent.action==='SPIN')reply={gameId:intent.gameId,requestKey:intent.requestKey,roundId:'synthetic-browser-round-'+state.calls.length,bet:intent.bet,grid,multiplier:5,winAmount:'6.00',balance:'99.80'};
else reply={...intent,collected:true,amount:'6.00',balance:'105.80'};
state.accepted.set(intent.requestKey,reply);if(state.dropNext){state.dropNext=false;throw Error('synthetic accepted reply lost');}return reply;},
async recover(intent){state.calls.push({kind:'recover',intent:structuredClone(intent)});return state.accepted.get(intent.requestKey);}};
const game=mountMultiHot20({root:document.getElementById('game'),assets:{atlas:{draw(){}},background},transport});
game.controls.setBalance('100.00');window.fixture={state,game};
</script></body></html>`;
const requests=[],blocked=[],reports=[];let browser,failure;
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://fixture');requests.push({method:req.method,path:url.pathname});
  try{
    if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(fixture);return;}
    if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
    const path=resolve(sourceRoot,'.'+url.pathname.replace(/^\/m20/,''));
    if(!url.pathname.startsWith('/m20/')||!path.startsWith(sourceRoot+'/'))throw Error('Unknown fixture route');
    res.writeHead(200,{'Content-Type':extname(path)==='.css'?'text/css':'text/javascript'});res.end(await readFile(path));
  }catch(error){res.writeHead(404);res.end(error.message);}
});
await mkdir(output,{recursive:true});await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`;
try{
  browser=await chromium.launch({headless:true,...(process.env.ZPLAY_QA_CHROMIUM_PATH?{executablePath:process.env.ZPLAY_QA_CHROMIUM_PATH}:{})});
  for(const width of [360,390,430,1280]){
    const context=await browser.newContext({viewport:{width,height:width===1280?900:844},deviceScaleFactor:2,hasTouch:width<700});
    const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());
      if(request.method()!=='GET'||url.origin!==origin){blocked.push({method:request.method(),url:request.url()});await route.abort();}else await route.continue();});
    await page.goto(origin+'/');await page.waitForFunction(()=>!!window.fixture);
    const auto=page.getByRole('button',{name:'Autoplay',exact:true});await auto.click();
    await page.locator('[data-auto-count]').selectOption('25');
    for(const label of ['If a win reaches or exceeds','If balance decreases','If balance increases'])assert(await page.getByText(label,{exact:true}).isVisible());
    const win=page.getByLabel('If a win reaches or exceeds amount',{exact:true});
    assert.equal(await win.isEnabled(),false);await page.getByRole('checkbox',{name:'Enable if a win reaches or exceeds',exact:true}).check();
    await win.fill('6');await page.getByRole('button',{name:'Start',exact:true}).click();
    await page.waitForFunction(()=>window.fixture.game.snapshot().phase==='WIN_PENDING'&&!window.fixture.game.snapshot().auto.active);
    assert.equal(await page.evaluate(()=>window.fixture.state.calls.length),1);
    assert.equal(await page.evaluate(()=>window.fixture.game.snapshot().auto.winLimit),600);
    assert.equal(await page.evaluate(()=>window.fixture.game.snapshot().auto.remaining),24);
    await page.getByRole('button',{name:'Take win',exact:true}).click();await page.waitForFunction(()=>window.fixture.game.snapshot().phase==='READY');
    assert.equal(await page.evaluate(()=>window.fixture.game.snapshot().balance),'105.80');
    await auto.click();assert.equal(await win.inputValue(),'6.00');
    await page.getByRole('checkbox',{name:'Enable if balance decreases',exact:true}).check();
    await page.getByLabel('If balance decreases amount',{exact:true}).fill('');await page.getByRole('button',{name:'Start',exact:true}).click();
    assert(await page.getByRole('dialog').isVisible());assert.equal(await page.evaluate(()=>window.fixture.state.calls.length),2);
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.evaluate(()=>{window.fixture.state.dropNext=true;});
    await page.getByRole('button',{name:'HOLD & SPIN',exact:true}).click();
    await page.getByRole('button',{name:'Recover current round',exact:true}).waitFor();
    const original=await page.evaluate(()=>window.fixture.state.calls.at(-1).intent);
    await page.getByRole('button',{name:'Recover current round',exact:true}).click();
    await page.waitForFunction(()=>window.fixture.game.snapshot().phase==='WIN_PENDING');
    assert.deepEqual(await page.evaluate(()=>window.fixture.state.calls.at(-1).intent),original);
    assert.equal(await page.evaluate(()=>window.fixture.state.calls.at(-1).kind),'recover');
    assert.equal(await page.evaluate(()=>window.fixture.state.calls.length),4);
    assert.equal(await page.locator('.m20-status').innerText(),'');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:resolve(output,`m20-controls-${width}.png`)});
    reports.push({width,dpr:2,allAutoConditionsBound:true,winLimitStoppedAtExactBoundary:true,autoRetainedOnReopen:true,
      invalidEnabledLimitPreventedStart:true,originalSpinKeyRecovered:true,takeUpdatedOnlyHostBalance:true,
      syntheticSubmits:3,syntheticRecoveries:1,pageErrors:errors,financialNetworkRequests:0});
    await context.close();
  }
  assert.deepEqual(blocked,[]);assert(requests.every(item=>item.method==='GET'));
}catch(error){failure=error.stack||String(error);throw error;}
finally{
  if(browser)await browser.close();server.closeAllConnections();await new Promise(done=>server.close(done));
  const files=['main.mjs','auto-options.mjs','controls.mjs','controller.mjs','style.css'];
  const sourceFiles=await Promise.all(files.map(async path=>({path,sha256:createHash('sha256').update(await readFile(resolve(sourceRoot,path))).digest('hex')})));
  await writeFile(resolve(output,'browser-report.json'),JSON.stringify({schema:'zplay/m20-mounted-controls-qa/v1',testedAtUtc:new Date().toISOString(),
    scope:'Actual mounted M20 DOM/controller/renderer with blank synthetic Canvas assets and an in-memory receipt fixture. No provider artwork/audio parity or production endpoint/ledger verification.',
    passed:!failure&&reports.length===4,failure,sourceFiles,reports,blocked,productionRequests:0,cashEnabled:false},null,2)+'\n');
}
