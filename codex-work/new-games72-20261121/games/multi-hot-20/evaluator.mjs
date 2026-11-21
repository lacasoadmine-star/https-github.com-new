/**
 * Multi Hot 20: a bounded reader of candidate lines, not a round settlement engine.
 *
 * Independent transcription of the CURRENT official MultiHot20 demo, captured
 * 2026-11-21 UTC. The source images and disagreements are bound in specification.json.
 * No earlier game implementation, artwork, RNG, weights, or probability model is used.
 * The initial inconsistent paytable paint is explicitly NOT the numeric source.
 */

const GAME_ID = 'zplay72_multi_hot_20_v1';
const REFERENCE_BET_MINOR = 20n;
const MAX_MINOR = BigInt(Number.MAX_SAFE_INTEGER);

// Exact displayed DMO amounts at total bet 0.20 after the preview + / - refresh.
// Entries are for 3, 4, and 5 identical adjacent symbols, respectively.
const DISPLAYED_MINOR = Object.freeze({
  seven: Object.freeze([50, 400, 2000]),
  bell: Object.freeze([20, 100, 200]),
  grapes: Object.freeze([10, 50, 100]),
  watermelon: Object.freeze([10, 50, 100]),
  lemon: Object.freeze([5, 10, 50]),
  plum: Object.freeze([5, 10, 50]),
  orange: Object.freeze([5, 10, 50]),
  cherry: Object.freeze([5, 10, 50]),
});

// Read directly from rules-lower-current.jpg. Row 0 is the top visible row.
// The current marketing page instead says 100 fixed lines; this conflict remains open.
const DEMO_CHART = Object.freeze([
  [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 0, 0, 0, 1],
  [2, 2, 2, 2, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2], [1, 2, 1, 2, 1],
].map((path) => Object.freeze(path)));

function integerInRange(value, label, minimum, maximum) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new TypeError(`${label} must be a safe integer number`);
  }
  if (value < minimum || value > maximum) {
    throw new RangeError(`${label} is outside its supported range`);
  }
  return value;
}

function requireSymbol(symbol) {
  if (typeof symbol !== 'string' || !Object.hasOwn(DISPLAYED_MINOR, symbol)) {
    throw new TypeError('symbol is not one of the eight observed Multi Hot 20 symbols');
  }
}

function requireRequest(request) {
  if (request === null || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('request must be an object');
  }
}

function betAndMultiplier(request) {
  // The DMO demo's limits are NOT operator ETB limits. This helper only bounds
  // integer representation; it cannot approve a wager or choose a currency policy.
  const totalBetMinor = integerInRange(request.totalBetMinor, 'totalBetMinor', 1, Number.MAX_SAFE_INTEGER);
  const multiplier = integerInRange(request.multiplier, 'multiplier', 1, 5);
  return { totalBetMinor, multiplier };
}

function exactAmount(numerator, denominator) {
  if (numerator > MAX_MINOR * denominator) {
    throw new RangeError('candidate amount exceeds safe minor-unit representation');
  }
  let a = numerator;
  let b = denominator;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  const reducedNumerator = numerator / a;
  const reducedDenominator = denominator / a;
  return {
    numerator: reducedNumerator.toString(),
    denominator: reducedDenominator.toString(),
    exactMinor: reducedDenominator === 1n ? Number(reducedNumerator) : null,
    roundingApplied: false,
  };
}

/** Quote one observed symbol/count using a reference-bound ratio, with no rounding. */
export function quoteObservedLine(request) {
  requireRequest(request);
  const { symbol, matchedReels } = request;
  requireSymbol(symbol);
  integerInRange(matchedReels, 'matchedReels', 3, 5);
  const { totalBetMinor, multiplier } = betAndMultiplier(request);
  const sourceAmount = DISPLAYED_MINOR[symbol][matchedReels - 3];
  const scaledNumerator = BigInt(sourceAmount) * BigInt(totalBetMinor);
  return {
    gameId: GAME_ID,
    symbol,
    matchedReels,
    totalBetMinor,
    multiplier,
    reference: { totalBetMinor: 20, displayedAmountMinor: sourceAmount, source: 'REFRESHED_0_20_DMO_TABLE' },
    beforeMultiplier: exactAmount(scaledNumerator, REFERENCE_BET_MINOR),
    afterMultiplier: exactAmount(scaledNumerator * BigInt(multiplier), REFERENCE_BET_MINOR),
    settlementEligible: false,
  };
}

function requireWindow(rows) {
  if (!Array.isArray(rows) || rows.length !== 3) {
    throw new TypeError('rows must contain exactly three rows');
  }
  for (let row = 0; row < 3; row += 1) {
    if (!Array.isArray(rows[row]) || rows[row].length !== 5) {
      throw new TypeError('each row must contain exactly five symbols');
    }
    for (let reel = 0; reel < 5; reel += 1) requireSymbol(rows[row][reel]);
  }
}

/**
 * Inspect an externally supplied window. It is NOT certified as a legal outcome.
 * Return longest adjacent prefixes on the documented 20-line demo chart. Whether
 * to pay one global highest line or highest wins per line is unresolved, so this
 * function deliberately returns neither a sum nor a selected settlement amount.
 */
export function inspectCandidateLines(request) {
  requireRequest(request);
  const { rows } = request;
  requireWindow(rows);
  const { totalBetMinor, multiplier } = betAndMultiplier(request);
  const candidates = [];
  for (let index = 0; index < DEMO_CHART.length; index += 1) {
    const path = DEMO_CHART[index];
    const symbol = rows[path[0]][0];
    let matchedReels = 1;
    while (matchedReels < 5 && rows[path[matchedReels]][matchedReels] === symbol) {
      matchedReels += 1;
    }
    if (matchedReels >= 3) {
      candidates.push({
        line: index + 1,
        rows: [...path],
        ...quoteObservedLine({ symbol, matchedReels, totalBetMinor, multiplier }),
      });
    }
  }
  return {
    gameId: GAME_ID,
    chartSource: 'CURRENT_DEMO_20_LINE_CHART',
    lineCount: 20,
    candidates,
    aggregatePayoutMinor: null,
    aggregationPolicy: 'UNRESOLVED',
    settlementEligible: false,
    legalOutcomeVerified: false,
    randomOutcomeGenerated: false,
    unresolved: ['HIGHEST_PAYLINE_AGGREGATION', 'DEMO_20_VERSUS_MARKETING_100_LINES', 'OUTCOME_DISTRIBUTION', 'ROUNDING_POLICY'],
  };
}
