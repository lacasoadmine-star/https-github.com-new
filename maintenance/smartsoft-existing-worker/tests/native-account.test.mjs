import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SourceTextModule, createContext} from 'node:vm';
import {randomUUID} from 'node:crypto';

// Test the new adapter with the real retained ExpansionSession source. The
// linker resolves its two browser imports locally; no network is permitted.
const base = new URL('../', import.meta.url);
const context = createContext({console, crypto: {randomUUID}, queueMicrotask,
  AbortController, setTimeout, clearTimeout, Date, Response, URL});
const sources = new Map([
  ['account', await readFile(new URL('games/shared/native-account.mjs', base), 'utf8')],
  ['session', await readFile(new URL('tests/fixtures/native-existing-session.mjs', base), 'utf8')],
  ['reference-state', await readFile(new URL('tests/fixtures/native-reference-state.mjs', base), 'utf8')],
]);
const modules = new Map();
async function moduleFor(name) {
  if (modules.has(name)) return modules.get(name);
  const module = new SourceTextModule(sources.get(name), {context, identifier: name});
  modules.set(name, module);
  await module.link(specifier => {
    if (specifier.endsWith('/session.mjs')) return moduleFor('session');
    if (specifier.endsWith('/reference-state.mjs')) return moduleFor('reference-state');
    throw Error('Unexpected module import: ' + specifier);
  });
  return module;
}
const entry = await moduleFor('account');
await entry.evaluate();
const {NativeAccount, normalizeNativeRound, moneyMinor} = entry.namespace;
const ID = 'multihot100_native';
const VERSION = 'superwin-multihot100-2-etb1-40000-v1';
const GAME = {id: ID, version: VERSION, columns: 5, rows: 4,
  symbols: ['0','1','2','3','4','5','6','7'].map(id => ({id})),
  minStake: '1.00', maxStake: '40000.00', stakeValues: ['1.00','2.00','5.00'],
  launchable: true, actions: ['collect','gamble']};
const SESSION = 'isolated-native-account-test';
const asJSON = value => JSON.parse(JSON.stringify(value));
class Storage {
  entries = new Map();
  getItem(key) { return this.entries.get(key) ?? null; }
  setItem(key, value) { this.entries.set(key, value); }
  removeItem(key) { this.entries.delete(key); }
}
function response(data, status = 200) { return new Response(JSON.stringify(data), {status, headers: {'content-type':'application/json'}}); }
function round(overrides = {}) {
  return {game_id: ID, model_version: VERSION, round_id: 'b921e359-2120-4af0-92c6-054298cf12a6',
    version: 1, status: 'settled', stakeMinor: '100', payoutMinor: '0',
    grid: Array.from({length: 5}, (_, column) => Array(4).fill(String(column + 1))),
    wins: [], frames: [], feature: {multiplier: 1, frozenReels: []}, ...overrides};
}
function state(overrides = {}) {
  return {authenticated: true, currency: 'ETB', sessionId: SESSION, balance: '10.00',
    game: {...GAME, publicConfig: GAME}, round: null, accepting: true, other_active_game: null, ...overrides};
}
function account(fetchImpl, options = {}) {
  return new NativeAccount({gameId: ID, game: GAME, storage: new Storage(), fetchImpl,
    target: null, pause: async () => {}, ...options});
}

test('confirmed ETB state and column-major receipt remain exact and immutable', async () => {
  const supplied = round();
  const client = account(async () => response(state({round: supplied})));
  await client.refresh();
  assert.equal(client.state.balance, '10.00');
  assert.equal(client.state.balanceMinor, '1000');
  assert.equal(moneyMinor('90071992547409.93'), 9007199254740993n);
  assert.deepEqual(asJSON(client.state.round.grid), supplied.grid);
  assert.equal(client.state.canStart, true);
  assert.equal(Object.isFrozen(client.state.round.grid[0]), true);
  client.dispose();
});

test('start uses the existing idempotency/session request and server balance', async () => {
  const posts = [];
  const storage = new Storage();
  const client = account(async (url, options = {}) => {
    if (options.method !== 'POST') return response(state());
    const request = JSON.parse(options.body); posts.push(request);
    assert.equal(options.headers['X-Zplay-Library-Session'], SESSION);
    return response({...state({balance: '9.00', round: round()}), status: 'SUCCESS',
      request_id: request.request_id, game_id: ID});
  }, {storage});
  await client.refresh();
  assert.equal(await client.start('1.00', {autoCollect: true}), true);
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0], {request_id: posts[0].request_id, type:'start', game_id: ID,
    model_version: VERSION, stake:'1.00', options:{autoCollect:true}});
  assert.equal(client.state.balance, '9.00');
  assert.equal(storage.entries.size, 0);
  client.dispose();
});

test('old in-flight record replays its exact original request and refreshes canonical state', async () => {
  const storage = new Storage();
  const requestId = '9577ac6d-0bad-4c22-a3fd-154f4a7c4ed0';
  const body = JSON.stringify({request_id:requestId,type:'start',game_id:ID,model_version:VERSION,stake:'1.00',options:{autoCollect:true}}, null, 1);
  const key = 'zplay-remaining20:pending:v1:' + ID + ':' + SESSION;
  storage.setItem(key, JSON.stringify({body,requestId,sessionId:SESSION,gameId:ID,type:'start',roundId:null,createdAt:1}));
  let processed = false;
  const posts = [];
  const client = account(async (url, options = {}) => {
    if (options.method === 'POST') {
      posts.push(options.body); processed = true;
      return response({...state({balance:'9.00',round:round()}),status:'SUCCESS',request_id:requestId,game_id:ID,replayed:true});
    }
    return response(state(processed ? {balance:'9.00',round:round()} : {}));
  }, {storage,uuid:()=>{throw Error('A retry must not create a new token');}});
  await client.refresh();
  assert.equal(client.state.pending, true);
  assert.equal(client.state.canStart, false);
  assert.equal(await client.retry(), true);
  assert.deepEqual(posts, [body]);
  assert.equal(client.state.balance, '9.00');
  assert.equal(client.state.pending, false);
  assert.equal(storage.getItem(key), null);
  client.dispose();
});

test('malformed old pending records and unavailable storage prevent new action requests', async () => {
  let posts = 0;
  const fetchImpl = async (url, options = {}) => {
    if (options.method === 'POST') posts++;
    return response(state());
  };
  const storage = new Storage();
  const key = 'zplay-remaining20:pending:v1:' + ID + ':' + SESSION;
  storage.setItem(key, '{invalid');
  const blocked = account(fetchImpl, {storage});
  await blocked.refresh();
  assert.equal(blocked.state.recoveryBlocked, true);
  assert.equal(await blocked.start('1.00'), false);
  assert.equal(storage.getItem(key), '{invalid');
  blocked.dispose();
  const unavailable = account(fetchImpl, {storage:null});
  await unavailable.refresh();
  assert.equal(await unavailable.start('1.00'), false);
  assert.equal(posts, 0);
  unavailable.dispose();
});

test('foreign models, bad grids and unknown round statuses cannot enable a wager', async () => {
  for (const invalidState of [
    state({game:{...GAME,version:'unknown-model',publicConfig:GAME}}),
    state({round:round({grid:[['not-a-symbol']]})}),
    state({round:round({status:'unknown-status'})}),
    state({currency:'CREDITS',demo:true,demoCreditsOnly:true}),
  ]) {
    let posts = 0;
    const client = account(async (url, options = {}) => {
      if (options.method === 'POST') posts++;
      return response(invalidState);
    });
    await client.refresh();
    assert.equal(client.state.canStart, false);
    assert.equal(await client.start('1.00'), false);
    assert.equal(posts, 0);
    client.dispose();
  }
});

test('features and automatic frames stay supplied data; only collect/gamble are manual actions', async () => {
  const feature = {multiplier:3,frozenReels:[0,2],coinReels:[1],addedWilds:[[1,2]],scatterCount:2};
  let current = round({status:'active',payoutMinor:undefined,currentCashoutMinor:'100',version:4,
    actions:['collect','gamble'],gambleAvailable:true,gambleAttemptsRemaining:5,feature,
    frames:[{kind:'respin',grid:round().grid,feature:{frozenReels:[0,2]},winMinor:'100'}]});
  const posts = [];
  const client = account(async (url, options = {}) => {
    if (options.method !== 'POST') return response(state({round:current}));
    const request = JSON.parse(options.body);posts.push(request);
    assert.equal(request.type, 'action');
    assert.equal(request.expected_version, current.version);
    if (request.action === 'gamble') current = {...current,version:5,currentCashoutMinor:'200',
      gambleHistory:[{choice:'red',color:'red',suit:'hearts',won:true,attempt:1}]};
    else current = {...current,version:6,status:'settled',payoutMinor:'200',actions:[]};
    return response({...state({round:current,balance:current.status==='settled'?'12.00':'10.00'}),
      status:'SUCCESS',request_id:request.request_id,game_id:ID});
  });
  await client.refresh();
  assert.deepEqual(asJSON(client.state.round.feature), feature);
  assert.equal(client.state.round.frames[0].kind, 'respin');
  assert.equal(await client.act('respin'), false);
  assert.equal(await client.gamble('blue'), false);
  assert.equal(await client.gamble('red'), true);
  assert.equal(client.state.round.lastGamble.suit, 'hearts');
  assert.equal(client.state.round.amountMinor, '200');
  assert.equal(await client.collect(), true);
  assert.equal(client.state.balance, '12.00');
  assert.deepEqual(posts.map(p=>p.action), ['gamble','collect']);
  client.dispose();
});

test('history retains settled records and rejects wrong account/game/order responses', async () => {
  let wrong = false;
  const client = account(async url => url.includes('/history?') ? response({currency:'ETB',
    game_id:wrong?'foreign-game':ID,sessionId:SESSION,rows:[{createdAt:'2026-11-11T00:00:00Z',round:round()}]}) : response(state()));
  await client.refresh();
  assert.equal((await client.history('wins')).length, 1);
  await assert.rejects(client.history('unknown'), /INVALID_HISTORY_ORDER/);
  wrong = true;
  await assert.rejects(client.history(), /INVALID_HISTORY_RESPONSE/);
  client.dispose();
});

test('guest state has no invented balance and cannot start, collect or gamble', async () => {
  let posts = 0;
  const client = account(async (url, options = {}) => {
    if (options.method === 'POST') posts++;
    return response({error:'UNAUTHORIZED'},401);
  });
  await client.refresh();
  assert.equal(client.state.authenticated, false);
  assert.equal(client.state.balance, null);
  assert.equal(client.state.balanceMinor, null);
  assert.equal(await client.start('1.00'), false);
  assert.equal(await client.collect(), false);
  assert.equal(await client.gamble('red'), false);
  assert.equal(posts, 0);
  client.dispose();
});
