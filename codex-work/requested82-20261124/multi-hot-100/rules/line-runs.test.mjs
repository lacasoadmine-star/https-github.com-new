import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M100_PAYLINES,m100Payline} from './paylines.mjs';
import {traceM100LineRuns} from './line-runs.mjs';

const currentWinningBoard = [
  ['orange','orange','orange','watermelon','bell'],
  ['orange','orange','orange','orange','bell'],
  ['lemon','orange','orange','orange','bell'],
  ['lemon','orange','cherry','orange','plum'],
];

test('current original artwork has 100 separate paths including the corrected 46',()=>{
  assert.equal(M100_PAYLINES.length,100);
  assert.equal(new Set(M100_PAYLINES.map(path=>path.join(','))).size,100);
  assert.deepEqual(m100Payline(45),[2,2,2,1,1]);
  assert.deepEqual(m100Payline(46),[1,1,1,0,0]);
  for(const id of [0,101,1.5,'46',undefined])assert.throws(()=>m100Payline(id),/PAYLINE_ID/);
  assert.throws(()=>{m100Payline(46)[0]=3;},TypeError);
});

test('fresh 12.60 DMO observation contains 14 orange three-symbol prefixes and 35 four-symbol prefixes',()=>{
  const runs=traceM100LineRuns(currentWinningBoard);
  assert.equal(runs.length,100);
  const threes=runs.filter(line=>line.prefixLength===3);
  const fours=runs.filter(line=>line.prefixLength===4);
  assert.equal(threes.length,14);assert.equal(fours.length,35);
  assert.ok([...threes,...fours].every(line=>line.symbol==='orange'));
  assert.deepEqual(threes.map(line=>line.lineId),[1,5,16,17,23,32,37,46,56,62,63,69,80,81]);
  // This geometric trace does not assign an amount from the observed aggregate.
  assert.ok(runs.every(line=>!Object.hasOwn(line,'payout')&&!Object.hasOwn(line,'balance')));
  assert.equal(runs[44].symbol,'lemon');assert.equal(runs[45].symbol,'orange');
});

test('all same symbols follow every path while a broken first pair stops the prefix',()=>{
  const all=Array.from({length:4},()=>Array(5).fill('seven'));
  assert.ok(traceM100LineRuns(all).every(line=>line.prefixLength===5&&line.symbol==='seven'));
  const broken=Array.from({length:4},()=>['seven','bell','seven','seven','seven']);
  assert.ok(traceM100LineRuns(broken).every(line=>line.prefixLength===1));
});

test('unknown symbols, missing rows and sparse cells reject before any trace',()=>{
  const missing=[...currentWinningBoard];delete missing[1];
  const sparse=currentWinningBoard.map(row=>[...row]);delete sparse[2][3];
  const foreign=currentWinningBoard.map(row=>[...row]);foreign[1][1]='wild';
  for(const grid of [missing,sparse,foreign,currentWinningBoard.slice(0,3),[...currentWinningBoard,[]]])assert.throws(()=>traceM100LineRuns(grid),/LINE_GRID/);
});

test('published geometry and evidence rowfacts stay bound without publishing media',()=>{
  const facts=JSON.parse(readFileSync(new URL('./payline-art-evidence.json',import.meta.url)));
  assert.deepEqual(facts.lines.map(line=>line.path),M100_PAYLINES);
  assert.equal(facts.pathCount,100);assert.equal(facts.uniquePathCount,100);
  assert.equal(facts.mediaPublished,false);assert.equal(facts.providerProgramUsed,false);
  assert.equal(facts.atlasPins.length,16);assert.ok(facts.atlasPins.every(pin=>/^[a-f0-9]{64}$/.test(pin.sha256)&&pin.bytes>0));
  assert.notEqual(facts.lines[44].decodedRgbaSha256,facts.lines[45].decodedRgbaSha256);
});
