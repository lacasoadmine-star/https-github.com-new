// Reuse the existing Player login dialog, then return to the requested game.
// Only a published same-origin machine path can be used as the destination.
const query=new URLSearchParams(location.search),target=query.get('return');
if(query.get('login')==='1'&&target==='/games/multihot40_native'){
 let opened=false,finished=false,scheduled=false;
 const stop=()=>{finished=true;observer.disconnect();window.removeEventListener('zplay:session-ready',schedule);};
 function inspect(){
  scheduled=false;if(finished)return;
  if(document.querySelector('.signed-in-header')){stop();location.replace(target);return;}
  const button=document.querySelector('.login-button');
  if(button&&!opened){opened=true;button.click();}
 }
 function schedule(){if(!scheduled&&!finished){scheduled=true;queueMicrotask(inspect);}}
 const observer=new MutationObserver(schedule);
 observer.observe(document.documentElement,{childList:true,subtree:true});
 window.addEventListener('zplay:session-ready',schedule);window.addEventListener('pagehide',stop,{once:true});schedule();
}
