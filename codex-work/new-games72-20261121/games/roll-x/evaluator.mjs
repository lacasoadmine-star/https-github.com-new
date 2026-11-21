/**
 * Independent Roll X payout arithmetic for verified observation fixtures only.
 *
 * No RNG, outcome generation, account, network, or wallet side effects.
 * Full target/bet limits and rounding rules are still unverified. This module
 * therefore rejects targets outside the observed set and fractional minor-unit
 * payouts rather than silently inventing rules. It must not enable cash play.
 */

export const GAME_ID = 'zplay72_roll_x_v1';
export const RULES_VERSION = 'roll-x-reference-20261121-partial-v1';
export const ENGINE_VERSION = 'zplay72-roll-x-arithmetic-0.1.0';
export const MULTIPLIER_SCALE = 10_000;
export const PUBLISHED_MAX_TARGET_BPS = 300_000;
export const OBSERVED_TARGETS_BPS = Object.freeze([14_000, 20_000]);

export class UnverifiedRollXRuleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'UnverifiedRollXRuleError';
    this.code = code;
  }
}

function minorUnits(value) {
  if (typeof value === 'bigint') {
    if (value > 0n) return value;
  } else if (typeof value === 'number') {
    if (Number.isSafeInteger(value) && value > 0) return BigInt(value);
  } else if (typeof value === 'string' && /^[1-9][0-9]*$/.test(value)) {
    return BigInt(value);
  }
  throw new UnverifiedRollXRuleError(
    'INVALID_BET_MINOR',
    'betMinor must be a positive exact integer, not a float or unsafe number.',
  );
}

function validateTarget(targetBps) {
  if (!Number.isSafeInteger(targetBps) || targetBps <= 0) {
    throw new UnverifiedRollXRuleError('INVALID_TARGET', 'Use an integer multiplier scaled by 10000.');
  }
  if (targetBps > PUBLISHED_MAX_TARGET_BPS) {
    throw new UnverifiedRollXRuleError('TARGET_ABOVE_PUBLISHED_MAXIMUM', 'The official page advertises a maximum of 30x.');
  }
  if (!OBSERVED_TARGETS_BPS.includes(targetBps)) {
    throw new UnverifiedRollXRuleError(
      'TARGET_NOT_VERIFIED',
      'This fixture evaluator supports only the 1.4x and 2x targets observed in the fresh demo session.',
    );
  }
}

/**
 * Evaluate a supplied settled wheel sector; this function never chooses it.
 * betMinor uses the caller's exact integer minor units. Fixtures use ETB cents
 * only as an isolated arithmetic unit, not as a live or promotional balance.
 *
 * Returns total payout (stake included when green), and the net change after
 * a single debit. Serialized money fields are decimal integer strings.
 */
export function evaluateObservedRollXPayout({ betMinor, targetBps, outcome, currency = 'ETB' } = {}) {
  if (currency !== 'ETB') {
    throw new UnverifiedRollXRuleError('INVALID_CURRENCY', 'The new ZPLAY module is ETB-only.');
  }
  const bet = minorUnits(betMinor);
  validateTarget(targetBps);
  if (outcome !== 'green' && outcome !== 'empty') {
    throw new UnverifiedRollXRuleError('INVALID_OUTCOME', 'A settled sector must be green or empty.');
  }

  const numerator = bet * BigInt(targetBps);
  const denominator = BigInt(MULTIPLIER_SCALE);
  // Validate the potential win even on losses; an unsupported wager must not
  // become acceptable merely because the supplied fixture happened to lose.
  if (numerator % denominator !== 0n) {
    throw new UnverifiedRollXRuleError(
      'ROUNDING_RULE_UNVERIFIED',
      'The potential payout contains fractional minor units; no provider rounding rule has been verified.',
    );
  }

  const payout = outcome === 'green' ? numerator / denominator : 0n;
  return Object.freeze({
    gameId: GAME_ID,
    engineVersion: ENGINE_VERSION,
    rulesVersion: RULES_VERSION,
    currency,
    betMinor: bet.toString(),
    targetBps,
    outcome,
    payoutMinor: payout.toString(),
    netMinor: (payout - bet).toString(),
  });
}

/** Evidence requirements, not a production enable switch. */
export const READINESS = Object.freeze({
  cashEnabled: false,
  rngImplemented: false,
  probabilityModel: 'UNVERIFIED',
  targetSchedule: 'PARTIAL',
  betLimits: 'UNVERIFIED',
  roundingRule: 'UNVERIFIED',
  visualParity: 'UNVERIFIED',
  soundParity: 'UNVERIFIED',
  walletIntegration: 'NOT_CONNECTED',
});
