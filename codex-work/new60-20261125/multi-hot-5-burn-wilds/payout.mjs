import { OBSERVED_CONFIG, SYMBOL_IDS } from './observed-config.mjs';

export class ReferenceQuoteError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReferenceQuoteError';
    this.code = code;
  }
}

function requireFact(condition, code, message) {
  if (!condition) throw new ReferenceQuoteError(code, message);
}

/**
 * Quote each fixed payline of a supplied final grid using freshly observed facts.
 *
 * This does not draw symbols, expand wilds, select a multiplier, aggregate a round
 * payout, debit a wallet or settle a round. An authoritative engine must provide
 * the already expanded grid and its winning multiplier. In particular, returning
 * this object never authorizes a financial transaction.
 *
 * @param {{grid: string[][], currency: 'DMO', betMinorUnits: 10 | 20,
 *          winningMultiplier: 1 | 2 | 3 | 4 | 5,
 *          finalExpansionComplete: true}} input
 */
export function quoteObservedFinalGrid(input) {
  requireFact(input && typeof input === 'object' && !Array.isArray(input),
    'INVALID_INPUT', 'A quote input object is required.');
  const allowedKeys = new Set([
    'grid', 'currency', 'betMinorUnits', 'winningMultiplier', 'finalExpansionComplete',
  ]);
  requireFact(Object.keys(input).every(key => allowedKeys.has(key)),
    'UNSUPPORTED_INPUT', 'The quote cannot silently ignore unknown outcome or settlement fields.');

  const { grid, currency, betMinorUnits, winningMultiplier, finalExpansionComplete } = input;
  requireFact(currency === OBSERVED_CONFIG.currency,
    'UNVERIFIED_CURRENCY', 'This observed quote accepts DMO only.');
  requireFact(OBSERVED_CONFIG.observedBetMinorUnits.includes(betMinorUnits),
    'UNVERIFIED_BET', 'Only observed 0.10 and 0.20 DMO paytables are implemented.');
  requireFact(OBSERVED_CONFIG.winningMultipliers.includes(winningMultiplier),
    'INVALID_MULTIPLIER', 'The authoritative winning multiplier must be an integer from 1 to 5.');
  requireFact(finalExpansionComplete === true,
    'FINAL_GRID_REQUIRED', 'Supply the authoritative final grid after all wild expansion.');
  requireFact(Array.isArray(grid) && grid.length === OBSERVED_CONFIG.columns &&
    Array.from({ length: OBSERVED_CONFIG.columns }, (_, column) =>
      Array.isArray(grid[column]) && grid[column].length === OBSERVED_CONFIG.rows &&
      Array.from({ length: OBSERVED_CONFIG.rows }, (_, row) =>
        SYMBOL_IDS.includes(grid[column][row])).every(Boolean)
    ).every(Boolean),
    'INVALID_GRID', 'The grid must contain five dense columns of three known symbols.');

  const wild = OBSERVED_CONFIG.wildSymbol;
  for (let column = 0; column < grid.length; column++) {
    requireFact(!grid[column].includes(wild) || OBSERVED_CONFIG.wildReelIndices.includes(column),
      'INVALID_WILD_POSITION', 'Wild is observed only on reels 2, 3 and 4.');
  }

  const factor = betMinorUnits / OBSERVED_CONFIG.referenceBetMinorUnits;
  const lineQuotes = OBSERVED_CONFIG.paylines.map(line => {
    const symbols = line.rows.map((row, column) => grid[column][row]);
    // Wild never appears on the first reel, so the first symbol fixes this line.
    const symbol = symbols[0];
    let matchedCount = 1;
    while (matchedCount < symbols.length &&
      (symbols[matchedCount] === symbol || symbols[matchedCount] === wild)) {
      matchedCount++;
    }
    const baseMinorUnits = (OBSERVED_CONFIG.paytableMinorUnits[symbol][matchedCount] ?? 0) * factor;
    const wildColumns = baseMinorUnits > 0
      ? symbols.flatMap((value, column) => column < matchedCount && value === wild ? [column] : [])
      : [];
    for (const column of wildColumns) {
      requireFact(grid[column].every(value => value === wild),
        'UNEXPANDED_WINNING_WILD', 'A winning wild must be fully expanded in the supplied final grid.');
    }
    return Object.freeze({
      lineId: line.id,
      rows: line.rows,
      symbols: Object.freeze(symbols),
      symbol,
      matchedCount,
      winning: baseMinorUnits > 0,
      baseMinorUnits,
      multipliedMinorUnits: baseMinorUnits * winningMultiplier,
      wildColumns: Object.freeze(wildColumns),
    });
  });

  return Object.freeze({
    gameId: OBSERVED_CONFIG.gameId,
    kind: 'OBSERVED_PAYLINE_QUOTES',
    currency,
    betMinorUnits,
    winningMultiplier,
    finalExpansionComplete: true,
    lineQuotes: Object.freeze(lineQuotes),
    hasWinningLine: lineQuotes.some(line => line.winning),
    aggregationVerified: false,
    outcomeGenerated: false,
    settlementAuthorized: false,
  });
}
