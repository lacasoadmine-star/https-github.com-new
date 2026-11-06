import test from 'node:test';
import assert from 'node:assert/strict';
import {gameConfig,legacyGameConfig,gameConfigForModel,gameConfigForReceipt,modelIdentity,defaultStake} from '../public/registry.mjs';
import {validateRound,validateModel,validateGameState,validateHistory,savedGambleParent,validateGamble,autoStopReason,presentedBalance,spinSelectionChanged,normalizeAutoOptions,gambleStakeAllowed} from '../public/contract.mjs';
import {settle,memoryStorage} from './fixtures.mjs';
import {WalletAdapter,ApiError,definitelyRejected} from '../public/wallet.mjs';
import {publicGames} from './current-core.mjs';
const pairs=[['hot_foxy_20','foxy_hot_20_native'],['multi_hot_5_video','multi_hot_5_native']],oldFoxy=pairs[0][0],foxy=pairs[0][1],mh5=pairs[1][1];

test('new native defaults coexist with unchanged existing game defaults',()=>{
 assert.equal(defaultStake(gameConfig(mh5)),'0.05');assert.equal(defaultStake(gameConfig(foxy)),'0.20');
 for(const id of [oldFoxy,'multi_hot_5_video','multi_hot_100','wild_multi_stars'])assert.equal(defaultStake(gameConfig(id)),'2.00');
});
for(const [oldId,id]of pairs)test(id+' accepts only its own exact pins and has no invented legacy model',()=>{
 const current=gameConfig(id),old=legacyGameConfig(oldId),remote={...publicGames().find(g=>g.id===id),enabled:true};
 validateModel(remote,gameConfigForModel(remote));
 const oldPublic={...publicGames().find(g=>g.id===oldId),enabled:true};assert.equal(oldPublic.mathSha256,undefined);validateModel(oldPublic,gameConfigForModel(oldPublic));
 for(const identity of [modelIdentity(old),{...modelIdentity(current),mathSha256:old.mathSha256},{...modelIdentity(current),mathSha256:'f'.repeat(64)},{...modelIdentity(current),engineVersion:'unknown'}])assert.throws(()=>gameConfig(id,identity),/UNKNOWN_GAME_MODEL/);
 assert.throws(()=>gameConfig(oldId,modelIdentity(current)),/UNKNOWN_GAME_MODEL/);assert.throws(()=>legacyGameConfig(id),/UNKNOWN_LEGACY_GAME/);
 const missingHash={...remote};delete missingHash.mathSha256;assert.throws(()=>gameConfigForModel(missingHash));
});
test('new Foxy has eight symbols while existing Foxy retains Scatter, strips and rules',()=>{
 const current=gameConfig(foxy),old=gameConfig(oldFoxy);
 assert.equal(current.symbols.length,8);assert.equal(current.symbols.includes('scatter'),false);assert.equal(current.strips.flat().includes('scatter'),false);assert.equal(current.features.freeSpins.spins,0);
 assert.equal(old.symbols.length,9);assert.equal(old.strips.flat().includes('scatter'),true);assert.equal(old.features.freeSpins.spins,10);assert.equal(old.features.freeSpins.retrigger,true);
 assert.deepEqual(current.linePaths[0],[1,1,1,1,1]);assert.deepEqual(old.linePaths[0],[0,0,0,0,0]);assert.deepEqual(gameConfig(mh5).linePaths[0],[1,1,1]);assert.equal(gameConfig(mh5).maxWinMultiplier,145);assert.equal(gameConfig('multi_hot_5_video').maxWinMultiplier,250);
});
test('mixed wallet history remains partitioned by actual machine ID without rewriting receipts',()=>{
 const old=settle(oldFoxy,'0.10',100000n),current=settle(foxy,'0.20',100000n),items=[{result_json:current},{result_json:old}],before=JSON.stringify(items);
 const newEntries=validateHistory(items,foxy),oldEntries=validateHistory(items,oldFoxy);
 assert.equal(newEntries.length,1);assert.equal(oldEntries.length,1);assert.equal(newEntries[0].model.features.gambleRounds,5);assert.equal(oldEntries[0].model.features.gambleRounds,3);assert.equal(JSON.stringify(items),before);
 assert.equal(newEntries[0].result,current);assert.equal(oldEntries[0].result,old);
 const bad=structuredClone(items);bad[0].result_json.mathSha256='0'.repeat(64);assert.throws(()=>validateHistory(bad,foxy),/UNKNOWN_GAME_MODEL/);
 assert.throws(()=>validateRound(old,gameConfig(foxy),old.bet),/ROUND_IDENTITY_MISMATCH/);assert.throws(()=>validateRound(current,gameConfig(oldFoxy),current.bet),/ROUND_IDENTITY_MISMATCH/);
});
test('outstanding old Foxy free spins stay with old ID and never turn into native entitlements',()=>{
 const old=gameConfig(oldFoxy),current=gameConfig(foxy),state={gameId:oldFoxy,freeSpinsRemaining:2,bet:'4000.00',...modelIdentity(old),currentMathVersion:old.mathVersion};
 let next=validateGameState(state,old);assert.equal(next.model.id,oldFoxy);assert.equal(next.bet,'4000.00');assert.equal(next.model.features.freeSpins.retrigger,true);
 next=validateGameState({...state,freeSpinsRemaining:0},old);assert.equal(next.model.id,oldFoxy);assert.equal(next.model.mathVersion,old.mathVersion);assert.equal(next.bet,null);
 assert.throws(()=>validateGameState(state,current),/STATE_IDENTITY_MISMATCH/);
 assert.throws(()=>validateGameState({...state,gameId:foxy},current),/UNKNOWN_GAME_MODEL/);
 assert.throws(()=>validateGameState({gameId:foxy,freeSpinsRemaining:2,bet:'0.20',...modelIdentity(current)},current),/FREE_SPIN_MODEL_MISMATCH/);
 const nativeState=validateGameState({gameId:foxy,freeSpinsRemaining:0,...modelIdentity(current)},current);assert.equal(nativeState.model.id,foxy);assert.equal(nativeState.freeSpinsRemaining,0);
});
test('missing old state endpoint fallback cannot seed any new native game entitlement',()=>{
 const old=gameConfig(oldFoxy),result=settle(oldFoxy,'4000.00',100000000n,{isFree:true});result.freeSpinsRemaining=2;
 validateRound(result,old,result.bet);const next=validateGameState(null,old,result);assert.equal(next.bet,'4000.00');assert.equal(next.freeSpinsRemaining,2);
 assert.throws(()=>validateGameState(null,gameConfig(foxy),result),/MODEL_STATE_UNAVAILABLE/);
 assert.throws(()=>validateGameState({gameId:foxy,freeSpinsRemaining:0},gameConfig(foxy)),/STATE_VERSION_MISSING/);
});
test('stale displayed free spin or changed rules require review before a new paid request',()=>{
 const old={...modelIdentity(gameConfig(oldFoxy)),bet:'2.00',freeSpinsRemaining:2},current={...modelIdentity(gameConfig(foxy)),bet:'2.00',freeSpinsRemaining:0};
 assert.equal(spinSelectionChanged(old,current),true);assert.equal(spinSelectionChanged({...current,freeSpinsRemaining:1},current),true);assert.equal(spinSelectionChanged(old,{...old,freeSpinsRemaining:1}),false);assert.equal(spinSelectionChanged(current,{...current,bet:'4.00'}),true);assert.equal(spinSelectionChanged(current,current),false);
});
test('native receipts require exact wallet conservation and cannot claim free spins',()=>{
 for(const [oldId,id]of pairs){const g=gameConfig(id),r=settle(id);validateRound(r,g,r.bet);
  for(const mutate of [r=>{r.walletReceipt.balanceAfter='0.00';},r=>{r.isFree=true;},r=>{r.bonusSpinsAwarded=10;},r=>{r.mathSha256=gameConfig(oldId).mathSha256;}]){const bad=structuredClone(r);mutate(bad);assert.throws(()=>validateRound(bad,g,bad.bet));}
 }
});
test('an old pending token remains separately recoverable while a native machine creates its own pinned token',async()=>{
 const storage=memoryStorage(),sessionId='a'.repeat(64),token=crypto.randomUUID(),old=settle(oldFoxy,'1000.00',1000000n),calls=[];
 const saved={gameId:oldFoxy,bet:'1000.00',roundToken:token,sessionId},oldKey='zplay.machine.pending.'+sessionId+'.'+oldFoxy;storage.setItem(oldKey,JSON.stringify(saved));
 const fetcher=async(path,options)=>{const body=JSON.parse(options.body);calls.push(body);return Response.json(body.roundToken===token?old:settle(body.gameId,body.bet));};
 const nativeApi=new WalletAdapter({storage,fetcher});nativeApi.bind(sessionId,foxy);assert.equal(nativeApi.pending(),null);assert.equal(nativeApi.legacyPending(),false);
 const nativeRound=await nativeApi.spin('0.20',gameConfig(foxy));validateRound(nativeRound,gameConfigForReceipt(nativeRound),'0.20');assert.equal(calls[0].gameId,foxy);assert.notEqual(calls[0].roundToken,token);assert.equal(calls[0].mathVersion,gameConfig(foxy).mathVersion);assert.equal(storage.getItem(oldKey),JSON.stringify(saved));
 const oldApi=new WalletAdapter({storage,fetcher});oldApi.bind(sessionId,oldFoxy);const replay=await oldApi.spin(saved.bet,gameConfig(oldFoxy));validateRound(replay,gameConfigForReceipt(replay),saved.bet);assert.equal(calls[1].gameId,oldFoxy);assert.equal(calls[1].roundToken,token);assert.equal(oldApi.pending().mathVersion,undefined);oldApi.complete();assert.equal(nativeApi.pending().mathSha256,nativeRound.mathSha256);assert.equal(oldApi.pending(),null);
});
test('a rejected stale-model request can be cleared, while unknown outcomes keep their token',()=>{
 assert.equal(definitelyRejected(new ApiError('reload',409,'GAME_RULES_UPDATED_RELOAD')),true);
 for(const status of [0,429,500,503])assert.equal(definitelyRejected(new ApiError('unknown',status,'GAME_RULES_UPDATED_RELOAD')),false);
});
test('unknown old gamble expectations replay only and never invent a new stake',async()=>{
 const sessionId='b'.repeat(64),storage=memoryStorage(),calls=[],api=new WalletAdapter({storage,fetcher:async(path,options)=>{calls.push(JSON.parse(options.body));return Response.json({ok:true});}});api.bind(sessionId,oldFoxy);
 const saved={sessionId,gameId:oldFoxy,bet:'2.00',roundId:crypto.randomUUID(),roundToken:crypto.randomUUID(),choice:'RED'};storage.setItem(api.actionKey,JSON.stringify(saved));await api.gamble({roundId:saved.roundId,gameId:oldFoxy,bet:saved.bet},'RED');
 assert.deepEqual(calls[0],{roundId:saved.roundId,choice:'RED',roundToken:saved.roundToken,replayOnly:true});assert.deepEqual(api.pending(api.actionKey),saved);assert.equal(definitelyRejected(new ApiError('stale',409,'GAMBLE_STATE_CHANGED')),true);
});
test('pending gamble retains its own parent game limit and rejects cross-game parent reuse',()=>{
 let parent;for(let i=0;i<10000;i++){parent=settle(oldFoxy,'2.00',100000n);if(Number(parent.finalWin)>0)break;}
 assert.ok(Number(parent.finalWin)>0);const entries=validateHistory([{result_json:parent}],oldFoxy),action={gameId:oldFoxy,roundId:parent.roundId,bet:parent.bet,choice:'RED',expectedAttempt:1,expectedStake:parent.finalWin};
 assert.equal(savedGambleParent(action,entries).model.features.gambleRounds,3);assert.throws(()=>savedGambleParent({...action,gameId:foxy},entries),/SAVED_GAMBLE_PARENT_MISMATCH/);assert.throws(()=>savedGambleParent({...action,expectedAttempt:4},entries),/SAVED_GAMBLE_ATTEMPT_INVALID/);
 const result={roundId:parent.roundId,choice:'RED',cardColor:'BLACK',won:false,stake:parent.finalWin,payout:'0.00',attempt:1,maxAttempts:3,balanceAfter:'100.00'};
 validateGamble(result,entries[0].model,{...action,parentWin:parent.finalWin});assert.throws(()=>validateGamble({...result,maxAttempts:5},entries[0].model,action),/GAMBLE_ATTEMPT_MISMATCH/);
 assert.throws(()=>validateGamble({...result,stake:'9999.00'},entries[0].model,{roundId:parent.roundId,choice:'RED',parentWin:parent.finalWin}),/GAMBLE_PARENT_STAKE_MISMATCH/);
});
test('native local gamble ceiling accepts500 and preserves uncapped existing games',()=>{
 for(const [oldId,id]of pairs){const current=gameConfig(id),old=gameConfig(oldId);assert.equal(gambleStakeAllowed(current,'500.00'),true);assert.equal(gambleStakeAllowed(current,'500.01'),false);assert.equal(gambleStakeAllowed(old,'500.01'),true);assert.equal(gambleStakeAllowed(current,'0.00'),false);assert.equal(current.features.gambleRounds,5);assert.equal(old.features.gambleRounds,3);}
 assert.equal(definitelyRejected(new ApiError('limit',409,'GAMBLE_STAKE_LIMIT')),true);
});
test('AUTO stop limits use exact round win or net session result and strict MH5 BIG WIN threshold',()=>{
 const r={bet:'2.00',finalWin:'50.00'};
 assert.equal(autoStopReason({stopWin:'50.00'},'100.00','90.00',r),'win');assert.equal(autoStopReason({stopIncrease:'50.00'},'100.00','149.99',r),null);assert.equal(autoStopReason({stopIncrease:'50.00'},'100.00','150.00',r),'increase');assert.equal(autoStopReason({stopDecrease:'10.00'},'100.00','90.00',r),'decrease');assert.equal(autoStopReason({stopBigWin:true},'100.00','150.00',r),null);assert.equal(autoStopReason({stopBigWin:true},'100.00','150.01',{...r,finalWin:'50.01'}),'bigWin');
});
test('native AUTO limits normalize against presentation family without changing financial identity',()=>{
 assert.equal(normalizeAutoOptions({count:25,stopWin:'001.20'},foxy).stopWin,'1.20');assert.equal(normalizeAutoOptions({count:Infinity},mh5).count,Infinity);
 for(const value of ['', '0','0.00','-1.00','1.001','1e3','10000000000000'])assert.throws(()=>normalizeAutoOptions({count:25,stopWin:value},foxy),/INVALID_AUTO_LIMIT/);
 assert.throws(()=>normalizeAutoOptions({count:Infinity},foxy),/INVALID_AUTO_COUNT/);
});
test('pending-win display preserves authoritative wallet amount and restores it on collect',()=>{
 const balance='105.00';assert.equal(presentedBalance(balance,'5.00',true),'100.00');assert.equal(presentedBalance(balance,'5.00',false),balance);assert.equal(balance,'105.00');assert.equal(presentedBalance('2.00','5.00',true),'2.00');
});
