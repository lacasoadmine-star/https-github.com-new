/** ZPLAY-owned distribution. This is not SmartSoft's hidden RNG/reel strips.
 * There is no release, wallet, account or endpoint side effect on import.
 * Full line awards come from the freshly observed own game's deterministic
 * paytable. The independent-cell distribution below is an operator model.
 */
import { randomBytes as cryptoRandomBytes, createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { GAME_ID, SYMBOLS, PAYLINES, PAY_RATIOS, quoteGrid } from '../rules.mjs';

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const MAX_STAKE = MAX_SAFE / 1000n;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MONEY = /^(0|[1-9]\d{0,12})\.\d{2}$/;
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const fail = code => { throw new Error('SUPERWILDS_OWN_MODEL_' + code); };
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
const fraction = (n, d) => { const k = gcd(n, d); return { numerator: String(n / k), denominator: String(d / k) }; };

export const MODEL_SPEC = freeze({
  schema: 'zplay/superwilds-own-distribution/v1',
  gameId: GAME_ID,
  owner: 'ZPLAY',
  engineVersion: 'zplay-superwilds-engine-1',
  mathVersion: 'zplay-superwilds-own-9651-1',
  providerProbabilityModel: false,
  providerRtpReproduced: false,
  symbols: [...SYMBOLS],
  paylines: PAYLINES.map(line => [...line]),
  payRatioNumeratorsOverTwo: structuredClone(PAY_RATIOS),
  independentCellWeights: Object.fromEntries(SYMBOLS.map(symbol => [symbol, 1])),
  wheelValues: [1, 2, 3, 4, 5],
  wheelWeights: [1, 1, 1, 1, 1],
  targetRtp: { numerator: '9651', denominator: '10000' },
  baseDistributionWeight: { numerator: '189960633', denominator: '475450000' },
  remainderDistribution: 'Fresh zero-win grid: column1 has three uniform non-WILD symbols; column2 uniformly excludes all column1 symbols and WILD; columns3–5 are uniform independent symbols',
  mixtureChoice: 'Independent of grid, wheel, player, session, bet and preceding rounds',
  entropy: 'Server cryptographic random bytes; masked rejection sampling with no modulo bias',
  entropyRejectionLimit: 128,
  stakePolicy: 'Explicit host-supplied ladder; every stake is a positive even number of ETB minor units',
  fractionalMinorRounding: 'No rounding: odd-minor stakes are rejected before sampling',
  maximumWinTimesStake: 1000,
  maximumStakeMinor: String(MAX_STAKE),
});

export const MODEL_IDENTITY = freeze({
  engineVersion: MODEL_SPEC.engineVersion,
  mathVersion: MODEL_SPEC.mathVersion,
  mathSha256: createHash('sha256').update(JSON.stringify(MODEL_SPEC)).digest('hex'),
});

/** Uniform integer in [0,bound), including non-power-of-two denominators.
 * Injected byte providers are for disposable tests. Production defaults to
 * node:crypto and does not accept browser entropy, seeds or outcome input.
 */
export function createUnbiasedInteger({ randomBytes = cryptoRandomBytes } = {}) {
  if (typeof randomBytes !== 'function') fail('ENTROPY_REQUIRED');
  return bound => {
    if (typeof bound !== 'bigint' || bound < 1n || bound > (1n << 256n)) fail('ENTROPY_BOUND_INVALID');
    if (bound === 1n) return 0n;
    const bits = (bound - 1n).toString(2).length, length = Math.ceil(bits / 8);
    const mask = (1 << (bits % 8 || 8)) - 1;
    for (let attempt = 0; attempt < MODEL_SPEC.entropyRejectionLimit; attempt++) {
      const bytes = randomBytes(length);
      if (!(bytes instanceof Uint8Array) || bytes.byteLength !== length) fail('ENTROPY_BYTES_INVALID');
      let value = BigInt(bytes[0] & mask);
      for (let i = 1; i < bytes.length; i++) value = (value << 8n) | BigInt(bytes[i]);
      if (value < bound) return value;
    }
    // Abort the caller's one transaction; never map failed entropy to a loss.
    fail('ENTROPY_REJECTION_LIMIT');
  };
}

function lineNumerator(line) {
  let best = 0;
  for (const symbol of SYMBOLS) {
    let count = 0;
    for (const cell of line) {
      if (cell !== symbol && (symbol === 'wild' || cell !== 'wild')) break;
      count++;
    }
    if (count >= 3) best = Math.max(best, PAY_RATIOS[symbol][count]);
  }
  return BigInt(best);
}

let cachedAudit;
/** Exhaustive exact-rational audit of all 9^5 equally likely line values.
 * Overlapping lines need not be independent: expectation is additive.
 * Uniform wheel is independent and has expectation3. The zero-award branch
 * contributes exactly zero, so the mixture's return is exact, not Monte Carlo.
 */
export function auditOwnModel() {
  if (cachedAudit) return cachedAudit;
  let combinations = 0n, payoutNumeratorSum = 0n, maximumLineNumerator = 0n, positiveLineCombinations = 0n;
  const line = Array(5);
  const enumerate = index => {
    if (index === 5) {
      const award = lineNumerator(line); combinations++; payoutNumeratorSum += award;
      if (award > 0n) positiveLineCombinations++;
      if (award > maximumLineNumerator) maximumLineNumerator = award;
      return;
    }
    for (const symbol of SYMBOLS) { line[index] = symbol; enumerate(index + 1); }
  };
  enumerate(0);
  const baseNumerator = payoutNumeratorSum * BigInt(PAYLINES.length) * 3n;
  const baseDenominator = combinations * 2n;
  const mixtureNumerator = BigInt(MODEL_SPEC.baseDistributionWeight.numerator);
  const mixtureDenominator = BigInt(MODEL_SPEC.baseDistributionWeight.denominator);
  const numerator = baseNumerator * mixtureNumerator;
  const denominator = baseDenominator * mixtureDenominator;
  const targetN = BigInt(MODEL_SPEC.targetRtp.numerator), targetD = BigInt(MODEL_SPEC.targetRtp.denominator);
  if (combinations !== 59049n || payoutNumeratorSum !== 19018n || numerator * targetD !== denominator * targetN ||
      mixtureNumerator <= 0n || mixtureNumerator >= mixtureDenominator ||
      maximumLineNumerator * BigInt(PAYLINES.length) * 5n !== 2000n) fail('AUDIT_IDENTITY_MISMATCH');
  cachedAudit = freeze({
    schema: 'zplay/superwilds-own-model-audit/v1', ...MODEL_IDENTITY,
    provenance: 'ZPLAY-authored independent-cell distribution; no provider reel-strip/RNG claim',
    exactLineCombinations: String(combinations),
    summedLineAwardNumeratorsOverTwo: String(payoutNumeratorSum),
    positiveLineCombinations: String(positiveLineCombinations),
    baseZeroGridProbabilityLowerBound: fraction(combinations - positiveLineCombinations * BigInt(PAYLINES.length), combinations),
    baseRtp: fraction(baseNumerator, baseDenominator),
    baseDistributionWeight: fraction(mixtureNumerator, mixtureDenominator),
    ownExpectedRtp: fraction(numerator, denominator),
    ownExpectedRtpPercent: '96.51%',
    maximumWinTimesStake: 1000,
    support: 'All 9^15 symbol grids and all five wheel values have positive probability',
    termination: 'Zero-win construction needs no grid rejection; integer-entropy rejection failures abort with no fallback outcome',
    mathematicalLawScope: 'Exact RTP describes the defined game distribution; entropy/service errors are failed transactions, not losing rounds',
    rounding: 'All supplied stakes are even minor units; every half-stake paytable award is exact',
    productionEnabled: false, providerProbabilityModel: false,
  });
  return cachedAudit;
}

function requireStake(value) {
  if (typeof value !== 'bigint' || value < 2n || value % 2n || value > MAX_STAKE) fail('EXACT_STAKE_REQUIRED');
  return value;
}
function parseStake(value) {
  if (typeof value !== 'string' || !MONEY.test(value)) fail('BET_LADDER_REQUIRED');
  return requireStake(BigInt(value.replace('.', '')));
}
const columnGrid = rows => Array.from({ length: 5 }, (_, column) => rows.map(row => row[column]));
const rowGrid = columns => Array.from({ length: 3 }, (_, row) => columns.map(column => column[row]));
function settledOutcome(columns, stake, multiplier) {
  const quote = quoteGrid({ grid: columns, betMinor: Number(stake), multiplier });
  return { grid: rowGrid(columns), multiplier, totalWinMinor: BigInt(quote.winMinor),
    winLines: quote.winningLines.map(line => ({ ...line, rows: [...line.rows] })) };
}

/** Candidate mathematical model only. Host policy/lifecycle/release acceptance
 * remains separate; construction cannot approve or activate a cash game.
 */
export function createSuperWildsOwnModel({ betLevels, randomBytes = cryptoRandomBytes } = {}) {
  if (!Array.isArray(betLevels) || !betLevels.length || new Set(betLevels).size !== betLevels.length) fail('BET_LADDER_REQUIRED');
  const levels = [...betLevels], stakes = new Set(levels.map(value => String(parseStake(value))));
  const uniform = createUnbiasedInteger({ randomBytes });
  const audit = auditOwnModel();
  const contextStake = context => {
    if (!context || context.gameId !== GAME_ID || !UUID.test(context.roundId ?? '')) fail('CONTEXT_REQUIRED');
    const stake = requireStake(context.betMinor);
    if (!stakes.has(String(stake))) fail('BET_OUTSIDE_HOST_LADDER');
    return stake;
  };
  const sampleGrid = () => Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => SYMBOLS[Number(uniform(9n))]));
  const sampleZeroGrid = () => {
    const first = Array.from({ length: 3 }, () => SYMBOLS[Number(uniform(8n)) + 1]);
    const choices = SYMBOLS.filter(symbol => symbol !== 'wild' && !first.includes(symbol));
    const second = Array.from({ length: 3 }, () => choices[Number(uniform(BigInt(choices.length)))]);
    return [first, second, ...Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => SYMBOLS[Number(uniform(9n))]))];
  };
  return freeze({
    gameId: GAME_ID, ...MODEL_IDENTITY, approved: false,
    betLevels: levels,
    verification: {
      legalOutcomesVerified: true, outcomeDistributionVerified: true,
      aggregatePayoutVerified: true, roundingVerified: true,
      deferredLifecycleVerified: false, etbPolicyVerified: false,
    },
    audit,
    maximumPayoutMinor(stake) {
      requireStake(stake);
      if (!stakes.has(String(stake))) fail('BET_OUTSIDE_HOST_LADDER');
      return stake * 1000n;
    },
    sampleOutcome(context) {
      const stake = contextStake(context);
      const base = uniform(BigInt(MODEL_SPEC.baseDistributionWeight.denominator)) < BigInt(MODEL_SPEC.baseDistributionWeight.numerator);
      const grid = base ? sampleGrid() : sampleZeroGrid();
      const multiplier = Number(uniform(5n)) + 1;
      const result = settledOutcome(grid, stake, multiplier);
      if (!base && result.totalWinMinor !== 0n) fail('ZERO_GRID_CONSTRUCTION_FAILED');
      return freeze(result);
    },
    validateOutcome(value, context) {
      try {
        const stake = contextStake(context);
        if (!value || typeof value !== 'object' || Object.keys(value).sort().join('|') !== 'grid|multiplier|totalWinMinor|winLines' ||
            !Array.isArray(value.grid) || value.grid.length !== 3 || value.grid.some(row => !Array.isArray(row) || row.length !== 5) ||
            typeof value.totalWinMinor !== 'bigint') return false;
        const expected = settledOutcome(columnGrid(value.grid), stake, value.multiplier);
        return expected.totalWinMinor <= stake * 1000n && isDeepStrictEqual(expected, value);
      } catch { return false; }
    },
  });
}
