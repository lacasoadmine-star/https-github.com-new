import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

// Exact public DEMO link currently published by SmartSoft; no operator credentials.
const ENTRY='https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot100&PortalName=demo&Token=DEMO';
const sourcePage='https://www.smartsoftgaming.com/games/multi-hot-100';
const modules=process.env.ZPLAY_QA_NODE_MODULES;
if(!modules || !path.isAbsolute(modules))throw new Error('ISOLATED_PLAYWRIGHT_PATH_REQUIRED');
const {chromium}=createRequire(import.meta.url)(path.join(modules,'playwright'));
const report={
  schema:'superwin/official-demo-load-probe/v1',game:'Multi Hot 100',sourcePage,
  attemptedAt:new Date().toISOString(),entryStatus:null,entryOrigin:new URL(ENTRY).origin,
  freshGuestContext:true,productionCredentialsUsed:false,manualReferenceRounds:0,
  gameplayVerified:false,artworkParityVerified:false,audioParityVerified:false,
  screenshotsCreated:false,providerProgramPublished:false,assetBodiesPublished:false,
  assets:[],httpStatusCounts:{},consoleErrors:0,pageErrors:0,canvasCount:0,
  browserStarted:false,probeExecuted:false,renderSurfaceObserved:false,outcome:'NOT_STARTED'
};
let browser,context,page,stage='BROWSER_START',lastAsset=0;
const tasks=new Set(),seen=new Set(),maxBody=8*1024*1024;
function observe(response){
  const status=response.status();report.httpStatusCounts[status]=(report.httpStatusCounts[status]??0)+1;
  let u;try{u=new URL(response.url());}catch{return;}
  // Only facts about static image/audio/atlas files. No HTML/program/session/JSON payload is published.
  let filename;try{filename=decodeURIComponent(u.pathname.split('/').at(-1)??'');}catch{return;}
  if(!/\.(?:png|jpe?g|webp|gif|ogg|mp3|wav|atlas|atlas\.txt)$/i.test(filename) &&
     !/^Images-[0-7]\.json$/i.test(filename))return;
  const key=u.origin+'|'+u.pathname;
  if(seen.has(key)||seen.size>=120)return;
  seen.add(key);lastAsset=Date.now();
  const task=(async()=>{
    const item={origin:u.origin,filename:filename.slice(0,160),status,mime:(response.headers()['content-type']??'').split(';')[0]};
    if(status>=200&&status<300){
      const declared=Number(response.headers()['content-length']);
      if(Number.isFinite(declared)&&declared>maxBody){item.declaredBytes=declared;item.hashSkipped='SIZE_LIMIT';}
      else {try{const body=await response.body();item.bytes=body.length;if(body.length<=maxBody)item.sha256=createHash('sha256').update(body).digest('hex');else item.hashSkipped='SIZE_LIMIT';}catch{item.bodyRead='UNAVAILABLE';}}
    }
    report.assets.push(item);
  })().catch(()=>{ /* A missing static metadata record is not a successful asset observation. */ });
  tasks.add(task);void task.finally(()=>tasks.delete(task));
}
async function countCanvases(){
  let total=0;for(const frame of page.frames()){try{total+=await frame.evaluate(()=>document.querySelectorAll('canvas').length);}catch{}}
  return total;
}
try{
  browser=await chromium.launch({headless:true});report.browserStarted=true;
  context=await browser.newContext({viewport:{width:1363,height:936},acceptDownloads:false});
  page=await context.newPage();
  page.on('response',observe);page.on('pageerror',()=>{report.pageErrors++;});
  page.on('console',message=>{if(message.type()==='error')report.consoleErrors++;});
  stage='OFFICIAL_ENTRY';
  const response=await page.goto(ENTRY,{waitUntil:'domcontentloaded',timeout:45000});
  report.entryStatus=response?.status()??null;
  if(report.entryStatus===401||report.entryStatus===403){
    report.outcome='OFFICIAL_ACCESS_DENIED';
  }else if(report.entryStatus!==null&&report.entryStatus>=400){
    report.outcome='OFFICIAL_ENTRY_HTTP_ERROR';
  }else{
    stage='RENDER_OBSERVATION';const deadline=Date.now()+35000;
    while(Date.now()<deadline){
      report.canvasCount=await countCanvases();
      if(report.canvasCount>0&&report.assets.length>=4&&Date.now()-lastAsset>4000)break;
      await page.waitForTimeout(1000);
    }
    report.renderSurfaceObserved=report.canvasCount>0;
    report.outcome=report.renderSurfaceObserved?'RENDER_SURFACE_OBSERVED':'NO_RENDER_SURFACE_OBSERVED';
  }
  report.probeExecuted=true;
}catch(error){
  report.outcome='PROBE_FAILED';report.failure={stage,errorClass:error?.name??'Error'};
  // Avoid printing exception messages/stack: provider redirects can contain session URLs.
}finally{
  await Promise.race([Promise.allSettled([...tasks]),new Promise(resolve=>setTimeout(resolve,3000))]);
  try{await context?.close();}catch{}try{await browser?.close();}catch{}
  report.assets.sort((a,b)=>(a.origin+'/'+a.filename).localeCompare(b.origin+'/'+b.filename));
  report.completedAt=new Date().toISOString();
  console.log('SUPERWIN_OFFICIAL_PROBE_REPORT '+JSON.stringify(report));
}
if(!report.probeExecuted||!report.renderSurfaceObserved)process.exitCode=1;
