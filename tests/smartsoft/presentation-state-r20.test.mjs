import test from 'node:test';
import assert from 'node:assert/strict';
import {presentationViewState} from '../../deploy/smartsoft/presentation-state-r20.mjs';
test('settled retained-model history cannot block a new-model preview or alter the authoritative receipt',()=>{
 const round=Object.freeze({status:'settled',game_id:'burningice_native',model_version:'previous-model',stakeMinor:'100',payoutMinor:'200'});
 const state=Object.freeze({authenticated:true,connected:true,game:{id:'burningice_native',version:'current-model'},balance:'19.00',round});
 const view=presentationViewState(state);assert.equal(view.round,null);assert.equal(view.balance,state.balance);assert.equal(view.game,state.game);assert.equal(state.round,round);assert.equal(state.round.payoutMinor,'200');
});
test('current, active, unauthenticated, conflicting and foreign receipts retain their original validation boundary',()=>{
 const state={authenticated:true,connected:true,game:{id:'burningice_native',version:'current'},balance:'19.00'};
 for(const round of [{status:'active',game_id:state.game.id,model_version:'old'},{status:'settled',game_id:state.game.id,model_version:'current'},{status:'settled',game_id:'another',model_version:'old'},{status:'settled',game_id:state.game.id,model_version:'old',modelVersion:'conflicting'}]){const value={...state,round};assert.equal(presentationViewState(value),value);}
 const signedOut={...state,authenticated:false,round:{status:'settled',game_id:state.game.id,model_version:'old'}};assert.equal(presentationViewState(signedOut),signedOut);
});
