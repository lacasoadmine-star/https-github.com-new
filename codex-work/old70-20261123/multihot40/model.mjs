// Multi Hot 40 practice-only arithmetic. Coefficients come from the retained
// MH40 reference receipt audit. The independent sampler is not provider RNG.
const deepFreeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const fail = code => { throw new Error(code); };
const MAX_AMOUNT = 9007199254740991n;

export const MH40_MODEL = deepFreeze({
  gameId: 'multihot40_native',
  version: 'old70-multihot40-practice-v2',
  mode: 'PRACTICE',
  cashEnabled: false,
  reels: 5,
  rows: 4,
  paylines: 40,
  foundationBet: 1,
  symbolIds: [0, 1, 2, 3, 4, 5, 6, 7],
  coefficients: [[20, 200, 500], [15, 100, 200], [10, 50, 100], [10, 50, 100],
    [5, 10, 50], [5, 10, 50], [5, 10, 50], [5, 10, 50]],
  initialBalanceMinor: '1000000',
  betLevelsMinor: ['40', '80', '120', '160', '200', '400', '800', '2000', '4000', '8000', '20000'],
  minBetMinor: '40',
  maxBetMinor: '20000',
  stakeStepMinor: '40',
  stakeLimitsSource: 'explicit_practice_ladder_not_a_provider_limit_claim',
  probabilityModel: 'independent_uniform_cells_and_multiplier',
  providerProbabilityModelVerified: false,
  providerRtpVerified: false,
  gamblePracticeMaxRounds: 5,
  gambleProbabilityModel: 'independent_fair_color',
  providerGambleVerified: false,
  rtp: null,
  referenceSource: 'codex-work/native72-20261119/changes/batch01/server/multihot40-reference.mjs'
});

export function minorAmount(value, {positive = false} = {}) {
  const text = typeof value === 'bigint' ? String(value)
    : typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof text !== 'string' || !/^(0|[1-9]\d*)$/.test(text)) fail('MH40_INVALID_MINOR_AMOUNT');
  const amount = BigInt(text);
  if (amount > MAX_AMOUNT || positive && amount === 0n) fail('MH40_INVALID_MINOR_AMOUNT');
  return amount;
}

export function validateBetMinor(value) {
  const bet = minorAmount(value, {positive: true});
  if (bet % 40n !== 0n) fail('MH40_BET_DENOMINATION');
  if (!MH40_MODEL.betLevelsMinor.includes(String(bet))) fail('MH40_BET_NOT_ALLOWED');
  return bet;
}

export function validateLinePaths(paths) {
  if (!Array.isArray(paths) || paths.length !== 40) fail('MH40_40_EXPLICIT_LINES_REQUIRED');
  const seen = new Set();
  const copy = Array.from(paths, path => {
    if (!Array.isArray(path) || path.length !== 5 ||
        Array.from(path).some(row => !Number.isInteger(row) || row < 0 || row > 3)) fail('MH40_INVALID_LINE_PATH');
    const signature = path.join(',');
    if (seen.has(signature)) fail('MH40_DUPLICATE_LINE_PATH');
    seen.add(signature);
    return Object.freeze([...path]);
  });
  return Object.freeze(copy);
}

export function validateGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== 4 ||
      Array.from(grid).some(row => !Array.isArray(row) || row.length !== 5 ||
        Array.from(row).some(symbol => !Number.isInteger(symbol) || symbol < 0 || symbol > 7))) fail('MH40_INVALID_GRID');
  return grid.map(row => [...row]);
}

export function evaluateGrid({grid, betMinor, multiplier, linePaths}) {
  const paths = validateLinePaths(linePaths), board = validateGrid(grid);
  const bet = validateBetMinor(betMinor);
  if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 5) fail('MH40_INVALID_MULTIPLIER');
  const lineBet = bet / 40n;
  const wins = [];
  let base = 0n;
  for (const [index, path] of paths.entries()) {
    const symbol = board[path[0]][0];
    let count = 1;
    while (count < 5 && board[path[count]][count] === symbol) count++;
    if (count < 3) continue;
    const coefficient = MH40_MODEL.coefficients[symbol][count - 3];
    const lineWin = lineBet * BigInt(coefficient);
    base += lineWin;
    wins.push({line: index + 1, symbol, count, coefficient, baseWinMinor: String(lineWin),
      winMinor: String(lineWin * BigInt(multiplier)),
      positions: path.slice(0, count).map((row, column) => ({row, column}))});
  }
  const win = base * BigInt(multiplier);
  minorAmount(win);
  return {
    gameId: MH40_MODEL.gameId, modelVersion: MH40_MODEL.version, mode: 'PRACTICE', cashEnabled: false,
    grid: board, betMinor: String(bet), multiplier,
    baseWinMinor: String(base), winMinor: String(win), wins,
    probabilityModel: MH40_MODEL.probabilityModel, providerRtpVerified: false
  };
}

// Reject the incomplete high-end range instead of introducing modulo bias.
export function secureIndex(length, randomValues = values => globalThis.crypto.getRandomValues(values)) {
  if (!Number.isInteger(length) || length < 1 || length > 0x100000000 ||
      typeof randomValues !== 'function') fail('MH40_INVALID_RANDOM_SOURCE');
  const limit = 0x100000000 - (0x100000000 % length);
  const value = new Uint32Array(1);
  for (let attempt = 0; attempt < 128; attempt++) {
    randomValues(value);
    if (value[0] < limit) return value[0] % length;
  }
  fail('MH40_RANDOM_SOURCE_REJECTED');
}

export function sampleRound({betMinor, linePaths, randomValues}) {
  const paths = validateLinePaths(linePaths);
  validateBetMinor(betMinor);
  const grid = Array.from({length: 4}, () => Array.from({length: 5},
    () => secureIndex(8, randomValues)));
  const multiplier = secureIndex(5, randomValues) + 1;
  return evaluateGrid({grid, betMinor, multiplier, linePaths: paths});
}
