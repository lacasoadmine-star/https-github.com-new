// Explicit public rule corrections. The provider's private probabilities were not published.
export const ENGINE_VERSION = 'superwin-slot-runtime-r13';
export const MATH_VERSIONS = {
  foxy_hot_20_native: '2026-11-07-foxy-native-v1',
  multi_hot_5_native: '2026-11-07-mh5-native-v1',
};

export function applyVerifiedDefinitions(decoded, rules, versions) {
  const foxy = decoded.games.hot_foxy_20, multi = decoded.games.multi_hot_5_video;
  decoded.lines.foxy_r13 = rules.foxyHot20.paths;
  decoded.lines.mh5_r13 = rules.multiHot5.paths;
  decoded.games.foxy_hot_20_native = {
    ...foxy, id: 'foxy_hot_20_native', name: 'Foxy Hot 20', lineSet: 'foxy_r13', mathVersion: versions.foxy_hot_20_native, maxWinMultiplier: rules.foxyHot20.maxWinMultiplier,
    // Retain the existing non-scatter symbols' order and multiplicities. Do not guess provider strips.
    reelStrips: foxy.reelStrips.map(strip => strip.filter(symbol => symbol !== 'scatter')),
    features: { ...foxy.features,
      freeSpins: { trigger: 100, spins: 0, retrigger: false, winMultiplier: 1 },
      gambleRounds: rules.foxyHot20.gambleMaxAttempts,
      gambleMaxStake: rules.foxyHot20.gambleMaxStake,
    },
    ...(rules.foxyHot20.betLevels ? { betLevels: rules.foxyHot20.betLevels } : {}),
  };
  decoded.games.multi_hot_5_native = {
    ...multi, id: 'multi_hot_5_native', name: 'Multi Hot 5', lineSet: 'mh5_r13', mathVersion: versions.multi_hot_5_native, maxWinMultiplier: rules.multiHot5.maxWinMultiplier,
    features: { ...multi.features, gambleRounds: rules.multiHot5.gambleMaxAttempts ?? multi.features.gambleRounds, gambleMaxStake: rules.multiHot5.gambleMaxStake },
    ...(rules.multiHot5.betLevels ? { betLevels: rules.multiHot5.betLevels } : {}),
  };
}
