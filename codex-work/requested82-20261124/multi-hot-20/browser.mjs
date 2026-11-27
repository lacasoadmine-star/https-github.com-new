import {launchExistingMultiHot20} from './entry.mjs';

export async function bootM20Release({document=globalThis.document,launch=launchExistingMultiHot20,onRetry=null}={}) {
  const root=document?.getElementById('m20-game'),status=document?.getElementById('m20-connection');
  if(!root||!status||!root.dataset.manifestUrl)throw Error('M20_HOST_DOCUMENT_INVALID');
  status.textContent='Loading your game…';
  status.hidden=false;delete root.dataset.connectionRetry;
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
    // Match the existing M100 guest navigation. No authentication is bypassed.
    if(error?.status===401){
      const signIn=document.createElement('a');
      signIn.href='/';signIn.textContent='Sign in';
      signIn.className='m20-sign-in';
      root.replaceChildren(signIn);
    }else if(error?.status!==403){
      // Reconnect only through the original authenticated launch. Its transport
      // retains any pending round; opening this button never submits a wager.
      root.dataset.connectionRetry='true';
      const retry=document.createElement('button');
      retry.type='button';retry.textContent='Try again';retry.className='m20-reconnect';
      retry.addEventListener('click',()=>{retry.disabled=true;void (onRetry?onRetry():bootM20Release({document,launch})).catch(()=>{});});
      root.replaceChildren(retry);
    }
    throw error;
  }
}

/** Re-enter after a network interruption or a normal sign-in in the lobby. */
export function createM20Page({document=globalThis.document,launch=launchExistingMultiHot20}={}){
  const window=document.defaultView,root=document.getElementById('m20-game');
  let game=null,loading=null,disposed=false;
  const cleanups=[];
  const listen=(name,handler)=>{window?.addEventListener(name,handler);cleanups.push(()=>window?.removeEventListener(name,handler));};
  function reconnect(){
    if(disposed)return Promise.resolve(null);if(loading)return loading;
    game?.dispose();game=null;
    loading=bootM20Release({document,launch,onRetry:reconnect}).then(next=>{if(disposed){next.dispose();return null;}game=next;return next;}).catch(()=>null).finally(()=>{loading=null;});
    return loading;
  }
  const retryConnection=()=>{if(!game&&root?.dataset.connectionRetry==='true')void reconnect();};
  listen('online',retryConnection);
  listen('focus',retryConnection);
  listen('pageshow',event=>{if(event.persisted)retryConnection();});
  listen('zplay:session-ready',()=>{void reconnect();});
  return {start:reconnect,reconnect,dispose(){if(disposed)return;disposed=true;for(const cleanup of cleanups)cleanup();game?.dispose();game=null;}};
}
if(typeof document!=='undefined')void createM20Page().start();
