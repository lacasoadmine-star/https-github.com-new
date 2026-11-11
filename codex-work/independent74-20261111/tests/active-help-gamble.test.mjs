import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as math from '../math/official72.mjs';
const ids=['ind74_official_vampires','ind74_official_bookoffuturia'];
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const withoutComments=html=>html.replace(/<!--[\s\S]*?-->/g,'');

test('Vampires X2 uses an active title caption and excludes the commented Dark bonus schedule',async()=>{
  const d=math.getGameDefinition(ids[0]),html=await read(d.gamble.helpDocument),active=withoutComments(html);
  const {captions}=JSON.parse(await read(d.gamble.evidenceFile));
  assert.equal(d.mathVersion,'official72-vampires-r3');
  assert.equal(d.gamble.captionKey,'help.slots.vampires.riskGame.description');
  assert.ok(active.includes('data-caption="'+d.gamble.captionKey+'"'));
  assert.match(captions[d.gamble.captionKey],/RED or BLACK/);
  assert.match(captions[d.gamble.captionKey],/doubled\(X2\)/);
  assert.match(captions[d.gamble.captionKey],/amount is lost/);
  assert.ok(html.includes('help.slots.dark.bonusSymbol.description'));
  assert.equal(active.includes('help.slots.dark.bonusSymbol.description'),false);
  assert.equal(captions['help.slots.dark.bonusSymbol.description'],undefined);
  assert.equal(d.gamble.providerCollectControlVerified,false);
  assert.equal(d.wildSymbol,undefined);assert.equal(d.scatterSymbol,undefined);assert.equal(d.jungleFeature,undefined);
  assert.match(d.rules.join(' '),/transformation mechanics remain unimplemented/);
});

test('Book of Futuria ordinary red/black X2 is a separate active caption from paid B+ Bonus Risk',async()=>{
  const d=math.getGameDefinition(ids[1]),active=withoutComments(await read(d.gamble.helpDocument));
  const {captions}=JSON.parse(await read(d.gamble.evidenceFile));
  assert.equal(d.mathVersion,'official72-bookoffuturia-r3');
  assert.equal(d.gamble.captionKey,'help.slot.bookoffuturia.x2.description');
  for(const key of [d.gamble.captionKey,'help.slot.bookoffuturia.bonus.description'])
    assert.ok(active.includes('data-caption="'+key+'"'));
  assert.match(captions[d.gamble.captionKey],/red and black/);
  assert.match(captions[d.gamble.captionKey],/Take Win/);
  assert.match(captions['help.slot.bookoffuturia.bonus.description'],/cost of a Bonus Risk game spin/);
  assert.equal(d.bookFeature,undefined);assert.equal(d.wildSymbol,undefined);assert.equal(d.scatterSymbol,undefined);
  assert.match(d.rules.join(' '),/supports only the ordinary held-award X2/);
});

for(const gameId of ids){
  test(gameId+' keeps regular math, debits once and reserves the complete optional three-step X2',()=>{
    const d=math.getGameDefinition(gameId),best=d.symbols.reduce((a,b)=>a.pays[5]>b.pays[5]?a:b),index=d.symbols.indexOf(best);
    assert.equal(d.releaseReview.realMoneyAdmissionBlocked,true);
    assert.ok(d.releaseReview.codes.includes('PUBLIC_MECHANICS_INCOMPLETE'));
    assert.equal(d.multiplierValues,undefined);
    for(const betMinor of ['100','2000','4000100',d.limits.maxBetMinor]){
      let draws=0;
      const held=math.startRound({gameId,betMinor,options:{holdWin:true},rng:bound=>{assert.equal(bound,8);draws++;return index;}});
      assert.equal(draws,d.rows*d.cols);
      const expected=BigInt(d.paylines.length)*(BigInt(betMinor)*BigInt(best.pays[5])/BigInt(d.paylines.length));
      assert.equal(held.pendingWinMinor,expected.toString());assert.equal(held.winMinor,'0');
      assert.equal(math.maximumPayoutMinor({gameId,betMinor,options:{holdWin:true}}),(expected*8n).toString());
      assert.ok(expected*8n<=999999999999999n);
      const direct=math.startRound({gameId,betMinor,rng:()=>index});
      assert.equal(direct.winMinor,expected.toString());assert.equal(direct.status,'collected');
      const immediately=math.collectRound(held);assert.equal(immediately.winMinor,expected.toString());
      let r=held;for(let attempt=0;attempt<3;attempt++)r=math.advanceRound(r,{color:'red'},undefined,()=>0);
      assert.equal(r.winMinor,(expected*8n).toString());assert.equal(r.pendingWinMinor,'0');assert.equal(r.betMinor,betMinor);
      assert.throws(()=>math.collectRound(r),{code:'ROUND_FINISHED'});
      const lost=math.advanceRound(held,{color:'black'},undefined,()=>0);
      assert.equal(lost.status,'lost');assert.equal(lost.winMinor,'0');assert.equal(lost.betMinor,betMinor);
    }
  });
  test(gameId+' rejects unimplemented bonus, progress, paid-risk and outcome inputs before RNG',()=>{
    for(const options of [{mode:'buy100'},{buyBonus:true},{bonusBet:true},{progress:100},{riskSpin:true},{freeSpins:10},{color:'red'},{winMinor:'100000'}]){
      let calls=0;assert.throws(()=>math.startRound({gameId,betMinor:'100',options,rng:()=>{calls++;return 0;}}),{code:'INVALID_OPTIONS'});
      assert.equal(calls,0);
    }
  });
}

test('Mad Slot remains without an invented red/black X2 based on its different Bonus Risk captions',()=>{
  const d=math.getGameDefinition('ind74_official_madslot');
  assert.equal(d.gamble,undefined);
  assert.throws(()=>math.startRound({gameId:d.id,betMinor:'100',options:{holdWin:true},rng:()=>0}),{code:'INVALID_OPTIONS'});
});
