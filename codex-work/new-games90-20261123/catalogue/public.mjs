export const SCHEMA = 'zplay/new90-public-catalogue/v1';
export const ROOT_ID = 'zplay-requested90';
export const SECTION_PATH = '/new-games90/';
export const CATALOGUE_PATH = SECTION_PATH + 'catalogue.json';
export const ANCHOR = 'main.player-main .home-slot-heading';
const canonical = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const excluded = new Set(['multihot5', 'foxyhot20', 'habeshafortune5']);
export const safeRoute = route => typeof route === 'string' && /^\/new-games(?:71|72|90)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(route);
export const safePreview = route => typeof route === 'string' && /^\/new-games(?:71|72|90)\/[a-z0-9]+(?:-[a-z0-9]+)*\/preview\/$/.test(route);
export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));

export function validCatalogue(value) {
  if (value?.schema !== SCHEMA || !/^[a-z0-9-]+$/.test(value.releaseId || '')
    || value.requestedCount !== 90 || !Array.isArray(value.games) || value.games.length !== 90) return false;
  const ids = new Set(), names = new Set();
  for (let index = 0; index < value.games.length; index++) {
    const game = value.games[index];
    if (game.ordinal !== index + 1 || typeof game.name !== 'string' || !game.name || game.name.length > 120
      || excluded.has(canonical(game.name)) || names.has(canonical(game.name))
      || !/^zplay(?:71|72|90)_[a-z0-9_]+_v\d+$/.test(game.gameId || '') || ids.has(game.gameId)
      || typeof game.playable !== 'boolean' || game.playable !== (game.status === 'ready')
      || !['ready', 'preparing'].includes(game.status)
      || (game.playable ? !safeRoute(game.route) : game.route !== null)
      || (game.previewRoute !== null && !safePreview(game.previewRoute))) return false;
    ids.add(game.gameId); names.add(canonical(game.name));
  }
  return value.readyCount === value.games.filter(game => game.playable).length;
}

export function renderSection(catalogue, {expanded = false} = {}) {
  if (!validCatalogue(catalogue)) throw Error('NEW90_PUBLIC_CATALOGUE_INVALID');
  const visible = expanded ? catalogue.games : catalogue.games.slice(0, 10);
  return `<section id="${ROOT_ID}" data-zplay-new90="${escapeHtml(catalogue.releaseId)}" aria-labelledby="zplay-new90-title" style="display:block!important"><header class="new90-heading"><div><span class="new90-kicker">NEW</span><h2 id="zplay-new90-title">Ciyaaraha cusub</h2></div><span class="new90-count">90</span></header><p class="new90-summary">${catalogue.readyCount} diyaar ah · ${90 - catalogue.readyCount} diyaarin ku jira</p>${expanded ? '<label class="new90-search" for="zplay-new90-search">Raadi ciyaar<input id="zplay-new90-search" type="search" placeholder="Magaca ciyaarta" autocomplete="off" spellcheck="false"></label><output class="new90-result-count" aria-live="polite">90 ciyaarood</output>' : ''}<ol class="new90-list">${visible.map(game => `<li class="new90-card" data-new90-id="${escapeHtml(game.gameId)}"><span class="new90-number">${String(game.ordinal).padStart(2, '0')}</span><div class="new90-name">${escapeHtml(game.name)}</div>${game.playable ? `<a class="new90-action" href="${escapeHtml(game.route)}">Ciyaar</a>` : game.previewRoute ? `<a class="new90-preview" href="${escapeHtml(game.previewRoute)}" aria-label="Eeg muuqaalka ${escapeHtml(game.name)} — bet-ku ma furna">Eeg muuqaalka</a>` : '<span class="new90-pending" aria-label="Weli diyaar ma aha">Diyaarin</span>'}</li>`).join('')}</ol>${expanded ? '' : `<a class="new90-all" href="${SECTION_PATH}">Eeg dhammaan 90 <span aria-hidden="true">→</span></a>`}</section>`;
}

export function renderPage(catalogue, stylesheetPath, clientPath = null) {
  return `<!doctype html><html lang="so"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><title>Ciyaaraha cusub · ZPLAY</title><link rel="stylesheet" href="${escapeHtml(stylesheetPath)}">${clientPath ? `<script type="module" id="zplay-new90-loader" src="${escapeHtml(clientPath)}"></script>` : ''}</head><body class="new90-page"><main class="new90-page-main"><a class="new90-back" href="/">← ZPLAY</a>${renderSection(catalogue, {expanded:true})}</main></body></html>`;
}
