// Launch only provider-published free demo URLs, in one browser tab, with no user account.
// A successful launch is not gameplay/feature/parity verification.
const {chromium,devices}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../../..'),report=path.join(root,'reports/special74'),out=path.join(report,'fresh-observations');
fs.mkdirSync(out,{recursive:true});
const input=JSON.parse(fs.readFileSync(path.join(report,'selected-games.json'),'utf8')).entries;
const limit=Number(process.env.OBSERVATION_LIMIT||74),offset=Number(process.env.OBSERVATION_OFFSET||0);
const rows=[];
function demoURL(raw){let u=new URL(/^https?:/.test(raw)?raw:'https://'+raw);if(u.hostname==='www.google.com'&&u.pathname==='/url')u=new URL(u.searchParams.get('q'));if(!u.hostname.endsWith('.ssgportal.com')||!/^DEMO(?:_EXH)?$/i.test(u.searchParams.get('Token')||''))throw Error('Not a provider-published explicit demo URL');return u.href;}
(async()=>{
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--remote-debugging-port=9227'],proxy:{server:process.env.HTTPS_PROXY}});
process.on('SIGINT',async()=>{await browser.close();process.exit(130)});
const context=await browser.newContext({...devices['Pixel 7']});context.setDefaultTimeout(2000);const page=await context.newPage();
await context.addInitScript(()=>performance.setResourceTimingBufferSize(5000));
for(const entry of input.slice(offset,offset+limit)){
 const row={id:entry.id,requestedName:entry.requestedName,selectedName:entry.selectedName,officialPage:entry.officialIdentity.url,startedAt:new Date().toISOString(),status:'loading',confirmedRoundIds:[]};const gameDir=path.join(out,entry.id);fs.mkdirSync(gameDir,{recursive:true});
 const onResponse=async response=>{if(!response.url().includes('/api/GenericSlotApi/Event/'))return;try{const body=await response.json();const id=body.Board?.GameInfo?.DealNumber;if(typeof id==='string'&&!id.endsWith('.0')&&!row.confirmedRoundIds.includes(id))row.confirmedRoundIds.push(id);}catch{}};
 page.on('response',onResponse);
 try{
  row.demoUrl=demoURL(entry.officialIdentity.demoUrl);await page.goto(row.demoUrl,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(6500);
  row.dialogActions=[];
  for(const frame of page.frames()){
   const text=await frame.evaluate(()=>document.body?.innerText||'').catch(()=>'');
   if(!/would you like sound|play with sounds/i.test(text))continue;
   const yes=frame.getByText(/^yes$/i,{exact:true});
   for(let i=0;i<await yes.count();i++){
    const item=yes.nth(i);if(!await item.isVisible().catch(()=>false))continue;
    try{const box=await item.boundingBox();const viewport=page.viewportSize();if(!box||box.x<0||box.y<0||box.x+box.width>viewport.width||box.y+box.height>viewport.height)continue;await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);row.dialogActions.push('visible-sound-yes-control-tapped');break;}
    catch(error){row.dialogActions.push('sound-control-not-actionable: '+error.message.split('\n')[0]);}
   }
  }
  await page.waitForTimeout(1500);
  row.frames=[];
  for(const frame of page.frames()){
   try{const data=await frame.evaluate(()=>({url:location.origin+location.pathname,text:document.body.innerText.slice(0,2400),canvases:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height,displayWidth:c.getBoundingClientRect().width})),media:performance.getEntriesByType('resource').map(r=>r.name).filter(u=>/\.(?:png|webp|jpg|mp3|ogg|json|atlas\.txt)(?:\?|$)/.test(u))}));row.frames.push(data);}catch{}
  }
  const allText=row.frames.filter(x=>x.url.startsWith('https://')&&new URL(x.url).hostname.endsWith('.ssgportal.com')).map(x=>x.text).join('\n');row.status=/up to 1 tables|simultaneously|table limit/i.test(allText)?'provider-table-limit':/error|unavailable|not found|failed/i.test(allText)?'visible-error-needs-review':row.frames.some(f=>f.canvases.some(c=>c.width>100&&c.height>100&&c.displayWidth>0))?'canvas-loaded-needs-visual-and-gameplay-review':'no-game-canvas-yet';
  await page.screenshot({path:path.join(gameDir,'launch.png'),scale:'css',timeout:5000});
  row.screenshot=path.relative(root,path.join(gameDir,'launch.png'));
 }catch(error){row.status='launch-failed';row.error=String(error.message).slice(0,400);await page.screenshot({path:path.join(gameDir,'launch.png'),scale:'css',timeout:5000}).catch(()=>{});}
 finally{page.off('response',onResponse);row.completedAt=new Date().toISOString();fs.writeFileSync(path.join(gameDir,'observation.json'),JSON.stringify(row,null,2)+'\n');rows.push(row);fs.writeFileSync(path.join(out,`batch-${offset}.json`),JSON.stringify(rows.map(({frames,...r})=>r),null,2)+'\n');console.log(JSON.stringify({index:offset+rows.length,total:input.length,name:row.selectedName,status:row.status,confirmedRounds:row.confirmedRoundIds.length}));}
 }
await browser.close();console.log(JSON.stringify({finished:rows.length,played:rows.filter(r=>r.confirmedRoundIds.length).length}));
})().catch(e=>{console.error(e.message);process.exit(1)});
