import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createOperatorSlotCore,operatorGambleDraw,OPERATOR_ID,OPERATOR_ENGINE_VERSION,BET_MINOR} from '../operator-math/retained-core-adapter.mjs';
import {prepareOperatorRuntime} from '../tools/prepare-operator-runtime.mjs';
import {Account} from '../src/financial/account.mjs';
import {model} from '../operator-math/multi-hot-5.mjs';

const hash=createHash('sha256').update(readFileSync(new URL('../operator-math/multi-hot-5.mjs',import.meta.url))).digest('hex');
const roundId='01234567-89ab-4cde-8123-456789abcdef',guard='a'.repeat(64);
function retained(){
 const calls=[];const old={id:'old_game',name:'Retained'};
 return {calls,MATH:{games:{old_game:old},lines:{old:[[0,0,0]]}},
  getGame:id=>old,modelIdentity:id=>({mathVersion:'retained'}),receiptGame:()=>old,
  publicGames:()=>[old],spin:(...args)=>{calls.push(args);return {retained:true};},
  toUnits:v=>BigInt(v.replace('.',''))*100n,fromUnits:v=>String(v)};
}
const make=(options={})=>createOperatorSlotCore(retained(),{sha256:hash,enabled:true,uuid:()=>roundId,nextUint32:()=>0,...options});

test('operator core preserves all retained model behavior and fails closed by default',()=>{
 const old=retained(),core=createOperatorSlotCore(old,{sha256:hash});
 assert.equal(core.getGame('old_game'),old.getGame('old_game'));
 assert.deepEqual(core.spin('old_game','1.00',{isFree:true}),{retained:true});
 assert.deepEqual(old.calls,[['old_game','1.00',{isFree:true}]]);
 assert.equal(core.toUnits,old.toUnits);assert.equal(core.receiptGame('old_game',{}),old.getGame('old_game'));
 assert.equal(Object.keys(old.MATH.games).length,1);
 assert.equal(core.getGame(OPERATOR_ID).enabled,false);assert.deepEqual(core.getGame(OPERATOR_ID).betLevels,[]);
 assert.throws(()=>core.spin(OPERATOR_ID,'0.05'),/NOT_ENABLED/);
 assert.throws(()=>createOperatorSlotCore(core,{sha256:hash}),/CONFLICT/);
});

test('adapter maps exact minor-unit outcomes to the existing settlement contract',()=>{
 const core=make(),result=core.spin(OPERATOR_ID,'0.05');
 assert.equal(result.finalWin,'0.50');assert.equal(result.baseWin,'0.50');assert.equal(result.winLines.length,5);
 assert.equal(result.mathVersion,'operator-mh5-v1');assert.equal(result.engineVersion,OPERATOR_ENGINE_VERSION);assert.equal(result.mathSha256,hash);
 assert.equal(result.gridOrientation,'rows');assert.equal(result.winLines[0].positions.length,3);
 assert.equal(core.toUnits(result.finalWin)/100n,50n); // retained ledger's 4-decimal to 2-decimal bridge
 assert.equal(core.receiptGame(OPERATOR_ID,result).id,OPERATOR_ID);
 for(const field of ['gameId','mathVersion','engineVersion','mathSha256'])assert.equal(core.receiptGame(OPERATOR_ID,{...result,[field]:'wrong'}),null);
 for(const bet of ['0.01','0.06','0.05x','5e-2','0.050',0.05,'400.05'])assert.throws(()=>core.spin(OPERATOR_ID,bet));
 assert.throws(()=>core.spin(OPERATOR_ID,'0.05',{isFree:true}),/FREE_SPIN/);
});

test('maximum advertised liability and published schedule match the evaluator',()=>{
 let draw=0;const core=make({nextUint32:()=>++draw<=9?8:5749});
 const result=core.spin(OPERATOR_ID,'400.00');
 assert.equal(result.finalWin,'150000.00');assert.equal(core.getGame(OPERATOR_ID).maxWinMultiplier,375);
 assert.equal(core.getGame(OPERATOR_ID).betLevels.length,BET_MINOR.length);
 assert.equal(core.getGame(OPERATOR_ID).rtp,'96.00');assert.equal(core.getGame(OPERATOR_ID).providerRtpReproduced,false);
 const published=core.publicGames();published.at(-1).betLevels.push('900.00');assert.equal(core.getGame(OPERATOR_ID).betLevels.includes('900.00'),false);
});

test('operator gamble respects its exact limits and currency without frontend outcome choices',()=>{
 assert.deepEqual(operatorGambleDraw('RED','0.05',0,()=>0),{choice:'RED',revealed:'RED',won:true,payout:'0.10',probabilityModel:'independent-fair-color',claimsProviderMath:false});
 assert.equal(operatorGambleDraw('BLACK','500.00',4,()=>0).payout,'0.00');
 for(const [amount,attempt] of [['500.01',0],['0.00',0],['1.00',5],['1.00',-1]])assert.throws(()=>operatorGambleDraw('RED',amount,attempt,()=>0));
});

function setup({drop}={}){
 const core=make(),receipts=new Map(),values=new Map(),calls=[];
 let paid=0,gambles=0,balance=10000n,last=null,gamble=null,first=true;
 const money=n=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;
 const fail=code=>Response.json({detail:code},{status:409});
 const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const fetcher=async(url,options={})=>{
  if(url==='/api/slots/fresh-state?gameId='+OPERATOR_ID)return Response.json({authenticated:true,currency:'ETB',sessionGuard:guard,balance:money(balance),game:core.publicGames().at(-1),round:last?{result:last,gamble}:null,blockedByActiveGame:null});
  const body=JSON.parse(options.body);calls.push({url,body});
  if(first&&drop==='before'){first=false;throw Error('request never arrived');}
  if(receipts.has(body.roundToken))return Response.json(receipts.get(body.roundToken));
  if(body.replayOnly)return fail(url.endsWith('/spin')?'ROUND_NOT_CONFIRMED':'GAMBLE_STATE_CHANGED');
  if(body.sessionGuard!==guard)return fail('PLAYER_SESSION_CHANGED');
  let result;const before=balance;
  if(url.endsWith('/spin')){
   const identity=core.modelIdentity(OPERATOR_ID);
   if(Object.entries(identity).some(([key,value])=>body[key]!==value))return fail('GAME_RULES_UPDATED_RELOAD');
   result=core.spin(body.gameId,body.bet);paid++;balance-=BigInt(body.bet.replace('.',''));balance+=BigInt(result.finalWin.replace('.',''));
   const receipt={currency:'ETB',balanceBefore:money(before),chargedStake:body.bet,finalWin:result.finalWin,balanceAfter:money(balance)};
   Object.assign(result,{currency:'ETB',walletReceipt:receipt,balanceAfter:money(balance),freeSpinsRemaining:0});
   last=result;gamble={available:true,attempt:0,maxAttempts:5,stake:result.finalWin};
  }else{
   if(body.roundId!==last?.roundId||body.expectedAttempt!==gamble.attempt+1||body.expectedStake!==gamble.stake)return fail('GAMBLE_STATE_CHANGED');
   const outcome=operatorGambleDraw(body.choice,gamble.stake,gamble.attempt,()=>0);gambles++;
   balance-=BigInt(gamble.stake.replace('.',''));balance+=BigInt(outcome.payout.replace('.',''));
   result={...outcome,roundId:last.roundId,attempt:gamble.attempt+1,maxAttempts:5,balanceAfter:money(balance),walletReceipt:{currency:'ETB',balanceBefore:money(before),chargedStake:gamble.stake,finalWin:outcome.payout,balanceAfter:money(balance)}};
   gamble={available:outcome.won,attempt:result.attempt,maxAttempts:5,stake:outcome.payout};
  }
  receipts.set(body.roundToken,result);
  if(first&&drop==='after'){first=false;throw Error('reply lost after commit');}
  return Response.json(result);
 };
 const game={id:'001-multi-hot-5',modelId:OPERATOR_ID,transport:'fresh',columns:3,symbols:Object.fromEntries(model.symbols.map(symbol=>[symbol,1]))};
 return {account:new Account(game,{fetcher,storage}),game,fetcher,storage,calls,stats:()=>({paid,gambles,balance})};
}

test('new model selects its own state and recovers a lost spin receipt once, including reload',async()=>{
 const t=setup({drop:'after'});await t.account.connect();await assert.rejects(t.account.spin('0.05'),/CONNECTION_UNCONFIRMED/);
 const token=t.account.pending.body.roundToken;
 const restored=new Account(t.game,{fetcher:t.fetcher,storage:t.storage});await restored.connect();await restored.retry();
 assert.equal(t.calls.at(-1).body.roundToken,token);assert.equal(t.calls.at(-1).body.replayOnly,true);
 assert.equal(t.stats().paid,1);assert.equal(restored.state.balance,'100.45');assert.equal(restored.pending,null);
});

test('new model replay cannot originate a spin when the first request never arrived',async()=>{
 const t=setup({drop:'before'});await t.account.connect();await assert.rejects(t.account.spin('0.05'));await assert.rejects(t.account.retry(),/ROUND_NOT_CONFIRMED/);
 assert.equal(t.stats().paid,0);assert.equal(t.stats().balance,10000n);assert.equal(t.account.pending,null);
});

test('new model gamble recovery uses the same request and wallet receipt',async()=>{
 const t=setup();await t.account.connect();await t.account.spin('0.05');
 const real=t.account.fetcher;let lose=true;t.account.fetcher=async(url,options)=>{const response=await real(url,options);if(url.endsWith('/gamble')&&lose){lose=false;throw Error('lost after commit');}return response;};
 await assert.rejects(t.account.gamble('RED'));await t.account.retry();
 assert.equal(t.stats().paid,1);assert.equal(t.stats().gambles,1);assert.equal(t.account.state.balance,'100.95');assert.equal(t.account.pending,null);
});

test('runtime preparation rejects any unverified retained source',()=>{
 assert.throws(()=>prepareOperatorRuntime({runtime:'changed',adapterBundle:'createOperatorSlotCore operatorGambleDraw',modelSha256:hash}),/HASH_MISMATCH/);
});

test('unreadable saved pending data pauses Spin, Gamble and Retry without deleting evidence',async()=>{
 for(const raw of ['{broken','', 'null','[]','{}']){
  const t=setup();await t.account.connect();await t.account.spin('0.05');
  t.storage.setItem(t.account.key,raw);const before=t.calls.length;
  await assert.rejects(t.account.connect(),/SAVED_ROUND_UNREADABLE/);
  assert.equal(t.account.state.accepting,false);assert.equal(t.account.recoveryBlocked,true);
  await assert.rejects(t.account.spin('0.05'),/SAVED_ROUND_UNREADABLE/);
  await assert.rejects(t.account.gamble('RED'),/SAVED_ROUND_UNREADABLE/);
  assert.throws(()=>t.account.retry(),/SAVED_ROUND_UNREADABLE/);
  assert.equal(t.calls.length,before);assert.equal(t.storage.getItem(t.account.key),raw);
 }
});

test('saved pending profile, session and action-field mismatches cannot silently authorize a new wager',async()=>{
 const corruptions=[p=>({...p,game:'another-profile'}),p=>({...p,guard:'b'.repeat(64)}),
  p=>({...p,body:{...p.body,gameId:'another-model'}}),p=>({...p,body:{...p.body,bet:'NaN'}}),
  p=>({...p,body:{...p.body,sessionGuard:'b'.repeat(64)}}),p=>({...p,body:{...p.body,roundToken:'wrong'}}),
  p=>({...p,body:{...p.body,roundToken:[p.body.roundToken]}}),
  p=>({...p,body:{...p.body,mathVersion:null}}),p=>({...p,body:{...p.body,mathSha256:'bad'}}),
  p=>({...p,kind:'gamble',stake:'0.50',attempt:1,body:{roundToken:p.body.roundToken,roundId,choice:'RED',sessionGuard:guard,expectedAttempt:2,expectedStake:'0.50'}})];
 for(const corrupt of corruptions){
  const t=setup({drop:'after'});await t.account.connect();await assert.rejects(t.account.spin('0.05'));
  const raw=JSON.stringify(corrupt(t.account.pending));t.storage.setItem(t.account.key,raw);
  const restored=new Account(t.game,{fetcher:t.fetcher,storage:t.storage}),before=t.calls.length;
  await assert.rejects(restored.connect(),/SAVED_ROUND_UNREADABLE/);await assert.rejects(restored.spin('0.05'),/SAVED_ROUND_UNREADABLE/);
  await assert.rejects(restored.gamble('RED'),/SAVED_ROUND_UNREADABLE/);assert.throws(()=>restored.retry(),/SAVED_ROUND_UNREADABLE/);
  assert.equal(t.calls.length,before);assert.equal(t.storage.getItem(restored.key),raw);assert.equal(restored.state.accepting,false);
 }
});

test('recovering the original valid record rechecks server state before replaying its unchanged token',async()=>{
 const t=setup({drop:'after'});await t.account.connect();await assert.rejects(t.account.spin('0.05'));
 const original=t.storage.getItem(t.account.key),token=t.account.pending.body.roundToken;
 t.storage.setItem(t.account.key,'unreadable');await assert.rejects(t.account.connect(),/SAVED_ROUND_UNREADABLE/);
 t.storage.setItem(t.account.key,original);await t.account.connect();assert.equal(t.account.recoveryBlocked,false);assert.equal(t.account.pending.body.roundToken,token);
 await t.account.retry();assert.equal(t.stats().paid,1);assert.equal(t.account.pending,null);assert.equal(t.account.state.balance,'100.45');
});
