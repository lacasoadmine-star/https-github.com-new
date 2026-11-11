export default {
 id:'ind74_popx',title:'PopX — Independent',catalogName:'PopX',sourceCategory:'Crash Games',family:'crash',model:'clock-crash-v1',mathVersion:'independent-popx-v1',implementationStatus:'math-tested-not-financially-verified',
 theme:{name:'Prism Pulse',colors:['#38155d','#e879f9','#fbbf24'],symbols:['Pulse','Prism','Spark']},
 limits:{minBetMinor:'10',maxBetMinor:'100000',betStepMinor:'10',maxWinMinor:'10000000'},
 ticketCount:1000000,returnBps:9500,maxMultiplierBps:1000000,growthBpsPerSecond:2000,
 rules:['This is an independently authored timed crash game, not the provider slot-board mechanic.','Play debits one stake and starts at 1.00×; an immediate loss is possible.','Collect uses the server-clock multiplier. If the hidden bust point has been reached, the entire stake is lost.','At 100.00×, surviving rounds collect automatically. Payouts floor to whole minor units.','The nominal 95% curve is our own design. Exact expected return depends on collection multiplier and integer rounding.'],
 nominalReturn:{numerator:'95',denominator:'100',type:'upper-bound-before-floor',proof:'For collection multiplier M in basis points, survival = floor(9500×1000000/(M+1))/1000000. Expected return = survival × floor(bet×M/10000)/bet, bounded above by 0.95.'},
 paytable:[{label:'At 1.10×',multiplierBps:11000},{label:'At 2.00×',multiplierBps:20000},{label:'At 5.00×',multiplierBps:50000},{label:'Maximum',multiplierBps:1000000}],
 provenance:{catalog:'Official catalog name/category only.',observed:'Official demo showed two betting panels, multiplier history and a demo balance; no completed PopX round was verified.',designed:'Original clock curve, hidden distribution, limits, interface theme and all mathematics; no provider source or media reused.'}
};
