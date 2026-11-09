// Exact initial artwork from the captured official public Box configurations.
// These are decorative pre-round cells, never an RNG result or payable receipt.
// Source hashes, inherited variants and opposite legacy row order are recorded
// in presentation/evidence/smartsoft-initial-grid-source.json.
const definitions = {
  multihot100_native: {columns:5,rows:4,bottomFirst:false,defaults:[3,2,6,4,4,2,4,5,1,1,3,4,7,2,4,3,4,7,2,4],sourceSha256:"ce9fb4f61c3aed4c19316b225510a64708c29f5fe241ead9873c7955e0d4fded"},
  multihotwildways_native: {columns:3,rows:3,bottomFirst:false,defaults:[4,6,5,0,8,1,3,2,7],sourceSha256:"b97fd3c94c76442bcf84a30fb034c687e4422a843195deff77ce64256f0dd480"},
  multihot5wild_native: {columns:3,rows:3,bottomFirst:false,defaults:[4,6,5,0,8,1,3,2,7],sourceSha256:"a2cd5d4e0e602189901f89f4dfa760d19528d4c0e8af0e22527164b522bd0cb8"},
  multihot5superwilds_native: {columns:5,rows:3,bottomFirst:false,defaults:[3,8,6,4,4,2,4,5,1,1,3,4,7,8,4],sourceSha256:"48ec0b7098e1fd610e2d6ca977a5778f951ded78be94635eab0d6c7622e7fa2c"},
  multihotdeluxe_native: {columns:3,rows:3,bottomFirst:false,defaults:[4,6,5,0,8,1,3,2,7],sourceSha256:"4182df0abf055500f28ce2584a88842392409e247ddd8f3aefb4891d4eced018"},
  habeshafortune5_native: {columns:3,rows:3,bottomFirst:false,defaults:[4,6,5,0,8,1,3,2,7],sourceSha256:"2b0302f735401dcbd44b3c5b2f31d58f8c693ec01e4d0dc8b3a63855e56defd4"},
  burningice_native: {columns:5,rows:3,bottomFirst:true,defaults:[4,11,5,0,9,0,3,8,7,9,10,6,1,3,2],sourceSha256:"a250e41a8a196a53f8f919d37a158d7a2e295f07de7ffa93caa0dba9a32dfa34"},
  burningice10_native: {columns:5,rows:3,bottomFirst:true,defaults:[4,11,5,0,9,0,3,8,7,9,10,6,1,3,2],sourceSha256:"a250e41a8a196a53f8f919d37a158d7a2e295f07de7ffa93caa0dba9a32dfa34"},
  burningice40_native: {columns:5,rows:4,bottomFirst:true,defaults:[4,2,5,0,9,0,3,8,7,9,3,6,1,3,2,3,5,4,8,6],sourceSha256:"2430578885f95dcc1f4df546866953669d7118588b019c5d1ae38964f237c85b"},
};
for (const value of Object.values(definitions)) {Object.freeze(value.defaults);Object.freeze(value);}
Object.freeze(definitions);
export const SMARTSOFT_INITIAL_GRID_IDS = Object.freeze(Object.keys(definitions));
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Called only on the existing host's validated no-round display snapshot.
 * noRoundConfirmed must be derived from an explicit null in the original
 * authenticated state, before a host normalizes missing receipt fields.
 * A missing or malformed grid/receipt is never an invitation to invent a result.
 * Returns a separate, immutable presentation description; neither argument is
 * changed, and no financial, feature, win, balance or motion state is returned.
 */
export function smartSoftInitialPreview(manifest, snapshot) {
  if (!plain(manifest) || !plain(snapshot) || !Object.hasOwn(definitions, manifest.id)) return null;
  if (snapshot.confirmed !== true || snapshot.noRoundConfirmed !== true || snapshot.authenticated !== true ||
      typeof snapshot.sessionId !== 'string' || !snapshot.sessionId ||
      snapshot.round !== null || snapshot.grid !== null || snapshot.frameIndex !== null || snapshot.pending !== false) return null;
  if (snapshot.connected !== undefined && snapshot.connected !== true) return null;
  for (const field of ['busy', 'confirming', 'recoveryBlocked', 'error']) {
    if (snapshot[field] !== undefined && snapshot[field] !== false) return null;
  }
  if (!Array.isArray(snapshot.wins) || snapshot.wins.length ||
      snapshot.feature != null || snapshot.multiplier != null || snapshot.phase != null) return null;
  const source = definitions[manifest.id];
  if (manifest.grid?.columns !== source.columns || manifest.grid?.rows !== source.rows ||
      !plain(manifest.symbols) || !plain(manifest.frames)) return null;
  const grid = Array.from({length: source.columns}, (_, column) => Object.freeze(
    Array.from({length: source.rows}, (_, row) => String(source.defaults[
      (source.bottomFirst ? source.rows - row - 1 : row) * source.columns + column
    ]))
  ));
  for (const symbolId of grid.flat()) {
    const frame = manifest.symbols[symbolId]?.frame;
    if (typeof frame !== 'string' || !Object.hasOwn(manifest.frames, frame)) return null;
  }
  return Object.freeze({
    kind: 'source-initial-preview', gameId: manifest.id, financialActions: false,
    grid: Object.freeze(grid), sourceSha256: source.sourceSha256,
  });
}

// The public Habesha multiplier strip initially draws indices [1,5,3] at
// descending y coordinates (470,300,130), hence physical top-to-bottom [3,5,1].
// Keep this decoration separate from nativeVisual.feature and every receipt.
export function decorateSmartSoftInitialScene(scene, manifest) {
  if (!['habeshafortune5_native','multihotdeluxe_native'].includes(manifest?.id) || scene?.gameId !== manifest.id ||
      scene.initialPreview?.kind !== 'source-initial-preview' ||
      scene.initialPreview.gameId !== manifest.id ||
      scene.initialPreview.sourceSha256 !== definitions[manifest.id]?.sourceSha256 ||
      scene.nativeVisual?.roundId !== null || scene.nativeVisual?.feature !== null ||
      scene.nativeVisual?.pending !== false || !Array.isArray(scene.commands)) return scene;
  const target = scene.multiplierGeometry, feature = manifest.featurePresentation;
  const background = manifest.frames?.[feature?.backgroundFrame];
  if (!target || !background || feature.type !== 'vertical-multipliers') return scene;
  const values = [3,5,1], centers = feature.rowCenters || [1/6,.5,5/6];
  const frames = values.map((value,row) => row === 1 && feature.activeValueFrames?.[value] || feature.valueFrames?.[value]);
  if (frames.some(frame => !manifest.frames[frame])) return scene;
  const scale = target.height / background.height * (feature.numberScale || 1);
  const decorations = frames.map((frame,row) => {
    const size = manifest.frames[frame].original, width = size.width * scale, height = size.height * scale;
    return {type:'sprite',frame,box:{x:target.x+(target.width-width)/2,y:target.y+target.height*centers[row]-height/2,width,height},
      padding:true,role:'multiplier-value',value:values[row],selected:row===1,opacity:row===1?1:.4,valueSource:'decorative-initial'};
  });
  const commands = scene.commands.filter(command => command.role !== 'empty-multiplier' && command.valueSource !== 'decorative-initial');
  const border = commands.findIndex(command => command.role === 'multiplier-selected-border');
  commands.splice(border < 0 ? commands.length : border,0,...decorations);
  return {...scene,commands};
}
