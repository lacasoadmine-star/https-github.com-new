/**
 * Additive lobby projection. This neither installs routes nor authorizes wagers.
 * The existing authenticated server must publish the reviewed release document.
 * An inactive preparation returns every legacy card unchanged.
 */
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const root = '/new-games72/';
const fail = code => { throw new Error(code); };
const path = value => typeof value === 'string' && value.startsWith(root) &&
  !value.includes('..') && !value.includes('%') && !value.includes('\\') && !value.includes('//');

export function additiveCatalog({ legacyGames, registry, publication = null } = {}) {
  if (!Array.isArray(legacyGames)) fail('EXISTING_CATALOG_REQUIRED');
  if (!registry || registry.schema !== 'zplay/new-games72-registry/v1' ||
      !Array.isArray(registry.games) || registry.games.length !== 72) fail('NEW72_REGISTRY_REQUIRED');
  if (!publication || publication.state === 'INACTIVE') {
    return { games: legacyGames.slice(), newSection: null, activatedNewCount: 0 };
  }
  if (publication.schema !== 'zplay/new-games72-publication/v1' || publication.state !== 'ACTIVE' ||
      publication.releaseId !== registry.releaseId || !COMMIT.test(publication.sourceCommit ?? '') ||
      !SHA.test(publication.releaseManifestSha256 ?? '') ||
      !Array.isArray(publication.games) || publication.games.length !== 72) fail('COMPLETE_PUBLICATION_REQUIRED');
  const known = new Map(registry.games.map(game => [game.gameId, game]));
  if (known.size !== 72) fail('DUPLICATE_NEW_ID');
  const oldIds = new Set(legacyGames.map(game => game.id ?? game.gameId ?? game.catalogId));
  const oldRoutes = new Set(legacyGames.flatMap(game => [game.route, game.accountPath, game.path].filter(Boolean)));
  const seen = new Set(), routes = new Set();
  const added = publication.games.map(item => {
    const game = known.get(item.gameId);
    if (!game || seen.has(item.gameId)) fail('PUBLICATION_ID_MISMATCH');
    if (oldIds.has(item.gameId) || oldRoutes.has(item.route)) fail('LEGACY_COLLISION');
    if (!path(item.route) || item.route !== game.route || routes.has(item.route)) fail('PUBLICATION_ROUTE_MISMATCH');
    if (!path(item.coverPath) || !item.coverPath.startsWith(game.assets.prefix) ||
        !SHA.test(item.coverSha256 ?? '') || typeof item.frontendVersion !== 'string' || !item.frontendVersion ||
        item.rulesVersion !== game.backend.rulesVersion || typeof item.rulesVersion !== 'string' || !item.rulesVersion)
      fail('PINNED_NEW_GAME_ASSETS_REQUIRED');
    seen.add(item.gameId); routes.add(item.route);
    return Object.freeze({
      id: item.gameId, gameId: item.gameId, title: game.officialName,
      route: game.route, accountPath: game.route,
      category: game.category, sectionId: 'zplay-new-games72',
      engineProvider: 'ZPLAY', referenceProvider: game.provider,
      cover: item.coverPath, coverSha256: item.coverSha256,
      releaseId: publication.releaseId, frontendVersion: item.frontendVersion,
      rulesVersion: item.rulesVersion,
    });
  });
  // Original records retain their object identities and all unknown properties.
  return {
    games: [...legacyGames, ...added], activatedNewCount: added.length,
    newSection: Object.freeze({ id: 'zplay-new-games72', title: 'Ciyaaraha cusub',
      releaseId: publication.releaseId, gameIds: Object.freeze(added.map(game => game.id)) }),
  };
}
