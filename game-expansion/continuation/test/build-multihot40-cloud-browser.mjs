/**
 * Private browser QA bootstrap. No upload, production login, or financial API
 * request is made. The real app and its eight dependencies run as Blob modules.
 * Only canonical local transcripts answer financial requests. Artwork uses real
 * HTTPS fetches and the unchanged hash-verifying loader/canvas/audio renderer.
 *
 * node test/build-multihot40-cloud-browser.mjs --scenario=manual_win_collect \
 *   --asset-base=https://superwin-player.apdiy61.workers.dev/native-expansion100/reference-art/r1/smartsoft/assets/
 *
 * Navigate Browser Rendering to the same HTTPS origin first. Pass output.content
 * to addScriptTag.content, then wait for body[data-qa="done"],body[data-qa="failed"].
 * #zplay-browser-result contains JSON. The final scene remains visible.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve,posix} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const MODULES=['presentation/atlas.mjs','presentation/machine-renderer.mjs','presentation/multihot40-motion.mjs','presentation/multihot40-skeleton.mjs','client/session.mjs','client/autoplay.mjs','client/spin-hold.mjs','client/multihot40-presentation.mjs','client/multihot40-app.mjs'];
const IMPORT=/^(\s*import\s+(?:[^\n]*?\s+from\s+)?)(['"])([^'"]+)\2/gm;
const DEFAULT_ART='https://superwin-player.apdiy61.workers.dev/native-expansion100/reference-art/r1/smartsoft/assets/';
const hash=value=>createHash('sha256').update(value).digest('hex');

async function browserBootstrap(payload){
 const started=performance.now(),realFetch=globalThis.fetch.bind(globalThis),clone=value=>structuredClone(value);
 const errors=[],network=[],checks=[],actions=[],receipts=new Map(),moduleURLs=new Map();
 let cursor=0,current=clone(payload.scenario.initialState),history=clone(payload.scenario.initialHistory),finished=false;
 const result={scenario:payload.scenarioName,localTranscriptsOnly:true,productionFinancialRequests:0,checks,errors,network,actions,
  viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},sourceHashes:payload.sourceHashes,
  audio:{realLoader:true,audiblePlaybackVerified:false,reason:'DOM automation is not a trusted audio gesture.'}};
 const recordError=(type,value)=>{if(errors.length<20)errors.push({type,message:String(value?.message??value),stack:value?.stack??null});};
 addEventListener('error',event=>recordError('window-error',event.error??event.message??event.target?.src),true);
 addEventListener('unhandledrejection',event=>recordError('unhandledrejection',event.reason));
 const expect=(condition,message)=>{if(!condition)throw Error(message);};
 const pause=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
 const $=selector=>document.querySelector(selector);
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
 const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
 const fingerprint=body=>{const copy=clone(body);delete copy.request_id;return JSON.stringify(canonical(copy));};
 const wait=async(predicate,label,timeout=12000)=>{
  const until=Math.min(started+55000,performance.now()+timeout);
  while(performance.now()<until){
   if(errors.length)throw Error(label+': '+errors[0].message);
   if(await predicate())return;
   await pause(30);
  }
  throw Error('Timed out: '+label+'; loading='+$('#loadingStatus')?.textContent+'; status='+$('#status')?.textContent);
 };
 const click=selector=>{
  const node=typeof selector==='string'?$(selector):selector;
  expect(node,'Missing click target '+selector);expect(!node.disabled,'Disabled click target '+selector);
  const rect=node.getBoundingClientRect();expect(!node.hidden&&rect.width>0&&rect.height>0,'Invisible click target '+selector);
  const x=rect.left+rect.width/2,y=rect.top+rect.height/2,hit=document.elementFromPoint(x,y);
  expect(x>=0&&x<innerWidth&&y>=0&&y<innerHeight,'Offscreen click target '+selector);
  expect(hit===node||node.contains(hit),'Click target covered '+(node.id||selector));node.click();
 };
 const closeDialog=id=>{const node=$('#'+id);if(node?.open)click(node.querySelector('[data-close]'));};
 const closeAll=()=>{for(const dialog of document.querySelectorAll('dialog[open]'))click(dialog.querySelector('[data-close]'));};
 const canvasState=()=>{
  const canvas=$('#scene'),ctx=canvas.getContext('2d'),pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();let signature=2166136261;
  for(let i=0;i<pixels.length;i+=Math.max(4,Math.floor(pixels.length/8192/4)*4)){const color=(pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2];colors.add(color);signature=Math.imul(signature^color,16777619)>>>0;}
  return {width:canvas.width,height:canvas.height,distinctSampleColors:colors.size,signature:signature.toString(16)};
 };
 const report=(ok,error)=>{
  if(finished)return;finished=true;result.ok=ok;result.error=error?.message??null;result.elapsedMs=Math.round(performance.now()-started);
  result.acceptedTranscriptSteps=cursor;result.expectedTranscriptSteps=payload.scenario.steps.length;
  result.finalBalance=current.balance;result.finalRound=current.round?{id:current.round.round_id,status:current.round.status,payoutMinor:current.round.payoutMinor,currentCashoutMinor:current.round.currentCashoutMinor}:null;
  result.assetRequests=network.filter(row=>row.kind==='art').length;result.audioAssetRequests=network.filter(row=>row.kind==='art'&&row.path.endsWith('.mp3')).length;
  try{result.canvasFinal=canvasState();}catch(error){result.canvasFinalError=error.message;}
  let output=$('#zplay-browser-result');if(!output){output=document.createElement('pre');output.id='zplay-browser-result';output.hidden=true;document.body.append(output);}
  output.textContent=JSON.stringify(result);document.body.dataset.qa=ok?'done':'failed';
 };
 try{
  expect(location.protocol==='https:'||location.hostname==='127.0.0.1','Load an HTTPS fixture host before this bootstrap');
  const parsed=new DOMParser().parseFromString(payload.html,'text/html');
  for(const node of parsed.querySelectorAll('script,link[rel="stylesheet"]'))node.remove();
  document.documentElement.lang='en';document.head.replaceChildren(...[...parsed.head.childNodes].map(node=>document.importNode(node,true)));
  const style=document.createElement('style');style.textContent=payload.css;document.head.append(style);
  document.body.replaceChildren(...[...parsed.body.childNodes].map(node=>document.importNode(node,true)));
  document.body.dataset.qa='running';historyReplace();
  function historyReplace(){globalThis.history.replaceState(null,'','/games/'+payload.gameId);}
  try{localStorage.removeItem('zplay:multihot40:preferences');sessionStorage.removeItem('zplay-expansion:pending:v1:'+payload.gameId+':'+payload.sessionId);}catch{}
  const config=clone(payload.config),assetBase=new URL(payload.assetBase,location.href);config.referencePresentation.assetBaseURL=assetBase.href;
  const manifestURL=new URL(config.referencePresentation.manifestURL,location.origin),manifest=JSON.parse(payload.manifestText);
  globalThis.fetch=async(input,options={})=>{
   const url=new URL(typeof input==='string'?input:input?.url??String(input),location.href),method=String(options.method??input?.method??'GET').toUpperCase();
   try{
    if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
    if(url.origin===location.origin&&url.pathname==='/native-library/expansion/r1/games.json'){expect(method==='GET','Catalogue method');return json([config]);}
    if(url.href===manifestURL.href){expect(method==='GET','Manifest method');return new Response(payload.manifestText,{headers:{'content-type':'application/json'}});}
    if(url.origin===location.origin&&url.pathname==='/api/expansion/state'){
     expect(method==='GET'&&url.searchParams.get('game_id')===payload.gameId,'Unexpected state request');return json(current);
    }
    if(url.origin===location.origin&&url.pathname==='/api/expansion/history'){
     const sort=url.searchParams.get('sort')??'recent';expect(method==='GET'&&url.searchParams.get('game_id')===payload.gameId&&['recent','wins'].includes(sort),'Unexpected history request');
     return json({...history,sort});
    }
    if(url.origin===location.origin&&url.pathname==='/api/expansion/action'){
     expect(method==='POST','Unexpected action method');const headers=new Headers(options.headers??input?.headers);
     expect(headers.get('X-Zplay-Library-Session')===payload.sessionId,'Wrong fixture session');
     const body=JSON.parse(options.body??await input.clone().text()),key=body.request_id;
     expect(typeof key==='string'&&/^[a-f0-9-]{36}$/i.test(key),'Invalid browser request ID');
     const shape=fingerprint(body),existing=receipts.get(key);
     if(existing){expect(existing.fingerprint===shape,'Request ID reused with different action');actions.push({requestId:key,type:body.type,action:body.action??null,replayed:true});return json({...clone(existing.response),replayed:true,current_balance:current.balance});}
     const step=payload.scenario.steps[cursor];expect(step,'Unexpected extra financial action '+JSON.stringify(body));
     expect(shape===fingerprint(step.request),'Action mismatch: '+JSON.stringify({actual:body,expected:step.request}));
     const response=clone(step.response);response.request_id=key;
     receipts.set(key,{fingerprint:shape,response});current=clone(step.stateAfter);history=clone(step.historyAfter);cursor++;
     actions.push({requestId:key,type:body.type,action:body.action??null,options:body.options??null,input:body.input??null,replayed:false});
     await pause(100);return json(response);
    }
    if(method==='GET'&&url.origin===assetBase.origin&&url.pathname.startsWith(assetBase.pathname)){
     const name=url.pathname.slice(assetBase.pathname.length);expect(Object.hasOwn(manifest.files,name),'Unlisted artwork file '+name);
     const began=performance.now(),response=await realFetch(url.href,options);network.push({kind:'art',path:url.pathname,status:response.status,ms:Math.round(performance.now()-began)});
     return response;
    }
    throw Error('Unexpected private test fetch: '+method+' '+url.href);
   }catch(error){recordError('fetch-adapter',error);throw error;}
  };
  for(const item of payload.modules){
   const source=item.source.replace(/^(\s*import\s+(?:[^\n]*?\s+from\s+)?)(['"])([^'"]+)\2/gm,(whole,prefix,quote,specifier)=>{
    const dependency=item.dependencies[specifier];if(!dependency)return whole;const url=moduleURLs.get(dependency);expect(url,'Module order is invalid for '+dependency);return prefix+quote+url+quote;
   });
   moduleURLs.set(item.name,URL.createObjectURL(new Blob([source+'\n//# sourceURL=zplay-private-qa/'+item.name+'\n'],{type:'text/javascript'})));
  }
  await import(moduleURLs.get('client/multihot40-app.mjs'));
  await wait(()=>!$('#soundConsent').hidden&&$('#loadingStatus').textContent==='Ready','real artwork/font/audio load',45000);
  click('#soundNo');await wait(()=>$('#startup').hidden,'NO sound entry');await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
  result.canvasInitial=canvasState();expect(result.canvasInitial.distinctSampleColors>30,'Canvas did not render distinct artwork colours');checks.push('real canvas artwork loaded','sound NO entry');
  expect($('#accessibleBalance').textContent.includes(current.balance.replace(/\B(?=(\d{3})+(?!\d))/g,','))||$('#accessibleBalance').textContent.includes('ETB'),'Authenticated balance missing');
  click('#menu');expect($('#menuDialog').open,'Menu did not open');click('#openRules');expect($('#rulesDialog').open,'Rules did not open');
  expect($('#rulesContent').textContent.includes('95.9014892578125'),'Independent native RTP missing');expect($('#rulesContent').querySelectorAll('tbody tr').length===8,'Eight-symbol paytable missing');
  expect($('#rulesContent').querySelectorAll('svg').length===40,'Forty paylines missing');closeDialog('rulesDialog');checks.push('menu, native rules, public paytable and 40 paylines');
  click('#menu');click('#openSettings');expect($('#settingsDialog').open,'Settings did not open');
  const music=$('#musicSetting');click(music);expect(music.checked,'Music preference did not enable');click(music);expect(!music.checked,'Music preference did not disable');
  const turboSetting=$('#turboSetting');click(turboSetting);expect(turboSetting.checked,'Turbo preference did not enable');click(turboSetting);closeDialog('settingsDialog');
  click('#turbo');expect($('#turbo').getAttribute('aria-pressed')==='true','Turbo button did not enable');click('#turbo');expect($('#turbo').getAttribute('aria-pressed')==='false','Turbo button did not disable');
  click('#sound');expect($('#sound').getAttribute('aria-pressed')==='true','Sound preference did not enable');click('#sound');expect($('#sound').getAttribute('aria-pressed')==='false','Sound preference did not disable');checks.push('settings, music/sound preferences and turbo');
  if(!$('#bet').disabled){
   click('#bet');expect($('#betDialog').open,'Bet dialog did not open');expect($('#stakeOptions').children.length===config.stakeValues.length,'Stake schedule incomplete');
   click([...$('#stakeOptions').children].find(node=>node.textContent==='0.80 ETB'));click('#bet');click([...$('#stakeOptions').children].find(node=>node.textContent==='0.40 ETB'));
   expect($('#bet').getAttribute('aria-label').includes('0.40'),'Minimum stake was not restored');checks.push('bet menu and fixed stake selection');
  }else{expect(current.round?.status==='active','Bet unexpectedly disabled');checks.push('bet locked during accepted pending win');}
  async function inspectHistory(expectRows){
   const before=actions.length;click('#menu');click('#openHistory');await wait(()=>!$('#historyContent').textContent.includes('Loading your'),'history loaded');
   click('#historyBiggest');await wait(()=>$('#historyBiggest').getAttribute('aria-pressed')==='true'&&!$('#historyContent').textContent.includes('Loading your'),'biggest-wins tab');
   if(expectRows){const replay=[...$('#historyContent').querySelectorAll('button')].find(node=>node.textContent==='View');expect(replay,'Settled history row missing');click(replay);expect($('#historyContent').textContent.includes('Round '),'Replay missing');expect($('#historyContent').querySelectorAll('table tr').length===4,'Replay grid is not four rows');}
   closeDialog('historyDialog');expect(actions.length===before,'History/replay submitted a financial action');
  }
  await inspectHistory(payload.scenario.initialHistory.rows.length>0);checks.push('initial history and biggest-wins tab are read-only');
  async function finishSpin(target,{stop=true}={}){
   await wait(()=>cursor>=target,'accepted transcript start');
   if(stop&&$('#spin').getAttribute('aria-label')==='Stop animation'){
    const before=actions.length;click('#spin');await pause(40);expect(actions.length===before,'STOP created another wager');checks.push('STOP accelerates presentation only');
   }
   await wait(()=>$('#spin').getAttribute('aria-busy')==='false','real reel/wheel/win animation completed');
  }
  if(payload.scenarioName.startsWith('auto_collect_')){
   click('#auto');expect($('#autoDialog').open,'Autoplay dialog did not open');$('#autoCount').value='25';
   $('#autoWin').value=payload.scenarioName==='auto_collect_win'?'0.01':'';$('#autoLoss').value=payload.scenarioName==='auto_collect_two_losses'?'0.80':'';$('#autoGain').value='';
   click($('#autoForm').querySelector('button[type="submit"]'));
   await wait(()=>cursor===payload.scenario.steps.length&&$('#autoRunning').hidden&&$('#spin').getAttribute('aria-busy')==='false','autoplay configured stopping threshold',15000);
   expect(actions.every(action=>action.options?.autoCollect===true),'Autoplay did not request collection');await pause(200);expect(cursor===payload.scenario.steps.length,'Autoplay submitted after limit');checks.push('autoplay automatic collection and configured threshold stop');
  }else{
   let index=0;
   while(index<payload.scenario.steps.length){
    const step=payload.scenario.steps[index],body=step.request;
    if(body.type==='start'){click('#spin');await finishSpin(index+1);index++;}
    else if(body.action==='collect'&&payload.scenario.steps[index+1]?.request.type==='start'){
     const before=actions.length;click('#spin');await finishSpin(index+2);expect(actions[before].action==='collect'&&actions[before+1].type==='start','Next Spin did not collect before wagering');checks.push('next Spin collects before a new wager');index+=2;
    }else if(body.action==='collect'){
     click($('#gambleDialog').open?'#gambleCollect':'#collect');await wait(()=>cursor===index+1&&$('#collect').hidden,'accepted win collected');checks.push('Take Win collection');index++;
    }else if(body.action==='gamble'){
     click('#gamble');expect($('#gambleDialog').open,'Gamble dialog did not open');click('#'+body.input.color);
     await wait(()=>cursor===index+1&&$('#gambleCard').textContent!=='…','server gamble card');
     expect(/^A[♣♦♥♠]$/.test($('#gambleCard').textContent),'Four-suit Ace not displayed');checks.push('server-authoritative '+body.input.color+' gamble and card');index++;
    }else throw Error('Unsupported transcript runner action '+body.action);
   }
  }
  closeAll();await pause(100);expect(cursor===payload.scenario.steps.length,'Incomplete transcript sequence');
  expect(actions.filter(action=>!action.replayed).length===payload.scenario.steps.length,'Financial action count mismatch');
  await inspectHistory(history.rows.length>0);checks.push('settled history replay leaves the live round and wallet unchanged');
  const expectedFinal=payload.scenario.steps.at(-1)?.stateAfter??payload.scenario.initialState;
  expect(current.balance===expectedFinal.balance,'Final balance mismatch');expect(!errors.length,'Browser errors were captured');
  const fingerprintAfter=canvasState();expect(fingerprintAfter.distinctSampleColors>30,'Final canvas is blank');
  if(payload.scenario.initialState.round===null&&current.round)expect(fingerprintAfter.signature!==result.canvasInitial.signature,'Canvas did not change after server result');
  result.visibleControls=Object.fromEntries(['spin','auto','bet','menu','sound','turbo','collect','gamble'].map(id=>{const node=$('#'+id),r=node.getBoundingClientRect();return[id,{hidden:node.hidden,disabled:node.disabled,x:r.x,y:r.y,width:r.width,height:r.height}];}));
  report(true);
 }catch(error){recordError('runner',error);report(false,error);}
}

export async function buildCloudBrowser({scenario='manual_win_collect',assetBase=DEFAULT_ART,output}={}){
 const data=JSON.parse(await readFile(resolve(ROOT,'test/fixtures/multihot40-browser-transcripts.json'),'utf8'));
 assert.ok(data.scenarios[scenario],'Unknown local transcript scenario');const assetURL=new URL(assetBase);assert.equal(assetURL.protocol,'https:');assert.ok(assetURL.pathname.endsWith('/'));
 const sources=new Map();for(const name of MODULES)sources.set(name,await readFile(resolve(ROOT,name),'utf8'));
 const sourceHashes=Object.fromEntries([...sources].map(([name,source])=>[name,hash(source)]));
 const modules=[],done=new Set(),visiting=new Set();
 function visit(name){
  if(done.has(name))return;assert.ok(!visiting.has(name),'Circular fixture module graph');visiting.add(name);const source=sources.get(name);assert.equal(typeof source,'string','Missing fixture module '+name);const dependencies={};
  for(const match of source.matchAll(IMPORT)){const specifier=match[3];assert.ok(specifier.startsWith('.'),'External module in private bundle');const target=posix.normalize(posix.join(posix.dirname(name),specifier));assert.ok(sources.has(target),'Unknown private dependency '+target);dependencies[specifier]=target;visit(target);}
  visiting.delete(name);done.add(name);modules.push({name,source,dependencies});
 }
 visit('client/multihot40-app.mjs');assert.equal(modules.length,9);
 const html=await readFile(resolve(ROOT,'client/multihot40.html'),'utf8'),css=await readFile(resolve(ROOT,'client/multihot40.css'),'utf8');sourceHashes['client/multihot40.html']=hash(html);sourceHashes['client/multihot40.css']=hash(css);
 const payload={gameId:data.gameId,sessionId:data.sessionId,scenarioName:scenario,scenario:data.scenarios[scenario],config:data.catalogue[0],manifestText:data.manifestText,assetBase:assetURL.href,modules,html,css,sourceHashes};
 const content='void ('+browserBootstrap.toString()+')('+JSON.stringify(payload)+');';new vm.Script(content,{filename:'private-multihot40-browser-bootstrap.js'});
 const result={schemaVersion:1,scenario,privateBrowserFixtureOnly:true,productionFinancialRequestsAllowed:false,
  suggestedURL:assetURL.origin+'/native-expansion100/health',waitSelector:'body[data-qa="done"],body[data-qa="failed"]',timeoutMs:60000,
  resultSelector:'#zplay-browser-result',content,sha256:hash(content),sourceHashes};
 const target=output?resolve(output):resolve(ROOT,'test/fixtures/multihot40-cloud-'+scenario+'.bootstrap.json');await mkdir(dirname(target),{recursive:true});await writeFile(target,JSON.stringify(result)+'\n');
 return {output:target,bytes:Buffer.byteLength(JSON.stringify(result)),scenario,modules:modules.map(item=>item.name),sha256:result.sha256,suggestedURL:result.suggestedURL,waitSelector:result.waitSelector};
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const options={};for(const arg of process.argv.slice(2)){const match=arg.match(/^--(scenario|asset-base|out)=(.+)$/);if(!match)throw Error('Unknown private bundle argument');options[match[1]==='asset-base'?'assetBase':match[1]==='out'?'output':'scenario']=match[2];}
 console.log(JSON.stringify(await buildCloudBrowser(options)));
}
