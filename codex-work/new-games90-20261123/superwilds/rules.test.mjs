import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteGrid,PAYLINES,REFERENCE_ONLY} from './rules.mjs';
const grid = () => Array.from({length:5},(_,i) => ['lemon','orange','plum'].map((s,j) => ['lemon','orange','plum','cherry','bell'][(i+j)%5]));

test('synthetic mixed symbols cannot create a nonadjacent or right-to-left payout', () => {
  const g=grid();g[2][1]=g[3][1]=g[4][1]='seven';
  const q=quoteGrid({grid:g,betMinor:10,multiplier:5});
  assert.equal(q.winningLines.some(x=>x.line===1),false);
});
test('refreshed own0.20 paytable values quoted per selected line', () => {
  const expected={wild:[60,200,800],seven:[60,200,800],grapes:[40,80,400],watermelon:[20,40,200],bell:[20,40,200],lemon:[10,20,100],plum:[10,20,100],orange:[10,20,100],cherry:[10,20,100]};
  for(const [symbol,values] of Object.entries(expected)) for(const count of [3,4,5]) {
    const g=grid();for(let c=0;c<count;c++)g[c][1]=symbol;
    if(count<5)g[count][1]=symbol==='wild'?'lemon':symbol==='seven'?'bell':'seven';
    if(symbol==='wild'&&count===3)g[4][1]='plum';
    const quote=quoteGrid({grid:g,betMinor:20,multiplier:1});
    assert.equal(quote.winningLines.find(x=>x.line===1)?.winMinor,values[count-3],`${symbol}:${count}`);
  }
});
test('single WILD substitutes without expanding its reel or mutating source',()=>{
  const g=grid();g[0][1]='seven';g[1][1]='wild';g[2][1]='seven';g[3][1]='lemon';
  const before=JSON.stringify(g),q=quoteGrid({grid:g,betMinor:20,multiplier:3});
  assert.deepEqual(q.winningLines.find(x=>x.line===1),{line:1,rows:[1,1,1,1,1],symbol:'seven',count:3,winMinor:180});
  assert.equal(JSON.stringify(g),before);
});
test('each line pays only its highest candidate; allwild theoretical maximum matches1000x',()=>{
  const q=quoteGrid({grid:Array.from({length:5},()=>['wild','wild','wild']),betMinor:20,multiplier:5});
  assert.equal(q.winningLines.length,5);assert.equal(q.winMinor,20*1000);
  assert.deepEqual(PAYLINES,[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2]]);
});
test('rejects guessed rounding, invalid shapes, unknown symbols and overflow',()=>{
  const g=grid();g[0][1]=g[1][1]=g[2][1]='orange';g[3][1]='seven';
  assert.throws(()=>quoteGrid({grid:g,betMinor:1,multiplier:1}),/FRACTIONAL/);
  assert.throws(()=>quoteGrid({grid:[[]],betMinor:20,multiplier:1}),/GRID/);
  assert.throws(()=>quoteGrid({grid:grid(),betMinor:20,multiplier:6}),/MULTIPLIER/);
  assert.throws(()=>quoteGrid({grid:Array.from({length:5},()=>['wild','wild','wild']),betMinor:Number.MAX_SAFE_INTEGER,multiplier:5}),/OVERFLOW|FRACTIONAL/);
});
test('observed quote never advertises financial validation or recovered providerRTP',()=>{
  const q=quoteGrid({grid:grid(),betMinor:20,multiplier:1});
  assert.equal(q.referenceQuoteOnly,true);assert.equal(q.settlementValidated,false);
  assert.equal(REFERENCE_ONLY.probabilityModelVerified,false);assert.equal(REFERENCE_ONLY.cashEnabled,false);
});
