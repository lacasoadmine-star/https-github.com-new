// The lobby module only mounts an additive catalogue. It cannot submit a wager.
const ROOT_ID = 'zplay-requested71';
const ANCHOR = 'main.player-main .home-slot-heading';
const STATE = Symbol.for('zplay.new71.lobby.v1');
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

function validCatalogue(value) {
  if (value?.schema !== 'zplay/new71-public-catalogue/v1' || value.requestedCount !== 71
    || !Array.isArray(value.games) || value.games.length !== 71) return false;
  const ids = new Set();
  for (let index=0; index<value.games.length; index++) {
    const game=value.games[index];
    if(game.ordinal!==index+1 || typeof game.name!=='string' || !game.name || game.name.length>120
      || !/^zplay(?:71|72)_[a-z0-9_]+_v\d+$/.test(game.gameId) || ids.has(game.gameId)
      || !['ready','preparing'].includes(game.status) || typeof game.playable!=='boolean'
      || game.playable !== (game.status==='ready')
      || (game.previewRoute !== null && !(game.gameId === 'zplay72_multi_hot_10_v1' && game.previewRoute === '/new-games72/multi-hot-10/preview/'))
      || (game.playable ? !/^\/new-games(?:71|72)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(game.route) : game.route!==null)) return false;
    ids.add(game.gameId);
  }
  return value.readyCount===value.games.filter(game=>game.playable).length;
}

function render(catalogue) {
  const section=document.createElement('section');
  section.id=ROOT_ID;
  section.dataset.zplayNew71=catalogue.releaseId;
  section.setAttribute('aria-labelledby','zplay-new71-title');
  section.innerHTML=`<header class="new71-heading"><div><span class="new71-kicker">NEW</span><h2 id="zplay-new71-title">Ciyaaraha cusub</h2></div><span class="new71-count">71</span></header><p class="new71-summary">${catalogue.readyCount} diyaar ah · ${71-catalogue.readyCount} diyaarin ku jira</p><ol class="new71-list">${catalogue.games.slice(0,10).map(game=>`<li class="new71-card" data-new71-id="${escapeHtml(game.gameId)}"><span class="new71-number">${String(game.ordinal).padStart(2,'0')}</span><div class="new71-name">${escapeHtml(game.name)}</div>${game.playable?`<a class="new71-action" href="${escapeHtml(game.route)}">Ciyaar</a>`:game.previewRoute?`<a class="new71-preview" href="${escapeHtml(game.previewRoute)}" aria-label="Eeg muuqaalka ${escapeHtml(game.name)} — bet-ku ma furna">Eeg muuqaalka</a>`:'<span class="new71-pending" aria-label="Weli diyaar ma aha">Diyaarin</span>'}</li>`).join('')}</ol><a class="new71-all" href="/new-games71/">Eeg dhammaan 71 <span aria-hidden="true">→</span></a>`;
  return section;
}

export function installNewSection(catalogue) {
  if (!validCatalogue(catalogue)) throw Error('NEW71_PUBLIC_CATALOGUE_INVALID');
  const previous=window[STATE];
  if(previous) { previous.update(catalogue); return previous; }
  let current=catalogue, node=null, queued=false, disposed=false;
  function mount() {
    queued=false;
    if(disposed)return;
    const anchor=location.pathname==='/' ? document.querySelector(ANCHOR) : null;
    if(!anchor){node?.remove();node=null;return;}
    if(!node){
      const stale=document.getElementById(ROOT_ID);
      if(stale?.dataset.zplayNew71)stale.remove();
      node=render(current);
    }
    if(node.parentNode!==anchor.parentNode||node.nextElementSibling!==anchor)anchor.before(node);
  }
  function schedule(){if(!queued&&!disposed){queued=true;queueMicrotask(mount);}}
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('popstate',schedule);
  window.addEventListener('hashchange',schedule);
  const api={
    update(next){if(!validCatalogue(next))throw Error('NEW71_PUBLIC_CATALOGUE_INVALID');if(JSON.stringify(current)!==JSON.stringify(next)){current=next;node?.remove();node=null;}mount();},
    mount,
    dispose(){disposed=true;observer.disconnect();window.removeEventListener('popstate',schedule);window.removeEventListener('hashchange',schedule);node?.remove();node=null;if(window[STATE]===api)delete window[STATE];}
  };
  window[STATE]=api;
  mount();
  return api;
}

export async function bootNewSection() {
  if(window[STATE]){window[STATE].mount();return window[STATE];}
  const response=await fetch('/new-games71/catalogue.json',{credentials:'omit',cache:'no-store',redirect:'error',headers:{Accept:'application/json'}});
  if(!response.ok||!/^application\/json\b/i.test(response.headers.get('content-type')||''))throw Error('NEW71_CATALOGUE_UNAVAILABLE');
  return installNewSection(await response.json());
}

if(typeof window!=='undefined'&&typeof document!=='undefined')bootNewSection().catch(()=>{});
