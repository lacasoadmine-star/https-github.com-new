// The eleven existing machines keep their exact core. Two new IDs select the additive core.
export function createVersionedCore(legacy, revised) {
  const targets = new Set(['foxy_hot_20_native', 'multi_hot_5_native']);
  const coreFor = id => targets.has(id) ? revised : legacy;
  const identity = id => {
    const core = coreFor(id), game = core.getGame(id);
    return { mathVersion: game.mathVersion || core.MATH.mathVersion, engineVersion: core.ENGINE_VERSION, mathSha256: core.mathSha256 };
  };
  const same = (receipt, expected) => receipt && ['mathVersion', 'engineVersion', 'mathSha256'].every(key => receipt[key] === expected[key]);
  const games = Object.freeze({ ...legacy.MATH.games, ...Object.fromEntries([...targets].map(id => [id, revised.getGame(id)])) });
  const lines = Object.freeze({ ...legacy.MATH.lines, ...Object.fromEntries([...targets].map(id => { const key = revised.getGame(id).lineSet; return [key, revised.MATH.lines[key]]; })) });
  return {
    // Combined allowlist only: legacy settlement still closes over the unmodified original MATH.
    MATH: Object.freeze({ ...legacy.MATH, games, lines }), mathSha256: legacy.mathSha256,
    toUnits: legacy.toUnits, fromUnits: legacy.fromUnits,
    gambleDraw: legacy.gambleDraw, bonusRewards: legacy.bonusRewards,
    modelIdentity: identity,
    getGame: id => coreFor(id).getGame(id),
    receiptGame(id, receipt) {
      if (!targets.has(id)) return legacy.getGame(id);
      if (receipt?.gameId !== id || !same(receipt, identity(id))) return null;
      return revised.getGame(id);
    },
    spin: (id, bet, options = {}) => coreFor(id).spin(id, bet, options),
    publicGames() {
      return [...legacy.publicGames(), ...revised.publicGames().filter(game => targets.has(game.id)).map(game => ({ ...game, mathSha256: revised.mathSha256 }))];
    },
  };
}
