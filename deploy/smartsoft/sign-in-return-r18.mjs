// Extend the retained same-origin login return flow for the nine released NEW
// entries only. The original helper still verifies /api/machine-session and
// waits for the existing login to establish the original account cookie.
export const ORIGINAL_SIGN_IN_SHA256='cf3005e0b33cdccfa3705a5f3e4b735421f666e512c057241be426edd4982aa4';
export const ACCOUNT_GAME_IDS=Object.freeze(['multihot100_native','habeshafortune5_native',
 'multihotwildways_native','multihot5wild_native','multihot5superwilds_native',
 'multihotdeluxe_native','burningice_native','burningice10_native','burningice40_native']);
const allowed=new Set(ACCOUNT_GAME_IDS);
const anchor="const allowed=new Set(['jetx_native','multihot40_native']),key='zplay.native.launch.return';";
export function gameAccountHref(id){
 if(!allowed.has(id))throw Error('UNRELEASED_ACCOUNT_RETURN_TARGET');
 return '/?play='+id;
}
export function patchSignInReturn(source){
 if(typeof source!=='string'||source.split(anchor).length!==2||
  !source.includes("original('/api/machine-session',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}})")||
  !source.includes("if(r.ok&&(await r.json()).authenticated===true)")||
  !source.includes('location.replace(target)')||
  !source.includes('return response;'))throw Error('RETAINED_SIGN_IN_RETURN_CHANGED');
 return source.replace(anchor,"const allowed=new Set("+JSON.stringify(['jetx_native','multihot40_native',...ACCOUNT_GAME_IDS])+"),key='zplay.native.launch.return';");
}
