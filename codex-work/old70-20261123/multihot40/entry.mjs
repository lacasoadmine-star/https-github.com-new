import {loadArtwork} from './artwork.mjs';
import {mountGame} from './controls.mjs';
const root=document.getElementById('game'),status=document.getElementById('load-status'),progress=document.querySelector('progress'),retry=document.getElementById('retry');
let mounted=null,loading=false;
async function launch(){
 if(loading)return;loading=true;retry.hidden=true;status.textContent='Loading Multi Hot 40…';
 try{
  const art=await loadArtwork({onProgress:(n,total)=>{progress.value=n/total*100;status.textContent='Loading artwork '+n+'/'+total;}});
  mounted=mountGame({root,artwork:art});document.getElementById('boot').hidden=true;
 }catch(error){status.textContent='Game resources could not load. Retry to continue.';retry.hidden=false;console.warn('MH40_LOAD',error.name);}
 finally{loading=false;}
}
retry.addEventListener('click',launch);
window.addEventListener('pagehide',()=>{mounted?.dispose();mounted=null;});
window.addEventListener('pageshow',event=>{if(event.persisted&&!mounted)void launch();});
void launch();
