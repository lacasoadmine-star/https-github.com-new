// Public provider launch audit. A loaded canvas does not establish gameplay parity.
const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const scope=JSON.parse(fs.readFileSync(path.join(root,'scope/official74.json')));
const output=path.join(__dirname,'official74-browser-audit-20261111.json');
const shots='/workspace/work/demo-observations/official74-fresh';
fs.mkdirSync(shots,{recursive:true});
const report=fs.existsSync(output)?JSON.parse(fs.readFileSync(output)): {startedAt:new Date().toISOString(),source:scope.source,scope:'74 public DEMO launch URLs; no production accounts',fullGameplayParityVerified:false,entries:[]};
const queue=scope.entries.filter(e=>!report.entries.some(r=>r.number===e.number));
const bounded=(promise,ms)=>Promise.race([promise,new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('Observation operation timed out')),ms);t.unref();})]);
const save=()=>fs.writeFileSync(output,JSON.stringify(report,null,2));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 let next=0;
 async function worker(){
  while(next<queue.length){
   const entry=queue[next++],page=await bounded(context.newPage(),5000);
   const rec={number:entry.number,name:entry.name,url:entry.demoUrl,startedAt:new Date().toISOString(),played:false,fullGameplayVerified:false,frames:[],failures:[]};
   page.on('requestfailed',r=>{if(rec.failures.length<8)rec.failures.push({url:r.url().split('?')[0],error:r.failure()?.errorText});});
   try{
    const response=await page.goto(entry.demoUrl,{waitUntil:'domcontentloaded',timeout:20000});rec.httpStatus=response?.status();
    await page.waitForTimeout(12000);
    // Observation never bypasses sound/tutorial prompts or places a wager.
    // Avoid unbounded locator queries in provider frames that have stalled.
    for(const f of page.frames().filter(f=>f.url().startsWith('https://')).slice(0,5))try{
     rec.frames.push(await bounded(f.evaluate(()=>({url:location.origin+location.pathname,title:document.title,text:document.body?.innerText?.slice(0,2200)||'',buttons:[...document.querySelectorAll('button,[role="button"],input[type="button"]')].filter(b=>b.getClientRects().length).map(b=>({text:b.innerText||b.value||'',label:b.getAttribute('aria-label')})).slice(0,24),canvases:[...document.querySelectorAll('canvas')].filter(c=>c.getClientRects().length).map(c=>({width:c.width,height:c.height})),videos:[...document.querySelectorAll('video')].map(v=>({readyState:v.readyState,width:v.videoWidth,height:v.videoHeight}))})),2500));
    }catch{}
    rec.visibleCanvas=rec.frames.some(f=>f.canvases.some(c=>c.width>100&&c.height>100));
    rec.errorTextObserved=rec.frames.some(f=>/time ?out|something went wrong|access denied|not available|unsupported browser/i.test(f.text));
    rec.status=rec.errorTextObserved?'provider-error-visible':rec.visibleCanvas?'canvas-present-gameplay-unverified':'page-opened-gameplay-unverified';
    rec.screenshot=String(entry.number).padStart(2,'0')+'-'+entry.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png';
    await page.screenshot({path:path.join(shots,rec.screenshot),timeout:5000});
   }catch(e){rec.status='launch-error';rec.error=e.message.slice(0,500);}
   finally{await bounded(page.close(),3000).catch(()=>{});}
   rec.finishedAt=new Date().toISOString();report.entries.push(rec);report.entries.sort((a,b)=>a.number-b.number);save();
   console.log(JSON.stringify({completed:report.entries.length,name:rec.name,status:rec.status}));
  }
 }
 try{await Promise.all([worker(),worker()]);report.finishedAt=new Date().toISOString();report.counts=Object.fromEntries([...new Set(report.entries.map(e=>e.status))].map(s=>[s,report.entries.filter(e=>e.status===s).length]));save();console.log(JSON.stringify({complete:true,counts:report.counts}));}
 finally{await context.close();await browser.close();}
})().catch(e=>{save();console.error(e);process.exitCode=1;});
