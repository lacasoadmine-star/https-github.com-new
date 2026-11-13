// A local, explicitly free official demo session for direct UI inspection.
// CDP stays on loopback; no account credentials or provider executable code are exported.
const {chromium,devices}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../../..');
const entries=JSON.parse(fs.readFileSync(path.join(root,'reports/special74/selected-games.json'),'utf8')).entries;
const entry=entries.find(e=>e.id===process.argv[2]);
if(!entry)throw Error('Known official catalogue entry required');
const url=new URL(entry.officialIdentity.demoUrl);
if(!url.hostname.endsWith('.ssgportal.com')||!/^DEMO(?:_EXH)?$/i.test(url.searchParams.get('Token')||''))throw Error('Explicit official free demo required');
const session=String(Date.now());
const out=path.join(root,'reports/special74/reference-sessions',session,entry.id);fs.mkdirSync(out,{recursive:true});
const report={id:entry.id,selectedName:entry.selectedName,officialPage:entry.officialIdentity.url,demoUrl:url.href,session,startedAt:new Date().toISOString(),confirmedRoundIds:[],rounds:[],media:[],failures:[],productionRequests:0,featureCoverageComplete:false};
const save=()=>fs.writeFileSync(path.join(out,'session.json'),JSON.stringify(report,null,2)+'\n');
(async()=>{
 const {hookPresentation,readPresentation}=await import('./capture-scene.mjs');
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9231'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
 const context=await browser.newContext({...devices['Pixel 7']});
 await context.route(/https?:\/\/(?:[^/]+\.)?(?:superwinn\.net|apdiy61\.workers\.dev)\//,r=>{report.productionRequests++;save();return r.abort();});
 await context.addInitScript(()=>performance.setResourceTimingBufferSize(10000));
 const page=await context.newPage();context.setDefaultTimeout(2500);
 page.on('response',async response=>{
  try{
   const u=new URL(response.url());
   if(/\.(woff2?|ttf|otf|mp3|ogg|webp|png|atlas\.txt)(?:\?|$)/i.test(response.url())&&!report.media.some(m=>m.url===u.origin+u.pathname))report.media.push({url:u.origin+u.pathname,status:response.status(),type:response.request().resourceType()});
   if(u.hostname.endsWith('.ssgportal.com')&&u.pathname.includes('/api/GenericSlotApi/Event/')){
    const info=(await response.json()).Board?.GameInfo,deal=info?.DealNumber;
    if(typeof deal==='string'&&!deal.endsWith('.0')&&!report.confirmedRoundIds.includes(deal)){report.confirmedRoundIds.push(deal);report.rounds.push({deal,win:info.Win,multiplier:info.Multiplier,at:new Date().toISOString()});console.log(JSON.stringify({game:entry.selectedName,deal,confirmed:report.confirmedRoundIds.length}));}
   }
   save();
  }catch{}
 });
 page.on('requestfailed',r=>{try{const u=new URL(r.url());report.failures.push({origin:u.origin,path:u.pathname,error:r.failure()?.errorText});save();}catch{}});
 process.on('SIGINT',async()=>{report.closedAt=new Date().toISOString();save();await browser.close();process.exit(0);});
 await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForTimeout(15000);
 for(const frame of page.frames()){
  if(await frame.evaluate(()=>Boolean(window.PIXI)).catch(()=>false))await frame.evaluate(hookPresentation);
  const prompt=frame.getByText(/^would you like sound\??$|^play with sounds\??$/i,{exact:true});
  if(!await prompt.first().isVisible().catch(()=>false))continue;
  const yes=frame.getByText(/^yes$/i,{exact:true});
  for(let i=0;i<await yes.count();i++)if(await yes.nth(i).isVisible().catch(()=>false)){
   try{await yes.nth(i).click();}catch(error){report.dialogBlocker=error.message.slice(0,500);}
   break;
  }
 }
 await page.waitForTimeout(3000);
 for(const [i,frame]of page.frames().entries()){
  try{if(!new URL(frame.url()).hostname.endsWith('.ssgportal.com'))continue;}catch{continue;}
  try{const scene=await frame.evaluate(readPresentation);if(scene.canvases.length)fs.writeFileSync(path.join(out,'initial-scene-'+i+'.json'),JSON.stringify(scene,null,2)+'\n');}catch{}
  try{fs.writeFileSync(path.join(out,'initial-text-'+i+'.json'),JSON.stringify(await frame.evaluate(()=>({location:location.origin+location.pathname,text:document.body?.innerText||''})),null,2)+'\n');}catch{}
 }
 const cdp=await context.newCDPSession(page);const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await cdp.detach();
 fs.writeFileSync(path.join(out,'initial.png'),Buffer.from(shot.data,'base64'));save();
 console.log(JSON.stringify({open:true,game:entry.selectedName,debugPort:9231,output:out}));
 await new Promise(()=>{});
})().catch(e=>{report.error=e.message;save();console.error(e.message);process.exit(1);});
