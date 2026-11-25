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
    getAccountId: () => 'player-a', getAccessToken: () => 'test-only', tokenFactory: () => 'idempotent_token_123',
    fetcher: async (url, options) => { calls.push({url,options}); return response(payload()); } });
  const result = await client.beginRound('1');
  assert.equal(result.round_id, 'round-1');
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    game_id: 'multi-hot-wheel', bet: '1', client_token: 'idempotent_token_123',
  });
  assert.equal(client.getPending(), null);
});

test('network interruption preserves the same token for a server-idempotent retry', async () => {
  const storage = makeStorage();
  const calls = [];
  let count = 0;
  const client = createRoundClient({ gameId: 'multi-hot-wheel', storage,
    getAccountId: () => 'player-a', getAccessToken: () => 'test-only', tokenFactory: () => 'idempotent_token_123',
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
    getAccountId: () => 'player-a', getAccessToken:()=> 'test-only', tokenFactory:()=> 'idempotent_token_123',
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
    getAccountId: () => 'player-a', getAccessToken:()=> 'test-only', tokenFactory:()=> 'idempotent_token_123',
    fetcher:async()=> ++count === 1 ? response({status:'pending'},202) : response({...payload(),currency:'USD'}) });
  const pending = await client.beginRound('1');
  assert.equal(pending.status,'pending');
  assert.equal(client.getPending().token,'idempotent_token_123');
  await assert.rejects(client.resumePending(),/INVALID_SERVER_ROUND/);
  assert.equal(client.getPending().token,'idempotent_token_123');
});

test('invalid bet amounts are blocked locally before backend', () => {
  const client = createRoundClient({gameId:'multi-hot-wheel', storage:makeStorage(),
    getAccountId: () => 'player-a', getAccessToken:()=> 'test-only', tokenFactory:()=> 'idempotent_token_123',
    fetcher:async()=> {throw Error('should not call');} });
  for (const value of [0,-1,'0.0000','1.23456','1e3','abc',null]) {
    assert.throws(()=>client.beginRound(value),/INVALID_BET/);
  }
});

test('a delayed duplicate settlement cannot erase a newer pending round', async () => {
  const storage = makeStorage();
  const requests = [];
  let serial = 0;
  const options = { gameId: 'multi-hot-wheel', storage,
    getAccountId: () => 'player-a', getAccessToken: () => 'test-only',
    tokenFactory: () => `pending_round_${++serial}`,
    fetcher: (_url, options) => new Promise((resolve, reject) => {
      requests.push({ body: JSON.parse(options.body), resolve, reject });
    }) };
  const firstClient = createRoundClient(options);
  const reconnectClient = createRoundClient(options);
  const original = firstClient.beginRound('1');
  const duplicate = reconnectClient.resumePending();
  const firstToken = requests[0].body.client_token;
  assert.equal(requests[1].body.client_token, firstToken);

  requests[0].resolve(response(payload(firstToken)));
  await original;
  const next = firstClient.beginRound('1');
  const secondToken = requests[2].body.client_token;
  assert.notEqual(secondToken, firstToken);
  requests[1].resolve(response(payload(firstToken)));
  await duplicate;
  assert.equal(firstClient.getPending()?.token, secondToken,
    'an older receipt must leave the later round available for reconnect');

  requests[2].reject(new Error('network disconnected after acceptance'));
  await assert.rejects(next, /network disconnected/);
  assert.equal(firstClient.getPending()?.token, secondToken);
  const resumed = reconnectClient.resumePending();
  assert.equal(requests[3].body.client_token, secondToken);
  requests[3].resolve(response({ ...payload(secondToken), round_id: 'round-2' }));
  await resumed;
  assert.equal(firstClient.getPending(), null);
});

test('pending rounds stay with their account across account switches', async () => {
  const storage = makeStorage();
  const calls = [];
  let accountId = 'player-a';
  let serial = 0;
  const options = { gameId: 'multi-hot-wheel', storage,
    getAccountId: () => accountId, getAccessToken: () => `test-access-${accountId}`,
    tokenFactory: () => `account_round_${++serial}`,
    fetcher: async (_url, options) => {
      calls.push({ body: JSON.parse(options.body), authorization: options.headers.Authorization });
      return response({ status: 'pending' }, 202);
    } };
  const firstAccountClient = createRoundClient(options);
  await firstAccountClient.beginRound('1');
  const firstToken = firstAccountClient.getPending().token;
  accountId = 'player-b';
  assert.throws(() => firstAccountClient.beginRound('1'), /ROUND_ACCOUNT_CHANGED/);
  assert.throws(() => firstAccountClient.resumePending(), /ROUND_ACCOUNT_CHANGED/);
  assert.equal(calls.length, 1, 'the old client cannot send under a different account');

  const secondAccountClient = createRoundClient(options);
  assert.equal(secondAccountClient.getPending(), null);
  await secondAccountClient.beginRound('1');
  const secondToken = secondAccountClient.getPending().token;
  assert.notEqual(firstToken, secondToken);
  assert.equal(calls[1].authorization, 'Bearer test-access-player-b');

  accountId = 'player-a';
  const restored = createRoundClient(options);
  await restored.resumePending();
  assert.equal(calls[2].body.client_token, firstToken);
  assert.equal(calls[2].authorization, 'Bearer test-access-player-a');
  accountId = 'player-b';
  assert.equal(secondAccountClient.getPending().token, secondToken);
});

test('an account change during a request preserves the original owner recovery token', async () => {
  const storage = makeStorage();
  let accountId = 'player-a';
  let resolveNetwork;
  let accessToken = 'test-access-before-refresh';
  const calls = [];
  const client = createRoundClient({ gameId: 'multi-hot-wheel', storage,
    getAccountId: () => accountId, getAccessToken: () => accessToken,
    tokenFactory: () => 'owner_round_123',
    fetcher: (_url, options) => {
      calls.push({ body: JSON.parse(options.body), authorization: options.headers.Authorization });
      return new Promise(resolve => { resolveNetwork = resolve; });
    } });
  const first = client.beginRound('1');
  accountId = 'player-b';
  resolveNetwork(response(payload('owner_round_123')));
  await assert.rejects(first, /ROUND_ACCOUNT_CHANGED/);

  accountId = 'player-a';
  assert.equal(client.getPending().token, 'owner_round_123');
  accessToken = 'test-access-after-refresh';
  const resumed = client.resumePending();
  assert.equal(calls[1].body.client_token, calls[0].body.client_token);
  assert.equal(calls[1].authorization, 'Bearer test-access-after-refresh');
  resolveNetwork(response(payload('owner_round_123')));
  await resumed;
  assert.equal(client.getPending(), null);
});

test('legacy pending state without an owner is preserved and cannot submit a new bet', () => {
  const storage = makeStorage();
  const key = 'zplay.pending-round.v1.multi-hot-wheel';
  const legacy = JSON.stringify({ v: 1, gameId: 'multi-hot-wheel', bet: '1', token: 'legacy_round_123' });
  storage.setItem(key, legacy);
  let calls = 0;
  const client = createRoundClient({ gameId: 'multi-hot-wheel', storage,
    getAccountId: () => 'player-a', getAccessToken: () => 'test-only',
    fetcher: async () => { calls++; return response(payload()); } });
  assert.throws(() => client.beginRound('1'), /ROUND_LEGACY_PENDING/);
  assert.throws(() => client.resumePending(), /ROUND_LEGACY_PENDING/);
  assert.equal(calls, 0);
  assert.equal(storage.getItem(key), legacy, 'unknown accepted state must remain for reconciliation');
});

test('an authenticated account identity is required before storing a pending round', () => {
  const options = { gameId: 'multi-hot-wheel', storage: makeStorage(),
    getAccessToken: () => 'test-only', fetcher: async () => response(payload()) };
  assert.throws(() => createRoundClient(options), /ROUND_CLIENT_CONFIGURATION/);
  for (const accountId of [null, undefined, {}, false, 0, -1, 1.5]) {
    assert.throws(() => createRoundClient({ ...options, getAccountId: () => accountId }),
      /ROUND_ACCOUNT_REQUIRED/);
  }
  for (const accountId of ['', '../another-account', 'player a']) {
    assert.throws(() => createRoundClient({ ...options, getAccountId: () => accountId }),
      /INVALID_ACCOUNT_ID/);
  }
});

test('a delayed no-debit rejection cannot erase a newer pending round', async () => {
  const storage = makeStorage();
  const requests = [];
  let serial = 0;
  const options = { gameId: 'multi-hot-wheel', storage,
    getAccountId: () => 'player-a', getAccessToken: () => 'test-only',
    tokenFactory: () => `rejected_round_${++serial}`,
    fetcher: (_url, options) => new Promise(resolve => {
      requests.push({ body: JSON.parse(options.body), resolve });
    }) };
  const firstClient = createRoundClient(options);
  const reconnectClient = createRoundClient(options);
  const original = firstClient.beginRound('1');
  const duplicate = reconnectClient.resumePending();
  const firstToken = requests[0].body.client_token;
  const rejected = () => response({ status: 'rejected', debit_applied: false,
    client_token: firstToken }, 402);
  requests[0].resolve(rejected());
  await assert.rejects(original, /ROUND_NOT_SETTLED/);

  const next = firstClient.beginRound('1');
  const secondToken = requests[2].body.client_token;
  requests[1].resolve(rejected());
  await assert.rejects(duplicate, /ROUND_NOT_SETTLED/);
  assert.equal(firstClient.getPending()?.token, secondToken);
  requests[2].resolve(response(payload(secondToken)));
  await next;
  assert.equal(firstClient.getPending(), null);
});
