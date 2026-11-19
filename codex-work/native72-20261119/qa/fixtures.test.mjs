import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import * as contract from '../railway-recovery/qa-frontend-snapshot/contract.mjs';
import {FixtureSession,core} from './fixtures.mjs';
const ids=['habesha_fortune_5_native','multi_hot_5_deluxe_native'];
const create=()=>new FixtureSession(new Map(ids.map(id=>[id,contract])));
const request=id=>({gameId:id,bet:core.getGame(id).betLevels[0],roundToken:randomUUID(),mathVersion:core.modelIdentity(id).mathVersion});
for(const id of ids)test(id+' deterministic receipts obey the actual browser contract',()=>{
 for(const scenario of ['win','loss','max-wheel']){const session=create();session.configure({scenario});const input=request(id),result=session.spin(input,session.sessionId);contract.validateRound(result,core.getGame(id),input.bet);assert.equal(scenario==='loss',Number(result.finalWin)===0);assert.equal(result.qaSimulated,true);assert.deepEqual(session.spin(input,session.sessionId),result);assert.equal(session.rounds.length,1);assert.equal(session.balance,result.balanceAfter);}
});
test('interrupted settled response is recovered without another debit or round',()=>{
 const session=create(),input=request(ids[0]);session.configure({scenario:'interrupted-once'});assert.throws(()=>session.spin(input,session.sessionId),{message:'QA_SIMULATED_RESPONSE_INTERRUPTION'});const balance=session.balance;const replay=session.spin(input,session.sessionId);assert.equal(session.balance,balance);assert.equal(replay.balanceAfter,balance);assert.equal(session.rounds.length,1);assert.equal(session.requests.replays,1);
});
test('definite rejection and expired session do not settle a round',()=>{
 const session=create(),input=request(ids[0]);session.configure({scenario:'reject-once'});assert.throws(()=>session.spin(input,session.sessionId),{message:'HOUSE_RESERVE_INSUFFICIENT'});assert.equal(session.balance,'1000.00');assert.equal(session.rounds.length,0);session.configure({action:'expire'});assert.throws(()=>session.spin(input,session.sessionId),{message:'PLAYER_SESSION_EXPIRED'});assert.equal(session.rounds.length,0);
});
test('gamble fixture validates current stake and replays its existing result',()=>{
 const session=create();session.configure({scenario:'win'});const parent=session.spin(request(ids[1]),session.sessionId),input={roundId:parent.roundId,choice:'RED',roundToken:randomUUID(),expectedStake:parent.finalWin,expectedAttempt:1};const first=session.gamble(input,session.sessionId),balance=session.balance;assert.equal(first.won,true);assert.deepEqual(session.gamble(input,session.sessionId),first);assert.equal(session.balance,balance);assert.throws(()=>session.gamble({...input,roundToken:randomUUID()},session.sessionId),{message:'GAMBLE_STATE_CHANGED'});
});
