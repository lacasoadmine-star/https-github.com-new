import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { runtime, legacy, revised } from '../artifacts/versioned-core.mjs';

const targets=['foxy_hot_20_native','multi_hot_5_native'];
const families={foxy_hot_20_native:'hot_foxy_20',multi_hot_5_native:'multi_hot_5_video'};
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
for(const g of legacy.publicGames()){
 test(`original model and 40 seeded settlements unchanged: ${g.id}`,()=>{
  assert.deepEqual(runtime.publicGames().find(x=>x.id===g.id),g);
  for(let seed=0;seed<40;seed++)assert.deepEqual(withoutId(runtime.spin(g.id,g.betLevels[0],{draw:draw(seed)})),withoutId(legacy.spin(g.id,g.betLevels[0],{draw:draw(seed)})));
 });
}
test('verified line geometry, paytable, bets, cap and attempt count',()=>{
 for(const [id,key] of [['foxy_hot_20_native','foxyHot20'],['multi_hot_5_native','multiHot5']]){
  const g=runtime.publicGames().find(g=>g.id===id),r=rules[key];
  assert.deepEqual(g.linePaths,r.paths);assert.deepEqual(g.paytable,legacy.getGame(families[id]).paytable);
  assert.deepEqual(g.betLevels,r.betLevels);assert.equal(g.maxWinMultiplier,r.maxWinMultiplier);
  assert.equal(g.features.gambleRounds,5);assert.equal(g.rules.gamble.maxRounds,5);
  assert.equal(g.features.gambleMaxStake,'500.00');assert.equal(g.rules.gamble.maxStake,'500.00');
  assert.equal(g.rules.scatter,null);assert.equal(g.features.freeSpins.spins,0);
 }
});
test('Foxy retains exact non-scatter order and counts, with no new bonus awards',()=>{
 const g=runtime.getGame('foxy_hot_20_native');
 assert.equal(new Set(g.reelStrips.flat()).size,8);
 g.reelStrips.forEach((strip,i)=>{assert.equal(strip.length,19900);assert.deepEqual(strip,legacy.getGame(families[g.id]).reelStrips[i].filter(s=>s!=='scatter'));});
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
 const old=legacy.getGame('multi_hot_5_video'),g=revised.getGame('multi_hot_5_native');
 assert.deepEqual(g.reelStrips,old.reelStrips);
 for(let seed=0;seed<200;seed++){
  const a=legacy.spin(old.id,'1.00',{draw:draw(seed)}),b=runtime.spin(g.id,'1.00',{draw:draw(seed)});
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
test('new receipts require complete exact identity and never accept legacy pins',()=>{
 for(const id of targets){
  const r=revised.spin(id,'1.00',{draw:draw(2)});assert.equal(runtime.receiptGame(id,r).features.gambleRounds,5);
  for(const field of ['gameId','mathVersion','engineVersion','mathSha256'])assert.equal(runtime.receiptGame(id,{...r,[field]:'unknown'}),null);
  const old=legacy.spin(families[id],'1.00',{draw:draw(2)});
  assert.equal(runtime.receiptGame(id,old),null);assert.equal(runtime.receiptGame(id,{...old,gameId:id}),null);
  assert.equal(runtime.receiptGame(families[id],old).features.gambleRounds,3);
 }
});
test('combined allowlist and public catalog add exactly two identities without mutating legacy',()=>{
 assert.equal(Object.keys(legacy.MATH.games).length,11);assert.equal(Object.keys(runtime.MATH.games).length,13);
 assert.deepEqual(runtime.publicGames().slice(0,11),legacy.publicGames());assert.deepEqual(runtime.publicGames().slice(11).map(g=>g.id),targets);
 for(const id of targets){assert.equal(runtime.getGame(id).id,id);assert.deepEqual(runtime.MATH.lines[runtime.getGame(id).lineSet],revised.MATH.lines[revised.getGame(id).lineSet]);}
 for(const [id,paths] of Object.entries(legacy.MATH.lines))assert.deepEqual(runtime.MATH.lines[id],paths);
});
test('new Foxy wild substitution and public metadata retain the official symbol roles',()=>{
 const f=revised.getGame('foxy_hot_20_native'),grid=Array.from({length:3},()=>Array(5).fill('unmatched'));
 grid[1]=['fox','777','777','777','777'];
 const win=revised.evaluatePaylines(f,grid,100n).find(w=>w.rows.every(r=>r===1));
 assert.ok(win);assert.equal(win.count,5);assert.equal(win.wilds,1);assert.equal(win.symbol,'777');
 assert.deepEqual(runtime.publicGames().find(g=>g.id===f.id).rules.wildSymbols,['fox']);
 assert.deepEqual(runtime.publicGames().find(g=>g.id==='multi_hot_5_native').rules.wildSymbols,[]);
});
