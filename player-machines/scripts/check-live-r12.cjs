// Live r12 verification. Use --only=games --games=id,id for a targeted rerun.
// Every browser context is a new guest; financial/authentication mutations are blocked.
const {createRequire}=require('node:module');
let playwright;try{playwright=require('playwright');}catch(error){if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw error;playwright=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/entry.js')('playwright');}
const {chromium,request}=playwright;
if(!process.argv.includes('--after-deploy'))throw Error('Run with --after-deploy only after r12 publication is confirmed.');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const ORIGIN='https://superwin-player.apdiy61.workers.dev';
const PREFIX='/zplay-machines-20261106-r12';
const PORTAL_RELEASE='player-portal-20261106-r9';
const PORTAL_PREFIX='/'+PORTAL_RELEASE+'/';
const GAMES=['multi_hot_5_video','hot_foxy_20','multi_hot_100','wild_multi_stars'];
const ONLY=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7)||'all';
const SELECTED_GAMES=process.argv.find(arg=>arg.startsWith('--games='))?.slice(8).split(',')||GAMES;
assert.ok(['all','http','portal','games'].includes(ONLY),'Unknown --only scope');
assert.ok(SELECTED_GAMES.length&&SELECTED_GAMES.every(game=>GAMES.includes(game)),'Unknown --games value');
const STARTUP_TIMEOUT=90000;
const BACKGROUND_DURATIONS=Object.freeze({multi_hot_5_video:87.17061224489795,hot_foxy_20:96,multi_hot_100:1.465});
const SAMPLE_COUNTS=Object.freeze({multi_hot_5_video:7,hot_foxy_20:15,multi_hot_100:7,wild_multi_stars:7});
const NATIVE_SYMBOL_COUNTS=Object.freeze({multi_hot_5_video:9,hot_foxy_20:8});
const NATIVE_BUNDLE_COUNTS=Object.freeze({multi_hot_5_video:4,hot_foxy_20:12});
const MACHINE_ASSETS=['controller.mjs','registry.mjs','extra-games.mjs','hundred-presentation.mjs','stars-presentation.mjs','multi-presentation.mjs','foxy-presentation.mjs','foxy-atlas-cleanup.mjs','renderer.mjs','art.mjs','ambient.mjs','audio.mjs','background-audio.mjs','foxy-effects.mjs','audio-loop.mjs','audio-samples.mjs','style.css','official-presentation.mjs','official-foxy-art.mjs','official-mh5-art.mjs','official-foxy-foreground.mjs','official-foxy-background.mjs','official-mh5-background.mjs','official-foxy-effects-audio.mjs','official-mh5-effects-audio.mjs','native-presentation.mjs','native-animation-runtime.mjs','native-animation-foxy-assets.mjs','native-animation-mh5-assets.mjs','native-animation-LICENSES.txt'];
const PORTAL_ASSETS=['portal.css','surfaces.css','portal.mjs','cover-art.mjs'];
const PROXY=process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined;
const DISABLE_HTTP2=process.env.ZPLAY_LIVE_DISABLE_HTTP2==='1';
const OUT=process.env.ZPLAY_LIVE_QA_OUT||'/workspace/work/r12-live';
fs.mkdirSync(OUT,{recursive:true});
const write=(name,value)=>fs.writeFileSync(OUT+'/'+name,JSON.stringify(value,null,2));
const failure=(error)=>error?.stack||error?.message||String(error);
function isAllowedMutation(req){return req.method()==='POST'&&new URL(req.url()).origin===ORIGIN&&new URL(req.url()).pathname==='/_player/presence';}
async function guestPage(browser){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const evidence={errors:[],failedRequests:[],httpFailures:[],cancelledOnClose:[],mutatingRequests:[],blockedMutations:[]};
 const started=Date.now();let closing=false;
 // Enforce the read-only boundary before navigation, including page-close beacons.
 await context.route('**/*',async route=>{
  const req=route.request();
  if(!['GET','HEAD','OPTIONS'].includes(req.method())&&!isAllowedMutation(req)){
   evidence.blockedMutations.push({method:req.method(),url:req.url()});await route.abort('blockedbyclient');return;
  }
  await route.continue();
 });
 const page=await context.newPage();
 page.on('pageerror',e=>evidence.errors.push(e.message));
 page.on('requestfailed',r=>(closing?evidence.cancelledOnClose:evidence.failedRequests).push({url:r.url(),failure:r.failure()?.errorText,elapsedMs:Date.now()-started}));
 page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).origin===ORIGIN&&/\.(?:mjs|js|css|svg|png|jpe?g|webp|woff2?)(?:\?|$)/.test(r.url()))evidence.httpFailures.push({url:r.url(),status:r.status(),elapsedMs:Date.now()-started});});
 page.on('request',r=>{if(!['GET','HEAD','OPTIONS'].includes(r.method()))evidence.mutatingRequests.push({method:r.method(),url:r.url()});});
 return{context,page,evidence,close:async()=>{closing=true;await context.close();}};
}
function assertGuestRequests(evidence,label){
 assert.deepEqual(evidence.errors,[],label+' browser errors');
 assert.deepEqual(evidence.failedRequests,[],label+' failed requests');
 assert.deepEqual(evidence.httpFailures,[],label+' failed static responses');
 assert.deepEqual(evidence.blockedMutations,[],label+' attempted an unauthorized mutation');
 assert.deepEqual(evidence.mutatingRequests.filter(r=>!(r.method==='POST'&&new URL(r.url).origin===ORIGIN&&new URL(r.url).pathname==='/_player/presence')),[],label+' unexpected mutations');
}
(async()=>{
 const http=[],failures=[];
 if(ONLY==='all'||ONLY==='http'){
 const api=await request.newContext({proxy:PROXY,ignoreHTTPSErrors:false,timeout:45000});
 try{
  for(const path of ['/',...GAMES.map(id=>'/games/'+id),...MACHINE_ASSETS.map(name=>PREFIX+'/'+name),...PORTAL_ASSETS.map(name=>PORTAL_PREFIX+name),'/api/machine-session']){
   const item={path};http.push(item);
   try{
    const response=await api.get(ORIGIN+path),body=await response.body(),contentType=response.headers()['content-type']||'';
    Object.assign(item,{status:response.status(),bytes:body.length,contentType});assert.equal(response.status(),200,path);assert.ok(body.length>0,path);
    if(path==='/api/machine-session'){item.authenticated=JSON.parse(body.toString()).authenticated;assert.equal(item.authenticated,false);}
    else if(path==='/'){
     item.portalRelease=response.headers()['x-zplay-portal-release'];assert.equal(item.portalRelease,PORTAL_RELEASE);assert.match(contentType,/text\/html/);
     item.injection=PORTAL_ASSETS.filter(name=>name!=='cover-art.mjs').every(name=>body.toString().includes(PORTAL_PREFIX+name));assert.equal(item.injection,true,'homepage r9 presentation injection');
     assert.ok(body.toString().includes('id="zplay-portal-r9-css"'),'homepage stylesheet marker');
    }else if(path.startsWith('/games/')){item.release=body.toString().includes(PREFIX);assert.equal(item.release,true,path+' did not serve r12');assert.match(contentType,/text\/html/);}
    else if(path.endsWith('.mjs'))assert.match(contentType,/javascript/);
    else if(path.endsWith('.css'))assert.match(contentType,/text\/css/);
    else if(path.endsWith('.txt'))assert.match(contentType,/text\/plain/);
    if(path.startsWith(PORTAL_PREFIX)){
     item.portalRelease=response.headers()['x-zplay-portal-release'];item.etag=response.headers().etag;item.cacheControl=response.headers()['cache-control'];
     assert.equal(item.portalRelease,PORTAL_RELEASE);assert.match(item.cacheControl||'',/immutable/);assert.ok(item.etag,'portal asset ETag');
     const conditional=await api.get(ORIGIN+path,{headers:{'If-None-Match':item.etag}});item.conditionalStatus=conditional.status();assert.equal(item.conditionalStatus,304,path+' cache revalidation');
    }
   }catch(error){item.error=error.message;failures.push({scope:'http',path,error:failure(error)});}
  }
 }finally{write('http-live-r12.json',http);await api.dispose();}
 }
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox',...(DISABLE_HTTP2?['--disable-http2']:[])],proxy:PROXY});
 const results=[],portal={};
 try{
  if(ONLY==='all'||ONLY==='portal'){
  const{page,evidence,close}=await guestPage(browser);
  try{
   const response=await page.goto(ORIGIN+'/',{waitUntil:'domcontentloaded',timeout:45000});portal.status=response.status();assert.equal(portal.status,200);
   await page.waitForFunction(release=>{const state=window[Symbol.for('zplay.portal.reference.r9')]?.diagnostics();return document.body.dataset.portalR9===release&&state?.loaded;},PORTAL_RELEASE,{timeout:30000});
   const gallery=page.locator('#portal-r9-gallery');await gallery.waitFor({state:'visible',timeout:15000});
   Object.assign(portal,await page.evaluate(()=>{
    const d=window[Symbol.for('zplay.portal.reference.r9')].diagnostics(),gallery=document.getElementById('portal-r9-gallery');
    return{...d,datasetRelease:document.body.dataset.portalR9,view:document.body.dataset.portalView,cardCount:gallery.querySelectorAll('.portal-r9-card-open').length,visibleGames:[...gallery.querySelectorAll('.portal-r9-card-open')].map(n=>n.dataset.game),galleryVisible:!!gallery.getClientRects().length,overflow:document.documentElement.scrollWidth>innerWidth,injection:{stylesheet:document.getElementById('zplay-portal-r9-css')?.getAttribute('href'),module:[...document.scripts].some(s=>s.src.includes('/player-portal-20261106-r9/portal.mjs'))},signedIn:!!document.querySelector('.signed-in-header')};
   }));
   assert.equal(portal.release,PORTAL_RELEASE);assert.equal(portal.identity,'guest');assert.equal(portal.signedIn,false);assert.equal(portal.galleryVisible,true);assert.equal(portal.overflow,false);assert.equal(portal.loaded,true);assert.equal(portal.error,'');assert.equal(portal.injection.stylesheet,PORTAL_PREFIX+'portal.css');assert.equal(portal.injection.module,true);
   assert.equal(portal.cardCount,6,'Home featured count');
   await page.screenshot({path:OUT+'/live-r12-portal-home.png',fullPage:true});
   await page.locator('.bottom-nav button').filter({hasText:/^Games$/i}).first().tap();
   await page.waitForFunction(()=>document.body.dataset.portalView==='games');await gallery.waitFor({state:'visible'});
   portal.catalogueGames=await gallery.locator('.portal-r9-card-open').evaluateAll(nodes=>nodes.map(n=>n.dataset.game));
   assert.equal(portal.catalogueGames.length,57);for(const game of GAMES)assert.ok(portal.catalogueGames.includes(game),'guest catalogue missing '+game);
   portal.details=[];
   for(const game of GAMES){
    await gallery.locator('.portal-r9-card-open[data-game="'+game+'"]').first().tap();
    const dialog=page.locator('#portal-r9-game-sheet');await dialog.waitFor({state:'visible'});
    const href=await dialog.locator('.portal-r9-sheet-play').getAttribute('href');assert.equal(href,'/games/'+game);
    await dialog.locator('.portal-r9-sheet-details').tap();assert.equal(await dialog.locator('.portal-r9-game-details').isVisible(),true);
    portal.details.push({game,href,detailsVisible:true});await dialog.locator('.portal-r9-sheet-close').tap();await dialog.waitFor({state:'hidden'});
   }
   await gallery.locator('#portal-r9-search').fill('Multi Hot 5');assert.equal(await gallery.locator('.portal-r9-card-open').count(),1);await gallery.locator('#portal-r9-search').fill('');
   const gamesNav=page.locator('.bottom-nav button').filter({hasText:/^Games$/i});
   if(await gamesNav.count()){
    await gamesNav.first().tap();await page.waitForFunction(()=>document.body.dataset.portalView==='games');await gallery.waitFor({state:'visible'});
    portal.gamesSurfaceVisible=true;await page.screenshot({path:OUT+'/live-r12-portal-games.png',fullPage:true});
   }else throw Error('Original Games navigation button is missing');
   assertGuestRequests(evidence,'portal');
  }catch(error){portal.errorMessage=error.message;failures.push({scope:'portal',error:failure(error)});try{await page.screenshot({path:OUT+'/live-r12-portal-error.png',fullPage:true});}catch{}}
  finally{await close();Object.assign(portal,evidence);if(evidence.blockedMutations.length)failures.push({scope:'portal-close',error:'Blocked unexpected mutation: '+JSON.stringify(evidence.blockedMutations)});write('portal-live-r12.json',portal);}
  }
  for(const game of (ONLY==='all'||ONLY==='games'?SELECTED_GAMES:[])){
   const{page,evidence,close}=await guestPage(browser);const item={game};results.push(item);const started=Date.now();
   try{
    const response=await page.goto(ORIGIN+'/games/'+game,{waitUntil:'domcontentloaded',timeout:45000});item.status=response.status();
    await page.waitForSelector('body[data-state="signedout"]',{timeout:STARTUP_TIMEOUT});item.startupMs=Date.now()-started;
    await page.locator('#menu').tap();await page.locator('[data-panel="audio"]').tap();await page.locator('#sound-test').tap();
    await page.evaluate(async prefix=>{window.__liveQAMachine=await import(prefix+'/controller.mjs');},PREFIX);
    await page.waitForFunction(({samples,native,bundles})=>{const d=window.__liveQAMachine.diagnostics(),expected=native[d.gameId];return d.artworkLoaded&&d.cabinetArtworkLoaded&&d.decodedSoundSamples===samples[d.gameId]&&d.audioState==='running'&&(d.gameId!=='multi_hot_5_video'||d.multiArtworkLoaded)&&(!expected||(d.nativeArtworkLoaded&&d.nativeSymbolCount===expected&&d.nativeAnimation?.ready&&d.nativeAnimation.instances===bundles[d.gameId]&&d.nativeAnimation.draws>0&&(d.gameId!=='multi_hot_5_video'||d.nativeAnimation.decodedPages>=4)&&(document.body.dataset.nativeFoxyControls==='true'||document.body.dataset.nativeMh5Controls==='true')&&[...document.fonts].filter(f=>/^Foxy Intro|^MH5 Intro/.test(f.family)&&f.status==='loaded').length===2))&&(d.gameId!=='hot_foxy_20'||d.nativeForegroundLoaded);},{samples:SAMPLE_COUNTS,native:NATIVE_SYMBOL_COUNTS,bundles:NATIVE_BUNDLE_COUNTS},{timeout:45000});
    await page.locator('[data-close="settings"]').tap();
    if(Object.hasOwn(BACKGROUND_DURATIONS,game)){await page.locator('#sound').tap();await page.locator('#sound').tap();await page.waitForFunction(()=>window.__liveQAMachine.diagnostics().backgroundAudio.playing,null,{timeout:20000});}
    const info=await page.evaluate(async prefix=>{
     const d=(await import(prefix+'/controller.mjs')).diagnostics();
     return{gameId:d.gameId,state:document.body.dataset.state,geometry:d.geometry,artwork:d.artworkLoaded,cabinet:d.cabinetArtworkLoaded,multiArtwork:d.multiArtworkLoaded,decodedSounds:d.decodedSoundSamples,audioState:d.audioState,audioSuspended:d.audioSuspended,backgroundAudio:d.backgroundAudio,nativeArtwork:d.nativeArtworkLoaded,nativeAnimation:d.nativeAnimation,nativeSymbols:d.nativeSymbolCount,nativeForeground:d.nativeForegroundLoaded,nativeControls:document.body.dataset.nativeFoxyControls==='true'||document.body.dataset.nativeMh5Controls==='true',nativeFonts:[...document.fonts].filter(f=>/^Foxy Intro|^MH5 Intro/.test(f.family)).map(f=>({family:f.family,status:f.status})),canvas:document.querySelectorAll('#machine-canvas').length,balance:document.getElementById('balance').textContent,notice:document.getElementById('notice-text').textContent,videoCount:document.querySelectorAll('video,iframe').length,spinDisabled:document.getElementById('spin').disabled,multiFace:document.getElementById('spin').dataset.multiFace||null,overflow:document.documentElement.scrollWidth>innerWidth,ambientParticles:d.ambientParticles,contextLost:d.contextLost};
    },PREFIX);Object.assign(item,info);
    await page.screenshot({path:OUT+'/live-r12-'+game+'.png',fullPage:true});
    assert.equal(item.status,200,game);assert.equal(info.gameId,game);assert.equal(info.state,'signedout');assert.equal(info.artwork,true);assert.equal(info.cabinet,true);assert.equal(info.decodedSounds,SAMPLE_COUNTS[game]);assert.equal(info.audioState,'running');assert.equal(info.audioSuspended,false);assert.equal(info.canvas,1);assert.equal(info.videoCount,0);assert.equal(info.balance,'—');assert.equal(info.spinDisabled,true);assert.equal(info.overflow,false);assert.equal(info.contextLost,false);
    assert.deepEqual(info.geometry,{columns:game==='multi_hot_5_video'?3:5,rows:game==='multi_hot_100'?4:3});
    if(game==='multi_hot_5_video')assert.equal(info.multiFace,'bet','MH5 ready face must show selected wager');
    if(Object.hasOwn(NATIVE_SYMBOL_COUNTS,game)){assert.equal(info.nativeArtwork,true);assert.equal(info.nativeAnimation?.ready,true);assert.equal(info.nativeAnimation.instances,NATIVE_BUNDLE_COUNTS[game]);assert.ok(info.nativeAnimation.draws>0);if(game==='multi_hot_5_video')assert.ok(info.nativeAnimation.decodedPages>=4);assert.equal(info.nativeSymbols,NATIVE_SYMBOL_COUNTS[game]);assert.equal(info.nativeControls,true);assert.equal(info.nativeFonts.length,2);assert.ok(info.nativeFonts.every(f=>f.status==='loaded'));if(game==='hot_foxy_20')assert.equal(info.nativeForeground,true);}else{assert.equal(info.nativeArtwork,false);assert.equal(info.nativeAnimation,null);assert.equal(info.nativeSymbols,0);assert.equal(info.nativeControls,false);}
    if(Object.hasOwn(BACKGROUND_DURATIONS,game)){assert.equal(info.backgroundAudio.playing,true);assert.ok(Math.abs(info.backgroundAudio.durationSeconds-BACKGROUND_DURATIONS[game])<.002,game+' background loop duration');}else{assert.equal(info.backgroundAudio.loaded,false);assert.equal(info.backgroundAudio.playing,false);}
    assertGuestRequests(evidence,game);
   }catch(error){item.error=error.message;failures.push({scope:'machine',game,error:failure(error)});try{await page.screenshot({path:OUT+'/live-r12-'+game+'-error.png',fullPage:true});}catch{}}
   finally{await close();Object.assign(item,evidence);if(evidence.blockedMutations.length)failures.push({scope:'machine-close',game,error:'Blocked unexpected mutation: '+JSON.stringify(evidence.blockedMutations)});write('live-r12.json',results);}
  }
 }finally{await browser.close();}
 const summary={ok:failures.length===0,scope:ONLY,disableHttp2:DISABLE_HTTP2,startupTimeoutMs:STARTUP_TIMEOUT,machinePrefix:PREFIX,expectedBackgroundDurations:BACKGROUND_DURATIONS,expectedSoundSamples:SAMPLE_COUNTS,expectedNativeSymbols:NATIVE_SYMBOL_COUNTS,expectedNativeBundles:NATIVE_BUNDLE_COUNTS,httpChecks:http.length,portal,games:results,failures};write('live-r12-summary.json',summary);
 console.log(JSON.stringify(summary));assert.equal(failures.length,0,failures.map(f=>f.scope+': '+(f.path||f.game||'homepage')+' '+f.error).join('\n'));
})().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
