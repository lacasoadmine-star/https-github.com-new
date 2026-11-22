import {REQUESTED_NAMES, EXCLUDED_NAMES, canonicalName} from './requested.mjs';
import {SCHEMA, safeRoute, safePreview, validCatalogue} from './public.mjs';
const excluded = new Set(EXCLUDED_NAMES.map(canonicalName));

/** Only the release coordinator can supply the reviewed implementation and live evidence. */
export function releaseReady(game) {
  const proof = game.release?.proof;
  return game.release?.ready === true && game.release.enabled === true && game.release.liveVerified === true
    && game.identityReservedOnly === false && !game.duplicateOfGameId
    && game.reference?.identityStatus === 'CATALOGUE_IDENTITY_VERIFIED'
    && game.reference.manualReferenceRounds >= 7 && !!game.reference.freshEvidenceManifestPath
    && !!game.reference.rulesSource && game.frontend?.implemented === true
    && game.backend?.enabled === true && game.assets?.runtimeAssetsVerified === true
    && game.tests?.implemented === true && game.tests.passed === true && game.tests.financialIntegrationVerified === true
    && proof?.gameId === game.gameId && /^[a-f0-9]{40}$/.test(proof.sourceCommit || '')
    && /^[a-f0-9-]{36}$/.test(proof.workerVersion || '') && /^[a-f0-9]{64}$/.test(proof.evidenceSha256 || '')
    && Number.isFinite(Date.parse(proof.verifiedAt || ''))
    && proof.serverAuthoritative === true && proof.controlsVerified === true && proof.audioVerified === true
    && proof.visualParityVerified === true && safeRoute(game.route) && game.frontend.route === game.route;
}

export function publicCatalogue(registry) {
  if (registry?.schema !== 'zplay/requested90-registry/v1' || registry.requestedNameCount !== 90
    || !Array.isArray(registry.games) || registry.games.length !== 90) throw Error('NEW90_REGISTRY_REQUIRED');
  const ids = new Set(), routes = new Set();
  const games = registry.games.map((game, index) => {
    if (game.ordinal !== index + 1 || game.displayName !== REQUESTED_NAMES[index]
      || excluded.has(canonicalName(game.displayName))
      || !/^zplay(?:71|72|90)_[a-z0-9_]+_v\d+$/.test(game.gameId || '') || ids.has(game.gameId)
      || !safeRoute(game.route) || routes.has(game.route)) throw Error('NEW90_IDENTITY_INVALID:' + (index + 1));
    ids.add(game.gameId); routes.add(game.route);
    const playable = registry.publicActivation === true && releaseReady(game);
    const preview = game.frontend?.visualPreview;
    const previewRoute = preview?.enabled === true && preview.readOnly === true
      && preview.assetClosureVerified === true && safePreview(preview.route) ? preview.route : null;
    return Object.freeze({ordinal:index + 1, gameId:game.gameId, name:game.displayName,
      status:playable ? 'ready' : 'preparing', playable, route:playable ? game.route : null, previewRoute});
  });
  const result = Object.freeze({schema:SCHEMA, releaseId:registry.releaseId,
    requestedCount:90, readyCount:games.filter(game => game.playable).length, games:Object.freeze(games)});
  if (!validCatalogue(result)) throw Error('NEW90_PUBLIC_CATALOGUE_INVALID');
  return result;
}
