import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {machineMarkup,machineGeometry} from '../client/machine74-renderer.mjs';

const id='ind74_official_poweroftiger';
test('Power of Tiger follows the observed nine-symbol grid and documented five-line count',()=>{
  const d=math.getGameDefinition(id),view=publicLibrary74Definition(d);
  assert.equal(d.mathVersion,'official72-poweroftiger-r4');
  assert.equal(d.rows,3);assert.equal(d.cols,3);
  assert.equal(d.paylines.length,5);
  assert.ok(d.paylines.every(path=>path.length===3&&path.every(row=>row>=0&&row<3)));
  assert.equal(d.layout.geometryVerified,true);
  assert.equal(d.layout.paylineCountVerified,true);
  assert.equal(d.layout.paylinesVerified,false,'The exact provider line chart is not established.');
  assert.deepEqual(machineGeometry(view),{rows:3,columns:3});
  assert.match(machineMarkup(view),/5 LINES/);
  assert.equal(d.layout.multiplier.calculationImplemented,true);
  assert.equal(d.layout.multiplier.condition,'identical-full-board-or-all-five-lines-win');
  assert.equal(d.multiplierValues,undefined);
  assert.match(d.rules.join(' '),/provider aggregation is not claimed as verified/);
});

test('a qualifying authored three-reel base award receives its selected documented factor and no untriggered respin payment',()=>{
  const d=math.getGameDefinition(id);
  const symbolIndex=d.symbols.reduce((best,symbol,index)=>symbol.pays[3]>d.symbols[best].pays[3]?index:best,0);
  for(const betMinor of ['100','2000','5000000']) {
    let calls=0;
    const round=math.startRound({gameId:id,betMinor,rng:bound=>calls++<9?symbolIndex:bound===4?0:1});
    const expected=5n*(BigInt(betMinor)*BigInt(d.symbols[symbolIndex].pays[3])/5n)*5n;
    assert.equal(round.outcome.grid.length,3);
    assert.ok(round.outcome.grid.every(row=>row.length===3));
    assert.equal(round.winMinor,expected.toString());
    assert.ok(BigInt(round.winMinor)<=BigInt(math.maximumPayoutMinor({gameId:id,betMinor})));
    assert.equal(round.outcome.baseMultiplier,5);
    assert.equal(round.outcome.bonusTriggered,false);
    assert.equal(round.outcome.reelMultiplier,undefined);
    assert.equal(round.status,'collected');
  }
});
