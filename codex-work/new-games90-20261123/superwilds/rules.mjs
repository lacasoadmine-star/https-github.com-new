// Transcribed from the current own Super Wilds v1.0.1 demo after the
// paytable stake selector refreshed. This is a bounded deterministic quote,
// not a provider probability model or proof of an ETB cash game's RTP.
export const GAME_ID = 'zplay72_multi_hot_5_super_wilds_v1';
export const SYMBOLS = Object.freeze(['wild','seven','grapes','watermelon','bell','lemon','plum','orange','cherry']);
export const PAYLINES = Object.freeze([
  [1,1,1,1,1], [0,0,0,0,0], [2,2,2,2,2], [0,1,2,1,0], [2,1,0,1,2],
].map(line => Object.freeze(line)));
// Integer numerators over TWO times the total stake. This keeps the
// observed low-fruit 3-symbol payout of half a stake exact.
export const PAY_RATIOS = Object.freeze(Object.fromEntries([
  ['wild', [6,20,80]], ['seven',[6,20,80]], ['grapes',[4,8,40]],
  ['watermelon',[2,4,20]], ['bell',[2,4,20]],
  ['lemon',[1,2,10]], ['plum',[1,2,10]], ['orange',[1,2,10]], ['cherry',[1,2,10]],
].map(([symbol,values]) => [symbol,Object.freeze({3:values[0],4:values[1],5:values[2]})])));

export const OBSERVED_BETS_MINOR = Object.freeze([10,20,30,40,50,60,80,100,150,200,300,400,500,600,800,1000,1500,2000,3000,4000,5000,6000,8000,10000,15000,20000]);
export const REFERENCE_ONLY = Object.freeze({providerVersion:'1.0.1',providerAdvertisedRtp:'96.51%',
  maxWinTimesStake:1000,probabilityModelVerified:false,roundingPolicyVerified:false,cashEnabled:false});

function requireMinor(value, positive = false) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) throw Error('SUPERWILDS_INVALID_MINOR');
  return value;
}
export function validateGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== 5 || grid.some(column => !Array.isArray(column) || column.length !== 3 ||
    column.some(symbol => !SYMBOLS.includes(symbol)))) throw Error('SUPERWILDS_GRID_REQUIRED');
  return grid;
}

/** Quote the highest left-to-right candidate on each observed fixed line.
 * Unknown fractional-minor rounding is rejected instead of invented. */
export function quoteGrid({grid,betMinor,multiplier} = {}) {
  validateGrid(grid); requireMinor(betMinor,true);
  if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 5) throw Error('SUPERWILDS_MULTIPLIER_REQUIRED');
  const winningLines = [];
  for (const [lineIndex,rows] of PAYLINES.entries()) {
    const line = rows.map((row,column) => grid[column][row]);
    let best = null;
    for (const symbol of SYMBOLS) {
      let count = 0;
      for (const candidate of line) {
        if (candidate !== symbol && (symbol === 'wild' || candidate !== 'wild')) break;
        count++;
      }
      if (count < 3) continue;
      const numerator = BigInt(betMinor) * BigInt(PAY_RATIOS[symbol][count]) * BigInt(multiplier);
      if (numerator % 2n !== 0n) throw Error('SUPERWILDS_UNVERIFIED_FRACTIONAL_MINOR_ROUNDING');
      const quoted = numerator / 2n;
      if (quoted > BigInt(Number.MAX_SAFE_INTEGER)) throw Error('SUPERWILDS_QUOTE_OVERFLOW');
      const winMinor = Number(quoted);
      if (!best || winMinor > best.winMinor) best = {line:lineIndex+1,rows:[...rows],symbol,count,winMinor};
    }
    if (best) winningLines.push(Object.freeze({...best,rows:Object.freeze(best.rows)}));
  }
  const total = winningLines.reduce((sum,line) => sum + BigInt(line.winMinor),0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw Error('SUPERWILDS_QUOTE_OVERFLOW');
  return Object.freeze({gameId:GAME_ID,betMinor,multiplier,winMinor:Number(total),
    winningLines:Object.freeze(winningLines),referenceQuoteOnly:true,settlementValidated:false});
}
