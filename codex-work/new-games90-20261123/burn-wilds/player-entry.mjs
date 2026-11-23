import {mountBurnWilds} from './mount.mjs';
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
  mount=mountBurnWilds
}={}){
  if(!root?.ownerDocument||artwork?.gameId!==BURN_WILDS_GAME_ID ||
    typeof fetcher!=='function'||typeof transportFactory!=='function'||
    typeof mount!=='function')
    throw new TypeError('BURN_WILDS_EXISTING_PLAYER_DEPENDENCIES');
  const transport=transportFactory({fetcher});
  if(!transport||!['state','prepare','dispatch','recover'].every(method=>typeof transport[method]==='function'))
    throw new TypeError('BURN_WILDS_EXISTING_PLAYER_TRANSPORT');
  return mount({root,artwork,transport,storage,audio,win});
}
