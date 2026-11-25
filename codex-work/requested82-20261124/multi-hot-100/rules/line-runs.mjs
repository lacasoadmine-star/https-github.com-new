import {M100_PAYLINES} from './paylines.mjs';

export const M100_SYMBOLS = Object.freeze(['seven','bell','grapes','watermelon','cherry','orange','plum','lemon']);
const symbols = new Set(M100_SYMBOLS);

/** Read equal-symbol prefixes on current artwork paths. This assigns no award,
 * balance, probability, cap, rounding or official payout interpretation. */
export function traceM100LineRuns(grid) {
  if (!Array.isArray(grid) || grid.length !== 4 || Array.from(grid).some(row => !Array.isArray(row) || row.length !== 5 ||
    Array.from(row).some(symbol => !symbols.has(symbol)))) throw new TypeError('M100_LINE_GRID');
  return Object.freeze(M100_PAYLINES.map((path,index) => {
    const symbol = grid[path[0]][0];
    let prefixLength = 1;
    while (prefixLength < 5 && grid[path[prefixLength]][prefixLength] === symbol) prefixLength++;
    return Object.freeze({lineId:index+1,path,symbol,prefixLength});
  }));
}
