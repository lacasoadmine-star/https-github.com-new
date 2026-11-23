import {BURN_WILDS_GAME_ID, BURN_WILDS_SYMBOLS} from './expansion.mjs';

// Refreshed in the game's own v1.0.1 rules on 23 November 2026 at both
// 0.10 and 0.20 DMO. These are payouts per displayed total stake, not RNG
// weights. The initially unrefreshed placeholder paytable was discarded.
export const BURN_WILDS_RULES_VERSION='burn-wilds-observed-v1.0.1-20261123';
export const BURN_WILDS_PAYLINES=Object.freeze([
  [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2]
].map(Object.freeze));
const fruit=Object.freeze({3:5,4:10,5:50});
export const BURN_WILDS_PAYTABLE_AT_TEN_MINOR=Object.freeze({
  seven:Object.freeze({2:5,3:40,4:100,5:1000}),
  grapes:Object.freeze({3:20,4:40,5:200}),
  watermelon:Object.freeze({3:20,4:40,5:200}),
  bell:Object.freeze({3:10,4:20,5:100}),
  orange:fruit,lemon:fruit,plum:fruit,cherry:fruit
});
const amount=value=>{if(!Number.isSafeInteger(value)||value<0)throw new TypeError('BURN_WILDS_AMOUNT');return BigInt(value);};

export function quoteBurnWildsLine(symbol,count,betMinor,multiplier=1){
  if(!(symbol in BURN_WILDS_PAYTABLE_AT_TEN_MINOR)||!Number.isInteger(count)||count<0||count>5)throw new TypeError('BURN_WILDS_LINE_QUOTE');
  if(!Number.isInteger(multiplier)||multiplier<1||multiplier>5)throw new TypeError('BURN_WILDS_MULTIPLIER');
  const stake=amount(betMinor);if(stake===0n)throw new TypeError('BURN_WILDS_STAKE');
  const numerator=BigInt(BURN_WILDS_PAYTABLE_AT_TEN_MINOR[symbol][count]||0)*stake*BigInt(multiplier);
  if(numerator%10n)throw new RangeError('BURN_WILDS_FRACTIONAL_MINOR');
  const value=numerator/10n;if(value>BigInt(Number.MAX_SAFE_INTEGER))throw new RangeError('BURN_WILDS_AMOUNT_OVERFLOW');
  return Number(value);
}

/** Quote one supplied final-grid line. This never selects a grid, expands a
 * reel, applies a maximum-win cap, or writes the wallet. The host remains the
 * authority for the accepted expansion, total settlement and probability model.
 */
export function evaluateBurnWildsLine(finalGrid,lineId,betMinor,multiplier=1){
  if(!Array.isArray(finalGrid)||finalGrid.length!==5||finalGrid.some(column=>!Array.isArray(column)||column.length!==3||column.some(s=>!BURN_WILDS_SYMBOLS.includes(s)))||finalGrid[0].includes('wild')||finalGrid[4].includes('wild'))throw new TypeError('BURN_WILDS_GRID');
  if(!Number.isInteger(lineId)||lineId<1||lineId>5)throw new TypeError('BURN_WILDS_LINE_ID');
  const rows=BURN_WILDS_PAYLINES[lineId-1],symbol=finalGrid[0][rows[0]];let count=1;
  for(let column=1;column<5;column++){const s=finalGrid[column][rows[column]];if(s!==symbol&&s!=='wild')break;count++;}
  const baseWinMinor=quoteBurnWildsLine(symbol,count,betMinor),winMinor=quoteBurnWildsLine(symbol,count,betMinor,multiplier);
  return Object.freeze({gameId:BURN_WILDS_GAME_ID,lineId,rows,symbol,count,baseWinMinor,winMinor});
}

export function describeBurnWildsPaytable(betMinor){
  return Object.freeze(Object.fromEntries(Object.entries(BURN_WILDS_PAYTABLE_AT_TEN_MINOR).map(([symbol,coefficients])=>[
    symbol,Object.freeze(Object.fromEntries(Object.keys(coefficients).map(count=>[count,quoteBurnWildsLine(symbol,Number(count),betMinor)])))
  ])));
}
