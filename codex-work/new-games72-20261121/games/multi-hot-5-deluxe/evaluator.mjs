/**
 * Arithmetic for the observed Multi Hot 5 Deluxe v1.0.1 base-game paytable.
 *
 * This module does not generate outcomes, prove that an arbitrary grid is a
 * possible provider outcome, implement X2, or authorize a wallet settlement.
 * Inputs are a row-major 3x3 symbol grid, the TOTAL round bet in integer minor
 * units, and the observed multiplier. Currency/stake policy belongs to the
 * existing authenticated server and is deliberately not inferred from DMO.
 * Evidence and unresolved constraints: specification.json and payout-fixtures.json.
 */

export const GAME_ID = 'zplay72_multi_hot_5_deluxe_v1';
export const PAYTABLE_VERSION = 'mh5deluxe-1.0.1-observed-20261121';
export const PAYTABLE_SCOPE = 'OBSERVED_BASE_GAME_ARITHMETIC_ONLY';
export const PUBLISHED_DEMO_MAX_WIN_MULTIPLIER = 145;

// Factors are relative to the total displayed round bet, not bet-per-line.
// The bound 0.05/0.10 DMO tables and two captured wins independently agree.
export const SYMBOL_PAYOUT_FACTORS = Object.freeze({
  seven77: 15,
  dollar: 10,
  bell: 5,
  watermelon: 4,
  grapes: 4,
  plum: 2,
  lemon: 2,
  orange: 2,
  cherry: 2,
});

export const PAYLINES = Object.freeze([
  Object.freeze({ id: 1, rows: Object.freeze([1, 1, 1]) }),
  Object.freeze({ id: 2, rows: Object.freeze([0, 0, 0]) }),
  Object.freeze({ id: 3, rows: Object.freeze([2, 2, 2]) }),
  Object.freeze({ id: 4, rows: Object.freeze([0, 1, 2]) }),
  Object.freeze({ id: 5, rows: Object.freeze([2, 1, 0]) }),
]);

const MAX_MINOR = BigInt(Number.MAX_SAFE_INTEGER);

export class PaytableInputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PaytableInputError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new PaytableInputError(code, message);
}

function checkedMinor(value) {
  if (value < 0n || value > MAX_MINOR) {
    fail('PAYOUT_OVERFLOW', 'Payout exceeds exact integer minor-unit storage.');
  }
  return Number(value);
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('INVALID_INPUT', 'A paytable input object is required.');
  }
  const { gridRows, totalBetMinor, multiplier } = input;
  if (!Number.isSafeInteger(totalBetMinor) || totalBetMinor <= 0) {
    fail('INVALID_BET', 'Total round bet must be a positive safe integer in minor units.');
  }
  if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 5) {
    fail('INVALID_MULTIPLIER', 'The observed multiplier must be an integer from 1 to 5.');
  }
  if (!Array.isArray(gridRows) || gridRows.length !== 3) {
    fail('INVALID_GRID', 'Exactly three rows are required.');
  }
  for (let row = 0; row < 3; row += 1) {
    if (!Array.isArray(gridRows[row]) || gridRows[row].length !== 3) {
      fail('INVALID_GRID', 'Each row must contain exactly three reels.');
    }
    for (let reel = 0; reel < 3; reel += 1) {
      const symbolId = gridRows[row][reel];
      if (typeof symbolId !== 'string'
        || !Object.hasOwn(SYMBOL_PAYOUT_FACTORS, symbolId)) {
        fail('UNKNOWN_SYMBOL', `Unverified symbol at row ${row}, reel ${reel}.`);
      }
    }
  }
  return { gridRows, totalBetMinor, multiplier };
}

/**
 * Calculate only matching-symbol wins on the five observed fixed paylines.
 * All multiplications and additions use BigInt before safe-number conversion.
 * An amount above the displayed 145x limit is reported, never silently capped:
 * the admissible reel combinations and any provider cap rules are unverified.
 */
export function evaluatePaylines(input) {
  const { gridRows, totalBetMinor, multiplier } = validateInput(input);
  const stake = BigInt(totalBetMinor);
  const multiplierValue = BigInt(multiplier);
  let baseWin = 0n;
  let totalWin = 0n;
  const winningLines = [];

  for (const line of PAYLINES) {
    const symbols = line.rows.map((row, reel) => gridRows[row][reel]);
    if (symbols[0] !== symbols[1] || symbols[0] !== symbols[2]) continue;
    const symbolId = symbols[0];
    const factor = SYMBOL_PAYOUT_FACTORS[symbolId];
    const lineBaseWin = stake * BigInt(factor);
    const lineWin = lineBaseWin * multiplierValue;
    // Check both the individual amounts and sums before returning any result.
    const baseWinMinor = checkedMinor(lineBaseWin);
    const winMinor = checkedMinor(lineWin);
    baseWin += lineBaseWin;
    totalWin += lineWin;
    checkedMinor(baseWin);
    checkedMinor(totalWin);
    winningLines.push(Object.freeze({
      lineId: line.id,
      symbolId,
      factorOfTotalBet: factor,
      baseWinMinor,
      winMinor,
      cells: Object.freeze(line.rows.map((row, reel) => Object.freeze({ row, reel }))),
    }));
  }

  return Object.freeze({
    gameId: GAME_ID,
    paytableVersion: PAYTABLE_VERSION,
    scope: PAYTABLE_SCOPE,
    totalBetMinor,
    multiplier,
    baseWinMinor: checkedMinor(baseWin),
    totalWinMinor: checkedMinor(totalWin),
    winningLines: Object.freeze(winningLines),
    exceedsPublishedDemoMax: totalWin > stake * BigInt(PUBLISHED_DEMO_MAX_WIN_MULTIPLIER),
    outcomeLegalityVerified: false,
    settlementEligible: false,
  });
}
