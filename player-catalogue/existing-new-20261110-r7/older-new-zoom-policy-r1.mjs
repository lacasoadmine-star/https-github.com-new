// Three additional NEW launch routes confirmed in the existing live lobby.
// The protected MultiHot5/FoxyHot20 and the frozen ten-demo package are excluded.
export const OLDER_ZOOM_POLICIES=Object.freeze({
 '/games/multihot40_native':Object.freeze({id:'multihot40_native',cancelHeldPointers:true}),
 '/games/balloon_native':Object.freeze({id:'balloon_native',cancelHeldPointers:false,ignoreSecondaryRelease:true}),
 '/games/jetx_native':Object.freeze({id:'jetx_native',cancelHeldPointers:false}),
});
export const OLDER_NEW_PATHS=Object.freeze(Object.keys(OLDER_ZOOM_POLICIES));
export const ZOOM_PREFIX='/native-library/remaining20/20261110-older-new-zoom-r1/';
export const VIEWPORT_CONTENT='width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
