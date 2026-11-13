// Observe only public DEMO controls. No Superwin account, financial API or production wager.
const {chromium,devices}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
if(process.env.RECORD_REFERENCE_CONTROLS!=='1')throw Error('Explicit reference-observation opt-in required');
const root=path.resolve(__dirname,'../../../..'),folder=path.join(root,'reports/special74');
const plan=JSON.parse(fs.readFileSync(path.join(folder,'reference-run.json'),'utf8'));
const catalogue=JSON.parse(fs.readFileSync(path.join(folder,'selected-games.json'),'utf8')).entries;
const run=process.env.GITHUB_RUN_ID||String(Date.now());
if(!/^\d+$/.test(run))throw Error('Invalid run identity');
const output=path.join(folder,'ci-observations',run);fs.mkdirSync(output,{recursive:true});
const reports=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {hookPresentation,readPresentation}=await import(pathToFileURL(path.join(__dirname,'capture-scene.mjs')).href);
 const browser=await chromium.launch({executablePath:process.env.SPECIAL74_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
 const context=await browser.newContext({...devices['Pixel 7']});
 await context.route(/https?:\/\/(?:[^/]+\.)?(?:superwinn\.net|apdiy61\.workers\.dev)\//,r=>r.abort());
 const page=await context.newPage();page.setDefaultTimeout(2500);
 for(const request of plan.games){
  const entry=catalogue.find(x=>x.id===request.id),url=new URL(entry?.officialIdentity.demoUrl);
  if(!entry||url.protocol!=='https:'||!url.hostname.endsWith('.ssgportal.com')||url.searchParams.get('Token')!=='DEMO'||url.searchParams.get('GameName')!==request.gameName)throw Error('Official demo identity mismatch');
  const report={id:entry.id,selectedName:entry.selectedName,officialPage:entry.officialIdentity.url,demoUrl:url.href,startedAt:new Date().toISOString(),actions:[],confirmedRoundIds:[],rounds:[],networkFailures:[],featureCoverageComplete:false,productionRequests:0};
  const gameOut=path.join(output,entry.id);fs.mkdirSync(gameOut,{recursive:true});
  let gameFrame=null,activeAction=null;
  const onResponse=async response=>{
   const u=new URL(response.url());
   if(activeAction!=='spin'||!u.hostname.endsWith('.ssgportal.com')||!u.pathname.includes('/api/GenericSlotApi/Event/'))return;
   try{const info=(await response.json()).Board?.GameInfo,deal=info?.DealNumber;if(typeof deal==='string'&&!deal.endsWith('.0')&&!report.confirmedRoundIds.includes(deal)){report.confirmedRoundIds.push(deal);report.rounds.push({at:new Date().toISOString(),deal,win:info.Win,multiplier:info.Multiplier});}}catch{}
  };
  const onFailure=request=>{try{const u=new URL(request.url());if(report.networkFailures.length<80)report.networkFailures.push({origin:u.origin,path:u.pathname,error:request.failure()?.errorText});}catch{}};
  page.on('response',onResponse);page.on('requestfailed',onFailure);
  async function capture(name){
   const cdp=await context.newCDPSession(page);
   try{const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(gameOut,name+'.png'),Buffer.from(shot.data,'base64'));}finally{await cdp.detach();}
   let scene=null;
   if(gameFrame)scene=await gameFrame.evaluate(readPresentation).catch(()=>null);
   if(scene)fs.writeFileSync(path.join(gameOut,name+'-scene.json'),JSON.stringify(scene,null,2)+'\n');
   const texts=[];
   for(const frame of page.frames()){try{const u=new URL(frame.url());if(u.hostname.endsWith('.ssgportal.com'))texts.push({url:u.origin+u.pathname,text:(await frame.evaluate(()=>document.body?.innerText||'')).slice(0,14000)});}catch{}}
   fs.writeFileSync(path.join(gameOut,name+'-text.json'),JSON.stringify(texts,null,2)+'\n');
   report.actions.push({name,at:new Date().toISOString(),screenshot:path.relative(root,path.join(gameOut,name+'.png')),confirmedRounds:report.confirmedRoundIds.length});
   return {scene,texts};
  }
  try{
   await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:45000});
   for(let attempt=0;attempt<20;attempt++){
    for(const frame of page.frames()){if(await frame.evaluate(()=>Boolean(window.PIXI)).catch(()=>false)){gameFrame=frame;break;}}
    if(gameFrame)break;await sleep(1500);
   }
   for(const frame of page.frames()){
    const text=await frame.evaluate(()=>document.body?.innerText||'').catch(()=>'');
    if(!/would you like sound|play with sounds/i.test(text))continue;
    const choices=frame.getByText(/^yes$/i,{exact:true});
    for(let i=0;i<await choices.count();i++){const item=choices.nth(i);if(!await item.isVisible().catch(()=>false))continue;const b=await item.boundingBox().catch(()=>null);if(b&&b.x>=0&&b.y>=0&&b.x+b.width<=412&&b.y+b.height<=839){await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);report.actions.push({name:'visible-sound-yes-tapped',at:new Date().toISOString()});break;}}
   }
   if(gameFrame)await gameFrame.evaluate(hookPresentation);
   await sleep(6000);
   const initial=await capture('initial');
   const visible=initial.texts.map(x=>x.text).join('\n');
   if(/up to 1 tables|simultaneously|table limit/i.test(visible)){report.status='provider-table-limit';continue;}
   if(!initial.scene||!/spinvertical/i.test(JSON.stringify(initial.scene))){report.status='loading-or-unrecognized-presentation';continue;}
   report.status='observed-controls';
   // Positions were measured on the archived, matching 412x839 official mobile layouts.
   for(const action of request.actions){
    activeAction=action.name;
    await page.touchscreen.tap(action.x,action.y);
    if(action.name==='spin'){for(let i=0;i<60&&!report.confirmedRoundIds.length;i++)await sleep(500);await sleep(8000);}
    else await sleep(1200);
    await capture(action.name);
   }
   report.completedAt=new Date().toISOString();
  }catch(error){report.status='observation-error';report.error=error.message.slice(0,400);await capture('failure').catch(()=>{});}
  finally{
   activeAction=null;page.off('response',onResponse);page.off('requestfailed',onFailure);
   report.completedAt=new Date().toISOString();fs.writeFileSync(path.join(gameOut,'observation.json'),JSON.stringify(report,null,2)+'\n');reports.push(report);
   fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(reports,null,2)+'\n');
   console.log(JSON.stringify({game:report.selectedName,status:report.status,actions:report.actions.map(x=>x.name),confirmedRounds:report.confirmedRoundIds.length,networkFailures:report.networkFailures.length}));
  }
 }
 await browser.close();
})().catch(error=>{console.error(error.message);process.exitCode=1;});
