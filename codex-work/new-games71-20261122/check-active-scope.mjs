// Integrity contract for the retained 71-game snapshot. This never enables a game.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

export const EXCLUDED = Object.freeze(['Multi Hot 5', 'Foxy Hot 20', 'Habesha Fortune 5']);
export const AREAS = Object.freeze(['reference', 'rules', 'assets', 'frontend', 'backend', 'controls', 'soundAnimation', 'qa']);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function validateActiveScope({ registry, catalog, historical, workItems, catalogBytes, historicalBytes }) {
  const issues = [];
  const require = (ok, code, detail) => { if (!ok) issues.push({ code, detail }); };
  const sourceObject = (supplied, bytes, label) => {
    let parsed;
    try {
      parsed = JSON.parse(typeof bytes === 'string' ? bytes : new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      require(false, label + '_OBJECT', 'The pinned source must be valid UTF-8 JSON');
      return {};
    }
    require(isDeepStrictEqual(supplied, parsed), label + '_OBJECT', 'Parsed input must match its pinned source bytes');
    return parsed ?? {};
  };
  // Validate against the byte-derived snapshots, never an independently supplied
  // object that could hide changed identities behind the hash of an older file.
  catalog = sourceObject(catalog, catalogBytes, 'CATALOG');
  historical = sourceObject(historical, historicalBytes, 'HISTORICAL');
  const games = registry?.games ?? [];
  const cards = catalog?.cards ?? [];
  const names = cards.map(card => card.displayName);
  const expected = cards.filter(card => !EXCLUDED.includes(card.displayName));
  const older = new Map((historical?.games ?? []).map(game => [game.officialName, game]));
  const routes = new Set(cards.map(card => card.currentPlayerRoute).filter(Boolean));
  const unique = (values, code) => require(values.every(value => typeof value === 'string' && value.length > 0) && new Set(values).size === values.length, code, 'Missing or duplicate identity');

  require(registry?.targetNewGames === 71 && games.length === 71 && registry.activeScope === false && registry.checkpointStatus === 'HISTORICAL_SCOPE_SNAPSHOT', 'SCOPE_COUNT', 'Exactly71 targets in the superseded snapshot are required');
  require(cards.length === 74 && catalog.visibleCardCount === 74 && new Set(names).size === 74, 'CATALOG_COUNT', 'The retained rendered catalog must contain 74 unique names');
  require(EXCLUDED.every(name => names.includes(name)) && same(registry.excludedProtectedNames, EXCLUDED), 'EXCLUSIONS', 'The three protected exclusions must stay exact');
  require(same(games.map(game => game.officialName), expected.map(card => card.displayName)), 'CATALOG_ORDER', 'Names must follow the rendered catalog order after the three exclusions');
  require(catalogBytes && sha256(catalogBytes) === registry.scopeSource?.catalogSha256, 'CATALOG_PIN', 'Catalog evidence changed without a reviewed scope revision');
  require(historicalBytes && sha256(historicalBytes) === registry.historicalCheckpoint?.registrySha256, 'HISTORICAL_PIN', 'The previous 72-game identity checkpoint must remain unchanged');
  require(registry.publicActivation === false && registry.readyGameCount === 0, 'ACTIVATION_CLOSED', 'This preparation checkpoint grants no activation');

  unique(games.map(game => game.gameId), 'GAME_ID_UNIQUE');
  unique(games.map(game => game.route), 'ROUTE_UNIQUE');
  unique(games.map(game => game.modulePath), 'MODULE_UNIQUE');
  unique(games.map(game => game.assets?.prefix), 'ASSET_PREFIX_UNIQUE');
  unique(games.map(game => game.assets?.manifestPath), 'ASSET_MANIFEST_UNIQUE');
  const variants = games.filter(game => game.variant?.key).map(game => JSON.stringify([game.provider, game.variant.category, game.variant.key]));
  unique(variants, 'PROVIDER_VARIANT_UNIQUE');

  let preserved = 0;
  for (const [index, game] of games.entries()) {
    const card = expected[index];
    require(game.ordinal === index + 1 && game.catalogOrder === card?.catalogOrder && game.workActive === true, 'ORDINAL', game.officialName);
    require(game.currentPlayerRoute === card?.currentPlayerRoute, 'CURRENT_PLAYER_ROUTE', game.officialName);
    require(game.backend?.enabled === false && game.implementationComplete === false && game.releaseReady === false && game.cashReleaseEnabled === false, 'GAME_CLOSED', game.officialName);
    require(!routes.has(game.route) && /^\/new-games7[12]\/[a-z0-9-]+\/$/.test(game.route ?? ''), 'ADDITIVE_ROUTE', game.officialName);
    const old = older.get(game.officialName);
    if (old) {
      preserved++;
      require(['gameId', 'route', 'modulePath'].every(key => game[key] === old[key]) &&
        ['configurationPath', 'evaluatorPath'].every(key => game.backend?.[key] === old.backend?.[key]), 'PRESERVED_IDENTITY', game.officialName);
      require(game.provider === old.provider && isDeepStrictEqual(game.variant, old.variant), 'PRESERVED_PROVIDER_VARIANT', game.officialName);
      require(['prefix', 'manifestPath'].every(key => game.assets?.[key] === old.assets?.[key]), 'PRESERVED_ASSETS', game.officialName);
    } else {
      require(game.officialName === 'JetX' && game.gameId === 'zplay71_jetx_v1' && game.route === '/new-games71/jetx/' && game.provider === 'SmartSoft Gaming', 'NEW_IDENTITY', game.officialName);
      const jetxModule = 'codex-work/new-games71-20261122/games/jetx';
      require(game.modulePath === jetxModule &&
        game.backend?.configurationPath === jetxModule + '/specification.json' &&
        game.backend?.evaluatorPath === jetxModule + '/evaluator.mjs' &&
        game.assets?.prefix === '/new-games71/jetx/assets/v1/' &&
        game.assets?.manifestPath === jetxModule + '/assets-manifest.json', 'JETX_RESERVED_PATHS', game.officialName);
      require(game.variant?.key === null && game.variant?.category === null && game.variant?.status === 'UNRESOLVED_DISTINCT_OFFICIAL_VARIANT' && game.notAnAliasOf === 'zplay72_new_era_of_jetx_v1', 'UNRESOLVED_VARIANT', 'Classic JetX must not inherit the New Era demo');
    }
  }
  require(preserved === 70 && !games.some(game => ['SplitX', 'Double X'].includes(game.officialName)), 'SCOPE_DELTA', 'Seventy previous identities carry forward; SplitX and Double X remain historical');

  const items = workItems?.items ?? [];
  require(workItems?.targetCount === 71 && items.length === 568 && workItems.itemCount === 568 && workItems.activeCount === 568, 'WORK_COUNT', 'Each game needs eight active owned work areas');
  require(same(workItems?.areas, AREAS) && workItems?.cohortsAreSequentialGates === false, 'WORK_AREAS', 'Cohorts must not block independent work');
  unique(items.map(item => item.workItemId), 'WORK_ITEM_UNIQUE');
  for (const game of games) for (const area of AREAS) {
    const id = `${game.gameId}:${area}`;
    const matches = items.filter(item => item.workItemId === id);
    const item = matches[0];
    require(matches.length === 1 && item.gameId === game.gameId && item.area === area && item.active === true &&
      item.blockerStopsOtherGames === false && typeof item.owner === 'string' && item.owner.length > 0 &&
      typeof item.nextAction === 'string' && item.nextAction.length > 0 && game.workItemIds?.[area] === id,
    'OWNED_WORK_ITEM', id);
  }
  return { schema: 'zplay/new71-active-scope-check/v1', valid: issues.length === 0, targetGames: games.length,
    preservedIdentities: preserved, activeWorkItems: items.length, releaseAllowed: false, activationPerformed: false,
    productionRequests: 0, issues };
}

export async function readScopeInputs() {
  const [registryBytes, catalogBytes, historicalBytes, workBytes] = await Promise.all([
    readFile(new URL('./registry.json', import.meta.url)),
    readFile(new URL('./references/catalog-live74.json', import.meta.url)),
    readFile(new URL('../new-games72-20261121/registry.json', import.meta.url)),
    readFile(new URL('./work-items.json', import.meta.url)),
  ]);
  return { registry: JSON.parse(registryBytes), catalog: JSON.parse(catalogBytes), historical: JSON.parse(historicalBytes),
    workItems: JSON.parse(workBytes), catalogBytes, historicalBytes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateActiveScope(await readScopeInputs());
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.valid ? 0 : 1;
}
