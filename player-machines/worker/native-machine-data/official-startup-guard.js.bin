// Independent of the module graph: a failed bundle cannot leave a black cover.
(()=>{
 if(!['multi_hot_5_video','hot_foxy_20'].includes(document.body.dataset.game)){document.getElementById('official-startup')?.remove();return;}
 const nodes=new Map();for(const node of document.querySelectorAll('#machine,.brandbar')){nodes.set(node,node.inert);node.inert=true;}
 let active=true;
 const release=()=>{for(const[node,value]of nodes)node.inert=value;nodes.clear();};
 const fail=()=>{if(!active)return;active=false;clearTimeout(timer);release();const loader=document.getElementById('official-startup');if(loader)loader.hidden=true;const message=document.getElementById('notice-text');if(message)message.textContent='The game could not finish loading. Reload to try again.';const notice=document.getElementById('notice');if(notice&&!document.getElementById('official-startup-reload')){const link=document.createElement('a');link.id='official-startup-reload';link.href=location.href;link.textContent='Reload game';notice.append(link);}};
 const timer=setTimeout(fail,30000);
 const onError=event=>{if(event.target?.tagName==='SCRIPT'&&event.target.type==='module')fail();};
 addEventListener('error',onError,true);
 window.__officialStartupGuard={claim(){if(!active)return;active=false;clearTimeout(timer);removeEventListener('error',onError,true);release();},fail};
})();
