// Root document presentation only. The retained Player application owns login,
// session refresh, wallet state, payment actions and in-game routes.
export const RELEASE = 'zplay-player-20261119-play-now-r1';
export const PREFIX = '/' + RELEASE + '/';
export const RETIRED_SCRIPTS = new Set([
  '/new-machines/launcher.mjs',
  '/remaining20-catalogue/20261109-r3/lobby.mjs',
  '/native-library/remaining20/20261110-rounds-r21/lobby.mjs',
  '/independent74/lobby74.mjs',
  '/independent74/fresh74-lobby.mjs',
  '/zplay74/lobby.mjs',
  '/native-new/20261118-r1/lobby-v445.mjs',
]);
export const RETIRED_ELEMENTS = new Set([
  'observed-new-launcher',
  'observed-catalogue-feedback',
  'observed-game-dialog',
]);

export function rootScriptAction(src) {
  const path = typeof src === 'string' ? src.split('?')[0] : '';
  if (RETIRED_SCRIPTS.has(path)) return {remove: true};
  if (path === '/zplay-restored/20261117-details-r1/lobby.mjs') {
    return {src: PREFIX + 'lobby.mjs'};
  }
  if (path === '/assets/player-reference-v2138.js') {
    return {src: PREFIX + 'player-app.mjs'};
  }
  return null;
}

export function transformRoot(response, Rewriter = HTMLRewriter) {
  return new Rewriter()
    .on('script[src]', {element(element) {
      const action = rootScriptAction(element.getAttribute('src'));
      if (action?.remove) element.remove();
      else if (action?.src) element.setAttribute('src', action.src);
    }})
    .on('[id]', {element(element) {
      if (RETIRED_ELEMENTS.has(element.getAttribute('id'))) element.remove();
    }})
    .transform(response);
}
