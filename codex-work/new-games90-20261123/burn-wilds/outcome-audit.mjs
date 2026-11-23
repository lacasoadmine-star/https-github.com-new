import {BURN_WILDS_GAME_ID, validateBurnWildsReceipt} from './expansion.mjs';
import {BURN_WILDS_PAYLINES, evaluateBurnWildsLine} from './rules.mjs';

/**
 * Server-side eligibility audit for the own, currently observed v1.0.1
 * Multi Hot 5 Burn Wilds paytable. This is NOT a random outcome generator,
 * RTP implementation, cash wallet, host transport or proof of licensed assets.
 * A separate authoritative server must first select and durably accept a
 * valid original grid, expansion and multiplier. Unverified financial states
 * are rejected, not guessed or silently capped.
 */
const fail = code => { throw new TypeError('BURN_WILDS_OUTCOME_' + code); };

export function quoteBurnWildsFinalGrid({finalGrid, betMinor, multiplier}) {
  if (!Number.isSafeInteger(betMinor) || betMinor <= 0) fail('STAKE');
  if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 5) fail('MULTIPLIER');
  const lineQuotes = BURN_WILDS_PAYLINES.map((_, index) =>
    evaluateBurnWildsLine(finalGrid, index + 1, betMinor, multiplier)
  );
  let totalWinMinor = 0;
  const winLines = [];
  for (const line of lineQuotes) {
    if (!Number.isSafeInteger(line.winMinor) || line.winMinor < 0 ||
        !Number.isSafeInteger(totalWinMinor + line.winMinor)) fail('AMOUNT_OVERFLOW');
    totalWinMinor += line.winMinor;
    if (line.winMinor > 0) {
      winLines.push(Object.freeze({
        id: line.lineId, rows: Object.freeze([...line.rows]),
        symbol: line.symbol, count: line.count, winMinor: line.winMinor
      }));
    }
  }
  return Object.freeze({
    gameId: BURN_WILDS_GAME_ID, betMinor, multiplier, totalWinMinor,
    winLines: Object.freeze(winLines)
  });
}

/**
 * Validate payout consistency of an externally accepted receipt before a
 * release or settlement gate treats its result as proved. No network call and
 * no balance change occur here. The authoritative host also needs separate
 * evidence for probability/reel weights and the payout contract.
 */
export function auditBurnWildsPayout(receipt) {
  const accepted = validateBurnWildsReceipt(receipt);
  if (!Number.isSafeInteger(accepted.betMinor) || accepted.betMinor <= 0 ||
      !Number.isSafeInteger(accepted.winMinor) || accepted.winMinor < 0 ||
      !Number.isInteger(accepted.multiplier)) fail('FINANCIAL_FIELDS_REQUIRED');
  const quoted = quoteBurnWildsFinalGrid({
    finalGrid: accepted.finalGrid, betMinor: accepted.betMinor,
    multiplier: accepted.multiplier
  });
  if (accepted.winMinor !== quoted.totalWinMinor) fail('TOTAL_MISMATCH');
  if (accepted.winLines.length !== quoted.winLines.length) fail('LINE_COUNT_MISMATCH');
  const seen = new Set();
  for (const line of accepted.winLines) {
    if (!Number.isSafeInteger(line.id) || line.id < 1 ||
        line.id > BURN_WILDS_PAYLINES.length || seen.has(line.id)) fail('LINE_ID');
    seen.add(line.id);
    const expected = quoted.winLines.find(item => item.id === line.id);
    if (!expected || !Number.isSafeInteger(line.winMinor) ||
        line.winMinor !== expected.winMinor ||
        line.rows.length !== expected.rows.length ||
        line.rows.some((row, index) => row !== expected.rows[index]))
      fail('LINE_MISMATCH');
  }
  return Object.freeze({
    gameId: BURN_WILDS_GAME_ID, roundId: accepted.roundId,
    betMinor: accepted.betMinor, winMinor: quoted.totalWinMinor,
    multiplier: accepted.multiplier, lineCount: quoted.winLines.length,
    payoutConsistent: true, probabilityModelVerified: false,
    liveSettlementVerified: false
  });
}

