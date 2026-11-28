import {startM100Page} from '../page.mjs';
import {M100_CURRENT_MEDIA} from '../current-media.mjs';

const root=document.getElementById('m100-game'),status=document.getElementById('m100-connection');
if(root){
  startM100Page({root,status,assetBaseURL:new URL(root.dataset.assetBase,location.origin).href,
    portraitBackgroundPin:M100_CURRENT_MEDIA.portraitBackground,
    assetPinsURL:new URL(root.dataset.assetPinsUrl,location.origin).href,
    ...(root.dataset.audioBase?{audioBaseURL:new URL(root.dataset.audioBase,location.origin).href}:{}),
    loginURL:'/',lobbyURL:'/'}).catch(()=>{
      // Never expose request/session data, stack traces or provider redirect URLs in product errors.
      if(status)status.textContent='Multi Hot 100 is temporarily unavailable. Please retry.';
  });
}
