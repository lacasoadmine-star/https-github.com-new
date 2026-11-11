import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import * as math from '../math/official72.mjs';
const games=['multihot10','multihot20'].map(name=>math.getGameDefinition('ind74_official_'+name));

test('fresh MH10/MH20 displayed symbol prizes are isolated, versioned and preserve the unresolved published maximum coupling',async()=>{
  const help=JSON.parse(await readFile(new URL('../references/official-slot-help-en-20261111.json',import.meta.url),'utf8')).captions;
  for(const d of games){
    assert.equal(d.mathVersion,'official72-'+d.id.slice(15)+'-r4');assert.equal(d.layout.multiplier.placement,'top-arc');
    await access(new URL('../'+d.observedPaytable.source,import.meta.url));
    assert.equal(d.observedPaytable.maximumCouplingVerified,false);assert.equal(d.observedPaytable.publishedMaximumMultiplier,1000);
    assert.equal(help['help.slots.'+d.id.slice(15)+'.xxxxx.win'],'1000 X');
    const prize=id=>d.symbols.find(s=>s.id.endsWith('-'+id)).pays;
    assert.deepEqual(prize('seven'),d.paylines.length===10?{3:50,4:200,5:1000}:{3:50,4:400,5:2000});
    assert.deepEqual(prize('bell'),{3:20,4:100,5:200});
    for(const name of ['grape','watermelon'])assert.deepEqual(prize(name),{3:10,4:50,5:100});
    for(const name of ['lemon','plum','orange','cherry'])assert.deepEqual(prize(name),{3:5,4:10,5:50});
  }
});

test('observed plum/lemon/grape line awards scale from the total stake before the server multiplier and stay held until collect',()=>{
  for(const[d,name,factor,total]of [[games[0],'plum',4,'1000'],[games[0],'lemon',1,'1000'],[games[1],'grape',2,'2000']]){
    const symbolIndex=d.symbols.findIndex(s=>s.id.endsWith('-'+name));
    const cells=Array.from({length:15},(_,i)=>i%5),line=d.paylines.findIndex(path=>path.every(row=>row===2));
    cells[10]=symbolIndex;cells[11]=symbolIndex;cells[12]=symbolIndex;cells[13]=(symbolIndex+1)%8;cells[14]=(symbolIndex+2)%8;
    let cursor=0;const r=math.startRound({gameId:d.id,betMinor:total,options:{holdWin:true},rng:()=>cursor<15?cells[cursor++]:factor-1});
    const win=r.outcome.lineWins.find(item=>item.lineIndex===line);
    assert.equal(win.matches,3);assert.equal(win.symbolId,d.symbols[symbolIndex].id);
    const expected=BigInt(total)*BigInt(d.symbols[symbolIndex].pays[3])/BigInt(d.paylines.length)*BigInt(factor);
    assert.equal(win.winMinor,expected.toString());assert.equal(r.winMinor,'0');assert.equal(r.betMinor,total);
    assert.deepEqual(math.publicRound(r).allowedActions,['gamble','collect']);assert.equal(math.collectRound(r).winMinor,r.pendingWinMinor);
  }
});

test('conservative reserves cover all-five-seven boards and every optional double without silently forcing the provider1000x claim',()=>{
  for(const d of games){
    let draws=0;let r=math.startRound({gameId:d.id,betMinor:'2000',options:{holdWin:true},rng:()=>draws++<15?0:4});
    const base=2000n*BigInt(d.symbols[0].pays[5])*5n;
    assert.equal(r.pendingWinMinor,base.toString());assert.ok(base>2000n*1000n);
    const maximum=math.maximumPayoutMinor({gameId:d.id,betMinor:'2000',options:{holdWin:true}});
    assert.equal(maximum,(base*8n).toString());
    for(let count=0;count<3;count++)r=math.advanceRound(r,{color:'red'},undefined,()=>0);
    assert.equal(r.winMinor,maximum);assert.equal(r.status,'collected');
    assert.ok(BigInt(math.maximumPayoutMinor({gameId:d.id,betMinor:d.limits.maxBetMinor,options:{holdWin:true}}))<=999999999999999n);
  }
});

test('independent analytic return remains disclosed instead of being replaced by the provider RTP',()=>{
  assert.deepEqual([games[0].nominalReturn.numerator,games[0].nominalReturn.denominator],['162600','163840']);
  assert.deepEqual([games[1].nominalReturn.numerator,games[1].nominalReturn.denominator],['198600','163840']);
  assert.ok(BigInt(games[1].nominalReturn.numerator)>BigInt(games[1].nominalReturn.denominator),
    'The current uniform MH20 model requires distribution review before real-money admission.');
  assert.ok(games.every(d=>d.modelDisclosure.providerPrivateMathVerified===false));
});

test('every currently identified above-stake independent return has an explicit release block and preserves its actual arithmetic',()=>{
  for(const suffix of ['multihot20','multihotways','dragonscode']){
    const d=math.getGameDefinition('ind74_official_'+suffix),review=d.releaseReview;
    assert.equal(review.realMoneyAdmissionBlocked,true);assert.ok(review.codes.includes('INDEPENDENT_RETURN_ABOVE_STAKE'));
    assert.equal(review.independentAnalyticReturn.numerator,d.nominalReturn.numerator);
    assert.equal(review.independentAnalyticReturn.denominator,d.nominalReturn.denominator);
    assert.ok(BigInt(d.nominalReturn.numerator)>BigInt(d.nominalReturn.denominator));
    assert.match(d.rules.join(' '),/REAL-MONEY ADMISSION IS BLOCKED/);
    assert.match(d.implementationStatus,/admission-blocked/);
  }
});
