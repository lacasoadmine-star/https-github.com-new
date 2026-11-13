import test from 'node:test';
import assert from 'node:assert/strict';
import {RoundController, RoundRejected} from './round-controller.mjs';

function journalFixture() {
  let value=null, failClaim=false, failRelease=false;
  const journal={
    async load(){return value;},
    async claim(intent){
      if(failClaim)throw new Error('Storage unavailable');
      if(value){const e=new Error('Pending round');e.code='PENDING_ROUND';e.pending=value;throw e;}
      value=structuredClone(intent);
    },
    async release(roundId){
      if(failRelease)throw new Error('Storage unavailable');
      if(value && value.roundId!==roundId)throw new Error('Different round');
      value=null;
    }
  };
  return {journal,get value(){return value;},set failClaim(v){failClaim=v;},set failRelease(v){failRelease=v;}};
}
function controller(journal,overrides={}) {
  const starts=[],lookups=[];let serial=0;
  const app=new RoundController({gameId:'observed-test-game',journal,
    nextToken:()=>`test-${++serial}`,
    startRound:async p=>{starts.push(p);throw new Error('Response lost');},
    recoverRound:async p=>{lookups.push(p);return {...p,grid:[['verified-symbol']],balanceMinor:12345};},
    validateResult:r=>r,
    present:()=>({finished:Promise.resolve({cancelled:false}),stop(){},cancel(){}}),...overrides});
  return {app,starts,lookups};
}
test('reload restores an unresolved round and performs only a same-token lookup',async()=>{
  const j=journalFixture(),a=controller(j.journal);await a.app.initialize();await a.app.spin(100);
  const saved=structuredClone(j.value);a.app.dispose();
  const b=controller(j.journal);await assert.rejects(b.app.spin(100),/resolved/);await b.app.initialize();
  assert.equal(b.app.state,'uncertain');assert.deepEqual(b.app.pending,saved);
  const recovered=await b.app.recover();assert.equal(recovered.balanceMinor,12345);
  assert.deepEqual(b.lookups,[saved]);assert.equal(b.starts.length,0);assert.equal(j.value,null);
});
test('two controllers sharing an account cannot claim a second pending wager',async()=>{
  const j=journalFixture(),a=controller(j.journal),b=controller(j.journal,{nextToken:()=> 'other-token'});
  await Promise.all([a.app.initialize(),b.app.initialize()]);await Promise.all([a.app.spin(100),b.app.spin(200)]);
  assert.equal(a.starts.length+b.starts.length,1);assert.equal(a.app.state,'uncertain');assert.equal(b.app.state,'uncertain');
  assert.deepEqual(a.app.pending,b.app.pending);assert.deepEqual(j.value,a.app.pending);
});
test('a pending round in a different game blocks rather than replacing its identity',async()=>{
  const j=journalFixture();await j.journal.claim({gameId:'another-game',roundId:'held',betMinor:50});
  const a=controller(j.journal);await a.app.initialize();assert.equal(a.app.state,'other-game');
  await assert.rejects(a.app.spin(100),/resolved/);await assert.rejects(a.app.recover(),/uncertain/);assert.equal(j.value.roundId,'held');
});
test('storage failure before sending cannot issue a wager',async()=>{
  const j=journalFixture(),a=controller(j.journal);await a.app.initialize();j.failClaim=true;await a.app.spin(100);
  assert.equal(a.app.state,'journal-error');assert.equal(a.starts.length,0);assert.equal(j.value,null);
});
test('failed intent release stays locked and retries only storage',async()=>{
  const j=journalFixture(),a=controller(j.journal);await a.app.initialize();await a.app.spin(100);
  j.failRelease=true;await a.app.recover();assert.equal(a.app.state,'release-error');
  await assert.rejects(a.app.spin(100),/resolved/);j.failRelease=false;await a.app.retryRelease();
  assert.equal(a.app.state,'idle');assert.equal(a.starts.length,1);assert.equal(a.lookups.length,1);assert.equal(j.value,null);
});
test('known non-acceptance releases only its own journal entry',async()=>{
  const j=journalFixture(),a=controller(j.journal,{startRound:async()=>{throw new RoundRejected('Not accepted');}});
  await a.app.initialize();await a.app.spin(100);assert.equal(a.app.state,'idle');assert.equal(j.value,null);
});
test('a broken view observer cannot break the one-request state machine',async()=>{
  const j=journalFixture(),a=controller(j.journal,{onState:()=>{throw new Error('View failed');}});
  await a.app.initialize();await a.app.spin(100);assert.equal(a.starts.length,1);assert.equal(a.app.state,'uncertain');
  assert.match(a.app.lastObserverError.message,/View failed/);await a.app.recover();assert.equal(j.value,null);
});
test('disposing while persistence is in flight releases the known-unsent request',async()=>{
  const j=journalFixture();let resume;
  const wait=new Promise(r=>{resume=r;});
  const a=controller({...j.journal,claim:async p=>{await wait;await j.journal.claim(p);}});
  await a.app.initialize();const task=a.app.spin(100);a.app.dispose();resume();await task;
  assert.equal(a.starts.length,0);assert.equal(j.value,null);assert.equal(a.app.state,'disposed');
});
test('malformed stored intent is not silently erased',async()=>{
  const j=journalFixture(),a=controller({...j.journal,load:async()=>({roundId:'unknown'})});
  await a.app.initialize();assert.equal(a.app.state,'journal-error');assert.equal(a.starts.length,0);
});
test('a never-ending request leaves the loading state without issuing another wager',async()=>{
  const j=journalFixture();let requests=0;
  const a=controller(j.journal,{requestTimeoutMs:10,startRound:()=>{requests++;return new Promise(()=>{});}});
  await a.app.initialize();await a.app.spin(100);
  assert.equal(a.app.state,'uncertain');assert.equal(requests,1);assert.equal(j.value.roundId,'test-1');
  await a.app.recover();assert.equal(a.app.state,'idle');assert.equal(requests,1);
});
test('a late original response cannot override the recovered round presentation',async()=>{
  const j=journalFixture();let resolveOriginal;
  const a=controller(j.journal,{requestTimeoutMs:10,startRound:()=>new Promise(resolve=>{resolveOriginal=resolve;})});
  await a.app.initialize();await a.app.spin(100);const pending={...a.app.pending};await a.app.recover();
  resolveOriginal({...pending,grid:[['late']],balanceMinor:1});await new Promise(setImmediate);
  assert.equal(a.app.result.balanceMinor,12345);assert.equal(a.app.result.grid[0][0],'verified-symbol');
});
