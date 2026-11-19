// Mount only on the existing Player route. The existing dashboard owns Play Now.
import {MultiHot40Live} from './live-controller.mjs';
import {MultiHot40Scene,MultiHot40Audio} from './scene.mjs';
export function mountMultiHot40({root,canvas,assets,audioClips={},api,signInHref='/'}={}){
 if(location.pathname.replace(/\/$/,'')!=='/games/multihot40_native')throw Error('MH40_ROUTE_MISMATCH');
 if(!root||!canvas)throw Error('MH40_MOUNT_REQUIRED');
 const scene=new MultiHot40Scene({canvas,assets}),audio=new MultiHot40Audio({clips:audioClips});
 const controller=new MultiHot40Live({api,scene,onState:render});
 controller.audio=audio;let installed=false;
 const element=(tag,attrs={},text='')=>{const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='className')e.className=v;else if(k==='type')e.type=v;else e.setAttribute(k,v);}e.textContent=text;return e;};
 const toolbar=element('section',{className:'mh40-controls','aria-label':'Multi Hot 40 game controls'});
 const status=element('div',{role:'status','aria-live':'polite'}),balance=element('output',{},'—'),win=element('output',{},'—'),betValue=element('output',{},'—');
 const spin=element('button',{type:'button','data-action':'spin'},'SPIN');
 const bet=element('button',{type:'button','data-action':'bet'},'BET');
 const auto=element('button',{type:'button','data-action':'auto'},'AUTO');
 const start=element('button',{type:'button','data-action':'start-play'},'START PLAY');
 const sound=element('button',{type:'button','data-action':'sound','aria-pressed':'false'},'SOUND OFF');
 const settings=element('button',{type:'button','data-action':'settings'},'SETTINGS');
 const home=element('a',{href:signInHref},'ZPLAY');
 const fields=element('div',{className:'mh40-readouts'});
 fields.append(element('span',{},'BALANCE ETB'),balance,element('span',{},'BET ETB'),betValue,element('span',{},'WIN ETB'),win);
 toolbar.append(fields,spin,bet,auto,start,sound,settings,home,status);
 root.append(toolbar);
 let dialog=null;const close=()=>{dialog?.remove();dialog=null;};
 function panel(title){close();dialog=element('div',{className:'mh40-panel',role:'dialog','aria-modal':'true','aria-label':title});
  const heading=element('h2',{},title),dismiss=element('button',{type:'button'},'CLOSE');
  dismiss.addEventListener('click',close);dialog.append(heading,dismiss);root.append(dialog);return dialog;}
 function render(s=controller.snapshot()){
  balance.value=s.balance??'—';balance.textContent=s.balance??'—';betValue.textContent=s.stake??'—';
  win.textContent=s.lastReceipt?.finalWin??'0.00';
  spin.textContent=s.phase==='confirm'?'CONFIRM':s.phase==='revealing'?'STOP':'SPIN';
  const busy=['loading','requesting','revealing','error'].includes(s.phase);
  spin.disabled=busy||!['ready','confirm','revealing'].includes(s.phase);
  bet.disabled=s.phase!=='ready'||!!s.autoArmed||!!s.autoLeft;auto.disabled=s.phase!=='ready';
  start.hidden=!s.autoArmed;start.disabled=s.phase!=='ready';
  status.textContent=s.error||s.phase.toUpperCase();
 }
 spin.addEventListener('click',()=>{if(controller.phase==='revealing')controller.stop();else if(controller.phase==='confirm')void controller.retry();else void controller.spin();});
 bet.addEventListener('click',()=>{
  const p=panel('BET');for(const value of controller.model?.betLevels||[]){const b=element('button',{type:'button'},value+' ETB');b.addEventListener('click',()=>{if(controller.bet(value))close();});p.append(b);}
 });
 auto.addEventListener('click',()=>{const p=panel('AUTO');for(const count of [5,10,25,50,100]){const b=element('button',{type:'button'},String(count));b.addEventListener('click',()=>{if(controller.armAuto(count))close();});p.append(b);}});
 start.addEventListener('click',()=>void controller.startPlay());
 sound.addEventListener('click',()=>{audio.setEnabled(!audio.enabled);sound.textContent=audio.enabled?'SOUND ON':'SOUND OFF';sound.setAttribute('aria-pressed',String(audio.enabled));});
 settings.addEventListener('click',()=>{const p=panel('SETTINGS');const music=element('button',{type:'button'},'MUSIC '+(audio.music?'ON':'OFF'));music.addEventListener('click',()=>{audio.setMusic(!audio.music);music.textContent='MUSIC '+(audio.music?'ON':'OFF');});p.append(music);});
 const onVisibility=()=>controller.visibility(document.hidden),onBlur=()=>controller.focus(false),onFocus=()=>controller.focus(true),onPageHide=()=>controller.visibility(true);
 document.addEventListener('visibilitychange',onVisibility);window.addEventListener('blur',onBlur);window.addEventListener('focus',onFocus);window.addEventListener('pagehide',onPageHide);
 void controller.boot();
 return {controller,scene,audio,dispose(){if(installed)return;installed=true;controller.dispose();audio.dispose();close();toolbar.remove();document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('blur',onBlur);window.removeEventListener('focus',onFocus);window.removeEventListener('pagehide',onPageHide);}};
}
