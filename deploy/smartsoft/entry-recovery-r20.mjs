import '/native-library/remaining20/20261110-construction-r15/auth-r18/entry.mjs';
// A failed artwork load must leave the real retry/collection controls visible
// on the phone. These controls delegate to the retained game listeners.
const box=document.createElement('section');box.hidden=true;box.setAttribute('role','status');
Object.assign(box.style,{position:'fixed',left:'12px',right:'12px',bottom:'12px',zIndex:'10000',background:'#071922',color:'#fff',padding:'12px',border:'1px solid #3c5965',borderRadius:'8px',font:'14px system-ui'});
const message=document.createElement('p'),actions=document.createElement('div');box.append(message,actions);document.body.append(box);
const update=()=>{
 const cover=document.getElementById('startupCover'),native=document.body.classList.contains('integrated-reference');
 const note=document.getElementById('presentationNote'),notice=document.getElementById('notice');
 const refresh=document.getElementById('refresh'),needsConfirmation=!!(refresh?.classList.contains('retry')&&!refresh.disabled&&notice?.classList.contains('error'));
 const unavailable=needsConfirmation||!!(!native&&(['uncovered','recovery'].includes(cover?.dataset.phase)||notice?.classList.contains('error')||note&&!note.hidden&&note.textContent.includes('unavailable')));
 if(box.hidden===unavailable)box.hidden=!unavailable;if(!unavailable)return;
 const text=notice?.textContent||note?.textContent||'Game artwork could not load. Retry to continue.';
 if(message.textContent!==text)message.textContent=text;
 for(const id of ['refresh','collect','cashout']){
  const original=document.getElementById(id);let button=actions.querySelector('[data-recovery="'+id+'"]');
  const show=original&&!original.closest('[hidden]')&&!original.disabled;
  if(!show){if(button&&!button.hidden)button.hidden=true;continue;}
  if(!button){button=document.createElement('button');button.dataset.recovery=id;button.type='button';Object.assign(button.style,{marginRight:'8px',padding:'8px 12px',minHeight:'44px'});button.addEventListener('click',()=>document.getElementById(id)?.click());actions.append(button);}
  if(button.hidden)button.hidden=false;const label=id==='refresh'?(needsConfirmation?'Retry last action':'Retry'):original.textContent;if(button.textContent!==label)button.textContent=label;
 }
};
const observer=new MutationObserver(update);observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','disabled','data-phase']});update();
window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
