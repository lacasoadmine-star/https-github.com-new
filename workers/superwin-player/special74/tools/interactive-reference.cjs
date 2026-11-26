// Open one explicitly free official demo for normal UI interaction and receipt observation.
const {chromium,devices}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../../..'),folder=path.join(root,'reports/special74');
const entry=JSON.parse(fs.readFileSync(path.join(folder,'selected-games.json'),'utf8')).entries.find(e=>e.id===process.argv[2]);
if(!entry)throw Error('Select a known freshly discovered official game');
const url=new URL(entry.officialIdentity.demoUrl);
if(!url.hostname.endsWith('.ssgportal.com')||!/^DEMO(?:_EXH)?$/.test(url.searchParams.get('Token')||''))throw Error('Explicit provider demo required');
const out=path.join(folder,'fresh-observations',entry.id);fs.mkdirSync(out,{recursive:true});
const report={id:entry.id,selectedName:entry.selectedName,officialPage:entry.officialIdentity.url,demoUrl:url.href,startedAt:new Date().toISOString(),confirmedRoundIds:[],rounds:[],featureCoverageComplete:false,productionRequests:0};
const save=()=>fs.writeFileSync(path.join(out,'interactive-rounds.json'),JSON.stringify(report,null,2)+'\n');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--remote-debugging-port=9230'],proxy:{server:process.env.HTTPS_PROXY}});
 const context=await browser.newContext({...devices['Pixel 7']}),page=await context.newPage();context.setDefaultTimeout(2000);
 process.on('SIGINT',async()=>{save();await browser.close();process.exit(0)});
 page.on('response',async response=>{
  if(!new URL(response.url()).hostname.endsWith('.ssgportal.com')||!response.url().includes('/api/GenericSlotApi/Event/'))return;
  try{const body=await response.json(),info=body.Board?.GameInfo,deal=info?.DealNumber;if(typeof deal!=='string'||deal.endsWith('.0')||report.confirmedRoundIds.includes(deal))return;
   report.confirmedRoundIds.push(deal);report.rounds.push({at:new Date().toISOString(),deal,win:info.Win,multiplier:info.Multiplier});save();console.log(JSON.stringify({game:entry.selectedName,confirmedRounds:report.rounds.length,deal}));
  }catch{}
 });
 await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(12000);
 for(const frame of page.frames()){
  if(!frame.url().includes('.ssgportal.com'))continue;
  const text=await frame.evaluate(()=>document.body?.innerText||'').catch(()=>'');
  if(!/would you like sound|play with sounds/i.test(text))continue;
  const yes=frame.getByText(/^yes$/i,{exact:true});
  for(let i=0;i<await yes.count();i++){const item=yes.nth(i);if(!await item.isVisible().catch(()=>false))continue;const b=await item.boundingBox().catch(()=>null);if(b&&b.x>=0&&b.y>=0&&b.x+b.width<=412&&b.y+b.height<=839){await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);break;}}
 }
 await page.waitForTimeout(1000);const c=await context.newCDPSession(page),shot=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 fs.writeFileSync(path.join(out,'interactive-ready.png'),Buffer.from(shot.data,'base64'));await c.detach();save();
 console.log(JSON.stringify({demoOpen:true,game:entry.selectedName,debugPort:9230,processId:process.pid,screenshot:path.relative(root,path.join(out,'interactive-ready.png'))}));
 await new Promise(()=>{});
})().catch(error=>{report.error=error.message;save();console.error(error.message);process.exit(1)});
