// Wild Multi Stars ONLY: the observed Wild-lock/respin presentation protocol.
// The server retains authority over stake, reel stops, payouts and ETB settlement.
// This module never generates results, makes wallet calls or mutates the receipt.
export const WILD_MULTI_STARS_OBSERVATION = Object.freeze({
  referenceGame: 'WildMultiStars',
  reels: 5,
  paylines: 10,
  directions: 'both_outer_reels_highest_each',
  respin: 'wild_reel_hold_without_new_stake',
  wheelValues: Object.freeze([1, 2, 3, 4, 5]),
  source: 'qa/wild-multi-stars-observed.md',
});

const reject = name => { throw new TypeError('WILD_STARS_' + name); };
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validReel = (reel, reels) => Number.isInteger(reel) && reel >= 0 && reel < reels;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function validateGrid(grid, reels, rows, name) {
  if (!Array.isArray(grid) || grid.length !== rows
    || grid.some(row => !Array.isArray(row) || row.length !== reels
      || row.some(symbol => typeof symbol !== 'string' || symbol.length === 0))) {
    reject(name);
  }
  return grid;
}
function validateLocks(reelsList, reels) {
  if (!Array.isArray(reelsList) || reelsList.length > reels
    || new Set(reelsList).size !== reelsList.length
    || reelsList.some(reel => !validReel(reel, reels))) reject('LOCK_SET');
  return new Set(reelsList);
}
function reelColumn(grid, reel) { return grid.map(row => row[reel]); }

/**
 * Accept a fully settled, already verified server response. A base frame is
 * followed by zero or more server-authorized re-spin frames. All lock and wheel
 * transitions are validated before any frame is displayed. No local random
 * reel stops, forged line wins, wager debits or synthetic receipts are allowed.
 *
 * Shape:
 * { roundId, gameId, bet, currency, wheelMultiplier,
 *   walletReceipt, stages:[{grid, lockedReels, newStakeCharged}] }
 * The wallet receipt must be validated by the game-specific server contract
 * before this presentation-only function is called.
 */
export function buildWildStarsPresentation(receipt, { rows, reels = 5, wildSymbol = 'wild_star' } = {}) {
  if (!isRecord(receipt) || receipt.gameId !== 'wild_multi_stars'
    || typeof receipt.roundId !== 'string' || receipt.roundId.length === 0
    || receipt.currency !== 'ETB' || typeof receipt.bet !== 'string'
    || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(receipt.bet)) reject('RECEIPT');
  if (!Number.isInteger(reels) || reels !== WILD_MULTI_STARS_OBSERVATION.reels
    || !Number.isInteger(rows) || rows < 1 || rows > 8) reject('DIMENSIONS');
  if (!WILD_MULTI_STARS_OBSERVATION.wheelValues.includes(receipt.wheelMultiplier)) reject('WHEEL');
  if (!Array.isArray(receipt.stages) || receipt.stages.length < 1 || receipt.stages.length > 16) reject('STAGES');
  if (!isRecord(receipt.walletReceipt) || receipt.walletReceipt.currency !== 'ETB') reject('SERVER_RECEIPT_MISSING');

  let lastGrid = null, held = new Set();
  const frames = [];
  receipt.stages.forEach((stage, index) => {
    if (!isRecord(stage)) reject('STAGE');
    const grid = validateGrid(stage.grid, reels, rows, 'GRID');
    const locks = validateLocks(stage.lockedReels, reels);
    if (stage.wheelMultiplier !== undefined && stage.wheelMultiplier !== receipt.wheelMultiplier) reject('WHEEL_CHANGED');
    if (index === 0 && stage.newStakeCharged !== undefined && stage.newStakeCharged !== true) reject('BASE_STAKE_FLAG');
    if (index > 0 && stage.newStakeCharged !== false) reject('RESPIN_STAKE');
    for (const reel of held) {
      if (!locks.has(reel)) reject('UNLOCKED_HELD_REEL');
      if (!same(reelColumn(lastGrid, reel), reelColumn(grid, reel))) reject('HELD_REEL_MOVED');
    }
    const newlyHeld = [...locks].filter(reel => !held.has(reel));
    for (const reel of newlyHeld) {
      if (!reelColumn(grid, reel).every(symbol => symbol === wildSymbol)) reject('NONWILD_LOCK');
    }
    // A further free re-spin is valid only after a new Wild reel was held.
    if (index > 0 && index < receipt.stages.length - 1 && newlyHeld.length === 0) {
      reject('UNAUTHORIZED_RESPIN');
    }
    frames.push(Object.freeze({
      index, type: index === 0 ? 'base' : 'free_respin', wheelMultiplier: receipt.wheelMultiplier,
      grid: grid.map(row => Object.freeze([...row])), lockedReels: Object.freeze([...locks].sort((a,b)=>a-b)),
      newlyHeldReels: Object.freeze(newlyHeld.sort((a,b)=>a-b)),
      deductAdditionalStake: false,
    }));
    held = locks; lastGrid = grid;
  });
  return Object.freeze({ gameId: receipt.gameId, roundId: receipt.roundId, frames: Object.freeze(frames) });
}
