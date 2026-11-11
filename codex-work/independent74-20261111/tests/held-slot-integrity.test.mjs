import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {freshChargingContext} from './support/charging-wilds-fixtures.mjs';

const definitions=math.listGameDefinitions().filter(d=>d.gamble?.enabled);
const held=d=>math.startRound({gameId:d.id,betMinor:'2000',options:{holdWin:true},
  context:freshChargingContext(d,'2000',{holdWin:true}),rng:bound=>bound===5?4:0});

for(const phase of ['initial-held','successful-gamble','failed-gamble','collected','final-auto-collected']){
  test('every held-slot engine validates display multiplier integrity after '+phase,()=>{
    assert.ok(definitions.length>=24);
    for(const d of definitions){
      let r=held(d);assert.equal(r.status,'active',d.id);
      if(phase==='successful-gamble')r=math.advanceRound(r,{color:'red'},undefined,()=>0);
      else if(phase==='failed-gamble')r=math.advanceRound(r,{color:'red'},undefined,()=>1);
      else if(phase==='collected')r=math.collectRound(r);
      else if(phase==='final-auto-collected')for(let i=0;i<3;i++)r=math.advanceRound(r,{color:'red'},undefined,()=>0);
      const amount=r.status==='active'?r.pendingWinMinor:r.winMinor;
      const expected=Number(BigInt(amount)*10000n/BigInt(r.betMinor));
      assert.equal(math.publicRound(r).multiplierBps,expected,d.id);
      const altered=structuredClone(r);altered.multiplierBps=expected+1;
      assert.throws(()=>math.publicRound(altered),{code:'INVALID_ROUND'},d.id);
      if(r.status==='active'){
        let draws=0;
        assert.throws(()=>math.advanceRound(altered,{color:'red'},undefined,()=>{draws++;return 0;}),{code:'INVALID_ROUND'},d.id);
        assert.equal(draws,0,d.id);assert.throws(()=>math.collectRound(altered),{code:'INVALID_ROUND'},d.id);
      }
    }
  });
}

test('zero-win held start must retain zero multiplier, and money/history checks remain independent of display consistency',()=>{
  const d=math.getGameDefinition('ind74_official_vampires');let cursor=0;
  const lost=math.startRound({gameId:d.id,betMinor:'100',options:{holdWin:true},rng:()=>cursor++%8});
  assert.equal(lost.status,'lost');assert.equal(lost.baseWinMinor,'0');assert.equal(math.publicRound(lost).multiplierBps,0);
  assert.throws(()=>math.publicRound({...lost,multiplierBps:1}),{code:'INVALID_ROUND'});
  const initial=held(d),doubled=math.advanceRound(initial,{color:'red'},undefined,()=>0),collected=math.collectRound(doubled);
  const badMoney=structuredClone(collected);badMoney.winMinor=String(BigInt(collected.winMinor)+1n);
  badMoney.multiplierBps=Number(BigInt(badMoney.winMinor)*10000n/BigInt(badMoney.betMinor));
  assert.throws(()=>math.publicRound(badMoney),{code:'INVALID_ROUND'});
  const badHistory=structuredClone(doubled);badHistory.gambleHistory[0].pendingBeforeMinor='1';
  assert.throws(()=>math.publicRound(badHistory),{code:'INVALID_ROUND'});
});
