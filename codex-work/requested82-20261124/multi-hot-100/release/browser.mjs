import {startM100Page} from '../page.mjs';

const root=document.getElementById('m100-game'),status=document.getElementById('m100-connection');
if(root){
  startM100Page({root,status,assetBaseURL:new URL(root.dataset.assetBase,location.origin).href,
    assetPinsURL:new URL(root.dataset.assetPinsUrl,location.origin).href,
    ...(root.dataset.audioBase?{audioBaseURL:new URL(root.dataset.audioBase,location.origin).href}:{}),
    loginURL:'/player/login',lobbyURL:'/'}).catch(()=>{
      // Never expose request/session data, stack traces or provider redirect URLs in product errors.
      if(status)status.textContent='Multi Hot 100 is temporarily unavailable. Please retry.';
  });
}
