import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {iceReceiptView} from './client/presentation/ice-receipt-view.mjs';
const evidence=JSON.parse(await readFile(new URL('evidence/official-replay.json',import.meta.url),'utf8'));
const referencePaths=await readFile(new URL('evidence/paylines.json',import.meta.url),'utf8');
const receipts=evidence.rounds.map((round,i)=>{
 const paid=new Map();
 const frames=round.frames.map((f,frame)=>{
  const wins=f.wins.flatMap(w=>{
   const before=paid.get(w.line)||0,delta=w.units-before;paid.set(w.line,w.units);
   if(delta<=0)return[];
   // The observed0.40 DMO stake makes these exact integer minor-unit awards.
   const payout=BigInt(delta)*BigInt(round.stakeMinor)/400n;
   assert.equal(BigInt(delta)*BigInt(round.stakeMinor)%400n,0n);
   const paths=JSON.parse(referencePaths).paths[w.line-1];
   return [{line:w.line,symbol:String(w.symbol),count:w.count,cells:paths.slice(0,w.count).map((r,c)=>[c,r]),frame,payoutMinor:String(payout)}];
  });
  return {grid:f.grid.map(c=>c.map(String)),wins,payoutMinor:f.incrementalMinor,feature:{type:'freeze-respin',step:frame,frozenReels:f.freezeColumns}};
 });
 return {round_id:'official-component-replay-'+i,version:1,game_id:'burningice40_native',status:'active',stakeMinor:round.stakeMinor,payoutMinor:null,currentCashoutMinor:round.payoutMinor,baseWinMinor:round.payoutMinor,grid:frames.at(-1).grid,wins:frames.flatMap(f=>f.wins),frames,feature:frames.at(-1).feature,actions:['collect']};
});
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
let checked=0;
for(const [i,round] of receipts.entries()){
 const before=JSON.stringify(round);freeze(round);
 const visible=iceReceiptView('burningice40_native',round);
 assert.ok(visible);assert.equal(visible.payoutMinor,round.baseWinMinor);
 assert.equal(visible.wins.reduce((n,w)=>n+BigInt(w.payoutMinor),0n),BigInt(round.baseWinMinor));
 assert.deepEqual(visible.wins.map(w=>[w.line,w.symbol,w.count]).sort((a,b)=>a[0]-b[0]),evidence.rounds[i].frames.at(-1).wins.map(w=>[w.line,String(w.symbol),w.count]).sort((a,b)=>a[0]-b[0]));
 for(let f=0;f<round.frames.length-1;f++)assert.deepEqual(iceReceiptView('burningice40_native',round,f).wins,[]);
 assert.deepEqual(iceReceiptView('burningice40_native',round,round.frames.length-1),visible);
 assert.equal(JSON.stringify(round),before);checked++;
}
const sample=receipts.find(r=>r.frames.length>=3);assert.ok(sample);
assert.equal(sample.frames.at(-1).wins.length,0,'Reproduce the old missing-highlight trigger');
assert.ok(iceReceiptView('burningice40_native',sample).wins.length>0);
assert.equal(iceReceiptView('multihot5_native',sample),null);
assert.equal(iceReceiptView('foxyhot20_native',sample),null);
assert.equal(iceReceiptView('multihot100_native',sample),null);
assert.equal(iceReceiptView('burningice40_native',{...sample,omittedFrames:1}),null);
assert.equal(iceReceiptView('burningice40_native',{...sample,baseWinMinor:'999999'}),null);
const mismatch=structuredClone(sample),[column,row]=sample.frames[0].wins[0].cells[0];mismatch.frames.at(-1).grid[column][row]='unknown';
assert.equal(iceReceiptView('burningice40_native',mismatch),null);
checked+=8;
await writeFile(new URL('observed-component-receipts.json',import.meta.url),JSON.stringify(receipts,null,2));
console.log(JSON.stringify({checked,observedRounds:receipts.length,oldTerminalHighlightBugReproduced:true,receiptsImmutable:true,financialActions:false}));
