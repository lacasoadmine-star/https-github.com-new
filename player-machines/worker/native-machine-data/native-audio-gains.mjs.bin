// Native presentation coefficients verified from the public demo runtime.
// Shared audio modules retain their exact Worker308 bytes and legacy metadata.
// See evidence/r13/native-audio-mix.json for the source and live graph proof.
const mh5Wins = new Set(['win', 'win-medium', 'big-win']);

export function nativeBackgroundGain(gameId, sharedGain) {
 return gameId === 'multi_hot_5_video' ? .3 : sharedGain;
}

export function nativeEffectGain(gameId, event, sharedGain) {
 return gameId === 'multi_hot_5_video' && mh5Wins.has(event) ? .6 : sharedGain;
}
