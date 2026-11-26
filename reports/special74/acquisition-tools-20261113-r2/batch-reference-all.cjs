// Supervises isolated per-title browsers so a renderer/network hang cannot stall
// the catalogue. Every child writes resumable evidence before expensive actions.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
if(process.env.SPECIAL74_OBSERVE_DEMOS!=='1')throw Error('Explicit public-demo opt-in required');
const root='/workspace/work/superwin-special74';
const run=process.env.SPECIAL74_BATCH_RUN||'all74-'+Date.now();
if(!/^[a-zA-Z0-9-]+$/.test(run))throw Error('Invalid run identity');
const base=path.join(root,'reports/special74/batch-observations',run);fs.mkdirSync(base,{recursive:true});
const selected=JSON.parse(fs.readFileSync(path.join(root,'reports/special74/selected-games.json'))).entries;
const ids=(process.env.SPECIAL74_BATCH_IDS||'').split(',').filter(Boolean),defer=(process.env.SPECIAL74_BATCH_DEFER||'').split(',');
const entries=selected.filter(e=>!ids.length||ids.includes(e.id)).sort((a,b)=>Number(defer.includes(a.id))-Number(defer.includes(b.id)));
const concurrency=Math.max(1,Math.min(4,Number(process.env.SPECIAL74_BATCH_CONCURRENCY||4)));
const deadlineMs=Math.max(20000,Math.min(180000,Number(process.env.SPECIAL74_GAME_DEADLINE_MS||45000)));
const results=new Map(),running=new Set();let cursor=0,stopping=false;
const write=(file,data)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(data,null,2)+'\n');fs.renameSync(file+'.tmp',file);};
function read(entry){try{return JSON.parse(fs.readFileSync(path.join(base,entry.id,'observation.json')));}catch{return null;}}
function checkpoint(){write(path.join(base,'index.json'),{schemaVersion:2,run,updatedAt:new Date().toISOString(),scope:'Official free demo browser observations, not complete game acceptance',requested:entries.length,concurrency,perGameDeadlineMs:deadlineMs,totals:{finished:results.size,withConfirmedRound:[...results.values()].filter(r=>r.confirmedRoundIds?.length).length,withMedia:[...results.values()].filter(r=>r.media?.length).length,releaseReady:0},entries:entries.map(e=>results.get(e.id)||{id:e.id,selectedName:e.selectedName,status:running.has(e.id)?'running':'pending'})});}
const retryStatuses=new Set(['interrupted','setup-error','observation-error','sound-dialog-blocks-controls','provider-table-limit','no-game-canvas','loading','deadline-reached','deferred-active-reference-session']);
for(const entry of entries){const row=read(entry);if(row?.completedAt&&(!retryStatuses.has(row.status)||process.env.SPECIAL74_RESUME_COMPLETED==='1')&&process.env.SPECIAL74_BATCH_RETRY!=='1')results.set(entry.id,row);}
checkpoint();
function killGroup(child,signal){try{process.kill(-child.pid,signal);}catch{}}
function cleanupBrowsers(entry){
 // Playwright launches Chromium in its own process group. Killing the observer
 // group alone can orphan it. Match inherited run/title markers, never all Chrome.
 for(const pid of fs.readdirSync('/proc').filter(x=>/^\d+$/.test(x))){
  try{
   const args=fs.readFileSync(`/proc/${pid}/cmdline`).toString().split('\0');
   if(!/(?:chromium|chrome_crashpad_handler)$/.test(args[0]||''))continue;
   const env=fs.readFileSync(`/proc/${pid}/environ`).toString().split('\0');
   if(!env.includes('SPECIAL74_BATCH_RUN='+run)||!env.includes('SPECIAL74_BATCH_IDS='+entry.id))continue;
   process.kill(Number(pid),'SIGKILL');
  }catch{}
 }
}
async function one(entry){
 running.add(entry.id);checkpoint();const startedAt=new Date().toISOString();
 console.log(JSON.stringify({starting:entry.id,name:entry.selectedName,completed:results.size,total:entries.length}));
 const child=spawn(process.execPath,[path.join(__dirname,'batch-reference.cjs')],{cwd:root,detached:true,env:{...process.env,SPECIAL74_BATCH_RUN:run,SPECIAL74_BATCH_IDS:entry.id,SPECIAL74_BATCH_CONCURRENCY:'1',SPECIAL74_BATCH_CHILD:'1',SPECIAL74_BATCH_RETRY:'1',SPECIAL74_BATCH_RETRY_FAILED:'0'},stdio:['ignore','pipe','pipe']});
 let logs='',timedOut=false;child.stdout.on('data',chunk=>{logs=(logs+chunk).slice(-12000);});child.stderr.on('data',chunk=>{logs=(logs+chunk).slice(-12000);});
 const timer=setTimeout(()=>{timedOut=true;killGroup(child,'SIGTERM');},deadlineMs);
 const hardStop=setTimeout(()=>killGroup(child,'SIGKILL'),deadlineMs+1500);
 const code=await new Promise(resolve=>{child.once('exit',resolve);child.once('error',()=>resolve(-1));});clearTimeout(timer);clearTimeout(hardStop);killGroup(child,'SIGKILL');cleanupBrowsers(entry);
 let row=read(entry);if(!row||row.startedAt<startedAt)row={id:entry.id,selectedName:entry.selectedName,startedAt,actions:[],confirmedRoundIds:[],media:[],ready:false,featureCoverageComplete:false};
 row.supervisor={exitCode:code,timedOut,deadlineMs,completedAt:new Date().toISOString()};
 if(timedOut){row.lastObservedStatus=row.status||'starting';row.status='deadline-reached';}
 else if(!row.status||code!==0)row.status='observation-error';
 row.completedAt=new Date().toISOString();row.ready=false;row.featureCoverageComplete=false;
 const safeLogs=logs.replace(/https?:\/\/[^\s"']+/g,raw=>{try{const u=new URL(raw);return u.origin+u.pathname;}catch{return '[URL]';}});
 write(path.join(base,entry.id,'supervisor.json'),{startedAt,...row.supervisor,output:safeLogs});write(path.join(base,entry.id,'observation.json'),row);if(Number.isInteger(row.attempt))write(path.join(base,entry.id,'attempt-'+row.attempt,'observation.json'),row);
 results.set(entry.id,row);running.delete(entry.id);checkpoint();console.log(JSON.stringify({finished:results.size,total:entries.length,id:entry.id,status:row.status,actions:row.actions?.filter(a=>a.effectVerified).length||0,rounds:row.confirmedRoundIds?.length||0,media:row.media?.length||0}));
}
process.on('SIGINT',()=>{stopping=true;checkpoint();});
async function worker(){while(!stopping){const entry=entries[cursor++];if(!entry)return;if(results.has(entry.id))continue;await one(entry);}}
Promise.all(Array.from({length:concurrency},worker)).then(()=>{checkpoint();console.log(JSON.stringify({completed:results.size,total:entries.length,report:path.relative(root,path.join(base,'index.json'))}));}).catch(error=>{checkpoint();console.error(error.message);process.exitCode=1;});
