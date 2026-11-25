// Offline-only tests with a mocked backend. No actual wallet transactions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoundClient } from '../apps/player/src/games/runtime/round-client.mjs';

const makeStorage = () => {
  const map = new Map();
  return { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v),
    removeItem: k => map.delete(k) };
};
const payload = (token = 'idempotent_token_123') => ({
  status: 'settled', round_id: 'round-1', game_id: 'multi-hot-wheel',
  client_token: token, bet: '1', currency: 'ETB', total_win: '0.0000',
  balance: '12.0000', result_json: { sector_index: 3 },
});
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status,
  json: async () => data });

test('settlement is accepted only from matching ETB server response', async () => {
  const storage = makeStorage();
  const calls = [];
  const client = createRoundClient({ gameId: 'multi-hot-wheel', storage,
    getAccessToken: () => 'test-only', tokenFactory: () => 'idempotent_token_123',
    fetcher: async (url, options) => { calls.push({url,options}); return response(payload()); } });
  const result = await client.beginRound('1');
  assert.equal(result.round_id, 'round-1');
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    game_id: 'multi-hot-wheel', bet: '1', client_token: 'idempotent_token_123',
  });
  assert.equal(client.getPending(), null);
});

test('network interruption preserves token and retry cannot double-bet', async () => {
  const storage = makeStorage();
  const calls = [];
  let count = 0;
  const client = createRoundClient({ gameId: 'multi-hot-wheel', storage,
    getAccessToken: () => 'test-only', tokenFactory: () => 'idempotent_token_123',
    fetcher: async (url, options) => {
      calls.push(JSON.parse(options.body));
      if (++count === 1) throw new Error('network disconnected');
      return response(payload());
    },
  });
  await assert.rejects(client.beginRound('1'));
  assert.equal(client.getPending().token, 'idempotent_token_123');
  assert.throws(() => client.beginRound('2'), /ROUND_PENDING/);
  await client.resumePending();
  assert.equal(calls.length, 2);
  assert.equal(calls[0].client_token, calls[1].client_token);
  assert.equal(client.getPending(), null);
});

test('duplicate UI clicks share an in-flight server transaction', async () => {
  let resolveNetwork;
  let calls = 0;
  const client = createRoundClient({gameId:'multi-hot-wheel', storage:makeStorage(),
    getAccessToken:()=> 'test-only', tokenFactory:()=> 'idempotent_token_123',
    fetcher:()=> {calls++; return new Promise(resolve=>resolveNetwork=resolve);} });
  const first = client.beginRound('1');
  const second = client.beginRound('1');
  assert.equal(calls, 1);
  resolveNetwork(response(payload()));
  const [a,b] = await Promise.all([first,second]);
  assert.equal(a.round_id,b.round_id);
});

test('untrusted win data or pending server response cannot clear token', async () => {
  const storage = makeStorage();
  let count=0;
  const client = createRoundClient({gameId:'multi-hot-wheel', storage,
    getAccessToken:()=> 'test-only', tokenFactory:()=> 'idempotent_token_123',
    fetcher:async()=> ++count === 1 ? response({status:'pending'},202) : response({...payload(),currency:'USD'}) });
  const pending = await client.beginRound('1');
  assert.equal(pending.status,'pending');
  assert.equal(client.getPending().token,'idempotent_token_123');
  await assert.rejects(client.resumePending(),/INVALID_SERVER_ROUND/);
  assert.equal(client.getPending().token,'idempotent_token_123');
});

test('invalid bet amounts are blocked locally before backend', () => {
  const client = createRoundClient({gameId:'multi-hot-wheel', storage:makeStorage(),
    getAccessToken:()=> 'test-only', tokenFactory:()=> 'idempotent_token_123',
    fetcher:async()=> {throw Error('should not call');} });
  for (const value of [0,-1,'0.0000','1.23456','1e3','abc',null]) {
    assert.throws(()=>client.beginRound(value),/INVALID_BET/);
  }
});
