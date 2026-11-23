/** Fullscreen is owned only by this Burn Wilds mount; no browser fallback. */
export async function toggleBurnWildsFullscreen(view, doc=view?.ownerDocument) {
  if (!view || !doc) throw new TypeError('BURN_WILDS_FULLSCREEN_VIEW_REQUIRED');
  if (doc.fullscreenElement === view) {
    if (typeof doc.exitFullscreen !== 'function') return {changed:false, active:true, reason:'UNAVAILABLE'};
    try {await doc.exitFullscreen(); return {changed:true, active:false};}
    catch {return {changed:false, active:true, reason:'DENIED'};}
  }
  if (doc.fullscreenElement) return {changed:false, active:false, reason:'OTHER_GAME_FULLSCREEN'};
  if (typeof view.requestFullscreen !== 'function') return {changed:false, active:false, reason:'UNAVAILABLE'};
  try {await view.requestFullscreen(); return {changed:true, active:true};}
  catch {return {changed:false, active:false, reason:'DENIED'};}
}
