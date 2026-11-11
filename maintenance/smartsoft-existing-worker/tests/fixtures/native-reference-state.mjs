// Keep this presentation revision when the same authoritative game version
// arrives from the retained server. Financial configuration remains server
// owned. A changed model never gets rewritten. Display assets may be updated
// independently of the server's older presentation descriptor.
export function mergeReferenceGame(catalog,serverGame){
 const descriptor=catalog?.referencePresentation;
 if(!descriptor||!serverGame||catalog.id!==serverGame.id||catalog.version!==serverGame.version||!/^[a-f0-9]{64}$/.test(descriptor.retainedManifestSha256||''))return serverGame;
 const previous=serverGame.referencePresentation??serverGame.publicConfig?.referencePresentation;
 if(previous?.modelVersion&&previous.modelVersion!==serverGame.version)return serverGame;
 return {...serverGame,referencePresentation:descriptor};
}
