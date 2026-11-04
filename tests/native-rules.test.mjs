import assert from 'node:assert/strict';
import test from 'node:test';
import {GAMES} from '../apps/native-engine/catalog.mjs';
import {advanceGame,choose,formatMinor,fractionalPayout,maximumLiability,publicRound,seededRandom,stakeMinor,startGame} from '../apps/native-engine/rules.mjs';
const zero={int:()=>0,bytes:n=>new Uint8Array(n)};
test('30 configured independent games cover the requested distinct families',()=>{
 assert.equal(Object.keys(GAMES).length,30);
 for(const family of ['crash','plinko','mines','slots','dice','hilo','wheel'])assert.ok(Object.values(GAMES).some(g=>g.family===family));
 assert.ok(Object.values(GAMES).every(g=>g.official_provider_game===false));
});
test('money uses exact integers and rejects malformed or out of range stakes',()=>{
 assert.equal(stakeMinor('1.01',GAMES.jetx),101n);assert.equal(formatMinor(1234567890123456n),'12345678901234.56');
 for(const value of [0,1.1,'-1.00','NaN','Infinity','0.00','0.99','1.001','1001.00','1e3'])assert.throws(()=>stakeMinor(value,GAMES.jetx));
});
test('seeded RNG is reproducible and domain separated',()=>{
 const a=seededRandom('ab'.repeat(32),'start'),b=seededRandom('ab'.repeat(32),'start'),c=seededRandom('ab'.repeat(32),'action:1');
 const x=Array.from({length:30},()=>a.int(1000));assert.deepEqual(x,Array.from({length:30},()=>b.int(1000)));assert.notDeepEqual(x,Array.from({length:30},()=>c.int(1000)));
});
test('all 30 engines stay within their funded maximum payout over diverse seeds',()=>{
 for(const game of Object.values(GAMES))for(let i=0;i<100;i++){
  const rng=seededRandom(i.toString(16).padStart(64,'0'),game.id);const state=startGame(game,100n,{},100000,rng);
  assert.ok(BigInt(state.payout_minor)<=maximumLiability(game,100n));
 }
});
test('rational rounding is bounded and combinatorial counts are exact',()=>{
 assert.equal(choose(25,5),53130n);assert.equal(choose(12,6),924n);
 assert.equal(fractionalPayout(10n,2n,zero),5n);assert.equal(fractionalPayout(11n,2n,zero),6n);
 for(let i=0;i<100;i++){const p=fractionalPayout(1001n,97n,seededRandom(i.toString(16).padStart(64,'0'),'round'));assert.ok(p===10n||p===11n);}
});
test('crash cashout uses server time and rejects cashout at or after crash',()=>{
 const rng={int:()=>0x80000000,bytes:n=>new Uint8Array(n)};const state=startGame(GAMES.jetx,100n,{},1000,rng);
 const view=publicRound(GAMES.jetx,state,1100);assert.equal(view.crash_point,undefined);assert.equal(view.crash_at,undefined);
 assert.equal(state.crash_point,194);
 const won=advanceGame(GAMES.jetx,state,'cashout',{},2000,zero);assert.equal(won.reason,'CASHOUT');assert.ok(BigInt(won.payout_minor)>100n);
 const lost=advanceGame(GAMES.jetx,state,'cashout',{},state.crash_at,zero);assert.equal(lost.payout_minor,'0');assert.equal(lost.reason,'CRASHED');
 assert.throws(()=>advanceGame(GAMES.jetx,won,'cashout',{},2001,zero));
});
test('mines hides layout, protects repeated cells, pays cashouts, and loses on a mine',()=>{
 const state=startGame(GAMES.turbo_mines,100n,{mines:3},1000,zero);
 assert.equal(publicRound(GAMES.turbo_mines,state).mines,undefined);
 const safe=Array.from({length:25},(_,i)=>i).find(i=>!state.mines.includes(i));
 const picked=advanceGame(GAMES.turbo_mines,state,'pick',{cell:safe},1100,zero);assert.equal(picked.status,'active');
 assert.throws(()=>advanceGame(GAMES.turbo_mines,picked,'pick',{cell:safe},1200,zero));
 const win=advanceGame(GAMES.turbo_mines,picked,'cashout',{},1300,zero);assert.ok(BigInt(win.payout_minor)>=100n);
 const loss=advanceGame(GAMES.turbo_mines,state,'pick',{cell:state.mines[0]},1200,zero);assert.equal(loss.payout_minor,'0');assert.equal(publicRound(GAMES.turbo_mines,loss).cashout_minor,'0');
 assert.equal(publicRound(GAMES.turbo_mines,loss).mines.length,3);
});
test('crash automatic cashout survives a delayed request and the hard cap pays automatically',()=>{
 const rng={int:()=>0xffffffff,bytes:n=>new Uint8Array(n)};
 const auto=startGame(GAMES.jetx,100n,{auto_cashout:'2.00'},1000,rng);
 const result=advanceGame(GAMES.jetx,auto,'expire',{},auto.crash_at+10000,zero);
 assert.equal(result.reason,'AUTO_CASHOUT');assert.equal(result.payout_minor,'200');
 assert.equal(maximumLiability(GAMES.jetx,100n,{auto_cashout:'2.00'}),200n);
 const cap=startGame(GAMES.jetx,100n,{},1000,rng);assert.equal(publicRound(GAMES.jetx,cap).crash_capped,undefined);
 assert.equal(advanceGame(GAMES.jetx,cap,'expire',{},cap.crash_at,zero).payout_minor,'10000');
 assert.throws(()=>startGame(GAMES.jetx,100n,{auto_cashout:'0.00'},0,zero));
});
test('unplayed expired rounds refund the stake and played rounds cash out',()=>{
 const state=startGame(GAMES.turbo_mines,100n,{mines:3},1000,zero);
 assert.equal(advanceGame(GAMES.turbo_mines,state,'expire',{},state.expires_at,zero).reason,'EXPIRED_UNPLAYED_REFUND');
 const safe=Array.from({length:25},(_,i)=>i).find(i=>!state.mines.includes(i));
 const picked=advanceGame(GAMES.turbo_mines,state,'pick',{cell:safe},1100,zero);
 assert.equal(advanceGame(GAMES.turbo_mines,picked,'expire',{},state.expires_at,zero).reason,'CASHOUT');
});
test('Plinko follows a real peg path with bounded binomial payouts',()=>{
 for(const risk of ['low','medium','high']){const state=startGame(GAMES.plinkox,100n,{risk},0,zero);assert.equal(state.path.length,GAMES.plinkox.plinko_rows);assert.equal(state.bucket,0);assert.ok(BigInt(state.payout_minor)<=maximumLiability(GAMES.plinkox,100n,{risk}));}
 assert.throws(()=>startGame(GAMES.plinkox,100n,{risk:'unlimited'},0,zero));
});
test('Dice uses two dice and validates target sums',()=>{
 const win=startGame(GAMES.roll_dice,100n,{target:2},0,zero);assert.deepEqual(win.rolls,[1,1]);assert.equal(win.payout_minor,'3492');
 const lost=startGame(GAMES.neon_dice,100n,{target:7},0,zero);assert.equal(lost.payout_minor,'0');assert.throws(()=>startGame(GAMES.roll_dice,100n,{target:13},0,zero));
});
test('Hi-Lo has higher/lower choices, ties lose and limits are enforced',()=>{
 const initial=startGame(GAMES.mega_hilo,100n,{},0,{int:()=>6,bytes:n=>new Uint8Array(n)});
 const won=advanceGame(GAMES.mega_hilo,initial,'guess',{choice:'higher'},1,{int:()=>7,bytes:n=>new Uint8Array(n)});
 assert.equal(won.rank,8);assert.equal(won.status,'active');assert.ok(BigInt(publicRound(GAMES.mega_hilo,won).cashout_minor)>100n);
 const settled=advanceGame(GAMES.mega_hilo,won,'cashout',{},2,zero);assert.equal(settled.status,'settled');
 const tie=advanceGame(GAMES.mega_hilo,initial,'guess',{choice:'higher'},1,{int:()=>6,bytes:n=>new Uint8Array(n)});assert.equal(tie.reason,'INCORRECT_GUESS');
 const low=startGame(GAMES.mega_hilo,100n,{},0,zero);assert.throws(()=>advanceGame(GAMES.mega_hilo,low,'guess',{choice:'lower'},1,zero));
});
test('Slots evaluates paylines and Wheel returns a real segment',()=>{
 const slots=startGame(GAMES.burning_ice,100n,{},0,zero);assert.equal(slots.grid.length,3);assert.equal(slots.grid[0].length,5);assert.equal(slots.winning_lines.length,5);
 assert.ok(BigInt(slots.payout_minor)>0n);assert.ok(BigInt(slots.payout_minor)<=maximumLiability(GAMES.burning_ice,100n));
 const wheel=startGame(GAMES.spin_x,100n,{},0,zero);assert.equal(wheel.segment,0);assert.equal(wheel.payout_minor,'0');
});
