import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as mh10 from '../operator-math/multi-hot-10.mjs';
import * as mh40 from '../operator-math/multi-hot-40.mjs';
import {uniformBelow} from '../operator-math/five-reel-model.mjs';
import {createSiblingOperatorCore,siblingBetLevels,siblingGambleDraw} from '../operator-math/sibling-core-adapter.mjs';
for(const engine of [mh10,mh40]){
 const {model,evaluate,spin,gamble,multiplierForTicket}=engine;
 test(model.id+' exact RTP through all ordered line outcomes and multiplier tickets',()=>{
  const counts=Array(5).fill(0),total=model.multiplierWeights.reduce((a,b)=>a+b,0);for(let ticket=0;ticket<total;ticket++)counts[multiplierForTicket(ticket)-1]++;
  assert.deepEqual(counts,model.multiplierWeights);let lineSum=0n;
  for(let code=0;code<8**5;code++){
   let n=code;const row=Array.from({length:5},()=>{const value=model.symbols[n%8];n=Math.floor(n/8);return value;});let matched=1;while(matched<5&&row[matched]===row[0])matched++;
   const pay=matched>=3?model.paytable[row[0]][matched]:0,result=evaluate({betMinor:model.paylines.length,multiplier:1,grid:Array.from({length:model.rows},()=>[...row])});
   assert.equal(BigInt(result.payoutMinor),BigInt(pay*model.paylines.length));assert.equal(result.wins.length,pay?model.paylines.length:0);
   for(const win of result.wins){assert.equal(win.matched,matched);assert.equal(win.cells.length,matched);assert.equal(win.amountMinor,String(pay));}lineSum+=BigInt(pay);
  }
  const weighted=counts.reduce((sum,weight,index)=>sum+BigInt(weight*(index+1)),0n);assert.equal(lineSum*weighted*25n,32768n*BigInt(total)*24n);
 });
 test(model.id+' distinct chart paths settle longest leftmost match exactly and bound maximum',()=>{
  assert.equal(new Set(model.paylines.map(JSON.stringify)).size,model.paylines.length);
  for(const [index,path]of model.paylines.entries())for(const matched of [3,4,5]){
   const grid=Array.from({length:model.rows},(_,row)=>Array.from({length:5},(_,col)=>model.symbols[1+(row+col)%7]));
   for(let col=0;col<matched;col++)grid[path[col]][col]='seven';
   const result=evaluate({betMinor:model.paylines.length,multiplier:5,grid}),win=result.wins.find(w=>w.line===index+1);
   assert.equal(win.matched,matched);assert.equal(win.amountMinor,String(model.paytable.seven[matched]*5));assert.deepEqual(win.cells,path.slice(0,matched).map((row,col)=>({row,col})));
  }
  const maximum=evaluate({betMinor:model.betMinor.max,multiplier:5,grid:Array.from({length:model.rows},()=>Array(5).fill('seven'))});
  assert.equal(maximum.payoutMinor,String(BigInt(model.betMinor.max)*BigInt(model.maxBaseWinTimesStake)));assert.equal(maximum.maxBaseLiabilityMinor,maximum.payoutMinor);
  const trailing=evaluate({betMinor:model.betMinor.min,multiplier:1,grid:Array.from({length:model.rows},()=>['bell','orange','seven','seven','seven'])});assert.equal(trailing.payoutMinor,'0');
 });
 test(model.id+' validates minor money, dense cells and entropy before settling',()=>{
  let draws=0;for(const invalid of [0,-1,model.betMinor.min+1,model.betMinor.max+model.betMinor.step,'40',NaN,Infinity])assert.throws(()=>spin(invalid,()=>{draws++;return 0;}));assert.equal(draws,0);
  const args={betMinor:model.betMinor.min,multiplier:1,grid:Array.from({length:model.rows},()=>Array(5).fill('seven'))};
  assert.throws(()=>evaluate({...args,grid:Array(model.rows)}));args.grid[0]=Array(5);assert.throws(()=>evaluate(args));
  assert.throws(()=>spin(model.betMinor.min,()=>-1));assert.throws(()=>spin(model.betMinor.min,()=>NaN));
  const result=spin(model.betMinor.min,()=>0);assert.equal(result.grid.length,model.rows);assert.equal(result.grid[0].length,5);assert.equal(result.multiplier,1);assert.equal(result.modelVersion,model.version);assert.equal(model.claimsProviderMath,false);
 });
 test(model.id+' gamble fair return, independent identity and server attempt limits',()=>{
  for(const choice of ['red','black'])assert.equal([0,1].reduce((sum,word)=>sum+BigInt(gamble({amountMinor:49999,attempt:4,choice},()=>word).payoutMinor),0n),99998n);
  for(const value of [{amountMinor:50001,attempt:0,choice:'red'},{amountMinor:1,attempt:5,choice:'red'},{amountMinor:0,attempt:0,choice:'black'},{amountMinor:1,attempt:0,choice:'RED'}])assert.throws(()=>gamble(value));
 });
 test(model.id+' recorded proof binds all math dependencies and the exact public line chart',async()=>{
  const root=new URL('../../../../',import.meta.url),proof=JSON.parse(await readFile(new URL('reports/special74/operator-math/multi-hot-'+model.paylines.length+'-proof.json',root)));
  const hash=value=>createHash('sha256').update(value).digest('hex');for(const input of proof.sourceInputs)assert.equal(hash(await readFile(new URL(input.path,root))),input.sha256);
  assert.equal(proof.mathSha256,hash(JSON.stringify(proof.sourceInputs)));assert.equal(hash(await readFile(new URL(model.reference.lineChart,root))),model.reference.lineChartSha256);
  assert.equal(proof.exactProofVerified,true);assert.equal(proof.claimsProviderMath,false);assert.equal(proof.productionEnabled,false);assert.deepEqual(proof.theoreticalRtp,{numerator:'24',denominator:'25'});
 });
}
const originalResult={legacy:true},existing={MATH:{games:{legacy:{id:'legacy'}},lines:{legacy:[[0,0,0]]}},getGame:id=>({legacy:id}),modelIdentity:id=>({legacy:id}),receiptGame:()=>originalResult,spin:()=>originalResult,publicGames:()=>[originalResult]};
const sources={[mh10.model.id]:'a'.repeat(64),[mh40.model.id]:'b'.repeat(64)},uuid=()=> '11111111-1111-4111-8111-111111111111';
test('sibling adapter defaults disabled, preserves retained models and requires distinct pinned identities',()=>{
 const core=createSiblingOperatorCore(existing,{sources});assert.equal(core.spin('legacy'),originalResult);assert.deepEqual(core.modelIdentity('legacy'),{legacy:'legacy'});assert.equal(core.MATH.games.legacy,existing.MATH.games.legacy);
 for(const engine of [mh10,mh40]){const game=core.getGame(engine.model.id);assert.equal(game.rows,engine.model.rows);assert.equal(game.enabled,false);assert.deepEqual(game.betLevels,[]);assert.throws(()=>core.spin(game.id,'0.40'),/NOT_ENABLED/);}
 assert.throws(()=>createSiblingOperatorCore(existing,{sources:{unknown:'a'.repeat(64)}}));assert.throws(()=>createSiblingOperatorCore(existing,{sources:{[mh10.model.id]:'bad'}}));assert.throws(()=>createSiblingOperatorCore(core,{sources}));assert.throws(()=>createSiblingOperatorCore(existing,{sources,enabled:'true'}));
});
test('sibling adapter emits integer settlement and version-bound receipts for each geometry',()=>{
 const core=createSiblingOperatorCore(existing,{sources,enabled:true,uuid,nextUint32:()=>0});
 for(const engine of [mh10,mh40]){
  const id=engine.model.id,bet=siblingBetLevels(id)[0],game=core.getGame(id),result=core.spin(id,bet);assert.equal(result.grid.length,engine.model.rows);assert.equal(result.grid[0].length,5);assert.equal(result.gameId,id);
  assert.equal(core.receiptGame(id,result),game);for(const field of ['gameId','mathVersion','engineVersion','mathSha256'])assert.equal(core.receiptGame(id,{...result,[field]:'wrong'}),null);
  assert.equal(result.winLines.length,game.paylines);assert.ok(result.winLines.every(line=>line.matched===5&&line.positions.length===5));assert.equal(result.finalWin,id===mh10.model.id?'100.00':'200.00');
  for(const bad of [Number(bet),'1','00.40','0.41','0.00'])assert.throws(()=>core.spin(id,bad));assert.throws(()=>core.spin(id,bet,{isFree:true}));
  assert.equal(siblingGambleDraw(id,'RED','0.01',0,()=>0).payout,'0.02');assert.equal(siblingGambleDraw(id,'RED','0.01',0,()=>1).payout,'0.00');
 }
 assert.notDeepEqual(core.modelIdentity(mh10.model.id),core.modelIdentity(mh40.model.id));
});
test('unbiased sampler discards tail and rejects a broken source without infinite loop',()=>{
 const sequence=[0xffffffff,5];assert.equal(uniformBelow(33875,()=>sequence.shift()),5);assert.throws(()=>uniformBelow(33875,()=>0xffffffff),/failed rejection/);assert.throws(()=>uniformBelow(0,()=>0));
});
