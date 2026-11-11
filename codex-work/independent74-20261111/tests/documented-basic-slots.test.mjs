import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as math from '../math/official72.mjs';
import {configureDocumentedBasicSlot,sameReelWildReturn} from '../math/documented-basic-slots.mjs';
import {evaluatePublicWildGrid,substituteWildColumns} from '../math/official72-mechanics.mjs';

const ids=['hotsamba','baoslot5x','farmsfortune','draculasfortune','dicejungle'].map(s=>'ind74_official_'+s);
const versions=[3,4,4,3,4];
const definition=id=>math.getGameDefinition(id);
const fixtureRng=(d,grid,factor=1)=>{
  let cell=0,preSpin=d.multiplierSelectionTiming==='before-symbol-grid';
  return bound=>{
    if(preSpin){preSpin=false;assert.equal(bound,d.multiplierValues.length);return d.multiplierValues.indexOf(factor);}
    assert.ok(cell<d.rows*d.cols,'No unknown multiplier draw follows the grid.');
    const id=grid[Math.floor(cell/d.cols)][cell++%d.cols];
    const index=d.symbols.findIndex(symbol=>symbol.id===id);
    if(index>=0)return index;
    assert.equal(id,d.wildSymbol.id);assert.equal(bound,d.symbols.length*32+1);
    return d.symbols.length*32;
  };
};

test('five isolated title configs cite exact Help, bump versions and block unreviewed financial admission',async()=>{
  const {captions}=JSON.parse(await readFile(new URL('../references/official-slot-help-en-20261111.json',import.meta.url),'utf8'));
  for(const [index,id] of ids.entries()){
    const d=definition(id);
    assert.equal(d.mathVersion,'official72-'+id.slice('ind74_official_'.length)+'-r'+versions[index]);
    assert.equal(d.gamble.enabled,true);assert.equal(d.gamble.maxRounds,3);
    assert.match(captions[d.gamble.captionKey],/red and black/);
    assert.match(captions[d.documentedMultiplier.captionKey],/multiplier/i);
    if(d.documentedMultiplier.completeValuesVerified){
      assert.match(captions[d.documentedMultiplier.captionKey],/1x[\s\S]*2x[\s\S]*3x[\s\S]*4x[\s\S]*5x/);
    }else assert.match(captions[d.documentedMultiplier.captionKey],/Before the reel spin starts/);
    if(d.wildRule?.substitutionScope==='same-reel'){
      assert.match(captions[d.wildRule.captionKey],/2nd, 3rd and 4th reels/);
      assert.match(captions[d.wildRule.captionKey],/all symbols on the same reel, except Scatter symbol/);
    }
    assert.equal(d.releaseReview.realMoneyAdmissionBlocked,true);
    assert.ok(d.releaseReview.codes.includes('INDEPENDENT_RETURN_ABOVE_STAKE'));
    const proof=d.releaseReview.independentAnalyticReturn;
    assert.ok(BigInt(proof.numerator)>BigInt(proof.denominator));
    assert.match(d.rules.join(' '),/REAL-MONEY ADMISSION IS BLOCKED/);
    assert.equal(d.modelDisclosure.providerPrivateMathVerified,false);
  }
});

for(const id of ids.slice(0,3)){
  test(id+' draws its opted-in factor before the grid and applies it exactly once',()=>{
    const d=definition(id),grid=Array.from({length:d.rows},()=>Array(d.cols).fill(d.symbols[0].id));
    for(const factor of [1,2,3,4,5]){
      const bounds=[],next=fixtureRng(d,grid,factor);
      const r=math.startRound({gameId:id,betMinor:'2000',rng:bound=>{bounds.push(bound);return next(bound);}});
      assert.equal(bounds[0],5);assert.equal(bounds.length,d.rows*d.cols+1);
      assert.equal(r.outcome.reelMultiplier,factor);
      assert.equal(r.betMinor,'2000');
      const perLine=2000n*BigInt(d.symbols[0].pays[d.cols])/BigInt(d.paylines.length);
      assert.equal(r.winMinor,(perLine*BigInt(d.paylines.length)*BigInt(factor)).toString());
      assert.equal(r.outcome.lineWins.reduce((sum,line)=>sum+BigInt(line.winMinor),0n).toString(),r.winMinor);
      assert.deepEqual(r.outcome.grid,grid);
    }
    assert.deepEqual(d.multiplierValues,[1,2,3,4,5]);
    if(id!=='ind74_official_farmsfortune'){
      assert.equal(d.layout.multiplier.placement,'left-reel');
      assert.deepEqual(d.layout.multiplier.documentedValues,[1,2,3,4,5]);
      assert.equal(d.layout.multiplier.completeLabelsVerified,true);
    }else{
      assert.equal(d.layout.multiplier.completeLabelsVerified,false);
      assert.match(d.rules.join(' '),/does not verify the numeric pool/);
    }
  });
}

for(const id of ids.slice(3)){
  test(id+' substitutes all landed eligible reels even when the unexpanded grid has no winning line',()=>{
    const d=definition(id),a=d.symbols[0].id,b=d.symbols[1].id,w=d.wildSymbol.id;
    const grid=Array.from({length:d.rows},()=>[a,b,b,b,a]);
    grid[0][1]=w;grid[1][2]=w;grid[2][3]=w;
    assert.equal(evaluatePublicWildGrid(d,'100',grid).winMinor,'0');
    const r=math.startRound({gameId:id,betMinor:'100',rng:fixtureRng(d,grid)});
    assert.deepEqual(r.outcome.originalGrid,grid);
    assert.deepEqual(r.outcome.expandedColumns,[1,2,3]);
    assert.deepEqual(r.outcome.grid,Array.from({length:3},()=>[a,w,w,w,a]));
    assert.equal(r.winMinor,(100n*BigInt(d.symbols[0].pays[5])).toString());
    assert.equal(r.outcome.reelMultiplier,undefined);
    assert.equal(d.multiplierValues,undefined);
    assert.equal(d.layout.multiplier.calculationImplemented,false);
    assert.deepEqual(d.documentedMultiplier.values,[]);
    assert.equal(d.documentedMultiplier.completeValuesVerified,false);
    assert.match(d.rules.join(' '),/numeric feature remains unavailable/);
    const visible=math.publicRound(r);visible.outcome.originalGrid[0][1]='edited';
    assert.equal(r.outcome.originalGrid[0][1],w);
  });

  test(id+' permits substitute reels2–4 only and preserves an explicitly excluded Scatter cell',()=>{
    const d=definition(id),a=d.symbols[0].id,w=d.wildSymbol.id,grid=Array.from({length:3},()=>Array(5).fill(a));
    for(const col of [0,4]){
      const invalid=structuredClone(grid);invalid[0][col]=w;
      assert.throws(()=>evaluatePublicWildGrid(d,'100',invalid),{code:'INVALID_GRID'});
      assert.throws(()=>substituteWildColumns(d,grid,[col]),{code:'INVALID_GRID'});
    }
    const withBlocker={...d,blockerSymbols:['test-scatter']};
    grid[0][2]=w;grid[1][2]='test-scatter';
    const before=structuredClone(grid),expanded=substituteWildColumns(withBlocker,grid,[2]);
    assert.equal(expanded[1][2],'test-scatter');assert.equal(expanded[2][2],w);
    assert.deepEqual(grid,before);
    assert.equal(d.scatterSymbol,undefined,'No unverified Scatter prize is generated.');
  });
}

for(const id of ids){
  test(id+' reserves the complete held award, preserves one stake and rejects numeric-feature injection',()=>{
    const d=definition(id),best=d.symbols.reduce((a,b)=>a.pays[d.cols]>b.pays[d.cols]?a:b);
    const factor=Math.max(...(d.multiplierValues??[1]));
    const grid=Array.from({length:d.rows},()=>Array(d.cols).fill(best.id));
    for(const betMinor of ['100','2000','5000000',d.limits.maxBetMinor]){
      const args={gameId:id,betMinor,options:{holdWin:true}};
      const r=math.startRound({...args,rng:fixtureRng(d,grid,factor)});
      const repeat=math.startRound({...args,rng:fixtureRng(d,grid,factor)});
      assert.deepEqual(r,repeat);
      const base=math.maximumPayoutMinor({gameId:id,betMinor});
      assert.equal(r.pendingWinMinor,base);assert.equal(r.winMinor,'0');
      assert.equal(math.maximumPayoutMinor(args),(BigInt(base)*8n).toString());
      assert.ok(BigInt(base)*8n<=999999999999999n);
      const collected=math.collectRound(r);assert.equal(collected.winMinor,base);assert.equal(collected.betMinor,betMinor);
      let current=r;
      for(let i=0;i<3;i++)current=math.advanceRound(current,{color:'red'},undefined,()=>0);
      assert.equal(current.status,'collected');assert.equal(current.betMinor,betMinor);
      assert.equal(current.winMinor,(BigInt(base)*8n).toString());
      assert.throws(()=>math.collectRound(current),{code:'ROUND_FINISHED'});
    }
    for(const options of [{multiplier:5},{reelMultiplier:5},{wildColumns:[1,2,3]},{scatterPrize:1000},{pendingWinMinor:'1000'},{holdWin:'true'}]){
      let draws=0;
      assert.throws(()=>math.startRound({gameId:id,betMinor:'100',options,rng:()=>{draws++;return 0;}}),{code:'INVALID_OPTIONS'});
      assert.equal(draws,0);
    }
  });
}

test('Hot/Bao return proofs retain their authored symbol prizes and disclose the factor-induced excess',()=>{
  const hot=definition(ids[0]),bao=definition(ids[1]);
  assert.deepEqual([hot.releaseReview.independentAnalyticReturn.numerator,hot.releaseReview.independentAnalyticReturn.denominator],['2961','1024']);
  assert.deepEqual([bao.releaseReview.independentAnalyticReturn.numerator,bao.releaseReview.independentAnalyticReturn.denominator],['3','2']);
  assert.equal(hot.symbols[0].pays[5],1029);assert.equal(bao.symbols[0].pays[3],25);
});

test('same-reel expectation agrees with exhaustive weighted column outcomes, including nonwinning landed Wilds',()=>{
  for(const id of ids.slice(3)){
    const d=definition(id),proof=sameReelWildReturn(d);
    const regularColumnWeight=256n**3n,wildColumnWeight=8n*(257n**3n-regularColumnWeight);
    const weight=Array(8).fill(regularColumnWeight).concat(wildColumnWeight);
    let expectedNumerator=0n;
    // Independently enumerate all8 first symbols ×9^3 middle outcomes ×8 last.
    // Index8 is a reel containing at least one substitute, regardless of row.
    for(let first=0;first<8;first++)for(let a=0;a<9;a++)for(let b=0;b<9;b++)for(let c=0;c<9;c++)for(let last=0;last<8;last++){
      const line=[first,a,b,c,last];let count=1;
      while(count<5&&(line[count]===first||line[count]===8))count++;
      const prize=d.symbols[first].pays[count]??0;
      expectedNumerator+=BigInt(prize)*weight[a]*weight[b]*weight[c];
    }
    const expectedDenominator=64n*(8n*257n**3n)**3n;
    assert.equal(BigInt(proof.numerator)*expectedDenominator,expectedNumerator*BigInt(proof.denominator));
    assert.equal(proof.bound,'exact');
  }
});

test('Farm review proof is a lower bound that excludes every Wild-containing board',()=>{
  const d=definition(ids[2]),proof=d.releaseReview.independentAnalyticReturn;
  assert.equal(proof.bound,'lower');assert.match(proof.scope,/no-Wild-board/);
  const regular=d.symbols.reduce((sum,s)=>sum+56n*BigInt(s.pays[3])+7n*BigInt(s.pays[4])+BigInt(s.pays[5]),0n);
  assert.equal(BigInt(proof.numerator)*(32768n*5n*257n**9n),BigInt(proof.denominator)*regular*15n*256n**9n);
});

test('the new configurator rejects other/protected titles without mutating input',()=>{
  for(const id of ['ind74_official_multihot5','ind74_official_foxyhot20','ind74_official_multihot10']){
    const d={id,family:'slots',rules:[]},before=structuredClone(d);
    assert.throws(()=>configureDocumentedBasicSlot(d,id),TypeError);assert.deepEqual(d,before);
  }
});
