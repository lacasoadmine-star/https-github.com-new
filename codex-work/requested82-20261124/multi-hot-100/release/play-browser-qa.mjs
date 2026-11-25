import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadM100Release} from './build.mjs';
import {createM100ReleaseWorker,GAME_PATH} from './worker.mjs';
import {createM100NativeFixture} from '../host/test-support.mjs';
import {M100_STATE_PATH,M100_ACTION_PATH} from '../host/transport.mjs';

/** Exact immutable app/media and production CSP, on a disposable HTTP host.
 * All balances/financial actions are fixture-only. No production requests. */
export async function verifyM100PlayArtifact(directory,{widths=[360,390,430,1280],verifyPhoneWinLayout=false,expectedAudioCount=null}={}){
 const build=await loadM100Release(directory),{chromium}=createRequire(import.meta.url)('playwright');
 const records=new Map(build.records.map(record=>[record.key,record])),kvReads=[],wireErrors=[],blockedExternal=[];
 let fixture=createM100NativeFixture();
 const env={SSG_OFFICIAL_REFERENCES:{get(key){kvReads.push(key);const record=records.get(key);return record?.data.buffer.slice(record.data.byteOffset,record.data.byteOffset+record.data.byteLength);}}};
 const previous={async fetch(request){const url=new URL(request.url);
  if(url.pathname===M100_STATE_PATH.split('?')[0]||url.pathname===M100_ACTION_PATH){
   try{return await fixture.fetcher(url.pathname+url.search,{method:request.method,credentials:'same-origin',cache:'no-store',redirect:'error',
    headers:{'X-Zplay-Library-Session':request.headers.get('X-Zplay-Library-Session')},...(request.method==='POST'?{body:await request.text()}:{})});}
   catch(error){wireErrors.push(error.message);return Response.json({error:'ISOLATED_FIXTURE_WIRE_ERROR'},{status:500});}
  }return new Response('isolated retained host',{status:404});
 }};
 const worker=createM100ReleaseWorker(previous,{...build.config,enabled:true});
 const server=createServer(async(req,res)=>{try{
  let body='';for await(const chunk of req)body+=chunk;
  const request=new Request('http://127.0.0.1:'+server.address().port+req.url,{method:req.method,headers:req.headers,...(body?{body}:{})});
  const response=await worker.fetch(request,env,{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){wireErrors.push(error.message);res.writeHead(500);res.end('Isolated verification host error');}});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port;
 const report={schema:'zplay/m100-compiled-play-browser/v1',testedAt:new Date().toISOString(),revision:build.config.revision,sourceCommit:build.report.sourceCommit,
  sourceCommitVerified:build.report.sourceCommitVerified,artifactHashVerified:true,productionCspApplied:true,fixtureHost:true,
  productionRequests:0,productionFinancialActions:0,liveVerified:false,widths:[]};
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.ZPLAY_QA_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
  for(const width of widths){
   fixture=createM100NativeFixture();
   const context=await browser.newContext({viewport:{width,height:width<700?844:900},deviceScaleFactor:2,hasTouch:width<700}),page=await context.newPage(),pageErrors=[],consoleErrors=[];
   page.setDefaultTimeout(20000);
   page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text().slice(0,300));});
   await page.addInitScript(()=>{globalThis.m100CompiledCsp=[];document.addEventListener('securitypolicyviolation',event=>globalThis.m100CompiledCsp.push({directive:event.violatedDirective,blocked:event.blockedURI}));});
   await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===origin||['data:','blob:'].includes(url.protocol))return route.continue();blockedExternal.push(url.origin);return route.abort();});
   const beforeReads=kvReads.length,response=await page.goto(origin+GAME_PATH,{waitUntil:'networkidle'});
   assert.equal(response.status(),200);assert.ok(response.headers()['content-security-policy']?.includes("style-src 'self'"));
   await page.getByRole('button',{name:'Play muted',exact:true}).waitFor();assert.equal(fixture.posts,0);
   await page.getByRole('button',{name:'Play muted',exact:true}).click();await page.locator('canvas.m100-canvas').waitFor({state:'visible'});
   await page.getByRole('button',{name:'HOLD & SPIN',exact:true}).waitFor();
   assert.equal(await page.locator('[data-value=balance]').innerText(),'100.00');
   const idle=await page.locator('canvas.m100-canvas').evaluate(canvas=>{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();for(let i=0;i<data.length;i+=64)if(data[i+3])colors.add(data[i]+','+data[i+1]+','+data[i+2]);return{width:canvas.width,height:canvas.height,colors:colors.size};});
   assert.ok(idle.colors>100,'native cabinet must render actual varied artwork');
   await page.getByRole('button',{name:'HOLD & SPIN',exact:true}).click();await page.getByRole('button',{name:'STOP',exact:true}).click();
   await page.getByRole('button',{name:'Take win',exact:true}).waitFor({state:'visible'});
   await page.waitForFunction(()=>document.querySelector('[data-action=take]')?.disabled===false);
   assert.equal(fixture.draws,1);assert.equal(fixture.posts,1);assert.equal(await page.locator('[data-value=balance]').innerText(),'99.00');assert.equal(await page.locator('[data-value=win]').innerText(),'12.60');
   const winGeometry=await page.evaluate(()=>{const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};const game=document.querySelector('.m100-game'),style=getComputedStyle(game),winStyle=getComputedStyle(document.querySelector('.m100-readout>div:nth-child(2)'));return{viewport:innerWidth,game:box('.m100-game'),canvas:box('.m100-canvas'),win:box('.m100-readout>div:nth-child(2)'),take:box('[data-action=take]'),double:box('[data-action=double]'),reelsBottomPercent:parseFloat(style.getPropertyValue('--m100-reels-bottom')),winClipPath:winStyle.clipPath,overflow:document.documentElement.scrollWidth>innerWidth};});
   assert.equal(winGeometry.overflow,false);
   if(verifyPhoneWinLayout&&width<700){
    const {game,win,take,double}=winGeometry,reelsBottom=game.y+game.height*winGeometry.reelsBottomPercent/100;
    assert.ok(Number.isFinite(reelsBottom));assert.ok(Math.abs(win.y-reelsBottom-3)<=1,'WIN must sit3px below actual reels');assert.ok(Math.abs(win.height-34)<=1);assert.ok(winGeometry.winClipPath.startsWith('polygon('));
    assert.ok(Math.abs((double.x+double.width/2)-(game.x+game.width*.089))<=1);assert.ok(Math.abs((take.x+take.width/2)-(game.x+game.width*.911))<=1);
    assert.ok(Math.abs(double.y-(game.y+game.height*.823))<=1);assert.ok(Math.abs(take.y-double.y)<=1);assert.ok(double.width>=44&&double.height>=44&&take.width>=44&&take.height>=44);
    assert.ok(double.x>=0&&take.x+take.width<=width+1);
   }
   await page.screenshot({path:resolve(directory,`m100-compiled-win-${width}.png`)});
   await page.getByRole('button',{name:'Take win',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('[data-value=balance]')?.textContent==='111.60');
   assert.equal(fixture.draws,1);assert.equal(fixture.posts,2);assert.equal(fixture.state.balance,'111.60');
   await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('tab',{name:'Settings',exact:true}).click();
   const dialog=page.getByRole('dialog',{name:'Game information',exact:true});
   const sound=dialog.getByRole('checkbox',{name:'Sound Effects',exact:true}),music=dialog.getByRole('checkbox',{name:'Background Music',exact:true});
   await sound.check();await music.check();assert.equal(await sound.isChecked(),true);assert.equal(await music.isChecked(),true);
   if(expectedAudioCount!==null){const deadline=Date.now()+15000;while(new Set(kvReads.slice(beforeReads).map(key=>records.get(key)?.name).filter(name=>name?.startsWith('audio/'))).size<expectedAudioCount&&Date.now()<deadline)await page.waitForTimeout(100);}
   await sound.uncheck();await music.uncheck();
   const settingsGeometry=await dialog.evaluate(element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth};});
   assert.equal(settingsGeometry.overflow,false);assert.ok(settingsGeometry.x>=-1&&settingsGeometry.x+settingsGeometry.width<=width+1);
   await page.screenshot({path:resolve(directory,`m100-compiled-settings-${width}.png`)});
   await dialog.getByRole('button',{name:'Close panel',exact:true}).click();
   await page.waitForTimeout(250);
   const csp=await page.evaluate(()=>globalThis.m100CompiledCsp),loaded=kvReads.slice(beforeReads).map(key=>records.get(key)?.name);
   assert.deepEqual(pageErrors,[]);assert.deepEqual(csp,[]);assert.deepEqual(wireErrors,[]);assert.deepEqual(blockedExternal,[]);
   const loadedAudio=[...new Set(loaded.filter(name=>name?.startsWith('audio/')))];if(expectedAudioCount!==null){assert.equal(loadedAudio.length,expectedAudioCount);if(expectedAudioCount===9)assert.ok(loadedAudio.includes('audio/Start/WinMultiplier.mp3'));}
   assert.ok(loaded.includes('app.mjs')&&loaded.includes('page.css')&&loaded.includes('media/background.png')&&loaded.includes('media/Sprites/Images-7.png'));
   report.widths.push({width,compiledBootstrapExecuted:true,originalWireFixtureAuthenticated:true,fixtureSpinStopTake:true,fixtureDraws:fixture.draws,fixturePosts:fixture.posts,
    fixtureBalance:fixture.state.balance,nativeArtColors:idle.colors,nativeSettingsToggled:true,loadedAudio,phoneWinLayoutVerified:verifyPhoneWinLayout&&width<700,noCspViolations:true,noOverflow:true,winGeometry,settingsGeometry,consoleErrors});
   await context.close();
  }
  report.completedAt=new Date().toISOString();await writeFile(resolve(directory,'m100-compiled-play-browser-report.json'),JSON.stringify(report,null,2)+'\n');return report;
 }catch(error){
  report.failure={name:error.name,message:error.message.slice(0,1000)};await writeFile(resolve(directory,'m100-compiled-play-browser-report.json'),JSON.stringify(report,null,2)+'\n');throw error;
 }finally{await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
}
if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname){const directory=process.argv[2];if(!directory)throw Error('Usage: node play-browser-qa.mjs BUILD_DIRECTORY');console.log(JSON.stringify(await verifyM100PlayArtifact(directory,{verifyPhoneWinLayout:process.env.M100_COMPILED_EXPECT_PHONE_WIN==='1',expectedAudioCount:process.env.M100_COMPILED_EXPECT_AUDIO?Number(process.env.M100_COMPILED_EXPECT_AUDIO):null})));}
