import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { runtime, legacy, revised } from '../artifacts/versioned-core.mjs';

const targets=['hot_foxy_20','multi_hot_5_video'];
const rules=JSON.parse(await readFile(new URL('../evidence/verified-linepaths-gamble.json',import.meta.url)));
const draw=seed=>n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const withoutId=({roundId,...r})=>r;

test('original decompressed core and legacy identity are unchanged',async()=>{
 const bytes=await readFile(new URL('../source/legacy-core.mjs',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'f40f441ed26e2448076ff291c2c9a714542b2aaf32e802a31c2645ad46723c2d');
 assert.equal(legacy.mathSha256,'9bc6cfaad2fa6558882bc88a3eb78514f1432ab1c11a52217a427d1f383ba8e7');
});
test('deployable preserves original embedded core, migration, ledger and authentication bodies',async()=>{
 const before=await readFile(new URL('../source/legacy-runtime.mjs',import.meta.url),'utf8'),after=await readFile(new URL('../source/runtime-after.mjs',import.meta.url),'utf8');
 const encoded=s=>s.match(/const coreBytes=gunzipSync\(Buffer.from\('([^']+)'/)[1];assert.equal(encoded(after),encoded(before));
 assert.equal(gunzipSync(Buffer.from(encoded(after),'base64')).toString(),await readFile(new URL('../source/legacy-core.mjs',import.meta.url),'utf8'));
 const section=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end));
 for(const [start,end] of [['const migration=',"const service=await"],[' async function authenticate(', ' async function locked('],['async function originals(', ' async function settle(']])assert.equal(section(after,start,end),section(before,start,end));
 assert.doesNotMatch(after,/balanceBefore<=0n\|\|balanceBefore<charge/);
 assert.match(after,/const balanceBefore=integer\(await balance\(c,uid\)\);if\(balanceBefore<charge\)/);
});
for(const g of legacy.publicGames().filter(g=>!targets.includes(g.id))){
 test(`unrelated model and 40 seeded settlements unchanged: ${g.id}`,()=>{
  assert.deepEqual(runtime.publicGames().find(x=>x.id===g.id),g);
  for(let seed=0;seed<40;seed++)assert.deepEqual(withoutId(runtime.spin(g.id,g.betLevels[0],{draw:draw(seed)})),withoutId(legacy.spin(g.id,g.betLevels[0],{draw:draw(seed)})));
 });
}
test('verified line geometry, paytable, bets, cap and attempt count',()=>{
 for(const [id,key] of [['hot_foxy_20','foxyHot20'],['multi_hot_5_video','multiHot5']]){
  const g=runtime.publicGames().find(g=>g.id===id),r=rules[key];
  assert.deepEqual(g.linePaths,r.paths);assert.deepEqual(g.paytable,legacy.getGame(id).paytable);
  assert.deepEqual(g.betLevels,r.betLevels);assert.equal(g.maxWinMultiplier,r.maxWinMultiplier);
  assert.equal(g.features.gambleRounds,5);assert.equal(g.rules.gamble.maxRounds,5);
  assert.equal(g.features.gambleMaxStake,'500.00');assert.equal(g.rules.gamble.maxStake,'500.00');
  assert.equal(g.rules.scatter,null);assert.equal(g.features.freeSpins.spins,0);
 }
});
test('Foxy retains exact non-scatter order and counts, with no new bonus awards',()=>{
 const g=runtime.getGame('hot_foxy_20');
 assert.equal(new Set(g.reelStrips.flat()).size,8);
 g.reelStrips.forEach((strip,i)=>{assert.equal(strip.length,19900);assert.deepEqual(strip,legacy.getGame(g.id).reelStrips[i].filter(s=>s!=='scatter'));});
 for(let seed=0;seed<300;seed++){
  const r=runtime.spin(g.id,'0.20',{draw:draw(seed)});assert.equal(r.scatterCount,0);assert.equal(r.bonusSpinsAwarded,0);assert.equal(r.pendingBonusPick,false);
 }
});
test('each official numbered line evaluates from its own authored path',()=>{
 for(const id of targets){const g=revised.getGame(id),paths=revised.MATH.lines[g.lineSet];
  for(const [i,path] of paths.entries()){
   const grid=Array.from({length:g.rows},()=>Array(g.reels).fill('unmatched'));
   path.forEach((r,c)=>grid[r][c]='777');
   const wins=revised.evaluatePaylines(g,grid,100n);
   const win=wins.find(w=>w.line===i+1);assert.ok(win);assert.deepEqual(win.rows,path);assert.equal(win.count,g.reels);
  }
 }
});
test('MH5 strips and unconstrained award sums unchanged, cap lowered to145',()=>{
 const old=legacy.getGame('multi_hot_5_video'),g=revised.getGame(old.id);
 assert.deepEqual(g.reelStrips,old.reelStrips);
 for(let seed=0;seed<200;seed++){
  const a=legacy.spin(g.id,'1.00',{draw:draw(seed)}),b=runtime.spin(g.id,'1.00',{draw:draw(seed)});
  assert.deepEqual(a.grid,b.grid);assert.equal(a.uncappedWin,b.uncappedWin);assert.equal(b.finalWin,revised.fromUnits(revised.toUnits(a.uncappedWin)>1450000n?1450000n:revised.toUnits(a.uncappedWin)));
 }
});
test('earned free spins keep full legacy identity, grids and retrigger award',()=>{
 const g=legacy.getGame('hot_foxy_20');
 const stops=g.reelStrips.map(s=>s.indexOf('scatter'));
 const fixed=()=>{let i=0;return n=>(stops[i++]??0)%n;};
 const a=legacy.spin(g.id,'200.00',{isFree:true,draw:fixed()}),b=runtime.spin(g.id,'200.00',{isFree:true,draw:fixed()});
 assert.deepEqual(withoutId(a),withoutId(b));assert.equal(b.bonusSpinsAwarded,10);assert.equal(b.chargedStake,'0.0000');
 assert.equal(b.mathSha256,legacy.mathSha256);
});
test('receipt model requires complete known identity and game, with old limit3 retained',()=>{
 for(const id of targets){
  for(const [core,limit] of [[legacy,3],[revised,5]]){
   const r=core.spin(id,'1.00',{draw:draw(2)});assert.equal(runtime.receiptGame(id,r).features.gambleRounds,limit);
   for(const field of ['gameId','mathVersion','engineVersion','mathSha256'])assert.equal(runtime.receiptGame(id,{...r,[field]:'unknown'}),null);
  }
 }
});
