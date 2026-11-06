import {createRequire} from 'node:module';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gameConfigForReceipt} from '/workspace/superwin/player-machines/public/registry.mjs';
import {validateRound} from '/workspace/superwin/player-machines/public/contract.mjs';
const {chromium}=createRequire('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const origin='http://127.0.0.1:8775',root='/workspace/superwin/player-machines',out=process.env.QA_REPORT_DIR||root+'/evidence/r13/final-startup-integration';
const csp="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'";
const hashes=async()=>Object.fromEntries(await Promise.all((await readdir(root+'/public')).sort().map(async n=>[n,createHash('sha256').update(await readFile(root+'/public/'+n)).digest('hex')])));
await mkdir(out,{recursive:true});const source=await hashes(),results=[];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{for(const id of (process.env.QA_GAME?[process.env.QA_GAME]:['multi_hot_5_video','hot_foxy_20']))for(const sound of (process.env.QA_SOUND==='no'?[false]:[true,false])){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage(),checks=[],errors=[],requests=[];
 const result={gameId:id,sound,checks,errors},check=(name,ok)=>{checks.push({name,ok:!!ok});if(!ok)throw Error(name);};
 page.on('pageerror',e=>errors.push(String(e.stack||e)));page.on('request',r=>requests.push({method:r.method(),url:r.url()}));
 await page.addInitScript(()=>{globalThis.qaCspViolations=[];addEventListener('securitypolicyviolation',e=>qaCspViolations.push({directive:e.violatedDirective,uri:e.blockedURI}));});
 await page.route(origin+'/games/**',async route=>{const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),'content-security-policy':csp}});});
 const call=async(path,body)=>{const r=body===undefined?await context.request.get(origin+path):await context.request.post(origin+path,{data:body});if(!r.ok())throw Error(path+':'+r.status());return r.json();};
 const diag=()=>page.evaluate(async()=>{const url=document.querySelector('script[type="module"][src]').src;return(await import(url)).diagnostics();});
 const until=async(test,label)=>{const deadline=Date.now()+60000;while(Date.now()<deadline){const d=await diag();if(test(d))return d;await page.waitForTimeout(50);}throw Error('Timeout '+label);};
 const tap=selector=>page.locator(selector).tap({timeout:15000});
 try{
  await call('/qa/session',{balance:'100000.00'});const initial=await call('/qa/report');
  // Hold only the read-only model GET until first-paint evidence is captured.
  let release;const gate=new Promise(resolve=>{release=resolve;});let intercept=true;
  await page.route(origin+'/api/slots/games/'+id,async route=>{if(intercept)await gate;await route.continue();});
  await page.goto(origin+'/games/'+id,{waitUntil:'domcontentloaded'});
  try{await page.locator('#official-startup').waitFor({state:'visible',timeout:20000});await page.waitForFunction(()=>document.querySelector('#machine').inert,{},{timeout:20000});
   const loading=await page.evaluate(()=>({state:document.body.dataset.state,inert:document.querySelector('#machine').inert,disabled:document.querySelector('#spin').disabled,logo:getComputedStyle(document.querySelector('.official-loader-logo')).backgroundImage}));
   check('first-paint exact GIF covers disabled/inert game before model response',loading.inert&&loading.disabled&&loading.logo.includes('official-startup-logo.gif'));
   await page.screenshot({path:out+'/'+id+'-'+sound+'-loader.png'});result.loading=loading;
  }finally{intercept=false;release();}
  await page.waitForFunction(()=>document.body.dataset.state==='ready'&&document.querySelector('#sound-consent').open,{},{timeout:60000});
  let d=await diag();check('native presentation finishes before sound prompt',d.officialStartup.completed&&!d.officialStartup.loading&&d.nativeAnimation?.ready&&d.nativeAnimation.instances===(id==='multi_hot_5_video'?4:12)&&d.nativeAnimation.draws>0&&d.officialStartup.gif);
  check('volume matches proven native master100%',await page.locator('#volume').inputValue()==='100'&&await page.locator('#volume-value').textContent()==='100%');
  check('startup and prompt never submit a wager',(await call('/qa/report')).spinPosts===0);
  await page.screenshot({path:out+'/'+id+'-'+sound+'-sound.png'});await tap(sound?'#sound-yes':'#sound-no');
  await page.waitForFunction(()=>!document.querySelector('#sound-consent').open,{},{timeout:10000});d=await until(d=>d.officialStartup.choiceMade,'choice');
  check('native prompt calls existing sound handler exactly once',d.officialStartup.choiceCalls===1&&d.officialAudioSettings.effectsEnabled===sound&&d.officialAudioSettings.musicEnabled===sound);
  check('cover and inert state both release',!await page.locator('#official-startup').isVisible()&&!await page.locator('#machine').evaluate(n=>n.inert));
  if(sound){
   await until(d=>d.backgroundAudio?.playing&&d.decodedSoundSamples===(id==='multi_hot_5_video'?7:15),'native full audio decoded');
   await call('/qa/plan',{gameId:id,nextOutcome:'loss'});await tap('#spin');
   await page.waitForFunction(()=>document.body.dataset.state==='animating',{},{timeout:15000});await page.screenshot({path:out+'/'+id+'-spin.png'});
   await page.waitForFunction(()=>document.body.dataset.state==='ready',{},{timeout:45000});const ledger=await call('/qa/report'),round=ledger.rounds.at(-1);result.round=round;
   const raw=await call('/api/slots/rounds/'+round.roundId);validateRound(raw,gameConfigForReceipt(raw),raw.bet);
   check('one trusted spin yields one validated current receipt',ledger.spinPosts===1&&ledger.roundSettlements===1&&ledger.ledgerBalanced&&raw.mathSha256==='5e9d2cd4ed5a8d6b5107eb315130d9fbcfcef24967e46d3922c5e697c5af070a');
   result.afterSpin=await diag();await page.screenshot({path:out+'/'+id+'-ready.png'});
  }else{await page.waitForTimeout(150);d=await diag();check('NO leaves master and background silent',d.audioNodes===0&&!d.backgroundAudio.playing);}
  const beforeReload=await call('/qa/report');await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.body.dataset.state==='ready',{},{timeout:60000});d=await diag();
  check('stored choice bypasses prompt after exact loader completes',d.officialStartup.completed&&!await page.locator('#sound-consent').evaluate(n=>n.open)&&d.officialAudioSettings.effectsEnabled===sound);
  const final=await call('/qa/report');check('reload adds no spin or ledger settlement',final.spinPosts===beforeReload.spinPosts&&final.roundSettlements===beforeReload.roundSettlements&&final.balance===beforeReload.balance&&final.ledgerBalanced);
  result.cspViolations=await page.evaluate(()=>qaCspViolations);check('strict production CSP permits the complete startup',!result.cspViolations.length);check('exact original menu font loaded as bytes',await page.evaluate(()=>Array.from(document.fonts).some(face=>face.family==='Official Menu Book'&&face.status==='loaded')));check('no JavaScript errors',errors.length===0);check('only loopback requests',requests.every(r=>r.url.startsWith(origin)||r.url.startsWith('data:')));result.final=final;result.diagnostics=d;
 }catch(error){result.error=String(error.stack||error);await page.screenshot({path:out+'/'+id+'-'+sound+'-failure.png'}).catch(()=>{});}finally{await context.close();results.push(result);await writeFile(out+'/results.json',JSON.stringify({synthetic:true,scope:'Final intro, native sound choice, one settled synthetic spin and reload per selected game. HTML carries actual production CSP; only initial read-only model GET is paused for first-paint capture.',source,results},null,2));console.log(JSON.stringify({gameId:id,sound,checks:checks.length,passed:checks.filter(c=>c.ok).length,error:result.error}));}
 }}finally{await browser.close();}
const sourceAfter=await hashes();await writeFile(out+'/results.json',JSON.stringify({synthetic:true,source,sourceAfter,sourceUnchanged:JSON.stringify(source)===JSON.stringify(sourceAfter),results},null,2));if(results.some(r=>r.error)||JSON.stringify(source)!==JSON.stringify(sourceAfter))process.exitCode=1;
