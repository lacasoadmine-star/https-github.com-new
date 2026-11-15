// Local Chromium interaction regression via DevTools Protocol; no external wager endpoints.
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=dirname(fileURLToPath(import.meta.url));
// Organization-managed Chromium blocks loopback navigation; embed the local QA
// application in a data document instead of bypassing network restrictions.
const sourceNames=['catalog.mjs','engine.mjs','fixtures.mjs','preview.mjs'];
const sources=await Promise.all(sourceNames.map(n=>readFile(join(root,n),'utf8')));
const js=sources.map(src=>src.replace(/^import .*?;\s*$/gm,'').replace(/^export /gm,'')).join('\n').replace("if(['localhost','127.0.0.1'].includes(location.hostname))window.__zplayQa",'if(true)window.__zplayQa');
const styleText=await readFile(join(root,'preview.css'),'utf8');
const html=(await readFile(join(root,'preview.html'),'utf8'))
 .replace('<link rel="stylesheet" href="./preview.css">','<style>'+styleText+'</style>')
 .replace('<script type="module" src="./preview.mjs"></script>', '<script>'+js+'</script>');
const tmp=await mkdtemp(join(tmpdir(),'zplay-qa-chrome-'));
const chrome=spawn('chromium',['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--remote-allow-origins=*',`--user-data-dir=${tmp}`,'--remote-debugging-port=0','about:blank'],{stdio:'ignore'});
const sleep=n=>new Promise(resolve=>setTimeout(resolve,n));
let port;
for(let i=0;i<100;i++){try{const content=await readFile(join(tmp,'DevToolsActivePort'),'utf8');port=Number(content.split('\n')[0]);break;}catch{await sleep(75);}}
if(!port)throw Error('Chrome debug socket did not start');
const tabs=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const tab=tabs.find(x=>x.type==='page');assert(tab?.webSocketDebuggerUrl);
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
let serial=0;const callbacks=new Map();const errors=[];
ws.addEventListener('message',evt=>{let m=JSON.parse(evt.data);if(m.id&&callbacks.has(m.id)){const f=callbacks.get(m.id);callbacks.delete(m.id);if(m.error)f.reject(Error(m.error.message));else f.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;callbacks.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evalJS=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const click=async selector=>{await evalJS(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);const r=await evalJS(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height}})()`);assert(r.w>0&&r.h>0);await call('Input.dispatchMouseEvent',{type:'mousePressed',x:r.x,y:r.y,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:r.x,y:r.y,button:'left',clickCount:1});await sleep(90);};
let checks=0;const check=(condition,message)=>{assert.ok(condition,message);checks++;};
try{
 await call('Page.enable');await call('Runtime.enable');
 for(const width of [360,390,430,1280]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:860,deviceScaleFactor:2,mobile:width<800,screenWidth:width,screenHeight:860});
  await call('Page.navigate',{url:'about:blank'});const tree=await call('Page.getFrameTree');await call('Page.setDocumentContent',{frameId:tree.frameTree.frame.id,html});await sleep(850);
  const result=await evalJS(`({count:document.querySelectorAll('#game option').length,ready:document.readyState,canvas:document.getElementById('scene').width,sw:document.documentElement.scrollWidth,iw:window.innerWidth,lab:!!window.__zplayQa,errors:document.querySelector('#scene').getContext('2d')===null})`);
  check(result.count===26,`all games on ${width}px`);check(result.canvas===720,`canvas on ${width}px`);check(result.sw<=result.iw+1,`no horizontal overflow on ${width}px: ${JSON.stringify(result)}`);check(result.lab,`QA interface on ${width}px`);check(!result.errors,`Canvas context on ${width}px`);
 }
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:880,deviceScaleFactor:2,mobile:true,screenWidth:390,screenHeight:880});await call('Page.navigate',{url:'about:blank'});const tree2=await call('Page.getFrameTree');await call('Page.setDocumentContent',{frameId:tree2.frameTree.frame.id,html});await sleep(900);
 await click('#start');await sleep(650);let state=await evalJS('window.__zplayQa.snapshot()');check(state.state==='running'&&state.progress>0,'PopX cascade started');
 await click('#collect');state=await evalJS('window.__zplayQa.snapshot()');check(state.state==='collected','PopX collect via actual input');
 await evalJS(`(()=>{const e=document.getElementById('game');e.value='samurai';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await click('#start');state=await evalJS('window.__zplayQa.snapshot()');check(state.state==='running'&&state.family==='slot','Samurai native reel state started');await click('#stop');check(await evalJS('window.__zplayQa.engine.stopAt!==null'),'STOP accelerated same round');await sleep(750);state=await evalJS('window.__zplayQa.snapshot()');check(state.state==='result','Samurai STOP reached receipt result');check(await evalJS('window.__zplayQa.engine.used.size')===1,'STOP did not add second round');
 const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true});await writeFile(join(root,'qa-mobile-390.png'),Buffer.from(shot.data,'base64'));
 await evalJS(`(()=>{const e=document.getElementById('game');e.value='mine_island';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await click('#start');await click('#choices button:nth-child(2)');state=await evalJS('window.__zplayQa.snapshot()');check(state.revealed.length===1,'Mine tile touched');
 await evalJS(`(()=>{const e=document.getElementById('game');e.value='chicken_ways';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await click('#start');await click('#choices button:first-child');state=await evalJS('window.__zplayQa.snapshot()');check(state.progress===1,'Chicken path touched');
 await evalJS(`(()=>{const e=document.getElementById('game');e.value='cai_balao_cappadocia';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await click('#choices button:nth-child(2)');check(await evalJS('window.__zplayQa.snapshot().mode')==='crash','Hybrid switched modes');
 await click('#start');check(await evalJS('window.__zplayQa.snapshot().state')==='running','Hybrid crash mode ran');
 await click('#auto');check(await evalJS('window.__zplayQa.autoLeft')===10,'Autoplay ten queued');await click('#auto');check(await evalJS('window.__zplayQa.autoLeft')===0,'Autoplay stopped explicitly');
 check(errors.length===0,'No browser uncaught exceptions '+errors.join(';'));
 console.log(JSON.stringify({passed:true,checks,widths:[360,390,430,1280],interactions:['PopX collect','Samurai spin/stop','Mine tile','Chicken choice','Cai mode','AUTO start/stop'],screenshot:'qa-mobile-390.png',jsErrors:errors},null,2));
}finally{ws.close();chrome.kill('SIGTERM');await sleep(500);try{await rm(tmp,{recursive:true,force:true,maxRetries:15,retryDelay:150});}catch(e){console.warn('cleanup:',e.message);}}