import {STARTUP_ASSETS,smartSoftStartupProfile} from './startup-profile.mjs';

// This gate owns only first-entry presentation and sound choice. It never reads
// a wallet, writes a pending action, generates a token or submits a request.
export function startupPhase({active=true,choice=null,state=null,ready=false,failed=false,suspended=false,timedOut=false}={}){
 if(!active||typeof choice==='boolean')return 'open';
 if(state?.pending||state?.confirming||state?.recoveryBlocked||state?.round?.status==='active'||state?.otherActiveGame)return 'recovery';
 if(failed||suspended||state?.error||timedOut)return 'uncovered';
 if(!state?.connected||!state?.authenticated||!ready)return 'loading';
 return 'sound';
}
export class SmartSoftStartup {
 constructor({gameId,document=globalThis.document,onChoice=()=>{},onChange=()=>{},onTimeout=()=>{},now=()=>globalThis.performance?.now()??Date.now(),setTimer=globalThis.setTimeout?.bind(globalThis),clearTimer=globalThis.clearTimeout?.bind(globalThis),timeoutMs=30000}={}){
  this.profile=smartSoftStartupProfile(gameId);this.active=!!this.profile;this.choice=null;this.phase=this.active?'loading':'open';this.onChoice=onChoice;this.onChange=onChange;this.onTimeout=onTimeout;this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;this.progress=0;this.timer=null;this.readyTimer=null;this.readyAt=null;this.lastInput=null;this.timedOut=false;this.disposed=false;this.fontFace=null;this.timeoutMs=timeoutMs;
  if(!this.active||!document)return;
  this.document=document;this.cover=document.getElementById('startupCover');this.loader=document.getElementById('startupLoader');this.prompt=document.getElementById('startupSound');this.main=document.getElementById('machineShell');this.yes=document.getElementById('startupYes');this.no=document.getElementById('startupNo');this.fill=document.getElementById('startupFill');this.icon=document.getElementById('startupIcon');this.bar=document.getElementById('startupProgress');
  this.priorInert=!!this.main?.inert;
  if(!this.cover||!this.loader||!this.prompt||!this.yes||!this.no)throw new Error('Missing startup presentation elements');
  const base='/native-library/remaining20/reference-art/r1/smartsoft/assets/';
  for(const[name,record]of Object.entries(STARTUP_ASSETS))this.cover.style.setProperty('--startup-'+name,`url("${base+record.file}")`);
  document.getElementById('startupQuestion').textContent=this.profile.question;
  this.yes.lastElementChild.textContent=this.profile.yes;this.no.lastElementChild.textContent=this.profile.no;
  this.yes.addEventListener('click',()=>this.choose(true));this.no.addEventListener('click',()=>this.choose(false));
  this.prompt.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();return;}if(event.key==='Tab'){event.preventDefault();(document.activeElement===this.yes?this.no:this.yes).focus();}});
  // Decode the prompt's exact font and tiny glyphs while the native scene loads.
  // No audio is created by this preload. Its errors do not cover recovery.
  void document.fonts?.load?.('25px ZplayStartup').catch(()=>{});
  if(typeof globalThis.Image==='function')for(const name of ['yes','no']){const image=new globalThis.Image();image.src=base+STARTUP_ASSETS[name].file;}
  this.armTimeout();
  this.paint('loading');
 }
 armTimeout(){
  if(this.timer!==null)this.clearTimer?.(this.timer);
  this.timer=this.setTimer?.(()=>{this.timer=null;if(this.disposed||typeof this.choice==='boolean')return;this.timedOut=true;this.sync(this.lastInput?.state,{...this.lastInput,timedOut:true});this.onTimeout();},this.timeoutMs);
 }
 allowsStart(){return !this.active||typeof this.choice==='boolean';}
 sync(state,options={}){
  if(!this.active||this.disposed)return this.phase;
  this.lastInput={...options,state};
  const readyForChoice=options.ready===true&&state?.connected===true&&state?.authenticated===true;
  if(readyForChoice)this.timedOut=false;
  let next=startupPhase({active:this.active,choice:this.choice,state,...options,timedOut:this.timedOut});
  if(next==='sound'){
   if(this.readyAt===null)this.readyAt=this.now();
   const elapsed=this.now()-this.readyAt,delay=this.profile.completionDelayMs,end=delay+this.profile.loaderFadeMs;
   const wait=elapsed<delay?delay-elapsed:end-elapsed;
   if(wait>0){next=elapsed<delay?'loading':'fading';if(this.readyTimer===null)this.readyTimer=this.setTimer?.(()=>{this.readyTimer=null;if(this.lastInput)this.sync(this.lastInput.state,this.lastInput);},wait);}
  }else if(next!=='loading'||!options.ready){this.readyAt=null;if(this.readyTimer!==null){this.clearTimer?.(this.readyTimer);this.readyTimer=null;}}
  // Bound each actual loading wait, including the wait after an accepted round
  // is recovered or a connection returns. The resource timer must not expire
  // while the fully loaded game is simply waiting for the player's Yes/No.
  const waiting=next==='loading'&&!readyForChoice;
  if(waiting&&!this.timedOut&&this.timer===null)this.armTimeout();
  else if(!waiting&&this.timer!==null){this.clearTimer?.(this.timer);this.timer=null;}
  this.updateProgress(options.progress,options.ready===true);
  this.paint(next);return this.phase;
 }
 updateProgress(progress,ready=false){
  if(!this.active||this.disposed)return;
  const loaded=Number(progress?.loaded),requested=Number(progress?.requested);
  const actual=Number.isFinite(loaded)&&Number.isFinite(requested)&&requested>0?Math.floor(100*Math.max(0,loaded)/requested):0;
  this.progress=ready?100:Math.max(this.progress,Math.min(99,actual));
  if(this.fill)this.fill.style.width=this.progress+'%';
  if(this.icon)this.icon.style.transform=`scale(${.1+.9*this.progress/100})`;
  this.bar?.setAttribute('aria-valuenow',String(this.progress));
  this.updateLoaderOpacity();
 }
 updateLoaderOpacity(){
  if(!this.loader)return;
  // Public canvas.js uses jQuery fadeOut(100). Its default swing easing is
  // 0.5 - cos(pi*p)/2; invert it for the loader's opacity.
  const p=this.phase==='fading'?Math.max(0,Math.min(1,(this.now()-this.readyAt-this.profile.completionDelayMs)/this.profile.loaderFadeMs)):0;
  this.loader.style.opacity=String(this.phase==='fading'?.5+.5*Math.cos(Math.PI*p):1);
 }
 paint(next){
  const changed=this.phase!==next;this.phase=next;
  if(!this.active||!this.cover)return;
  const covered=next==='loading'||next==='fading'||next==='sound';this.cover.hidden=!covered;this.loader.hidden=!['loading','fading'].includes(next);this.prompt.hidden=next!=='sound';this.cover.dataset.phase=next;this.updateLoaderOpacity();
  if(this.main)this.main.inert=covered||this.priorInert;
  this.yes.disabled=this.no.disabled=next!=='sound';
  if(next==='sound'&&changed)this.yes.focus?.({preventScroll:true});
  if(['open','recovery','uncovered'].includes(next)&&this.timer!==null){this.clearTimer?.(this.timer);this.timer=null;}
  if(changed)this.onChange();
 }
 choose(value){
  if(!this.active||this.disposed||typeof value!=='boolean'||this.phase!=='sound'||typeof this.choice==='boolean')return false;
  this.choice=value;this.paint('open');this.onChoice(value);return true;
 }
 rememberManualChoice(value){
  if(!this.active||this.disposed||typeof value!=='boolean')return;
  this.choice=value;this.paint('open');
 }
 retry(){
  if(!this.active||this.disposed||typeof this.choice==='boolean')return;
  this.timedOut=false;this.readyAt=null;this.progress=0;this.armTimeout();
  if(this.readyTimer!==null){this.clearTimer?.(this.readyTimer);this.readyTimer=null;}
  this.sync(this.lastInput?.state,{...this.lastInput,ready:false,failed:false});
 }
 fail(){if(this.active&&!this.disposed)this.sync(this.lastInput?.state,{...this.lastInput,failed:true});}
 dispose(){
  this.disposed=true;if(this.timer!==null)this.clearTimer?.(this.timer);if(this.readyTimer!==null)this.clearTimer?.(this.readyTimer);this.timer=this.readyTimer=null;
  if(this.main)this.main.inert=this.priorInert;if(this.cover)this.cover.hidden=true;
 }
}
