import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {verifyOriginalMultiHot40Receipt,MH40_REFERENCE} from './multihot40-reference.mjs';
const original=JSON.parse(await readFile(new URL('../../../qa/evidence/mh40-r4/official-win.json',import.meta.url),'utf8')).win;
test('original 40-line NICE WIN receipt totals 7.20 DMO from 0.40 stake and 4x wheel',()=>{
 const r=verifyOriginalMultiHot40Receipt(original);assert.equal(r.stake,'0.40');assert.equal(r.baseWin,'1.80');assert.equal(r.totalWin,'7.20');assert.equal(r.winningLines,12);assert.equal(r.wheelMultiplier,4);
 assert.equal(r.productionApproved,false);assert.equal(r.fullPayoutModelVerified,false);assert.equal(MH40_REFERENCE.probabilityModelVerified,false);
});
test('changed coefficient or reported total cannot pass server arithmetic validation',()=>{
 const coefficient=structuredClone(original);coefficient.WinLinesStrips[0].Win=20;
 assert.throws(()=>verifyOriginalMultiHot40Receipt(coefficient),/COEFFICIENT_MISMATCH/);
 assert.throws(()=>verifyOriginalMultiHot40Receipt({...original,TotalWin:721}),/TOTAL_WIN_MISMATCH/);
});
test('wrong board positions, duplicate lines and foreign denominations are rejected',()=>{
 const board=structuredClone(original);board.Baraban[10]=7;assert.throws(()=>verifyOriginalMultiHot40Receipt(board),/WIN_POSITIONS_MISMATCH/);
 const duplicate=structuredClone(original);duplicate.WinLinesStrips.push(duplicate.WinLinesStrips[0]);assert.throws(()=>verifyOriginalMultiHot40Receipt(duplicate),/INVALID_LINE_ID/);
 assert.throws(()=>verifyOriginalMultiHot40Receipt({...original,FoundationBet:2}),/UNVERIFIED_DENOMINATION/);
});
