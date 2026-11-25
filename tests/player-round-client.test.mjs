import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoundClient} from '../apps/player/src/games/runtime/round-client.mjs';

const makeStorage = () => {
  const map = new Map();
  return {getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k)};
};
const result = (token='idempotent_token_123') => ({
  status: 'settled', round_id: 'round-1', game_id: 'multi-hot-wheel',
  client_token: token, bet: '1', currency: 'ETB', total_win: '0.0000',
  balance: '12.0000', result_json: {sector_index: 3},
});
const reply = (data,status=200) => ({ok:status>=200&&status<300,status,json:async()=>data});
const client = (args={}) => createRoundClient({gameId:'multi-hot-wheel',
  storage: makeStorage(), getAccessToken:()=> 'test-only',
  tokenFactory:()=> 'idempotent_token_123', ...args});

test('accepts matching ETB server settlement without calculating wins in client',async()=>{
  const calls=[];
  const c=client({fetcher:async(url,options)=>{calls.push({url,options});return reply(result())}});
  const data=await c.beginRound('1');
  assert.equal(data.round_id,'round-1');
  assert.equal(c.getPending(),null);
  assert.equal(calls.length,1);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    game_id:'multi-hot-wheel',bet:'1',client_token:'idempotent_token_123',
  });
});

test('disconnect retries same token; changed stake blocked while pending',async()=>{
  let count=0;const sent=[];const storage=makeStorage();
  const c=client({storage,fetcher:async(_url,options)=>{
    sent.push(JSON.parse(options.body));
    if(++count===1)throw Error('offline');
    return reply(result());
  }});
  await assert.rejects(c.beginRound('1'),/offline/);
  assert.equal(c.getPending().token,'idempotent_token_123');
  assert.throws(()=>c.beginRound('2'),/ROUND_PENDING/);
  await c.resumePending();
  assert.equal(sent.length,2);
  assert.equal(sent[0].client_token,sent[1].client_token);
  assert.equal(c.getPending(),null);
});

test('double click cannot send two bets while first transaction is pending',async()=>{
  let sendCount=0,resolveNetwork;
  const c=client({fetcher:()=>{
    sendCount++;return new Promise(resolve=>{resolveNetwork=resolve});
  }});
  const a=c.beginRound('1'),b=c.beginRound('1');
  assert.equal(sendCount,1);
  resolveNetwork(reply(result()));
  assert.deepEqual(await Promise.all([a,b]),[result(),result()]);
});

test('untrusted response, 202, and 5xx preserve pending token',async()=>{
  let count=0;const storage=makeStorage();
  const c=client({storage,fetcher:async()=>{
    ++count;
    if(count===1)return reply({status:'pending'},202);
    if(count===2)return reply({...result(),currency:'USD'});
    return reply({},503);
  }});
  assert.equal((await c.beginRound('1')).status,'pending');
  await assert.rejects(c.resumePending(),/INVALID_SERVER_ROUND/);
  await assert.rejects(c.resumePending(),/ROUND_NOT_SETTLED/);
  assert.equal(c.getPending().token,'idempotent_token_123');
});

test('invalid stake is rejected before any network call',()=>{
  const c=client({fetcher:async()=>{throw Error('network should not be called')}});
  for(const amount of [0,-1,'0.0000','1.23456','1e3','abc',null]){
    assert.throws(()=>c.beginRound(amount),/INVALID_BET/);
  }
});
