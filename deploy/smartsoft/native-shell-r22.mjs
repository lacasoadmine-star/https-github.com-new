// Presentation only. All money, input and recovery listeners belong to the
// retained app. A failed asset must never uncover the generic cabinet again.
export function installNativeShell(document, window) {
 const root=document.documentElement;
 if(root.dataset.nativeShell!=='r22')return ()=>{};
 const visible=node=>!!node&&!node.hidden&&node.getClientRects().length>0;
 const update=()=>{
  const native=document.body.classList.contains('integrated-reference');
  root.dataset.nativeReady=String(native);
  for(const name of ['collect','gamble']){
   root.dataset['native'+name[0].toUpperCase()+name.slice(1)]=String(native&&visible(document.querySelector('[data-control="'+name+'"]')));
  }
  const notice=document.querySelector('#notice');
  const text=notice?.textContent?.trim()||'';
  const routine=!text||/^(Choose (?:a stake|your stake and play)\.|Your round is active\.|Ready\.|Game ready|Connected\.|Your balance comes|Waiting for the next round)/i.test(text);
  root.dataset.nativeAttention=String(!routine||notice?.classList.contains('error')||visible(document.querySelector('#accountLink'))||visible(document.querySelector('#otherGame')));
  const banner=document.querySelector('.demo-credits-banner');
  if(banner&&banner.textContent!=='DEMO · CREDITS ONLY')banner.textContent='DEMO · CREDITS ONLY';
 };
 let frame=null;
 const schedule=()=>{if(frame===null)frame=window.requestAnimationFrame(()=>{frame=null;update();});};
 const observer=new window.MutationObserver(schedule);
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden','disabled','data-phase']});
 window.addEventListener('resize',schedule);update();
 const dispose=()=>{observer.disconnect();window.removeEventListener('resize',schedule);if(frame!==null)window.cancelAnimationFrame(frame);};
 window.addEventListener('pagehide',dispose,{once:true});return dispose;
}
if(typeof document!=='undefined')installNativeShell(document,window);
