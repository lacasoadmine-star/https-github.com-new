// Public DEMO observation only. This never connects to a Superwin wallet.
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');
const work='/workspace/work/native-batch25';
const hash=b=>createHash('sha256').update(b).digest('hex');
const clean=u=>u.replace(/([?&](?:token|connectiontoken|sessionid|session|jwt)=)[^&]*/ig,'$1DEMO_SESSION_REDACTED');
const json=(file,data)=>fs.writeFile(file,JSON.stringify(data,null,2)+'\n');

async function observe(browser,reference){
 const name=reference.requestedName,folder=path.join(work,name);await fs.mkdir(folder,{recursive:true});
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
 const network=[],assets=[],api=[],errors=[],pending=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{
  const url=r.url(),type=r.headers()['content-type']||'';
  if(!/google|mixpanel|mxpnl/.test(url))network.push({url:clean(url),status:r.status(),type});
  const host=new URL(url).hostname;
  if(r.ok()&&['static.ssg-public.com','eu-static.ssg-content-2.com'].includes(host)&&!/\/GameLauncher\//.test(url))pending.push((async()=>{
   try{const body=await r.body(),relative='public-cache/'+hash(url)+path.extname(new URL(url).pathname);await fs.writeFile(path.join(work,relative),body);assets.push({url,path:relative,bytes:body.length,sha256:hash(body),type});}catch{}
  })());
  if(r.ok()&&/\/api\/(?:GenericSlotApi|SlotApi)\/(?:Events|Event|Start)/i.test(url))pending.push((async()=>{try{api.push({url:clean(url),method:r.request().method(),request:r.request().postData(),data:await r.json()});}catch{}})());
  if(r.ok()&&/\/Slots\/[^/]+\/Game\.aspx/i.test(url))pending.push(r.body().then(body=>fs.writeFile(path.join(folder,'native-document.html'),body)).catch(()=>{}));
  if(r.ok()&&/\/Locale\.ashx/i.test(url))pending.push(r.body().then(body=>fs.writeFile(path.join(folder,'locale-public.js'),body)).catch(()=>{}));
 });
 const record={requestedName:name,officialPage:reference.page?.url,officialDemo:reference.demo.url,observedAt:new Date().toISOString(),network,assets,api,errors,steps:[]};
 try{
  await page.goto(reference.demo.url,{waitUntil:'domcontentloaded',timeout:30000});
  let frame;
  for(let attempt=0;attempt<35;attempt++){
   for(const candidate of page.frames())if(await candidate.evaluate(()=>typeof slot!=='undefined'&&!!slot.info&&!!slot.data).catch(()=>false)){frame=candidate;break;}
   if(frame)break;await page.waitForTimeout(1000);
  }
  if(!frame){record.error='Native SlotClass runtime did not become ready';}
  else{
   const snapshot=()=>frame.evaluate(()=>{
    const seen=new WeakSet(),safe=value=>JSON.parse(JSON.stringify(value,(key,item)=>{
     if(['texture','textures','container','parent','image','canvas'].includes(key)||typeof item==='function')return undefined;
     if(item&&typeof item==='object'){if(seen.has(item))return undefined;seen.add(item);}return item;
    }));
    return {name:game.name,info:safe(slot.info),data:safe(slot.data),betValues:safe(betValues),box:safe(slot.box.config),buttons:Object.fromEntries(Object.entries(slot.buttons.buttons).map(([name,b])=>[name,{option:b.option,status:b.status,visible:b.container?.worldVisible}]))};
   });
   await page.waitForTimeout(2000);
   record.initial=await snapshot();record.nativeRuntimeReady=true;await page.screenshot({path:path.join(folder,'native-ready.png')});
   const clickButton=async name=>{
    const point=await frame.evaluate(name=>{
     const c=slot.buttons.buttons[name]?.container,view=slot.canvas.canvas.view;if(!c?.worldVisible)return null;
     const b=c.getBounds(),r=view.getBoundingClientRect();return {x:r.x+(b.x+b.width/2)*r.width/view.width,y:r.y+(b.y+b.height/2)*r.height/view.height};
    },name);
    if(!point)return false;
    const element=await frame.frameElement(),outer=await element.boundingBox();
    record.steps.push({action:'Pointer target',button:name,x:point.x,y:point.y});
    await page.mouse.click(point.x+(outer?.x||0),point.y+(outer?.y||0));return true;
   };
   if(await clickButton('bet')){await page.waitForTimeout(400);record.steps.push({action:'Open native bet selector'});await page.screenshot({path:path.join(folder,'native-bet.png')});await frame.evaluate(()=>slot.bets.visible(false));}
   if(await clickButton('spin')){
    record.steps.push({action:'Click native spin; public provider DEMO balance only'});
    await page.waitForTimeout(4500);record.afterSpin=await snapshot();await page.screenshot({path:path.join(folder,'native-after-spin.png')});
   }
   record.spinObserved=!!record.afterSpin;
  }
 }catch(e){record.error=e.message;}
 finally{
  await Promise.allSettled(pending);await json(path.join(folder,'native-observation.json'),record);await context.close();
 }
 console.log(JSON.stringify({name,ready:!!record.nativeRuntimeReady,assets:assets.length,apiResponses:api.length,error:record.error||null,steps:record.steps}));
 return {requestedName:name,ready:!!record.nativeRuntimeReady,assets:assets.length,error:record.error||null};
}

(async()=>{
 await fs.mkdir(path.join(work,'public-cache'),{recursive:true});
 const report=JSON.parse(await fs.readFile(path.join(__dirname,'official-reference-status.json'),'utf8'));
 const requested=new Set(process.argv.slice(2));
 const entries=report.entries.filter(r=>r.officialIndexMatch&&(!requested.size||requested.has(r.requestedName))&&r.declaredGameName!=='Balloon'&&r.declaredGameName!=='FootballX'&&r.declaredGameName!=='TowerX');
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{const results=[];for(let i=0;i<entries.length;i+=2)results.push(...await Promise.all(entries.slice(i,i+2).map(r=>observe(browser,r))));await json(path.join(work,'native-slot-capture-summary.json'),results);}
 finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
