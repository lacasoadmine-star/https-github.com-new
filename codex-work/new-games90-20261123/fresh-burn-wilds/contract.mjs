/**
 * New Burn Wilds integration contract. Authored independently in November 2026.
 * The official current product description establishes 5 reels x 3 rows, 5 fixed
 * paylines, expanding WILD on reels 2-4 and a 1x-5x multiplier. No probabilities,
 * reel strips, symbol artwork or undocumented payouts are inferred here.
 *
 * All monetary amounts are integers in Ethiopian birr cents (santim).
 * A backend-accepted, already-settled round is the only source of results.
 */
export const GAME_ID = 'zplay72_multi_hot_5_burn_wilds_v1';
export const REELS = 5;
export const ROWS = 3;
export const CURRENCY = 'ETB';

function reject(code) { throw Object.assign(new Error(code), { code }); }
const isId = value => typeof value === 'string' && value.length > 0 && value.length <= 180;
const isAmount = value => Number.isSafeInteger(value) && value >= 0;
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

export function validateSession(data) {
  if (!data || data.authenticated !== true || data.gameId !== GAME_ID ||
      data.currency !== CURRENCY || !isId(data.subject) ||
      !isAmount(data.balanceMinor) || !Array.isArray(data.betLevelsMinor) ||
      data.betLevelsMinor.some(v => !isAmount(v) || v === 0) ||
      new Set(data.betLevelsMinor).size !== data.betLevelsMinor.length ||
      typeof data.cashReleaseApproved !== 'boolean') reject('BURN_SESSION_INVALID');
  if (data.cashReleaseApproved && (!isId(data.modelVersion) ||
      !isId(data.assetManifestId) || data.betLevelsMinor.length === 0))
    reject('BURN_UNVERIFIED_RELEASE');
  return Object.freeze({
    gameId: GAME_ID, currency: CURRENCY, subject: data.subject,
    balanceMinor: data.balanceMinor,
    betLevelsMinor: Object.freeze([...data.betLevelsMinor]),
    cashReleaseApproved: data.cashReleaseApproved,
    modelVersion: isId(data.modelVersion) ? data.modelVersion : null,
    assetManifestId: isId(data.assetManifestId) ? data.assetManifestId : null
  });
}

export function validateGrid(grid, symbols) {
  if (!Array.isArray(symbols) || symbols.length < 2 ||
      symbols.some(s => !isId(s)) || new Set(symbols).size !== symbols.length ||
      !Array.isArray(grid) || grid.length !== REELS ||
      grid.some(col => !Array.isArray(col) || col.length !== ROWS ||
        col.some(s => !symbols.includes(s))))
    reject('BURN_GRID_INVALID');
  return grid.map(col => Object.freeze([...col]));
}

export function validateSettledRound(receipt, action, symbols) {
  if (!receipt || receipt.serverSettled !== true || receipt.gameId !== GAME_ID ||
      receipt.requestKey !== action.requestKey || receipt.betMinor !== action.betMinor ||
      receipt.subject !== action.subject ||
      !isId(receipt.roundId) || !isAmount(receipt.betMinor) || receipt.betMinor === 0 ||
      !isAmount(receipt.winMinor) || !isAmount(receipt.balanceMinor) ||
      !Number.isInteger(receipt.multiplier) ||
      receipt.multiplier < 1 || receipt.multiplier > 5 ||
      !isId(receipt.ledger?.betTxId) ||
      (receipt.winMinor > 0 && !isId(receipt.ledger?.winTxId)) ||
      !isId(receipt.modelVersion) || receipt.modelVersion !== action.modelVersion ||
      receipt.currency !== CURRENCY || receipt.historyRecorded !== true)
    reject('BURN_RECEIPT_INVALID');

  const finalGrid = validateGrid(receipt.finalGrid, symbols);
  const expanded = receipt.expandedColumns;
  if (!Array.isArray(expanded) || new Set(expanded).size !== expanded.length ||
      expanded.some(reel => !Number.isInteger(reel) || reel < 1 || reel > 3 ||
        finalGrid[reel].some(symbol => symbol !== 'wild'))) reject('BURN_EXPANSION_INVALID');

  const lines = receipt.winningLines;
  if (!Array.isArray(lines) || lines.length > 5 ||
      lines.some(line => !Number.isInteger(line.lineId) || line.lineId < 1 ||
        line.lineId > 5 || !isAmount(line.winMinor) ||
        !Array.isArray(line.cells) || line.cells.length < 2 ||
        line.cells.length > REELS ||
        line.cells.some(cell => !Array.isArray(cell) || cell.length !== 2 ||
          !Number.isInteger(cell[0]) || cell[0] < 0 || cell[0] >= REELS ||
          !Number.isInteger(cell[1]) || cell[1] < 0 || cell[1] >= ROWS)) ||
      new Set(lines.map(line => line.lineId)).size !== lines.length)
    reject('BURN_LINES_INVALID');
  if (expanded.length > 0 && !lines.length) reject('BURN_UNJUSTIFIED_EXPANSION');

  // No visual sequence is allowed to calculate a wager, win, multiplier or balance.
  const copy = {
    gameId: GAME_ID, currency: CURRENCY, serverSettled: true,
    requestKey: receipt.requestKey, roundId: receipt.roundId, subject: receipt.subject,
    modelVersion: receipt.modelVersion, betMinor: receipt.betMinor,
    winMinor: receipt.winMinor, balanceMinor: receipt.balanceMinor,
    multiplier: receipt.multiplier,
    finalGrid: Object.freeze(finalGrid),
    expandedColumns: Object.freeze([...expanded]),
    winningLines: Object.freeze(lines.map(line => Object.freeze({
      lineId: line.lineId, winMinor: line.winMinor,
      cells: Object.freeze(line.cells.map(c => Object.freeze([...c])))
    }))),
    ledger: Object.freeze({ betTxId: receipt.ledger.betTxId,
      winTxId: isId(receipt.ledger.winTxId) ? receipt.ledger.winTxId : null }),
    historyRecorded: true
  };
  return Object.freeze(copy);
}

export function validateIntent(intent, session) {
  if (!intent || intent.gameId !== GAME_ID || !isId(intent.requestKey) ||
      intent.subject !== session.subject ||
      intent.modelVersion !== session.modelVersion ||
      !session.cashReleaseApproved ||
      !session.betLevelsMinor.includes(intent.betMinor) ||
      intent.betMinor > session.balanceMinor || !isAmount(intent.betMinor) ||
      own(intent, 'winMinor') || own(intent, 'finalGrid') ||
      own(intent, 'balanceMinor')) reject('BURN_NEW_SPIN_BLOCKED');
  return Object.freeze({
    gameId: GAME_ID, subject: session.subject,
    requestKey: intent.requestKey, modelVersion: intent.modelVersion,
    betMinor: intent.betMinor
  });
}
