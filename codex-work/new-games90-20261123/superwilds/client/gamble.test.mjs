import test from 'node:test';
import assert from 'node:assert/strict';
import { SuperWildsController, GAME_ID } from './controller.mjs';
import { createSuperWildsTransport } from '../server/transport.mjs';

// Explicit synthetic authoritative receipts test UI/transport only. No provider
// RNG, live wallet, inferred500DMO cap, suit or rank is manufactured here.
const copy=value=>structuredClone(value),cash=n=>`${Math.floor(n/100)}.${String(n%100).padStart(2,'0')}`;
const id=n=>`12345678-1234-4234-8234-${String(n).padStart(12,'0')}`;
const model={engineVersion:'synthetic-base',mathVersion:'synthetic-base',mathSha256:'a'.repeat(64)};
function fixture({color='RED',drop=false,hold=false}={}){
  let ordinal=0,pending=300,balance=9900,available=true,enabled=true,release=null;
  const calls=[],saved=new Map(),events=[],storage=new Map(),errors=[];
  const base={schema:'zplay/superwilds-round/v1',kind:'SPIN',gameId:GAME_ID,currency:'ETB',roundId:id(99),requestKey:id(98),
    bet:'1.00',winAmount:'3.00',grid:Array.from({length:3},()=>['wild','bell','bell','bell','bell']),multiplier:1,winLines:[],
    collectionStatus:'PENDING',...model,walletReceipt:{balanceBefore:'100.00',balanceAfter:'99.00',chargedStake:'1.00',reservedWin:'3.00',creditedWin:'0.00',currency:'ETB'}};
  const descriptor=()=>({available:available&&pending>0,reason:available?null:'WITHDRAWN',attempt:events.length,nextAttempt:events.length+1,
    pendingWin:cash(pending),targetWin:available&&pending>0?cash(pending*2):null,version:available?'synthetic-gamble':null,
    sha256:available?'b'.repeat(64):null,maxAttempts:5,remainingAttempts:5-events.length,history:copy(events)});
  const service={
    state:async()=>({authenticated:true,gameId:GAME_ID,subject:'gamble-fixture',currency:'ETB',sessionGuard:'c'.repeat(64),balance:cash(balance),
      game:{id:GAME_ID,enabled,betLevels:['1.00'],...model},round:{result:copy(base),pendingWin:cash(pending),gamble:descriptor()},gamble:descriptor()}),
    spin:async()=>{throw Error('UNEXPECTED_NEW_WAGER');},
    async gamble(_request,body){
      calls.push(copy(body));const old=saved.get(body.roundToken);if(old){assert.equal(body.replayOnly,true);return copy(old);}
      assert.equal(body.expectedPendingWin,cash(pending));assert.equal(body.expectedAttempt,events.length+1);
      assert.equal(body.gambleVersion,'synthetic-gamble');assert.equal(body.gambleSha256,'b'.repeat(64));
      const before=pending;pending=body.choice===color?pending*2:0;
      const receipt={kind:'GAMBLE',gameId:GAME_ID,currency:'ETB',requestKey:body.roundToken,roundId:base.roundId,bet:base.bet,...model,
        choice:body.choice,color,won:body.choice===color,attempt:events.length+1,pendingWinBefore:cash(before),pendingWinAfter:cash(pending),
        gambleVersion:'synthetic-gamble',gambleSha256:'b'.repeat(64),round:copy(base),walletReceipt:{currency:'ETB',balanceBefore:cash(balance),balanceAfter:cash(balance)}};
      events.push(copy(receipt));saved.set(body.roundToken,copy(receipt));
      if(drop){drop=false;throw Error('SYNTHETIC_ACCEPTED_REPLY_LOST');}
      if(hold){hold=false;return new Promise(resolve=>{release=()=>resolve(copy(receipt));});}
      return copy(receipt);
    },
    async takeWin(_request,body){calls.push(copy(body));const amount=pending;assert(amount>0);balance+=pending;pending=0;
      return{requestKey:body.roundToken,round:copy(base),collection:{collectionId:id(97),amount:cash(amount),walletReceipt:{balanceAfter:cash(balance)}}};},
  };
  const request=()=>new Request('https://synthetic.invalid/slots'),transport=createSuperWildsTransport({service,request});
  const create=()=>new SuperWildsController({transport,subject:'gamble-fixture',keyFactory:()=>id(++ordinal),onError:error=>errors.push(error.message),
    journalStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
  return{service,transport,controller:create(),create,base,events,calls,saved,storage,errors,
    withdraw:()=>{available=false;enabled=false;},release:()=>{assert(release);release();},amount:()=>pending,wallet:()=>balance};
}

test('DOUBLE snapshots exact server pending attempt and model while preserving immutable accepted SPIN',async()=>{
  const f=fixture();await f.controller.connect();const original=f.controller.snapshot().round;
  assert.equal(f.controller.snapshot().canDouble,true);assert.equal(f.controller.snapshot().gamble.targetWinMinor,600);
  assert.equal(await f.controller.double('RED'),true);const s=f.controller.snapshot(),body=f.calls[0];
  assert.equal(body.expectedPendingWin,'3.00');assert.equal(body.expectedAttempt,1);assert.equal(body.gambleVersion,'synthetic-gamble');
  assert.equal(s.pendingWinMinor,600);assert.equal(s.round.winMinor,300);assert.deepEqual(s.round,original);
  assert.equal(s.balanceMinor,9900);assert.equal(s.gamble.targetWinMinor,1200);assert.equal(s.gamble.history[0].color,'RED');
  assert.equal('card'in s.gamble.history[0],false);assert.equal(f.wallet(),9900);
  assert.equal(await f.controller.take(),true);assert.equal(f.wallet(),10500);assert.equal(f.controller.snapshot().pendingWinMinor,0);
  assert.deepEqual(f.controller.snapshot().round,original);assert.deepEqual(f.base.winAmount,'3.00');
});
test('lost DOUBLE reply retains original authority and recovers after reconnect/model withdrawal without replaying a choice',async()=>{
  const f=fixture({drop:true});await f.controller.connect();const original=f.controller.snapshot().round;
  assert.equal(await f.controller.double('RED'),false);const pending=f.controller.snapshot().pending;
  assert.equal(pending.authority.expectedPendingWin,'3.00');assert.equal(f.amount(),600);assert.equal(f.events.length,1);
  f.controller.disconnect();f.withdraw();await f.controller.connect();assert.equal(f.controller.snapshot().phase,'RECOVERY');
  assert.deepEqual(f.controller.snapshot().pending,pending);assert.equal(await f.controller.recover(),true);
  assert.deepEqual(f.controller.snapshot().round,original);assert.equal(f.controller.snapshot().pendingWinMinor,600);
  assert.equal(f.events.length,1);assert.equal(f.calls[1].roundToken,pending.requestKey);assert.equal(f.calls[1].replayOnly,true);
  assert.equal(f.calls[1].expectedPendingWin,'3.00');assert.equal(f.controller.snapshot().canDouble,false);
  assert.equal(f.controller.snapshot().feedback,null);assert.equal(await f.controller.take(),true);assert.equal(f.wallet(),10500);
});
test('one delayed DOUBLE excludes repeated choice TAKE and SPIN, including a late receipt while disconnected',async()=>{
  const f=fixture({hold:true});await f.controller.connect();const running=f.controller.double('RED');await Promise.resolve();await Promise.resolve();
  const original=f.controller.snapshot().pending;assert.equal(await f.controller.double('BLACK'),false);
  assert.equal(await f.controller.take(),false);assert.equal(await f.controller.spin(),false);assert.equal(f.events.length,1);
  f.controller.disconnect();assert.deepEqual(f.controller.snapshot().pending,original);f.release();assert.equal(await running,true);
  assert.equal(f.controller.snapshot().connected,false);assert.equal(f.controller.snapshot().pendingWinMinor,600);
  assert.equal(await f.controller.double('RED'),false);await f.controller.connect();assert.equal(await f.controller.take(),true);
  assert.equal(f.calls.length,2);assert.equal(f.events.length,1);
});
test('accepted losing card clears only derived pending and next SPIN collection, not the base award or grid',async()=>{
  const f=fixture({color:'BLACK'});await f.controller.connect();const original=f.controller.snapshot().round;
  assert.equal(await f.controller.double('RED'),true);const s=f.controller.snapshot();
  assert.equal(s.phase,'READY');assert.equal(s.pendingWinMinor,0);assert.equal(s.lastGamble.color,'BLACK');assert.equal(s.lastGamble.won,false);
  assert.deepEqual(s.round,original);assert.equal(s.round.winMinor,300);assert.equal(s.balanceMinor,9900);
  assert.equal(f.transport.prepare({gameId:GAME_ID,action:'SPIN',requestKey:id(50),betMinor:100}).authority.collectRoundId,null);
  assert.equal(await f.controller.take(),false);assert.equal(f.calls.length,1);
});
test('reload recovers the exact prepared DOUBLE and stale UI preconditions cannot be silently changed',async()=>{
  const f=fixture({drop:true});await f.controller.connect();
  assert.throws(()=>f.transport.prepare({gameId:GAME_ID,action:'DOUBLE',requestKey:id(51),roundId:id(99),choice:'RED',expectedPendingWinMinor:1}),/GAMBLE_STATE_CHANGED/);
  assert.equal(await f.controller.double('RED'),false);const original=f.controller.snapshot().pending;f.controller.dispose();
  const replacement=f.create();await replacement.connect();assert.equal(replacement.snapshot().phase,'RECOVERY');
  assert.equal(await replacement.recover(),true);assert.equal(f.calls[1].roundToken,original.requestKey);assert.equal(f.events.length,1);
  assert.equal(replacement.snapshot().pendingWinMinor,600);assert.equal(replacement.snapshot().round.winMinor,300);
});
