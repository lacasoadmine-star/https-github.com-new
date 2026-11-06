import {assets} from './official-startup-assets.mjs';

const selectedGames=new Set(['multi_hot_5_video','hot_foxy_20']);
const fatalStates=new Set(['error','signedout','unavailable']);
export const startupTiming=Object.freeze({multi_hot_5_video:{readyDelay:150,fade:100},hot_foxy_20:{readyDelay:200,fade:0},maximumCover:30000});

// The controller validates the session/model and owns the one sound callback.
// This helper never requests a round, changes a bet, or creates an audio player.
export function createOfficialStartup({document,gameId,onSoundChoice}){
 if(!selectedGames.has(gameId))return null;
 const win=document.defaultView,events=new AbortController(),timing=startupTiming[gameId];
 const listen=(node,name,fn)=>node.addEventListener(name,fn,{signal:events.signal});
 const dialog=document.getElementById('sound-consent'),yes=document.getElementById('sound-yes'),no=document.getElementById('sound-no'),question=document.getElementById('sound-question');
 if(!dialog||!yes||!no||!question||typeof onSoundChoice!=='function')throw Error('STARTUP_HOST_MISSING');
 let disposed=false,loading=false,completed=false,choosing=false,choiceMade=false,run=0,coverTimer=null,closeTimer=null,progress=0,choiceCalls=0,failure=null;
 const timers=new Map(),cancellers=new Set(),inertNodes=new Map();
 const sleep=ms=>new Promise(resolve=>{const id=win.setTimeout(()=>{timers.delete(id);resolve();},ms);timers.set(id,resolve);});
 const clearTimers=()=>{for(const [id,resolve]of timers){win.clearTimeout(id);resolve();}timers.clear();win.clearTimeout(coverTimer);win.clearTimeout(closeTimer);};
 const cancelPending=()=>{for(const resolve of cancellers)resolve(false);cancellers.clear();};
 const holdControls=()=>{for(const node of document.querySelectorAll('#machine,.brandbar')){if(!inertNodes.has(node))inertNodes.set(node,node.inert);node.inert=true;}};
 const releaseControls=()=>{for(const [node,inert]of inertNodes)node.inert=inert;inertNodes.clear();};
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./official-startup.css',import.meta.url).href;
 const cssReady=new Promise(resolve=>{listen(css,'load',()=>resolve(true));listen(css,'error',()=>resolve(false));});document.head.append(css);
 const adopted=document.getElementById('official-startup'),loader=adopted||document.createElement('div');loader.id='official-startup';if(!adopted)loader.hidden=true;loader.setAttribute('role','status');loader.setAttribute('aria-label','Loading game');
 if(!adopted){const logo=document.createElement('div');logo.className='official-loader-logo';logo.setAttribute('role','img');logo.setAttribute('aria-label','SmartSoft');logo.style.backgroundImage='url("'+assets.logo+'")';loader.append(logo);document.body.append(loader);}
 const logo=loader.querySelector('.official-loader-logo'),barContainer=document.createElement('div');barContainer.className='official-loader-bar';barContainer.innerHTML='<div class="official-loader-progress"><span class="official-loader-icon"></span></div>';loader.append(barContainer);
 const bar=barContainer.querySelector('.official-loader-progress'),icon=barContainer.querySelector('.official-loader-icon');bar.style.backgroundImage='url("'+assets.bar+'")';icon.style.backgroundImage='url("'+assets.icon+'")';
 dialog.classList.add('official-sound-consent');dialog.dataset.nativeStartup=gameId;question.textContent='Would you like sound?';question.tabIndex=-1;question.setAttribute('autofocus','');yes.textContent='Yes';no.textContent='No';
 dialog.style.setProperty('--official-sound-yes','url("'+assets.yes+'")');dialog.style.setProperty('--official-sound-no','url("'+assets.no+'")');
 const fontReady=typeof win.FontFace==='function'?Promise.resolve().then(async()=>{
  const bytes=Uint8Array.from(win.atob(assets.font.slice(assets.font.indexOf(',')+1)),c=>c.charCodeAt(0));
  const face=await new win.FontFace('Official Startup',bytes).load();if(!disposed)document.fonts.add(face);
 }).catch(()=>{}):Promise.resolve();
 const imageReady=new win.Image();imageReady.src=adopted?new URL('./official-startup-logo.gif',import.meta.url).href:assets.logo;
 const ready=Promise.all([cssReady,fontReady,imageReady.decode?.().catch(()=>{})]).then(([styled])=>{if(!styled)fail('stylesheet');return styled;});
 function setProgress(value){progress=Math.max(progress,Math.min(1,Math.max(0,value)));bar.style.width=progress*100+'%';icon.style.transform='scale('+(progress?0.1+progress*0.9:0)+')';loader.dataset.progress=String(Math.round(progress*100));}
 function hideLoader(){loading=false;loader.hidden=true;loader.classList.remove('official-loader-fading');document.body.removeAttribute('data-official-startup-loading');win.clearTimeout(coverTimer);releaseControls();}
 function begin(){
  if(disposed)return;win.__officialStartupGuard?.claim();document.getElementById('official-startup-reload')?.remove();run++;cancelPending();clearTimers();completed=false;failure=null;progress=0;loading=true;setProgress(0);holdControls();document.body.dataset.officialStartupLoading='true';if(dialog.open)dialog.close();
  const token=run;void ready.then(styled=>{if(styled&&!disposed&&loading&&token===run)loader.hidden=false;});
  coverTimer=win.setTimeout(()=>fail('loading-timeout'),startupTiming.maximumCover);
 }
 function fail(reason='unavailable'){
  run++;failure=String(reason);completed=false;cancelPending();clearTimers();hideLoader();if(dialog.open)dialog.close();choosing=false;yes.disabled=no.disabled=false;
 }
 async function complete(promises=[]){
  if(disposed||!loading)return false;
  const token=run,tasks=Array.from(promises).filter(Boolean);let done=0;const total=tasks.length+1;
  const advance=()=>{if(token===run&&!disposed)setProgress(++done/total);};
  let cancel;const cancelled=new Promise(resolve=>{cancel=resolve;cancellers.add(resolve);});
  const finish=async()=>{try{
   const styled=await ready;if(!styled||token!==run||disposed)return false;advance();
   await Promise.all(tasks.map(task=>Promise.resolve(task).then(advance)));
   if(token!==run||disposed)return false;
   await sleep(timing.readyDelay);if(token!==run||disposed)return false;
   if(timing.fade){loader.classList.add('official-loader-fading');await sleep(timing.fade);}
   if(token!==run||disposed)return false;
   hideLoader();completed=true;return true;
  }catch(error){if(token===run)fail(error?.message||'presentation');return false;}};
  try{return await Promise.race([finish(),cancelled]);}finally{cancellers.delete(cancel);}
 }
 function storedChoice(){try{return win.localStorage.getItem('zplay:sound-choice');}catch{return null;}}
 async function askSound(){
  if(disposed||choiceMade||choosing||!completed||fatalStates.has(document.body.dataset.state))return false;
  const previous=storedChoice();if(previous==='yes'||previous==='no')return false;
  await ready;if(disposed||!completed||fatalStates.has(document.body.dataset.state)||document.querySelector('dialog[open]'))return false;
  yes.disabled=no.disabled=false;dialog.showModal();return true;
 }
 async function choose(value){
  if(disposed||choosing||choiceMade||!dialog.open)return false;
  choosing=true;yes.disabled=no.disabled=true;choiceCalls++;
  try{
   await onSoundChoice(value);choiceMade=true;choosing=false;
   if(dialog.open){if(gameId==='multi_hot_5_video'){dialog.classList.add('official-sound-fading');await sleep(100);}dialog.close();dialog.classList.remove('official-sound-fading');}
   return true;
  }catch{choosing=false;yes.disabled=no.disabled=false;return false;}
 }
 listen(yes,'click',()=>void choose(true));listen(no,'click',()=>void choose(false));listen(dialog,'cancel',event=>{event.preventDefault();void choose(false);});
 const observer=new win.MutationObserver(()=>{if(fatalStates.has(document.body.dataset.state)&&(loading||dialog.open))fail(document.body.dataset.state);});observer.observe(document.body,{attributes:true,attributeFilter:['data-state']});
 return {ready,begin,complete,askSound,fail,diagnostics:()=>({loading,completed,choosing,choiceMade,choiceCalls,progress,failure,gif:imageReady.naturalWidth===300,adoptedFirstPaint:!!adopted}),destroy(){if(disposed)return;disposed=true;run++;cancelPending();clearTimers();hideLoader();events.abort();observer.disconnect();loader.remove();css.remove();if(dialog.open)dialog.close();}};
}
