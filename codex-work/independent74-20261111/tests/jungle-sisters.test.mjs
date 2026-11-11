import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as math from '../math/official72.mjs';
import {JUNGLE_SISTERS_ID,JUNGLE_SISTERS_DELUXE_ID,evaluateJungleBoard} from '../math/jungle-sisters.mjs';
import {jungleRegularBoard,jungleScatterBoard,jungleBoardDraws,jungleBoardIds,jungleFeatureFixture} from './support/jungle-sisters-fixtures.mjs';
import {finiteDraws} from './support/gates-merlyn-fixtures.mjs';
const ids=[JUNGLE_SISTERS_ID,JUNGLE_SISTERS_DELUXE_ID];
const resolved=fixture=>{const rng=finiteDraws(fixture.draws),round=math.startRound({...fixture,rng});assert.equal(rng.remaining(),0);return round;};
const reordered=value=>Array.isArray(value)?value.map(reordered):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reordered(item)])):value;

test('Jungle variants keep separate feature rules, documented caps and explicit unknown-prize/distribution admission blocks',async()=>{
 const help=JSON.parse(await readFile(new URL('../references/official-slot-help-en-20261111.json',import.meta.url),'utf8')).captions;
 assert.match(help['help.slots.jungleSisters.bonus.feature.description'],/7 or more Scatter.*10 Free Spins/);
 assert.match(help['help.slots.jungleSistersDeluxe.bonus.feature.description'],/5 different multipliers/);
 for(const id of ids){
  const d=math.getGameDefinition(id),deluxe=id===JUNGLE_SISTERS_DELUXE_ID;
  assert.equal(d.paylines.length,20);assert.equal(d.rows,3);assert.equal(d.cols,5);
  assert.equal(d.jungleFeature.initialFreeSpins,10);assert.equal(d.jungleFeature.maximumFrames,10);
  assert.equal(d.jungleFeature.triggerScatters,7);assert.equal(d.jungleFeature.retrigger,false);
  assert.equal(d.jungleFeature.scattersInFreeSpins,!deluxe);
  assert.equal(d.jungleFeature.maximumAwardMultiplier,deluxe?2500:1500);
  assert.equal(d.jungleFeature.paytableVerified,false);assert.equal(d.jungleFeature.paylineChartVerified,false);
  assert.equal(d.releaseReview.realMoneyAdmissionBlocked,true);assert.equal(d.nominalReturn.verified,false);
  assert.equal(d.jungleFeature.baseMultiplierValuesVerified,!deluxe);
  assert.equal(d.jungleFeature.buyBonus.implemented,false);assert.equal(d.gamble.enabled,true);
  assert.deepEqual(d.multiplierValues,deluxe?[1,2,3,4,5,10]:[1,2,3,4,5]);
 }
});

test('Wild substitutes on every Jungle reel while Scatter blocks lines and stays on reels2–4',()=>{
 for(const id of ids){
  const d=math.getGameDefinition(id),grid=Array.from({length:3},()=>['W',0,0,1,2]);
  const ordinary=evaluateJungleBoard(d,'2000',jungleBoardIds(d,grid),1);
  assert.equal(ordinary.lineWins.length,20);assert.ok(ordinary.lineWins.every(line=>line.matches===3));
  assert.equal(ordinary.regularAwardMinor,(2000n*BigInt(d.symbols[0].pays[3])).toString());
  grid.forEach(row=>row[1]='S');assert.equal(evaluateJungleBoard(d,'2000',jungleBoardIds(d,grid),1).regularAwardMinor,'0');
  const illegal=jungleRegularBoard();illegal[0][0]='S';
  assert.throws(()=>evaluateJungleBoard(d,'2000',jungleBoardIds(d,illegal),1),{code:'INVALID_GRID'});
 }
});

test('Scatter tiers pay only the highest7/8/9tier and apply the chosen factor with exact integer arithmetic',()=>{
 const d=math.getGameDefinition(JUNGLE_SISTERS_ID);
 for(const [count,multiplier]of [[6,0],[7,3],[8,5],[9,10]]){
  const scored=evaluateJungleBoard(d,'4000100',jungleBoardIds(d,jungleScatterBoard(count)),5);
  assert.equal(scored.scatterCount,count);assert.equal(scored.scatterAwardMinor,(4000100n*BigInt(multiplier)*5n).toString());
  assert.equal(scored.regularAwardMinor,'0');assert.equal(scored.rawAwardMinor,scored.scatterAwardMinor);
 }
});

test('ordinary Jungle resolves10free spins once, allows bonus Scatters without retrigger and combines base/bonus cash exactly',()=>{
 const round=resolved(jungleFeatureFixture()),o=math.publicRound(round).outcome;
 assert.equal(o.bonusTriggered,true);assert.equal(o.baseScatterCount,7);assert.equal(o.baseAwardMinor,'6000');
 assert.equal(o.freeSpinsAwarded,10);assert.equal(o.freeSpinsPlayed,10);assert.equal(o.freeSpinsRemaining,0);
 assert.equal(o.bonusFrames[0].scatterCount,7);assert.equal(o.bonusFrames[0].spinMultiplier,20);
 assert.equal(o.bonusFrames[0].scatterAwardMinor,'120000');assert.equal(o.bonusFrames[0].freeSpinsAwarded,0);
 assert.equal(o.bonusFrames[1].spinMultiplier,10);assert.equal(o.bonusFrames[1].regularAwardMinor,'520000');
 assert.equal(round.winMinor,'646000');assert.equal(o.totalAwardMinor,round.winMinor);
 assert.ok(o.bonusFrames.every(frame=>frame.freeSpinsAwarded===0));
 assert.equal(o.settlement,'single-final-credit');assert.equal(round.outcome.bonusFrames,undefined);
 assert.equal(round.outcome.bonusFrameCount,10);assert.equal(round.private.draws.length,176);
});

test('Deluxe selects five distinct multipliers once, uses that exact set and never draws Scatters in free spins',()=>{
 const round=resolved(jungleFeatureFixture({deluxe:true})),o=math.publicRound(round).outcome,d=math.getGameDefinition(round.gameId);
 assert.deepEqual(o.selectedBonusMultipliers,[1,2,3,4,5]);assert.equal(new Set(o.selectedBonusMultipliers).size,5);
 assert.equal(o.freeSpinsPlayed,10);assert.equal(round.private.draws.length,181);
 assert.equal(o.baseAwardMinor,'6000');assert.equal(o.bonusFrames[0].regularAwardMinor,'280000');
 assert.equal(round.winMinor,'286000');
 for(const frame of o.bonusFrames){
  assert.ok(o.selectedBonusMultipliers.includes(frame.spinMultiplier));assert.equal(frame.scatterCount,0);
  assert.equal(frame.scatterAwardMinor,'0');assert.ok(frame.grid.flat().every(cell=>cell!==d.scatterSymbol.id));
 }
 assert.throws(()=>evaluateJungleBoard(d,'2000',jungleBoardIds(d,jungleScatterBoard(7)),1,{free:true}),{code:'INVALID_GRID'});
 const altered=structuredClone(round);altered.outcome.selectedBonusMultipliers=[1,1,1,1,1];
 assert.throws(()=>math.publicRound(altered),{code:'INVALID_ROUND'});
});

test('public cap cancels unplayed free spins and reserves the complete optional X2 bound above40000ETB',()=>{
 for(const deluxe of [false,true]){
  const fixture=jungleFeatureFixture({deluxe,betMinor:'4000100',maximum:true}),round=resolved(fixture),d=math.getGameDefinition(round.gameId),o=math.publicRound(round).outcome;
  const maximum=4000100n*BigInt(deluxe?2500:1500);
  assert.equal(round.winMinor,maximum.toString());assert.equal(o.capReached,true);
  assert.equal(o.freeSpinsPlayed,1);assert.equal(o.freeSpinsCancelledAtMaximum,9);assert.equal(o.freeSpinsRemaining,0);
  assert.equal(BigInt(o.baseAwardMinor)+BigInt(o.bonusFrames[0].awardMinor),maximum);
  assert.ok(BigInt(o.bonusFrames[0].rawAwardMinor)>BigInt(o.bonusFrames[0].awardMinor));
  assert.equal(math.maximumPayoutMinor({gameId:d.id,betMinor:fixture.betMinor}),maximum.toString());
  assert.equal(math.maximumPayoutMinor({gameId:d.id,betMinor:fixture.betMinor,options:{holdWin:true}}),(maximum*8n).toString());
 }
});

test('held Jungle feature awards can X2 and collect without another feature draw, stake or replayed award',()=>{
 for(const deluxe of [false,true]){
  const fixture=jungleFeatureFixture({deluxe}),held=resolved({...fixture,options:{holdWin:true}});
  assert.equal(held.status,'active');assert.equal(held.winMinor,'0');assert.equal(held.pendingWinMinor,held.baseWinMinor);
  assert.deepEqual(math.publicRound(held).allowedActions,['gamble','collect']);
  const doubled=math.advanceRound(held,{color:'red'},undefined,()=>0),collected=math.collectRound(doubled);
  assert.equal(collected.winMinor,(BigInt(held.baseWinMinor)*2n).toString());assert.equal(collected.betMinor,held.betMinor);
  assert.deepEqual(collected.private.draws,held.private.draws);assert.deepEqual(math.publicRound(collected).outcome,math.publicRound(held).outcome);
  assert.throws(()=>math.collectRound(collected),{code:'ROUND_FINISHED'});
  const lost=math.advanceRound(held,{color:'red'},undefined,()=>1);assert.equal(lost.status,'lost');assert.equal(lost.winMinor,'0');
 }
});

test('Jungle replay rejects tampered money/boards/trace and supports JSONB field order without exposing draws',()=>{
 for(const deluxe of [false,true]){
  const round=resolved(jungleFeatureFixture({deluxe}));assert.deepEqual(math.publicRound(reordered(round)),math.publicRound(round));
  for(const mutate of [r=>r.winMinor=String(BigInt(r.winMinor)+1n),r=>r.outcome.baseScatterCount=0,
   r=>r.outcome.freeSpinsPlayed++,r=>r.private.draws.push(0),r=>r.private.draws.pop(),r=>r.outcome.baseAwardMinor='0']){
   const changed=structuredClone(round);mutate(changed);assert.throws(()=>math.publicRound(changed),{code:'INVALID_ROUND'});
  }
  const view=math.publicRound(round);assert.equal(JSON.stringify(view).includes('"draws"'),false);
  view.outcome.bonusFrames[0].grid[0][0]='client';assert.notEqual(math.publicRound(round).outcome.bonusFrames[0].grid[0][0],'client');
  assert.ok(JSON.stringify(round).length<120*1024);
 }
});

test('unverified Jungle buy/B+ selections and client-controlled multipliers are rejected before any random draw',()=>{
 for(const gameId of ids)for(const options of [{mode:'buy100'},{buyBonus:true},{bonusBet:true},{spinMultiplier:100},{selectedBonusMultipliers:[1,2,3,4,100]}]){
  let calls=0;assert.throws(()=>math.startRound({gameId,betMinor:'100',options,rng:()=>{calls++;return 0;}}),{code:'INVALID_OPTIONS'});assert.equal(calls,0);
 }
});

test('fewer than seven Scatters never starts free spins and a completed zero result remains lost',()=>{
 for(const gameId of ids){
  const d=math.getGameDefinition(gameId),fixture={gameId,betMinor:'100',draws:[0,...jungleBoardDraws(d,jungleScatterBoard(6))]};
  const round=resolved(fixture),o=math.publicRound(round).outcome;
  assert.equal(round.status,'lost');assert.equal(round.winMinor,'0');assert.equal(o.bonusTriggered,false);assert.equal(o.freeSpinsPlayed,0);
  assert.deepEqual(o.selectedBonusMultipliers,[]);assert.deepEqual(o.bonusFrames,[]);
 }
});
