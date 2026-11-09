// Credits-only live review uses the same app and engine, with a distinct HTTP
// namespace and no connection to a player's money or authentication cookie.
const IDS=new Set(["multihotwildways_native","multihot5wild_native","multihot5superwilds_native","multihotdeluxe_native","burningice_native","burningice10_native","burningice40_native"]);
export function createDemoMode({location=globalThis.location,fetchImpl=globalThis.fetch?.bind(globalThis)}={}){
 const match=/^\/demo\/games\/([a-z0-9_]+)$/.exec(location?.pathname||'');
 const active=!!match&&IDS.has(match[1]);
 if((location?.pathname||'').startsWith('/demo/')&&!active)throw Error('UNKNOWN_DEMO_GAME');
 return Object.freeze({active,currency:active?'CREDITS':'ETB',
  fetch(input,options){
   if(!active)return fetchImpl(input,options);
   if(typeof input!=='string')throw Error('INVALID_DEMO_REQUEST');
   const url=new URL(input,location.origin);
   if(url.origin!==location.origin)throw Error('DEMO_REQUEST_MUST_BE_SAME_ORIGIN');
   const api=/^\/api\/(?:expansion|remaining20)\/(state|action|history)$/.exec(url.pathname);
   if(api)url.pathname='/api/remaining20/demo/'+api[1];
   else if(url.pathname.startsWith('/api/'))throw Error('DEMO_CANNOT_CALL_PLAYER_API');
   else if(url.pathname.startsWith('/native-library/')&&url.pathname.endsWith('/games.json'))url.pathname=url.pathname.slice(0,-'games.json'.length)+'demo-games.json';
   return fetchImpl(url.href,options);
  },
 });
}

export function mountDemoNotice(document,mode){
 if(!mode.active)return;
 document.documentElement.dataset.creditsDemo='true';
 const banner=document.createElement('aside');banner.className='demo-credits-banner';banner.setAttribute('role','note');
 banner.textContent='DEMO · CREDITS ONLY · NO CASH VALUE';
 banner.title='Live game preview. Demo credits cannot be deposited, withdrawn or transferred. Demo credits and history survive reloads and restarts, and reset when this one-hour demo session expires.';
 document.querySelector('.player-bar')?.after(banner);
 const label=document.querySelector('.wallet>span');if(label)label.textContent='DEMO BALANCE';
 const walker=document.createTreeWalker(document.body,4);let node;
 while((node=walker.nextNode()))if(/\bETB\b/.test(node.nodeValue||''))node.nodeValue=node.nodeValue.replace(/\bETB\b/g,'CREDITS');
 for(const node of document.querySelectorAll('[aria-label]'))node.setAttribute('aria-label',node.getAttribute('aria-label').replace(/\bETB\b/g,'CREDITS'));
 const reset=document.createElement('p');reset.className='demo-session-note';reset.textContent='Demo credits have no cash value. Credits and history survive reloads and restarts, and reset when this one-hour demo session expires.';
 document.querySelector('.machine-footer')?.after(reset);
}
