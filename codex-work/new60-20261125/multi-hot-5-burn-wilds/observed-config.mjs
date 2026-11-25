/**
 * Fresh facts observed in the official DMO on 2026-11-25.
 * This is a deterministic reference quote configuration, not an outcome model.
 * No reel strips, symbol weights, RNG distribution or licensed media are included.
 */

function immutable(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(immutable);
    Object.freeze(value);
  }
  return value;
}

export const OBSERVED_CONFIG = immutable({
  gameId: 'new60-multi-hot-5-burn-wilds',
  name: 'Multi Hot 5 Burn Wilds',
  provider: 'SmartSoft Gaming',
  observedOn: '2026-11-25',
  demoVersion: 'v1.0.1',
  sourcePage: 'https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds',
  currency: 'DMO',
  minorUnitsPerUnit: 100,
  referenceBetMinorUnits: 10,
  observedBetMinorUnits: [10, 20],
  columns: 5,
  rows: 3,
  // Coordinates are column-major; each line supplies one zero-based row per reel.
  paylines: [
    { id: 1, rows: [1, 1, 1, 1, 1] },
    { id: 2, rows: [0, 0, 0, 0, 0] },
    { id: 3, rows: [2, 2, 2, 2, 2] },
    { id: 4, rows: [0, 1, 2, 1, 0] },
    { id: 5, rows: [2, 1, 0, 1, 2] },
  ],
  // Exact displayed DMO cents for ONE line at the observed 0.10 DMO total bet.
  // 0.20 DMO was separately observed to double every displayed amount.
  paytableMinorUnits: {
    seven: { 2: 5, 3: 40, 4: 100, 5: 1000 },
    grapes: { 3: 20, 4: 40, 5: 200 },
    watermelon: { 3: 20, 4: 40, 5: 200 },
    bell: { 3: 10, 4: 20, 5: 100 },
    lemon: { 3: 5, 4: 10, 5: 50 },
    plum: { 3: 5, 4: 10, 5: 50 },
    orange: { 3: 5, 4: 10, 5: 50 },
    cherry: { 3: 5, 4: 10, 5: 50 },
  },
  wildSymbol: 'wild',
  wildReelIndices: [1, 2, 3],
  winningMultipliers: [1, 2, 3, 4, 5],
  providerDisplays: {
    minimumBetDMO: '0.10',
    maximumBetDMO: '200.00',
    maximumWinMultiplier: 1300,
    reportedRtpPercent: '96.55',
  },
  backend: {
    purpose: 'deterministic-reference-quotes',
    walletWritesEnabled: false,
    outcomeGenerationEnabled: false,
    productionEnabled: false,
  },
  unresolved: [
    'Aggregation of concurrent winning paylines requires a fresh confirming result.',
    'The input must contain the final authoritative expanded grid; expansion order is not implemented.',
    'Symbol distributions, reel strips and multiplier probabilities are not supplied.',
    'Only the two observed bet amounts are accepted by the quote function.',
    'Reported RTP and maximum win are provider claims, not independently certified properties of this code.',
  ],
});

export const SYMBOL_IDS = Object.freeze([
  ...Object.keys(OBSERVED_CONFIG.paytableMinorUnits),
  OBSERVED_CONFIG.wildSymbol,
]);
