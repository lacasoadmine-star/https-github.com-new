// Optional genuine PostgreSQL tests. Only a fresh disposable loopback database
// named special74_qa is accepted; DATABASE_URL is deliberately never read.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
import {createOperatorSlotCore,operatorGambleDraw,OPERATOR_ID} from '../operator-math/retained-core-adapter.mjs';
import {prepareOperatorRuntime,RETAINED_RUNTIME_SHA256} from './prepare-operator-runtime.mjs';
const require=createRequire(import.meta.url),{Pool}=require('pg');
const [runtimePath,bundlePath,reportPath]=process.argv.slice(2);
if(!runtimePath||!bundlePath||!reportPath||process.env.SPECIAL74_DISPOSABLE_POSTGRES!=='1')throw Error('Explicit disposable PostgreSQL opt-in and runtime/bundle/report paths required');
const connection=new URL(process.env.SPECIAL74_LOCAL_PG_URL||'');
if(connection.protocol!=='postgresql:'||connection.hostname!=='127.0.0.1'||connection.pathname!=='/special74_qa'||connection.port!=='55474')throw Error('Only the dedicated loopback PostgreSQL fixture at 127.0.0.1:55474/special74_qa is accepted');
const hash=value=>createHash('sha256').update(value).digest('hex');
const runtime=await readFile(runtimePath,'utf8'),bundle=await readFile(bundlePath,'utf8');
const modelHash=hash(await readFile(new URL('../operator-math/multi-hot-5.mjs',import.meta.url)));
const candidate=prepareOperatorRuntime({runtime,adapterBundle:bundle,modelSha256:modelHash});
const cut=(text,start,end)=>{const a=text.indexOf(start),b=text.indexOf(end,a);if(a<0||b<0)throw Error('EXPECTED_SOURCE_MISSING');return text.slice(a,b);};
const pool=new Pool({connectionString:connection.href,max:12,connectionTimeoutMillis:3000});
const checks=[];const check=async(name,fn)=>{await fn();checks.push({name,passed:true});};
try{
 const version=(await pool.query('SHOW server_version')).rows[0].server_version;
 if((await pool.query("SELECT to_regnamespace('sw_rebuild') AS existing")).rows[0].existing!==null)throw Error('Database is not fresh; refusing fixture setup');
 // Minimal shared-ledger fixture, deliberately not asserted to match every live
 // trigger or constraint. The sw_nine migration below is the exact retained one.
 await pool.query(`CREATE SCHEMA sw_rebuild; CREATE SCHEMA sw_native_library;
 CREATE TABLE sw_rebuild.users(id text PRIMARY KEY,role text NOT NULL,status text NOT NULL);
 CREATE TABLE sw_rebuild.sessions(token text PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),expires bigint NOT NULL);
 CREATE TABLE sw_rebuild.wallets(id text PRIMARY KEY,balance bigint NOT NULL CHECK(balance>=0));
 CREATE TABLE sw_rebuild.transfers(id text PRIMARY KEY,sender text NOT NULL REFERENCES sw_rebuild.wallets(id),recipient text NOT NULL REFERENCES sw_rebuild.wallets(id),amount bigint NOT NULL CHECK(amount>0),kind text NOT NULL,actor text NOT NULL);
 CREATE TABLE sw_rebuild.ledger(transfer_id text NOT NULL REFERENCES sw_rebuild.transfers(id),wallet_id text NOT NULL REFERENCES sw_rebuild.wallets(id),delta bigint NOT NULL,PRIMARY KEY(transfer_id,wallet_id));
 CREATE TABLE sw_rebuild.rounds(id text PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),game varchar(64) NOT NULL,bet bigint NOT NULL,payout bigint NOT NULL,outcome jsonb NOT NULL,settled_order bigint GENERATED ALWAYS AS IDENTITY UNIQUE,created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE sw_rebuild.account_limits(user_id text PRIMARY KEY,max_balance bigint);
 CREATE TABLE sw_native_library.rounds(id text PRIMARY KEY,user_id text NOT NULL,game_id text NOT NULL,status text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());`);
 const migration=JSON.parse(runtime.match(/^const migration = (".*");$/m)?.[1]??'null');if(typeof migration!=='string')throw Error('RETAINED_MIGRATION_MISSING');await pool.query(migration);
 const prefix=cut(runtime,'import { randomUUID, createHash, randomInt }','const Originals =');
 const retained=await import('data:text/javascript;base64,'+Buffer.from(prefix+'\nexport {versioned};').toString('base64'));
 let randomMode='win',word=0,forcedFault=null,draws=0;
 const nextUint32=()=>randomMode==='win'?0:word++%9;
 const wrapped=createOperatorSlotCore(retained.versioned,{sha256:modelHash,enabled:true,nextUint32});
 const core={...wrapped,spin(...args){draws++;return wrapped.spin(...args);}};
 const token='a'.repeat(64),uid='disposable-pg-user';
 const request=new Request('https://fixture.invalid/api/slots/spin',{method:'POST',headers:{cookie:'sw_session='+token,origin:'https://fixture.invalid','content-type':'application/json'}});
 // Redis intentionally bypassed: PostgreSQL row locking and durable request
 // uniqueness must remain sufficient when the volatile lock is unavailable.
 const redis={async set(){return 'OK';},async eval(){return 1;}};
 const fault=stage=>{if(stage===forcedFault)throw Error('INJECTED_FAILURE');};
 const special74Operator={operatorGambleDraw:(...args)=>operatorGambleDraw(...args,()=>0)};
 const context={pool,redis,qa:false,randomUUID,fault,createHash,versioned:core,special74Operator};
 const constants=cut(runtime,'class ServiceError extends Error','async function createSlotService(');
 const freshHooks=cut(runtime,'function createFreshReleaseHooks(','class ServiceError extends Error');
 const availability=cut(runtime,'function referenceAvailableGame(','function referenceReceiptVerification(');
 const dbMethods=cut(runtime,'  async function transaction(fn)','  const referenceReceiptCheck');
 const settlement=cut(candidate.runtime,'  async function settle(req, body)','  async function reconcile()');
 const harness=new Function(...Object.keys(context),`${constants}
 const {MATH,getGame,modelIdentity,receiptGame,toUnits,publicGames,gambleDraw,bonusRewards}=versioned;
 const spin=(...args)=>versioned.spin(...args);const isFreshBuilt=id=>id==="special74_multi_hot_5_v1";const accepting=true,houseFor=()=>"house";
 ${freshHooks}\n${availability}\n${dbMethods}
 const freshReleaseFor=gameId=>createFreshReleaseHooks({hash,authenticate,balance,lockWallets,transaction,cash,publicGames,modelIdentity,fail,isAccepting:()=>accepting,gameId});
 ${settlement}
 return {settle,action,hooks:freshReleaseFor("special74_multi_hot_5_v1")};`)(...Object.values(context));
 const guard=harness.hooks.sessionGuard(request,uid);
 const body=()=>({gameId:OPERATOR_ID,bet:'0.05',roundToken:randomUUID(),sessionGuard:guard,...core.modelIdentity(OPERATOR_ID)});
 async function reset(balance=10000n){
  await pool.query('TRUNCATE sw_nine.actions,sw_nine.free_spins,sw_nine.wallet_transactions,sw_nine.game_rounds,sw_nine.reconciliation_flags,sw_rebuild.ledger,sw_rebuild.transfers,sw_rebuild.rounds,sw_rebuild.sessions,sw_rebuild.users,sw_rebuild.wallets,sw_rebuild.account_limits,sw_native_library.rounds RESTART IDENTITY');
  await pool.query("INSERT INTO sw_rebuild.users VALUES($1,'player','active')",[uid]);
  await pool.query('INSERT INTO sw_rebuild.sessions VALUES($1,$2,$3)',[token,uid,Date.now()+3600000]);
  await pool.query("INSERT INTO sw_rebuild.wallets VALUES($1,$2),('house',1000000000)",[uid,balance.toString()]);
  randomMode='win';word=0;forcedFault=null;draws=0;
 }
 const balance=async()=>BigInt((await pool.query('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[uid])).rows[0].balance);
 const count=async table=>Number((await pool.query('SELECT count(*) AS n FROM '+table)).rows[0].n);
 const conserved=async()=>{const r=await pool.query('SELECT coalesce(sum(delta),0) AS net FROM sw_rebuild.ledger');assert.equal(BigInt(r.rows[0].net),0n);};

 await check('twelve simultaneous same-token starts settle exactly one PostgreSQL wager',async()=>{
  await reset();const input=body(),results=await Promise.all(Array.from({length:12},()=>harness.settle(request,input)));
  results.forEach(result=>assert.deepEqual(result,results[0]));assert.equal(draws,1);assert.equal(await count('sw_nine.game_rounds'),1);assert.equal(await count('sw_rebuild.transfers'),2);assert.equal(await balance(),10045n);await conserved();
 });
 await check('simultaneous different tokens cannot spend the same last balance twice',async()=>{
  await reset(5n);randomMode='loss';const results=await Promise.allSettled([harness.settle(request,body()),harness.settle(request,body())]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const failed=results.find(r=>r.status==='rejected');assert.match(failed.reason.message,/INSUFFICIENT_FUNDS/);
  assert.equal(draws,1);assert.equal(await balance(),0n);assert.equal(await count('sw_nine.game_rounds'),1);assert.equal(await count('sw_rebuild.transfers'),1);await conserved();
 });
 await check('actual PostgreSQL rolls back failures after debit, after credit and before commit',async()=>{
  for(const stage of ['after_debit','after_credit','before_commit']){await reset();forcedFault=stage;const input=body();await assert.rejects(harness.settle(request,input),/INJECTED_FAILURE/);
   assert.equal(await balance(),10000n);for(const table of ['sw_nine.game_rounds','sw_nine.wallet_transactions','sw_rebuild.transfers','sw_rebuild.ledger'])assert.equal(await count(table),0);
   forcedFault=null;await harness.settle(request,input);assert.equal(await balance(),10045n);assert.equal(await count('sw_nine.game_rounds'),1);await conserved();}
 });
 await check('same-token changed parameters reject after canonical PostgreSQL settlement',async()=>{
  await reset();const input=body();await harness.settle(request,input);await assert.rejects(harness.settle(request,{...input,bet:'0.10'}),/IDEMPOTENCY_PARAMETER_CONFLICT/);assert.equal(await count('sw_nine.game_rounds'),1);assert.equal(await balance(),10045n);
 });
 await check('concurrent Gamble request retries debit once and return the same durable receipt',async()=>{
  await reset();const round=await harness.settle(request,body());const input={roundId:round.roundId,roundToken:randomUUID(),choice:'RED',sessionGuard:guard,expectedAttempt:1,expectedStake:'0.50'};
  const results=await Promise.all(Array.from({length:12},()=>harness.action(request,input,'GAMBLE')));results.forEach(r=>assert.deepEqual(r,results[0]));
  assert.equal(await count('sw_nine.actions'),1);assert.equal(await balance(),10095n);assert.equal(await count('sw_rebuild.transfers'),4);await conserved();
 });
 await check('two different Gamble tokens race safely against the same expected attempt',async()=>{
  await reset();const round=await harness.settle(request,body()),input={roundId:round.roundId,choice:'RED',sessionGuard:guard,expectedAttempt:1,expectedStake:'0.50'};
  const results=await Promise.allSettled([harness.action(request,{...input,roundToken:randomUUID()},'GAMBLE'),harness.action(request,{...input,roundToken:randomUUID()},'GAMBLE')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/GAMBLE_STATE_CHANGED/);assert.equal(await count('sw_nine.actions'),1);assert.equal(await balance(),10095n);await conserved();
 });
 await check('replay-only requests without a stored result never originate a PostgreSQL stake',async()=>{
  await reset();await assert.rejects(harness.settle(request,{...body(),replayOnly:true}),/ROUND_NOT_CONFIRMED/);assert.equal(await count('sw_rebuild.transfers'),0);
  const round=await harness.settle(request,body());await assert.rejects(harness.action(request,{roundId:round.roundId,roundToken:randomUUID(),choice:'RED',sessionGuard:guard,expectedAttempt:1,expectedStake:'0.50',replayOnly:true},'GAMBLE'),/GAMBLE_STATE_CHANGED/);
  assert.equal(await count('sw_nine.actions'),0);assert.equal(await balance(),10045n);
 });
 await check('fresh-state reload returns exact live PostgreSQL receipt and latest Gamble amount',async()=>{
  await reset();const round=await harness.settle(request,body());await harness.action(request,{roundId:round.roundId,roundToken:randomUUID(),choice:'RED',sessionGuard:guard,expectedAttempt:1,expectedStake:'0.50'},'GAMBLE');
  const state=await harness.hooks.state(request,uid);assert.equal(state.balance,'100.95');assert.equal(state.round.result.finalWin,'0.50');assert.equal(state.round.gamble.stake,'1.00');assert.equal(state.game.mathSha256,modelHash);
 });
 const report={schemaVersion:1,retainedRuntimeSha256:RETAINED_RUNTIME_SHA256,candidateRuntimeSha256:candidate.report.candidateRuntimeSha256,modelSha256:modelHash,
  database:'Disposable local PostgreSQL',postgresVersion:version,retainedNineMigrationSha256:hash(migration),passed:checks.length,checks,
  redisLock:'Bypassed intentionally to test PostgreSQL safety independently',concurrentRequests:12,productionRequests:0,productionWalletMutations:0,financialActivationVerified:false,
  limitation:'Uses the exact retained sw_nine migration and settlement functions with a minimal local sw_rebuild fixture. Live triggers, full live schema and authenticated gateway integration remain unverified.'};
 await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:checks.length,postgresVersion:version,report:reportPath,productionRequests:0}));
}finally{await pool.end();}
