// Explicit isolated PostgreSQL review. PGlite runs in memory; a production
// DATABASE_URL is forbidden. The retained canonical wallet class and native
// LibraryService execute their actual SQL and unchanged model evaluators.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {createOperatorRelease,OPERATOR_IDS} from '../../deploy/smartsoft/operator-policy-r16.mjs';

if(process.env.DATABASE_URL)throw Error('PRODUCTION_DATABASE_URL_FORBIDDEN_IN_REVIEW');
const root=process.env.SMARTSOFT_REVIEW_NATIVE_ROOT,pglite=process.env.SMARTSOFT_PGLITE_MODULE;
if(!root||!pglite)throw Error('EXPLICIT_NATIVE_REVIEW_ROOT_AND_PGLITE_REQUIRED');
const {PGlite}=await import(pathToFileURL(resolve(pglite)));
const policy=JSON.parse(await readFile(new URL('../../deploy/smartsoft/operator-policy-r16.json',import.meta.url)));
for(const evidence of policy.evidence){const bytes=await readFile(join(root,evidence.path));assert.equal(createHash('sha256').update(bytes).digest('hex'),evidence.sha256,evidence.path);}
const temp=await mkdtemp(join(tmpdir(),'superwin-r16-review-'));
const original=await readFile(join(root,'native-family-preserved.mjs'),'utf8');
assert.ok(original.includes('class q{'),'Retained canonical wallet constructor changed');
globalThis.Bun={SQL:class{constructor(){throw Error('NETWORK_DATABASE_FORBIDDEN');}}};
await writeFile(join(temp,'canonical.mjs'),original+'\nexport {q as ReviewSharedWallet};\n');
const {ReviewSharedWallet}=await import(pathToFileURL(join(temp,'canonical.mjs')));
const native=await import(pathToFileURL(join(root,'remaining20/models/smartsoft-operator-rounds.mjs')));
const legacy=await import(pathToFileURL(join(root,'remaining20/models/smartsoft-slot-rounds.mjs')));
const {LibraryService,createRegistry,seededRandom}=await import(pathToFileURL(join(root,'library-service.mjs')));
const {createRemainingRegistry}=await import(pathToFileURL(join(root,'remaining20/server/remaining20-registry.mjs')));
const {installRemainingReserveGuard}=await import(pathToFileURL(join(root,'remaining20/server/remaining20-reserve.mjs')));
const readiness=JSON.parse(await readFile(join(root,'remaining20/release-readiness.json')));
const SCHEMA=`CREATE SCHEMA sw_rebuild;
 CREATE TABLE sw_rebuild.users(id text PRIMARY KEY,parent_id text,role text NOT NULL,status text NOT NULL);
 CREATE TABLE sw_rebuild.wallets(id text PRIMARY KEY,balance bigint NOT NULL CHECK(balance>=0),credit_limit bigint NOT NULL);
 CREATE TABLE sw_rebuild.transfers(id text PRIMARY KEY,sender text REFERENCES sw_rebuild.wallets(id),recipient text REFERENCES sw_rebuild.wallets(id),amount bigint NOT NULL CHECK(amount>0),kind text,actor text,notes text);
 CREATE TABLE sw_rebuild.ledger(id bigserial PRIMARY KEY,transfer_id text REFERENCES sw_rebuild.transfers(id),wallet_id text REFERENCES sw_rebuild.wallets(id),delta bigint NOT NULL);
 CREATE TABLE sw_rebuild.rounds(id text PRIMARY KEY,user_id text,game text,bet bigint,payout bigint,outcome jsonb);
 CREATE TABLE sw_rebuild.audit(id bigserial PRIMARY KEY,actor text,event text,target text,details jsonb);
 CREATE TABLE sw_rebuild.account_limits(user_id text PRIMARY KEY,max_balance bigint);
 CREATE TABLE sw_rebuild.live_revisions(user_id text PRIMARY KEY,revision bigint NOT NULL);
 CREATE FUNCTION sw_rebuild.sw_live_touch(text[]) RETURNS void LANGUAGE SQL AS 'SELECT';
 CREATE SCHEMA sw_jetx_native;
 CREATE TABLE sw_jetx_native.bets(id text PRIMARY KEY,user_id text,status text);
 CREATE SCHEMA sw_observed_machines;
 CREATE TABLE sw_observed_machines.rounds(id text PRIMARY KEY,status text,state jsonb);
 INSERT INTO sw_rebuild.users VALUES('fixture-agent',NULL,'agent','active'),('fixture-player','fixture-agent','player','active'),('fixture-other','fixture-agent','player','active');
 INSERT INTO sw_rebuild.wallets VALUES('fixture-player',10000000000,0),('fixture-other',10000000000,0),('house',100000000000000,0);`;
const user='fixture-player',money=value=>BigInt(value.replace('.',''));

async function fixture(){
 const db=new PGlite();await db.exec(SCHEMA);
 const wrap=connection=>({unsafe:async(sql,args=[])=>{
  if(args.length===0&&sql.includes(';')){await connection.exec(sql);return [];}
  return (await connection.query(sql,args)).rows;
 }});
 const sql={...wrap(db),begin:callback=>db.transaction(tx=>callback(wrap(tx)))};
 const shared=new ReviewSharedWallet(sql);await shared.migrate();
 let enabled=true,now=1794288000000,chosenId=randomUUID(),chosenSeed='1'.repeat(64);
 const released=createOperatorRelease(native,{policy,readiness,isEnabled:()=>enabled});
 const registry=createRemainingRegistry(createRegistry([]),{createRegistry,adapters:[legacy,released],ids:OPERATOR_IDS,canStart:released.operatorCanStart});
 const service=new LibraryService(shared,{registry,accepting:true,now:()=>now,id:()=>chosenId,seed:()=>chosenSeed});
 await service.migrate();installRemainingReserveGuard(service);
 const query=(sql,args)=>shared.sql.unsafe(sql,args);
 const balance=async id=>BigInt((await query('SELECT balance::text AS n FROM sw_rebuild.wallets WHERE id=$1',[id]))[0].n);
 const total=async()=>BigInt((await query('SELECT sum(balance)::text AS n FROM sw_rebuild.wallets'))[0].n);
 const count=async table=>Number((await query('SELECT count(*)::text AS n FROM '+table))[0].n);
 const start=(id,stake='1.00',extra={})=>({request_id:randomUUID(),type:'start',game_id:id,model_version:native.definitions[id].version,stake,options:{autoCollect:true},...extra});
 function chooseRound(id,{winning=false}={}){
  chosenId=randomUUID();
  for(let i=0;i<10000;i++){
   chosenSeed=createHash('sha256').update('isolated-review-'+i).digest('hex');
   if(!winning)return;
   const result=native.evaluateDraftRound(id,{stakeMinor:'100'},seededRandom(chosenSeed,chosenId+':0'),now);
   if(result.state.status==='active'&&result.state.gambleAttempts===0&&BigInt(result.state.currentCashoutMinor)>0n&&BigInt(result.state.currentCashoutMinor)<=50000n)return;
  }
  throw Error('WINNING_REVIEW_SEED_NOT_FOUND');
 }
 async function conserved(expected){
  assert.equal(await total(),expected);
  assert.equal((await query('SELECT count(*)::text AS n FROM (SELECT transfer_id FROM sw_rebuild.ledger GROUP BY transfer_id HAVING sum(delta)<>0 OR count(*)<>2) invalid'))[0].n,'0');
 }
 return {db,shared,service,query,balance,total,count,start,chooseRound,conserved,setEnabled:v=>{enabled=v;},advance:ms=>{now+=ms;},close:()=>db.close()};
}

for(const id of OPERATOR_IDS)test(id+': canonical debit, payout, min/max stake and exact replay after closure',async()=>{
 const f=await fixture();try{
  const initial=await f.total(),before=await f.balance(user);f.chooseRound(id);
  const body=f.start(id),result=await f.service.action(user,body);
  assert.equal(result.game.launchable,true);assert.equal(result.currency,'ETB');assert.equal(result.round.status,'settled');
  assert.equal(await f.balance(user),before-100n+BigInt(result.round.payoutMinor));
  const transfers=await f.count('sw_rebuild.transfers'),rounds=await f.count('sw_native_library.rounds');
  f.setEnabled(false);
  const retry=await Promise.all(Array.from({length:3},()=>f.service.action(user,body)));
  assert.ok(retry.every(row=>row.replayed&&row.round.round_id===result.round.round_id));
  assert.equal(await f.count('sw_rebuild.transfers'),transfers);assert.equal(await f.count('sw_native_library.rounds'),rounds);
  await assert.rejects(()=>f.service.action(user,f.start(id)),/REMAINING_GAME_NOT_RELEASED/);
  f.setEnabled(true);f.chooseRound(id);const prior=await f.balance(user),maximum=await f.service.action(user,f.start(id,'40000.00'));
  assert.equal(maximum.round.stakeMinor,'4000000');assert.equal(await f.balance(user),prior-4000000n+BigInt(maximum.round.payoutMinor));
  const remainingTransfers=await f.count('sw_rebuild.transfers');
  for(const stake of ['0.00','0.50','40001.00'])await assert.rejects(()=>f.service.action(user,f.start(id,stake)));
  assert.equal(await f.count('sw_rebuild.transfers'),remainingTransfers);
  await f.conserved(initial);
 }finally{await f.close();}
});

test('an accepted win and its original version collect once after the new-start gate closes',async()=>{
 const f=await fixture(),id=OPERATOR_IDS[0];try{
  const initial=await f.total();f.chooseRound(id,{winning:true});
  const accepted=await f.service.action(user,f.start(id,'1.00',{options:{autoCollect:false}}));
  assert.equal(accepted.round.status,'active');f.setEnabled(false);
  await f.query('INSERT INTO sw_rebuild.account_limits VALUES($1,1)',[user]);
  const body={request_id:randomUUID(),type:'action',game_id:id,model_version:accepted.round.model_version,round_id:accepted.round.round_id,expected_version:accepted.round.version,action:'collect',input:{}};
  const before=await f.balance(user),collected=await f.service.action(user,body);
  assert.equal(collected.round.status,'settled');assert.equal(await f.balance(user),before+BigInt(accepted.round.currentCashoutMinor));
  const records=await f.count('sw_rebuild.ledger');await f.service.action(user,body);assert.equal(await f.count('sw_rebuild.ledger'),records);await f.conserved(initial);
 }finally{await f.close();}
});

test('reserved expiry pays a blocked account after closure without a new wager',async()=>{
 const f=await fixture(),id=OPERATOR_IDS[1];try{
  const initial=await f.total();f.chooseRound(id,{winning:true});const accepted=await f.service.action(user,f.start(id,'1.00',{options:{autoCollect:false}}));
  f.setEnabled(false);await f.query("UPDATE sw_rebuild.users SET status='blocked' WHERE id=$1",[user]);f.advance(native.COLLECTION_MS+1);
  const before=await f.balance(user);assert.equal((await f.service.reconcile()).settled,1);assert.equal(await f.balance(user),before+BigInt(accepted.round.currentCashoutMinor));
  assert.equal((await f.service.reconcile()).settled,0);await assert.rejects(()=>f.service.action(user,f.start(id)),/ACCOUNT_BLOCKED/);await f.conserved(initial);
 }finally{await f.close();}
});

test('insufficient house reserve and account limits roll back every debit and new row',async()=>{
 const f=await fixture(),id=OPERATOR_IDS[0];try{
  await f.query("UPDATE sw_rebuild.wallets SET balance=1 WHERE id='house'");const before=await f.balance(user),wallets=await f.count('sw_rebuild.wallets');
  await assert.rejects(()=>f.service.action(user,f.start(id)),/BANKROLL_CAPACITY_UNAVAILABLE/);
  assert.equal(await f.balance(user),before);assert.equal(await f.count('sw_rebuild.wallets'),wallets);assert.equal(await f.count('sw_rebuild.transfers'),0);
  await f.query("UPDATE sw_rebuild.wallets SET balance=100000000000000 WHERE id='house'");await f.query('INSERT INTO sw_rebuild.account_limits VALUES($1,$2)',[user,String(before)]);
  await assert.rejects(()=>f.service.action(user,f.start(id)),/POTENTIAL_PAYOUT_EXCEEDS_ACCOUNT_LIMIT/);
  assert.equal(await f.count('sw_native_library.rounds'),0);assert.equal(await f.count('sw_rebuild.transfers'),0);
 }finally{await f.close();}
});

test('already accepted observed awards retain their funding before any new stake debit',async()=>{
 const f=await fixture(),id=OPERATOR_IDS[0];try{
  const liability=native.maximumPayoutMinor(id,'100');await f.query("UPDATE sw_rebuild.wallets SET balance=$1 WHERE id='house'",[liability]);
  await f.query("INSERT INTO sw_observed_machines.rounds VALUES('accepted-before-release','pending',$1::jsonb)",[JSON.stringify({pendingWinMinor:liability})]);
  await assert.rejects(()=>f.service.action(user,f.start(id)),/BANKROLL_CAPACITY_UNAVAILABLE/);assert.equal(await f.count('sw_rebuild.transfers'),0);assert.equal(await f.count('sw_native_library.rounds'),0);
 }finally{await f.close();}
});

test('identity, JetX exclusion and cross-account receipts remain enforced',async()=>{
 const f=await fixture(),id=OPERATOR_IDS[0];try{
  await assert.rejects(()=>f.service.action('fixture-agent',f.start(id)),/PLAYER_REQUIRED/);
  await f.query("INSERT INTO sw_jetx_native.bets VALUES('old-accepted-jetx',$1,'active')",[user]);
  await assert.rejects(()=>f.service.action(user,f.start(id)),/FINISH_ACTIVE_ROUND:jetx_native/);assert.equal(await f.count('sw_rebuild.transfers'),0);
  await f.query('DELETE FROM sw_jetx_native.bets');f.chooseRound(id,{winning:true});const accepted=await f.service.action(user,f.start(id,'1.00',{options:{autoCollect:false}}));
  const request={request_id:randomUUID(),type:'action',game_id:id,model_version:accepted.round.model_version,round_id:accepted.round.round_id,expected_version:0,action:'collect',input:{}};
  await assert.rejects(()=>f.service.action('fixture-other',request),/ROUND_NOT_FOUND/);
  const transfers=await f.count('sw_rebuild.transfers');await assert.rejects(()=>f.service.action(user,{...f.start(id),model_version:'wrong-version'}),/GAME_RULES_UPDATED_RELOAD/);assert.equal(await f.count('sw_rebuild.transfers'),transfers);
 }finally{await f.close();}
});

test('a retained gamble is replayed exactly once and cannot change its selection under the same request',async()=>{
 const f=await fixture(),id=OPERATOR_IDS[0];try{
  const initial=await f.total();f.chooseRound(id,{winning:true});
  const accepted=await f.service.action(user,f.start(id,'1.00',{options:{autoCollect:false}}));
  assert.ok(accepted.round.actions.includes('gamble'));
  const body={request_id:randomUUID(),type:'action',game_id:id,model_version:accepted.round.model_version,round_id:accepted.round.round_id,expected_version:accepted.round.version,action:'gamble',input:{color:'red'}};
  const result=await f.service.action(user,body),records=await f.count('sw_rebuild.ledger');
  assert.equal(result.round.gambleAttempts,1);
  f.setEnabled(false);
  const retried=await f.service.action(user,body);assert.equal(retried.replayed,true);assert.deepEqual(retried.round,result.round);
  await assert.rejects(()=>f.service.action(user,{...body,input:{color:'black'}}),/REQUEST_ID_CONFLICT/);
  assert.equal(await f.count('sw_rebuild.ledger'),records);
  if(result.round.status==='active')await f.service.action(user,{...body,request_id:randomUUID(),expected_version:result.round.version,action:'collect',input:{}});
  await f.conserved(initial);
 }finally{await f.close();}
});

test('simultaneous new active wagers cannot debit twice and an unfunded player cannot start',async()=>{
 const f=await fixture(),id=OPERATOR_IDS[0];try{
  f.chooseRound(id,{winning:true});const initial=await f.total(),before=await f.balance(user);
  const started=await Promise.allSettled([f.service.action(user,f.start(id,'1.00',{options:{autoCollect:false}})),f.service.action(user,f.start(id,'1.00',{options:{autoCollect:false}}))]);
  assert.equal(started.filter(r=>r.status==='fulfilled').length,1);assert.equal(started.filter(r=>r.status==='rejected').length,1);
  assert.match(started.find(r=>r.status==='rejected').reason.message,/FINISH_ACTIVE_ROUND/);
  assert.equal(await f.balance(user),before-100n);assert.equal(await f.count('sw_native_library.rounds'),1);await f.conserved(initial);
  await f.query('UPDATE sw_rebuild.wallets SET balance=0 WHERE id=$1',['fixture-other']);
  f.chooseRound(id);
  const records=await f.count('sw_rebuild.transfers');await assert.rejects(()=>f.service.action('fixture-other',f.start(id)),/INSUFFICIENT/);
  assert.equal(await f.count('sw_rebuild.transfers'),records);assert.equal(await f.count('sw_native_library.rounds'),1);
 }finally{await f.close();}
});

test.after(async()=>{await rm(temp,{recursive:true,force:true});});
