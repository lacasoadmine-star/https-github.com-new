import test from 'node:test';
import assert from 'node:assert/strict';
import {gameConfig,legacyGameConfig,gameConfigForModel,gameConfigForReceipt,modelIdentity,defaultStake} from '../public/registry.mjs';
import {validateRound,validateModel,validateGameState,validateHistory,savedGambleParent,validateGamble,autoStopReason,presentedBalance,spinSelectionChanged,normalizeAutoOptions,gambleStakeAllowed} from '../public/contract.mjs';
import {settle,memoryStorage} from './fixtures.mjs';
import {WalletAdapter,ApiError,definitelyRejected} from '../public/wallet.mjs';
import {publicGames} from './current-core.mjs';
import {MachineRenderer} from '../public/renderer.mjs';
import {ReelMotion} from '../public/motion.mjs';
const foxy='hot_foxy_20',mh5='multi_hot_5_video';
test('official current demo defaults preserve legacy and unrelated game defaults',()=>{
 assert.equal(defaultStake(gameConfig(mh5)),'0.05');assert.equal(defaultStake(gameConfig(foxy)),'0.20');
 for(const id of [foxy,mh5])assert.equal(defaultStake(legacyGameConfig(id)),'2.00');
 for(const id of ['multi_hot_100','wild_multi_stars'])assert.equal(defaultStake(gameConfig(id)),'2.00');
});

for(const id of [foxy,mh5])test(id+' accepts known legacy and new models but never mixed or unknown pins',()=>{
 const current=gameConfig(id),old=legacyGameConfig(id),remote={...publicGames().find(g=>g.id===id),enabled:true};
 validateModel(remote,gameConfigForModel(remote));
 const oldPublic={...old};delete oldPublic.mathSha256;validateModel(oldPublic,gameConfigForModel(oldPublic));
 for(const identity of [{...modelIdentity(current),mathSha256:old.mathSha256},{...modelIdentity(old),mathVersion:current.mathVersion},{...modelIdentity(current),mathSha256:'f'.repeat(64)},{...modelIdentity(current),engineVersion:'unknown'}])assert.throws(()=>gameConfig(id,identity),/UNKNOWN_GAME_MODEL/);
 const missingHash={...remote};delete missingHash.mathSha256;assert.throws(()=>gameConfigForModel(missingHash));
});
test('current Foxy has eight symbols and no scatter entitlement; historical strips remain complete',()=>{
 const current=gameConfig(foxy),old=legacyGameConfig(foxy);
 assert.equal(current.symbols.length,8);assert.equal(current.symbols.includes('scatter'),false);assert.equal(current.strips.flat().includes('scatter'),false);assert.equal(current.features.freeSpins.spins,0);
 assert.equal(old.symbols.length,9);assert.equal(old.strips.flat().includes('scatter'),true);assert.equal(current.presentationSymbols.includes('scatter'),true);
 assert.deepEqual(current.linePaths[0],[1,1,1,1,1]);assert.deepEqual(gameConfig(mh5).linePaths[0],[1,1,1]);assert.equal(gameConfig(mh5).maxWinMultiplier,145);
});
test('mixed history validates each receipt against its own exact rules without rewriting it',()=>{
 const old=settle(foxy,'0.10',100000n,{legacy:true}),current=settle(foxy,'0.20',100000n),items=[{result_json:current},{result_json:old}],before=JSON.stringify(items);
 const entries=validateHistory(items,foxy);assert.equal(entries[0].model.features.gambleRounds,5);assert.equal(entries[1].model.features.gambleRounds,3);assert.equal(JSON.stringify(items),before);
 const bad=structuredClone(items);bad[1].result_json.mathSha256='0'.repeat(64);assert.throws(()=>validateHistory(bad,foxy),/UNKNOWN_GAME_MODEL/);
 assert.throws(()=>validateRound(old,gameConfig(foxy),old.bet),/ROUND_VERSION_MISMATCH/);
});
test('outstanding legacy free spins retain old stake and retriggers then switch to current paid model',()=>{
 const current=gameConfig(foxy),old=legacyGameConfig(foxy),state={gameId:foxy,freeSpinsRemaining:2,bet:'4000.00',...modelIdentity(old),currentMathVersion:current.mathVersion};
 let next=validateGameState(state,current);assert.equal(next.model.mathVersion,old.mathVersion);assert.equal(next.bet,'4000.00');assert.equal(next.model.features.freeSpins.retrigger,true);
 next=validateGameState({...state,freeSpinsRemaining:0,...modelIdentity(current)},current);assert.equal(next.model.mathVersion,current.mathVersion);assert.equal(next.bet,null);
 assert.throws(()=>validateGameState({...state,...modelIdentity(current)},current),/FREE_SPIN_MODEL_MISMATCH/);
 assert.throws(()=>validateGameState({...state,freeSpinsRemaining:0},current),/STATE_MODEL_MISMATCH/);
 assert.throws(()=>validateGameState({...state,mathSha256:'a'.repeat(64)},current),/UNKNOWN_GAME_MODEL/);
});
test('frontend-first rollout only uses validated legacy receipts when old state endpoint is absent',()=>{
 const old=legacyGameConfig(foxy),result=settle(foxy,'4000.00',100000000n,{legacy:true,isFree:true});result.freeSpinsRemaining=2;
 validateRound(result,old,result.bet);const next=validateGameState(null,old,result);assert.equal(next.bet,'4000.00');assert.equal(next.freeSpinsRemaining,2);
 assert.throws(()=>validateGameState(null,gameConfig(foxy),result),/MODEL_STATE_UNAVAILABLE/);
 assert.throws(()=>validateGameState({gameId:foxy,freeSpinsRemaining:0},gameConfig(foxy)),/STATE_VERSION_MISSING/);
});
test('stale displayed free spin or old rules require review before a new paid request',()=>{
 const old={...modelIdentity(legacyGameConfig(foxy)),bet:'2.00',freeSpinsRemaining:2},current={...modelIdentity(gameConfig(foxy)),bet:'2.00',freeSpinsRemaining:0};
 assert.equal(spinSelectionChanged(old,current),true);assert.equal(spinSelectionChanged({...current,freeSpinsRemaining:1},current),true);assert.equal(spinSelectionChanged({...old,freeSpinsRemaining:2},{...old,freeSpinsRemaining:1}),false);assert.equal(spinSelectionChanged(current,{...current,bet:'4.00'}),true);assert.equal(spinSelectionChanged(current,current),false);
});
test('new model receipts still require exact wallet conservation and cannot claim free spins',()=>{
 for(const id of [foxy,mh5]){const g=gameConfig(id),r=settle(id);validateRound(r,g,r.bet);
  for(const mutate of [r=>{r.walletReceipt.balanceAfter='0.00';},r=>{r.isFree=true;},r=>{r.bonusSpinsAwarded=10;},r=>{r.mathSha256=legacyGameConfig(id).mathSha256;}]){const bad=structuredClone(r);mutate(bad);assert.throws(()=>validateRound(bad,g,bad.bet));}
 }
});
test('old pending key replays old removed stake once, then new token pins current paid rules',async()=>{
 const storage=memoryStorage(),sessionId='a'.repeat(64),token=crypto.randomUUID(),old=settle(foxy,'0.10',100000n,{legacy:true}),calls=[];
 const saved={gameId:foxy,bet:'0.10',roundToken:token,sessionId};storage.setItem('zplay.machine.pending.'+sessionId+'.'+foxy,JSON.stringify(saved));
 const api=new WalletAdapter({storage,fetcher:async(path,options)=>{const body=JSON.parse(options.body);calls.push(body);return Response.json(body.roundToken===token?old:settle(foxy,body.bet));}});api.bind(sessionId,foxy);
 const replay=await api.spin(saved.bet,legacyGameConfig(foxy));validateRound(replay,gameConfigForReceipt(replay),saved.bet);assert.equal(api.pending().roundToken,token);assert.equal(api.pending().mathVersion,undefined);api.complete();
 const next=await api.spin('0.20',gameConfig(foxy));validateRound(next,gameConfigForReceipt(next),'0.20');assert.equal(calls[0].roundToken,token);assert.notEqual(calls[1].roundToken,token);assert.equal(calls[1].mathVersion,gameConfig(foxy).mathVersion);assert.equal(api.pending().mathSha256,next.mathSha256);
});
test('a rejected stale-model request can be cleared, while unknown outcomes keep their token',()=>{
 assert.equal(definitelyRejected(new ApiError('reload',409,'GAME_RULES_UPDATED_RELOAD')),true);
 for(const status of [0,429,500,503])assert.equal(definitelyRejected(new ApiError('unknown',status,'GAME_RULES_UPDATED_RELOAD')),false);
});
test('unknown legacy gamble expectations replay only and never invent a new stake',async()=>{
 const sessionId='b'.repeat(64),storage=memoryStorage(),calls=[],api=new WalletAdapter({storage,fetcher:async(path,options)=>{calls.push(JSON.parse(options.body));return Response.json({ok:true});}});api.bind(sessionId,foxy);
 const saved={sessionId,gameId:foxy,bet:'2.00',roundId:crypto.randomUUID(),roundToken:crypto.randomUUID(),choice:'RED'};storage.setItem(api.actionKey,JSON.stringify(saved));await api.gamble({roundId:saved.roundId,bet:saved.bet},'RED');
 assert.deepEqual(calls[0],{roundId:saved.roundId,choice:'RED',roundToken:saved.roundToken,replayOnly:true});assert.deepEqual(api.pending(api.actionKey),saved);assert.equal(definitelyRejected(new ApiError('stale',409,'GAMBLE_STATE_CHANGED')),true);
});
test('pending gamble takes the parent legacy limit and verifies its compounded stake',()=>{
 let parent;for(let i=0;i<10000;i++){parent=settle(foxy,'2.00',100000n,{legacy:true});if(Number(parent.finalWin)>0)break;}
 const entries=validateHistory([{result_json:parent}],foxy),action={gameId:foxy,roundId:parent.roundId,bet:parent.bet,choice:'RED',expectedAttempt:1,expectedStake:parent.finalWin};
 assert.equal(savedGambleParent(action,entries).model.features.gambleRounds,3);assert.throws(()=>savedGambleParent({...action,expectedAttempt:4},entries),/SAVED_GAMBLE_ATTEMPT_INVALID/);assert.throws(()=>savedGambleParent({...action,roundId:crypto.randomUUID()},entries),/PARENT_UNAVAILABLE/);
 const result={roundId:parent.roundId,choice:'RED',cardColor:'BLACK',won:false,stake:parent.finalWin,payout:'0.00',attempt:1,maxAttempts:3,balanceAfter:'100.00'};
 validateGamble(result,entries[0].model,{...action,parentWin:parent.finalWin});assert.throws(()=>validateGamble({...result,maxAttempts:5},entries[0].model,action),/GAMBLE_ATTEMPT_MISMATCH/);
 assert.throws(()=>validateGamble({...result,stake:'9999.00'},entries[0].model,{roundId:parent.roundId,choice:'RED',parentWin:parent.finalWin}),/GAMBLE_PARENT_STAKE_MISMATCH/);
});
test('new local gamble ceiling accepts500, rejects500.01 and preserves uncapped legacy receipts',()=>{
 for(const id of [foxy,mh5]){const current=gameConfig(id),old=legacyGameConfig(id);assert.equal(gambleStakeAllowed(current,'500.00'),true);assert.equal(gambleStakeAllowed(current,'500.01'),false);assert.equal(gambleStakeAllowed(old,'500.01'),true);assert.equal(gambleStakeAllowed(current,'0.00'),false);}
 assert.equal(definitelyRejected(new ApiError('limit',409,'GAMBLE_STAKE_LIMIT')),true);
});
test('renderer switches exact receipt strips only while idle and retains legacy visible scatter',()=>{
 const old=legacyGameConfig(foxy),current=gameConfig(foxy),renderer=Object.create(MachineRenderer.prototype);Object.assign(renderer,{game:current,motion:new ReelMotion(current.visual,current.reels),dirty:false});
 renderer.setGameModel(old);assert.equal(renderer.game.strips[0].length,20000);renderer.motion.begin([19999,19999,19999,19999,19999],1,0);assert.throws(()=>renderer.setGameModel(current),/MODEL_SWITCH_DURING_SPIN/);assert.equal(renderer.game,old);
 renderer.motion.cancel();renderer.grid=[['scatter']];renderer.setGameModel(current);assert.equal(renderer.game.strips[0].length,19900);assert.deepEqual(renderer.grid,[['scatter']]);
});
test('AUTO stop limits use exact round win or net session result and strict MH5 BIG WIN threshold',()=>{
 const r={bet:'2.00',finalWin:'50.00'};
 assert.equal(autoStopReason({stopWin:'50.00'},'100.00','90.00',r),'win');assert.equal(autoStopReason({stopIncrease:'50.00'},'100.00','149.99',r),null);assert.equal(autoStopReason({stopIncrease:'50.00'},'100.00','150.00',r),'increase');assert.equal(autoStopReason({stopDecrease:'10.00'},'100.00','90.00',r),'decrease');assert.equal(autoStopReason({stopBigWin:true},'100.00','150.00',r),null);assert.equal(autoStopReason({stopBigWin:true},'100.00','150.01',{...r,finalWin:'50.01'}),'bigWin');
});
test('AUTO limits are normalized or rejected before any automatic wager starts',()=>{
 assert.equal(normalizeAutoOptions({count:25,stopWin:'001.20'},foxy).stopWin,'1.20');assert.equal(normalizeAutoOptions({count:Infinity},mh5).count,Infinity);
 for(const value of ['', '0','0.00','-1.00','1.001','1e3','10000000000000'])assert.throws(()=>normalizeAutoOptions({count:25,stopWin:value},foxy),/INVALID_AUTO_LIMIT/);
 assert.throws(()=>normalizeAutoOptions({count:Infinity},foxy),/INVALID_AUTO_COUNT/);
});
test('pending-win display preserves authoritative wallet amount and restores it on collect',()=>{
 const balance='105.00';assert.equal(presentedBalance(balance,'5.00',true),'100.00');assert.equal(presentedBalance(balance,'5.00',false),balance);assert.equal(balance,'105.00');assert.equal(presentedBalance('2.00','5.00',true),'2.00');
});
