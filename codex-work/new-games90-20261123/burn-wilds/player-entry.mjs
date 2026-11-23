import {mountBurnWilds} from './mount.mjs';
import {createBurnWildsOwnArtwork} from './own-artwork.mjs';
import {createBurnWildsExistingHostTransport} from './host-transport.mjs';
import {BURN_WILDS_GAME_ID} from './expansion.mjs';

/**
 * One integration entry for the existing ZPLAY Player route.
 * No new wallet, demo account, outcome generator or standalone site.
 * The caller must pass this game's rights-cleared artwork and an existing
 * Player DOM root; an absent backend release is displayed as unavailable.
 */
export async function mountBurnWildsExistingPlayer({
  root,artwork,fetcher=globalThis.fetch,storage=globalThis.sessionStorage,
  audio=null,win=globalThis,transportFactory=createBurnWildsExistingHostTransport,
  mount=mountBurnWilds,artworkFactory=createBurnWildsOwnArtwork
}={}){
  if(!root?.ownerDocument||
    typeof fetcher!=='function'||typeof transportFactory!=='function'||
    typeof mount!=='function'||typeof artworkFactory!=='function')
    throw new TypeError('BURN_WILDS_EXISTING_PLAYER_DEPENDENCIES');
  // Default to original, code-drawn ZPLAY symbols; licensed third-party
  // provider files are not needed or fetched by this entry.
  const ownedArtwork=artwork===undefined?
    artworkFactory({doc:root.ownerDocument}):artwork;
  if(ownedArtwork?.gameId!==BURN_WILDS_GAME_ID)
    throw new TypeError('BURN_WILDS_EXISTING_PLAYER_DEPENDENCIES');
  const transport=transportFactory({fetcher});
  if(!transport||!['state','prepare','dispatch','recover'].every(method=>typeof transport[method]==='function'))
    throw new TypeError('BURN_WILDS_EXISTING_PLAYER_TRANSPORT');
  return mount({root,artwork:ownedArtwork,transport,storage,audio,win});
}

