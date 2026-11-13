// Resumeable all-catalogue public-demo observation. Never uses Superwin accounts.
// A launch/attempt/receipt is evidence, not full feature or parity acceptance.
const {chromium,devices}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {sceneControls,allowedDemo,publicURL,betChangedInDirection,touchObservedDOM}=require('./batch-controls.cjs');
if(process.env.SPECIAL74_OBSERVE_DEMOS!=='1')throw Error('Set SPECIAL74_OBSERVE_DEMOS=1 for public free-demo observation');
const root=path.resolve(__dirname,'../../../..');
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'reports/special74/selected-games.json'),'utf8')).entries;
const run=process.env.SPECIAL74_BATCH_RUN||'all74-'+Date.now();
if(!/^[a-zA-Z0-9-]+$/.test(run))throw Error('Invalid batch identity');
const base=path.join(root,'reports/special74/batch-observations',run);
fs.mkdirSync(base,{recursive:true});
const concurrency=Math.min(4,Math.max(1,Number(process.env.SPECIAL74_BATCH_CONCURRENCY||3)));
const ids=(process.env.SPECIAL74_BATCH_IDS||'').split(',').filter(Boolean);
const deferred=(process.env.SPECIAL74_BATCH_DEFER||'').split(',').filter(Boolean);
const entries=catalogue.filter(e=>!ids.length||ids.includes(e.id)).sort((a,b)=>Number(deferred.includes(a.id))-Number(deferred.includes(b.id)));
const rows=new Map(),priorAttempts=new Map(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const provider=host=>host==='ssgportal.com'||host.endsWith('.ssgportal.com');
const resourceHost=host=>provider(host)||['ssg-public.com','smartsoftgaming.com'].some(d=>host===d||host.endsWith('.'+d));
const blockedProductionHost=host=>['superwin.bet','superwinn.net','admindigi.com','apdiy61.workers.dev','up.railway.app'].some(d=>host===d||host.endsWith('.'+d));
const write=(file,data)=>{const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(data,null,2)+'\n');fs.renameSync(temp,file);};
function checkpoint(){if(process.env.SPECIAL74_BATCH_CHILD==='1')return;write(path.join(base,'index.json'),{schemaVersion:1,run,updatedAt:new Date().toISOString(),requested:entries.length,concurrency,scope:'Official public free demos only; no production accounts, money, runtime export or complete-parity claims',totals:{finished:rows.size,withConfirmedRound:[...rows.values()].filter(r=>r.confirmedRoundIds.length).length,withMedia:[...rows.values()].filter(r=>r.media.length).length,releaseReady:0},entries:entries.map(e=>rows.get(e.id)||{id:e.id,selectedName:e.selectedName,status:'pending'})});}
for(const entry of entries){const file=path.join(base,entry.id,'observation.json');if(fs.existsSync(file)){try{const row=JSON.parse(fs.readFileSync(file));priorAttempts.set(entry.id,Number(row.attempt)||0);if(row.completedAt&&!['interrupted','setup-error','observation-error','sound-dialog-blocks-controls','provider-table-limit','no-game-canvas'].includes(row.status)&&process.env.SPECIAL74_BATCH_RETRY!=='1')rows.set(entry.id,row);}catch{}}}
checkpoint();
function bounded(promise,label,ms=5000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' exceeded '+ms+'ms')),ms);})]).finally(()=>clearTimeout(timer));}
function errorText(error){return String(error?.message||error).split('\n')[0].slice(0,250).replace(/https?:\/\/[^\s]+/g,url=>publicURL(url)||'[URL]');}
async function frameOffset(frame){
 if(!frame.parentFrame())return{x:0,y:0};
 const element=await frame.frameElement(),box=await element.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y};});
 const parent=await frameOffset(frame.parentFrame());return{x:parent.x+box.x,y:parent.y+box.y};
}
// This only reads visible presentation/DOM; it exports no script, cookie or storage.
function domSnapshot(){
 const isVisible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>3&&r.height>3&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0;};
 const safe=raw=>{try{const u=new URL(raw,location.href);return /^https?:$/.test(u.protocol)?u.origin+u.pathname:null;}catch{return null;}};
 const selector='button,[role="button"],input[type="button"],input[type="submit"],a,img,div';
 const controls=[...document.querySelectorAll(selector)].map((el,index)=>({el,index})).filter(x=>isVisible(x.el)).map(({el,index})=>({index,selector,bounds:(()=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};})(),hittable:(()=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===el||el.contains(hit);})(),tag:el.tagName,text:(el.innerText||el.value||'').trim().slice(0,100),aria:el.getAttribute('aria-label'),title:el.getAttribute('title'),id:el.id,src:el.tagName==='IMG'?safe(el.currentSrc||el.src):null,background:getComputedStyle(el).backgroundImage.replace(/url\(["']?([^"')]+)["']?\)/g,(_,url)=>'url('+safe(url)+')'),clickable:el.tagName!=='DIV'||el.getAttribute('role')==='button'||el.hasAttribute('onclick'),disabled:Boolean(el.disabled)||el.getAttribute('aria-disabled')==='true'}));
 const backgrounds=[];
 for(const el of document.querySelectorAll('*')){if(backgrounds.length>=80)break;if(!isVisible(el))continue;const bg=getComputedStyle(el).backgroundImage;for(const match of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)){const url=safe(match[1]);if(url&&!backgrounds.some(x=>x.url===url))backgrounds.push({url,tag:el.tagName,id:el.id});}}
 const mediaElements=[...document.querySelectorAll('audio,video')].map(el=>({type:el.tagName.toLowerCase(),source:safe(el.currentSrc||el.src),volume:el.volume,muted:el.muted,loop:el.loop,paused:el.paused,currentTime:el.currentTime,duration:Number.isFinite(el.duration)?el.duration:null,playbackRate:el.playbackRate}));
 return{location:location.origin+location.pathname,text:(document.body?.innerText||'').slice(0,16000),controls,backgrounds,mediaElements,mediaEvents:window.__special74MediaEvents||[],images:[...document.images].filter(isVisible).map(el=>safe(el.currentSrc||el.src)).filter(Boolean),fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),canvases:[...document.querySelectorAll('canvas')].map(c=>{const s=getComputedStyle(c);return{width:c.width,height:c.height,visible:isVisible(c),cssWidth:s.width,cssHeight:s.height,backgroundSize:s.backgroundSize,backgroundPosition:s.backgroundPosition}}),resources:performance.getEntriesByType('resource').map(r=>safe(r.name)).filter(Boolean)};
}
const domPatterns={
 'bet-plus':/^(?:increase bet|bet increase|bet plus|plus bet|bet\+|bet-plus)$/i,
 'bet-minus':/^(?:decrease bet|bet decrease|bet minus|minus bet|bet-|bet-minus)$/i,
 spin:/^spin$/i,menu:/^(?:menu|open menu|menu-open)$/i,
 take:/^(?:take win|collect|collect win)$/i,exit:/^exit$/i,
 close:/^(?:close|close menu|back to game)$/i,
 autoplay:/^(?:autoplay|auto play)$/i,settings:/^settings$/i,history:/^(?:history|bet history)$/i,
 rules:/^(?:rules|paytable|pay table|game rules|help)$/i,information:/^(?:about|about game|game info|game information|information|info)$/i,'sound-on':/^(?:sound on|enable sound|unmute)$/i,'sound-off':/^(?:sound off|disable sound|mute)$/i
};
function domMatches(c,kind){if(c.disabled)return false;if(kind==='menu'&&/mobile-menu-open-icon\.(png|webp)/i.test(c.background||''))return true;if(!c.clickable)return false;const labels=[c.text,c.aria,c.title,c.id].filter(Boolean);return labels.some(x=>domPatterns[kind]?.test(x))||(kind==='menu'&&/\/mobile-menu-open-icon\.(png|webp)$/i.test(c.src||''));}
(async()=>{
 const {hookPresentation,readPresentation}=await import('./capture-scene.mjs');
 const browser=await chromium.launch({executablePath:process.env.SPECIAL74_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
 let stopping=false;process.on('SIGINT',()=>{stopping=true;checkpoint();browser.close().catch(()=>{});});
 async function observe(entry,attempt){
  const folder=path.join(base,entry.id,'attempt-'+attempt);fs.mkdirSync(folder,{recursive:true});console.log(JSON.stringify({starting:entry.id,name:entry.selectedName,attempt}));
  const row={id:entry.id,selectedName:entry.selectedName,officialPage:entry.officialIdentity.url,publishedDemoUrl:entry.officialIdentity.demoUrl,demoUrl:allowedDemo(entry.officialIdentity.demoUrl),attempt,startedAt:new Date().toISOString(),status:'loading',actions:[],confirmedRoundIds:[],rounds:[],media:[],networkFailures:[],blockedRequests:[],productionRequests:0,featureCoverageComplete:false,parityVerified:false,ready:false,artifacts:[]};
  try{const hold=JSON.parse(fs.readFileSync(path.join(root,'reports/special74/batch-observations/active-reference-sessions.json')));if(hold.expiresAt>Date.now()&&hold.ids?.includes(entry.id)){row.status='deferred-active-reference-session';row.deferredReason=hold.reason;row.completedAt=new Date().toISOString();write(path.join(folder,'observation.json'),row);write(path.join(base,entry.id,'observation.json'),row);return row;}}catch{}
  write(path.join(folder,'observation.json'),row);write(path.join(base,entry.id,'observation.json'),row);
  const dpr=Math.max(1,Math.min(3,Number(process.env.SPECIAL74_DEVICE_SCALE_FACTOR||1)));row.browserConfiguration={device:'Pixel 7',viewport:devices['Pixel 7'].viewport,deviceScaleFactor:dpr,observationOnly:true};const context=await browser.newContext({...devices['Pixel 7'],deviceScaleFactor:dpr,serviceWorkers:'block'});context.setDefaultTimeout(1800);const deadline=setTimeout(()=>{row.deadlineExceeded=true;context.close().catch(()=>{});},Math.max(30000,Number(process.env.SPECIAL74_GAME_DEADLINE_MS||90000)-2000));
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(/^https?:$/.test(u.protocol)&&blockedProductionHost(u.hostname)){row.blockedRequests.push({url:publicURL(u.href),reason:'production-platform-isolation'});return route.abort();}return route.continue();});
  if(context.routeWebSocket)await context.routeWebSocket('**/*',route=>{const u=new URL(route.url());if(!blockedProductionHost(u.hostname))route.connectToServer();else{row.blockedRequests.push({url:u.origin+u.pathname,reason:'production-platform-isolation-websocket'});route.close();}});
  await context.addInitScript(()=>{
   performance.setResourceTimingBufferSize(10000);
   window.__special74MediaEvents=[];
   for(const event of ['play','pause','volumechange','ratechange','loadedmetadata','ended'])addEventListener(event,({target})=>{
    if(!(target instanceof HTMLMediaElement)||window.__special74MediaEvents.length>=200)return;
    let source=null;try{const u=new URL(target.currentSrc||target.src,location.href);if(/^https?:$/.test(u.protocol))source=u.origin+u.pathname;}catch{}
    window.__special74MediaEvents.push({event,at:performance.now(),type:target.tagName.toLowerCase(),source,volume:target.volume,muted:target.muted,loop:target.loop,paused:target.paused,playbackRate:target.playbackRate});
   },true);
  });
  const page=await context.newPage();let activeAction=null,soundConfirmed=false;const hookedFrames=new Set();const responseJobs=new Set();
  function addMedia(raw,status,type,source){const clean=publicURL(raw);if(!clean||!resourceHost(new URL(clean).hostname))return;if(!row.media.some(m=>m.url===clean)){row.media.push({url:clean,status,type,source});if(row.media.length%20===0){write(path.join(folder,'observation.json'),row);write(path.join(base,entry.id,'observation.json'),row);}}}
  page.on('response',response=>{const job=(async()=>{try{const u=new URL(response.url()),type=response.request().resourceType();if(['image','media','font'].includes(type)||/\.(?:png|jpe?g|webp|gif|svg|mp3|ogg|m4a|aac|wav|mp4|webm|woff2?|ttf|otf|atlas\.txt)(?:\?|$)/i.test(u.href))addMedia(u.href,response.status(),type,'response');if(activeAction?.startsWith('spin')&&provider(u.hostname)&&u.pathname.includes('/api/GenericSlotApi/Event/')){const info=(await response.json()).Board?.GameInfo,deal=info?.DealNumber;if(typeof deal==='string'&&!deal.endsWith('.0')&&!row.confirmedRoundIds.includes(deal)){row.confirmedRoundIds.push(deal);row.rounds.push({deal,win:info.Win,multiplier:info.Multiplier,action:activeAction,at:new Date().toISOString()});write(path.join(folder,'observation.json'),row);write(path.join(base,entry.id,'observation.json'),row);}}}catch{}})();responseJobs.add(job);job.finally(()=>responseJobs.delete(job));});
  page.on('requestfailed',request=>{if(row.networkFailures.length<150)row.networkFailures.push({url:publicURL(request.url()),error:request.failure()?.errorText});});
  async function state(){const frames=[];for(const frame of page.frames()){try{if(!provider(new URL(frame.url()).hostname))continue;const dom=await bounded(frame.evaluate(domSnapshot),'DOM snapshot'),scene=await bounded(frame.evaluate(readPresentation),'presentation snapshot').catch(()=>null),offset=await bounded(frameOffset(frame),'iframe geometry'),observed=sceneControls(scene,offset,page.viewportSize());for(const media of dom.backgrounds)addMedia(media.url,null,'image','computed-background');for(const url of dom.images)addMedia(url,null,'image','visible-image');frames.push({frame,dom,scene,observed,offset});}catch{}}return frames;}
  async function capture(name,frames=undefined){frames=frames||await state();const snapshot=frames.map(({frame,...r})=>r);const file=path.join(folder,name+'.json');write(file,{at:new Date().toISOString(),frames:snapshot});row.artifacts.push({kind:name,path:path.relative(root,file),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});try{const cdp=await context.newCDPSession(page);let png;try{png=await bounded(cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}),'screenshot');}finally{await bounded(cdp.detach(),'screenshot detach',1000).catch(()=>{});}const image=path.join(folder,name+'.png');fs.writeFileSync(image,Buffer.from(png.data,'base64'));row.artifacts.push({kind:name+'-screenshot',path:path.relative(root,image),sha256:crypto.createHash('sha256').update(fs.readFileSync(image)).digest('hex')});}catch(error){row.captureError=errorText(error);}write(path.join(folder,'observation.json'),row);write(path.join(base,entry.id,'observation.json'),row);return frames;}
  async function dismissSound(){
   if(soundConfirmed)return false;
   let attempted=false;
   for(const frame of page.frames()){
    try{if(!provider(new URL(frame.url()).hostname))continue;}catch{continue;}
    const control=await bounded(frame.evaluate(()=>{
     if(!/would you like sound|play with sounds/i.test(document.body?.innerText||''))return null;
     const selector='a,button,[role="button"]';
     for(const [index,el] of [...document.querySelectorAll(selector)].entries()){
      if(!/^yes$/i.test(el.textContent.trim()))continue;
      const r=el.getBoundingClientRect(),s=getComputedStyle(el),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      if(r.width<4||r.height<4||s.visibility==='hidden'||s.display==='none'||!(hit===el||el.contains(hit)))continue;
      return{index,selector,exactText:true,tag:el.tagName,text:el.textContent.trim(),bounds:{x:r.x,y:r.y,w:r.width,h:r.height},hittable:hit===el||el.contains(hit)};
     }return null;
    }),'sound control',3000).catch(()=>null);
    if(!control)continue;
    const action={name:'sound-yes',target:{source:'visible-dom',...control},attempted:false,effectVerified:false};row.actions.push(action);
    try{action.input=await touchObservedDOM(control,frame);action.attempted=true;attempted=true;await sleep(250);action.effectVerified=await bounded(frame.evaluate(()=>!/would you like sound|play with sounds/i.test(document.body?.innerText||'')),'sound effect',2000).catch(()=>false);soundConfirmed=action.effectVerified;}catch(error){action.error=errorText(error);}
   }
   return attempted;
  }
  async function sampleStableBet(item){
   const samples=[];
   for(let i=0;i<4;i++){
    if(i)await sleep(500);
    const scene=await bounded(item.frame.evaluate(readPresentation),'bet presentation',2000).catch(()=>null);
    samples.push(sceneControls(scene,item.offset,page.viewportSize()).bet);
    if(samples.length>=3&&samples.at(-1)!==null&&samples.slice(-3).every(v=>v===samples.at(-1)))return{value:samples.at(-1),stable:true,samples};
   }
   return{value:samples.at(-1)||null,stable:false,samples};
  }
  async function tap(kind,actionName=kind){const before=await state();for(const item of before){const dom=item.dom.controls.find(c=>domMatches(c,kind));const pixi=item.observed.controls.find(c=>c.kind===kind);if(!dom&&!pixi)continue;const action={name:actionName,startedAt:new Date().toISOString(),target:dom?{source:'dom',...dom}:pixi,attempted:false,effectVerified:false,confirmedRoundIds:[]};row.actions.push(action);activeAction=actionName;const oldRounds=new Set(row.confirmedRoundIds);try{if(kind==='bet-plus'||kind==='bet-minus')action.beforeBetSample=await sampleStableBet(item);if(dom)action.input=await touchObservedDOM(dom,item.frame);else{const offset=await frameOffset(item.frame),localX=pixi.x-offset.x,localY=pixi.y-offset.y;const unblocked=await item.frame.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName==='CANVAS',{x:localX,y:localY});action.canvasHitTest=unblocked;await page.mouse.click(pixi.x,pixi.y);action.input={mode:'mouse',x:pixi.x,y:pixi.y};}action.attempted=true;if(kind==='spin'){for(let i=0;i<24&&!row.confirmedRoundIds.some(id=>!oldRounds.has(id));i++)await sleep(500);await sleep(1500);}else await sleep(kind==='bet-plus'||kind==='bet-minus'?2200:900);const after=await capture(actionName);action.confirmedRoundIds=row.confirmedRoundIds.filter(id=>!oldRounds.has(id));action.beforeBet=item.observed.bet;action.afterBet=after.find(x=>x.dom.location===item.dom.location)?.observed.bet||null;if(kind==='bet-plus'||kind==='bet-minus'){action.afterBetSample=await sampleStableBet(item);action.beforeBet=action.beforeBetSample.value;action.afterBet=action.afterBetSample.value;}action.visibleTextChanged=JSON.stringify(before.map(x=>x.dom.text))!==JSON.stringify(after.map(x=>x.dom.text));if(kind==='spin')action.effectVerified=action.confirmedRoundIds.length>0;else if(kind==='bet-plus'||kind==='bet-minus')action.effectVerified=Boolean(action.beforeBetSample?.stable&&action.afterBetSample?.stable&&betChangedInDirection(kind,action.beforeBet,action.afterBet));else{action.effectVerified=false;action.effectEvidence=action.visibleTextChanged?'visible-text-changed-needs-semantic-review':'no-visible-text-change';}return true;}catch(error){action.error=errorText(error);return false;}finally{activeAction=null;action.completedAt=new Date().toISOString();write(path.join(folder,'observation.json'),row);write(path.join(base,entry.id,'observation.json'),row);}}row.actions.push({name:actionName,attempted:false,effectVerified:false,reason:'No unambiguous visible named control'});return false;}
  try{
   const launchResponse=await page.goto(row.demoUrl,{waitUntil:'domcontentloaded',timeout:35000});console.log(JSON.stringify({navigated:entry.id,url:publicURL(page.url())}));
   if(launchResponse&&launchResponse.status()>=400){row.status='provider-launch-unavailable';row.providerStatus=launchResponse.status();await capture('provider-error');return row;}
   let ready=false;
   const loadDeadline=Date.now()+Math.min(45000,Number(process.env.SPECIAL74_GAME_DEADLINE_MS||45000)/2);
   for(let pass=0;pass<50&&Date.now()<loadDeadline;pass++){
    for(const frame of page.frames()){
     try{if(!provider(new URL(frame.url()).hostname))continue;}catch{continue;}
     if(!hookedFrames.has(frame)&&await frame.evaluate(()=>Boolean(window.PIXI)).catch(()=>false)){await frame.evaluate(hookPresentation).catch(()=>{});hookedFrames.add(frame);}

    }
    await dismissSound();await sleep(500);const current=[];
    for(const frame of page.frames()){
     try{if(!provider(new URL(frame.url()).hostname))continue;}catch{continue;}
     current.push(await frame.evaluate(()=>({text:(document.body?.innerText||'').slice(0,5000),canvas:[...document.querySelectorAll('canvas')].some(c=>c.width>100&&c.getBoundingClientRect().width>100),pixi:Boolean(window.PIXI),stage:Boolean(window.__special74Views?.length),named:(()=>{const nodes=(window.__special74Views||[]).map(v=>({node:v.stage,distance:Infinity}));let count=0;while(nodes.length&&count++<12000){const item=nodes.pop(),n=item.node;if(!n||n.visible===false||n.worldAlpha===0)continue;const distance=n.interactive?0:item.distance;if(distance<=3&&[n.name,...(n.texture?.textureCacheIds||[])].some(x=>x&&/(?:^|\/)(?:Spin|Plus|Minus|Bet)(?:Vertical|Horizontal|Normal)?$/i.test(x)))return true;nodes.push(...(n.children||[]).map(node=>({node,distance:distance+1})));}return false;})(),spin:[...document.querySelectorAll('button,[role="button"]')].some(el=>/^spin$/i.test(el.innerText?.trim()||'')&&el.getBoundingClientRect().width>0)})).catch(()=>({})));
    }
    if(current.some(x=>/up to 1 tables|table limit|simultaneously/i.test(x.text||''))){row.status='provider-table-limit';break;}
    if(current.some(x=>/Server Error in ['\"/].*Application|Runtime Error[\s\S]*customErrors|HTTP Error 404/i.test(x.text||''))){row.status='provider-launch-unavailable';await capture('provider-error');return row;}
    if(current.some(x=>x.named||x.spin||(pass>=10&&x.canvas&&!x.pixi))){ready=true;break;}
   }
   // Renderers can become interactive before the asynchronous sound dialog appears.
   // Recheck and dismiss that actual dialog before testing underlying controls.
   await sleep(2500);
   let soundBlocked=false;
   for(let pass=0;pass<3;pass++){if(!await dismissSound())break;await sleep(1000);}
   const initial=await capture('initial');
   soundBlocked=initial.some(x=>x.dom.controls.some(c=>/^yes$/i.test(c.text))&&/would you like sound|play with sounds/i.test(x.dom.text));
   if(row.status==='provider-table-limit')return row;
   if(soundBlocked){row.status='sound-dialog-blocks-controls';return row;}
   const canvas=initial.some(x=>x.dom.canvases.some(c=>c.visible&&c.width>100&&c.height>100));ready=initial.some(x=>x.observed.controls.length||x.dom.controls.some(c=>domMatches(c,'spin')));
   row.status=ready?'named-controls-observed':canvas?'canvas-observed-needs-controls-review':'no-game-canvas';
   if(ready){
    await tap('bet-plus');await tap('bet-minus');
    await tap('spin','spin-1');
    if(row.confirmedRoundIds.length)row.status='round-receipt-confirmed-needs-feature-review';
    await tap('take');
    for(const kind of ['sound-on','sound-off'])await tap(kind);
    if(await tap('autoplay','autoplay-settings'))await tap('close','close-autoplay-settings');
   }
   const opened=await tap('menu');
   if(opened){for(const kind of ['rules','information','settings','history']){const success=await tap(kind);if(success){await tap('close','close-'+kind);await tap('menu','reopen-menu-'+kind);}}}
   await capture('final');
   await tap('exit');
  }catch(error){row.status='observation-error';row.error=errorText(error);await capture('failure').catch(()=>{});}
  finally{clearTimeout(deadline);await bounded(Promise.allSettled([...responseJobs]),'response readers',2000).catch(()=>{});row.completedAt=new Date().toISOString();if(stopping){row.status='interrupted';delete row.completedAt;}write(path.join(folder,'observation.json'),row);await bounded(context.close(),'context close',2000).catch(()=>{});}
  return row;
 }
 let cursor=0;const retry=[];
 async function worker(){while(!stopping){const entry=entries[cursor++];if(!entry)return;if(rows.has(entry.id))continue;let row;const gameFolder=path.join(base,entry.id);fs.mkdirSync(gameFolder,{recursive:true});const priorDirectories=fs.readdirSync(gameFolder).map(name=>/^attempt-(\d+)$/.exec(name)).filter(Boolean).map(match=>Number(match[1]));const attempt=Math.max(priorAttempts.get(entry.id)||0,0,...priorDirectories)+1;try{row=await observe(entry,attempt);}catch(error){try{row=JSON.parse(fs.readFileSync(path.join(gameFolder,'observation.json')));}catch{}row={...(row?.attempt===attempt?row:{}),id:entry.id,selectedName:entry.selectedName,attempt,status:'setup-error',error:errorText(error),media:row?.attempt===attempt?row.media:[],confirmedRoundIds:row?.attempt===attempt?row.confirmedRoundIds:[],completedAt:new Date().toISOString(),ready:false};}rows.set(entry.id,row);write(path.join(base,entry.id,'observation.json'),row);checkpoint();console.log(JSON.stringify({id:entry.id,name:entry.selectedName,status:row.status,media:row.media.length,rounds:row.confirmedRoundIds.length,finished:rows.size,total:entries.length}));if(['provider-table-limit','no-game-canvas','observation-error'].includes(row.status))retry.push(entry);}}
 await Promise.all(Array.from({length:concurrency},worker));
 if(process.env.SPECIAL74_BATCH_RETRY_FAILED!=='0')for(const entry of retry){if(stopping)break;const previous=rows.get(entry.id);const row=await observe(entry,(previous.attempt||1)+1).catch(error=>({...previous,retryError:errorText(error)}));row.previousAttempt={status:previous.status,mediaCount:previous.media.length,confirmedRoundIds:previous.confirmedRoundIds};const media=new Map(previous.media.map(m=>[m.url,m]));for(const item of row.media)media.set(item.url,item);row.media=[...media.values()];rows.set(entry.id,row);write(path.join(base,entry.id,'observation.json'),row);checkpoint();console.log(JSON.stringify({retry:entry.id,status:row.status,media:row.media.length,rounds:row.confirmedRoundIds.length}));}
 await bounded(browser.close(),'browser close',2000).catch(()=>{});checkpoint();console.log(JSON.stringify({finished:rows.size,total:entries.length,report:path.relative(root,path.join(base,'index.json'))}));
})().catch(error=>{checkpoint();console.error(errorText(error));process.exitCode=1;});
