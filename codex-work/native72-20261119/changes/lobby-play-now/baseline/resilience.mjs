/* Connection status and static-shell cache. No money requests or retries. */
(()=>{
 if(window.__superwinnConnectionUI)return;window.__superwinnConnectionUI=true;
 const banner=document.createElement('div');banner.id='portal-connection-state';banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
 banner.style.cssText='position:fixed;top:0;left:0;right:0;z-index:10000;padding:12px 18px;background:#152536;color:#fff;font:14px/1.5 system-ui;text-align:center;border-bottom:2px solid #e9bf50;display:none';
 function status(){const offline=navigator.onLine===false;banner.textContent=offline?'Offline · Reconnect to refresh balances and use money actions. Pending requests will not be repeated automatically.':'';banner.style.display=offline?'block':'none';}
 function attach(){if(!document.getElementById(banner.id))document.body.appendChild(banner);status();}
 if(document.body)attach();else document.addEventListener('DOMContentLoaded',attach,{once:true});
 window.addEventListener('online',status);window.addEventListener('offline',status);
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('/sw-portal-v2125.js',{scope:'/'}).then(()=>navigator.serviceWorker.ready).then(()=>{document.documentElement.dataset.staticShell='ready';}).catch(()=>{});
})();
