import test from 'node:test';
import assert from 'node:assert/strict';
import {receipt} from '../src/financial/account.mjs';

const model={mathVersion:'operator-mh40-v1',engineVersion:'fixture-v1',mathSha256:'a'.repeat(64)};
const game={id:'fixture-40',modelId:'special74_multi_hot_40_v1',rows:4,columns:5,symbols:{orange:0}};
const pending={body:{bet:'0.40'}};
function round(rows=4){return {gameId:game.modelId,currency:'ETB',roundId:'e8313723-a817-44d0-99e1-3ecff849de48',bet:'0.40',...model,grid:Array.from({length:rows},()=>Array(5).fill('orange')),wheelMultiplier:2,finalWin:'0.80',winLines:[{positions:[[3,0],[3,1],[3,2],[3,3],[3,4]]}],walletReceipt:{currency:'ETB',balanceBefore:'10.00',chargedStake:'0.40',finalWin:'0.80',balanceAfter:'10.40'}};}
test('four-row account receipt preserves the fourth-row result and rejects out-of-board wins',()=>{
 const raw=round();assert.deepEqual(receipt(raw,game,pending,model).grid,raw.grid);
 assert.equal(receipt(raw,game,pending,model).balanceAfter,'10.40');
 raw.winLines[0].positions[0]=[4,0];assert.throws(()=>receipt(raw,game,pending,model),/INVALID_ROUND/);
});
test('receipt geometry cannot silently accept truncated or sparse server grids',()=>{
 const raw=round(3);assert.throws(()=>receipt(raw,game,pending,model),/INVALID_REELS/);
 raw.grid=round().grid;delete raw.grid[2][1];assert.throws(()=>receipt(raw,game,pending,model),/INVALID_REELS/);
 const legacy=round(3);legacy.winLines=[];assert.doesNotThrow(()=>receipt(legacy,{...game,rows:undefined},pending,model));
});
