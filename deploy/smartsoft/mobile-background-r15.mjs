import {MOBILE_DISPLAY} from './mobile-display-data.mjs';
const id=location.pathname.split('/').at(-1),profile=MOBILE_DISPLAY[id];
if(profile){
 const source=new URL('./backgrounds/'+profile.file,import.meta.url).href;
 const update=()=>{
  const canvas=document.querySelector('#scene');if(!canvas||!document.body.classList.contains('integrated-reference'))return;
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height||rect.width>=rect.height){canvas.style.backgroundImage='';return;}
  const scale=Math.min(rect.width/560,rect.height/1006,1);
  const size=profile.maxWidth*scale+'px '+profile.maxHeight*scale+'px';
  if(canvas.style.backgroundImage!=='url("'+source+'")')canvas.style.backgroundImage='url("'+source+'")';
  if(canvas.style.backgroundSize!==size)canvas.style.backgroundSize=size;
  if(canvas.style.backgroundPosition!==profile.position)canvas.style.backgroundPosition=profile.position;
  if(canvas.style.backgroundRepeat!==profile.repeat)canvas.style.backgroundRepeat=profile.repeat;
 };
 const observer=new ResizeObserver(update);const canvas=document.querySelector('#scene');if(canvas)observer.observe(canvas);
 const ready=new MutationObserver(update);ready.observe(document.body,{attributes:true,attributeFilter:['class']});
 addEventListener('resize',update);update();
 addEventListener('pagehide',()=>{observer.disconnect();ready.disconnect();removeEventListener('resize',update);},{once:true});
}
