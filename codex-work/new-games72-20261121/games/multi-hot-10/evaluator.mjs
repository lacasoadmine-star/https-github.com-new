/**
 * Multi Hot 10: confirmed line candidates and exact paytable quotes only.
 *
 * Sole game-specific source: the fresh official MultiHot10 capture identified
 * in specification.json/evidence-index.json. No legacy game code or assets.
 *
 * This is deliberately NOT a round settlement evaluator. The official wording
 * does not resolve aggregation across lines, and no probability/legality model
 * is available. Every result retains aggregatePayoutMinor:null and/or
 * settlementEligible:false. No RNG, network, wallet or animation is present.
 */

export const GAME_ID = 'zplay72_multi_hot_10_v1';
export const ANCHOR_DISPLAYED_BET_MINOR = 10;

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

// Numbered lines transcribed from the current official paylines.jpg.
// Each entry is the row selected on reels 0..4; rows are top=0, middle=1,
// bottom=2. These are ten distinct lines, not aliases of straight rows.
export const PAYLINES = freeze([
  { id: 1, rows: [0, 0, 0, 0, 0] },
  { id: 2, rows: [1, 1, 1, 1, 1] },
  { id: 3, rows: [2, 2, 2, 2, 2] },
  { id: 4, rows: [0, 1, 2, 1, 0] },
  { id: 5, rows: [2, 1, 0, 1, 2] },
  { id: 6, rows: [0, 0, 1, 2, 2] },
  { id: 7, rows: [2, 2, 1, 0, 0] },
  { id: 8, rows: [1, 0, 0, 0, 1] },
  { id: 9, rows: [1, 2, 2, 2, 1] },
  { id: 10, rows: [0, 1, 1, 1, 0] },
]);

// Amounts in two-decimal minor units at the displayed 0.10 DMO table.
// The independently captured 0.20 DMO table doubles every amount.
// Keys are symbol identities, not replacement sprites or mixed-symbol wilds.
export const TABLE_MINOR_AT_ANCHOR = freeze({
  seven: { 3: 50, 4: 200, 5: 1000 },
  bell: { 3: 20, 4: 100, 5: 200 },
  grapes: { 3: 10, 4: 50, 5: 100 },
  watermelon: { 3: 10, 4: 50, 5: 100 },
  lemon: { 3: 5, 4: 10, 5: 50 },
  plum: { 3: 5, 4: 10, 5: 50 },
  orange: { 3: 5, 4: 10, 5: 50 },
  cherry: { 3: 5, 4: 10, 5: 50 },
});

export const SYMBOLS = freeze(Object.keys(TABLE_MINOR_AT_ANCHOR));

export class EvidenceBoundError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'EvidenceBoundError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new EvidenceBoundError(code, message);
}

function record(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('INVALID_INPUT', `${name} must be an object.`);
  }
}

function bet(value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail('INVALID_BET_MINOR', 'totalBetMinor must be a positive safe integer.');
  }
  return BigInt(value);
}

function multiplier(value) {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    fail('UNVERIFIED_MULTIPLIER', 'Only documented integer multipliers 1..5 are supported.');
  }
  return BigInt(value);
}

function symbol(value) {
  if (typeof value !== 'string' || !Object.hasOwn(TABLE_MINOR_AT_ANCHOR, value)) {
    fail('UNVERIFIED_SYMBOL', 'Symbol is outside the freshly verified paytable.');
  }
}

function gcd(a, b) {
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function fraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  const n = numerator / divisor;
  const d = denominator / divisor;
  if (n > BigInt(Number.MAX_SAFE_INTEGER) * d) {
    fail('PAYOUT_OVERFLOW', 'Quoted amount exceeds the safe integer monetary range.');
  }
  return freeze({
    numerator: n.toString(),
    denominator: d.toString(),
    exactMinor: d === 1n ? Number(n) : null,
  });
}

/**
 * Quote one documented symbol/count entry at a supplied displayed total bet.
 * Generic minor units are used for arithmetic; provider DMO limits are not
 * silently enforced as ETB policy. Fractions are retained, never rounded.
 * Input must be JSON-safe integer numbers; unsafe numbers, coercions and
 * floating currency values are rejected before BigInt conversion.
 */
export function quoteSymbolWin(input) {
  record(input, 'input');
  const { symbol: symbolId, matchCount, totalBetMinor, multiplier: x = 1 } = input;
  symbol(symbolId);
  if (!Number.isInteger(matchCount) || matchCount < 3 || matchCount > 5) {
    fail('UNVERIFIED_MATCH_COUNT', 'Only documented match counts 3, 4 and 5 can be quoted.');
  }
  const stake = bet(totalBetMinor);
  const factor = multiplier(x);
  const anchorAmount = TABLE_MINOR_AT_ANCHOR[symbolId][matchCount];
  const numerator = BigInt(anchorAmount) * stake;
  const base = fraction(numerator, BigInt(ANCHOR_DISPLAYED_BET_MINOR));
  const multiplied = fraction(numerator * factor, BigInt(ANCHOR_DISPLAYED_BET_MINOR));
  return freeze({
    gameId: GAME_ID,
    symbol: symbolId,
    matchCount,
    totalBetMinor,
    multiplier: x,
    anchorDisplayedBetMinor: ANCHOR_DISPLAYED_BET_MINOR,
    anchorAmountMinor: anchorAmount,
    base,
    multiplied,
    requiresRoundingPolicy: base.denominator !== '1' || multiplied.denominator !== '1',
    roundingApplied: false,
    settlementEligible: false,
  });
}

function verifiedGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== 3) {
    fail('INVALID_GRID', 'Expected three row arrays, each containing five symbols.');
  }
  const copy = [];
  for (let row = 0; row < 3; row += 1) {
    if (!Array.isArray(grid[row]) || grid[row].length !== 5) {
      fail('INVALID_GRID', 'Expected row-major 3x5 data; reel-major 5x3 is not accepted.');
    }
    const cells = [];
    for (let reel = 0; reel < 5; reel += 1) {
      symbol(grid[row][reel]); // Also rejects sparse cells and undefined values.
      cells.push(grid[row][reel]);
    }
    copy.push(cells);
  }
  return freeze(copy);
}

/**
 * Deterministic candidate evaluation, not a legal-outcome generator or round
 * payout. Each line uses only an identical adjacent prefix from reel zero.
 * The longest prefix selects one table entry; shorter prefixes are not added.
 * Multiple candidates remain separate because aggregation is unresolved.
 */
export function evaluateLineCandidates(input) {
  record(input, 'input');
  const { totalBetMinor, multiplier: x = 1 } = input;
  bet(totalBetMinor);
  multiplier(x);
  const grid = verifiedGrid(input.grid);
  const candidates = [];
  for (const line of PAYLINES) {
    const first = grid[line.rows[0]][0];
    let count = 1;
    while (count < 5 && grid[line.rows[count]][count] === first) count += 1;
    if (count < 3) continue;
    candidates.push({
      lineId: line.id,
      rows: [...line.rows],
      symbol: first,
      matchCount: count,
      winningCells: line.rows.slice(0, count).map((row, reel) => ({ row, reel })),
      quote: quoteSymbolWin({ symbol: first, matchCount: count, totalBetMinor, multiplier: x }),
    });
  }
  return freeze({
    gameId: GAME_ID,
    grid,
    totalBetMinor,
    multiplier: x,
    linesEvaluated: 10,
    candidates,
    candidateCount: candidates.length,
    aggregatePolicy: 'UNRESOLVED',
    aggregatePayoutMinor: null,
    settlementEligible: false,
    outcomeLegalityVerified: false,
    rngUsed: false,
    openRuleGaps: ['M10-AGGREGATION-001', 'M10-OUTCOME-002', 'M10-MAXIMUM-003'],
  });
}
