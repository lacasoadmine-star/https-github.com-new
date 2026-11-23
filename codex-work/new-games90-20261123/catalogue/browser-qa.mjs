import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadDeployment} from './build.mjs';
import {REQUESTED_NAMES} from './requested.mjs';

assert(process.env.ZPLAY_NEW90_BUILD_ROOT,'Use the exact built deployment with ZPLAY_NEW90_BUILD_ROOT');
assert(process.env.ZPLAY_NEW90_QA_OUTPUT,'Set ZPLAY_NEW90_QA_OUTPUT to a scratch directory outside the repository');
const build=await loadDeployment(process.env.ZPLAY_NEW90_BUILD_ROOT);
const output=resolve(process.env.ZPLAY_NEW90_QA_OUTPUT);
const repository=resolve(new URL('../../..',import.meta.url).pathname);
assert(output!==repository&&!output.startsWith(repository+'/'),'Keep QA captures outside the repository');
const require=createRequire(import.meta.url);
const runtimeModules=process.env.ZPLAY_QA_NODE_MODULES||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=require(require.resolve('playwright',{paths:runtimeModules?[runtimeModules]:undefined}));
const selector='body .player-main:has(#sw-v116-games) > :not(#sw-v116-games):not(#sw-internal-games)';
const legacyHideRule=selector+'{display:none!important}';
const fixture=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#050805;color:white;font-family:system-ui}main{padding:12px}.home-slot-heading{font-size:24px}.existing-row{display:flex;gap:8px}.old-card{width:80px;height:60px;background:#223344}header.existing{height:48px;padding:10px}</style><style data-legacy-presentation>${legacyHideRule}</style><link rel="stylesheet" data-zplay-new71-style href="/legacy71.css"><script type="module" id="zplay-new71-loader" src="/legacy71-loader.mjs"></script></head><body><header class="existing">ZPLAY isolated fixture</header><main class="player-main"><button id="zplay-live-shortcut">Existing shortcut</button><section id="sw-v116-games">Existing featured</section><div class="categories">Existing categories</div><button class="sw-player-hero">Existing banner</button><div class="deposit-actions">Existing actions</div><div class="rebrand-race">Existing promotion</div><div class="home-slot-heading" style="display:block!important">Slots</div><div class="game-grid existing-row" style="display:flex!important"><div class="old-card" data-old="one">Existing1</div><div class="old-card" data-old="two">Existing2</div></div><section class="native-lobby">Existing native row</section><section id="portal-r9-gallery" class="portal-r9-gallery"><div id="zplay-live-catalog">Existing catalogue</div></section></main></body></html>`;

class FixtureRewriter {
  handlers=[];
  on(selector,handler){this.handlers.push([selector,handler]);return this;}
  async transform(response){
    let source=await response.text();
    for(const [selector,handler] of this.handlers){
      let removed=false,addition='';handler.element({remove(){removed=true;},append(html){addition+=html;}});
      if(selector==='script#zplay-new71-loader'&&removed)source=source.replace(/<script\b(?=[^>]*\bid="zplay-new71-loader")[^>]*>[\s\S]*?<\/script>/g,'');
      else if(selector==='link[data-zplay-new71-style]'&&removed)source=source.replace(/<link\b(?=[^>]*\bdata-zplay-new71-style)[^>]*>/g,'');
      else if(selector==='script#zplay-new90-loader'&&removed)source=source.replace(/<script\b(?=[^>]*\bid="zplay-new90-loader")[^>]*>[\s\S]*?<\/script>/g,'');
      else if(selector==='link[data-zplay-new90-style]'&&removed)source=source.replace(/<link\b(?=[^>]*\bdata-zplay-new90-style)[^>]*>/g,'');
      else if(selector==='#zplay-requested90'&&removed)source=source.replace(/<section\b(?=[^>]*\bid="zplay-requested90")[^>]*>[\s\S]*?<\/section>/g,'');
      else if(selector==='head')source=source.replace('</head>',addition+'</head>');
      else throw Error('Unexpected fixture HTMLRewriter selector: '+selector);
    }
    return new Response(source,{status:response.status,headers:response.headers});
  }
}

test('exact NEW90 artifact: mobile/desktop visible placement, search, preserved rows/auth and no financial requests',{timeout:150000},async()=>{
  await mkdir(output,{recursive:true});
  const requestLog=[],forbiddenRequests=[],reports=[];let failure=null,browser;
  const r1DecoratedFixture=fixture.replace('</head>','<link rel="stylesheet" data-zplay-new90-style href="/legacy90.css"><script type="module" id="zplay-new90-loader" src="/legacy90-loader.mjs"></script></head>')
    .replace('<div class="home-slot-heading"','<section id="zplay-requested90" data-zplay-new90="prior469"><p data-old90>Prior90 catalogue markup</p></section><div class="home-slot-heading"');
  const previous={fetch(request){
    const path=new URL(request.url).pathname;
    if(path==='/legacy71-loader.mjs')return new Response('window.legacy71Executed=true;',{headers:{'Content-Type':'text/javascript'}});
    if(path==='/legacy71.css')return new Response('body{}',{headers:{'Content-Type':'text/css'}});
    if(path==='/legacy90-loader.mjs')return new Response('window.legacy90Executed=true;',{headers:{'Content-Type':'text/javascript'}});
    if(path==='/legacy90.css')return new Response('body{}',{headers:{'Content-Type':'text/css'}});
    return new Response(r1DecoratedFixture,{headers:{'Content-Type':'text/html','Set-Cookie':'session=fixture-session-only; Path=/; HttpOnly; SameSite=Lax'}});
  }};
  const worker=build.createNew90Worker(previous,build.config,FixtureRewriter);
  const server=createServer(async(req,res)=>{
    try {
      const path=new URL(req.url,'http://fixture').pathname;
      requestLog.push({method:req.method,path,hasCookie:!!req.headers.cookie});
      const response=await worker.fetch(new Request(`http://127.0.0.1:${server.address().port}${req.url}`,{method:req.method,headers:req.headers}));
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    }catch(error){res.writeHead(500);res.end(error.message);}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try {
    browser=await chromium.launch({headless:true,...(process.env.ZPLAY_QA_CHROMIUM_PATH?{executablePath:process.env.ZPLAY_QA_CHROMIUM_PATH}:{})});
    for(const width of [360,390,430,1280]){
      const height=width===1280?900:844;
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,hasTouch:width<600});
      await context.addCookies([{name:'session',value:'fixture-session-only',url:origin,httpOnly:true,sameSite:'Lax'}]);
      await context.addInitScript(()=>{localStorage.setItem('fixture-token','fixture-token-only');sessionStorage.setItem('fixture-session','fixture-session-only');});
      const page=await context.newPage(),errors=[];
      page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(20000);
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',async route=>{
        const request=route.request(),url=new URL(request.url());
        const allowed=request.method()==='GET'&&url.origin===origin&&(['/', '/favicon.ico', '/new-games90/', '/new-games90/catalogue.json'].includes(url.pathname)||url.pathname.startsWith('/_zplay/new90/'));
        if(!allowed){forbiddenRequests.push({method:request.method(),url:request.url()});await route.abort('blockedbyclient');return;}
        await route.continue();
      });
      await page.goto(origin+'/');
      await page.locator('#zplay-requested90').waitFor();
      assert.equal(await page.locator('#zplay-requested90').count(),1);
      assert.equal(await page.locator('#zplay-requested90 .new90-card').count(),10);
      assert.equal(await page.locator('#zplay-requested90 .game-grid .game-card').count(),10);
      assert.equal(await page.locator('.new90-action').count(),0);
      assert.equal(await page.locator('#zplay-requested71').count(),0);
      assert.equal(await page.evaluate(()=>!!window.legacy71Executed),false);
      assert.equal(await page.evaluate(()=>!!window.legacy90Executed),false);
      assert.equal(await page.locator('script#zplay-new90-loader').count(),1);
      assert.equal(await page.locator('link[data-zplay-new90-style]').count(),1);
      assert.equal(await page.locator('[data-old90]').count(),0);
      assert.deepEqual(await page.locator('.new90-name').allTextContents(),REQUESTED_NAMES.slice(0,10));
      const position=await page.evaluate(({selector,fixture})=>{
        const section=document.getElementById('zplay-requested90'),anchor=document.querySelector('.home-slot-heading');
        const a=section.getBoundingClientRect(),b=anchor.getBoundingClientRect();
        const original=new DOMParser().parseFromString(fixture,'text/html');
        return {correct:section.nextElementSibling===anchor,display:getComputedStyle(section).display,visible:a.width>0&&a.height>0,above:a.bottom<=b.top+1&&b.height>0,
          broadRuleMatches:section.matches(selector),hiddenExisting:getComputedStyle(document.querySelector('.categories')).display,
          overflow:document.documentElement.scrollWidth>innerWidth,oldCount:document.querySelectorAll('[data-old]').length,
          oldWidth:document.querySelector('[data-old]').getBoundingClientRect().width,oldBackground:getComputedStyle(document.querySelector('[data-old]')).backgroundColor,
          originalChildren:[...original.querySelector('main').children].map(el=>el.outerHTML),
          currentChildren:[...document.querySelector('main').children].filter(el=>el.id!=='zplay-requested90').map(el=>el.outerHTML)};
      },{selector,fixture});
      assert(position.correct&&position.visible&&position.above&&position.broadRuleMatches);assert.equal(position.display,'block');
      assert.equal(position.hiddenExisting,'none');assert(!position.overflow);assert.equal(position.oldCount,2);
      assert.equal(position.oldWidth,80);assert.equal(position.oldBackground,'rgb(34, 51, 68)');assert.deepEqual(position.currentChildren,position.originalChildren);
      const controls=[];
      for(const control of ['.new90-preview','.new90-all']){
        const target=page.locator('#zplay-requested90 '+control).first();await target.scrollIntoViewIfNeeded();
        const box=await target.evaluate(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {width:r.width,height:r.height,hit:node===hit||node.contains(hit),reachable:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight};});
        assert(box.width>=44&&box.height>=44&&box.hit&&box.reachable,JSON.stringify({control,box}));controls.push({control,...box});
      }
      await page.evaluate(async({revision,rule})=>{
        for(let index=0;index<3;index++)await import(`/_zplay/new90/${revision}/client.mjs?duplicate=${index}`);
        const style=document.createElement('style');style.textContent=rule;document.head.append(style);
      },{revision:build.config.assetRevision,rule:legacyHideRule});
      assert.equal(await page.locator('#zplay-requested90').count(),1);assert(await page.locator('#zplay-requested90').isVisible());
      await page.locator('#zplay-requested90').screenshot({path:resolve(output,`new90-section-${width}.png`)});
      await page.evaluate(()=>{history.pushState({},'', '/profile');dispatchEvent(new PopStateEvent('popstate'));});
      await page.waitForFunction(()=>!document.getElementById('zplay-requested90'));
      await page.evaluate(()=>{history.pushState({},'', '/');dispatchEvent(new PopStateEvent('popstate'));});
      await page.locator('#zplay-requested90').waitFor();assert.equal(await page.locator('#zplay-requested90').count(),1);
      assert(await page.locator('#zplay-requested90').evaluate(el=>el.nextElementSibling?.classList.contains('home-slot-heading')));
      if(width<600)await page.locator('.new90-all').tap();else await page.locator('.new90-all').click();
      assert.equal(new URL(page.url()).pathname,'/','show all stays in the existing dashboard');
      const search=page.locator('#zplay-new90-search');await search.waitFor();
      assert.equal(await page.locator('.new90-card').count(),90);assert.equal(await page.locator('.new90-action').count(),0);
      assert.deepEqual(await page.locator('.new90-name').allTextContents(),REQUESTED_NAMES);
      assert.equal(await page.locator('[data-old]').count(),2);
      assert.equal(await page.locator('#zplay-requested90 .game-grid .game-card').count(),90);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      for(const [query,expected] of [['rouLETTE',6],['JetX',3],['Keno',4],['Multi Hot 5',2],['HabeshaFortune5',0],['',90]]){
        await search.fill(query);
        await page.waitForFunction(count=>document.querySelectorAll('.new90-card:not([hidden])').length===count,expected);
        assert.equal(await page.locator('.new90-result-count').innerText(),expected+' ciyaarood');
        assert.equal(await page.locator('.new90-count').innerText(),'90');
        assert.equal(await page.locator('.new90-summary').innerText(),'0 la furi karo · 90 dhisid ku jira');
      }
      const storage=await page.evaluate(()=>({token:localStorage.getItem('fixture-token'),session:sessionStorage.getItem('fixture-session')}));
      assert.deepEqual(storage,{token:'fixture-token-only',session:'fixture-session-only'});
      // Exercise a real native anchor on a synthetic released catalogue. This
      // validates touch/click navigation only and makes no live-game claim.
      const synthetic=structuredClone(build.config.catalogue),released=synthetic.games[1];
      released.playable=true;released.status='ready';released.route='/new-games72/multi-hot-5-super-wilds/';synthetic.readyCount=1;synthetic.launchableCount=1;
      const navigations=[];
      await page.route('**/new-games90/catalogue.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(synthetic)}));
      await page.route('**/new-games72/multi-hot-5-super-wilds/',route=>{
        navigations.push({method:route.request().method(),path:new URL(route.request().url()).pathname});
        return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Synthetic mounted game route</title><main data-synthetic-game>Mounted route fixture</main>'});
      });
      await page.goto(origin+'/');
      const play=page.locator('.new90-action');await play.waitFor();
      assert.equal(await play.count(),1);assert.equal(await play.getAttribute('href'),released.route);
      assert.equal(await play.getAttribute('aria-label'),'Play Multi Hot 5 Super Wilds');
      const playBox=await play.evaluate(node=>{const r=node.getBoundingClientRect();return {width:r.width,height:r.height};});
      assert(playBox.width>=44&&playBox.height>=44);
      if(width<600)await play.tap();else await play.click();
      await page.waitForURL('**/new-games72/multi-hot-5-super-wilds/');
      assert(await page.locator('[data-synthetic-game]').isVisible());
      assert.deepEqual(navigations,[{method:'GET',path:released.route}]);
      assert.deepEqual(errors,[]);
      reports.push({viewport:{width,height},dpr:2,exactOrder:true,lobbyCards:10,fullCards:90,readyGames:0,playLinks:0,
        visualPreviewLinks:build.config.catalogue.games.filter(game=>game.previewRoute).length,topInsertion:true,broadLegacyRuleMatched:true,lateLegacyStylesheet:true,
        preservedOldRows:true,routeExitReturn:true,duplicateImports:3,horizontalOverflow:false,searchCases:6,matchCountsAccurate:true,authStorageUnchanged:true,
        sameDashboardExpansion:true,ordinaryGameCardMarkup:true,syntheticReadyNavigation:{scope:'Synthetic release data, no financial play or live-game verification',passed:true,navigations,touch:width<600,playBox},
        legacyLoaderSuppressed:true,prior469New90LoaderReplaced:true,prior469SectionReplaced:true,controls,pageErrors:errors});
      await context.close();
    }
    assert(requestLog.every(request=>request.method==='GET'));
    assert(!requestLog.some(request=>/wallet|spin|round|auth|deposit/.test(request.path)));
    assert(!requestLog.some(request=>request.path.startsWith('/legacy71')));
    assert(!requestLog.some(request=>request.path.startsWith('/legacy90')));
    assert(requestLog.filter(request=>request.path==='/new-games90/catalogue.json').every(request=>!request.hasCookie));
    assert(requestLog.some(request=>request.path==='/'&&request.hasCookie));
    assert.deepEqual(forbiddenRequests,[]);
  }catch(error){failure=error.stack||String(error);throw error;}
  finally {
    if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    await writeFile(resolve(output,'browser-report.json'),JSON.stringify({schema:'zplay/new90-catalogue-ui-qa/v1',testedAt:new Date().toISOString(),
      environment:'isolated local catalogue fixture using exact generated deployment; no official gameplay or production round tested',passed:failure===null&&reports.length===4,
      failure,reports,forbiddenRequests,financialRequests:requestLog.filter(request=>request.path.startsWith('/api/')).length,sourceCommit:build.report.sourceCommit,
      assetRevision:build.config.assetRevision,deploymentModules:build.report.modules,publicCatalogueRequestsCarryNoCookies:requestLog.some(request=>request.path==='/new-games90/catalogue.json')&&requestLog.filter(request=>request.path==='/new-games90/catalogue.json').every(request=>!request.hasCookie)},null,2)+'\n');
  }
});
