import {SQL} from 'bun';
import {test,beforeAll,beforeEach,afterAll,expect} from 'bun:test';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {NativeStore} from '../apps/native-engine/store.mjs';
import {GAMES} from '../apps/native-engine/catalog.mjs';
import {seededRandom,startGame} from '../apps/native-engine/rules.mjs';
const url=new URL(process.env.NATIVE_TEST_DATABASE_URL||'http://invalid');
if(url.hostname!=='127.0.0.1'||url.username!=='native_test'||url.pathname!=='/native_tests')throw Error('Disposable local PostgreSQL is required');
const sql=new SQL(url.href,{max:12});let now=100000;
const store=new NativeStore(sql,{now:()=>now});
const request=(game_id='roll_dice',extra={})=>({request_id:randomUUID(),type:'start',game_id,stake:'1.00',options:game_id==='roll_dice'?{target:7}:{},...extra});
const balance=async id=>BigInt((await sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[id]))[0].balance);
async function conserved(){const total=await sql.unsafe('SELECT sum(balance)::text AS total FROM sw_rebuild.wallets');expect(total[0].total).toBe('1002000000');const bad=await sql.unsafe('SELECT transfer_id FROM sw_rebuild.ledger GROUP BY transfer_id HAVING sum(delta)<>0 OR count(*)<>2');expect(bad.length).toBe(0);}
beforeAll(async()=>{await sql.unsafe(await readFile(new URL('./fixtures/native-canonical-schema.sql',import.meta.url),'utf8'));await store.migrate();});
beforeEach(async()=>{
 now=100000;
 await sql.unsafe('TRUNCATE sw_native_family.requests,sw_native_family.rounds,sw_rebuild.rounds,sw_rebuild.ledger,sw_rebuild.transfers,sw_rebuild.audit,sw_rebuild.live_revisions,sw_rebuild.account_limits,sw_rebuild.wallets,sw_rebuild.users CASCADE');
 await sql.unsafe("INSERT INTO sw_rebuild.users(id,role,status,parent_id) VALUES('owner','owner','active',NULL),('agent','agent','active','owner'),('player-a','player','active','agent'),('player-b','player','active','agent')");
 await sql.unsafe("INSERT INTO sw_rebuild.wallets(id,balance) VALUES('house',1000000000),('player-a',1000000),('player-b',1000000)");
});
afterAll(()=>sql.close());
test('migration preserves existing accounts and never creates credits',async()=>{await store.migrate();expect((await sql.unsafe('SELECT count(*)::int AS n FROM sw_rebuild.users'))[0].n).toBe(4);await conserved();});
test('instant rounds debit and credit the shared wallet with balanced ledger entries',async()=>{
 const r=await store.perform('player-a',request('burning_ice'));expect(r.round.status).toBe('settled');
 expect(await balance('player-a')).toBe(1000000n-100n+BigInt(r.round.payout_minor));
 expect(await balance('game-reserve:native-family:'+r.round.round_id)).toBe(0n);
 expect((await sql.unsafe('SELECT count(*)::int AS n FROM sw_rebuild.rounds'))[0].n).toBe(1);await conserved();
});
test('twenty concurrent copies of one request settle exactly once',async()=>{
 const q=request('plinkox',{options:{risk:'high'}});const results=await Promise.all(Array.from({length:20},()=>store.perform('player-a',q)));
 expect(new Set(results.map(r=>r.round.round_id)).size).toBe(1);
 expect((await sql.unsafe('SELECT count(*)::int AS n FROM sw_native_family.requests'))[0].n).toBe(1);
 expect((await sql.unsafe('SELECT count(*)::int AS n FROM sw_rebuild.rounds'))[0].n).toBe(1);await conserved();
});
test('forty concurrent distinct rounds retain every update',async()=>{
 const results=await Promise.all(Array.from({length:40},()=>store.perform('player-a',request())));
 expect(await balance('player-a')).toBe(1000000n-4000n+results.reduce((sum,r)=>sum+BigInt(r.round.payout_minor),0n));
 expect((await sql.unsafe('SELECT count(*)::int AS n FROM sw_rebuild.rounds'))[0].n).toBe(40);await conserved();
});
test('one active round prevents concurrent overspending and overlapping games',async()=>{
 await sql.unsafe("UPDATE sw_rebuild.wallets SET balance=100 WHERE id='player-a'");
 const outcomes=await Promise.allSettled(Array.from({length:15},()=>store.perform('player-a',request('turbo_mines'))));
 expect(outcomes.filter(r=>r.status==='fulfilled').length).toBe(1);expect(await balance('player-a')).toBe(0n);
 expect((await sql.unsafe("SELECT count(*)::int AS n FROM sw_native_family.rounds WHERE status='active'"))[0].n).toBe(1);
});
test('same token with changed parameters is a conflict, while a replay has current balance',async()=>{
 const q=request();const r=await store.perform('player-a',q);
 await expect(store.perform('player-a',{...q,stake:'2.00'})).rejects.toThrow('REQUEST_ID_CONFLICT');
 await store.transaction('player-a',tx=>store.move(tx,'house','player-a',100n,'isolated-legacy-credit','owner','test','Isolated test only'));
 const replay=await store.perform('player-a',q);expect(replay.replayed).toBe(true);expect(replay.balance).toBe(r.balance);expect(replay.current_balance).not.toBe(r.balance);await conserved();
});
async function mineRound(){
 const start=await store.perform('player-a',request('turbo_mines'));const row=(await sql.unsafe('SELECT state FROM sw_native_family.rounds WHERE id=$1',[start.round.round_id]))[0];
 const state=typeof row.state==='string'?JSON.parse(row.state):row.state;const cell=Array.from({length:25},(_,i)=>i).find(i=>!state.mines.includes(i));
 const pick={request_id:randomUUID(),type:'action',game_id:'turbo_mines',round_id:start.round.round_id,expected_version:0,action:'pick',input:{cell}};
 const picked=await store.perform('player-a',pick);return {start,picked,pick};
}
test('mines cashout remains funded after other games spend all remaining house funds',async()=>{
 const {start,picked}=await mineRound();
 await store.transaction('player-b',async tx=>store.move(tx,'house','player-b',await balance('house'),'isolated-other-house-spend','owner','test','Isolated bankroll test'));
 expect(await balance('house')).toBe(0n);
 const result=await store.perform('player-a',{request_id:randomUUID(),type:'action',game_id:'turbo_mines',round_id:start.round.round_id,expected_version:picked.round.version,action:'cashout',input:{}});
 expect(result.round.status).toBe('settled');expect(BigInt(result.round.payout_minor)>100n).toBe(true);await conserved();
});
test('racing cashout tokens can credit the round only once',async()=>{
 const {start,picked}=await mineRound();
 const base={type:'action',game_id:'turbo_mines',round_id:start.round.round_id,expected_version:picked.round.version,action:'cashout',input:{}};
 const results=await Promise.allSettled(Array.from({length:12},()=>store.perform('player-a',{...base,request_id:randomUUID()})));
 expect(results.filter(r=>r.status==='fulfilled').length).toBe(1);
 expect((await sql.unsafe('SELECT count(*)::int AS n FROM sw_rebuild.transfers WHERE id=$1',['nf:'+start.round.round_id+':payout']))[0].n).toBe(1);await conserved();
});
test('ownership and optimistic versions are enforced without leaking hidden results',async()=>{
 const r=await store.perform('player-a',request('turbo_mines'));
 expect(r.round.mines).toBeUndefined();expect(r.round.revealed_seed).toBeUndefined();
 const state=await store.snapshot('player-a','turbo_mines');expect(state.round.secret_seed).toBeUndefined();expect(state.round.mines).toBeUndefined();
 const q={request_id:randomUUID(),type:'action',game_id:'turbo_mines',round_id:r.round.round_id,expected_version:0,action:'cashout',input:{}};
 await expect(store.perform('player-b',q)).rejects.toThrow('ROUND_NOT_FOUND');
 await expect(store.perform('player-a',{...q,expected_version:99})).rejects.toThrow('ROUND_VERSION_CHANGED');await conserved();
});
test('blocked users cannot bet and cannot substitute a privileged account',async()=>{
 await sql.unsafe("UPDATE sw_rebuild.users SET status='blocked' WHERE id='player-a'");
 await expect(store.perform('player-a',request())).rejects.toThrow('ACCOUNT_BLOCKED');
 await expect(store.perform('owner',request())).rejects.toThrow('PLAYER_REQUIRED');
 expect((await sql.unsafe('SELECT count(*)::int AS n FROM sw_rebuild.transfers'))[0].n).toBe(0);
});
test('bankroll rejection leaves no wager, reserve wallet or receipt',async()=>{
 await sql.unsafe("UPDATE sw_rebuild.wallets SET balance=0 WHERE id='house'");
 await expect(store.perform('player-a',request())).rejects.toThrow('BANKROLL_CAPACITY_UNAVAILABLE');
 expect(await balance('player-a')).toBe(1000000n);
 expect((await sql.unsafe('SELECT count(*)::int AS n FROM sw_rebuild.wallets'))[0].n).toBe(3);
 expect((await sql.unsafe('SELECT count(*)::int AS n FROM sw_native_family.requests'))[0].n).toBe(0);
});
test('invalid stake, client outcomes and invalid options are rejected atomically',async()=>{
 for(const q of [request('roll_dice',{stake:'-1.00'}),request('roll_dice',{options:{target:99}}),request('turbo_mines',{options:{mines:25}}),request('burning_ice',{options:{payout:9999999}}),{...request(),payout:'99999999'}])await expect(store.perform('player-a',q)).rejects.toThrow();
 expect((await sql.unsafe('SELECT count(*)::int AS n FROM sw_rebuild.transfers'))[0].n).toBe(0);await conserved();
});
test('expired rounds reconcile once, refund untouched games and release reserves',async()=>{
 const r=await store.perform('player-a',request('turbo_mines'));
 await sql.unsafe("UPDATE sw_rebuild.users SET status='blocked' WHERE id='player-a'");now+=GAMES.turbo_mines.lease_ms+1;
 expect((await store.reconcile()).settled).toBe(1);expect((await store.reconcile()).settled).toBe(0);
 expect(await balance('player-a')).toBe(1000000n);expect(await balance('game-reserve:native-family:'+r.round.round_id)).toBe(0n);await conserved();
});
test('crash cashout uses authoritative time and reveals its committed seed after settlement',async()=>{
 const id='7a246168-542e-424e-9f11-616c901c431b';let seed;
 for(let i=0;;i++){seed=i.toString(16).padStart(64,'0');if(startGame(GAMES.jetx,100n,{},now,seededRandom(seed,id+':0')).crash_point>=200)break;}
 const crashStore=new NativeStore(sql,{now:()=>now,id:()=>id,seed:()=>seed});
 const r=await crashStore.perform('player-a',request('jetx'));expect(r.round.crash_point).toBeUndefined();now+=1000;
 const done=await crashStore.perform('player-a',{request_id:randomUUID(),type:'action',game_id:'jetx',round_id:id,expected_version:0,action:'cashout',input:{}});
 expect(done.round.reason).toBe('CASHOUT');expect(BigInt(done.round.payout_minor)>100n).toBe(true);
 expect(createHash('sha256').update(done.round.revealed_seed).digest('hex')).toBe(r.round.commitment);await conserved();
});
