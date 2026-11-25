import {traceM100LineRuns} from './line-runs.mjs';

// Current public help, initialized through its own +/− preview control at
// 1.00 and 2.00 DMO on 24 November 2026. Coefficients multiply total stake/100.
// No hidden reel strip, entropy distribution or provider certification is claimed.
export const M100_PUBLIC_COEFFICIENTS = Object.freeze({
  seven:Object.freeze({3:20,4:200,5:500}),
  bell:Object.freeze({3:15,4:100,5:200}),
  grapes:Object.freeze({3:10,4:50,5:100}),
  watermelon:Object.freeze({3:10,4:50,5:100}),
  cherry:Object.freeze({3:5,4:10,5:50}),
  orange:Object.freeze({3:5,4:10,5:50}),
  plum:Object.freeze({3:5,4:10,5:50}),
  lemon:Object.freeze({3:5,4:10,5:50}),
});

/** Deterministic current-public-rules quote, never a wager or wallet authority.
 * Each line contributes its longest left-to-right identical-symbol prefix.
 * Fractional minor-unit line awards are rejected: no unverified rounding is
 * selected. The host owns its admitted currency/stakes and transaction policy.
 */
export function quoteM100Grid({grid,betMinor,multiplier}={}) {
  if(typeof betMinor!=='bigint'||betMinor<1n)throw new TypeError('M100_QUOTE_STAKE');
  if(!Number.isInteger(multiplier)||multiplier<1||multiplier>5)throw new RangeError('M100_QUOTE_MULTIPLIER');
  const runs=traceM100LineRuns(grid),lines=[];
  let baseMinor=0n;
  for(const run of runs) {
    if(run.prefixLength<3)continue;
    const coefficient=M100_PUBLIC_COEFFICIENTS[run.symbol][run.prefixLength];
    const numerator=betMinor*BigInt(coefficient);
    if(numerator%100n!==0n)throw new RangeError('M100_QUOTE_FRACTIONAL_MINOR_LINE_AWARD');
    const lineBaseMinor=numerator/100n,winMinor=lineBaseMinor*BigInt(multiplier);
    baseMinor+=lineBaseMinor;
    lines.push(Object.freeze({lineId:run.lineId,path:run.path,symbol:run.symbol,count:run.prefixLength,
      coefficient,lineBetDenominator:100,baseMinor:lineBaseMinor,winMinor}));
  }
  const winMinor=baseMinor*BigInt(multiplier);
  // This follows directly from 100 lines × the largest five-symbol coefficient 500
  // × wheel 5 / 100. It is a bound; no cap clipping or alternate amount is applied.
  if(winMinor>betMinor*2500n)throw new RangeError('M100_QUOTE_PUBLIC_BOUND');
  return Object.freeze({gameId:'zplay72_multi_hot_100_v1',betMinor,multiplier,baseMinor,winMinor,
    lines:Object.freeze(lines),quoteOnly:true,settlementValidated:false,providerProbabilityModel:false});
}
