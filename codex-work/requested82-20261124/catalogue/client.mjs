import {ROOT_ID,ANCHOR,SECTION_PATH,CATALOGUE_PATH,validLobbyCatalogue as validCatalogue,renderSection} from './public.mjs';
const STATE=Symbol.for('zplay.requested82.lobby.v1'),PAGE_STATE=Symbol.for('zplay.requested82.page.v1');

export function installSearch(section,catalogue) {
  const input=section?.querySelector('#requested82-search'),output=section?.querySelector('.requested82-result-count');
  const cards=section ? Array.from(section.querySelectorAll('.requested82-card')) : [];
  if(!input || !output || cards.length!==catalogue.games.length ||
     cards.some((card,index)=>card.dataset.requested82Id!==catalogue.games[index].gameId)) throw Error('REQUESTED82_MARKUP_INVALID');
  // Compare both literal labels and spacing/punctuation variants, preserving exact displayed labels.
  const normalize=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
  const names=catalogue.games.map(game=>({literal:game.name.toLowerCase(),normalized:normalize(game.name)}));
  const filter=()=>{
    const query=input.value.trim().toLowerCase(),normalized=normalize(query);let count=0;
    cards.forEach((card,index)=>{card.hidden=query!=='' && !names[index].literal.includes(query) &&
      (normalized==='' || !names[index].normalized.includes(normalized));if(!card.hidden)count++;});
    output.textContent=count+' ciyaarood';
  };
  input.addEventListener('input',filter);filter();
  return {filter,dispose(){input.removeEventListener('input',filter);}};
}

export function installCataloguePage(catalogue) {
  if(!validCatalogue(catalogue)) throw Error('REQUESTED82_PUBLIC_CATALOGUE_INVALID');
  if(catalogue.games.length===0)return null;
  if(window[PAGE_STATE])return window[PAGE_STATE];
  const search=installSearch(document.getElementById(ROOT_ID),catalogue);
  const api={filter:search.filter,dispose(){search.dispose();if(window[PAGE_STATE]===api)delete window[PAGE_STATE];}};
  window[PAGE_STATE]=api;return api;
}

export function installNewSection(catalogue) {
  if(!validCatalogue(catalogue))throw Error('REQUESTED82_PUBLIC_CATALOGUE_INVALID');
  if(catalogue.games.length===0){window[STATE]?.dispose();return null;}
  if(window[STATE]){window[STATE].update(catalogue);return window[STATE];}
  let current=catalogue,node=null,search=null,expanded=false,queued=false,disposed=false;
  function remove(){search?.dispose();search=null;node?.removeEventListener('click',onClick);node?.remove();node=null;}
  function onClick(event){if(!event.target.closest?.('[data-requested82-expand]'))return;expanded=true;remove();mount();node?.querySelector('#requested82-search')?.focus({preventScroll:true});}
  function mount(){
    queued=false;if(disposed)return;
    if(current.games.length===0){remove();return;}
    const anchor=location.pathname==='/' ? document.querySelector(ANCHOR) : null;
    if(!anchor){remove();return;}
    if(!node){
      const stale=document.getElementById(ROOT_ID);if(stale?.dataset.zplayRequested82)stale.remove();
      const template=document.createElement('template');template.innerHTML=renderSection(current,{expanded});node=template.content.firstElementChild;
      node.addEventListener('click',onClick);if(expanded)search=installSearch(node,current);
    }
    if(node.parentNode!==anchor.parentNode || node.nextElementSibling!==anchor)anchor.before(node);
  }
  function schedule(){if(!queued&&!disposed){queued=true;queueMicrotask(mount);}}
  const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('popstate',schedule);window.addEventListener('hashchange',schedule);
  const api={mount,update(next){if(!validCatalogue(next))throw Error('REQUESTED82_PUBLIC_CATALOGUE_INVALID');if(JSON.stringify(current)!==JSON.stringify(next)){current=next;remove();}mount();},
    dispose(){disposed=true;observer.disconnect();window.removeEventListener('popstate',schedule);window.removeEventListener('hashchange',schedule);remove();if(window[STATE]===api)delete window[STATE];}};
  window[STATE]=api;mount();return api;
}

export async function bootNewSection(){
  if(location.pathname===SECTION_PATH && window[PAGE_STATE]){window[PAGE_STATE].filter();return window[PAGE_STATE];}
  if(window[STATE]){window[STATE].mount();return window[STATE];}
  const response=await fetch(CATALOGUE_PATH,{credentials:'omit',cache:'no-store',redirect:'error',headers:{Accept:'application/json'}});
  if(!response.ok || !/^application\/json\b/i.test(response.headers.get('content-type') || ''))throw Error('REQUESTED82_CATALOGUE_UNAVAILABLE');
  const catalogue=await response.json();return location.pathname===SECTION_PATH?installCataloguePage(catalogue):installNewSection(catalogue);
}
if(typeof window!=='undefined'&&typeof document!=='undefined')bootNewSection().catch(()=>{});
