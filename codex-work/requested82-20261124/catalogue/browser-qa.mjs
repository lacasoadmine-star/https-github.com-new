import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {buildDeployment} from './build.mjs';
import {createRequested82Worker} from './worker.mjs';

// Isolated navigation fixture, with no account, wallet, generated round or production request.
// This checks the catalogue DOM only. It does not establish any released game's gameplay.
const {chromium}=createRequire(import.meta.url)('playwright');
const registry=JSON.parse(await readFile(new URL('registry.json',import.meta.url),'utf8'));
function descriptor(index){
  const game=structuredClone(registry.games[index]);
  return {...game,identityReservedOnly:false,
    reference:{identityStatus:'CATALOGUE_IDENTITY_VERIFIED',manualReferenceRounds:7,freshEvidenceManifestPath:'fixture-reference',rulesSource:'fixture-rules'},
    frontend:{route:game.route,implemented:true},backend:{enabled:true,mountedModuleSha256:'b'.repeat(64)},
    assets:{runtimeAssetsVerified:true,manifestSha256:'c'.repeat(64)},tests:{implemented:true,passed:true,financialIntegrationVerified:true},
    release:{ready:true,enabled:true,liveVerified:true,proof:{gameId:game.gameId,sourceCommit:'a'.repeat(40),workerVersion:'12345678-abcd-1234-abcd-123456789abc',evidenceSha256:'d'.repeat(64),verifiedAt:'2026-11-24T00:00:00Z',serverAuthoritative:true,controlsVerified:true,audioVerified:true,visualParityVerified:true,playwrightVerified:true,existingBackendConnected:true,liveGameplayVerified:true}}};
}
const builds=await Promise.all([[],[0,27,28,41,64,65,77]].map(indices=>buildDeployment({activeMainModule:'existing/entry.mjs',sourceCommit:'a'.repeat(40),releaseDescriptors:indices.map(descriptor)})));
let current=builds[0];
const originalRoot=()=>`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated retained lobby fixture</title></head><body><main class="player-main"><h2 class="home-slot-heading">Slots</h2><div id="old-game-row"><a class="old-game" href="/native/multihot5/">MultiHot5</a><a class="old-game" href="/native/foxyhot20/">FoxyHot20</a></div></main></body></html>`;
const previous={fetch(){return new Response(originalRoot(),{headers:{'Content-Type':'text/html'}});}};
const server=createServer(async(req,res)=>{
  try{
    const origin='http://127.0.0.1:'+server.address().port,path=new URL(req.url,origin).pathname;
    // Fixture HTML simulates the HTMLRewriter's head injection for browser DOM assertions.
    if(path==='/'){
      const root='/_zplay/requested82/'+current.config.assetRevision+'/';
      const html=current.config.catalogue.readyCount ? originalRoot().replace('</head>',`<link rel="stylesheet" href="${root}styles.css"><script type="module" src="${root}client.mjs"></script></head>`) : originalRoot();
      res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;
    }
    const response=await createRequested82Worker(previous,current.config).fetch(new Request(new URL(req.url,origin),{method:req.method}));
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.writeHead(500);res.end('Fixture error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
const report={schema:'zplay/requested82-browser-fixture/v1',fixtureOnly:true,productionRequests:0,gameplayVerified:false,completedGames:0,widths:[]};
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.ZPLAY_QA_CHROMIUM || '/usr/bin/chromium',args:['--no-sandbox']});
  const origin='http://127.0.0.1:'+server.address().port;
  for(const width of [360,390,430,1280]){
    const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.name));
    current=builds[0];await page.goto(origin+'/');
    assert.equal(await page.locator('.old-game').count(),2);assert.equal(await page.locator('#zplay-requested82').count(),0);
    assert.equal(await page.locator('script[type=module]').count(),0);
    current=builds[1];await page.goto(origin+'/');await page.locator('#zplay-requested82').waitFor();
    assert.equal(await page.locator('.requested82-card').count(),7);assert.equal(await page.locator('.requested82-play').count(),7);
    assert.equal(await page.locator('.old-game').count(),2);assert.equal(await page.locator('.old-game').first().getAttribute('href'),'/native/multihot5/');
    assert.equal(await page.locator('.requested82-pending,.requested82-preview').count(),0);
    assert.equal(await page.evaluate(()=>document.getElementById('zplay-requested82').nextElementSibling.classList.contains('home-slot-heading')),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const sizes=await page.locator('.requested82-play').evaluateAll(links=>links.map(link=>({width:link.getBoundingClientRect().width,height:link.getBoundingClientRect().height})));
    assert(sizes.every(size=>size.height>=44 && size.width>=44));
    await page.goto(origin+'/new-games82/');await page.locator('#requested82-search').waitFor();
    for(const [query,count] of [['jetx',2],['JetX3',1],['Multi Fruits',1],['CricketX',1],['Classic',1],['does-not-exist',0],['',7]]){
      await page.locator('#requested82-search').fill(query);assert.equal(await page.locator('.requested82-card:visible').count(),count);
      assert.equal(await page.locator('.requested82-result-count').textContent(),count+' ciyaarood');
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);report.widths.push({width,zeroReleasePreservesOldCards:true,qualifiedCardsOnly:true,searchCases:7,noOverflow:true});
    await context.close();
  }
  console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
