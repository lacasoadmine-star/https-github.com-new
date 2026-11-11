// Verified 2026-11-11 by read-only public metadata; no backend/limit changes.
// https://superwin-native-family-engine-staging.up.railway.app/v2/library/health
// https://superwin-player.apdiy61.workers.dev/api/game-construction-queue?limit=1
// GET /api/slots/games/wild_multi_stars also confirms the protected wallet API.
// Protected routes retain the existing project mappings. These links use the
// existing engines and actual account; they do not claim new-model parity.
export const EXISTING_WALLET_ROUTES=Object.freeze({
  ind74_official_multihot5:'/games/multi_hot_5_video',
  ind74_official_foxyhot20:'/games/hot_foxy_20',
  ind74_official_balloon:'/games/balloon_native',
  ind74_official_wildmultistars:'/games/wild_multi_stars',
  ind74_official_multihot40:'/games/multihot40_native',
  ind74_official_multihot100:'/games/multihot100_native',
  ind74_official_habeshafortune5:'/games/habeshafortune5_native',
  ind74_official_multihotwildways:'/games/multihotwildways_native',
  ind74_official_multihot5wild:'/games/multihot5wild_native',
  ind74_official_multihot5superwilds:'/games/multihot5superwilds_native',
  // Queue metadata explicitly provides providerKey=multihot5deluxe.
  ind74_official_multihot5deluxe:'/games/multihotdeluxe_native',
  ind74_official_burningice:'/games/burningice_native',
  ind74_official_burningice10:'/games/burningice10_native',
  ind74_official_burningice40:'/games/burningice40_native',
});
export function existingWalletRoute(gameId){
  return typeof gameId==='string'&&Object.hasOwn(EXISTING_WALLET_ROUTES,gameId)?EXISTING_WALLET_ROUTES[gameId]:null;
}
