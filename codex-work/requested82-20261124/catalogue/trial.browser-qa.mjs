import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {buildFirstPairRelease} from './trial-build.mjs';
import {trialResourcePath,renderTrialHead,TRIAL_PREFIX} from './trial-worker.mjs';

/** Read-only actual Player DOM verification. Only our three unpublished static
 * resources are fulfilled locally; every existing card/media/game/API stays live.
 * No sign-in, wager, generated account/funds or private capture is used.
 */
export async function verifyFirstPairLiveDOM({build,origin='https://superwin-player.apdiy61.workers.dev',output,playM100=true}={}){
  assert(build?.config&&output);await mkdir(output,{recursive:true});
  const {chromium}=createRequire(import.meta.url)('playwright'),root=new URL(origin).origin;
  const resources=new Map(build.records.map(record=>[trialResourcePath(build.config,record),record]));
  const report={schema:'zplay/first-pair-actual-player-dom/v1',origin:root,revision:build.report.revision,
    sourceCommit:build.report.sourceCommit,sourceCommitVerified:build.report.sourceCommitVerified,
    unpublishedStaticResourcesFulfilledLocally:true,existingPlayerDomAndGameRoutesLive:true,
    loginPerformed:false,financialActions:0,verifiedProductionSpinCount:0,completionClaim:false,liveVerified:false,m100GuestLaunchDeferred:!playM100,widths:[]};
  const browser=await chromium.launch({headless:true,executablePath:process.env.ZPLAY_QA_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
  async function install(page){
    await page.goto(root+'/',{waitUntil:'domcontentloaded',timeout:45000});
    await page.locator('#zplay-live-catalog [data-catalog-game="ind74_official_multihot5"]').waitFor();
    await page.evaluate(()=>{window[Symbol.for('zplay.requested82.first-pair.v1')]?.dispose?.();document.getElementById('zplay-requested82-pair-loader')?.remove();});
    const old=await page.locator('#zplay-live-catalog .restored-game-card[data-catalog-game]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.catalogGame,route:node.querySelector('a')?.getAttribute('href')??null})));
    await page.evaluate(head=>{
      const holder=document.createElement('template');holder.innerHTML=head;
      for(const node of holder.content.children){const element=document.createElement(node.tagName.toLowerCase());for(const attribute of node.attributes)element.setAttribute(attribute.name,attribute.value);document.head.append(element);}
    },renderTrialHead(build.config));
    await page.locator('[data-r82-pair-id]').first().waitFor();
    assert.equal(await page.locator('[data-r82-pair-id]').count(),2);
    const current=await page.locator('#zplay-live-catalog .restored-game-card[data-catalog-game]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.catalogGame,route:node.querySelector('a')?.getAttribute('href')??null})));
    assert.deepEqual(current,old.map(row=>({...row,route:row.id==='ind74_official_multihot100'?'/new-games72/multi-hot-100/':row.id==='ind74_official_multihot20'?'/new-games72/multi-hot-20/':row.route})));
    assert.equal(old.length,74);assert.equal(await page.locator('#zplay-requested90').count(),0);
    return old;
  }
  try{
    for(const width of [360,390,430,1280]){
      const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],financial=[],unauthorized=[];
      page.on('pageerror',error=>errors.push(error.name));page.on('request',request=>{const url=new URL(request.url());if(url.origin===root&&request.method()==='POST'&&/^\/api\/(?:remaining20\/action|slots\/(?:spin|gamble))$/.test(url.pathname))financial.push(url.pathname);});
      page.on('response',response=>{const url=new URL(response.url());if(url.origin===root&&response.status()===401&&/^\/api\/(?:remaining20\/state|slots\/fresh-state)$/.test(url.pathname))unauthorized.push(url.pathname);});
      await page.route(root+TRIAL_PREFIX+'**',async route=>{
        const record=resources.get(new URL(route.request().url()).pathname);
        if(!record){await route.abort();return;}await route.fulfill({status:200,contentType:record.contentType,headers:{'Cache-Control':'no-store'},body:record.source});
      });
      const old=await install(page);
      const order=await page.locator('#zplay-live-catalog .restored-catalog-grid>.restored-game-card').evaluateAll(nodes=>nodes.slice(0,6).map(n=>n.dataset.catalogGame||n.dataset.r82PairId));
      assert.deepEqual(order.slice(0,4),['ind74_official_habeshafortune5','ind74_official_multihot5','zplay72_multi_hot_100_v1','zplay72_multi_hot_20_v1']);
      for(const [index,game]of build.manifest.games.entries()){
        const detail=page.locator(`[data-r82-pair-details="${game.gameId}"]`);await detail.click();
        const sheet=page.locator('#zplay-requested82-pair-sheet');await sheet.waitFor({state:'visible'});
        assert.equal(await sheet.locator('[data-r82-pair-sheet-play]').getAttribute('href'),game.route);
        const playStyle=await sheet.locator('[data-r82-pair-sheet-play]').evaluate(node=>({background:getComputedStyle(node).backgroundColor,height:node.getBoundingClientRect().height,display:getComputedStyle(node).display}));
        assert.equal(playStyle.background,'rgb(22, 184, 93)');assert(playStyle.height>=48);assert.equal(playStyle.display,'flex');
        await sheet.locator('img').evaluate(image=>image.decode());assert.equal(await sheet.locator('img').evaluate(image=>image.naturalWidth>0),true);
        const size=await sheet.boundingBox();assert(size.width<=width&&size.x>=-1);if(width<600)assert(Math.abs(size.y+size.height-900)<=2,'mobile sheet sits at viewport bottom');
        if(index===0){await sheet.locator('[data-r82-pair-like]').click();assert.equal(await sheet.locator('[data-r82-pair-like]').getAttribute('aria-pressed'),'true');
          await sheet.locator('[data-r82-pair-favorite]').click();assert.equal(await sheet.locator('[data-r82-pair-favorite]').getAttribute('aria-pressed'),'true');
          if(width===390)await page.screenshot({path:resolve(output,'first-pair-390-preview.png')});
        }
        await page.keyboard.press('Escape');await sheet.waitFor({state:'hidden'});assert.equal(await detail.evaluate(node=>node===document.activeElement),true);
      }
      // Existing original-card handlers and their retained routes keep functioning.
      for(const [id,path]of [['ind74_official_multihot5','/games/multi_hot_5_native'],['ind74_official_foxyhot20','/games/foxy_hot_20_native']]){
        await page.locator(`#zplay-live-catalog button[data-game-details="${id}"]`).first().click();const sheet=page.locator('#zplay-game-detail-sheet');await sheet.waitFor({state:'visible'});
        assert.equal(await sheet.locator('.restored-sheet-play').getAttribute('href'),path);await page.keyboard.press('Escape');
      }
      await page.locator('#zplay-live-catalog [data-catalog-filter="favorites"]').click();
      assert.equal(await page.locator('[data-r82-pair-id]:visible').count(),1);
      await page.locator('#zplay-live-catalog [data-catalog-filter="all"]').click();
      await page.locator('#zplay-live-catalog .restored-catalog-search input').fill('Multi Hot 100');
      assert.equal(await page.locator('[data-r82-pair-id]:visible').count(),1);
      await page.locator('#zplay-live-catalog .restored-catalog-search input').fill('');
      assert.equal(await page.locator('[data-r82-pair-id]:visible').count(),2);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      // PLAY follows the actual installed same-origin game; guests retain its401 boundary.
      const launches=[];
      for(const game of build.manifest.games){
        if(!playM100&&game.gameId==='zplay72_multi_hot_100_v1')continue;
        if(new URL(page.url()).pathname!=='/')await install(page);
        await page.locator(`[data-r82-pair-details="${game.gameId}"]`).click();
        await Promise.all([page.waitForURL(url=>url.pathname===game.route,{waitUntil:'domcontentloaded',timeout:30000}),page.locator('#zplay-requested82-pair-sheet [data-r82-pair-sheet-play]').click()]);
        await page.waitForFunction(()=>/sign in/i.test(document.body.innerText),null,{timeout:25000});
        assert.equal(new URL(page.url()).pathname,game.route);launches.push({gameId:game.gameId,path:game.route,guestSignInObserved:true});
      }
      assert.deepEqual(financial,[]);report.widths.push({width,retainedOldCards:old.length,pairAdjacentToOriginal:true,phonePreview:true,
        likeAndFavorite:true,oldOriginalDialogsPreserved:true,filtersAndSearch:true,launches,account401Paths:[...new Set(unauthorized)],pageErrors:errors});
      await context.close();
    }
    await writeFile(resolve(output,'first-pair-browser-report.json'),JSON.stringify(report,null,2)+'\n');return report;
  }finally{await browser.close();}
}

if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname){
  const output=process.env.FIRST_PAIR_QA_OUTPUT;if(!output)throw Error('FIRST_PAIR_QA_OUTPUT_REQUIRED');
  const build=await buildFirstPairRelease({baseline:{versionId:'fb27da4c-d9ff-4e47-a726-51b21d445dd3',versionNumber:475,mainModule:'requested82m100r1/entry.mjs',moduleCount:431,totalBytes:66968315},
    sourceCommit:process.env.FIRST_PAIR_SOURCE_COMMIT||'bb32a1f96716a551dbc56e6ef5278d33cdb7a177',verifySourceCommit:false});
  console.log(JSON.stringify(await verifyFirstPairLiveDOM({build,output,origin:process.env.FIRST_PAIR_PLAYER_ORIGIN||'https://superwin-player.apdiy61.workers.dev',playM100:process.env.FIRST_PAIR_M100_READY!=='0'})));
}
