import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';

const id = 'ind74_official_mineisland';
const multipliers = [11000,12000,15000,20000,30000,50000,100000,200000,500000,1000000];

test('Mine Island uses the linked official demo ten-platform ladder instead of a rectangular mine-picker', () => {
  const d = math.getGameDefinition(id);
  assert.equal(d.mathVersion,'official72-mineisland-r3');
  assert.equal(d.family,'ladder');
  assert.equal(d.layout.kind,'ladder');
  assert.equal(d.layout.steps,10);
  assert.equal(d.layout.geometryVerified,true);
  assert.equal(d.layout.stepCountVerified,true);
  assert.deepEqual(d.layout.observedDefaultMultipliersBps,multipliers);
  assert.deepEqual(d.multipliersBps,multipliers);
  assert.equal(d.maximumMultiplierBps,1000000);
  for(const key of ['rows','cols','cells','mines','maxPicks'])assert.equal(d[key],undefined,key);
  assert.deepEqual(d.modes,['easy']);
  assert.match(d.rules.join(' '),/Source conflict/);
  assert.match(d.rules.join(' '),/continuation controls remain unverified/);
  assert.equal(d.modelDisclosure.providerPrivateMathVerified,false);
  assert.throws(()=>math.startRound({gameId:id,betMinor:'100',options:{mode:'hard'},rng:()=>0}),{code:'INVALID_MODE'});
});

test('Play resolves first jump, every confirmed platform collects exact integer money, and the final jump settles once', () => {
  for(const betMinor of ['100','2000','5000000']) {
    const started = math.startRound({gameId:id,betMinor,rng:()=>0});
    assert.equal(started.step,1);
    assert.equal(started.status,'active');
    assert.equal(started.multiplierBps,11000);
    let round=started;
    const liability=math.maximumPayoutMinor({gameId:id,betMinor});
    assert.equal(liability,(BigInt(betMinor)*100n).toString());
    for(let step=1;step<=10;step++) {
      assert.equal(round.step,step);
      const expected=(BigInt(betMinor)*BigInt(multipliers[step-1])/10000n).toString();
      const publicState=math.publicRound(round);
      assert.equal(publicState.private,undefined);
      assert.equal(publicState.mineCells,undefined);
      if(step<10) {
        assert.equal(publicState.collectibleMinor,expected);
        const collected=math.collectRound(round);
        assert.equal(collected.winMinor,expected);
        assert.throws(()=>math.collectRound(collected),{code:'ROUND_FINISHED'});
        round=math.advanceRound(round,{cell:step});
      }else{
        assert.equal(round.status,'collected');
        assert.equal(round.winMinor,expected);
        assert.equal(round.winMinor,liability);
        assert.throws(()=>math.advanceRound(round,{cell:9}),{code:'ROUND_FINISHED'});
      }
    }
  }
});

test('observed possible first-jump loss has no collectible award and no future survival state in its public result', () => {
  const lost=math.startRound({gameId:id,betMinor:'100',rng:bound=>bound-1});
  assert.equal(lost.status,'lost');
  assert.equal(lost.winMinor,'0');
  assert.equal(lost.step,1);
  const view=math.publicRound(lost);
  assert.equal(view.collectibleMinor,'0');
  assert.deepEqual(view.allowedActions,[]);
  assert.equal(view.private,undefined);
  assert.throws(()=>math.collectRound(lost),{code:'ROUND_FINISHED'});
});

test('Mine Island2 already resolves the first EASY step and remains separately identified', () => {
  const id2='ind74_official_mineisland2',d=math.getGameDefinition(id2);
  assert.notEqual(d.mathVersion,math.getGameDefinition(id).mathVersion);
  assert.equal(d.family,'ladder');
  assert.equal(d.layout.geometryVerified,true);
  assert.deepEqual(d.layout.observedDefaultMultipliersBps,multipliers);
  const first=math.startRound({gameId:id2,betMinor:'100',options:{mode:'easy'},rng:()=>0});
  assert.equal(first.step,1);
  assert.equal(math.publicRound(first).collectibleMinor,'110');
});
