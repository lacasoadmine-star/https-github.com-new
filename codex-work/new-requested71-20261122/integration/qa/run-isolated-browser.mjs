import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import sourceConfig from '../worker-assets.mjs';
import {createAdditiveWorker as sourceCreateAdditiveWorker} from '../worker.mjs';
import {loadCompactDeployment} from '../compact-deployment.mjs';

const compact=process.env.ZPLAY_COMPACT_MODULE_ROOT?await loadCompactDeployment(process.env.ZPLAY_COMPACT_MODULE_ROOT):null;
const config=compact?.config||sourceConfig;
const createAdditiveWorker=compact?.createAdditiveWorker||sourceCreateAdditiveWorker;

const require=createRequire(import.meta.url);
const runtimeModules=process.env.ZPLAY_QA_NODE_MODULES||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=require(require.resolve('playwright',{paths:runtimeModules?[runtimeModules]:undefined}));
const qa=process.env.ZPLAY_NEW71_QA_OUTPUT?pathToFileURL(resolve(process.env.ZPLAY_NEW71_QA_OUTPUT)+'/'):new URL('./',import.meta.url);
const fixture=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#050805;color:white;font-family:system-ui}main{padding:12px}.home-slot-heading{font-size:24px}.existing-row{display:flex;gap:8px}.old-card{width:80px;height:60px;background:#223344}header.existing{height:48px;padding:10px}</style></head><body><header class="existing">ZPLAY fixture</header><main class="player-main"><button id="zplay-live-shortcut">Existing shortcut</button><section id="sw-v116-games">Existing featured</section><div class="categories">Existing categories</div><button class="sw-player-hero">Existing banner</button><div class="deposit-actions">Existing actions</div><div class="rebrand-race">Existing promotion</div><div class="home-slot-heading">Slots</div><div class="game-grid existing-row"><div class="old-card" data-old="one">Existing1</div><div class="old-card" data-old="two">Existing2</div></div><section class="native-lobby">Existing native row</section><section id="portal-r9-gallery" class="portal-r9-gallery"><div id="zplay-live-catalog">Existing catalogue</div></section></main></body></html>`;

class FixtureRewriter {
  on(selector,handler){this.selector=selector;this.handler=handler;return this;}
  async transform(response){
    let addition='';this.handler.element({append(html){addition+=html;}});
    const source=await response.text();
    return new Response(source.replace('</head>',addition+'</head>'),{status:response.status,headers:response.headers});
  }
}

test('360/390/430 and desktop: NEW mounts once; touch targets, preserved rows and all71 navigation work',{timeout:120000},async()=>{
  await mkdir(qa,{recursive:true});
  const requestLog=[],forbiddenRequests=[];
  const worker=createAdditiveWorker({fetch(){return new Response(fixture,{headers:{'Content-Type':'text/html'}});}},config,FixtureRewriter);
  const server=createServer(async(req,res)=>{
    try{
      requestLog.push({method:req.method,path:new URL(req.url,'http://fixture').pathname});
      const response=await worker.fetch(new Request(`http://127.0.0.1:${server.address().port}${req.url}`,{method:req.method}));
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    }catch(error){res.writeHead(500);res.end(error.message);}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {browser=await chromium.launch({headless:true,...(process.env.ZPLAY_QA_CHROMIUM_PATH?{executablePath:process.env.ZPLAY_QA_CHROMIUM_PATH}:{})});}
  catch(error){await new Promise(resolve=>server.close(resolve));await writeFile(new URL('browser-report.json',qa),JSON.stringify({schema:'zplay/new71-catalogue-ui-qa/v1',passed:false,failure:error.message,reports:[],financialRequests:0},null,2)+'\n');throw error;}
  const origin=`http://127.0.0.1:${server.address().port}`;
  const reports=[];let failure=null;
  try{
    for(const width of [360,390,430,1280]){
      const height=width===1280?900:844;
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,hasTouch:width<600});
      page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(20000);
      await page.route('**/*',async route=>{
        const request=route.request(),url=new URL(request.url());
        const allowed=request.method()==='GET'&&url.origin===origin&&
          (['/','/favicon.ico','/new-games71/','/new-games71/catalogue.json'].includes(url.pathname)||url.pathname.startsWith('/_zplay/new71/'));
        if(!allowed){forbiddenRequests.push({method:request.method(),url:request.url()});await route.abort('blockedbyclient');return;}
        await route.continue();
      });
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(origin+'/');
      await page.locator('#zplay-requested71').waitFor();
      assert.equal(await page.locator('#zplay-requested71').count(),1);
      assert.equal(await page.locator('#zplay-requested71 .new71-card').count(),10);
      assert.equal(await page.locator('#zplay-requested71 .new71-action').count(),0);
      assert.equal(await page.locator('#zplay-requested71 .new71-preview').getAttribute('href'),'/new-games72/multi-hot-10/preview/');
      assert.equal(await page.locator('#zplay-requested71 img, #zplay-requested71 canvas, #zplay-requested71 video').count(),0);
      const position=await page.evaluate(()=>{
        const section=document.getElementById('zplay-requested71'),anchor=document.querySelector('main.player-main .home-slot-heading');
        return {correct:section.nextElementSibling===anchor,overflow:document.documentElement.scrollWidth>innerWidth,oldCount:document.querySelectorAll('[data-old]').length,oldWidth:document.querySelector('[data-old]').getBoundingClientRect().width,oldBackground:getComputedStyle(document.querySelector('[data-old]')).backgroundColor,children:[...document.querySelector('main').children].filter(el=>el.id!=='zplay-requested71').map(el=>el.outerHTML)};
      });
      assert(position.correct);assert(!position.overflow);assert.equal(position.oldCount,2);assert.equal(position.oldWidth,80);assert.equal(position.oldBackground,'rgb(34, 51, 68)');
      const controlBounds=[];
      for(const selector of ['.new71-preview','.new71-all']){
        const target=page.locator('#zplay-requested71 '+selector);await target.scrollIntoViewIfNeeded();
        const bounds=await target.evaluate(node=>{
          const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
          return {width:r.width,height:r.height,centerHit:node===hit||node.contains(hit),reachable:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight};
        });
        assert(bounds.width>=44&&bounds.height>=44&&bounds.centerHit&&bounds.reachable,JSON.stringify({selector,bounds}));controlBounds.push({selector,...bounds});
      }
      await page.evaluate(async revision=>{
        for(let i=0;i<3;i++)await import(`/_zplay/new71/${revision}/new-section.mjs?duplicate=${i}`);
        document.querySelector('.categories').append(document.createTextNode(' update'));
      },config.assetRevision);
      await page.waitForFunction(()=>document.querySelectorAll('#zplay-requested71').length===1);
      const after=await page.locator('[data-old]').count();assert.equal(after,2);
      await page.locator('#zplay-requested71').screenshot({path:fileURLToPath(new URL(`new71-section-${width}.png`,qa))});
      await page.evaluate(()=>{history.pushState({},'', '/profile');dispatchEvent(new PopStateEvent('popstate'));});
      await page.waitForFunction(()=>!document.getElementById('zplay-requested71'));
      await page.evaluate(()=>{history.pushState({},'', '/');dispatchEvent(new PopStateEvent('popstate'));});
      await page.locator('#zplay-requested71').waitFor();assert.equal(await page.locator('#zplay-requested71').count(),1);
      if(width<600)await page.locator('.new71-all').tap();else await page.locator('.new71-all').click();
      await page.waitForURL('**/new-games71/');
      assert.equal(await page.locator('.new71-card').count(),71);
      assert.equal(await page.locator('.new71-action').count(),0);
      assert.equal(await page.locator('.new71-card').last().innerText().then(text=>text.includes('Cube Nova 21')),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);
      reports.push({viewport:{width,height},dpr:2,topInsertion:true,duplicateImports:3,sectionCount:1,pendingPreviewCount:10,pendingFullCount:71,playLinks:0,visualPreviewLinks:1,borrowedImages:0,oldRowsIntact:true,horizontalOverflow:false,routeExitReturn:true,controlBounds,pageErrors:errors});
      await page.close();
    }
    assert(requestLog.every(request=>request.method==='GET'));
    assert(!requestLog.some(request=>/wallet|spin|round|auth|deposit/.test(request.path)));
    assert.deepEqual(forbiddenRequests,[]);
  }catch(error){failure=error.stack||String(error);throw error;}
  finally{
    await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    await writeFile(new URL('browser-report.json',qa),JSON.stringify({schema:'zplay/new71-catalogue-ui-qa/v1',testedAt:new Date().toISOString(),environment:'isolated local catalogue fixture; no official gameplay or production spin tested',passed:failure===null&&reports.length===4,failure,reports,forbiddenRequests,financialRequests:requestLog.filter(request=>request.path.startsWith('/api/')).length,sourceCommit:process.env.GITHUB_SHA||null,assetRevision:config.assetRevision,deploymentFormat:compact?'compact':'source',deploymentModules:compact?.report.modules||null},null,2)+'\n');
  }
});
