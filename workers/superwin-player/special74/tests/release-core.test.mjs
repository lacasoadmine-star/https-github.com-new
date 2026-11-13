import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorSlotCore,RELEASE_MODEL_IDS,releaseGambleDraw} from '../operator-math/release-core-adapter.mjs';
const sources=Object.fromEntries(RELEASE_MODEL_IDS.map(id=>[id,'a'.repeat(64)]));
const legacy={id:'existing',enabled:true};
const existing={MATH:{games:{existing:legacy},lines:{}},getGame:id=>id==='existing'?legacy:null,modelIdentity:()=>({mathVersion:'existing'}),receiptGame:()=>legacy,spin:()=>({retained:true}),publicGames:()=>[legacy]};
const build=(options={})=>createOperatorSlotCore(existing,{sha256:sources.special74_multi_hot_5_v1,sources,...options});
test('all three models are disabled by default and old handlers and game records stay identical',()=>{
 const core=build();assert.equal(core.publicGames().length,4);assert.equal(core.getGame('existing'),legacy);assert.deepEqual(core.spin('existing','1.00'),{retained:true});
 for(const id of RELEASE_MODEL_IDS){assert.equal(core.getGame(id).enabled,false);assert.deepEqual(core.getGame(id).betLevels,[]);assert.throws(()=>core.spin(id,'0.40'),/NOT_ENABLED/);}
 assert.equal(Object.keys(existing.MATH.games).length,1);
});
test('composed registration requires all three exact source identities',()=>{
 assert.throws(()=>build({sources:{...sources,unknown:'a'.repeat(64)}}),/EXACT_RELEASE_MODELS_REQUIRED/);
 assert.throws(()=>build({sha256:'b'.repeat(64)}),/PRIMARY_MODEL_HASH_MISMATCH/);
 const bad={...sources,[RELEASE_MODEL_IDS[1]]:'wrong'};assert.throws(()=>build({sources:bad}),/SOURCE_HASH_REQUIRED/);
});
test('receipts and gamble results stay bound to the selected independent model',()=>{
 const core=build({enabled:true,nextUint32:()=>0});
 for(const id of RELEASE_MODEL_IDS){const receipt=core.spin(id,core.getGame(id).betLevels[0]);assert.equal(receipt.gameId,id);assert.equal(core.receiptGame(id,receipt).id,id);assert.equal(core.receiptGame(id,{...receipt,mathSha256:'b'.repeat(64)}),null);for(const other of RELEASE_MODEL_IDS.filter(x=>x!==id))assert.equal(core.receiptGame(other,receipt),null);assert.equal(releaseGambleDraw(id,'RED','1.00',0,()=>0).payout,'2.00');}
 assert.throws(()=>releaseGambleDraw('unknown','RED','1.00',0),/INVALID_OPERATOR_GAMBLE/);
});
