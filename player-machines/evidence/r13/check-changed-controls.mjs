// Trusted, no-wager checks against the disposable loopback QA server only.
import {createRequire} from 'node:module';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {gameConfig} from '/workspace/superwin/player-machines/public/registry.mjs';
import {units,decimal} from '/workspace/superwin/player-machines/public/contract.mjs';
if(!process.argv.includes('--qa'))throw Error('Pass --qa; this script is loopback-only.');
const arg=(name,fallback)=>process.argv.find(value=>value.startsWith(name+'='))?.slice(name.length+1)||fallback;
const port=Number(arg('--port','8767')),widths=arg('--widths','360,390,430').split(',').map(Number),out=arg('--out','/workspace/superwin/player-machines/evidence/r13/changed-controls');
if(!Number.isInteger(port)||port<1024||port>65535||widths.some(width=>![360,390,430].includes(width)))throw Error('Invalid local QA options');
const origin='http://127.0.0.1:'+port,publicDir='/workspace/superwin/player-machines/public',games=arg('--games','multi_hot_5_video,hot_foxy_20').split(',');if(!games.length||games.some(id=>!['multi_hot_5_video','hot_foxy_20'].includes(id)))throw Error('Invalid games');
let chromium;try{({chromium}=await import('playwright'));}catch{({chromium}=createRequire((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/entry.js')('playwright'));}
const source=async()=>Object.fromEntries(await Promise.all((await readdir(publicDir)).sort().map(async name=>[name,createHash('sha256').update(await readFile(publicDir+'/'+name)).digest('hex')])));
await mkdir(out,{recursive:true});const beforeSource=await source(),results=[];
const browser=await chromium.launch({...(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
try{
 for(const width of widths)for(const id of games){
  const context=await browser.newContext({viewport:{width,height:width===360?800:width===430?932:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage(),checks=[],errors=[],requests=[];
  const result={gameId:id,width,synthetic:true,noWagers:true,checks,errors},check=(label,ok)=>{checks.push({label,ok:!!ok});if(!ok)throw Error(label);};
  page.on('pageerror',error=>errors.push(String(error.stack||error)));page.on('request',request=>requests.push({method:request.method(),url:request.url()}));
  const get=async path=>{const response=await context.request.get(origin+path);if(!response.ok())throw Error(path+' '+response.status());return response.json();};
  const report=()=>get('/qa/report'),diag=()=>page.evaluate(async()=>{const src=document.querySelector('script[type="module"][src]').src;return(await import(src)).diagnostics();});
  const until=async(predicate,label)=>{const end=Date.now()+60000;while(Date.now()<end){const value=await diag();if(predicate(value))return value;await page.waitForTimeout(50);}throw Error('Timeout: '+label);};
  const tap=selector=>page.locator(selector).tap({timeout:6000});
  const ready=async()=>{await page.waitForFunction(()=>document.body.dataset.state==='ready'&&document.querySelector('#settings')?.dataset.nativeMenuAssetsReady==='true',{},{timeout:60000});await until(value=>value.nativeAnimation?.ready&&value.nativeAnimation.draws>0&&value.officialAudioSettings,'native presentation and settings');};
  const close=async()=>{if(await page.locator('#settings').evaluate(node=>node.open))await tap('#settings [data-close="settings"]');};
  const menu=async()=>{await tap(await page.locator('#menu-top').isVisible()?'#menu-top':'#menu');await page.waitForFunction(()=>document.querySelector('#settings')?.dataset.nativeHelpReady==='true',{},{timeout:15000});};
  const settings=async()=>{await menu();await tap('[data-panel="audio"]');};
  const audioState=async(effects,music,label)=>{const value=await until(d=>d.officialAudioSettings?.effectsEnabled===effects&&d.officialAudioSettings?.musicEnabled===music,label);check(label,await page.locator('.native-help-sound-toggle').getAttribute('aria-checked')===String(effects)&&await page.locator('.native-help-music-toggle').getAttribute('aria-checked')===String(music)&&await page.locator('#sound').getAttribute('aria-pressed')===String(!effects));return value;};
  try{
   const opened=await context.request.post(origin+'/qa/session',{data:{balance:'100000.00'}});check('disposable invented QA session created',opened.ok());const initial=await report(),model=gameConfig(id);
   await page.goto(origin+'/games/'+id,{waitUntil:'domcontentloaded'});await ready();await page.waitForFunction(()=>document.querySelector('#sound-consent').open);await tap('#sound-yes');await page.waitForFunction(()=>!document.querySelector('#sound-consent').open);
   const selected=await page.locator('#bet-value').textContent();check('official default wager remains selected',selected===model.betLevels[0]);
   if(id==='multi_hot_5_video'){
    check('MH5 duplicate footer controls hidden and top menu visible',!await page.locator('#menu').isVisible()&&!await page.locator('#sound').isVisible()&&await page.locator('#menu-top').isVisible());
    check('MH5 previous stake preview is disabled at minimum',await page.locator('#previous-stake').isDisabled());await tap('#bet-more');check('MH5 real cabinet plus selects next wager',await page.locator('#bet-value').textContent()===model.betLevels[1]);await tap('#previous-stake');check('MH5 previous preview restores prior legal wager',await page.locator('#bet-value').textContent()===selected);await tap('#bet-more');await tap('#bet-less');
   }else{
    check('Foxy original menu and sound remain visible',await page.locator('#menu').isVisible()&&await page.locator('#sound').isVisible());
    const chooseFoxyBet=async value=>{await tap('#bet-quick');const selector='[data-bet="'+value+'"]';for(let step=0;!await page.locator(selector).isVisible();step++){if(step>model.betLevels.length)throw Error('Foxy picker could not reveal '+value);const indices=await page.locator('#bet-options').evaluate((root,value)=>{const buttons=Array.from(root.querySelectorAll('[data-bet]'));return{target:buttons.findIndex(button=>button.dataset.bet===value),first:buttons.findIndex(button=>!button.hidden)};},value);if(indices.target<0||indices.first<0)throw Error('Missing native bet option '+value);await tap(indices.target<indices.first?'.official-bet-up':'.official-bet-down');}await tap(selector);};
    await chooseFoxyBet(model.betLevels[1]);check('Foxy real BET popup selects next wager',await page.locator('#bet-value').textContent()===model.betLevels[1]&&!await page.locator('#settings').evaluate(node=>node.open));await chooseFoxyBet(selected);
   }
   check('actual wager restores before Help preview',await page.locator('#bet-value').textContent()===selected);
   result.cabinetGeometry=await page.evaluate(()=>Object.fromEntries(['spin','bet-less','bet-more','previous-stake','stake-open','menu-top','menu','sound'].map(id=>{const node=document.getElementById(id),rect=node.getBoundingClientRect(),style=getComputedStyle(node);return[id,{x:rect.x,y:rect.y,width:rect.width,height:rect.height,display:style.display,backgroundPosition:style.backgroundPosition,backgroundSize:style.backgroundSize,font:style.font,disabled:node.disabled??null}];})));await page.screenshot({path:out+'/'+id+'-'+width+'-cabinet.png'});
   await menu();check('Help preview is an output',await page.locator('.native-help-selected').evaluate(node=>node.tagName)==='OUTPUT');
   const previewBefore=await page.locator('.native-help-selected span').textContent();await tap('.native-help-more');const preview=await page.locator('.native-help-selected span').textContent();
   check('Help plus changes only preview',preview===model.betLevels[model.betLevels.indexOf(previewBefore)+1]&&await page.locator('#bet-value').textContent()===selected&&await page.locator('#rules').isVisible());
   const rows=await page.locator('#paytable .native-help-symbol-group').evaluateAll(nodes=>nodes.map(node=>({symbol:node.dataset.symbols.split(' ')[0],counts:Array.from(node.querySelectorAll('dt'),x=>Number(x.textContent)),amounts:Array.from(node.querySelectorAll('dd'),x=>x.textContent)})));
   check('preview payouts independently match new preview stake',rows.some(row=>row.amounts.length)&&rows.every(row=>row.amounts.every((amount,index)=>amount===decimal(units(preview)/BigInt(model.paylines)*BigInt(model.paytable[row.symbol][row.counts[index]])/100n))));
   await page.screenshot({path:out+'/'+id+'-'+width+'-help-preview.png'});await close();check('closing Help never applies preview as wager',await page.locator('#bet-value').textContent()===selected);
   await settings();await audioState(true,true,'consented effects and music are enabled');
   await tap('.native-help-music-toggle');await audioState(true,false,'Music disables without muting effects');await until(value=>!value.backgroundAudio?.playing,'music bed stops');
   await page.reload({waitUntil:'domcontentloaded'});await ready();check('music preference reload does not reopen consent',!await page.locator('#sound-consent').evaluate(node=>node.open));await settings();await audioState(true,false,'independent Music-off preference persists after reload');
   await tap('.native-help-sound-toggle');await audioState(false,false,'Effects off clears Music and master');await until(value=>value.audioNodes===0&&!value.backgroundAudio?.playing,'effects off stops all audio nodes');
   await tap('.native-help-music-toggle');await audioState(false,true,'Music preference cannot unmute disabled effects');await until(value=>value.audioNodes===0&&!value.backgroundAudio?.playing,'master stays silent with Music preference on');await tap('.native-help-music-toggle');
   await page.reload({waitUntil:'domcontentloaded'});await ready();await settings();await audioState(false,false,'Effects-off and Music-off preferences persist after reload');
   await tap('.native-help-sound-toggle');await audioState(true,true,'Effects on restores both switches');await until(value=>value.backgroundAudio?.playing,'consented music restarts after trusted input');
   await tap('.native-help-volume-options summary');const volume=page.locator('#volume'),prior=Number(await volume.inputValue());await volume.press('ArrowLeft');check('expanded Volume uses functional existing slider',Number(await volume.inputValue())===Math.max(0,prior-1));await volume.press('ArrowRight');await tap('#sound-test');
   check('fullscreen retains native switch semantics',await page.locator('#fullscreen').getAttribute('role')==='switch');await page.screenshot({path:out+'/'+id+'-'+width+'-settings.png'});
   const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));await tap('#fullscreen');await page.waitForFunction(()=>!!document.fullscreenElement||document.querySelector('#notice-text').textContent.includes('Fullscreen is unavailable'),{},{timeout:6000});result.fullscreenEntered=await page.evaluate(()=>!!document.fullscreenElement);
   if(result.fullscreenEntered){check('fullscreen switch reflects entered state',await page.locator('#fullscreen').getAttribute('aria-checked')==='true');await page.keyboard.press('Escape');if(await page.evaluate(()=>!!document.fullscreenElement))await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(value=>!document.fullscreenElement&&innerWidth===value.width&&innerHeight===value.height,viewport,{timeout:6000});}
   await close();const final=await report();check('all control interactions create no wager or ledger mutation',final.balance===initial.balance&&final.spinPosts===0&&final.gamblePosts===0&&final.roundSettlements===0&&final.gambleSettlements===0&&final.ledgerEntries===initial.ledgerEntries&&final.ledgerBalanced);check('all browser requests remain local',requests.every(request=>request.url.startsWith(origin)||request.url.startsWith('data:')));check('no browser JavaScript errors',errors.length===0);result.report=final;result.diagnostics=await diag();
  }catch(error){result.error=String(error.stack||error);result.report=await report().catch(()=>null);await page.screenshot({path:out+'/'+id+'-'+width+'-failure.png'}).catch(()=>{});}
  finally{await context.close();results.push(result);await writeFile(out+'/results.json',JSON.stringify({synthetic:true,noWagers:true,origin,source:beforeSource,results},null,2));console.log(JSON.stringify({gameId:id,width,checks:checks.length,passed:checks.filter(item=>item.ok).length,error:result.error}));}
 }
 if(process.argv.includes('--mh5-stake-capture')){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  try{
   await context.request.post(origin+'/qa/session',{data:{balance:'100000.00'}});const before=await(await context.request.get(origin+'/qa/report')).json();await page.goto(origin+'/games/multi_hot_5_video',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(async()=>{if(document.body.dataset.state!=='ready'||document.querySelector('#settings')?.dataset.nativeMenuAssetsReady!=='true')return false;const src=document.querySelector('script[type="module"][src]').src,d=(await import(src)).diagnostics();return d.nativeAnimation?.ready&&d.nativeAnimation.draws>0&&d.nativeArtworkLoaded;},{},{timeout:60000});
   await page.locator('#sound-yes').tap();await page.locator('#bet-more').tap();await page.screenshot({path:out+'/multi_hot_5_video-390-stake-row.png'});
   const geometry=await page.evaluate(()=>Object.fromEntries(['previous-stake','stake-open','bet-less','bet-more','spin'].map(id=>{const node=document.getElementById(id),rect=node.getBoundingClientRect(),style=getComputedStyle(node);return[id,{text:node.textContent,x:rect.x,y:rect.y,width:rect.width,height:rect.height,disabled:node.disabled??null,backgroundPosition:style.backgroundPosition,backgroundSize:style.backgroundSize}];}))),after=await(await context.request.get(origin+'/qa/report')).json();
   const unchanged=before.balance===after.balance&&after.spinPosts===0&&after.gamblePosts===0&&before.ledgerEntries===after.ledgerEntries;await writeFile(out+'/multi_hot_5_video-390-stake-row.json',JSON.stringify({synthetic:true,noWagers:unchanged,geometry,errors},null,2));if(!unchanged||errors.length)throw Error('Geometry capture mutated wallet or raised JavaScript error');
  }finally{await context.close();}
 }
}finally{await browser.close();}
const afterSource=await source(),unchanged=JSON.stringify(beforeSource)===JSON.stringify(afterSource);await writeFile(out+'/results.json',JSON.stringify({synthetic:true,noWagers:true,origin,source:beforeSource,sourceAfter:afterSource,sourceUnchanged:unchanged,results},null,2));if(!unchanged||results.some(result=>result.error))process.exitCode=1;
