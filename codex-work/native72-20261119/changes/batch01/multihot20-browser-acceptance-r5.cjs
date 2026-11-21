#!/usr/bin/env node
/*
 * Repeatable local acceptance of the ACTUAL Multi Hot 20 app/modules/assets.
 * QA ONLY: this process binds 127.0.0.1, blocks external browser requests and
 * uses an isolated in-memory fixture ledger. No real Player account, wallet,
 * network backend, RNG certification or official visual parity is tested.
 *
 * node multihot20-browser-acceptance-r5.cjs --assets /absolute/fresh-m20-media
 * Optional: --manifest /absolute/assets.json --output /tmp/m20-browser-qa
 *           --viewports 360x800,390x844,412x915,430x932,768x1024,1440x900,844x390
 *           --serve-only (loopback fixture for an authorized visible browser)
 */
'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const os=require('node:os');
const assert=require('node:assert/strict');
const {createHash,randomUUID}=require('node:crypto');
const {pathToFileURL}=require('node:url');
const argv=process.argv.slice(2),option=(name,fallback)=>{const i=argv.indexOf('--'+name);return i>=0?argv[i+1]:fallback};
const gameDir=path.join(__dirname,'multihot20'),mediaDir=option('assets',process.env.M20_QA_ASSETS);
const manifestPath=option('manifest',path.join(gameDir,'assets.json'));
const outputDir=option('output',path.join(os.tmpdir(),'zplay-m20-browser-qa-'+Date.now()));
const widths=option('viewports','360x800,390x844,412x915,430x932,768x1024,1440x900,844x390').split(',').map(pair=>{const [width,height]=pair.split('x').map(Number);assert.ok(width>=300&&height>=300,'invalid viewport');return{width,height}});
const FULL_WIDTH=Number(option('full-width','390'));
const SERVE_ONLY=argv.includes('--serve-only');
const PREFIX='/new74/multi-hot-20/',GAME_ID='fresh_multihot20',GUARD='c'.repeat(64);
const QA_CSS='/__m20_qa__/capture-label.css';
const QA_BADGE_CSS='#qa-capture-label{position:fixed;top:4px;left:4px;z-index:2147483647;background:#731111;color:white;font:10px sans-serif;padding:4px 6px;border-radius:3px;pointer-events:none}';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const money=c=>`${c/100n}.${String(c%100n).padStart(2,'0')}`;
const cents=s=>{assert.match(s,/^\d+\.\d{2}$/);return BigInt(s.replace('.',''))};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const json=(res,body,status=200)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-zplay-qa-fixture':'in-memory-only'});res.end(JSON.stringify(body))};
const report={schema:'zplay/multihot20-browser-acceptance/v1',startedAt:new Date().toISOString(),mode:'LOOPBACK_QA_FIXTURE',
 actualWalletAccess:false,productionMathCertification:false,officialVisualParity:false,physicalMobilePerformance:false,
 audioScope:'HTMLMediaElement decode/play and event mapping only; no audible waveform parity claim',
 mediaDirectory:mediaDir||null,manifestPath,outputDir,viewports:[],externalRequests:[],sourceDigests:{},errors:[]};
report.checkPlan={fullAcceptance:36,responsiveAndPlay:13,defaultSevenViewportTotal:114,
 scope:'Preserves the prior 93 checks, adds fresh receipt-line/layout and direct SOUND checks at all seven viewports, repeated multi-line presentation, four settled-result UI cancellations, MENU during NICE settlement and large AUTO keyboard stop. No provider wager-count, visual-tier or timing equivalence is inferred.'};
let server,browser,evaluator,reference,productionCSP;
const verifiedMediaDigests={};

async function readBody(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>65536)throw Error('BODY_TOO_LARGE')}return JSON.parse(text)}
function fixture(){
 const model={id:GAME_ID,title:'Multi Hot 20',reels:5,rows:3,paylines:20,enabled:true,freshReleaseReady:true,
  mathVersion:'QA_BROWSER_ONLY_v1',engineVersion:'QA_CAPTURED_EVALUATOR_v1',mathSha256:digest(Buffer.from('QA fixture: not an approved production probability model')),
  betLevels:['1.00','2.00','5.00','8.00','10.00','20.00'],symbols:Object.keys(reference.paytable),paytable:reference.paytable,
  features:{fixedPaylines:20,multipliers:[1,2,3,4,5],gamble:true,freeSpins:false},qaFixture:true};
 const f={balance:100000n,round:null,requests:[],ledger:[],rounds:new Map(),actions:new Map(),failNext:null,failNextAction:null,injectedFaults:[],responseDelay:90,model,
  outcome:'WIN',wheelMultiplier:1,remainingRounds:null};
 f.state=()=>({authenticated:true,sessionGuard:GUARD,currency:'ETB',balance:money(f.balance),game:model,round:f.round,qaFixture:true});
 f.spin=body=>{
  assert.equal(body.gameId,GAME_ID);assert.equal(body.sessionGuard,GUARD);assert.ok(model.betLevels.includes(body.bet));
  assert.equal(body.wheelMultiplier,undefined,'the QA server, never the browser, selects the fixture multiplier');
  assert.equal(body.outcome,undefined,'the QA server, never the browser, selects the fixture grid');
  for(const key of ['mathVersion','engineVersion','mathSha256'])assert.equal(body[key],model[key]);
  const existing=f.rounds.get(body.roundToken);
  if(existing){assert.equal(existing.bet,body.bet);return existing}
  if(body.replayOnly)throw Object.assign(Error('ROUND_NOT_FOUND_FOR_REPLAY'),{status:404});
  if(f.remainingRounds!==null&&f.remainingRounds<=0)throw Object.assign(Error('QA_ROUND_BUDGET_EXCEEDED'),{status:400});
  // Deliberate deterministic winning arrangement for UI acceptance only.
  // Actual integer evaluator computes the receipt; the browser does not.
  const grid=f.outcome==='LOSS'
   ?[['seven','watermelon','cherry','orange','lemon'],['bell','lemon','seven','grape','orange'],['grape','plum','bell','watermelon','cherry']]
   :[Array(5).fill(f.outcome==='NICE'?'bell':'cherry'),['bell','seven','lemon','plum','orange'],['grape','watermelon','orange','bell','seven']];
  const evaluated=evaluator({gameId:GAME_ID,grid,bet:body.bet,wheelMultiplier:f.wheelMultiplier});
  if(f.outcome==='LOSS')assert.equal(evaluated.finalWinCents,0n,'LOSS fixture must be nonwinning in the actual evaluator');
  const stake=cents(body.bet),payout=evaluated.finalWinCents,before=f.balance;
  if(f.outcome==='NICE')assert.equal(payout,20n*stake,'NICE fixture is a real evaluated20x grid, not a client-supplied payout');
  assert.ok(before>=stake);f.balance=before-stake+payout;
  if(f.remainingRounds!==null)f.remainingRounds--;
  const receipt={gameId:GAME_ID,roundId:randomUUID(),roundToken:body.roundToken,bet:body.bet,currency:'ETB',isFree:false,
   mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:model.mathSha256,
   grid:evaluated.grid,wheelMultiplier:evaluated.wheelMultiplier,winLines:evaluated.winLines,finalWin:evaluated.finalWin,
   features:{expandedWildReels:[]},walletReceipt:{currency:'ETB',balanceBefore:money(before),chargedStake:body.bet,finalWin:money(payout),balanceAfter:money(f.balance)},qaFixture:true};
  f.rounds.set(body.roundToken,receipt);f.ledger.push({kind:'BET',token:body.roundToken,amount:body.bet});
  if(payout)f.ledger.push({kind:'WIN',token:body.roundToken,amount:money(payout)});
  f.round={result:receipt,gamble:{attempt:0,stake:money(payout),available:payout>0n&&payout<=50000n,maxAttempts:5,maxStake:'500.00',reason:null}};
  return receipt;
 };
 f.gamble=body=>{
  assert.equal(body.gameId,GAME_ID);assert.equal(body.sessionGuard,GUARD);
  const saved=f.actions.get(body.roundToken);if(saved){assert.equal(saved.choice,body.choice);return saved}
  if(body.replayOnly)throw Object.assign(Error('ROUND_NOT_FOUND_FOR_REPLAY'),{status:404});
  assert.equal(body.roundId,f.round.result.roundId);assert.equal(body.expectedAttempt,f.round.gamble.attempt+1);
  assert.equal(body.expectedStake,f.round.gamble.stake);assert.ok(['RED','BLACK'].includes(body.choice));
  for(const key of ['mathVersion','engineVersion','mathSha256'])assert.equal(body[key],model[key]);
  const before=f.balance,stake=cents(body.expectedStake),color='RED',won=body.choice===color,payout=won?2n*stake:0n;
  assert.ok(before>=stake&&stake>0n&&stake<=50000n);f.balance=before-stake+payout;
  const receipt={kind:'GAMBLE',gameId:GAME_ID,actionId:randomUUID(),roundId:body.roundId,roundToken:body.roundToken,
   currency:'ETB',choice:body.choice,color,won,stake:money(stake),payout:money(payout),attempt:body.expectedAttempt,
   maxAttempts:5,maxStake:'500.00',balanceAfter:money(f.balance),
   mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:model.mathSha256,
   walletReceipt:{currency:'ETB',balanceBefore:money(before),chargedStake:money(stake),finalWin:money(payout),balanceAfter:money(f.balance)},qaFixture:true};
  f.actions.set(body.roundToken,receipt);f.ledger.push({kind:'GAMBLE_BET',token:body.roundToken,amount:money(stake)});
  if(payout)f.ledger.push({kind:'GAMBLE_WIN',token:body.roundToken,amount:money(payout)});
  f.round.gamble={...f.round.gamble,attempt:receipt.attempt,stake:money(payout),available:payout>0n&&receipt.attempt<5&&payout<=50000n,lastResult:receipt};
  return receipt;
 };
 return f;
}
let current;
async function verifyMedia(){
 assert.ok(mediaDir,'--assets must name the fresh verified media directory');
 const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 assert.equal(manifest.gameId,GAME_ID);
 const verified=new Map();
 for(const [file,record] of Object.entries(manifest.files)){
  assert.match(file,/^[a-z0-9][a-z0-9._-]*$/i);const bytes=await fs.readFile(path.join(mediaDir,file));
  assert.equal(bytes.length,record.bytes,'byte count: '+file);assert.equal(digest(bytes),record.sha256,'SHA256: '+file);
  verifiedMediaDigests[file]=record.sha256;
  verified.set(file,{bytes,mime:record.contentType});
 }
 report.assets={verifiedCount:verified.size,captureDate:manifest.captureDate,revision:manifest.revision,manifestSha256:digest(await fs.readFile(manifestPath)),sha256ByFile:{...verifiedMediaDigests},
  scope:'Integrity checks of supplied local media only. Capture freshness is not established by this harness; retained audio must keep its recorded provenance.'};
 return {manifest,verified};
}
async function serve(media){
 server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://127.0.0.1');
   if(url.pathname.startsWith('/api/')){
    const f=current,body=req.method==='POST'?await readBody(req):null;
    f.requests.push({method:req.method,path:url.pathname,query:url.search,body,at:Date.now()});
    if(req.method==='GET'&&url.pathname==='/api/slots/fresh-state'){assert.equal(url.searchParams.get('gameId'),GAME_ID);return json(res,f.state())}
    if(req.method==='POST'&&url.pathname==='/api/slots/spin'){
     const receipt=f.spin(body);await delay(f.responseDelay);
     if(f.failNext==='AFTER_COMMIT_503'&&!body.replayOnly){f.failNext=null;f.injectedFaults.push({path:url.pathname,status:503});return json(res,{detail:'QA_INJECTED_DISCONNECT_AFTER_COMMIT'},503)}
     return json(res,receipt);
    }
    if(req.method==='POST'&&url.pathname==='/api/slots/gamble'){
     const receipt=f.gamble(body);await delay(f.responseDelay);
     if(f.failNextAction==='AFTER_COMMIT_503'&&!body.replayOnly){f.failNextAction=null;f.injectedFaults.push({path:url.pathname,status:503});return json(res,{detail:'QA_INJECTED_X2_DISCONNECT_AFTER_COMMIT'},503)}
     return json(res,receipt);
    }
    return json(res,{detail:'QA_ROUTE_NOT_FOUND'},404);
   }
   if(url.pathname==='/favicon.ico'){res.writeHead(204);return res.end()}
   if(url.pathname===QA_CSS){res.writeHead(200,{'content-type':'text/css','cache-control':'no-store'});return res.end(QA_BADGE_CSS)}
   if(!url.pathname.startsWith(PREFIX)){res.writeHead(404);return res.end('Local QA game route only')}
   let relative=decodeURIComponent(url.pathname.slice(PREFIX.length))||'index.html';
   if(relative==='assets.json')return json(res,media.manifest);
   if(relative.startsWith('assets/')){
    const value=media.verified.get(relative.slice(7));if(!value){res.writeHead(404);return res.end('Missing verified asset')}
    res.writeHead(200,{'content-type':value.mime,'cache-control':'no-store'});return res.end(value.bytes);
   }
   assert.ok(!relative.includes('..')&&!path.isAbsolute(relative));
   let bytes=await fs.readFile(path.join(gameDir,relative));
   if(SERVE_ONLY&&relative==='index.html')bytes=Buffer.from(bytes.toString().replace('</head>','<link rel="stylesheet" href="'+QA_CSS+'"></head>').replace('<body>','<body><aside id="qa-capture-label">LOCAL QA — NO REAL FUNDS</aside>'));
   const mime={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'}[path.extname(relative)]||'application/octet-stream';
   res.writeHead(200,{'content-type':mime,'cache-control':'no-store',
    'content-security-policy':productionCSP});res.end(bytes);
  }catch(error){if(!res.headersSent)json(res,{detail:error.message},error.status||500);else res.end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return 'http://127.0.0.1:'+server.address().port;
}
function instrument(){
 const qa=window.__m20QA={raf:[],media:[],mediaErrors:[],held:[],holdAuto:false,sceneFrames:[],sceneSequence:0,backdropFrames:[],backdropSequence:0,crops:[],inputEvents:[],lineCaptions:[]};
 const traceInput=(event,windowEvent=false)=>{
  if(!windowEvent&&event.target?.id!=='spin')return;
  const spin=document.getElementById('spin');
  qa.inputEvents.push({event:event.type,at:performance.now(),pointerId:event.pointerId??null,pointerType:event.pointerType??null,
   buttons:event.buttons??null,detail:event.detail??null,target:windowEvent?'window':event.target.id,
   phase:document.getElementById('zplay')?.dataset.phase??null,disabled:spin?.disabled??null,
   texture:spin?.dataset.controlTexture??null,focused:document.activeElement?.id??null});
  if(qa.inputEvents.length>500)qa.inputEvents.shift();
 };
 for(const type of ['pointerdown','pointerup','pointercancel','pointerleave','lostpointercapture','focus','blur'])document.addEventListener(type,traceInput,true);
 window.addEventListener('blur',event=>traceInput(event,true));
 const originalRAF=window.requestAnimationFrame.bind(window),originalMicrotask=window.queueMicrotask.bind(window);
 window.requestAnimationFrame=callback=>{
  const sceneCall=new Error().stack?.includes('/scene.mjs');
  return originalRAF(time=>{if(sceneCall)qa.raf.push(time);const result=callback(time);if(sceneCall)sampleLineCaption();return result});
 };
 window.queueMicrotask=callback=>{
  if(qa.holdAuto&&new Error().stack?.includes('/controller.mjs'))qa.held.push(callback);else originalMicrotask(callback);
 };
 qa.releaseAuto=()=>{qa.holdAuto=false;for(const fn of qa.held.splice(0))originalMicrotask(fn)};
 const originalPlay=HTMLMediaElement.prototype.play,originalPause=HTMLMediaElement.prototype.pause;
 HTMLMediaElement.prototype.play=function(...args){
  const event={src:this.currentSrc||this.src,loop:this.loop};qa.media.push({...event,event:'play',at:performance.now()});
  const promise=originalPlay.apply(this,args);
  if(promise?.then)promise.then(()=>qa.media.push({...event,event:'play-resolved',at:performance.now()}),error=>qa.media.push({...event,event:'play-rejected',reason:error.name,at:performance.now()}));
  return promise;
 };
 HTMLMediaElement.prototype.pause=function(...args){qa.media.push({event:'pause',src:this.currentSrc||this.src,loop:this.loop,at:performance.now()});return originalPause.apply(this,args)};
 const NativeAudio=window.Audio;
 window.Audio=new Proxy(NativeAudio,{construct(target,args){const a=new target(...args);a.addEventListener('error',()=>qa.mediaErrors.push({src:a.currentSrc||a.src,code:a.error?.code}));return a}});
 // Observe successful native Canvas draws, not scene methods or a production
 // debug object. A wrong crop, fixed wheel or text replacement is observable
 // even when the app's own inspect()/state labels claim a correct result.
 const proto=CanvasRenderingContext2D.prototype,clear=proto.clearRect,draw=proto.drawImage,fillRect=proto.fillRect,fill=proto.fillText,stroke=proto.strokeText;
 const beginPath=proto.beginPath,pathStroke=proto.stroke,strokeRect=proto.strokeRect;
 const pathCommands=new WeakMap();
 const recordedFrames=canvas=>canvas.id==='reels'?qa.sceneFrames:canvas.id==='game-backdrop'?qa.backdropFrames:null;
 const sourceCrops=new WeakMap(),bitmapDigests=new WeakMap(),canvasDraws=new WeakMap(),matrix=context=>{const m=context.getTransform();return [m.a,m.b,m.c,m.d,m.e,m.f]};
 const box=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
 let previousCaptionKey=null;
 function sampleLineCaption(){
  const caption=document.getElementById('line-caption'),frame=qa.sceneFrames.at(-1);
  if(!caption||!frame)return;
  const rect=box(caption),visible=rect.width>0&&rect.height>0&&!caption.hidden&&getComputedStyle(caption).visibility!=='hidden';
  const text=visible?caption.innerText.trim():null,roundId=document.getElementById('zplay')?.dataset.roundId||null;
  frame.lineCaption=text;
  const key=JSON.stringify([roundId,text]);if(key===previousCaptionKey)return;previousCaptionKey=key;
  const symbols=visible?[...caption.querySelectorAll('canvas[data-line-symbol]')].map(canvas=>{
   const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let opaque=0;
   for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)opaque++;
   return {symbol:canvas.dataset.lineSymbol||null,bitmap:[canvas.width,canvas.height],box:box(canvas),opaque,draw:canvasDraws.get(canvas)||null};
  }):[];
  const footer=document.getElementById('win-banner'),stage=document.getElementById('reels'),ledger=document.querySelector('.ledger');
  const balancePanel=document.querySelector('.balance-panel'),betPanel=document.getElementById('bet-panel');
  qa.lineCaptions.push({at:performance.now(),roundId,text,frameSequence:frame.sequence,visible,box:rect,
   line:Number(caption.dataset.line)||null,captionRoundId:caption.dataset.roundId||null,
   symbolGroupLabel:caption.querySelector('[role="img"]')?.getAttribute('aria-label')||null,
   children:visible?[...caption.children].map(element=>({text:element.innerText,box:box(element)})):[],
   footer:footer&&box(footer),stage:stage&&box(stage),ledger:ledger&&box(ledger),footerInLedger:!!ledger?.contains(footer),
   balancePanel:balancePanel&&box(balancePanel),betPanel:betPanel&&box(betPanel),
   // Preserve this actual transition frame independently of the rolling
   // 600-frame buffer; a faster display must not erase an earlier line.
   nativeFrame:visible?JSON.parse(JSON.stringify(frame)):null,
   symbols,viewport:{width:innerWidth,height:innerHeight}});
 }
 const originalBitmap=window.createImageBitmap.bind(window);
 window.createImageBitmap=async function(...args){
  const bitmap=await originalBitmap(...args);
  if(args[0] instanceof Blob){
   const hash=await crypto.subtle.digest('SHA-256',await args[0].arrayBuffer());
   bitmapDigests.set(bitmap,Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join(''));
  }
  return bitmap;
 };
 proto.clearRect=function(...args){
  const result=clear.apply(this,args);
  const frames=recordedFrames(this.canvas);
  if(frames){
   const rect=this.canvas.getBoundingClientRect();
   const frame={sequence:this.canvas.id==='reels'?++qa.sceneSequence:++qa.backdropSequence,at:performance.now(),draws:[],texts:[],fills:[],strokedRects:[],strokedPaths:[],width:this.canvas.width,height:this.canvas.height,
    phase:document.getElementById('zplay')?.dataset.phase??null,
    css:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}};
   frames.push(frame);if(frames.length>600)frames.shift();
  }
  return result;
 };
 proto.drawImage=function(image,...args){
  const result=draw.call(this,image,...args),width=image.naturalWidth??image.width,height=image.naturalHeight??image.height;
  const transform=matrix(this),sourceSha256=bitmapDigests.get(image)||sourceCrops.get(image)?.sourceSha256||null;
  canvasDraws.set(this.canvas,{width,height,args,transform,sourceSha256,crop:sourceCrops.get(image)||null});
  const frames=recordedFrames(this.canvas);
  if(frames){
   const frame=frames.at(-1);if(frame)frame.draws.push({width,height,args,transform,alpha:this.globalAlpha,sourceSha256,crop:sourceCrops.get(image)||null});
  }else if(args.length===8&&this.canvas instanceof HTMLCanvasElement&&!sourceCrops.has(this.canvas)){
   const pixels=this.getImageData(0,0,this.canvas.width,this.canvas.height).data,step=Math.max(1,Math.floor(pixels.length/4/4096));
   let visible=0,sampled=0;const colours=new Set();
   for(let p=0;p<pixels.length;p+=step*4){sampled++;if(pixels[p+3]){visible++;if(colours.size<256)colours.add([pixels[p],pixels[p+1],pixels[p+2],pixels[p+3]].join(','))}}
   const crop={width:this.canvas.width,height:this.canvas.height,sourceWidth:width,sourceHeight:height,sourceSha256,args,transform,
    pixels:{sampled,visible,colours:colours.size}};
   sourceCrops.set(this.canvas,crop);qa.crops.push(crop);
  }
  return result;
 };
 proto.fillRect=function(...args){const result=fillRect.apply(this,args);recordedFrames(this.canvas)?.at(-1)?.fills.push({args,transform:matrix(this)});return result};
 // Observe native winning-cell outlines and the path actually painted between
 // them. Receipt coordinates are checked outside the page; no scene internals
 // or production debug labels determine what the test calls a winning line.
 proto.beginPath=function(...args){const result=beginPath.apply(this,args);pathCommands.set(this,[]);return result};
 for(const name of ['moveTo','lineTo','rect','closePath']){
  const original=proto[name];
  proto[name]=function(...args){const result=original.apply(this,args);pathCommands.get(this)?.push({name,args,transform:matrix(this)});return result};
 }
 proto.stroke=function(...args){
  const result=pathStroke.apply(this,args);
  recordedFrames(this.canvas)?.at(-1)?.strokedPaths.push({commands:(pathCommands.get(this)||[]).map(command=>({...command,args:[...command.args],transform:[...command.transform]})),
   transform:matrix(this),alpha:this.globalAlpha,lineWidth:this.lineWidth,colour:String(this.strokeStyle)});
  return result;
 };
 proto.strokeRect=function(...args){
  const result=strokeRect.apply(this,args);
  recordedFrames(this.canvas)?.at(-1)?.strokedRects.push({args,transform:matrix(this),alpha:this.globalAlpha,lineWidth:this.lineWidth,colour:String(this.strokeStyle)});
  return result;
 };
 for(const [name,original]of [['fillText',fill],['strokeText',stroke]])proto[name]=function(text,...args){
  const result=original.call(this,text,...args);if(this.canvas.id==='reels')qa.sceneFrames.at(-1)?.texts.push(String(text));return result;
 };
}
const count=(f,pathname)=>f.requests.filter(r=>r.method==='POST'&&r.path===pathname).length;
async function ready(page){await page.waitForFunction(()=>{const b=document.getElementById('spin');return b&&!b.disabled&&document.getElementById('zplay')?.dataset.phase==='ready'&&document.getElementById('auto')?.dataset.active!=='true'&&!/STOP/.test(b.textContent)&&!document.getElementById('loading')?.offsetHeight},{},{timeout:20000})}
async function close(page,id){const dialog=page.locator('#'+id);if(!await dialog.isVisible())return;const button=dialog.getByRole('button',{name:/^close/i}).first();if(await button.count())await button.click();else await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})}
async function audit(page,label,result){
 const value=await page.evaluate(()=>{
  const scope=document.querySelector('dialog[open]')||document.querySelector('main')||document.body;
  const boxes=[...scope.querySelectorAll('button,select,input,a[href]')].map(element=>{
   const target=element.matches('input[type=checkbox]')?element.closest('label')||element:element;
   const r=target.getBoundingClientRect(),style=getComputedStyle(target);
   return {target,id:element.id||element.getAttribute('aria-label')||element.textContent.trim(),x:r.x,y:r.y,w:r.width,h:r.height,visible:r.width>0&&r.height>0&&style.visibility!=='hidden'&&style.display!=='none'};
  }).filter(b=>b.visible);
  const overlap=[];
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const a=boxes[i],b=boxes[j];if(a.target.contains(b.target)||b.target.contains(a.target))continue;const w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
   if(w>2&&h>2)overlap.push([a.id,b.id]);
  }
  // Rounded controls can have intersecting rectangular bounds while their
  // actual pointer areas remain separate. Test reachable control centres too.
  const occluded=boxes.filter(b=>{
   const x=b.x+b.w/2,y=b.y+b.h/2;
   if(x<0||x>=innerWidth||y<0||y>=innerHeight)return false;
   for(let parent=b.target.parentElement;parent;parent=parent.parentElement){
    const r=parent.getBoundingClientRect(),style=getComputedStyle(parent);
    if(['auto','scroll','hidden','clip'].includes(style.overflowY)&&(y<r.top+parent.clientTop||y>=r.top+parent.clientTop+parent.clientHeight))return false;
    if(['auto','scroll','hidden','clip'].includes(style.overflowX)&&(x<r.left+parent.clientLeft||x>=r.left+parent.clientLeft+parent.clientWidth))return false;
   }
   const hit=document.elementFromPoint(x,y);
   return !hit||!b.target.contains(hit);
  }).map(b=>b.id);
  const nestedOverflow=[scope,...scope.querySelectorAll('*')].filter(element=>{
   const r=element.getBoundingClientRect(),style=getComputedStyle(element);
   return r.width>=44&&r.height>0&&['auto','scroll','hidden','clip'].includes(style.overflowX)&&element.scrollWidth>element.clientWidth+1;
  }).map(element=>({id:element.id||element.className||element.tagName,width:element.clientWidth,contentWidth:element.scrollWidth}));
  // A canvas can obscure the top of a ledger panel without blocking the
  // panel centre. Keep this structural separation distinct from rounded
  // button bounds, which may legitimately intersect in their empty corners.
  const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
  const stage=scope.querySelector('#reels'),stageBox=stage&&rect(stage);
  const ledgerPanels=[...scope.querySelectorAll('.balance-panel,.bet-panel,#win-banner')].map(element=>({id:element.id||element.className,...rect(element)})).filter(panel=>panel.w>0&&panel.h>0);
  const stageLedgerOverlaps=stageBox?ledgerPanels.map(panel=>({id:panel.id,
   width:Math.min(stageBox.x+stageBox.w,panel.x+panel.w)-Math.max(stageBox.x,panel.x),
   height:Math.min(stageBox.y+stageBox.h,panel.y+panel.h)-Math.max(stageBox.y,panel.y)}))
   .filter(overlap=>overlap.width>1&&overlap.height>1):[];
  const shortLandscape=!!stage&&innerWidth>innerHeight&&innerHeight<=600;
  const landscapeClipped=shortLandscape?[...document.querySelectorAll('.game-frame,.play-controls,.ledger,.statusbar')]
   .map(element=>({id:element.id||element.className,...rect(element)}))
   .filter(r=>r.w>0&&r.h>0&&(r.x<-.5||r.y<-.5||r.x+r.w>innerWidth+1||r.y+r.h>innerHeight+1)):[];
  return {overflow:document.documentElement.scrollWidth>innerWidth+1,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
   minWidth:Math.min(...boxes.map(x=>x.w)),minHeight:Math.min(...boxes.map(x=>x.h)),smallTargets:boxes.filter(b=>b.w<43.5||b.h<43.5).map(({target,...b})=>b),boundingIntersections:overlap,occluded,nestedOverflow,
   stageBox,ledgerPanels,stageLedgerOverlaps,shortLandscape,landscapeClipped};
 });
 result.layouts.push({label,...value});assert.equal(value.overflow,false,label+' horizontal overflow');
 assert.deepEqual(value.smallTargets,[],label+' touch targets below 44px');assert.deepEqual(value.occluded,[],label+' controls cannot receive a centre tap');
 assert.deepEqual(value.nestedOverflow,[],label+' horizontal overflow inside a clipped or scrolling panel');
 assert.deepEqual(value.stageLedgerOverlaps,[],label+' stage overlaps BALANCE, WIN or BET panel');
 assert.deepEqual(value.landscapeClipped,[],label+' short landscape stage/controls/ledger/status must fit the viewport');
}
async function screenshot(page,result,label){
 const file=path.join(outputDir,result.name+'-'+label+'.png');
 await page.evaluate(async href=>{
  if(!document.getElementById('qa-capture-style')){
   const link=document.createElement('link');link.id='qa-capture-style';link.rel='stylesheet';link.href=href;
   await new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=()=>reject(Error('QA_CAPTURE_STYLESHEET_BLOCKED'));document.head.append(link)});
  }
  const badge=document.createElement('div');badge.id='qa-capture-label';badge.textContent='LOCAL QA — NO REAL FUNDS';document.body.append(badge);
 },QA_CSS);
 await page.screenshot({path:file,fullPage:true});await page.locator('#qa-capture-label').evaluate(e=>e.remove());result.screenshots.push(file);
}
async function observe(page){return page.evaluate(()=>({raf:__m20QA.raf,media:__m20QA.media,mediaErrors:__m20QA.mediaErrors,lineCaptions:__m20QA.lineCaptions}))}

// Independent captured Images-0..3 metadata. These are visual expectations;
// the test never imports the app's CONTROL_TEXTURES or selector implementation.
const CONTROL_REFERENCE={};
function capturedControl(names,atlas,x,y,w,h,rotated=false,trimX=0,trimY=0,sourceW=w,sourceH=h){
 for(const name of names.split(','))CONTROL_REFERENCE['Buttons/'+name]={atlas,x,y,w,h,rotated,trimX,trimY,sourceW,sourceH};
}
capturedControl('Spin,SpinDisabled',2,1593,1534,255,255,false,12,12,279,279);
capturedControl('SpinActive,SpinHover',2,868,1751,255,255,false,12,12,279,279);
capturedControl('SpinStop',2,1125,1751,255,255,false,12,12,279,279);
capturedControl('SpinTurbo,SpinTurboHover',2,1580,1791,255,255,false,12,12,279,279);
capturedControl('SpinTurboStop,SpinTurboStopHover',2,1080,1,255,255,false,12,12,279,279);
capturedControl('AutoPlay',3,927,1539,136,135,false,4,6,141,141);
capturedControl('AutoPlayActive,AutoPlayHover',3,545,1715,136,135,false,4,6,141,141);
capturedControl('AutoPlayDisabled',3,683,1715,136,135,false,4,6,141,141);
capturedControl('AutoPlayStop',2,1850,1608,141,141);
capturedControl('AutoPlayStopActive,AutoPlayStopHover',3,383,1769,141,141);
capturedControl('AutoPlayStopDisabled',3,788,1554,137,137,false,3,3,141,141);
capturedControl('Bet',3,821,1693,133,134);
capturedControl('BetActive,BetHover',3,956,1676,133,134);
capturedControl('BetDisabled',3,956,1812,133,134,true);
capturedControl('QuickPlay,QuickPlayDisabled',0,875,1984,61,75,true,12,18,84,99);
capturedControl('QuickPlayActive,QuickPlayTurbo',1,1820,1933,82,96,true,1,1,84,99);
capturedControl('QuickPlayHover',1,1719,1933,84,99,true);
capturedControl('Menu,MenuDisabled',0,1,1984,48,33);
capturedControl('MenuActive,MenuHover',0,51,1984,48,33);
capturedControl('SoundOff',0,1817,1984,48,37,true,0,0,48,38);
capturedControl('SoundOffActive,SoundOffHover,SoundOffDisabled',0,1856,1984,48,37,true,0,0,48,38);
capturedControl('SoundOn',0,1934,1984,38,37,true,0,0,48,38);
capturedControl('SoundOnActive,SoundOnHover',0,1747,1667,38,37,true,0,0,48,38);
capturedControl('SoundOnDisabled',0,1707,1667,39,38,true,0,0,48,38);
capturedControl('Double,DoubleActive',1,1936,1407,111,110,true);
capturedControl('DoubleHover',1,1936,1520,111,110,true);
capturedControl('DoubleTake',1,1936,1633,110,110);
capturedControl('DoubleTakeActive,DoubleTakeHover',1,1936,1745,110,110);
capturedControl('DoubleDisabled,DoubleTakeDisabled',0,2039,860,1,1);
const UNREACHABLE_CONTROL_TEXTURES=['Buttons/SpinTurboStopHover','Buttons/AutoPlayStopDisabled','Buttons/MenuDisabled','Buttons/SoundOffDisabled','Buttons/SoundOnDisabled','Buttons/DoubleDisabled','Buttons/DoubleTakeDisabled'];
const CONTROL_IDS=['spin','auto','bet','turbo','menu','sound'];
const IDLE_CONTROLS={spin:'Buttons/Spin',auto:'Buttons/AutoPlay',bet:'Buttons/Bet',turbo:'Buttons/QuickPlay',menu:'Buttons/Menu',sound:'Buttons/SoundOff'};
const ATLAS_DIMENSIONS=[[2047,2047],[2047,2025],[2047,2047],[1093,1946]];
const closeNumber=(actual,expected,label,tolerance=.0001)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,`${label}: ${actual} versus ${expected}`);
async function controls(page,result,label,expected){
 const snapshots=await page.evaluate(ids=>ids.map(id=>{
  const button=document.getElementById(id),art=button.querySelector('[data-control-art]'),crop=art?.querySelector('svg'),image=crop?.querySelector('image');
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
  const values=(e,name)=>e?.getAttribute(name)?.trim().split(/[\s,]+/).map(Number);
  const matrix=m=>m?[m.a,m.b,m.c,m.d,m.e,m.f]:null;
  const style=art&&getComputedStyle(art),buttonStyle=getComputedStyle(button),label=id==='spin'?document.getElementById('spin-label'):null;
  return {id,name:button.dataset.controlTexture,disabled:button.disabled,accessible:button.getAttribute('aria-label'),
   tag:art?.tagName,texture:art?.dataset.texture,autoplay:art?.dataset.autoplay==='true',viewBox:values(art,'viewBox'),button:rect(button),art:art&&rect(art),
   crop:crop&&{x:Number(crop.getAttribute('x')),y:Number(crop.getAttribute('y')),w:Number(crop.getAttribute('width')),h:Number(crop.getAttribute('height')),
    viewBox:values(crop,'viewBox'),overflow:crop.getAttribute('overflow')},
   image:image&&{href:image.getAttribute('href'),w:Number(image.getAttribute('width')),h:Number(image.getAttribute('height')),transform:matrix(image.transform.baseVal.consolidate()?.matrix)},
   screen:art&&matrix(art.getScreenCTM()),style:style&&{opacity:style.opacity,filter:style.filter,pointerEvents:style.pointerEvents},
   buttonStyle:{opacity:buttonStyle.opacity,filter:buttonStyle.filter},
   label:label&&{text:label.textContent,rect:rect(label),fontSize:parseFloat(getComputedStyle(label).fontSize),whiteSpace:getComputedStyle(label).whiteSpace,srOnly:label.classList.contains('sr-only')},
   autoplayParts:art?[...art.querySelectorAll('[data-autoplay-base],[data-autoplay-centre]')].map(part=>{
    const img=part.querySelector('image');return {part:part.dataset.autoplayBase||(part.dataset.autoplayCentre==='true'?'centre':null),
     x:Number(part.getAttribute('x')),y:Number(part.getAttribute('y')),w:Number(part.getAttribute('width')),h:Number(part.getAttribute('height')),
     viewBox:values(part,'viewBox'),overflow:part.getAttribute('overflow'),image:img&&{href:img.getAttribute('href'),w:Number(img.getAttribute('width')),h:Number(img.getAttribute('height')),transform:matrix(img.transform.baseVal.consolidate()?.matrix)}};
   }):[]};
 }),Object.keys(expected));
 for(const s of snapshots){
  assert.equal(s.name,expected[s.id],label+' '+s.id+' state texture');assert.equal(s.texture,s.name);
  const e=CONTROL_REFERENCE[s.name];assert.ok(e,label+' unknown capture '+s.name);
  assert.equal(s.tag,'svg');assert.ok(s.accessible?.trim(),label+' accessible control label');
  assert.deepEqual(s.viewBox,[0,0,e.sourceW,e.sourceH]);
  if(s.autoplay){
   assert.equal(s.id,'spin');assert.equal(s.name,'Buttons/SpinStop');
   const slices={top:[12,12,255,96,1125,1751],left:[12,108,96,64,1125,1847],
    right:[172,108,95,64,1285,1847],bottom:[12,172,255,95,1125,1911],centre:[108,108,64,64,964,1847]};
   assert.deepEqual(s.autoplayParts.map(part=>part.part).sort(),Object.keys(slices).sort(),'AUTO uses four disjoint original disk regions and one clean original centre');
   for(const part of s.autoplayParts){
    const [x,y,w,h,sx,sy]=slices[part.part];
    assert.deepEqual([part.x,part.y,part.w,part.h],[x,y,w,h]);assert.deepEqual(part.viewBox,[0,0,w,h]);assert.equal(part.overflow,'hidden');
    assert.deepEqual([part.image.w,part.image.h],[2047,2047]);
    assert.equal(new URL(part.image.href).pathname,PREFIX+'assets/atlas-2.png');
    assert.deepEqual(part.image.transform,[1,0,0,1,-sx,-sy],'AUTO region uses the reviewed original pixels');
   }
   assert.equal(s.autoplayParts.reduce((area,part)=>area+part.w*part.h,0),255*255,'AUTO centre is replaced once, never translucent overpaint');
   for(let i=0;i<s.autoplayParts.length;i++)for(let j=i+1;j<s.autoplayParts.length;j++){
    const a=s.autoplayParts[i],b=s.autoplayParts[j];
    assert.ok(Math.min(a.x+a.w,b.x+b.w)<=Math.max(a.x,b.x)||Math.min(a.y+a.h,b.y+b.h)<=Math.max(a.y,b.y),'AUTO original regions cannot overlap');
   }
   assert.match(s.label.text,/^\d+$/,'large AUTO label is the remaining count');assert.equal(s.label.srOnly,false);
   assert.ok(s.label.rect.w>8&&s.label.rect.h>=16,'remaining count is actually visible');
   closeNumber(s.label.rect.x+s.label.rect.w/2,s.button.x+s.button.w/2,'AUTO count centred horizontally',1.5);
   closeNumber(s.label.rect.y+s.label.rect.h/2,s.button.y+s.button.h/2,'AUTO count centred vertically',1.5);
  }else{
   assert.deepEqual(s.autoplayParts,[],'ordinary control has no AUTO overlay');
   assert.deepEqual(s.crop,{x:e.trimX,y:e.trimY,w:e.w,h:e.h,viewBox:[0,0,e.w,e.h],overflow:'hidden'});
   assert.deepEqual([s.image.w,s.image.h],ATLAS_DIMENSIONS[e.atlas]);
   assert.equal(new URL(s.image.href).pathname,PREFIX+'assets/atlas-'+e.atlas+'.png');
   assert.deepEqual(s.image.transform,e.rotated?[0,-1,1,0,-e.y,e.x+e.h]:[1,0,0,1,-e.x,-e.y]);
  }
  assert.ok(s.button.w>=43.5&&s.button.h>=43.5,label+' minimum touch geometry');
  assert.ok(s.art.w>=22&&s.art.h>=22,label+' actual SVG has visible render dimensions');
  assert.ok(s.art.x>=s.button.x-.5&&s.art.y>=s.button.y-.5&&s.art.x+s.art.w<=s.button.x+s.button.w+.5&&s.art.y+s.art.h<=s.button.y+s.button.h+.5,label+' artwork stays inside its button');
  assert.ok(s.screen[0]>0&&s.screen[3]>0);closeNumber(s.screen[0],s.screen[3],label+' uniform artwork scale',.001);
  closeNumber(s.screen[1],0,label+' upright control');closeNumber(s.screen[2],0,label+' upright control');
  assert.equal(s.style.opacity,'1');assert.equal(s.style.filter,'none');assert.equal(s.style.pointerEvents,'none');
  assert.equal(s.buttonStyle.opacity,'1',label+' real disabled artwork is not artificially faded');assert.equal(s.buttonStyle.filter,'none',label+' captured active artwork has no extra brightness filter');
  if(s.id==='spin'&&!s.name.includes('Stop')){
   assert.deepEqual(s.label.text.split('\n'),['HOLD','&','SPIN'],'idle HOLD label keeps the three observed compact lines');
   assert.equal(s.label.whiteSpace,'pre-line');
   assert.ok(s.label.fontSize<=Math.min(s.button.w,s.button.h)*.1+.5,'HOLD text fits the centre of the original arrow ring');
   assert.ok(s.label.rect.h>=s.label.fontSize*2.8&&s.label.rect.h<=s.label.fontSize*4.2,'three visible label lines');
  }
 }
 result.controlStates.push({label,controls:snapshots});return snapshots;
}
async function moveAway(page){await page.mouse.move(1,1)}
async function pointerStates(page,f,result,id,base){
 const before=f.requests.filter(r=>r.method==='POST').length;
 await moveAway(page);await controls(page,result,id+' idle',{[id]:'Buttons/'+base});
 const button=page.locator('#'+id),box=await button.boundingBox();assert.ok(box);
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await controls(page,result,id+' hover',{[id]:'Buttons/'+base+'Hover'});
 if(id==='spin'){
  // Pointer down now starts a legitimate HOLD round. Exercise its separate
  // keyboard pressed state, then Tab away before keyup so this probe is read-only.
  await button.focus();await page.keyboard.down('Space');
  try{await controls(page,result,id+' pressed',{[id]:'Buttons/'+base+'Active'});await page.keyboard.press('Tab')}
  finally{await page.keyboard.up('Space')}
 }else{
  await page.mouse.down();
  try{await controls(page,result,id+' pressed',{[id]:'Buttons/'+base+'Active'});await moveAway(page)}
  finally{await page.mouse.up()}
 }
 await moveAway(page);assert.equal(f.requests.filter(r=>r.method==='POST').length,before,id+' state probes cannot wager');
}
async function assertNoHelpArt(page){
 const obsolete=await page.evaluate(()=>{
  const names=/\/(?:spin-button|auto-button|bet-button|turbo-button|menu-button|sound-button|sound-off-button|sound-on-button)\.png(?:$|[?#])/;
  return [...new Set([...performance.getEntriesByType('resource').map(r=>r.name),...[...document.querySelectorAll('img[src],svg image[href]')].map(e=>e.getAttribute('src')||e.getAttribute('href'))])].filter(url=>names.test(url));
 });
 assert.deepEqual(obsolete,[],'annotated help illustrations cannot serve as gameplay controls');
}

const SYMBOL_SIZES={seven:[225,264],bell:[217,243],grape:[230,235],watermelon:[232,209],cherry:[218,244],orange:[214,248],plum:[197,263],lemon:[220,243]};
const SYMBOL_REGIONS={seven:[2047,2047,1337,1,264,225,-1],bell:[1093,1946,612,1335,243,217,-1],
 grape:[1093,1946,612,1098,230,235,0],watermelon:[2047,2047,1837,1791,209,232,-1],
 cherry:[1093,1946,1,1657,218,244,0],orange:[1093,1946,844,1098,248,214,-1],
 plum:[2047,2025,1514,586,197,263,0],lemon:[2047,2047,1603,1,243,220,-1]};
const SYMBOL_ATLASES={seven:'atlas-2.png',bell:'atlas-3.png',grape:'atlas-3.png',watermelon:'atlas-2.png',cherry:'atlas-3.png',orange:'atlas-3.png',plum:'atlas-1.png',lemon:'atlas-2.png'};
// Independently checked visible-pixel regions in the retained original WIN
// images. These assert actual native crops, not the scene's own tier labels.
const WIN_REGIONS={
 nice:['wins.png',2042,2010,240,1861,264,105],win:['wins.png',2042,2010,2,1881,236,100],
 crown:['wins.png',2042,2010,711,1961,60,48],money:['wins.png',2042,2010,576,1080,430,155],
 coin:['wins.png',2042,2010,1400,1911,105,97],frame:['wins2.png',1529,847,869,30,399,379],
 backlight:['wins2.png',1529,847,7,7,855,834],shine:['wins2.png',1529,847,881,428,391,397],
 big:['wins.png',2042,2010,1645,1908,198,100],super:['wins.png',2042,2010,1062,1800,344,109],
 fantastic:['wins.png',2042,2010,786,1683,537,115]
};
function winDraws(frame){return frame.draws.filter(draw=>['wins.png','wins2.png'].some(file=>draw.sourceSha256===verifiedMediaDigests[file]))}
function inspectWinSprites(frame,receipt,{complete=false}={}){
 const draws=winDraws(frame),parts=[];
 if(!draws.length){assert.deepEqual(frame.texts,[],'wheel/title/symbols use original pixels, never generated labels');return parts}
 assert.ok(receipt,'WIN imagery needs an accepted server receipt');
 assert.equal(frame.phase,'spinning','original win presentation keeps the controller spin pending');
 const multiple=cents(receipt.finalWin)/cents(receipt.bet),tier=multiple>=100n?'fantastic':multiple>=50n?'super':multiple>=25n?'big':multiple>=10n?'nice':null;
 assert.ok(tier,'ordinary wins must not acquire a high-win visual tier');
 for(const draw of draws){
  const match=Object.entries(WIN_REGIONS).find(([,r])=>draw.sourceSha256===verifiedMediaDigests[r[0]]&&draw.width===r[5]&&draw.height===r[6]);
  assert.ok(match,'WIN bitmap has a recognized original crop');const [name,[file,sw,sh,x,y,w,h]]=match;
  assert.equal(draw.sourceSha256,verifiedMediaDigests[file]);
  assert.deepEqual([draw.crop?.sourceWidth,draw.crop?.sourceHeight],[sw,sh]);
  assert.deepEqual(draw.crop.args,[x,y,w,h,0,0,w,h],'original WIN source pixels');
  assert.deepEqual(draw.crop.transform,[1,0,0,1,0,0],'WIN source crop stays upright');
  assert.ok(draw.crop.pixels.visible>0&&draw.crop.pixels.colours>2,'WIN source contains visible coloured artwork');
  assert.equal(draw.args.length,4);assert.ok(draw.args[2]>0&&draw.args[3]>0&&draw.alpha>0,'WIN sprite is actually drawn visibly');
  closeNumber(draw.args[2]/draw.args[3],w/h,'WIN sprite preserves source proportions');
  if(!['backlight','shine'].includes(name))closeNumber(angle(draw),0,'WIN foreground sprite stays upright');
  if(['nice','big','super','fantastic'].includes(name))assert.equal(name,tier,'visual tier follows the accepted finalWin/bet');
  parts.push({name,alpha:draw.alpha,args:draw.args,transform:draw.transform,crop:draw.crop});
 }
 // This is the sole text exception: a money label with the exact accepted
 // amount, beside verified original WIN sprites. It cannot replace ring
 // numerals, the title, or the NICE/WIN artwork with generated labels.
 for(const text of frame.texts)assert.equal(text,receipt.finalWin+' ETB','WIN amount is the exact accepted receipt string');
 if(frame.texts.length){assert.equal(frame.texts.length,1);assert.ok(parts.some(p=>p.name==='money'))}
 if(complete){
  for(const name of [tier,'win','crown','money','coin','frame','backlight','shine'])assert.ok(parts.some(part=>part.name===name),'fully composed WIN includes '+name);
  assert.deepEqual(frame.texts,[receipt.finalWin+' ETB']);
  for(const name of [tier,'win','crown','money','coin','frame'])assert.ok(parts.some(part=>part.name===name&&part.alpha>.95),name+' fully visible');
 }
 return parts;
}
const TAU=2*Math.PI,WHEEL_STEP=TAU/14,STOP_SECTORS={1:11,2:0,3:5,4:10,5:13};
const angle=draw=>Math.atan2(draw.transform[1],draw.transform[0]);
const angleDistance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function wheelParts(frame,receipt){
 const region=(draw,x,y,w,h)=>draw.args.length===8&&[x,y,w,h].every((n,i)=>draw.args[i]===n);
 const numbers=frame.draws.filter(d=>d.width===1093&&d.height===1946&&region(d,1,1,1077,1095));
 const light=frame.draws.filter(d=>d.width===2047&&d.height===2047&&region(d,1,1,1077,1095));
 const fixed=frame.draws.filter(d=>d.width===2047&&d.height===2047&&region(d,1,1715,978,267));
 assert.equal(numbers.length,1,'one complete Numbers ring is painted');assert.equal(light.length,1,'one complete Light ring is painted');assert.equal(fixed.length,1,'one original fixed wheel frame is painted');
 for(const [draw,file]of [[numbers[0],'atlas-3.png'],[light[0],'atlas-2.png'],[fixed[0],'atlas-0.png']])
  assert.equal(draw.sourceSha256,verifiedMediaDigests[file],'native bitmap comes from '+file+' rather than a same-sized different atlas');
 assert.deepEqual(light[0].args,numbers[0].args,'light and numerals have identical ring geometry');
 for(let i=0;i<6;i++)closeNumber(light[0].transform[i],numbers[0].transform[i],'light and numerals share the actual transform',.001);
 closeNumber(angle(fixed[0]),0,'selector frame must remain fixed');
 inspectWinSprites(frame,receipt);
 return {numbers:numbers[0],light:light[0],fixed:fixed[0],angle:angle(numbers[0])};
}
function artwork(frame,receipt){
 assert.ok(frame&&frame.css.width>0&&frame.css.height>0,'visible scene canvas');closeNumber(frame.css.width/frame.css.height,1,'square scene viewport',.005);
 const title=frame.draws.filter(d=>d.width===633&&d.height===152),box=frame.draws.filter(d=>d.width===1119&&d.height===696);
 assert.equal(title.length,1);assert.equal(box.length,1);
 assert.equal(title[0].sourceSha256,verifiedMediaDigests['atlas-logo.png']);assert.equal(box[0].sourceSha256,verifiedMediaDigests['atlas-1.png']);
 assert.equal(frame.draws.filter(d=>d.sourceSha256===verifiedMediaDigests['background.png']).length,0,'foreground must not redraw the page background in a separate square');
 assert.ok(!(frame.fills||[]).some(fill=>fill.args[0]<=0&&fill.args[1]<=0&&fill.args[2]>=600&&fill.args[3]>=600),'foreground has no opaque full-stage rectangle');
 for(const [label,list,ratio]of [['title',title,633/152],['box',box,1119/696]]){
  const d=list[0];assert.equal(d.args.length,4);assert.ok(d.args[2]>0&&d.args[3]>0);
  closeNumber(d.args[2]/d.args[3],ratio,label+' natural proportions',.0001);closeNumber(angle(d),0,label+' upright draw');
  assert.ok(d.crop?.pixels.visible>0&&d.crop.pixels.colours>2,label+' original crop contains coloured artwork');
 }
 assert.deepEqual(title[0].crop.args,[2,1158,152,633,0,0,152,633]);
 assert.deepEqual([title[0].crop.sourceWidth,title[0].crop.sourceHeight],[1822,1793]);
 const titleRotation=Math.atan2(title[0].crop.transform[1],title[0].crop.transform[0]);closeNumber(titleRotation,Math.PI/2,'packed title is turned upright');
 assert.deepEqual(box[0].crop.args,[1,1098,1119,696,0,0,1119,696]);
 const symbols=frame.draws.filter(d=>Object.values(SYMBOL_SIZES).some(([w,h])=>d.width===w&&d.height===h));
 const visible=symbols.filter(d=>d.args.length===4&&d.args[1]>=252&&d.args[1]+d.args[3]<=558);
 assert.equal(visible.length,15,'five reels contain exactly three visible original symbols');
 const grid=Array.from({length:3},()=>Array(5));
 for(const d of visible){
  const [x,y,w,h]=d.args,col=Math.floor((x+w/2-45)/102),row=Math.floor((y+h/2-252)/102);
  assert.ok(row>=0&&row<3&&col>=0&&col<5);assert.equal(grid[row][col],undefined,'one image per final reel cell');
  grid[row][col]=Object.keys(SYMBOL_SIZES).find(key=>SYMBOL_SIZES[key][0]===d.width&&SYMBOL_SIZES[key][1]===d.height);
  closeNumber(w/h,d.width/d.height,'symbol aspect ratio',.0001);closeNumber(angle(d),0,'symbol is upright');
  assert.ok(d.crop?.pixels.visible>0&&d.crop.pixels.colours>2,'symbol crop contains original pixels');
  const [sw,sh,sx,sy,pw,ph,turn]=SYMBOL_REGIONS[grid[row][col]];
  assert.equal(d.sourceSha256,verifiedMediaDigests[SYMBOL_ATLASES[grid[row][col]]],'symbol comes from its captured source atlas');
  assert.deepEqual([d.crop.sourceWidth,d.crop.sourceHeight],[sw,sh]);assert.deepEqual(d.crop.args,[sx,sy,pw,ph,0,0,pw,ph]);
  closeNumber(Math.atan2(d.crop.transform[1],d.crop.transform[0]),turn*Math.PI/2,'packed symbol has the captured orientation');
 }
 if(receipt)assert.deepEqual(grid,receipt.grid,'painted symbols equal the server receipt');
 return {css:frame.css,bitmap:[frame.width,frame.height],title:title[0],box:box[0],grid};
}
async function latestScene(page){return page.evaluate(()=>__m20QA.sceneFrames.at(-1))}
async function inspectBackdrop(page,result,label){
 const state=await page.evaluate(()=>{
  const backdrop=document.getElementById('game-backdrop'),foreground=document.getElementById('reels'),frame=__m20QA.backdropFrames.at(-1);
  const appearance=element=>({backgroundColor:getComputedStyle(element).backgroundColor,backgroundImage:getComputedStyle(element).backgroundImage});
  return {frame,viewport:{width:document.documentElement.clientWidth||innerWidth,height:document.documentElement.clientHeight||innerHeight},window:{width:innerWidth,height:innerHeight},sequence:__m20QA.backdropSequence,
   style:backdrop&&{position:getComputedStyle(backdrop).position,pointerEvents:getComputedStyle(backdrop).pointerEvents,opacity:getComputedStyle(backdrop).opacity,visibility:getComputedStyle(backdrop).visibility,display:getComputedStyle(backdrop).display},
   foreground:foreground&&appearance(foreground),stage:foreground?.parentElement&&appearance(foreground.parentElement)};
 });
 assert.ok(state.frame,'original page backdrop was actually drawn');const frame=state.frame;
 assert.equal(state.style.position,'fixed');assert.equal(state.style.pointerEvents,'none');
 assert.equal(state.style.opacity,'1');assert.equal(state.style.visibility,'visible');assert.notEqual(state.style.display,'none');
 assert.equal(state.foreground.backgroundColor,'rgba(0, 0, 0, 0)');assert.equal(state.foreground.backgroundImage,'none');
 assert.equal(state.stage.backgroundColor,'rgba(0, 0, 0, 0)');assert.equal(state.stage.backgroundImage,'none');
 assert.ok(frame.css.x<=.5&&frame.css.y<=.5&&frame.css.width>=state.viewport.width-.5&&frame.css.height>=state.viewport.height-.5,'backdrop canvas covers the visible page');
 const draws=frame.draws.filter(draw=>draw.sourceSha256===verifiedMediaDigests['background.png']);assert.equal(draws.length,1,'backdrop paints the exact verified background bitmap once');
 const d=draws[0];assert.equal(d.args.length,4);closeNumber(d.args[2]/d.args[3],d.width/d.height,'background cover preserves proportions',.0001);closeNumber(angle(d),0,'backdrop is upright');
 const [x,y,w,h]=d.args,[a,b,c,dd,e,f]=d.transform;
 const corners=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>({x:(a*px+c*py+e)*frame.css.width/frame.width+frame.css.x,y:(b*px+dd*py+f)*frame.css.height/frame.height+frame.css.y}));
 assert.ok(Math.min(...corners.map(p=>p.x))<=.5&&Math.min(...corners.map(p=>p.y))<=.5&&Math.max(...corners.map(p=>p.x))>=state.viewport.width-.5&&Math.max(...corners.map(p=>p.y))>=state.viewport.height-.5,'original bitmap fills the page without gaps');
 result.backdropChecks.push({label,...state});return state.sequence;
}
async function inspectWheelMotion(page,start,result,label,receipt){
 const frames=await page.evaluate(sequence=>__m20QA.sceneFrames.filter(f=>f.sequence>sequence),start);
 assert.ok(frames.length>=3,label+' actual animation paints multiple frames');
 const samples=frames.map(frame=>({sequence:frame.sequence,at:frame.at,angle:wheelParts(frame,receipt).angle}));
 const unique=new Set(samples.map(s=>Math.round(s.angle*100)));assert.ok(unique.size>=3,label+' entire ring and neighbours visibly travel');
 const travel=samples.slice(1).reduce((sum,s,i)=>sum+angleDistance(s.angle,samples[i].angle),0);assert.ok(travel>.3,label+' measured wheel travel');
 const final=frames.at(-1),parts=wheelParts(final,receipt),expected=-STOP_SECTORS[receipt.wheelMultiplier]*WHEEL_STEP;
 assert.ok(angleDistance(parts.angle,expected)<.0001,label+' final multiplier sector matches receipt');
 const presented=artwork(final,receipt);
 result.sceneChecks.push({label,receiptId:receipt.roundId,wheelMultiplier:receipt.wheelMultiplier,samples,travel,finalAngle:parts.angle,presented});
 return {frame:final,angle:parts.angle};
}

// Independently captured five-column paths used by the known ordinary/NICE
// fixtures. The server receipt identifies the line and its winning prefix;
// the visible path must continue through the final chart column even when
// only four symbols won. No scene callback or client evaluator is imported.
const PRESENTATION_LINES={1:[0,0,0,0,0],8:[1,0,0,0,1],12:[0,0,0,0,1]};
const normalText=value=>String(value??'').replace(/\s+/g,' ').trim();
const yellow=value=>['#ffee00','rgb(255, 238, 0)'].includes(String(value).toLowerCase());
function within(inner,outer,label,tolerance=1){
 assert.ok(inner&&outer&&inner.width>0&&inner.height>0&&outer.width>0&&outer.height>0,label+' is visible');
 assert.ok(inner.x>=outer.x-tolerance&&inner.y>=outer.y-tolerance&&
  inner.x+inner.width<=outer.x+outer.width+tolerance&&inner.y+inner.height<=outer.y+outer.height+tolerance,label+' fits its visible container');
}
function inspectCaption(sample,receipt){
 assert.ok(sample?.visible,'fresh winning line has a visible caption');
 assert.equal(sample.roundId,receipt.roundId);assert.equal(sample.captionRoundId,receipt.roundId);
 const line=receipt.winLines.find(win=>win.line===sample.line);assert.ok(line,'caption identifies a line in the accepted receipt');
 const amount=receipt.maxWinCapped?'':` = ${money(cents(line.baseWin)*BigInt(receipt.wheelMultiplier))}`;
 assert.equal(normalText(sample.text),`Line ${line.line} ${line.baseWin} × ${receipt.wheelMultiplier}${amount} ETB`,'caption money follows this receipt line, not totalWin or another line');
 assert.equal(sample.symbolGroupLabel,`${line.count} ${line.symbol} symbols`);
 assert.equal(sample.symbols.length,line.count,'one original miniature per winning symbol');
 const [sw,sh,x,y,w,h,turn]=SYMBOL_REGIONS[line.symbol],[sourceWidth,sourceHeight]=SYMBOL_SIZES[line.symbol];
 for(const icon of sample.symbols){
  assert.equal(icon.symbol,line.symbol);assert.ok(icon.opaque>0,'miniature contains visible native pixels');
  assert.ok(icon.bitmap[0]>0&&icon.bitmap[1]>0);within(icon.box,sample.box,'winning miniature');
  const draw=icon.draw;assert.ok(draw,'winning miniature was actually drawn');
  assert.equal(draw.sourceSha256,verifiedMediaDigests[SYMBOL_ATLASES[line.symbol]]);
  assert.deepEqual([draw.width,draw.height],[sourceWidth,sourceHeight]);
  assert.deepEqual([draw.crop?.sourceWidth,draw.crop?.sourceHeight],[sw,sh]);
  assert.deepEqual(draw.crop.args,[x,y,w,h,0,0,w,h]);
  closeNumber(Math.atan2(draw.crop.transform[1],draw.crop.transform[0]),turn*Math.PI/2,'miniature source orientation');
  assert.equal(draw.args.length,4);assert.ok(draw.args[2]>0&&draw.args[3]>0);
  closeNumber(draw.args[2]/draw.args[3],sourceWidth/sourceHeight,'miniature keeps original artwork proportions');
  closeNumber(angle(draw),0,'displayed miniature is upright');
 }
 // The line description belongs below the reel grid; total WIN belongs in
 // the independent ledger. Neither may cover a cell or clip its own text.
 within(sample.box,sample.stage,'line caption');
 assert.ok(sample.box.y>=sample.stage.y+sample.stage.height*(558/600)-1,'line caption clears the final symbol row');
 for(const child of sample.children)within(child.box,sample.box,'caption component');
 assert.equal(sample.footerInLedger,true,'authoritative WIN belongs to the ledger');
 within(sample.footer,sample.ledger,'authoritative WIN');
 assert.ok(sample.footer.y>=sample.stage.y+sample.stage.height-1,'WIN panel sits below the reels');
 assert.ok(sample.balancePanel.x+sample.balancePanel.width<=sample.footer.x+1&&
  sample.footer.x+sample.footer.width<=sample.betPanel.x+1,'ledger WIN stays between BALANCE and BET without overlapping either panel');
 const overlapWidth=Math.min(sample.box.x+sample.box.width,sample.footer.x+sample.footer.width)-Math.max(sample.box.x,sample.footer.x);
 const overlapHeight=Math.min(sample.box.y+sample.box.height,sample.footer.y+sample.footer.height)-Math.max(sample.box.y,sample.footer.y);
 assert.ok(overlapWidth<=1||overlapHeight<=1,'line caption and authoritative WIN cannot overlap');
 return line;
}
function cssPoint(frame,transform,x,y){
 const [a,b,c,d,e,f]=transform;
 return {x:frame.css.x+(a*x+c*y+e)*frame.css.width/frame.width,y:frame.css.y+(b*x+d*y+f)*frame.css.height/frame.height};
}
function inspectLineFrame(frame,receipt,line){
 const presented=artwork(frame,receipt),parts=wheelParts(frame,receipt);
 assert.ok(angleDistance(parts.angle,-STOP_SECTORS[receipt.wheelMultiplier]*WHEEL_STEP)<.0001,'line animation cannot change the accepted multiplier');
 const chart=PRESENTATION_LINES[line.line];assert.ok(chart,'fixture line has an independently captured chart');
 const expectedPositions=line.positions.map(position=>Array.isArray(position)?position:[position.row,position.col]);
 assert.deepEqual(expectedPositions,chart.slice(0,line.count).map((row,col)=>[row,col]));
 const cells=new Map();
 for(const draw of frame.draws){
  if(!Object.values(SYMBOL_SIZES).some(([w,h])=>draw.width===w&&draw.height===h)||draw.args.length!==4)continue;
  const [x,y,w,h]=draw.args;if(y<252||y+h>558)continue;
  const col=Math.floor((x+w/2-45)/102),row=Math.floor((y+h/2-252)/102);
  cells.set(row+','+col,{centre:cssPoint(frame,draw.transform,x+w/2,y+h/2),draw});
 }
 assert.equal(cells.size,15,'line proof uses all fifteen actually painted cells');
 const paths=(frame.strokedPaths||[]).filter(path=>yellow(path.colour));
 assert.equal(paths.length,1,'exactly one selected payline is painted');
 assert.ok(paths[0].alpha>0&&paths[0].lineWidth>0,'selected line is visible');
 assert.deepEqual(paths[0].commands.map(command=>command.name),['moveTo','lineTo','lineTo','lineTo','lineTo'],'payline covers the complete five-point chart');
 const path=paths[0].commands.map((command,col)=>{
  const actual=cssPoint(frame,command.transform,...command.args),expected=cells.get(chart[col]+','+col).centre;
  closeNumber(actual.x,expected.x,'payline passes through actual cell centre x',.5);
  closeNumber(actual.y,expected.y,'payline passes through actual cell centre y',.5);
  return actual;
 });
 const rects=(frame.strokedRects||[]).filter(rect=>yellow(rect.colour));
 assert.equal(rects.length,line.count,'only the accepted winning prefix is outlined');
 const expected=new Map(expectedPositions.map(position=>[position.join(','),cells.get(position.join(','))])),seen=new Set();
 for(const rect of rects){
  assert.ok(rect.alpha>0&&rect.lineWidth>0);const [x,y,w,h]=rect.args;assert.ok(w>0&&h>0);
  const centre=cssPoint(frame,rect.transform,x+w/2,y+h/2),match=[...expected].find(([,cell])=>Math.abs(cell.centre.x-centre.x)<.5&&Math.abs(cell.centre.y-centre.y)<.5);
  assert.ok(match,'outline belongs to an actually winning cell');assert.ok(!seen.has(match[0]),'winning cell has one outline');seen.add(match[0]);
  const topLeft=cssPoint(frame,rect.transform,x,y),bottomRight=cssPoint(frame,rect.transform,x+w,y+h);
  const cellSpan=frame.css.width*102/600;
  assert.ok(bottomRight.x-topLeft.x>cellSpan*.75&&bottomRight.x-topLeft.x<cellSpan*1.01,'outline stays within a single reel column');
  assert.ok(bottomRight.y-topLeft.y>cellSpan*.75&&bottomRight.y-topLeft.y<cellSpan*1.01,'outline stays within a single symbol row');
 }
 return {sequence:frame.sequence,line:line.line,positions:expectedPositions,path,rectangles:rects,lightAlpha:parts.light.alpha,angle:parts.angle,grid:presented.grid};
}
async function lineSamples(page,receipt,minimum=1){
 await page.waitForFunction(({id,minimum})=>__m20QA.lineCaptions.filter(sample=>sample.visible&&sample.roundId===id&&sample.captionRoundId===id).length>=minimum,
  {id:receipt.roundId,minimum},{timeout:15000});
 return page.evaluate(id=>__m20QA.lineCaptions.filter(sample=>sample.visible&&sample.roundId===id&&sample.captionRoundId===id),receipt.roundId);
}
async function assertStoppedPresentation(page,label,waitMs=1350){
 assert.equal(await page.locator('#line-caption').isHidden(),true,label+' clears the fresh line caption');
 // Two ordinary browser frames let queued cancellation complete, then leave
 // enough time for a mistakenly retained next-line timer to become visible.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const before=await page.evaluate(()=>({frames:__m20QA.sceneSequence,raf:__m20QA.raf.length}));
 await page.waitForTimeout(waitMs);
 assert.equal(await page.locator('#line-caption').isHidden(),true,label+' cannot revive a dismissed line');
 assert.deepEqual(await page.evaluate(()=>({frames:__m20QA.sceneSequence,raf:__m20QA.raf.length})),before,label+' stops the result animation instead of leaving an idle RAF');
 return before;
}
async function dismissLineWithMenu(page,f,label){
 const posts=f.requests.filter(request=>request.method==='POST').length,ledger=f.ledger.length,balance=f.balance;
 await page.locator('#menu').click();await page.locator('#menu-dialog').waitFor({state:'visible'});await close(page,'menu-dialog');
 await assertStoppedPresentation(page,label);
 assert.equal(f.requests.filter(request=>request.method==='POST').length,posts);assert.equal(f.ledger.length,ledger);assert.equal(f.balance,balance);
}
async function verifyFreshLine(page,f,result){
 const receipt=f.round.result,posts=f.requests.filter(request=>request.method==='POST').length,ledger=f.ledger.length,balance=f.balance;
 const sample=(await lineSamples(page,receipt))[0],line=inspectCaption(sample,receipt);
 await page.waitForTimeout(120);
 const frame=await latestScene(page);assert.equal(normalText(frame.lineCaption),normalText(sample.text));
 const drawing=inspectLineFrame(frame,receipt,line);
 assert.equal(await page.locator('#zplay').getAttribute('data-phase'),'ready','line animation cannot lock an already settled round');
 assert.equal((await page.locator('#win-value').innerText()).trim(),receipt.finalWin);
 assert.equal(f.requests.filter(request=>request.method==='POST').length,posts);assert.equal(f.ledger.length,ledger);assert.equal(f.balance,balance);
 await audit(page,'fresh line and ledger WIN',result);
 await screenshot(page,result,'fresh-line');
 result.freshLine={roundId:receipt.roundId,caption:sample,drawing,extraPostCount:0,ledgerDelta:0};
 result.checks.push('Fresh receipt line paints original miniature symbols, the full chart and winning cells without covering the ledger WIN at this viewport');
}
async function verifyDirectSound(page,f,result){
 const receipt=f.round.result,posts=f.requests.filter(request=>request.method==='POST').length,ledger=f.ledger.length,balance=f.balance;
 assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
 assert.equal(await page.locator('#line-caption').isVisible(),true,'direct SOUND is exercised on an active fresh result');
 const start=await page.evaluate(()=>({media:__m20QA.media.length,sequence:__m20QA.sceneSequence}));
 await page.locator('#sound').click();await moveAway(page);
 assert.equal(await page.locator('dialog[open]').count(),0,'direct SOUND cannot open a settings dialog');
 assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
 await controls(page,result,'direct SOUND on',{sound:'Buttons/SoundOn'});
 assert.equal(await page.locator('#line-caption').isVisible(),true,'sound on does not reset the fresh line presentation');
 await page.waitForFunction(start=>__m20QA.media.slice(start).some(event=>event.event==='play-resolved'&&event.loop),start.media,{timeout:5000});
 await page.locator('#sound').click();await moveAway(page);
 assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
 await controls(page,result,'direct SOUND muted',{sound:'Buttons/SoundOff'});
 assert.equal(await page.locator('#line-caption').isVisible(),true,'mute preserves the displayed winning-line cycle');
 assert.equal(await page.locator('#line-caption').getAttribute('data-round-id'),receipt.roundId);
 await page.waitForTimeout(120);
 assert.ok(await page.evaluate(sequence=>__m20QA.sceneSequence>sequence,start.sequence),'the same fresh result continues drawing while audio toggles');
 const events=await page.evaluate(index=>__m20QA.media.slice(index),start.media);
 assert.ok(events.some(event=>event.event==='pause'&&event.loop),'mute pauses opted-in background audio');
 assert.equal(events.filter(event=>event.event==='play'&&/\/(spin|reel-stop|win)\.mp3(?:$|[?#])/.test(event.src)).length,0,'audio toggle cannot replay the previous round sounds');
 assert.equal(f.requests.filter(request=>request.method==='POST').length,posts);assert.equal(f.ledger.length,ledger);assert.equal(f.balance,balance);
 assert.equal((await page.locator('#win-value').innerText()).trim(),receipt.finalWin);
 result.directSound={roundId:receipt.roundId,dialogCount:0,extraPostCount:0,ledgerDelta:0,linePresentationContinues:true,events};
 result.checks.push('Bottom SOUND directly enables and mutes audio without a dialog, wager or reset of the fresh winning-line result');
}
async function verifyRepeatedLines(page,f,result,receipt){
 const posts=f.requests.filter(request=>request.method==='POST').length,ledger=f.ledger.length,balance=f.balance;
 assert.deepEqual(receipt.winLines.map(line=>line.line),[1,8,12],'actual NICE evaluator fixture supplies three distinct lines');
 const samples=await lineSamples(page,receipt,6);
 assert.deepEqual(samples.slice(0,6).map(sample=>sample.line),[1,8,12,1,8,12],'fresh line captions repeat after one complete pass');
 await page.waitForTimeout(180);
 const frames=await page.evaluate(id=>__m20QA.sceneFrames.filter(frame=>frame.lineCaption&&__m20QA.lineCaptions.some(sample=>sample.roundId===id&&sample.frameSequence<=frame.sequence)),receipt.roundId);
 const proof=[];
 for(const sample of samples.slice(0,6)){
  const line=inspectCaption(sample,receipt),frame=sample.nativeFrame;
  assert.equal(frame?.sequence,sample.frameSequence);assert.equal(normalText(frame?.lineCaption),normalText(sample.text));
  assert.ok(frame,'native frame accompanies each visible caption change');proof.push(inspectLineFrame(frame,receipt,line));
 }
 assert.equal(new Set(proof.map(value=>JSON.stringify(value.path))).size,3,'visible native paths differ for all three receipt lines');
 assert.equal(new Set(proof.map(value=>JSON.stringify(value.positions))).size,3,'matching cell outlines change with each selected line');
 const activeFrames=frames.filter(frame=>samples.some(sample=>normalText(frame.lineCaption)===normalText(sample.text)));
 const lights=activeFrames.map(frame=>{
  const part=wheelParts(frame,receipt);assert.ok(angleDistance(part.angle,-STOP_SECTORS[receipt.wheelMultiplier]*WHEEL_STEP)<.0001,'repeat never selects a different multiplier');
  return part.light.alpha;
 });
 assert.ok(lights.length>10&&Math.max(...lights)-Math.min(...lights)>.08,'original selected multiplier light visibly varies while the ring stays fixed');
 assert.equal((await page.locator('#win-value').innerText()).trim(),receipt.finalWin);
 assert.equal(f.requests.filter(request=>request.method==='POST').length,posts);assert.equal(f.ledger.length,ledger);assert.equal(f.balance,balance);
 assert.equal(f.ledger.filter(item=>item.kind==='BET'&&item.token===receipt.roundToken).length,1);
 assert.equal(f.ledger.filter(item=>item.kind==='WIN'&&item.token===receipt.roundToken).length,1);
 result.repeatedLines={roundId:receipt.roundId,captionSequence:samples.slice(0,6),drawings:proof,frameCount:activeFrames.length,
  lightAlphaRange:[Math.min(...lights),Math.max(...lights)],extraPostCount:0,ledgerDelta:0};
 await screenshot(page,result,'repeated-lines');
 result.checks.push('Three receipt lines repeat with different captions, full paths and winning-cell outlines while the fixed multiplier light varies and the ledger settles only once');
}

async function openSound(page){
 await page.locator('#menu').click();await page.locator('#menu-dialog').waitFor({state:'visible'});
 await page.locator('#menu-sound').click();await page.locator('#sound-dialog').waitFor({state:'visible'});
}
async function restorePage(page){
 await page.locator('#loading').waitFor({state:'hidden',timeout:20000});
 if(await page.locator('#sound-prompt').isVisible())await page.locator('#sound-off').click();
 await ready(page);
 if(await page.locator('#zplay').getAttribute('data-round-id')){
  // Give any mistakenly queued live-win RAF time to run. Restoring a receipt
  // must keep the footer static as well as the Canvas and audio.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await page.locator('#win-banner').evaluate(element=>element.classList.contains('celebrate')),false,'historical footer cannot replay a live-win animation');
  assert.equal(await page.locator('#win-banner').evaluate(element=>getComputedStyle(element).animationName),'none');
  assert.equal(await page.locator('#line-caption').isHidden(),true,'historical receipt cannot restart a fresh winning-line cycle');
  assert.equal(await page.evaluate(()=>__m20QA.lineCaptions.filter(sample=>sample.visible).length),0,'restore cannot briefly expose a historical line caption');
 }
}
async function waitFixture(predicate,label,timeout=12000){
 const deadline=Date.now()+timeout;
 while(!predicate()){assert.ok(Date.now()<deadline,'timed out: '+label);await delay(20)}
}
async function beginHeldPointer(page){
 const box=await page.locator('#spin').boundingBox();assert.ok(box);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
}
async function verifyHoldPointer(page,f,result){
 result.holdPlay=[];
 for(const scenario of [{name:'release',rounds:3},{name:'leave',rounds:1},{name:'menu-focus',rounds:1}]){
  const postsBefore=count(f,'/api/slots/spin'),roundsBefore=f.rounds.size,requestsBefore=f.requests.length,balanceBefore=f.balance;
  const eventsBefore=await page.evaluate(()=>__m20QA.inputEvents.length);
  f.remainingRounds=scenario.rounds;
  try{
   await beginHeldPointer(page);
   await waitFixture(()=>f.rounds.size===roundsBefore+scenario.rounds,'held '+scenario.name+' accepted rounds');
   const beforeStop=await page.evaluate(start=>__m20QA.inputEvents.slice(start),eventsBefore);
   assert.ok(beforeStop.some(event=>event.event==='pointerdown'&&event.target==='spin'));
   assert.ok(!beforeStop.some(event=>event.event==='blur'&&event.target==='spin'),'held focused SPIN cannot disable/blur between accepted rounds');
   if(scenario.name==='release')await page.mouse.up();
   else if(scenario.name==='leave')await moveAway(page);
   else {await page.locator('#menu').focus();await page.keyboard.press('Enter');await page.locator('#menu-dialog').waitFor({state:'visible'})}
   await ready(page);
   // Finish the original held mouse gesture before asking Playwright to
   // generate a fresh click on the dialog close button. Focus/open above
   // still happens while held, and the accepted round must settle first.
   if(scenario.name!=='release')await page.mouse.up();
   if(scenario.name==='menu-focus')await close(page,'menu-dialog');
   // Longer than a normal continuation interval: a cancelled held gesture
   // must stay stopped after settlement and the synthetic release click.
   await page.waitForTimeout(500);
   assert.equal(count(f,'/api/slots/spin')-postsBefore,scenario.rounds,'HOLD '+scenario.name+' cannot send an extra request');
   assert.equal(f.rounds.size-roundsBefore,scenario.rounds);
   const flow=f.requests.slice(requestsBefore),spins=flow.map((r,i)=>({...r,index:i})).filter(r=>r.path==='/api/slots/spin');
   for(let i=1;i<spins.length;i++)assert.ok(flow.slice(spins[i-1].index+1,spins[i].index).some(r=>r.method==='GET'&&r.path==='/api/slots/fresh-state'),'each held spin follows a completed existing-ledger refresh');
   assert.equal(new Set(spins.map(r=>r.body.roundToken)).size,scenario.rounds,'each accepted held round has its own token');
   for(const spin of spins)assert.equal(f.ledger.filter(r=>r.kind==='BET'&&r.token===spin.body.roundToken).length,1);
   assert.equal((await page.locator('#balance').innerText()).replace(/[^0-9.]/g,''),money(f.balance));
   result.holdPlay.push({stop:scenario.name,acceptedRounds:scenario.rounds,postCount:spins.length,balanceBefore:money(balanceBefore),balanceAfter:money(f.balance),tokens:spins.map(r=>r.body.roundToken),
    inputEvents:await page.evaluate(start=>__m20QA.inputEvents.slice(start),eventsBefore)});
   result.checks.push(scenario.name==='release'?'HOLD serially settles three fixture rounds; release adds no fourth bet':scenario.name==='leave'?'Leaving held SPIN settles its accepted round and cancels repetition':'Moving focus to MENU cancels held repetition while its accepted round settles');
  }catch(error){
   result.holdFailure={stop:scenario.name,acceptedRounds:f.rounds.size-roundsBefore,postCount:count(f,'/api/slots/spin')-postsBefore,
    inputEvents:await page.evaluate(start=>__m20QA.inputEvents.slice(start),eventsBefore).catch(()=>[]),error:error.message};
   throw error;
  }finally{await page.mouse.up().catch(()=>{});f.remainingRounds=null}
 }
}
async function verifyWheelReceipts(page,f,result){
 result.wheelReceipts=[];
 for(const multiplier of [1,2,3,4,5]){
  f.wheelMultiplier=multiplier;f.remainingRounds=1;
  const before=count(f,'/api/slots/spin'),roundsBefore=f.rounds.size,sequence=await page.evaluate(()=>__m20QA.sceneSequence);
  try{
   await page.locator('#spin').click();await ready(page);
   assert.equal(count(f,'/api/slots/spin'),before+1);assert.equal(f.rounds.size,roundsBefore+1);
   const receipt=f.round.result;assert.equal(receipt.wheelMultiplier,multiplier);
   assert.equal((await page.locator('#multiplier-value').innerText()).trim(),String(multiplier));
   assert.equal((await page.locator('#win-value').innerText()).trim(),receipt.finalWin);
   const settled=await inspectWheelMotion(page,sequence,result,'receipt '+multiplier+'x',receipt);
   // A fresh winning result deliberately keeps cycling. A real MENU action
   // dismisses that presentation before the static receipt/restore proof.
   await dismissLineWithMenu(page,f,'MENU before '+multiplier+'x restore');
   const beforeCanvas=await page.locator('#reels').evaluate(canvas=>canvas.toDataURL()),ledgerBefore=f.ledger.length,postsBefore=f.requests.filter(r=>r.method==='POST').length;
   result.observationChunks.push(await observe(page));await page.reload({waitUntil:'networkidle'});await restorePage(page);
   const restored=await latestScene(page),parts=wheelParts(restored);artwork(restored,receipt);
   await inspectBackdrop(page,result,'restored '+multiplier+'x');
   assert.ok(angleDistance(parts.angle,settled.angle)<.0001,'restore preserves the server multiplier sector');
   assert.equal(await page.locator('#reels').evaluate(canvas=>canvas.toDataURL()),beforeCanvas,'restore paints the identical settled title, frame, ring and symbols');
   assert.equal(f.requests.filter(r=>r.method==='POST').length,postsBefore);assert.equal(f.ledger.length,ledgerBefore);
   assert.equal(await page.evaluate(()=>__m20QA.raf.length),0);assert.equal(await page.evaluate(()=>__m20QA.media.filter(e=>e.event==='play').length),0);
   assert.equal((await page.locator('#multiplier-value').innerText()).trim(),String(multiplier));
   result.wheelReceipts.push({multiplier,roundId:receipt.roundId,bet:receipt.bet,finalWin:receipt.finalWin,angle:settled.angle,
    restoredAngle:parts.angle,canvasSha256:digest(Buffer.from(beforeCanvas)),newPostCount:1,restorePostCount:0,restoreSoundCount:0,restoreSceneRafCount:0});
   result.checks.push('Server fixture '+multiplier+'x travels the original wheel and restores identical pixels without another POST or sound');
  }finally{f.wheelMultiplier=1;f.remainingRounds=null}
 }
 await screenshot(page,result,'wheel-5x-restored');
}
async function verifyNiceWin(page,f,result){
 await openSound(page);await page.locator('#effects-opt').check();await page.locator('#music-opt').uncheck();await page.locator('#sound-save').click();
 if(await page.locator('#turbo').getAttribute('aria-pressed')==='true')await page.locator('#turbo').click();
 const postsBefore=count(f,'/api/slots/spin'),roundsBefore=f.rounds.size,requestsBefore=f.requests.length,balanceBefore=f.balance;
 const sequence=await page.evaluate(()=>__m20QA.sceneSequence),soundStart=await page.evaluate(()=>__m20QA.media.length),backdropBefore=await page.evaluate(()=>__m20QA.backdropSequence);
 f.outcome='NICE';f.wheelMultiplier=1;f.remainingRounds=1;
 try{
  await page.locator('#spin').click();
  // Observe the original native pixels at a complete entrance frame, not a
  // DOM/debug tier label. Keep the first ordinary3x baseline unchanged.
  await page.waitForFunction(({sequence,sha})=>{
   const frames=__m20QA.sceneFrames.filter(frame=>frame.sequence>sequence&&frame.draws.some(draw=>draw.sourceSha256===sha));
   const latest=frames.at(-1);return latest&&latest.at-frames[0].at>=1100&&
    latest.draws.some(draw=>draw.sourceSha256===sha&&draw.width===264&&draw.height===105&&draw.alpha>.95)&&
    latest.draws.some(draw=>draw.sourceSha256===sha&&draw.width===430&&draw.height===155&&draw.alpha>.95)&&latest.texts.length===1;
  },{sequence,sha:verifiedMediaDigests['wins.png']},{timeout:10000});
  const receipt=f.round.result;assert.equal(cents(receipt.finalWin),20n*cents(receipt.bet));
  const frame=await latestScene(page),parts=inspectWinSprites(frame,receipt,{complete:true});artwork(frame,receipt);wheelParts(frame,receipt);
  assert.equal(await page.locator('#zplay').getAttribute('data-phase'),'spinning');
  assert.equal(await page.locator('#spin').getAttribute('data-spinning'),'true');
  assert.equal(await page.locator('#spin').isDisabled(),false,'STOP stays available during the accepted presentation');
  assert.equal(await page.locator('#bet').isDisabled(),true);assert.equal(await page.locator('#auto').isDisabled(),true);
  assert.equal(await page.locator('#win-actions').isHidden(),true,'X2 and TAKE WIN wait for this accepted presentation');
  assert.equal(count(f,'/api/slots/spin'),postsBefore+1);assert.equal(f.rounds.size,roundsBefore+1);
  assert.equal(f.requests.slice(requestsBefore).filter(request=>request.method==='GET'&&request.path==='/api/slots/fresh-state').length,0,'ledger refresh cannot finish ahead of the accepted scene settlement');
  const ledgerAtPresentation=f.ledger.length;await screenshot(page,result,'nice-win-original');await ready(page);
  const frames=await page.evaluate(start=>__m20QA.sceneFrames.filter(frame=>frame.sequence>start),sequence),visible=frames.filter(frame=>winDraws(frame).length);
  assert.ok(visible.length>=3,'NICE presentation paints multiple native frames');
  for(const sample of visible){inspectWinSprites(sample,receipt);assert.ok(angleDistance(wheelParts(sample,receipt).angle,-STOP_SECTORS[receipt.wheelMultiplier]*WHEEL_STEP)<.0001,'accepted multiplier stays fixed throughout NICE WIN')}
  const niceWidths=visible.flatMap(sample=>winDraws(sample).filter(draw=>draw.width===264&&draw.height===105).map(draw=>draw.args[2]));
  assert.ok(new Set(niceWidths.map(width=>Math.round(width*100))).size>=3,'original NICE artwork animates into its final size');
  assert.equal(count(f,'/api/slots/spin'),postsBefore+1);assert.equal(f.rounds.size,roundsBefore+1);assert.equal(f.ledger.length,ledgerAtPresentation);
  assert.equal(f.ledger.filter(item=>item.kind==='BET'&&item.token===receipt.roundToken).length,1);
  assert.equal(f.ledger.filter(item=>item.kind==='WIN'&&item.token===receipt.roundToken).length,1);
  assert.equal(f.balance,balanceBefore-cents(receipt.bet)+cents(receipt.finalWin));
  assert.equal((await page.locator('#balance').innerText()).replace(/[^0-9.]/g,''),money(f.balance));
  assert.equal((await page.locator('#win-value').innerText()).trim(),receipt.finalWin);
  assert.equal(await page.locator('#reels').getAttribute('data-win-presentation'),null,'whole-page dimming clears after the bounded display');
  assert.equal(await page.evaluate(()=>__m20QA.backdropSequence),backdropBefore,'celebration does not redraw the static full-page background');
  const final=await latestScene(page);assert.equal(winDraws(final).length,0);artwork(final,receipt);
  await verifyRepeatedLines(page,f,result,receipt);
  const roundSounds=await page.evaluate(start=>__m20QA.media.slice(start),soundStart);
  assert.equal(roundSounds.filter(event=>event.event==='play'&&new URL(event.src).pathname.endsWith('/win.mp3')).length,1,'presentation cannot duplicate the accepted round win sound');
  await dismissLineWithMenu(page,f,'MENU after repeated NICE receipt lines');
  const canvas=await page.locator('#reels').evaluate(element=>element.toDataURL()),postTotal=f.requests.filter(request=>request.method==='POST').length,ledgerTotal=f.ledger.length;
  result.niceWin={scope:'Independent20x QA fixture and native original pixels; no provider tier/duration equivalence',roundId:receipt.roundId,bet:receipt.bet,finalWin:receipt.finalWin,
   balanceBefore:money(balanceBefore),balanceAfter:money(f.balance),acceptedRounds:1,postCount:1,betRecords:1,winRecords:1,
   frameCount:visible.length,paintedSpanMs:visible.at(-1).at-visible[0].at,completeFrame:{sequence:frame.sequence,at:frame.at,parts,texts:frame.texts},
   sizeSampleCount:new Set(niceWidths.map(width=>Math.round(width*100))).size,winSoundCount:1};
  result.observationChunks.push(await observe(page));await page.reload({waitUntil:'networkidle'});await restorePage(page);
  assert.equal(await page.locator('#reels').evaluate(element=>element.toDataURL()),canvas,'refresh restores the final receipt without replaying NICE WIN');
  assert.equal(winDraws(await latestScene(page)).length,0);assert.equal(await page.evaluate(()=>__m20QA.raf.length),0);
  assert.equal(await page.evaluate(()=>__m20QA.media.filter(event=>event.event==='play').length),0);
  assert.equal(f.requests.filter(request=>request.method==='POST').length,postTotal);assert.equal(f.ledger.length,ledgerTotal);
  result.niceWin.restore={postCount:0,sceneRafCount:0,soundCount:0,canvasSha256:digest(Buffer.from(canvas))};
  result.checks.push('Original NICE WIN animates the exact20x server receipt while settlement stays pending, then restores silently with one debit and one credit');
 }finally{f.outcome='WIN';f.wheelMultiplier=1;f.remainingRounds=null}
}
async function verifyLineCancellation(page,f,result){
 result.lineCancellation=[];
 for(const action of ['MENU','TAKE WIN','MENU → Sound settings','NEXT SPIN']){
  const postsBefore=f.requests.filter(request=>request.method==='POST').length,roundsBefore=f.rounds.size,ledgerBefore=f.ledger.length,balanceBefore=f.balance;
  f.outcome='WIN';f.wheelMultiplier=1;f.remainingRounds=action==='NEXT SPIN'?2:1;
  try{
   await page.locator('#spin').click();await ready(page);
   const receipt=f.round.result,sample=(await lineSamples(page,receipt))[0];inspectCaption(sample,receipt);
   const requestsAtAction=f.requests.length,ledgerAtAction=f.ledger.length,balanceAtAction=f.balance;
   const soundAtAction=await page.evaluate(()=>__m20QA.media.length);
   if(action==='MENU'){
    await page.locator('#menu').click();await page.locator('#menu-dialog').waitFor({state:'visible'});
    assert.equal(await page.locator('#line-caption').isHidden(),true);await close(page,'menu-dialog');
   }else if(action==='TAKE WIN'){
    await page.locator('#take-win').click();await ready(page);
    const takeRequests=f.requests.slice(requestsAtAction);assert.ok(takeRequests.length>=1,'TAKE WIN rereads the existing account');
    assert.ok(takeRequests.every(request=>request.method==='GET'),'TAKE WIN cannot submit a second payout');
   }else if(action==='MENU → Sound settings'){
    await openSound(page);assert.equal(await page.locator('#line-caption').isHidden(),true);
    await page.locator('#effects-opt').uncheck();await page.locator('#music-opt').uncheck();await page.locator('#sound-save').click();
   }else{
    f.outcome='LOSS';await page.locator('#spin').click();
    await page.waitForFunction(()=>document.getElementById('zplay').dataset.phase==='spinning');
    assert.equal(await page.locator('#line-caption').isHidden(),true,'next SPIN removes the previous caption as it starts');
    await ready(page);assert.notEqual(f.round.result.roundId,receipt.roundId);assert.equal(f.round.result.finalWin,'0.00');
   }
   const quiet=await assertStoppedPresentation(page,action+' cancellation');
   const accepted=action==='NEXT SPIN'?2:1,afterAction=f.requests.slice(requestsAtAction);
   assert.equal(f.requests.filter(request=>request.method==='POST').length-postsBefore,accepted,'only explicitly requested accepted rounds can POST');
   assert.equal(f.rounds.size-roundsBefore,accepted);
   assert.equal(f.ledger.filter(item=>item.kind==='BET'&&item.token===receipt.roundToken).length,1);
   assert.equal(f.ledger.filter(item=>item.kind==='WIN'&&item.token===receipt.roundToken).length,1);
   if(action==='NEXT SPIN'){
    assert.equal(afterAction.filter(request=>request.method==='POST').length,1);
    assert.equal(f.balance,balanceAtAction-cents(f.round.result.bet));assert.equal(f.ledger.length,ledgerAtAction+1);
   }else{
    assert.ok(afterAction.every(request=>request.method==='GET'),'dismissing presentation cannot mutate the ledger');
    assert.equal(f.balance,balanceAtAction);assert.equal(f.ledger.length,ledgerAtAction);
    const actionSounds=await page.evaluate(start=>__m20QA.media.slice(start),soundAtAction);
    assert.equal(actionSounds.filter(event=>event.event==='play'&&/\/(spin|reel-stop|win)\.mp3(?:$|[?#])/.test(event.src)).length,0,'dismissal cannot replay round sounds');
   }
   assert.equal((await page.locator('#balance').innerText()).replace(/[^0-9.]/g,''),money(f.balance));
   result.lineCancellation.push({action,roundId:receipt.roundId,caption:sample.text,acceptedRounds:accepted,
    balanceBefore:money(balanceBefore),balanceAfter:money(f.balance),ledgerDelta:f.ledger.length-ledgerBefore,
    actionRequests:afterAction,quiet,extraUnrequestedPosts:0});
   result.checks.push(action==='NEXT SPIN'
    ?'Next SPIN cancels the previous fresh-line cycle and settles one separately requested loss without stale captions'
    :action+' cancels the fresh-line cycle without another bet, payout, round sound or delayed restart');
  }finally{f.outcome='WIN';f.wheelMultiplier=1;f.remainingRounds=null}
 }
}
async function verifyNiceMenuInterruption(page,f,result){
 await openSound(page);await page.locator('#effects-opt').check();await page.locator('#music-opt').uncheck();await page.locator('#sound-save').click();
 if(await page.locator('#turbo').getAttribute('aria-pressed')==='true')await page.locator('#turbo').click();
 const postsBefore=f.requests.filter(request=>request.method==='POST').length,roundsBefore=f.rounds.size,balanceBefore=f.balance;
 const sequence=await page.evaluate(()=>__m20QA.sceneSequence),soundsBefore=await page.evaluate(()=>__m20QA.media.length);
 f.outcome='NICE';f.wheelMultiplier=1;f.remainingRounds=1;
 try{
  await page.locator('#spin').click();
  await page.waitForFunction(({sequence,sha})=>{
   const frame=__m20QA.sceneFrames.at(-1);
   return frame?.sequence>sequence&&frame.phase==='spinning'&&frame.draws.some(draw=>draw.sourceSha256===sha&&draw.width===264&&draw.height===105&&draw.alpha>.2);
  },{sequence,sha:verifiedMediaDigests['wins.png']},{timeout:10000});
  const receipt=f.round.result,visible=await latestScene(page);
  assert.ok(inspectWinSprites(visible,receipt).some(part=>part.name==='nice'),'MENU interruption starts during actual original NICE artwork');
  assert.equal(await page.locator('#zplay').getAttribute('data-phase'),'spinning');
  const requestsAtAction=f.requests.length,ledgerAtAction=f.ledger.length,soundsAtAction=await page.evaluate(()=>__m20QA.media.length);
  await page.locator('#menu').click();await page.locator('#menu-dialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#line-caption').isHidden(),true);await ready(page);await close(page,'menu-dialog');
  // Wait beyond the original normal celebration deadline. A dismissed
  // pending result must not quietly start its line/fire loop after close.
  const quiet=await assertStoppedPresentation(page,'MENU during NICE settlement',3000);
  assert.equal(await page.locator('#reels').getAttribute('data-win-presentation'),null);
  const final=await latestScene(page);assert.equal(winDraws(final).length,0);artwork(final,receipt);wheelParts(final,receipt);
  assert.equal(await page.evaluate(id=>__m20QA.lineCaptions.filter(sample=>sample.visible&&sample.roundId===id).length,receipt.roundId),0,'dismissed pending result never exposes a fresh line caption');
  assert.equal(f.requests.filter(request=>request.method==='POST').length,postsBefore+1);assert.equal(f.rounds.size,roundsBefore+1);
  assert.ok(f.requests.slice(requestsAtAction).every(request=>request.method==='GET'),'closing MENU cannot resubmit the pending wager');
  assert.equal(f.ledger.length,ledgerAtAction);
  assert.equal(f.ledger.filter(item=>item.kind==='BET'&&item.token===receipt.roundToken).length,1);
  assert.equal(f.ledger.filter(item=>item.kind==='WIN'&&item.token===receipt.roundToken).length,1);
  assert.equal(f.balance,balanceBefore-cents(receipt.bet)+cents(receipt.finalWin));
  assert.equal((await page.locator('#balance').innerText()).replace(/[^0-9.]/g,''),money(f.balance));
  const sounds=await page.evaluate(start=>__m20QA.media.slice(start),soundsBefore),afterAction=await page.evaluate(start=>__m20QA.media.slice(start),soundsAtAction);
  assert.equal(sounds.filter(event=>event.event==='play'&&/\/win\.mp3(?:$|[?#])/.test(event.src)).length,1,'interrupted NICE has only its original accepted win cue');
  assert.equal(afterAction.filter(event=>event.event==='play'&&/\/(spin|reel-stop|win)\.mp3(?:$|[?#])/.test(event.src)).length,0,'dismissal cannot restart round audio');
  result.niceMenuInterruption={roundId:receipt.roundId,bet:receipt.bet,finalWin:receipt.finalWin,visibleFrame:visible.sequence,
   acceptedRounds:1,postCount:1,betRecords:1,winRecords:1,captionCountAfterDismissal:0,quiet,waitAfterCloseMs:3000};
  await screenshot(page,result,'nice-menu-dismissed');
  result.checks.push('MENU during actual NICE settlement permanently dismisses the pending result animation, preserving one debit/credit and no delayed caption, fire, sound or RAF restart');
 }finally{f.outcome='WIN';f.wheelMultiplier=1;f.remainingRounds=null}
}
async function inspectAutoCounter(page,result,label,remaining){
 await moveAway(page);
 await controls(page,result,label,{spin:'Buttons/SpinStop',auto:'Buttons/AutoPlayStop'});
 const state=await page.evaluate(()=>{
  const spin=document.getElementById('spin'),auto=document.getElementById('auto'),large=document.getElementById('spin-label'),small=document.getElementById('auto-label');
  const r=small.getBoundingClientRect();
  return {phase:document.getElementById('zplay').dataset.phase,active:auto.dataset.active,spinAuto:spin.dataset.autoplay,
   largeLabel:large.textContent,largeAccessible:spin.getAttribute('aria-label'),largeDisabled:spin.disabled,
   smallLabel:small.textContent,smallHidden:small.classList.contains('sr-only'),smallRect:{width:r.width,height:r.height},smallDisabled:auto.disabled};
 });
 assert.equal(state.active,'true');assert.equal(state.spinAuto,'true');assert.equal(state.largeLabel,String(remaining));
 assert.equal(state.largeAccessible,`Stop autoplay; ${remaining} spins remaining`);assert.equal(state.largeDisabled,false);
 assert.equal(state.smallLabel,'Stop autoplay');assert.equal(state.smallHidden,true);assert.equal(state.smallDisabled,false);
 assert.ok(state.smallRect.width<=1&&state.smallRect.height<=1,'small red STOP has no visible misplaced numeric label');
 (result.autoplayCounters??=[]).push({label,remaining,...state});
 return state;
}
async function verifyLargeAutoStop(page,f,result){
 await page.locator('#auto').click();
 for(const name of ['win','loss','gain'])await page.locator('#auto-'+name+'-enabled').uncheck();
 await page.locator('[data-auto-count="25"]').click();
 const postsBefore=count(f,'/api/slots/spin'),roundsBefore=f.rounds.size,balanceBefore=f.balance;
 f.remainingRounds=1;
 try{
  await page.evaluate(()=>{__m20QA.holdAuto=true});await page.locator('#auto-start').click();
  await page.waitForFunction(()=>__m20QA.held.length>0);
  const receipt=f.round.result;assert.equal(f.rounds.size,roundsBefore+1);
  await inspectAutoCounter(page,result,'large AUTO before keyboard stop',24);
  await screenshot(page,result,'autoplay-running-counter');
  await page.locator('#spin').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#auto').getAttribute('data-active'),'false');
  await page.evaluate(()=>__m20QA.releaseAuto());await ready(page);await page.waitForTimeout(250);
  assert.equal(count(f,'/api/slots/spin'),postsBefore+1,'large AUTO keyboard stop cannot place a manual wager');
  assert.equal(f.rounds.size,roundsBefore+1);assert.equal(f.balance,balanceBefore-cents(receipt.bet)+cents(receipt.finalWin));
  assert.equal(f.ledger.filter(item=>item.kind==='BET'&&item.token===receipt.roundToken).length,1);
  assert.equal(f.ledger.filter(item=>item.kind==='WIN'&&item.token===receipt.roundToken).length,1);
  assert.equal(await page.locator('#spin').getAttribute('data-autoplay'),'false');
  assert.equal(await page.locator('#spin-label').innerText(),'HOLD\n&\nSPIN');
  result.largeAutoStop={roundId:receipt.roundId,selectedCount:25,remaining:24,acceptedRounds:1,postCount:1,extraManualBetCount:0};
  result.checks.push('AUTO count24 is centred on the original gold SPIN disk; large-SPIN Enter cancels the queued continuation without an extra manual bet');
 }finally{f.remainingRounds=null;await page.evaluate(()=>__m20QA.releaseAuto()).catch(()=>{})}
}
async function verifyAutoLimits(page,f,result){
 result.autoplayLimits=[];
 for(const scenario of [
  {name:'win',limit:'6.00',outcome:'WIN',rounds:1,delta:400n},
  {name:'loss',limit:'3.00',outcome:'LOSS',rounds:2,delta:-400n},
  {name:'gain',limit:'5.00',outcome:'WIN',rounds:2,delta:800n},
 ]){
  await page.locator('#auto').click();
  for(const name of ['win','loss','gain'])await page.locator('#auto-'+name+'-enabled').uncheck();
  await page.locator('[data-auto-count="25"]').click();
  await page.locator('#auto-'+scenario.name+'-enabled').check();
  await page.locator('#auto-'+scenario.name+'-limit').fill(scenario.limit);
  const postsBefore=count(f,'/api/slots/spin'),roundsBefore=f.rounds.size,balanceBefore=f.balance;
  assert.equal((await page.locator('#bet-value').innerText()).trim(),'2.00','threshold fixture requires the selected 2 ETB stake');
  // Bound accepted fixture rounds even if the client limit is broken. Any
  // attempted extra POST still fails this test and appears in HTTP evidence.
  f.outcome=scenario.outcome;f.remainingRounds=scenario.rounds;
  try{
   await page.locator('#auto-start').click();
   await page.waitForFunction(()=>document.getElementById('auto').dataset.active==='false'&&
    document.getElementById('zplay').dataset.phase==='ready'&&!document.getElementById('spin').disabled);
   await page.waitForTimeout(250);
   assert.equal(count(f,'/api/slots/spin')-postsBefore,scenario.rounds,scenario.name+' limit POST count');
   assert.equal(f.rounds.size-roundsBefore,scenario.rounds,scenario.name+' accepted rounds');
   assert.equal(f.balance-balanceBefore,scenario.delta,scenario.name+' net balance threshold');
   assert.equal((await page.locator('#balance').innerText()).replace(/[^0-9.]/g,''),money(f.balance));
   result.autoplayLimits.push({control:scenario.name,threshold:scenario.limit,selectedCount:25,acceptedRounds:scenario.rounds,
    balanceBefore:money(balanceBefore),balanceAfter:money(f.balance),extraPosts:0});
  }finally{f.outcome='WIN';f.remainingRounds=null}
 }
 await page.locator('#auto').click();
 for(const name of ['win','loss','gain'])await page.locator('#auto-'+name+'-enabled').uncheck();
 await page.locator('#auto-win-enabled').check();
 const invalidPosts=count(f,'/api/slots/spin'),invalidRounds=f.rounds.size,balanceBeforeInvalid=f.balance;
 f.remainingRounds=0;
 try{
  for(const value of ['0','-1','abc','1.001']){
   await page.locator('#auto-win-limit').fill(value);await page.locator('#auto-start').click();
   assert.ok(await page.locator('#auto-dialog').isVisible());assert.ok((await page.locator('#auto-error').innerText()).trim());
   assert.equal(await page.locator('#auto').getAttribute('data-active'),'false');
   await page.waitForTimeout(100);assert.equal(count(f,'/api/slots/spin'),invalidPosts,'invalid threshold must not POST');
  }
  assert.equal(f.rounds.size,invalidRounds);assert.equal(f.balance,balanceBeforeInvalid);
  await page.locator('#auto-win-enabled').uncheck();await close(page,'auto-dialog');
 }finally{f.remainingRounds=null}
 result.checks.push('AUTO single-win, net-loss and net-gain limits stop after 1/2/2 bounded rounds; invalid thresholds place zero bets');
}
async function exercise(origin,viewport){
 current=fixture();const f=current,result={name:viewport.width+'x'+viewport.height,viewport,scope:viewport.width===FULL_WIDTH?'FULL_ACCEPTANCE':'RESPONSIVE_AND_PLAY',checks:[],layouts:[],screenshots:[],controlStates:[],sceneChecks:[],backdropChecks:[],observationChunks:[],consoleErrors:[],pageErrors:[],httpErrors:[],requestFailures:[]};
 report.viewports.push(result);
 const shortSide=Math.min(viewport.width,viewport.height),mobile=shortSide<=430;
 const context=await browser.newContext({viewport,deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:shortSide<=768,reducedMotion:'no-preference'});
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.externalRequests.push(url);return route.abort('blockedbyclient')});
 await context.addInitScript(instrument);const page=await context.newPage();
 page.setDefaultTimeout(10000);page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text())});
 page.on('pageerror',e=>result.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)result.httpErrors.push({url:r.url(),status:r.status()})});
 page.on('requestfailed',r=>result.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
 try{
  await page.goto(origin+PREFIX,{waitUntil:'networkidle'});await page.bringToFront();await restorePage(page);
  assert.equal(count(f,'/api/slots/spin'),0);assert.equal(await page.evaluate(()=>__m20QA.media.filter(x=>x.event==='play').length),0);
  await moveAway(page);await controls(page,result,'idle original atlas',IDLE_CONTROLS);await assertNoHelpArt(page);
  result.checks.push('Six original atlas controls render within reachable hitboxes; no annotated help images are requested');
  const idleScene=await latestScene(page),idleWheel=wheelParts(idleScene);closeNumber(idleWheel.angle,0,'idle original centre2 with neighbours5/4');
  result.sceneChecks.push({label:'idle original artwork',angle:idleWheel.angle,presented:artwork(idleScene)});
  await inspectBackdrop(page,result,'idle');
  result.checks.push('Original upright title, frame, symbols and multiplier ring draw over one full-page verified backdrop without a foreground rectangle');
  result.checks.push('Boot: verified assets, existing-session GET, no spin, no sound autoplay');await audit(page,'main',result);await screenshot(page,result,'idle');
  if(viewport.width===FULL_WIDTH)for(const id of CONTROL_IDS)await pointerStates(page,f,result,id,IDLE_CONTROLS[id].slice('Buttons/'.length));
  await page.locator('#bet').click();await audit(page,'bet-dialog',result);await page.locator('#bet-options button').filter({hasText:/^2(?:\.00)?\s*ETB$/}).click();
  assert.match(await page.locator('#bet-value').innerText(),/2(?:\.00)?/);assert.equal(count(f,'/api/slots/spin'),0);result.checks.push('BET selection is read-only');
  const before=count(f,'/api/slots/spin'),normalStart=Date.now(),normalScene=await page.evaluate(()=>__m20QA.sceneSequence),normalBackdrop=await page.evaluate(()=>__m20QA.backdropSequence);await page.locator('#spin').click();
  await page.waitForFunction(()=>document.getElementById('spin').textContent.includes('STOP'));
  await controls(page,result,'normal pending STOP',{spin:'Buttons/SpinStop',auto:'Buttons/AutoPlayDisabled',bet:'Buttons/BetDisabled',turbo:'Buttons/QuickPlayDisabled'});await ready(page);
  result.normalSpinMs=Date.now()-normalStart;assert.equal(count(f,'/api/slots/spin'),before+1);assert.equal((await page.locator('#balance').innerText()).replace(/[^0-9.]/g,''),money(f.balance));
  const ordinaryFrames=await page.evaluate(start=>__m20QA.sceneFrames.filter(frame=>frame.sequence>start),normalScene);
  assert.equal(ordinaryFrames.some(frame=>winDraws(frame).length>0),false,'the ordinary3x baseline has no high-win presentation');
  assert.equal(await page.evaluate(()=>__m20QA.media.filter(x=>x.event==='play').length),0);result.checks.push('Normal SPIN: one POST, integer receipt balance, five-reel presentation, sound still off');
  await inspectWheelMotion(page,normalScene,result,'normal SPIN',f.round.result);result.checks.push('Numbers and Light rotate together while the original selector stays fixed and the receipt grid settles exactly');
  assert.equal(await inspectBackdrop(page,result,'settled'),normalBackdrop,'static backdrop does not repaint on reel or wheel animation');
  await verifyFreshLine(page,f,result);
  await verifyDirectSound(page,f,result);
  await audit(page,'settled',result);await screenshot(page,result,'settled');
  await page.locator('#menu').click();await audit(page,'menu-dialog',result);await page.locator('#menu-history').click();
  assert.ok((await page.locator('#history-dialog').innerText()).includes(f.round.result.roundId));
  assert.equal(await page.locator('#history-dialog .history-link').getAttribute('href'),'/');
  assert.equal((await page.locator('#history-dialog .history-link').innerText()).trim(),'Open player lobby');await close(page,'history-dialog');
  await page.locator('#menu').click();await page.locator('#menu-rules').click();await audit(page,'rules-dialog',result);await screenshot(page,result,'rules');await close(page,'rules-dialog');
  result.checks.push('MENU, HISTORY and RULES operate on settled server state');
  const doubleBefore=count(f,'/api/slots/spin'),stopStart=Date.now();await page.locator('#spin').dblclick({delay:35});await ready(page);
  result.stopSpinMs=Date.now()-stopStart;assert.equal(count(f,'/api/slots/spin'),doubleBefore+1);result.checks.push('Double SPIN/STOP tap: one POST and one settled round');
  const musicBeforeEffects=await page.evaluate(()=>__m20QA.media.filter(event=>event.event==='play'&&event.loop).length);
  await openSound(page);await audit(page,'sound-dialog',result);
  await page.locator('#music-opt').uncheck();
  if(await page.locator('#effects-opt').count())await page.locator('#effects-opt').check();
  const save=page.locator('#sound-save');if(await save.count())await save.click();else await page.locator('#sound-on').click();
  await moveAway(page);await controls(page,result,'sound opted in',{sound:'Buttons/SoundOn'});
  if(viewport.width===FULL_WIDTH)await pointerStates(page,f,result,'sound','SoundOn');
  const plays=await page.evaluate(()=>__m20QA.media.filter(x=>x.event==='play').length);await page.locator('#turbo').click();
  await audit(page,'quick-dialog',result);await page.locator('#quick-confirm').click();await page.waitForTimeout(100);
  await moveAway(page);await controls(page,result,'turbo ready',{spin:'Buttons/SpinTurbo',turbo:'Buttons/QuickPlayTurbo'});
  if(viewport.width===FULL_WIDTH){await page.locator('#spin').hover();await controls(page,result,'turbo SPIN hover',{spin:'Buttons/SpinTurboHover'});await moveAway(page)}
  assert.ok(await page.evaluate(n=>__m20QA.media.filter(x=>x.event==='play').length>n,plays));
  assert.equal(await page.evaluate(()=>__m20QA.media.filter(x=>x.event==='play'&&x.loop).length),musicBeforeEffects,'opting into effects alone cannot restart background music');
  const soundStart=await page.evaluate(()=>__m20QA.media.length),soundSpinBefore=count(f,'/api/slots/spin');
  await page.locator('#spin').click();await page.waitForFunction(()=>document.getElementById('spin').dataset.spinning==='true');
  await controls(page,result,'turbo pending STOP',{spin:'Buttons/SpinTurboStop',turbo:'Buttons/QuickPlayDisabled'});
  await ready(page);assert.equal(count(f,'/api/slots/spin'),soundSpinBefore+1);
  const roundSounds=await page.evaluate(start=>__m20QA.media.slice(start),soundStart);
  const audioCount=file=>roundSounds.filter(x=>x.event==='play'&&new URL(x.src).pathname.endsWith('/'+file)).length;
  assert.equal(audioCount('spin.mp3'),1);assert.equal(audioCount('reel-stop.mp3'),5);assert.equal(audioCount('win.mp3'),1);
  assert.ok(roundSounds.some(x=>x.event==='play-resolved'),'user-initiated real audio playback resolved');
  result.checks.push('Opted-in fast SPIN plays one spin, five reel-stop and one win clip from verified audio');
  await openSound(page);
  await page.locator('#effects-opt').uncheck();await page.locator('#music-opt').uncheck();await page.locator('#sound-save').click();
  if(await page.locator('#turbo').getAttribute('aria-pressed')==='true')await page.locator('#turbo').click();result.checks.push('Effects require opt in; music remains off; mute restores silence');
  await page.locator('#auto').click();await audit(page,'auto-dialog',result);const armedBefore=count(f,'/api/slots/spin');
  await page.locator('[data-auto-count="25"]').click();
  await page.waitForTimeout(100);assert.equal(count(f,'/api/slots/spin'),armedBefore);await screenshot(page,result,'autoplay');
  await close(page,'auto-dialog');result.checks.push('Selecting AUTO count alone cannot place a wager');
  if(viewport.width===FULL_WIDTH){
   await page.locator('#auto').click();await page.evaluate(()=>{__m20QA.holdAuto=true});await page.locator('#auto-start').click();
   await page.waitForFunction(()=>document.getElementById('auto').dataset.active==='true'&&document.getElementById('zplay').dataset.phase==='spinning');
   await inspectAutoCounter(page,result,'AUTO pending first accepted round',24);
   await page.waitForFunction(()=>__m20QA.held.length>0);const queuedPosts=count(f,'/api/slots/spin');
   await inspectAutoCounter(page,result,'AUTO first settled round with continuation queued',24);
   await pointerStates(page,f,result,'auto','AutoPlayStop');
   await page.locator('#auto').click();if(await page.locator('#auto-dialog').isVisible())await page.locator('#auto-stop').click();
   await page.evaluate(()=>__m20QA.releaseAuto());await page.waitForTimeout(200);assert.equal(count(f,'/api/slots/spin'),queuedPosts);
   await ready(page);result.checks.push('STOP AUTO cancels the already queued next-round callback');
   await verifyLargeAutoStop(page,f,result);
   await verifyAutoLimits(page,f,result);
   f.failNext='AFTER_COMMIT_503';const disconnectBefore=count(f,'/api/slots/spin'),roundsBefore=f.rounds.size;
   await beginHeldPointer(page);await page.locator('#retry').waitFor({state:'visible'});await page.mouse.up();await moveAway(page);
   await controls(page,result,'ambiguous round disabled SPIN',{spin:'Buttons/SpinDisabled',auto:'Buttons/AutoPlayDisabled',bet:'Buttons/BetDisabled'});
   const initial=f.requests.filter(x=>x.path==='/api/slots/spin').at(-1).body;await screenshot(page,result,'recover-required');
   assert.equal(f.rounds.size,roundsBefore+1);assert.ok(await page.locator('#spin').isDisabled());
   assert.ok(await page.locator('#win-banner').isHidden());assert.ok(await page.locator('#win-actions').isHidden());
   result.observationChunks.push(await observe(page));await page.reload({waitUntil:'networkidle'});await page.locator('#loading').waitFor({state:'hidden'});
   if(await page.locator('#sound-prompt').isVisible())await page.locator('#sound-off').click();
   await page.locator('#retry').waitFor({state:'visible'});assert.equal(count(f,'/api/slots/spin'),disconnectBefore+1);
   await page.locator('#retry').click();await ready(page);
   const replay=f.requests.filter(x=>x.path==='/api/slots/spin').at(-1).body;
   assert.equal(replay.roundToken,initial.roundToken);assert.equal(replay.bet,initial.bet);assert.equal(replay.replayOnly,true);
   assert.equal(f.rounds.size,roundsBefore+1);assert.equal(f.ledger.filter(x=>x.kind==='BET'&&x.token===initial.roundToken).length,1);
   result.checks.push('Committed-then-503 + reload + retry preserves token and one debit');
   await pointerStates(page,f,result,'gamble','Double');
   await pointerStates(page,f,result,'take-win','DoubleTake');
   const gambleBefore=count(f,'/api/slots/gamble'),postBefore=f.requests.filter(x=>x.method==='POST').length;
   await page.locator('#gamble').click();await audit(page,'gamble-dialog',result);assert.equal(f.requests.filter(x=>x.method==='POST').length,postBefore);
   await page.locator('#gamble-red').click();await page.waitForFunction(()=>!document.getElementById('spin').disabled);
   assert.equal(count(f,'/api/slots/gamble'),gambleBefore+1);assert.equal(f.actions.size,1);await screenshot(page,result,'gamble-result');
   await close(page,'gamble-dialog');
   // The accepted parent grid must survive a lost X2 response. The comparison
   // is against this session's own settled canvas, not a fixed pixel golden.
   const parentCanvas=await page.locator('#reels').evaluate(canvas=>canvas.toDataURL());
   const parentRound=f.round.result.roundId,actionsBefore=f.actions.size,postsBeforeAction=count(f,'/api/slots/gamble');
   f.failNextAction='AFTER_COMMIT_503';await page.locator('#gamble').click();await page.locator('#gamble-red').click();
   await page.locator('#retry').waitFor({state:'visible'});
   const pendingAction=f.requests.filter(x=>x.path==='/api/slots/gamble').at(-1).body;
   assert.equal(count(f,'/api/slots/gamble'),postsBeforeAction+1);assert.equal(f.actions.size,actionsBefore+1);
   assert.ok(await page.locator('#spin').isDisabled());assert.ok(await page.locator('#win-banner').isHidden());
   assert.ok(await page.locator('#win-actions').isHidden());
   result.observationChunks.push(await observe(page));await page.reload({waitUntil:'networkidle'});
   await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#retry').waitFor({state:'visible'});
   assert.equal(count(f,'/api/slots/gamble'),postsBeforeAction+1,'X2 reload cannot replay automatically');
   assert.equal(await page.locator('#zplay').getAttribute('data-round-id'),parentRound);
   assert.equal(await page.locator('#reels').evaluate(canvas=>canvas.toDataURL()),parentCanvas,'pending X2 restores its already settled parent canvas');
   assert.equal(await page.evaluate(()=>__m20QA.raf.length),0,'parent restore starts no reel animation');
   assert.equal(await page.evaluate(()=>__m20QA.media.filter(x=>x.event==='play').length),0,'parent restore is silent');
   await screenshot(page,result,'gamble-recover-parent');await page.locator('#retry').click();await ready(page);
   const actionReplay=f.requests.filter(x=>x.path==='/api/slots/gamble').at(-1).body;
   assert.equal(actionReplay.roundToken,pendingAction.roundToken);assert.equal(actionReplay.roundId,pendingAction.roundId);
   assert.equal(actionReplay.choice,pendingAction.choice);assert.equal(actionReplay.expectedStake,pendingAction.expectedStake);
   assert.equal(actionReplay.expectedAttempt,pendingAction.expectedAttempt);assert.equal(actionReplay.replayOnly,true);
   assert.equal(f.actions.size,actionsBefore+1);assert.equal(f.ledger.filter(x=>x.kind==='GAMBLE_BET'&&x.token===pendingAction.roundToken).length,1);
   assert.equal(await page.evaluate(()=>__m20QA.raf.length),0,'X2 recovery never spins the parent again');
   assert.equal((await page.locator('#balance').innerText()).replace(/[^0-9.]/g,''),money(f.balance));
   result.checks.push('Committed X2 then503 + reload restores parent silently; same-token replay settles one action/debit');
   const beforeTake=f.requests.length,balanceBeforeTake=f.balance,ledgerBeforeTake=f.ledger.length;
   await page.locator('#take-win').click();await ready(page);
   const takeRequests=f.requests.slice(beforeTake);assert.ok(takeRequests.length>=1);assert.ok(takeRequests.every(x=>x.method==='GET'));
   assert.equal(f.balance,balanceBeforeTake);assert.equal(f.ledger.length,ledgerBeforeTake);result.checks.push('X2 opening does not wager; RED submits one fixture action; TAKE WIN is GET-only and cannot credit twice');
   const beforeReloadPosts=f.requests.filter(x=>x.method==='POST').length;
   result.observationChunks.push(await observe(page));await page.reload({waitUntil:'networkidle'});await restorePage(page);assert.equal(f.requests.filter(x=>x.method==='POST').length,beforeReloadPosts);
   await page.locator('#menu').click();await page.locator('#menu-history').click();assert.ok((await page.locator('#history-dialog').innerText()).includes(f.round.result.roundId));await close(page,'history-dialog');
   result.checks.push('Settled refresh restores round/history without another POST');await screenshot(page,result,'restored');
   await verifyHoldPointer(page,f,result);
   await verifyWheelReceipts(page,f,result);
   await verifyNiceWin(page,f,result);
   await verifyNiceMenuInterruption(page,f,result);
   await verifyLineCancellation(page,f,result);
   const covered=[...new Set(result.controlStates.flatMap(sample=>sample.controls.map(control=>control.name)))].sort();
   const required=Object.keys(CONTROL_REFERENCE).filter(name=>!UNREACHABLE_CONTROL_TEXTURES.includes(name)).sort();
   assert.deepEqual(covered,required,'every reachable actual control state must be rendered and inspected');
   result.controlCoverage={covered,notReachableInCurrentUI:UNREACHABLE_CONTROL_TEXTURES,
    scope:'All reachable real UI states; unreachable variants are covered by focused component metadata tests, not claimed here.'};
   result.checks.push('All 39 reachable atlas control states have exact crops, rotation, rendered geometry and accessible hitboxes');
  }
  const observed=await observe(page),chunks=[...result.observationChunks,observed];
  const intervals=chunks.flatMap(chunk=>{const times=[...new Set(chunk.raf)];return times.slice(1).map((t,i)=>t-times[i]).filter(dt=>dt>1&&dt<200)});
  result.rafCadence={sampleCount:intervals.length,meanFps:intervals.length?1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length):null,
   medianFps:intervals.length?1000/[...intervals].sort((a,b)=>a-b)[Math.floor(intervals.length/2)]:null,claim:'Browser RAF cadence only; not physical device FPS certification'};
  result.mediaEvents=chunks.flatMap(c=>c.media);result.mediaErrors=chunks.flatMap(c=>c.mediaErrors);
  const idleFrames=observed.raf.length,idleBackdrop=await page.evaluate(()=>__m20QA.backdropSequence);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>__m20QA.raf.length),idleFrames);
  assert.equal(await page.evaluate(()=>__m20QA.backdropSequence),idleBackdrop,'background remains static while idle');
  await assertNoHelpArt(page);assert.equal(result.checks.length,viewport.width===FULL_WIDTH?36:13,'all planned browser acceptance checks ran');
  assert.deepEqual(result.pageErrors,[]);assert.deepEqual(result.mediaErrors,[]);
  assert.deepEqual(result.httpErrors.map(e=>({path:new URL(e.url).pathname,status:e.status})),f.injectedFaults,'only explicitly injected503 responses are permitted');
  assert.ok(result.consoleErrors.every(e=>e.includes('503')&&viewport.width===FULL_WIDTH),'unexpected browser console error');
  assert.deepEqual(result.requestFailures,[]);result.status='PASS';
 }catch(error){result.status='FAIL';result.error=error.stack;await screenshot(page,result,'failure').catch(()=>{});report.errors.push({viewport:result.name,error:error.message})}
 finally{
  result.requests=f.requests;result.ledger=f.ledger;result.injectedFaults=f.injectedFaults;result.roundCount=f.rounds.size;result.actionCount=f.actions.size;result.finalFixtureBalance=money(f.balance);
  await context.close();console.log(JSON.stringify({viewport:result.name,status:result.status,checks:result.checks.length,error:result.error?.split('\n')[0],raf:result.rafCadence}));
 }
}
(async()=>{
 await fs.mkdir(outputDir,{recursive:true});
 try{
  const math=await import(pathToFileURL(path.join(__dirname,'server/official-math.mjs')).href);evaluator=math.evaluateCapturedMath;reference=math.GAME_REFERENCE[GAME_ID];
  const routeSource=await fs.readFile(path.join(__dirname,'player-kv-route.mjs'),'utf8');
  const cspLiteral=routeSource.match(/const CSP=("[^"\n]*");/);assert.ok(cspLiteral,'production route CSP literal must be available');
  productionCSP=JSON.parse(cspLiteral[1]);report.contentSecurityPolicy={policy:productionCSP,source:'player-kv-route.mjs',sourceSha256:digest(Buffer.from(routeSource)),qaInlineException:false};
  const media=await verifyMedia();
  for(const name of ['index.html','style.css','app.mjs','scene.mjs','assets.mjs','controller.mjs','session.mjs','../player-kv-route.mjs'])report.sourceDigests[name]=digest(await fs.readFile(path.join(gameDir,name)));
  if(SERVE_ONLY){
   current=fixture();const origin=await serve(media);report.localOrigin=origin;report.status='MANUAL_QA_SERVER_ONLY';
   console.log(JSON.stringify({mode:report.status,url:origin+PREFIX,verifiedMedia:media.verified.size,realWallet:false,note:'No automated browser checks have run. Stop with SIGINT or SIGTERM.'}));
   await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve)});
   report.manualFixture={requests:current.requests,ledger:current.ledger,roundCount:current.rounds.size,finalBalance:money(current.balance)};
   return;
  }
  let playwrightPath;
  try{playwrightPath=require.resolve('playwright')}catch{
   const modules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules';
   playwrightPath=require.resolve(path.join(modules,'playwright'));
  }
  const {chromium}=require(playwrightPath);
  const systemChromium=await fs.access('/usr/bin/chromium').then(()=>true,()=>false);
  const executable=process.env.M20_QA_CHROMIUM||(systemChromium?'/usr/bin/chromium':chromium.executablePath());report.browser={executable,playwright:playwrightPath};
  const origin=await serve(media);report.localOrigin=origin;
  browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=user-gesture-required']});
  report.browser.version=browser.version();
  for(const viewport of widths)await exercise(origin,viewport);
  assert.deepEqual(report.externalRequests,[],'browser attempted a nonlocal request');
  for(const [name,hash] of Object.entries(report.sourceDigests))assert.equal(digest(await fs.readFile(path.join(gameDir,name))),hash,'source changed during QA: '+name);
  report.status=report.errors.length?'FAIL':'PASS';
 }catch(error){report.status='FAIL';report.errors.push({fatal:error.stack})}
 finally{
  await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));
  report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,report:path.join(outputDir,'report.json'),passed:report.viewports.filter(v=>v.status==='PASS').length,total:report.viewports.length,errors:report.errors}));
  process.exitCode=['PASS','MANUAL_QA_SERVER_ONLY'].includes(report.status)?0:1;
 }
})();
