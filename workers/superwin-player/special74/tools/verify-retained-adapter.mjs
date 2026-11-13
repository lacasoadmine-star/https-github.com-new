// Executes the retrieved, hash-pinned settlement functions against a disposable
// SQL fixture. No network, real sessions, external database or production funds.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {createOperatorSlotCore,operatorGambleDraw,OPERATOR_ID} from '../operator-math/retained-core-adapter.mjs';
import {prepareOperatorRuntime,RETAINED_RUNTIME_SHA256} from './prepare-operator-runtime.mjs';

const [runtimePath,bundlePath,reportPath]=process.argv.slice(2);
if(!runtimePath||!bundlePath||!reportPath)throw Error('Usage: verify-retained-adapter.mjs retained-runtime.mjs adapter.bundle.mjs report.json');
const hash=value=>createHash('sha256').update(value).digest('hex');
const runtime=await readFile(runtimePath,'utf8'),bundle=await readFile(bundlePath,'utf8');
const modelHash=hash(await readFile(new URL('../operator-math/multi-hot-5.mjs',import.meta.url)));
const candidate=prepareOperatorRuntime({runtime,adapterBundle:bundle,modelSha256:modelHash});
const cut=(text,start,end)=>{const a=text.indexOf(start),b=text.indexOf(end,a);if(a<0||b<0)throw Error('EXPECTED_SOURCE_MISSING');return text.slice(a,b);};
const checks=[];
const check=async(name,fn)=>{await fn();checks.push({name,passed:true});};

// Load only the actual versioned math core. Service startup is excluded.
const prefix=cut(runtime,'import { randomUUID, createHash, randomInt }','const Originals =');
const retained=await import('data:text/javascript;base64,'+Buffer.from(prefix+'\nexport {versioned};').toString('base64'));
const core=createOperatorSlotCore(retained.versioned,{sha256:modelHash,enabled:true,nextUint32:()=>0});
await check('all existing deployed game definitions and identities stay unchanged',()=>{
 const old=retained.versioned.publicGames(),current=core.publicGames();
 assert.equal(current.length,old.length+1);
 for(const game of old){assert.deepEqual(current.find(g=>g.id===game.id),game);assert.deepEqual(core.modelIdentity(game.id),retained.versioned.modelIdentity(game.id));}
});

const constants=cut(runtime,'class ServiceError extends Error','async function createSlotService(');
const freshHooks=cut(runtime,'function createFreshReleaseHooks(','class ServiceError extends Error');
const availability=cut(runtime,'function referenceAvailableGame(','function referenceReceiptVerification(');
const dbMethods=cut(runtime,'  async function transaction(fn)','  const referenceReceiptCheck');
const settlement=cut(candidate.runtime,'  async function settle(req, body)','  async function reconcile()');
const userId='disposable-test-user',token='a'.repeat(64);
const request=new Request('https://fixture.invalid/api/slots/spin',{method:'POST',headers:{cookie:'sw_session='+token,origin:'https://fixture.invalid','content-type':'application/json'}});
let db,rollback,rollbacks,transfers,forcedFault;
function reset(){db={balances:{[userId]:10000n,house:1000000000n},rounds:[],actions:[],catalogue:[],free:new Map(),limit:null,active:null};rollback=null;rollbacks=0;transfers=0;forcedFault=null;}
reset();
const response=rows=>({rows,rowCount:rows.length});
const client={release(){},async query(sql,args=[]){
 if(sql==='BEGIN'){rollback=structuredClone(db);return response([]);}
 if(sql==='COMMIT'){rollback=null;return response([]);}
 if(sql==='ROLLBACK'){db=rollback;rollback=null;rollbacks++;return response([]);}
 if(sql.startsWith('SET LOCAL'))return response([]);
 if(sql.startsWith('SELECT u.id,u.role,u.status FROM sw_rebuild.sessions'))return response(args[0].includes(token)?[{id:userId,role:'player',status:'active'}]:[]);
 if(sql.startsWith('SELECT balance FROM sw_rebuild.wallets'))return response(Object.hasOwn(db.balances,args[0])?[{balance:String(db.balances[args[0]])}]:[]);
 if(sql.startsWith('SELECT id,balance FROM sw_rebuild.wallets'))return response(args[0].map(id=>({id,balance:String(db.balances[id])})));
 if(sql.startsWith('SELECT request_hash,result_json FROM sw_nine.game_rounds'))return response(db.rounds.filter(r=>r.user_id===args[0]&&r.request_key===args[1]));
 if(sql.startsWith('SELECT request_hash,result_json FROM sw_nine.actions'))return response(db.actions.filter(r=>r.user_id===args[0]&&r.request_key===args[1]));
 if(sql.startsWith('SELECT 1 FROM sw_nine.actions WHERE user_id'))return response(db.actions.filter(r=>r.user_id===args[0]&&r.request_key===args[1]));
 if(sql.startsWith('SELECT 1 FROM sw_nine.game_rounds WHERE user_id=$1 AND request_key'))return response(db.rounds.filter(r=>r.user_id===args[0]&&r.request_key===args[1]));
 if(sql.startsWith('SELECT remaining,bet FROM sw_nine.free_spins'))return response(db.free.has(args[1])?[db.free.get(args[1])]:[]);
 if(sql.startsWith('SELECT game_id FROM sw_native_library.rounds'))return response(db.active?[{game_id:db.active}]:[]);
 if(sql.startsWith('SELECT max_balance FROM sw_rebuild.account_limits'))return response(db.limit===null?[]:[{max_balance:String(db.limit)}]);
 if(sql.startsWith('SELECT r.round_id,r.result_json,r.created_at,r.total_win FROM sw_nine.game_rounds'))return response(db.rounds.filter(r=>r.user_id===args[0]&&r.game_id===args[1]).slice(-1));
 if(sql.startsWith('INSERT INTO sw_nine.free_spins')){db.free.set(args[1],{remaining:args[2],bet:args[3]});return response([]);}
 if(sql.startsWith('INSERT INTO sw_nine.game_rounds')){db.rounds.push({round_id:args[0],user_id:args[1],game_id:args[2],total_win:args[5],request_key:args[7],request_hash:args[8],result_json:JSON.parse(args[9]),created_at:new Date().toISOString()});return response([]);}
 if(sql.startsWith('INSERT INTO sw_rebuild.rounds')){db.catalogue.push({id:args[0],user_id:args[1],settled_order:db.catalogue.length+1});return response([]);}
 if(sql.startsWith('SELECT * FROM sw_nine.game_rounds'))return response(db.rounds.filter(r=>r.round_id===args[0]&&r.user_id===args[1]));
 if(sql.startsWith('SELECT 1 FROM sw_nine.game_rounds WHERE user_id=$1 AND round_id<>')){const parent=db.rounds.find(r=>r.round_id===args[1]);return response(db.rounds.filter(r=>r.user_id===args[0]&&r.round_id!==args[1]&&r.created_at>parent.created_at));}
 if(sql.startsWith('SELECT attempt,result_json FROM sw_nine.actions'))return response(db.actions.filter(r=>r.parent_id===args[0]&&r.kind==='GAMBLE').sort((a,b)=>b.attempt-a.attempt).slice(0,1));
 if(sql.startsWith('SELECT settled_order FROM sw_rebuild.rounds'))return response(db.catalogue.filter(r=>r.id===args[0]&&r.user_id===args[1]));
 if(sql.startsWith('SELECT 1 FROM sw_rebuild.rounds WHERE user_id'))return response(db.catalogue.filter(r=>r.user_id===args[0]&&BigInt(r.settled_order)>BigInt(args[1])));
 if(sql.startsWith('INSERT INTO sw_nine.actions')){db.actions.push({parent_id:args[1],user_id:args[2],kind:args[3],request_key:args[4],request_hash:args[5],attempt:args[6],result_json:JSON.parse(args[7])});return response([]);}
 if(sql.startsWith('WITH d AS (')){
  const [from,to,raw]=args,amount=BigInt(raw);if(db.balances[from]<amount)return response([{debited:0,credited:0,recorded:0}]);
  db.balances[from]-=amount;db.balances[to]+=amount;transfers++;return response([{debited:1,credited:1,recorded:1}]);
 }
 throw Error('UNIMPLEMENTED_FIXTURE_QUERY:'+sql.slice(0,100));
}};
const pool={query:client.query.bind(client),async connect(){return client;}};
const redis={async set(){return 'OK';},async eval(){return 1;}};
const fault=stage=>{if(stage===forcedFault)throw Error('INJECTED_FAILURE');};
const special74Operator={operatorGambleDraw:(...args)=>operatorGambleDraw(...args,()=>0)};
const context={pool,redis,qa:false,randomUUID,fault,createHash,versioned:core,special74Operator};
const harness=new Function(...Object.keys(context),`
 ${constants}
 const {MATH,getGame,modelIdentity,receiptGame,toUnits,publicGames,gambleDraw,bonusRewards}=versioned;
 const spin=(...args)=>versioned.spin(...args);
 const isFreshBuilt=id=>id==="special74_multi_hot_5_v1";
 const accepting=true,houseFor=()=>"house";
 ${freshHooks}
 ${availability}
 ${dbMethods}
 const freshReleaseFor=gameId=>createFreshReleaseHooks({hash,authenticate,balance,lockWallets,transaction,cash,publicGames,modelIdentity,fail,isAccepting:()=>accepting,gameId});
 ${settlement}
 return {settle,action,hooks:freshReleaseFor("special74_multi_hot_5_v1")};
`)(...Object.values(context));
const guard=harness.hooks.sessionGuard(request,userId);
const spinBody=()=>({gameId:OPERATOR_ID,bet:'0.05',roundToken:randomUUID(),sessionGuard:guard,...core.modelIdentity(OPERATOR_ID)});

await check('actual retained handler requires exact model identity before touching funds',async()=>{
 reset();for(const key of ['mathVersion','engineVersion','mathSha256']){const body=spinBody();delete body[key];await assert.rejects(harness.settle(request,body),/GAME_RULES_UPDATED_RELOAD/);}
 assert.equal(db.rounds.length,0);assert.equal(db.balances[userId],10000n);
});
await check('actual retained spin transaction replays one canonical receipt after reply loss',async()=>{
 reset();const body=spinBody(),first=await harness.settle(request,body),second=await harness.settle(request,{...body,replayOnly:true});
 assert.deepEqual(second,first);assert.equal(db.rounds.length,1);assert.equal(db.balances[userId],10045n);assert.equal(transfers,2);assert.equal(first.walletReceipt.balanceAfter,'100.45');
 await assert.rejects(harness.settle(request,{...body,bet:'0.10'}),/IDEMPOTENCY_PARAMETER_CONFLICT/);
});
await check('actual retained replay-only spin never creates an unreceived wager',async()=>{
 reset();await assert.rejects(harness.settle(request,{...spinBody(),replayOnly:true}),/ROUND_NOT_CONFIRMED/);assert.equal(transfers,0);assert.equal(db.rounds.length,0);
});
await check('actual retained debit/credit/commit fault paths roll back the entire wager',async()=>{
 for(const stage of ['after_debit','after_credit','before_commit']){
  reset();forcedFault=stage;const body=spinBody();await assert.rejects(harness.settle(request,body),/INJECTED_FAILURE/);
  assert.equal(rollbacks,1);assert.equal(db.rounds.length,0);assert.equal(db.balances[userId],10000n);assert.equal(db.balances.house,1000000000n);
  forcedFault=null;await harness.settle(request,body);assert.equal(db.rounds.length,1);assert.equal(db.balances[userId],10045n);
 }
});
await check('actual retained restrictions reject session, active game, house capacity and account cap',async()=>{
 reset();await assert.rejects(harness.settle(request,{...spinBody(),sessionGuard:'b'.repeat(64)}),/PLAYER_SESSION_CHANGED/);
 db.active='another-game';await assert.rejects(harness.settle(request,spinBody()),/FINISH_ACTIVE_ROUND/);db.active=null;
 db.balances.house=1n;await assert.rejects(harness.settle(request,spinBody()),/HOUSE_RESERVE_INSUFFICIENT/);db.balances.house=1000000000n;
 db.limit=10000n;await assert.rejects(harness.settle(request,spinBody()),/ACCOUNT_BALANCE_LIMIT/);
 assert.equal(transfers,0);assert.equal(db.rounds.length,0);
});
await check('actual retained gamble requires expected state and replays without another stake',async()=>{
 reset();const round=await harness.settle(request,spinBody()),body={roundId:round.roundId,roundToken:randomUUID(),choice:'RED',sessionGuard:guard,expectedAttempt:1,expectedStake:'0.50'};
 await assert.rejects(harness.action(request,{...body,expectedStake:'99.00'},'GAMBLE'),/GAMBLE_STATE_CHANGED/);
 const result=await harness.action(request,body,'GAMBLE');assert.equal(result.payout,'1.00');assert.equal(db.balances[userId],10095n);
 const replay=await harness.action(request,{...body,replayOnly:true},'GAMBLE');assert.deepEqual(replay,result);assert.equal(db.actions.length,1);assert.equal(transfers,4);
 await assert.rejects(harness.action(request,{...body,roundToken:randomUUID(),replayOnly:true},'GAMBLE'),/GAMBLE_STATE_CHANGED/);assert.equal(db.actions.length,1);
});
await check('actual retained state supplies the new model version and latest authoritative gamble amount',async()=>{
 reset();const state=await harness.hooks.state(request,userId);assert.equal(state.game.id,OPERATOR_ID);assert.equal(state.currency,'ETB');assert.equal(state.sessionGuard,guard);
 for(const [key,value]of Object.entries(core.modelIdentity(OPERATOR_ID)))assert.equal(state.game[key],value);
 assert.equal(state.round,null);assert.equal(state.game.enabled,true);
 const result=await harness.settle(request,spinBody());
 await harness.action(request,{roundId:result.roundId,roundToken:randomUUID(),choice:'RED',sessionGuard:guard,expectedAttempt:1,expectedStake:'0.50'},'GAMBLE');
 const restored=await harness.hooks.state(request,userId);assert.equal(restored.balance,'100.95');assert.equal(restored.round.result.finalWin,'0.50');assert.equal(restored.round.gamble.stake,'1.00');assert.equal(restored.round.gamble.lastResult.payout,'1.00');assert.equal(restored.round.gamble.attempt,1);
});
await check('actual retained receipt binds its math model and prevents cross-action token reuse',async()=>{
 reset();const spin=spinBody(),round=await harness.settle(request,spin);
 await assert.rejects(harness.action(request,{roundId:round.roundId,roundToken:spin.roundToken,choice:'RED',sessionGuard:guard,expectedAttempt:1,expectedStake:'0.50'},'GAMBLE'),/IDEMPOTENCY_PARAMETER_CONFLICT/);
 db.rounds[0].result_json.mathSha256='b'.repeat(64);
 await assert.rejects(harness.action(request,{roundId:round.roundId,roundToken:randomUUID(),choice:'RED',sessionGuard:guard,expectedAttempt:1,expectedStake:'0.50'},'GAMBLE'),/ROUND_MODEL_NOT_SUPPORTED/);
});
const report={schemaVersion:1,retainedRuntimeSha256:RETAINED_RUNTIME_SHA256,candidateRuntimeSha256:candidate.report.candidateRuntimeSha256,
 modelSha256:modelHash,passed:checks.length,checks,scope:'Actual retrieved core, fresh-release hooks, settlement, action and transaction source executed against a disposable in-memory SQL fixture.',
 realDatabaseConnected:false,productionRequests:0,productionWalletMutations:0,financialActivationVerified:false,
 limitation:'The fixture validates source control flow and rollback intent. It does not verify PostgreSQL row-lock concurrency, schema constraints, triggers or authenticated gateway integration.'};
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:checks.length,report:reportPath,productionRequests:0}));
