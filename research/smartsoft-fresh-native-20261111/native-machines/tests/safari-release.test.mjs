import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {FreshAccountClient,GAME_ID,MODEL_VERSION,validateState} from '../shared/safari-account-client.mjs';
import {SafariAccount} from '../shared/safari-account.mjs';
const source=await readFile(new URL('../safari-simba-2/server/release/slot-runtime.mjs',import.meta.url),'utf8');
const baseline=await readFile('/workspace/superwin-existing-integration/.private-slot-readable.mjs','utf8');
async function loadModels(text){const prefix=text.slice(0,text.indexOf('const Originals =')).replace(/^import pg.*\n/m,'').replace(/^import Redis.*\n/m,'');return import('data:text/javascript;base64,'+Buffer.from(prefix+'\nexport {versioned,previousVersioned,coreBytes,revisedBytes,fresh74Bytes};').toString('base64'));}
process.env.FRESH74_ACCOUNT_RELEASE='mh10-v1';process.env.SAFARI_SIMBA_RELEASE='native-scene-v1';
const [old,current]=await Promise.all([loadModels(baseline),loadModels(source)]);
test('only pending Safari registration changes; existing models and bytes remain identical',()=>{
 const before=old.versioned.publicGames(),after=current.versioned.publicGames();assert.equal(after.length,before.length);assert.equal(after.length,87);
 for(const g of before)if(g.id!==GAME_ID){assert.deepEqual(after.find(x=>x.id===g.id),g);assert.deepEqual(current.versioned.modelIdentity(g.id),old.versioned.modelIdentity(g.id));}
 for(const k of ['coreBytes','revisedBytes','fresh74Bytes'])assert.equal(createHash('sha256').update(current[k]).digest('hex'),createHash('sha256').update(old[k]).digest('hex'));
 assert.equal(after.find(x=>x.id===GAME_ID).freshReleaseReady,true);assert.equal(after.find(x=>x.freshRegistration&&![GAME_ID,'fresh_multihot10'].includes(x.id)).freshReleaseReady,false);
});
const hookCode=source.slice(source.indexOf('const isFreshBuilt='),source.indexOf('class ServiceError'));
const hooks=vm.runInNewContext(hookCode+'\ncreateFreshReleaseHooks;', {Date});
const fail=(status,code)=>{throw Object.assign(Error(code),{status});};
test('Safari hook enforces authentication, exact model, account caps and active-round boundaries',async()=>{
 const id=GAME_ID,identity=current.versioned.modelIdentity(id),req=new Request('https://fixture.invalid',{headers:{cookie:'sw_session='+'a'.repeat(64)}});
 const deps={gameId:id,hash:()=> 'b'.repeat(64),authenticate:async()=>{},balance:async()=>10000n,lockWallets:async()=>[],transaction:fn=>fn({query:async()=>({rows:[],rowCount:0})}),cash:n=>(Number(n)/100).toFixed(2),publicGames:()=>current.versioned.publicGames(),modelIdentity:x=>current.versioned.modelIdentity(x),fail,isAccepting:()=>true};
 const h=hooks(deps);h.assertEnabled();h.assertModel(identity);h.assertSession(req,'fixture',{sessionGuard:'b'.repeat(64)});
 assert.throws(()=>h.assertSession(req,'fixture',{sessionGuard:'c'.repeat(64)}),/PLAYER_SESSION_CHANGED/);
 assert.throws(()=>h.assertModel({...identity,mathVersion:'old'}),/GAME_RULES_UPDATED_RELOAD/);
 assert.throws(()=>hooks({...deps,gameId:'fresh_jetx'}),/FRESH_GAME_UNAVAILABLE/);
 await assert.rejects(h.assertPlayerCapacity({query:async()=>({rows:[{max_balance:'10100'}]})},'fixture',10000n,100n,14500n),/ACCOUNT_BALANCE_LIMIT/);
 await assert.rejects(h.assertNoActive({query:async()=>({rows:[{game_id:'existing-round'}]})},'fixture'),/FINISH_ACTIVE_ROUND/);
 assert.throws(()=>h.assertGambleState({expectedAttempt:1,expectedStake:'1.00',replayOnly:true},1,100n),/GAMBLE_STATE_CHANGED/);
});
const guard='b'.repeat(64),sha=current.versioned.modelIdentity(GAME_ID).mathSha256;
const identity=current.versioned.modelIdentity(GAME_ID);
const roundId='10000000-0000-4000-8000-000000000001';
function state(){return{authenticated:true,currency:'ETB',sessionGuard:guard,balance:'100.00',blockedByActiveGame:null,round:null,game:{...current.versioned.publicGames().find(g=>g.id===GAME_ID)}};}
function receipt(body){return{...current.versioned.spin(GAME_ID,body.bet),roundId,finalWin:'0.00',balanceAfter:'99.00',winLines:[],walletReceipt:{currency:'ETB',balanceBefore:'100.00',chargedStake:'1.00',finalWin:'0.00',balanceAfter:'99.00'},currency:'ETB'};}
const memory=()=>{const map=new Map();return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
test('ambiguous spin retry preserves one token and exact receipt without a second wager',async()=>{
 const bodies=[];let saved=null,settlements=0;const client=new FreshAccountClient({storage:memory(),newId:()=>roundId,fetchImpl:async(path,options)=>{
  if(path.includes('fresh-state?gameId='+GAME_ID)){const s=state();if(saved)s.balance='99.00';return json(s);}
  const body=JSON.parse(options.body);bodies.push(body);if(!saved){settlements++;saved=receipt(body);return json({detail:'ACTION_UNCONFIRMED'},503);}return json(saved);
 }});
 await client.refresh();await assert.rejects(client.start(100),e=>e.ambiguous===true);assert.ok(client.pending);await client.retry();assert.equal(settlements,1);assert.equal(bodies[0].roundToken,bodies[1].roundToken);assert.equal(bodies[1].replayOnly,true);assert.equal(client.pending,null);
});
test('wrong grid/model and broken wallet conservation fail closed',()=>{
 const s=state();s.round={result:receipt({bet:'1.00'}),gamble:{attempt:0,maxAttempts:5,available:false,stake:'0.00'}};validateState(s);
 const bad=structuredClone(s);bad.round.result.walletReceipt.balanceAfter='100.00';assert.throws(()=>validateState(bad),/INVALID_SETTLEMENT/);
 const model=structuredClone(s);model.round.result.mathSha256='d'.repeat(64);assert.throws(()=>validateState(model),/ROUND_MODEL_MISMATCH/);
 const shape=structuredClone(s);shape.round.result.grid[0].push('j');assert.throws(()=>validateState(shape),/INVALID_ACCOUNT_ROUND/);
});
test('Take Win acknowledges already settled funds and never issues another credit',async()=>{
 let requests=0;const s=state(),r=receipt({bet:'1.00'});r.finalWin='2.00';r.walletReceipt.finalWin='2.00';r.walletReceipt.balanceAfter='101.00';r.balanceAfter='101.00';s.balance='101.00';s.round={result:r,gamble:{attempt:0,maxAttempts:5,available:true,stake:'2.00'}};
 const a=new SafariAccount({game:{id:GAME_ID},storage:memory(),fetchImpl:async()=>{requests++;return json(s);}});await a.refresh();assert.equal(a.state.round.status,'active');await a.collect();assert.equal(a.state.round.status,'settled');assert.equal(a.state.balance,'101.00');assert.equal(requests,1);
});
test('both fresh models retain pre-draw reserve, guards and replay-first service ordering',()=>{
 const settle=source.slice(source.indexOf('  async function settle('),source.indexOf('  async function action('));
 assert.ok(settle.indexOf('if (old.rowCount)')<settle.indexOf('freshReleaseFor(gameId).assertSession'));
 assert.ok(settle.indexOf('HOUSE_RESERVE_INSUFFICIENT')<settle.indexOf('const result = spin('));
 assert.ok(settle.includes('if (isFreshBuilt(gameId))'));
 assert.ok(source.includes('freshReleaseFor(url.searchParams.get("gameId")??"fresh_multihot10").state(req, uid)'));
 assert.equal(source.includes('freshReleaseFor(parent.game_id).assertGambleState'),true);
});
