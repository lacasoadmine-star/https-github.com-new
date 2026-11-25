import {REQUESTED_NAMES, EXCLUDED_NAMES, canonicalName} from './requested.mjs';

export const SCHEMA = 'zplay/requested82-public-catalogue/v1';
export const ROOT_ID = 'zplay-requested82';
export const SECTION_PATH = '/new-games82/';
export const CATALOGUE_PATH = SECTION_PATH + 'catalogue.json';
export const ANCHOR = 'main.player-main .home-slot-heading';
const excluded = new Set(EXCLUDED_NAMES.map(canonicalName));
export const safeRoute = value => typeof value === 'string' && /^\/new-games(?:71|72|82|90)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(value);
export const safePreview = value => typeof value === 'string' && /^\/new-games(?:71|72|82|90)\/[a-z0-9]+(?:-[a-z0-9]+)*\/preview\/$/.test(value);
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function validCatalogue(value) {
  if (value?.schema !== SCHEMA || !/^[a-z0-9-]+$/.test(value.releaseId || '') || value.requestedCount !== 82 ||
      !Array.isArray(value.games) || value.games.length !== 82) return false;
  const ids = new Set(), routes = new Set();
  for (let index=0; index<82; index++) {
    const game = value.games[index];
    if (game?.ordinal !== index+1 || game.name !== REQUESTED_NAMES[index] || excluded.has(canonicalName(game.name)) ||
        !/^zplay(?:71|72|82|90)_[a-z0-9_]+_v\d+$/.test(game.gameId || '') || ids.has(game.gameId) ||
        typeof game.playable !== 'boolean' || game.playable !== (game.status === 'ready') ||
        !['ready','preparing'].includes(game.status) || (game.playable ? !safeRoute(game.route) : game.route !== null) ||
        (game.previewRoute !== null && !safePreview(game.previewRoute)) || (game.route && routes.has(game.route))) return false;
    ids.add(game.gameId); if(game.route) routes.add(game.route);
  }
  return value.readyCount === value.games.filter(game=>game.playable).length;
}

/** Only reviewed working releases are projected onto the actual dashboard. */
export function lobbyCatalogue(catalogue) {
  if(!validCatalogue(catalogue))throw Error('REQUESTED82_PUBLIC_CATALOGUE_INVALID');
  return Object.freeze({schema:'zplay/requested82-lobby/v1',releaseId:catalogue.releaseId,
    readyCount:catalogue.readyCount,games:Object.freeze(catalogue.games.filter(game=>game.playable).map(game=>Object.freeze({
      ordinal:game.ordinal,gameId:game.gameId,name:game.name,status:'ready',playable:true,route:game.route,previewRoute:null
    })))});
}

export function validLobbyCatalogue(value) {
  if(value?.schema!=='zplay/requested82-lobby/v1' || !/^[a-z0-9-]+$/.test(value.releaseId || '') ||
    !Array.isArray(value.games) || value.games.length>82 || value.readyCount!==value.games.length)return false;
  const ids=new Set(),routes=new Set();let previousOrdinal=0;
  for(const game of value.games){
    if(!Number.isSafeInteger(game?.ordinal) || game.ordinal<=previousOrdinal || game.ordinal>82 ||
      game.name!==REQUESTED_NAMES[game.ordinal-1] || game.playable!==true || game.status!=='ready' ||
      !/^zplay(?:71|72|82|90)_[a-z0-9_]+_v\d+$/.test(game.gameId || '') || ids.has(game.gameId) ||
      !safeRoute(game.route) || routes.has(game.route) || game.previewRoute!==null)return false;
    ids.add(game.gameId);routes.add(game.route);previousOrdinal=game.ordinal;
  }
  return true;
}

export function renderSection(catalogue, {expanded=false}={}) {
  if(!validLobbyCatalogue(catalogue)) throw Error('REQUESTED82_LOBBY_CATALOGUE_INVALID');
  if(catalogue.games.length===0)return '';
  const visible = expanded ? catalogue.games : catalogue.games.slice(0,10);
  const cards = visible.map(game=>`<li class="requested82-card" data-requested82-id="${escapeHtml(game.gameId)}"><article class="game-card requested82-game-card"><h3>${escapeHtml(game.name)}</h3><a class="requested82-play" href="${escapeHtml(game.route)}" aria-label="Ciyaar ${escapeHtml(game.name)}">Ciyaar</a></article></li>`).join('');
  return `<section id="${ROOT_ID}" data-zplay-requested82="${escapeHtml(catalogue.releaseId)}" aria-labelledby="requested82-title"><header class="requested82-heading"><h2 id="requested82-title">Ciyaaraha cusub</h2><span class="requested82-count">${catalogue.readyCount}</span></header>${expanded ? `<label class="requested82-search" for="requested82-search">Raadi ciyaar<input id="requested82-search" type="search" placeholder="Magaca ciyaarta" autocomplete="off" spellcheck="false"></label><output class="requested82-result-count" aria-live="polite">${catalogue.readyCount} ciyaarood</output>` : ''}<ol class="game-grid requested82-list">${cards}</ol>${expanded || catalogue.games.length<=10 ? '' : `<button type="button" class="requested82-all" data-requested82-expand aria-expanded="false">Eeg dhammaan ${catalogue.readyCount}</button>`}</section>`;
}

export function renderPage(catalogue, stylesheetPath, clientPath=null) {
  if(!/^\/_zplay\/requested82\/[a-f0-9]{24}\/styles\.css$/.test(stylesheetPath) ||
      (clientPath!==null && !/^\/_zplay\/requested82\/[a-f0-9]{24}\/client\.mjs$/.test(clientPath))) throw Error('REQUESTED82_PAGE_ASSET_PATH');
  return `<!doctype html><html lang="so"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><title>Ciyaaraha cusub · ZPLAY</title><link rel="stylesheet" href="${escapeHtml(stylesheetPath)}">${clientPath && catalogue.games.length ? `<script type="module" id="zplay-requested82-loader" src="${escapeHtml(clientPath)}"></script>` : ''}</head><body class="requested82-page"><main class="requested82-page-main"><a class="requested82-back" href="/">ZPLAY</a>${renderSection(catalogue,{expanded:true})}</main></body></html>`;
}
