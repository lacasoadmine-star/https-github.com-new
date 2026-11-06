import test from 'node:test';
import assert from 'node:assert/strict';
import {gameConfig,gameConfigForReceipt,resolveGame,presentationGameId,presentationConfig,nativeFamilies,modelIdentity} from '../public/registry.mjs';
import {validateRound,validateHistory,savedGambleParent} from '../public/contract.mjs';
import {publicGames,getGame} from './current-core.mjs';
import * as frozen from './server-core-snapshot.mjs';
import {WalletAdapter} from '../public/wallet.mjs';
import {memoryStorage,settle} from './fixtures.mjs';
import {MachineRenderer} from '../public/renderer.mjs';
import {ReelMotion} from '../public/motion.mjs';
const pairs=[['foxy_hot_20_native','hot_foxy_20'],['multi_hot_5_native','multi_hot_5_video']];

test('the additive backend keeps all eleven existing public models and raw game configurations unchanged',()=>{
 const before=frozen.publicGames(),after=publicGames(),oldIds=before.map(g=>g.id);
 assert.equal(before.length,11);assert.equal(after.length,13);assert.deepEqual(after.filter(g=>oldIds.includes(g.id)),before);
 for(const id of oldIds)assert.deepEqual(getGame(id),frozen.getGame(id),id+' original configuration changed');
 assert.deepEqual(after.filter(g=>!oldIds.includes(g.id)).map(g=>g.id).sort(),pairs.map(([id])=>id).sort());
});
for(const [id,family]of pairs)test(id+' keeps financial identity separate from its presentation copy',()=>{
 const model=gameConfig(id),before=JSON.stringify(model),visual=presentationConfig(model),remote=publicGames().find(g=>g.id===id);
 assert.equal(model.id,id);assert.equal(model.presentationGameId,family);assert.equal(remote.id,id);assert.equal(nativeFamilies[id],family);
 assert.equal(presentationGameId(id),family);assert.equal(presentationGameId(model),family);assert.equal(presentationGameId(visual),family);assert.equal(visual.id,family);assert.equal(visual.machineId,id);
 assert.equal(JSON.stringify(model),before);assert.notEqual(visual,model);assert.deepEqual(modelIdentity(visual),modelIdentity(model));assert.deepEqual(visual.strips,model.strips);assert.deepEqual(visual.visual,gameConfig(family).visual);
 const result=settle(id);assert.equal(gameConfigForReceipt(result).id,id);validateRound(result,model,result.bet);
 assert.throws(()=>validateRound(result,visual,result.bet),/ROUND_IDENTITY_MISMATCH/,'presentation copies can never stand in for financial verification');
});
test('existing aliases retain existing identities while explicit native aliases select separate machines',()=>{
 for(const [alias,id]of [['multi_hot_5','multi_hot_5_video'],['multi-hot-5-new','multi_hot_5_video'],['foxy-hot-20','hot_foxy_20'],['hot-foxy-20','hot_foxy_20'],['foxy-hot-20-native','foxy_hot_20_native'],['multi-hot-5-native','multi_hot_5_native']])assert.equal(resolveGame(alias),id);
});
for(const [id,family]of pairs)test(id+' pending requests do not inherit old machine tokens, guesses or sessions',async()=>{
 const sessionId='c'.repeat(64),otherSession='d'.repeat(64),storage=memoryStorage(),oldKey='zplay.machine.pending.'+sessionId+'.'+family;
 const oldSaved={sessionId,gameId:family,bet:'2.00',roundToken:crypto.randomUUID()},oldAction={...oldSaved,roundId:crypto.randomUUID(),choice:'BLACK'};
 storage.setItem(oldKey,JSON.stringify(oldSaved));storage.setItem(oldKey+'.gamble',JSON.stringify(oldAction));storage.setItem('superwin.nine.spin.'+family,'{}');if(family==='multi_hot_5_video')storage.setItem('mh5-video.pending','{}');
 let calls=0;const api=new WalletAdapter({storage,fetcher:async()=>{calls++;throw Error('Unexpected network call');}});api.bind(sessionId,id);
 assert.equal(api.pending(),null);assert.equal(api.pending(api.actionKey),null);assert.equal(api.legacyPending(),false);
  await assert.rejects(api.gamble({gameId:family,roundId:oldAction.roundId,bet:oldAction.bet},'BLACK',{expectedStake:'2.00',expectedAttempt:1}),/GAMBLE_GAME_MISMATCH/);assert.equal(api.pending(api.actionKey),null);assert.equal(calls,0);
 storage.setItem(api.key,JSON.stringify(oldSaved));assert.throws(()=>api.pending(),/SAVED_ROUND_INVALID/);await assert.rejects(api.spin('2.00',gameConfig(id)),/SAVED_ROUND_INVALID/);assert.equal(calls,0);storage.removeItem(api.key);
 storage.setItem(api.actionKey,JSON.stringify(oldAction));assert.throws(()=>api.pending(api.actionKey),/SAVED_ROUND_INVALID/);storage.removeItem(api.actionKey);
 api.bind(otherSession,id);assert.equal(api.pending(),null);api.bind(sessionId,family);assert.deepEqual(api.pending(),oldSaved);assert.deepEqual(api.pending(api.actionKey),oldAction);assert.equal(api.legacyPending(),true);
});
test('history and saved gamble parent selection cannot cross an old/native family pair',()=>{
 for(const [id,family]of pairs){const old=settle(family),fresh=settle(id),items=[{result_json:old},{result_json:fresh}];
  const selected=validateHistory(items,id);assert.deepEqual(selected.map(e=>e.result.roundId),[fresh.roundId]);
  assert.throws(()=>savedGambleParent({gameId:id,bet:old.bet,roundId:old.roundId},selected),/PARENT_UNAVAILABLE/);
  assert.throws(()=>savedGambleParent({gameId:id,bet:old.bet,roundId:old.roundId},validateHistory(items,family)),/PARENT_MISMATCH/);
 }
});
test('renderer model selection retains one actual machine even when another machine shares its artwork family',()=>{
 for(const [id,family]of pairs){const model=gameConfig(id),renderer=Object.create(MachineRenderer.prototype);Object.assign(renderer,{machineId:id,game:presentationConfig(model),motion:new ReelMotion(model.visual,model.reels),dirty:false});
  renderer.setGameModel(model);assert.equal(renderer.machineId,id);assert.equal(renderer.game.machineId,id);assert.equal(renderer.game.id,family);assert.equal(renderer.game.strips[0].length,model.strips[0].length);
  assert.throws(()=>renderer.setGameModel(gameConfig(family)),/MODEL_GEOMETRY_MISMATCH/);assert.equal(renderer.machineId,id);
  renderer.motion.begin(Array(model.reels).fill(0),1,0);assert.throws(()=>renderer.setGameModel(model),/MODEL_SWITCH_DURING_SPIN/);renderer.motion.cancel();
 }
});
