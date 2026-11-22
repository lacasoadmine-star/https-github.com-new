import {ROOT_ID, ANCHOR, SECTION_PATH, CATALOGUE_PATH, validCatalogue, renderSection} from './public.mjs';
const STATE = Symbol.for('zplay.new90.lobby.v1');
const PAGE_STATE = Symbol.for('zplay.new90.page.v1');

export function installCataloguePage(catalogue) {
  if (!validCatalogue(catalogue)) throw Error('NEW90_PUBLIC_CATALOGUE_INVALID');
  if (window[PAGE_STATE]) return window[PAGE_STATE];
  const section = document.getElementById(ROOT_ID);
  const input = section?.querySelector('#zplay-new90-search'), output = section?.querySelector('.new90-result-count');
  const cards = section ? Array.from(section.querySelectorAll('.new90-card')) : [];
  if (!input || !output || cards.length !== catalogue.games.length
    || cards.some((card,index) => card.dataset.new90Id !== catalogue.games[index].gameId)) throw Error('NEW90_PAGE_MARKUP_INVALID');
  const names = catalogue.games.map(game => game.name.toLowerCase());
  function filter() {
    const query = input.value.trim().toLowerCase(); let count = 0;
    cards.forEach((card,index) => { card.hidden = !names[index].includes(query); if (!card.hidden) count++; });
    output.textContent = count + ' ciyaarood';
  }
  input.addEventListener('input',filter); filter();
  const api = {filter,dispose(){input.removeEventListener('input',filter);if(window[PAGE_STATE]===api)delete window[PAGE_STATE];}};
  window[PAGE_STATE] = api; return api;
}

export function installNewSection(catalogue) {
  if (!validCatalogue(catalogue)) throw Error('NEW90_PUBLIC_CATALOGUE_INVALID');
  const previous = window[STATE];
  if (previous) { previous.update(catalogue); return previous; }
  let current = catalogue, node = null, queued = false, disposed = false;
  function mount() {
    queued = false;
    if (disposed) return;
    const anchor = location.pathname === '/' ? document.querySelector(ANCHOR) : null;
    if (!anchor) { node?.remove(); node = null; return; }
    if (!node) {
      const stale = document.getElementById(ROOT_ID);
      if (stale?.dataset.zplayNew90) stale.remove();
      const template = document.createElement('template');
      template.innerHTML = renderSection(current);
      node = template.content.firstElementChild;
    }
    if (node.parentNode !== anchor.parentNode || node.nextElementSibling !== anchor) anchor.before(node);
  }
  function schedule() { if (!queued && !disposed) { queued = true; queueMicrotask(mount); } }
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  window.addEventListener('popstate', schedule); window.addEventListener('hashchange', schedule);
  const api = {
    mount,
    update(next) {
      if (!validCatalogue(next)) throw Error('NEW90_PUBLIC_CATALOGUE_INVALID');
      if (JSON.stringify(current) !== JSON.stringify(next)) { current = next; node?.remove(); node = null; }
      mount();
    },
    dispose() {
      disposed = true; observer.disconnect();
      window.removeEventListener('popstate', schedule); window.removeEventListener('hashchange', schedule);
      node?.remove(); node = null;
      if (window[STATE] === api) delete window[STATE];
    }
  };
  window[STATE] = api; mount(); return api;
}

export async function bootNewSection() {
  if (location.pathname === SECTION_PATH && window[PAGE_STATE]) { window[PAGE_STATE].filter(); return window[PAGE_STATE]; }
  if (window[STATE]) { window[STATE].mount(); return window[STATE]; }
  const response = await fetch(CATALOGUE_PATH, {credentials:'omit', cache:'no-store', redirect:'error', headers:{Accept:'application/json'}});
  if (!response.ok || !/^application\/json\b/i.test(response.headers.get('content-type') || '')) throw Error('NEW90_CATALOGUE_UNAVAILABLE');
  const catalogue = await response.json();
  return location.pathname === SECTION_PATH ? installCataloguePage(catalogue) : installNewSection(catalogue);
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') bootNewSection().catch(() => {});
