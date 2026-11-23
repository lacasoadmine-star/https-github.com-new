// Frame only: never reads or writes an account, wager, receipt, or balance.
const root=document.documentElement;
if(root.dataset.referenceFrame==='r14'){
 const hood=document.createElement('div');hood.className='reference-hood';
 const logo=document.createElement('img');logo.src=new URL('./hood-logo.png',import.meta.url).href;logo.alt='SmartSoft Gaming';
 const clock=document.createElement('time');clock.setAttribute('aria-label','Current time');
 hood.append(logo,clock);document.body.prepend(hood);
 const update=()=>{
  const now=new Date();clock.dateTime=now.toISOString();const time=[now.getHours(),now.getMinutes(),now.getSeconds()].map(v=>String(v).padStart(2,'0')).join(' : ');if(clock.textContent!==time)clock.textContent=time;
  const cover=document.querySelector('#startupCover');root.dataset.referenceLoading=String(cover?.dataset.phase==='loading'&&!cover.hidden);
  const visible=node=>!!node&&!node.hidden&&node.getClientRects().length>0;
  const notice=document.querySelector('#notice'),text=notice?.textContent?.trim()||'';
  const attention=visible(document.querySelector('#accountLink'))||visible(document.querySelector('#otherGame'))||visible(document.querySelector('#autoplayRunning'))||visible(document.querySelector('#winActions'))||visible(document.querySelector('#activeActions'));
  // Preserve every unknown/error message. Only observed idle/connecting
  // duplicates disappear after a native presentation successfully opens.
  const ordinary=!text||/^(Choose a stake\.|New rounds are|This game is being|Ready\.|Game ready|Connected\.|Your balance comes|Waiting for the next round)/i.test(text);
  const integrated=document.body.classList.contains('integrated-reference');
  root.dataset.referenceStatus=integrated&&ordinary&&!attention?'idle':'attention';
 };
 let queued=false;
 const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;update();});});
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class','data-phase']});
 const timer=setInterval(update,1000);update();
 addEventListener('pagehide',()=>{observer.disconnect();clearInterval(timer);},{once:true});
}
