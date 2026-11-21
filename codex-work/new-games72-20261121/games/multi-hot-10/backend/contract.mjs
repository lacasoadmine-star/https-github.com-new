import { GAME_ID, SYMBOLS } from '../evaluator.mjs';

export { GAME_ID };
export const HASH = /^[a-f0-9]{64}$/i;
export const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const MONEY = /^(0|[1-9]\d{0,12})\.\d{2}$/;
export const MATH_KEYS = Object.freeze(['mathVersion', 'engineVersion', 'mathSha256']);
export const SPIN_KEYS = Object.freeze(['gameId', 'bet', 'roundToken', 'sessionGuard', ...MATH_KEYS]);

export class MultiHot10BackendError extends Error {
  constructor(code, status = 503) {
    super(code);
    this.name = 'MultiHot10BackendError';
    this.code = code;
    this.status = status;
  }
}
export const fail = (code, status) => { throw new MultiHot10BackendError(code, status); };
export const copy = value => structuredClone(value);
export function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export function minor(value) {
  if (typeof value !== 'string' || !MONEY.test(value)) fail('INVALID_ETB_AMOUNT', 400);
  return BigInt(value.replace('.', ''));
}
export function mathIdentity(value) {
  if (!value || !MATH_KEYS.slice(0, 2).every(key => typeof value[key] === 'string' &&
    value[key].length > 0 && value[key].length <= 200) || !HASH.test(value.mathSha256 ?? '')) {
    fail('M10_MATH_IDENTITY_INVALID');
  }
  return Object.fromEntries(MATH_KEYS.map(key => [key, value[key]]));
}
export function validateAction(action) {
  if (!action || typeof action !== 'object' || Array.isArray(action) || action.gameId !== GAME_ID ||
    Object.keys(action).some(key => ![...SPIN_KEYS, 'replayOnly'].includes(key)) ||
    SPIN_KEYS.some(key => !Object.hasOwn(action, key))) fail('INVALID_EXISTING_SPIN_REQUEST', 400);
  if (!UUID.test(action.roundToken ?? '')) fail('ROUND_TOKEN_INVALID', 400);
  if (!HASH.test(action.sessionGuard ?? '')) fail('PLAYER_SESSION_CHANGED', 403);
  if (minor(action.bet) <= 0n) fail('INVALID_ETB_AMOUNT', 400);
  if (action.replayOnly !== undefined && typeof action.replayOnly !== 'boolean') fail('INVALID_REPLAY_FLAG', 400);
  mathIdentity(action);
  return action;
}
export const validGrid = grid => Array.isArray(grid) && grid.length === 3 &&
  Array.from(grid).every(row => Array.isArray(row) && row.length === 5 &&
    Array.from(row).every(symbol => SYMBOLS.includes(symbol)));

// There is deliberately no reel strip, symbol weight, aggregate formula,
// probability claim, stake ladder, or settlement version in this configuration.
// This is an integration status, not an installed math model.
export const BACKEND_CONFIGURATION = freeze({
  schema: 'zplay/multi-hot-10-backend/v1',
  gameId: GAME_ID,
  title: 'Multi Hot 10',
  route: '/new-games72/multi-hot-10/',
  currency: 'ETB',
  reels: 5,
  rows: 3,
  paylines: 10,
  symbols: [...SYMBOLS],
  multiplierValues: [1, 2, 3, 4, 5],
  enabled: false,
  freshReleaseReady: false,
  integrationStatus: 'MATH_AND_COLLECTION_NOT_INSTALLED',
  settlementEligible: false,
  missingInputs: [
    'Exact reel strips or an equivalent verified outcome probability model',
    'Multiplier selection probabilities and dependence on the reel outcome',
    'Complete legal-outcome and 1000x maximum-win rules',
    'Round aggregation and fractional-minor-unit rounding rules',
    'Provider X2 eligibility/limits/probabilities and verified host reserve/ownership integration',
    'Explicit ETB stake policy and complete model verification',
  ],
});
