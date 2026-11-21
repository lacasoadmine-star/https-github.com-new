// Multi Hot 20 reference-only line quote. Auth, RNG, settlement and wallets are outside this module.
// The payline paths and pays below were transcribed from this title's current official demo on
// 2026-11-22 Africa/Addis_Ababa (2026-11-21 UTC), not from another title's implementation.
export const GAME_ID = 'zplay72_multi_hot_20_v1';
export const REFERENCE_VERSION = 'multihot20-v1.0.0-observed-20261122';
export const RELEASE_READY = false;

export const PAYLINES = Object.freeze([
  [0,0,0,0,0], [1,1,1,1,1], [2,2,2,2,2], [0,1,2,1,0], [2,1,0,1,2],
  [0,0,1,2,2], [2,2,1,0,0], [1,0,0,0,1], [1,2,2,2,1], [0,1,1,1,0],
  [2,1,1,1,2], [0,0,0,0,1], [2,2,2,2,1], [0,1,0,1,0], [2,1,2,1,2],
  [1,1,0,1,1], [1,1,2,1,1], [0,0,1,0,0], [2,2,1,2,2], [1,2,1,2,1]
].map(path => Object.freeze(path)));

// Integer multipliers of one line's bet; source table at total bet 0.20 DMO / 20 lines.
export const LINE_PAYS = Object.freeze(Object.fromEntries(Object.entries({
  seven: {3:50,4:400,5:2000},
  bell: {3:20,4:100,5:200},
  grapes: {3:10,4:50,5:100},
  watermelon: {3:10,4:50,5:100},
  lemon: {3:5,4:10,5:50},
  plum: {3:5,4:10,5:50},
  orange: {3:5,4:10,5:50},
  cherry: {3:5,4:10,5:50}
}).map(([name,pays]) => [name,Object.freeze(pays)])));

const own = (object,key) => Object.prototype.hasOwnProperty.call(object,key);
const fail = code => { throw new TypeError(code); };

/**
 * Quote adjacent left-to-right line candidates for an already supplied 3x5 grid.
 * Amounts are integer reference minor units (100 = 1 DMO), not ETB wallet receipts.
 * A caller must never use this output as settlement: reel legality, probabilities,
 * global caps and complete provider aggregation rules remain unverified.
 */
export function quoteLineCandidates(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('MULTIHOT20_INPUT_REQUIRED');
  const {gameId,gridRows,totalBetMinor,multiplier} = input;
  if (gameId !== GAME_ID) fail('MULTIHOT20_GAME_ID_REQUIRED');
  if (!Array.isArray(gridRows) || gridRows.length !== 3 || Array.from(gridRows).some(row =>
    !Array.isArray(row) || row.length !== 5 || Array.from(row).some(symbol =>
      typeof symbol !== 'string' || !own(LINE_PAYS,symbol)))) fail('MULTIHOT20_GRID_3_BY_5_REQUIRED');
  if (!Number.isSafeInteger(totalBetMinor) || totalBetMinor < 20 || totalBetMinor > 20000 ||
    totalBetMinor % PAYLINES.length !== 0) fail('MULTIHOT20_REFERENCE_BET_REQUIRED');
  if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 5) fail('MULTIHOT20_MULTIPLIER_1_TO_5_REQUIRED');

  const lineBetMinor = totalBetMinor / PAYLINES.length;
  const lines = [];
  for (const [index,path] of PAYLINES.entries()) {
    const symbol = gridRows[path[0]][0];
    let count = 1;
    while (count < 5 && gridRows[path[count]][count] === symbol) count += 1;
    const unitPay = LINE_PAYS[symbol][count];
    if (!unitPay) continue;
    const baseMinor = lineBetMinor * unitPay;
    const quotedMinor = baseMinor * multiplier;
    lines.push(Object.freeze({lineId:index+1,path,symbol,count,unitPay,lineBetMinor,baseMinor,multiplier,quotedMinor}));
  }
  const lineQuoteSumMinor = lines.reduce((sum,line) => sum+line.quotedMinor,0);
  return Object.freeze({
    gameId:GAME_ID, referenceVersion:REFERENCE_VERSION, currency:'DMO_REFERENCE_ONLY',
    totalBetMinor, lineBetMinor, multiplier, lines:Object.freeze(lines), lineQuoteSumMinor,
    scope:'line-candidate-quote-only', outcomeLegalityVerified:false, settlementValidated:false,
    probabilityModelAvailable:false, globalCapApplied:false, releaseReady:false
  });
}

/** Deliberate boundary: this observed component cannot authorize money or generate a round. */
export function requireSettlementReady() {
  throw new Error('MULTIHOT20_COMPLETE_ENGINE_AND_FINANCIAL_VERIFICATION_REQUIRED');
}
