import test from 'node:test';
import assert from 'node:assert/strict';
import {GAME_ID,validateSession,validateIntent,validateSettledRound} from './contract.mjs';

const session=()=>({authenticated:true,gameId:GAME_ID,currency:'ETB',subject:'test-subject',
  balanceMinor:1000,betLevelsMinor:[100,200],cashReleaseApproved:true,
  modelVersion:'approved-v1',assetManifestId:'own-assets-v1'});
const action=()=>({gameId:GAME_ID,subject:'test-subject',modelVersion:'approved-v1',
  betMinor:100,requestKey:'unique-nonce'});
const receipt=()=>({gameId:GAME_ID,currency:'ETB',serverSettled:true,
  requestKey:'unique-nonce',roundId:'r-1',subject:'test-subject',betMinor:100,winMinor:0,
  balanceMinor:900,multiplier:1,modelVersion:'approved-v1',
  ledger:{betTxId:'bet-1'},historyRecorded:true,
  finalGrid:[['cherry','lemon','cherry'],['lemon','cherry','lemon'],
    ['cherry','lemon','cherry'],['lemon','cherry','lemon'],
    ['cherry','lemon','cherry']],expandedColumns:[],winningLines:[]});
const symbols=['cherry','lemon','wild'];
test('rejects unauthenticated or wrong-currency session',()=>{
  assert.throws(()=>validateSession({...session(),authenticated:false}),/BURN_SESSION_INVALID/);
  assert.throws(()=>validateSession({...session(),currency:'USD'}),/BURN_SESSION_INVALID/);
});
test('rejects cash authorization without asset/model identity',()=>{
  assert.throws(()=>validateSession({...session(),assetManifestId:null}),/BURN_UNVERIFIED_RELEASE/);
  assert.throws(()=>validateSession({...session(),betLevelsMinor:[]}),/BURN_UNVERIFIED_RELEASE/);
});
test('rejects out-of-ladder, overspend and tampered client wager',()=>{
  assert.throws(()=>validateIntent({...action(),betMinor:500},validateSession(session())),/BURN_NEW_SPIN_BLOCKED/);
  assert.throws(()=>validateIntent({...action(),betMinor:1000},validateSession(session())),/BURN_NEW_SPIN_BLOCKED/);
  assert.throws(()=>validateIntent({...action(),balanceMinor:999999},validateSession(session())),/BURN_NEW_SPIN_BLOCKED/);
});
test('rejects malformed server receipt without real ledger identity',()=>{
  assert.throws(()=>validateSettledRound({...receipt(),ledger:{}},action(),symbols),/BURN_RECEIPT_INVALID/);
  assert.throws(()=>validateSettledRound({...receipt(),requestKey:'other'},action(),symbols),/BURN_RECEIPT_INVALID/);
  assert.throws(()=>validateSettledRound({...receipt(),historyRecorded:false},action(),symbols),/BURN_RECEIPT_INVALID/);
});
test('rejects misleading invalid grid, win and expansion',()=>{
  assert.throws(()=>validateSettledRound({...receipt(),finalGrid:[['invalid']]},action(),symbols),/BURN_GRID_INVALID/);
  assert.throws(()=>validateSettledRound({...receipt(),expandedColumns:[1]},action(),symbols),/BURN_EXPANSION_INVALID/);
  assert.throws(()=>validateSettledRound({...receipt(),winMinor:10,ledger:{betTxId:'bet-1'}},action(),symbols),/BURN_RECEIPT_INVALID/);
});
test('accepts only the supplied settled server receipt without generating outcomes',()=>{
  const r=validateSettledRound(receipt(),action(),symbols);
  assert.equal(r.roundId,'r-1');assert.equal(r.balanceMinor,900);
  assert.equal(r.finalGrid.length,5);assert.ok(Object.isFrozen(r.finalGrid));
});
