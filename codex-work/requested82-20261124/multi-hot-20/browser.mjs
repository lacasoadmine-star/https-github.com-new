import {launchExistingMultiHot20} from './entry.mjs';

export async function bootM20Release({document=globalThis.document,launch=launchExistingMultiHot20}={}) {
  const root=document?.getElementById('m20-game'),status=document?.getElementById('m20-connection');
  if(!root||!status||!root.dataset.manifestUrl)throw Error('M20_HOST_DOCUMENT_INVALID');
  status.textContent='Loading your game…';
  try {
    const game=await launch({root,manifestURL:new URL(root.dataset.manifestUrl,document.baseURI),
      onError(){status.hidden=false;status.textContent='Connection interrupted. Recover your current round before playing again.';}});
    status.hidden=true;
    // The outer connection banner must clear with a successful recovery too,
    // rather than continuing to tell the player to recover an accepted win.
    const Observer=document.defaultView?.MutationObserver;
    const observer=Observer?new Observer(()=>{
      if(['READY','WIN_PENDING'].includes(root.dataset.phase))status.hidden=true;
    }):null;
    observer?.observe(root,{attributes:true,attributeFilter:['data-phase']});
    return Object.freeze({...game,dispose(){observer?.disconnect();game.dispose();}});
  }catch(error){
    status.hidden=false;status.textContent=error?.status===401?'Sign in from ZPLAY to play Multi Hot 20.':'The game could not connect. Return to ZPLAY and open it again.';
    throw error;
  }
}
if(typeof document!=='undefined')bootM20Release().catch(()=>{});
