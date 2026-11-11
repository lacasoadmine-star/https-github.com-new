import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as math from '../math/official72.mjs';
import {BOOK_BONANZA_ID,evaluateBookBonanzaGrid,expandBookBonanzaSymbol} from '../math/book-of-bonanza.mjs';
import {bookRegularBoard,bookBoardDraws,bookBonusFeatureFixture} from './support/book-bonanza-fixtures.mjs';
import {finiteDraws} from './support/gates-merlyn-fixtures.mjs';
const d=math.getGameDefinition(BOOK_BONANZA_ID),start=args=>math.startRound({gameId:d.id,...args});
const rowGrid=cells=>Array.from({length:4},(_,row)=>cells.slice(row*6,row*6+6));
const ids=cells=>rowGrid(cells.map(cell=>cell==='B'?d.bookSymbol.id:d.symbols[cell].id));
const resolved=fixture=>{const rng=finiteDraws(fixture.draws),round=start({...fixture,rng});assert.equal(rng.remaining(),0);return round;};
const reordered=value=>Array.isArray(value)?value.map(reordered):value&&typeof value==='object'
  ?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reordered(v)])):value;

test('Book restores the observed6×4 base geometry and documents its independently chosen3-cell bonus window',async()=>{
  assert.equal(d.mathVersion,'official72-bookofbonanza-r4');assert.equal(d.slotMechanic,'book-free-spins');
  assert.equal(d.rows,4);assert.equal(d.cols,6);assert.equal(d.layout.geometryVerified,true);
  assert.equal(d.paylines.length,40);assert.ok(d.paylines.every(line=>line.length===6));assert.equal(d.layout.paylinesVerified,true);
  assert.equal(d.bookFeature.expansionRows,3);assert.equal(d.bookFeature.expansionGeometryVerified,false);
  assert.equal(d.bookFeature.triggerScatters,4);assert.equal(d.bookFeature.initialFreeSpins,10);assert.equal(d.bookFeature.retriggerScatters,3);
  assert.equal(d.bookFeature.retriggerFreeSpins,10);assert.equal(d.bookFeature.paytableVerified,true);assert.equal(d.gamble,undefined);
  assert.match(d.rules.join(' '),/Evidence conflict/);assert.match(d.rules.join(' '),/independent interpretations|independent implementation/);
  const help=JSON.parse(await readFile(new URL('../'+d.bookFeature.source,import.meta.url),'utf8')).captions;
  const texts=Object.entries(help).filter(([key])=>key.toLowerCase().startsWith('help.slots.bookofbonanza.')).map(([,text])=>text).join(' ');
  assert.match(texts,/10 free spins/i);assert.match(texts,/expanding/i);assert.match(texts,/5000/i);
});

test('Book substitutes for regular line symbols except the selected expanding bonus symbol',()=>{
  const board=Array.from({length:4},()=>[d.bookSymbol.id,d.symbols[0].id,d.symbols[0].id,...d.symbols.slice(1,4).map(s=>s.id)]);
  const base=evaluateBookBonanzaGrid(d,'2000',board),bonus=evaluateBookBonanzaGrid(d,'2000',board,d.symbols[0].id);
  assert.equal(base.lineWins.length,40);assert.ok(base.lineWins.every(line=>line.symbolId===d.symbols[0].id&&line.matches===3));
  assert.equal(bonus.winMinor,'0');assert.deepEqual(bonus.lineWins,[]);
  const other=evaluateBookBonanzaGrid(d,'2000',board,d.symbols[7].id);assert.equal(other.winMinor,base.winMinor);
  const allBooks=Array.from({length:4},()=>Array(6).fill(d.bookSymbol.id));
  const eligible=d.symbols.filter(symbol=>symbol.id!==d.symbols[0].id);
  const expected=40n*(2000n*BigInt(Math.max(...eligible.map(s=>s.pays[6])))/40n);
  assert.equal(evaluateBookBonanzaGrid(d,'2000',allBooks,d.symbols[0].id).winMinor,expected.toString());
});

test('selected-symbol expansion covers3cells on each eligible nonadjacent reel and preserves the fourth cell',()=>{
  const cells=bookRegularBoard();for(const position of [0,8,22])cells[position]=0;
  const board=ids(cells),expanded=expandBookBonanzaSymbol(d,'2000',board,d.symbols[0].id);
  assert.deepEqual(expanded.expandedColumns,[0,2,4]);assert.equal(expanded.expandedPositions.length,9);
  assert.equal(expanded.expandedGrid[3][0],board[3][0]);assert.equal(expanded.expandedGrid[0][2],board[0][2]);assert.equal(expanded.expandedGrid[0][4],board[0][4]);
  assert.ok(expanded.lineWins.length>0);assert.ok(expanded.lineWins.every(line=>[2,3].includes(line.matches)));
  assert.ok(expanded.lineWins.some(line=>line.matches===2),'The public two-Emperor prize also applies to lines missing one expansion window.');
  assert.ok(expanded.lineWins.some(line=>line.positions.map(p=>p.col).join(',')==='0,2,4'));
  assert.equal(expanded.winMinor,expanded.lineWins.reduce((sum,line)=>sum+BigInt(line.winMinor),0n).toString());
  cells[22]=5;assert.deepEqual(expandBookBonanzaSymbol(d,'2000',ids(cells),d.symbols[0].id).expandedColumns,[0,2]);
  cells[8]=5;assert.deepEqual(expandBookBonanzaSymbol(d,'2000',ids(cells),d.symbols[0].id).expandedColumns,[]);
});

test('Book uses all forty exact visible line diagrams with their original order and source-image digest',async()=>{
  const observed=JSON.parse(await readFile(new URL('../references/book-bonanza-paylines-rendered-20261111.json',import.meta.url),'utf8'));
  const image=await readFile(new URL('../'+observed.capturedSource,import.meta.url));
  assert.equal(createHash('sha256').update(image).digest('hex'),observed.sourceSha256);
  assert.equal(observed.lineCount,40);assert.equal(observed.extraction.goldDots,240);
  assert.ok(observed.extraction.maximumRowCentreResidualPixels<1);
  assert.deepEqual(observed.lines.map(line=>line.line),Array.from({length:40},(_,i)=>i+1));
  assert.deepEqual(d.paylines,observed.lines.map(line=>line.rows));
  assert.equal(new Set(d.paylines.map(line=>line.join(','))).size,40);
  assert.deepEqual(d.paylines.slice(0,4),[0,1,2,3].map(row=>Array(6).fill(row)));
  assert.deepEqual(d.paylines[38],[1,2,3,3,2,1]);assert.deepEqual(d.paylines[39],[2,1,0,0,1,2]);
});

test('Book exact rendered2-to6-symbol prizes pay the source amounts on each0.01DMO line at0.40DMO total',async()=>{
  const amounts={emperor:{2:40,3:80,4:400,5:2000,6:5000},dragon:{2:20,3:60,4:200,5:800,6:2000},
    lotus:{2:20,3:40,4:100,5:400,6:800},gong:{2:20,3:40,4:100,5:400,6:800},lantern:{2:20,3:40,4:100,5:400,6:800},
    ace:{3:20,4:60,5:150,6:300},king:{3:20,4:60,5:150,6:300},
    queen:{3:20,4:40,5:100,6:200},jack:{3:20,4:40,5:100,6:200},ten:{3:20,4:40,5:100,6:200}};
  assert.equal(d.symbols.length,10);assert.equal(d.bookFeature.paytableSource.displayedTotalBetMinor,'40');
  for(const [index,symbol]of d.symbols.entries()){
    const expected=amounts[symbol.id.replace('bookofbonanza-','')];assert.deepEqual(symbol.pays,expected);
    for(const [count,award]of Object.entries(expected)){
      const board=Array.from({length:4},()=>Array.from({length:6},(_,col)=>col<Number(count)?symbol.id:d.symbols[(index+1)%10].id));
      const scored=evaluateBookBonanzaGrid(d,'40',board);
      assert.equal(scored.lineWins.length,40);assert.ok(scored.lineWins.every(line=>line.winMinor===String(award)&&line.matches===Number(count)));
      assert.equal(scored.winMinor,String(40*award));
    }
  }
  assert.deepEqual(d.bookFeature.scatterPaytable,[]);assert.equal(d.bookFeature.scatterCashAwardListed,false);
  for(const source of d.bookFeature.paytableSource.regular)assert.ok((await readFile(new URL('../'+source,import.meta.url))).length>0);
});

test('Book selected-symbol expansion uses its public minimum paying count: two pictorial symbols or three card symbols',()=>{
  for(const [index,symbol]of d.symbols.entries()){
    const others=d.symbols.filter(s=>s.id!==symbol.id),board=Array.from({length:4},(_,row)=>Array.from({length:6},(_,col)=>others[(row*6+col)%others.length].id));
    board[0][0]=symbol.id;board[1][2]=symbol.id;
    const minimum=index<5?2:3;assert.equal(d.bookFeature.minimumExpandingReelsBySymbol[symbol.id],minimum);
    assert.deepEqual(expandBookBonanzaSymbol(d,'100',board,symbol.id).expandedColumns,minimum===2?[0,2]:[]);
    board[3][4]=symbol.id;assert.deepEqual(expandBookBonanzaSymbol(d,'100',board,symbol.id).expandedColumns,[0,2,4]);
  }
  const round=start({betMinor:'100',rng:()=>0});assert.equal(round.winMinor,'500000');
  assert.equal(math.maximumPayoutMinor({gameId:d.id,betMinor:'100'}),round.winMinor);
});

test('Book explicitly blocks real-money admission because even regular-prefix base awards exceed the stake under its independent weights',()=>{
  const proof=d.releaseReview.independentAnalyticReturn;
  assert.equal(d.releaseReview.realMoneyAdmissionBlocked,true);assert.equal(proof.bound,'lower');
  assert.equal(proof.numerator,'1686961645158400');assert.equal(proof.denominator,'1094032426497921');
  const totalTickets=321n,otherRegularTickets=288n,prizeTotals={2:120n,3:360n,4:1140n,5:4600n,6:10600n};
  let subset=0n;
  for(let count=2;count<=6;count++)subset+=prizeTotals[count]*32n**BigInt(count)*(count===6?1n:otherRegularTickets*totalTickets**BigInt(5-count));
  assert.equal(subset.toString(),proof.numerator);assert.equal((totalTickets**6n).toString(),proof.denominator);
  assert(subset>totalTickets**6n);
  assert.ok(d.symbols.every(symbol=>Object.values(symbol.pays).every(prize=>(100*prize)%40===0)));
  assert.equal(Math.max(...d.symbols.flatMap(symbol=>Object.values(symbol.pays))),d.bookFeature.maximumMultiplier);
  assert.match(d.rules.join(' '),/REAL-MONEY ADMISSION IS BLOCKED/);
  assert.equal(d.nominalReturn.verified,false,'A lower bound is not an exact full-game RTP.');
});

test('one accepted stake resolves4-Book trigger,10free spins,+10retrigger and the same selected expanding symbol in one final credit',()=>{
  const round=resolved(bookBonusFeatureFixture()),o=math.publicRound(round).outcome;
  assert.equal(round.betMinor,'2000');assert.equal(o.baseScatterCount,4);assert.equal(o.bonusTriggered,true);
  assert.equal(o.baseScatterAwardMinor,'0');assert.ok(o.bonusFrames.every(frame=>frame.scatterAwardMinor==='0'));
  assert.equal(o.freeSpinsAwarded,20);assert.equal(o.freeSpinsPlayed,20);assert.equal(o.freeSpinsRemaining,0);assert.equal(o.bonusFrames.length,20);
  assert.equal(o.bonusFrames[0].scatterCount,3);assert.equal(o.bonusFrames[0].freeSpinsAwarded,10);
  assert.ok(o.bonusFrames.every(frame=>frame.selectedSymbolId===o.selectedSymbolId));
  assert.deepEqual(o.bonusFrames[1].expandedColumns,[0,2,4]);assert.ok(BigInt(o.bonusFrames[1].expandingAwardMinor)>0n);
  for(const frame of o.bonusFrames)assert.equal(BigInt(frame.rawAwardMinor),BigInt(frame.regularAwardMinor)+BigInt(frame.scatterAwardMinor)+BigInt(frame.expandingAwardMinor));
  assert.equal(BigInt(round.winMinor),BigInt(o.baseAwardMinor)+o.bonusFrames.reduce((sum,frame)=>sum+BigInt(frame.awardMinor),0n));
  assert.equal(o.totalAwardMinor,round.winMinor);assert.equal(o.settlement,'single-final-credit');
  assert.equal(round.outcome.bonusFrames,undefined);assert.equal(round.outcome.bonusFrameCount,20);assert.deepEqual(math.publicRound(round).allowedActions,[]);
  assert.throws(()=>math.collectRound(round),{code:'ROUND_FINISHED'});assert.throws(()=>math.advanceRound(round),{code:'ROUND_FINISHED'});
});

test('Book endless retriggers finish at the explicit5000x cap with bounded persistence rather than losing remaining bonus value',()=>{
  const initial=bookBoardDraws(bookRegularBoard());for(const p of [0,7,14,21])initial[p]=320;
  const free=bookBoardDraws(bookRegularBoard());for(const p of [0,8,16])free[p]=320;
  let index=0;const script=[...initial,0,...Array.from({length:128},()=>free).flat()];
  const round=start({betMinor:'100',rng:()=>script[index++]}),o=math.publicRound(round).outcome;
  assert.ok(o.freeSpinsPlayed<=128);assert.equal(round.winMinor,'500000');assert.equal(o.capReached,true);assert.ok(o.freeSpinsCancelledAtMaximum>0);
  assert.equal(o.freeSpinsRemaining,0);assert.ok(BigInt(o.processingMaximumAwardMinor)>0n);assert.equal(index,3097);
  assert.ok(JSON.stringify({mathState:round,modelVersion:d.mathVersion,reservedPayoutMinor:'500000'}).length<120*1024);
  assert.ok(round.private.draws.length<=d.bookFeature.maximumRandomDraws);assert.equal(JSON.stringify(math.publicRound(round)).includes('"draws"'),false);
});

test('Book validates exact replay through JSONB, rejects unsupported bonus-wallet inputs and supports configured large stakes',()=>{
  const f=bookBonusFeatureFixture(),round=resolved(f);assert.deepEqual(round,resolved(f));assert.deepEqual(math.publicRound(reordered(round)),math.publicRound(round));
  for(const mutate of [r=>r.winMinor=String(BigInt(r.winMinor)+1n),r=>r.outcome.selectedSymbolId=d.symbols[7].id,
    r=>r.outcome.freeSpinsAwarded++,r=>r.outcome.baseScatterCount=0,r=>r.private.draws.push(0),r=>r.private.draws.pop()]){
    const bad=structuredClone(round);mutate(bad);assert.throws(()=>math.publicRound(bad),{code:'INVALID_ROUND'});
  }
  for(const options of [{mode:'buy100'},{bonusBet:true},{bonusRisk:10},{progress:100},{holdWin:true},{selectedSymbol:d.symbols[7].id}]){
    let calls=0;assert.throws(()=>start({betMinor:'100',options,rng:()=>{calls++;return 0;}}),{code:'INVALID_OPTIONS'});assert.equal(calls,0);
  }
  const large=resolved({betMinor:'5000000',draws:bookBoardDraws(bookRegularBoard())});assert.equal(large.betMinor,'5000000');
  assert.equal(math.maximumPayoutMinor({gameId:d.id,betMinor:'5000000'}),'25000000000');
  const view=math.publicRound(round);view.outcome.bonusFrames[0].grid[0][0]='client-edit';
  assert.notEqual(math.publicRound(round).outcome.bonusFrames[0].grid[0][0],'client-edit');
});
