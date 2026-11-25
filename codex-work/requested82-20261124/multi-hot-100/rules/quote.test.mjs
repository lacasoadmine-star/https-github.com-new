import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteM100Grid,M100_PUBLIC_COEFFICIENTS} from './quote.mjs';

const currentBoard=[
 ['orange','orange','orange','watermelon','bell'],
 ['orange','orange','orange','orange','bell'],
 ['lemon','orange','orange','orange','bell'],
 ['lemon','orange','cherry','orange','plum'],
];

test('current separately observed winning board quotes exactly 12.60 DMO at 1 DMO and 3x',()=>{
 const result=quoteM100Grid({grid:currentBoard,betMinor:100n,multiplier:3});
 assert.equal(result.lines.length,49);assert.equal(result.baseMinor,420n);assert.equal(result.winMinor,1260n);
 assert.equal(result.lines.find(line=>line.lineId===46).winMinor,15n);
 assert.equal(result.lines.filter(line=>line.count===3).reduce((sum,line)=>sum+line.baseMinor,0n),70n);
 assert.equal(result.lines.filter(line=>line.count===4).reduce((sum,line)=>sum+line.baseMinor,0n),350n);
});

test('all-sevens maximum reaches 2500 times stake without clipping or counting shorter prefixes',()=>{
 const grid=Array.from({length:4},()=>Array(5).fill('seven'));
 const quote=quoteM100Grid({grid,betMinor:200n,multiplier:5});
 assert.equal(quote.lines.length,100);assert.ok(quote.lines.every(line=>line.count===5));
 assert.equal(quote.baseMinor,100000n);assert.equal(quote.winMinor,500000n);
});

test('current public 2 DMO preview coefficients scale every symbol 3/4/5 award exactly',()=>{
 const expected={seven:[40n,400n,1000n],bell:[30n,200n,400n],grapes:[20n,100n,200n],watermelon:[20n,100n,200n],
  cherry:[10n,20n,100n],orange:[10n,20n,100n],plum:[10n,20n,100n],lemon:[10n,20n,100n]};
 for(const[symbol,awards]of Object.entries(expected))for(let count=3;count<=5;count++) {
  const other=symbol==='lemon'?'bell':'lemon';
  const grid=Array.from({length:4},()=>Array.from({length:5},(_,column)=>column<count?symbol:other));
  const result=quoteM100Grid({grid,betMinor:200n,multiplier:1});
  assert.equal(result.lines.length,100);assert.ok(result.lines.every(line=>line.count===count&&line.baseMinor===awards[count-3]));
  assert.equal(result.baseMinor,awards[count-3]*100n);
 }
});

test('broken first pair never pays a later sequence and multiplier applies once',()=>{
 const grid=Array.from({length:4},()=>['bell','orange','orange','orange','orange']);
 const result=quoteM100Grid({grid,betMinor:100n,multiplier:5});
 assert.equal(result.winMinor,0n);assert.equal(result.lines.length,0);
 for(let multiplier=1;multiplier<=5;multiplier++)assert.equal(quoteM100Grid({grid:currentBoard,betMinor:200n,multiplier}).winMinor,840n*BigInt(multiplier));
});

test('unknown minor-unit rounding is rejected rather than rounded into a payout',()=>{
 assert.throws(()=>quoteM100Grid({grid:currentBoard,betMinor:1n,multiplier:3}),/FRACTIONAL_MINOR/);
 for(const betMinor of [0n,-1n,100,1.00,'100',NaN])assert.throws(()=>quoteM100Grid({grid:currentBoard,betMinor,multiplier:1}),/STAKE/);
 for(const multiplier of [0,6,1.5,'3',undefined])assert.throws(()=>quoteM100Grid({grid:currentBoard,betMinor:100n,multiplier}),/MULTIPLIER/);
});

test('arbitrarily large exact integer stakes do not overflow or modify caller data',()=>{
 const before=JSON.stringify(currentBoard),stake=10n**30n;
 const quote=quoteM100Grid({grid:currentBoard,betMinor:stake,multiplier:3});
 assert.equal(quote.winMinor,stake*126n/10n);assert.equal(JSON.stringify(currentBoard),before);
 assert.throws(()=>{quote.lines[0].winMinor=1n;},TypeError);
 assert.equal(quote.quoteOnly,true);assert.equal(quote.settlementValidated,false);assert.equal(quote.providerProbabilityModel,false);
});
