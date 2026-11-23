import {launchExistingMultiHot20} from '../m20/entry.mjs';

export async function bootM20Release({document=globalThis.document,launch=launchExistingMultiHot20}={}) {
  const root=document?.getElementById('m20-game'),status=document?.getElementById('m20-connection');
  if (!root || !status || !root.dataset.manifestUrl) throw Error('M20_HOST_DOCUMENT_INVALID');
  status.textContent='Loading your game…';
  try {
    const game=await launch({root,manifestURL:new URL(root.dataset.manifestUrl,document.baseURI),
      onError(){status.hidden=false;status.textContent='Connection interrupted. Recover your current round before playing again.';}});
    status.hidden=true;return game;
  } catch(error) {
    status.hidden=false;
    status.textContent=error?.status===401?'Sign in from ZPLAY to play Multi Hot 20.':'The game could not connect. Return to ZPLAY and open it again.';
    throw error;
  }
}
if (typeof document!=='undefined') bootM20Release().catch(()=>{});
