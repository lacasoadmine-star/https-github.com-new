import { randomInt } from 'node:crypto';

export const MATH_VERSION = 'independent-mine-island2-v1';
export const GAME_ID = 'ind74_mineisland2';
export const TARGET_RETURN_BPS = 9600;
const TABLES = Object.freeze({
  easy: Object.freeze([11000, 12000, 15000, 20000, 30000, 50000, 100000, 200000, 500000, 1000000]),
  medium: Object.freeze([12000, 15000, 20000, 30000, 50000, 100000, 200000, 500000, 1000000, 2500000]),
  hard: Object.freeze([15000, 20000, 30000, 50000, 100000, 200000, 500000, 1000000, 2500000, 5000000])
});

export const mineIslandDefinition = Object.freeze({
  id: GAME_ID, title: 'Mine Island2 — Independent', catalogName: 'Mine Island2',
  sourceCategory: 'Instant Games', family: 'ladder', mathVersion: MATH_VERSION,
  implementationStatus: 'math-tested-awaiting-end-to-end-verification',
  provenance: {
    catalog: 'Name and category from https://www.smartsoftgaming.com/games',
    observed: 'One public demo round: stake 0.10 DMO, first collected payout 0.11 DMO at 1.10x; island ladder, Play/Jump/Collect and help viewed.',
    designed: 'Original authored survival probabilities, medium/hard ladders, limits, and state transitions. No SmartSoft backend, source code, RNG, assets or certified RTP is reproduced.'
  },
  limits: { minBetMinor: '10', maxBetMinor: '100000', betStepMinor: '10', maxWinMinor: '50000000' },
  modes: ['easy', 'medium', 'hard'], defaultMode: 'easy', maxSteps: 10,
  nominalReturn: { numerator: '96', denominator: '100', explanation: 'Our original model returns exactly 96% in expectation at any listed collect step for permitted stakes. Integer payout division floors, but all permitted stakes and listed multipliers divide exactly in this version. This is not a SmartSoft RTP claim.' },
  rules: [
    'Set a stake in minor units and choose Easy, Medium or Hard before Play.',
    'Play debits the stake once. Each Jump attempts the next island; a failed jump ends the round with no payout.',
    'After a successful jump, Collect pays stake × current multiplier and ends the round.',
    'The first jump can fail. A successful first Easy jump pays 1.10×.',
    'Selected cell numbers are visual choices only; they do not alter outcome probabilities or multipliers.',
    'The tenth successful jump collects automatically. Integer payouts are rounded down to whole minor units.',
    'Future outcomes are held only in server round state. No client-supplied payout is accepted.'
  ],
  paytable: Object.entries(TABLES).map(([mode, ladder]) => ({
    mode, rows: ladder.map((multiplierBps, index) => ({
      label: 'Step ' + (index + 1), step: index + 1, multiplierBps,
      multiplier: (multiplierBps / 10000).toFixed(2) + '×',
      conditionalSurvival: { numerator: index === 0 ? TARGET_RETURN_BPS : ladder[index - 1], denominator: multiplierBps },
      cumulativeSurvival: { numerator: TARGET_RETURN_BPS, denominator: multiplierBps }
    }))
  }))
});

function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
export function secureRandomInt(boundExclusive) { return randomInt(boundExclusive); }
function sample(rng, bound) {
  const value = rng(bound);
  if (!Number.isSafeInteger(value) || value < 0 || value >= bound) fail('INVALID_RNG', 'RNG must return an integer in [0, bound).');
  return value;
}
function parseBet(value) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) fail('INVALID_BET', 'Bet must be a safe integer or canonical decimal string.');
    value = String(value);
  }
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) fail('INVALID_BET', 'Bet must be a canonical nonnegative decimal minor-unit string.');
  const bet = BigInt(value);
  if (bet < 10n || bet > 100000n || bet % 10n !== 0n) fail('INVALID_BET', 'Bet must be 10–100000 minor units in increments of 10.');
  return bet;
}
function checkedRound(round) {
  if (!round || round.gameId !== GAME_ID || round.mathVersion !== MATH_VERSION || !Object.hasOwn(TABLES, round.mode)) fail('INVALID_ROUND', 'Round identity or math version is invalid.');
  parseBet(round.betMinor);
  if (!Number.isInteger(round.step) || round.step < 0 || round.step > 10 ||
      !['active', 'lost', 'collected'].includes(round.status) ||
      !Array.isArray(round.history) || !Array.isArray(round.private?.survival) ||
      round.private.survival.length !== 10 || round.private.survival.some(x => typeof x !== 'boolean')) {
    fail('INVALID_ROUND', 'Malformed server round state.');
  }
  return round;
}
function requireActive(round) {
  checkedRound(round);
  if (round.status !== 'active') fail('ROUND_FINISHED', 'The round has already ended.');
}
function payout(betMinor, multiplierBps) { return (BigInt(betMinor) * BigInt(multiplierBps) / 10000n).toString(); }

export function startMineIslandRound({ betMinor, mode = 'easy', volatility, rng = secureRandomInt } = {}) {
  mode = volatility ?? mode;
  if (!Object.hasOwn(TABLES, mode)) fail('INVALID_MODE', 'Mode must be easy, medium or hard.');
  const bet = parseBet(betMinor);
  const ladder = TABLES[mode];
  const survival = ladder.map((multiplier, i) => sample(rng, multiplier) < (i === 0 ? TARGET_RETURN_BPS : ladder[i - 1]));
  return {
    gameId: GAME_ID, mathVersion: MATH_VERSION, mode, betMinor: bet.toString(),
    status: 'active', step: 0, multiplierBps: 0, winMinor: '0', history: [],
    private: { survival }
  };
}

export function advanceMineIslandRound(round, options = {}) {
  requireActive(round);
  if (round.step >= 10) fail('INVALID_ROUND', 'An active round cannot exceed its final step.');
  const requestedCell = typeof options === 'number' ? options : options.cell;
  const cell = requestedCell ?? round.history.length;
  if (!Number.isInteger(cell) || cell < 0 || cell >= 10 || round.history.some(item => item.cell === cell)) fail('INVALID_CELL', 'Choose an unused visual island from 0 through 9.');
  const nextStep = round.step + 1;
  const survived = round.private.survival[round.step];
  const multiplierBps = survived ? TABLES[round.mode][round.step] : 0;
  const history = [...round.history, { step: nextStep, cell, survived, multiplierBps }];
  const result = { ...round, history, private: { survival: [...round.private.survival] }, step: nextStep, multiplierBps, winMinor: '0' };
  if (!survived) return { ...result, status: 'lost' };
  if (nextStep === 10) return { ...result, status: 'collected', winMinor: payout(round.betMinor, multiplierBps) };
  return result;
}
export const revealMineIslandRound = advanceMineIslandRound;

export function collectMineIslandRound(round) {
  requireActive(round);
  if (round.step === 0) fail('NO_PROGRESS', 'Complete a successful jump before Collect.');
  return {
    ...round, history: round.history.map(item => ({ ...item })),
    private: { survival: [...round.private.survival] },
    status: 'collected', winMinor: payout(round.betMinor, TABLES[round.mode][round.step - 1])
  };
}

export function publicMineIslandRound(round) {
  checkedRound(round);
  const history = round.history.map(item => ({ ...item }));
  return {
    gameId: GAME_ID, mathVersion: MATH_VERSION, mode: round.mode,
    status: round.status, step: round.step, betMinor: round.betMinor,
    multiplierBps: round.multiplierBps,
    nextMultiplierBps: round.status === 'active' && round.step < 10 ? TABLES[round.mode][round.step] : null,
    collectibleMinor: round.status === 'active' && round.step > 0 ? payout(round.betMinor, TABLES[round.mode][round.step - 1]) : '0',
    winMinor: round.status === 'collected' ? round.winMinor : '0',
    maxSteps: 10, revealedCells: history.map(item => item.cell), history, path: history.map(item => ({ ...item })),
    allowedActions: round.status !== 'active' ? [] : round.step === 0 ? ['reveal'] : ['reveal', 'collect']
  };
}

export function mineIslandReturnAtStep({ mode = 'easy', step, betMinor = '10' } = {}) {
  if (!Object.hasOwn(TABLES, mode) || !Number.isInteger(step) || step < 1 || step > 10) fail('INVALID_STEP', 'Choose a valid mode and step 1–10.');
  const bet = parseBet(betMinor);
  const multiplierBps = TABLES[mode][step - 1];
  const payoutMinor = BigInt(payout(bet.toString(), multiplierBps));
  return {
    survivalNumerator: String(TARGET_RETURN_BPS), survivalDenominator: String(multiplierBps),
    payoutMinor: payoutMinor.toString(),
    expectedReturnNumerator: (BigInt(TARGET_RETURN_BPS) * payoutMinor).toString(),
    expectedReturnDenominator: (BigInt(multiplierBps) * bet).toString()
  };
}

