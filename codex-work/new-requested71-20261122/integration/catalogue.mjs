// Additive presentation only. This module neither creates rounds nor reads wallets.
export const CATALOGUE_SCHEMA = 'zplay/new71-public-catalogue/v1';
export const ROOT_ID = 'zplay-requested71';
export const NEW_SECTION_PATH = '/new-games71/';
export const CATALOGUE_PATH = '/new-games71/catalogue.json';
export const LOBBY_ANCHOR = 'main.player-main .home-slot-heading';

const canonical = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const excluded = new Set(['multihot5', 'foxyhot20', 'habeshafortune5']);
const safeRoute = route => typeof route === 'string' && /^\/new-games(?:71|72)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(route);
const ready = game => game.release?.ready === true && game.release?.enabled === true
  && game.release?.liveVerified === true && game.identityReservedOnly === false
  && game.reference?.identityStatus === 'CATALOGUE_IDENTITY_VERIFIED'
  && game.reference?.manualReferenceRounds >= 7 && !!game.reference?.freshEvidenceManifestPath
  && !!game.reference?.rulesSource && !game.duplicateOfRequestId
  && game.frontend?.implemented === true && game.backend?.enabled === true
  && game.assets?.runtimeAssetsVerified === true && game.tests?.implemented === true
  && game.tests?.passed === true && game.tests?.financialIntegrationVerified === true
  && safeRoute(game.frontend?.route) && game.route === game.frontend.route;

export function publicCatalogue(registry) {
  if (registry?.schema !== 'zplay/requested71-registry/v1' || !Array.isArray(registry.games)
    || registry.games.length !== 71 || registry.requestedNameCount !== 71) throw Error('NEW71_REGISTRY_REQUIRED');
  const ids = new Set(), routes = new Set(), names = new Set();
  const games = registry.games.map((game, index) => {
    const name = String(game.displayName || '').trim();
    if (game.ordinal !== index + 1 || !name || name.length > 120 || excluded.has(canonical(name))
      || !/^zplay(?:71|72)_[a-z0-9_]+_v\d+$/.test(game.gameId || '')
      || ids.has(game.gameId) || routes.has(game.route) || names.has(canonical(name)) || !safeRoute(game.route)) {
      throw Error('NEW71_IDENTITY_INVALID:' + (index + 1));
    }
    ids.add(game.gameId); routes.add(game.route); names.add(canonical(name));
    const playable = registry.publicActivation === true && ready(game);
    const previewRoute = game.gameId === 'zplay72_multi_hot_10_v1'
      && game.frontend?.visualPreview?.enabled === true
      && game.frontend.visualPreview.readOnly === true
      && game.frontend.visualPreview.route === '/new-games72/multi-hot-10/preview/'
      ? game.frontend.visualPreview.route : null;
    return Object.freeze({ordinal: index + 1, gameId: game.gameId, name,
      status: playable ? 'ready' : 'preparing', playable, route: playable ? game.route : null, previewRoute});
  });
  return Object.freeze({schema: CATALOGUE_SCHEMA, releaseId: registry.releaseId,
    requestedCount: games.length, readyCount: games.filter(game => game.playable).length,
    games: Object.freeze(games)});
}

export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

export function renderCatalogueSection(catalogue, {expanded = false} = {}) {
  const count = catalogue.games.length;
  const visible = expanded ? catalogue.games : catalogue.games.slice(0, 10);
  return `<section id="${ROOT_ID}" data-zplay-new71="${escapeHtml(catalogue.releaseId)}" aria-labelledby="zplay-new71-title">
    <header class="new71-heading"><div><span class="new71-kicker">NEW</span><h2 id="zplay-new71-title">Ciyaaraha cusub</h2></div><span class="new71-count">${count}</span></header>
    <p class="new71-summary">${catalogue.readyCount} diyaar ah · ${count - catalogue.readyCount} diyaarin ku jira</p>
    <ol class="new71-list">${visible.map(game => `<li class="new71-card" data-new71-id="${escapeHtml(game.gameId)}"><span class="new71-number">${String(game.ordinal).padStart(2, '0')}</span><div class="new71-name">${escapeHtml(game.name)}</div>${game.playable ? `<a class="new71-action" href="${escapeHtml(game.route)}">Ciyaar</a>` : game.previewRoute ? `<a class="new71-preview" href="${escapeHtml(game.previewRoute)}" aria-label="Eeg muuqaalka ${escapeHtml(game.name)} — bet-ku ma furna">Eeg muuqaalka</a>` : '<span class="new71-pending" aria-label="Weli diyaar ma aha">Diyaarin</span>'}</li>`).join('')}</ol>
    ${expanded ? '' : `<a class="new71-all" href="${NEW_SECTION_PATH}">Eeg dhammaan ${count} <span aria-hidden="true">→</span></a>`}
  </section>`;
}

export function renderCataloguePage(catalogue, stylesheetPath) {
  return `<!doctype html><html lang="so"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><title>Ciyaaraha cusub · ZPLAY</title><link rel="stylesheet" href="${escapeHtml(stylesheetPath)}"></head><body class="new71-page"><main class="new71-page-main"><a class="new71-back" href="/">← ZPLAY</a>${renderCatalogueSection(catalogue, {expanded:true})}</main></body></html>`;
}
