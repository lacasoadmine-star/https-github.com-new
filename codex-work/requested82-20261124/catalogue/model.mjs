import {REQUESTED_NAMES,EXCLUDED_NAMES,canonicalName} from './requested.mjs';
import {SCHEMA,safeRoute,safePreview,validCatalogue} from './public.mjs';
const excluded = new Set(EXCLUDED_NAMES.map(canonicalName));

/** All implementation, integration and actual live checks must precede release. */
export function releaseReady(game) {
  const proof = game.release?.proof;
  return game.release?.ready===true && game.release.enabled===true && game.release.liveVerified===true &&
    game.identityReservedOnly===false && !game.duplicateOfGameId &&
    game.reference?.identityStatus==='CATALOGUE_IDENTITY_VERIFIED' && game.reference.manualReferenceRounds>=7 &&
    !!game.reference.freshEvidenceManifestPath && !!game.reference.rulesSource &&
    game.frontend?.implemented===true && game.frontend.route===game.route &&
    game.backend?.enabled===true && /^[a-f0-9]{64}$/.test(game.backend.mountedModuleSha256 || '') &&
    game.assets?.runtimeAssetsVerified===true && /^[a-f0-9]{64}$/.test(game.assets.manifestSha256 || '') &&
    game.tests?.implemented===true && game.tests.passed===true && game.tests.financialIntegrationVerified===true &&
    proof?.gameId===game.gameId && /^[a-f0-9]{40}$/.test(proof.sourceCommit || '') &&
    /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(proof.workerVersion || '') &&
    /^[a-f0-9]{64}$/.test(proof.evidenceSha256 || '') && Number.isFinite(Date.parse(proof.verifiedAt || '')) &&
    proof.serverAuthoritative===true && proof.controlsVerified===true && proof.audioVerified===true &&
    proof.visualParityVerified===true && proof.playwrightVerified===true &&
    proof.existingBackendConnected===true && proof.liveGameplayVerified===true && safeRoute(game.route);
}

export function publicCatalogue(registry) {
  if(registry?.schema!=='zplay/requested82-registry/v1' || registry.requestedNameCount!==82 ||
     !Array.isArray(registry.games) || registry.games.length!==82) throw Error('REQUESTED82_REGISTRY_REQUIRED');
  const ids=new Set(),routes=new Set();
  const games=registry.games.map((game,index)=>{
    if(game?.ordinal!==index+1 || game.displayName!==REQUESTED_NAMES[index] || excluded.has(canonicalName(game.displayName)) ||
       !/^zplay(?:71|72|82|90)_[a-z0-9_]+_v\d+$/.test(game.gameId || '') || ids.has(game.gameId) ||
       !safeRoute(game.route) || routes.has(game.route)) throw Error('REQUESTED82_IDENTITY_INVALID:'+(index+1));
    ids.add(game.gameId);routes.add(game.route);
    const playable=registry.publicActivation===true && releaseReady(game),preview=game.frontend?.visualPreview;
    const previewRoute=preview?.enabled===true && preview.readOnly===true && preview.assetClosureVerified===true &&
      /^[a-f0-9]{64}$/.test(preview.assetManifestSha256 || '') && /^[a-f0-9]{40}$/.test(preview.sourceCommit || '') &&
      preview.route===game.route+'preview/' && safePreview(preview.route) ? preview.route : null;
    return Object.freeze({ordinal:index+1,gameId:game.gameId,name:game.displayName,status:playable?'ready':'preparing',playable,route:playable?game.route:null,previewRoute});
  });
  const result=Object.freeze({schema:SCHEMA,releaseId:registry.releaseId,requestedCount:82,readyCount:games.filter(game=>game.playable).length,games:Object.freeze(games)});
  if(!validCatalogue(result)) throw Error('REQUESTED82_PUBLIC_CATALOGUE_INVALID');
  return result;
}
