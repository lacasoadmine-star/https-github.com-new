// Both inputs are frozen, independently hashed cores. No historical record is rewritten.
export function createVersionedCore(legacy, revised) {
  const targets = new Set(['hot_foxy_20', 'multi_hot_5_video']);
  const coreFor = (id, options = {}) => targets.has(id) && !options.legacy ? revised : legacy;
  const identity = (id, options = {}) => {
    const core = coreFor(id, options), game = core.getGame(id);
    return { mathVersion: game.mathVersion || core.MATH.mathVersion, engineVersion: core.ENGINE_VERSION, mathSha256: core.mathSha256 };
  };
  const same = (receipt, expected) => receipt && ['mathVersion', 'engineVersion', 'mathSha256'].every(key => receipt[key] === expected[key]);
  return {
    // The old global identity stays available for non-target games and historical receipts.
    MATH: legacy.MATH, mathSha256: legacy.mathSha256,
    toUnits: legacy.toUnits, fromUnits: legacy.fromUnits,
    gambleDraw: legacy.gambleDraw, bonusRewards: legacy.bonusRewards,
    modelIdentity: identity,
    getGame: (id, options = {}) => coreFor(id, options).getGame(id),
    receiptGame(id, receipt) {
      if (!targets.has(id)) return legacy.getGame(id);
      if (receipt?.gameId !== id) return null;
      if (same(receipt, identity(id))) return revised.getGame(id);
      if (same(receipt, identity(id, { legacy: true }))) return legacy.getGame(id);
      return null;
    },
    spin(id, bet, options = {}) {
      // Earned legacy Foxy free spins retain their original full rules, including retriggers.
      const legacyFeature = targets.has(id) && options.isFree === true;
      return coreFor(id, { legacy: legacyFeature }).spin(id, bet, options);
    },
    publicGames() {
      const current = new Map(revised.publicGames().map(game => [game.id, game]));
      return legacy.publicGames().map(game => targets.has(game.id) ? { ...current.get(game.id), mathSha256: revised.mathSha256 } : game);
    },
  };
}
