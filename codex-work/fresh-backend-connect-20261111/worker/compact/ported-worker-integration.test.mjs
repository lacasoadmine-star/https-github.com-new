import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { createGateway, csrfGuard } from "./modules/independent74-gateway-r18.mjs";
import { loadAssets, ACCOUNT_ASSET_OVERRIDES } from "../modules/independent74-account-assets-r18.mjs";
import { loadAssets as loadConnectedAssets, FRESH_ACCOUNT_ASSETS } from "../modules/independent74-connected-assets-r18.mjs";
import { loadAssets as loadPreviousAssets } from "../modules/independent74-assets-r17.mjs";
import { games, accountGames } from "../modules/independent74-catalog-r17.mjs";
import { EXISTING_WALLET_ROUTES } from "../../../independent74-20261111/client/existing-wallet-routes.mjs";

const origin = 'https://player.fixture', token = 'b'.repeat(64), guard = 'c'.repeat(64);
const newGames = accountGames.filter(game => !Object.hasOwn(EXISTING_WALLET_ROUTES, game.id));
const assets = await loadAssets();
const identity = { authenticated: true, currency: 'ETB', sessionId: guard, balance: '123.45' };

function fixture({ identityValue = identity, identityStatus = 200, catalog = accountGames } = {}) {
  const reads = [], legacy = [], demo = [], external = [];
  const previous = { fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/machine-session') {
      reads.push({ method: request.method, path: url.pathname, cookie: request.headers.get('cookie'), headers: Object.fromEntries(request.headers) });
      const value = typeof identityValue === 'function' ? identityValue(request) : identityValue;
      return Response.json(value, { status: identityStatus, headers: { 'x-zplay-session': 'retained-marker', 'set-cookie': 'retained=fixture; Secure; HttpOnly' } });
    }
    legacy.push({ path: url.pathname, method: request.method });
    if (url.pathname === '/') return new Response('<!doctype html><html><head></head><body>Existing dashboard</body></html>', { headers: { 'content-type': 'text/html', 'content-security-policy': "default-src 'self'; frame-src 'self'" } });
    return Response.json({ legacyPath: url.pathname, method: request.method });
  } };
  const handler = createGateway({ previous, assets, games, accountGames: catalog,
    homeEnhancement: true, accountTransport: 'protected-readonly',
    demoHandler: request => { demo.push(new URL(request.url).pathname); return Response.json({ retainedDemo: true }); },
    fetchImpl: (...args) => { external.push(args); throw Error('NEW_NATIVE_OR_FINANCIAL_FORWARD_FORBIDDEN'); },
  });
  const request = (path, { body, cookie = 'sw_session=' + token, sessionGuard = guard, requestOrigin = origin, method = body ? 'POST' : 'GET' } = {}) => handler(new Request(origin + path, {
    method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { origin: requestOrigin, 'content-type': 'application/json', 'x-independent74-session': sessionGuard } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), { NATIVE_ENGINE_ORIGIN: 'https://unused.fixture', NATIVE_ENGINE_SECRET: 'unused-secret', NEW_GAMES_ENABLED: 'true' }, {});
  return { request, reads, legacy, demo, external };
}

test('public catalog states read capability and closed models without inventing health, balance or history', async () => {
  assert.equal(accountGames.length, 72);
  assert.equal(newGames.length, 60);
  assert.equal(Object.keys(EXISTING_WALLET_ROUTES).length, 14);
  const f = fixture({ catalog: accountGames.map(game => ({ ...game, accepting: true, launchable: true })) });
  const response = await f.request('/independent74/account-api/catalog'), value = await response.json();
  assert.equal(response.status, 200);
  assert.equal(value.games.length, 72);
  assert.equal(new Set(value.games.map(game => game.id)).size, 72);
  assert.equal(value.accountReadSupported, true);
  assert.equal(value.readOnly, true);
  assert.equal(value.modelInstalled, false);
  assert.equal(value.new_rounds_enabled, false);
  assert.equal(value.historyAvailable, false);
  assert.equal(value.activeRecoveryVerified, false);
  for (const game of value.games) {
    assert.equal(game.accepting, false); assert.equal(game.launchable, false);
    assert.equal(game.readOnly, true); assert.equal(game.modelInstalled, false);
    assert.equal(game.historyAvailable, false); assert.deepEqual(game.controls.actions, []);
  }
  for (const field of ['ready', 'balance', 'history', 'accountServiceAvailable']) assert.equal(Object.hasOwn(value, field), false);
  assert.deepEqual(f.reads, []); assert.deepEqual(f.external, []);
});

test('all60 titles read the exact authenticated existing balance for each of two accounts without cross-account caching', async () => {
  const secondToken = 'd'.repeat(64), secondGuard = 'e'.repeat(64);
  const f = fixture({ identityValue: request => request.headers.get('cookie') === 'sw_session=' + secondToken ?
    { ...identity, balance: '90000.07', sessionId: secondGuard } : identity });
  for (const game of newGames) {
    for (const [session, balance, binding] of [[token, '123.45', guard], [secondToken, '90000.07', secondGuard]]) {
      const response = await f.request('/independent74/account-api/state?game_id=' + game.id, { cookie: 'sw_session=' + session });
      assert.equal(response.status, 200, game.id);
      const value = await response.json();
      assert.equal(value.authenticated, true); assert.equal(value.balance, balance); assert.equal(value.currency, 'ETB');
      assert.equal(value.sessionGuard, binding); assert.equal(value.game_id, game.id);
      assert.equal(value.game.id, game.id); assert.equal(value.game.readOnly, true);
      assert.equal(value.readOnly, true); assert.equal(value.modelInstalled, false);
      assert.equal(value.accountServiceAvailable, true); assert.equal(value.accountReadSupported, true);
      assert.equal(value.accepting, false); assert.equal(value.new_rounds_enabled, false);
      assert.equal(value.historyAvailable, false); assert.equal(value.activeRecoveryVerified, false);
      assert.equal(value.round, null); assert.equal(value.releaseStatus, 'pending');
      assert.equal(response.headers.get('x-zplay-session'), 'retained-marker');
      assert.equal(response.headers.get('set-cookie'), 'retained=fixture; Secure; HttpOnly');
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.equal(response.headers.get('vary'), 'Cookie');
      for (const field of ['history', 'user_id', 'username', 'token']) assert.equal(Object.hasOwn(value, field), false);
    }
  }
  assert.equal(f.reads.length, 120);
  assert(f.reads.every(read => read.method === 'GET' && read.path === '/api/machine-session'));
  assert.deepEqual(f.external, []);
});

test('all60 authenticated starts reject503 and all60 histories remain explicitly unavailable without any POST forwarding', async () => {
  const f = fixture();
  for (const game of newGames) {
    const body = { request_id: randomUUID(), type: 'start', game_id: game.id, model_version: game.version, stake: '1.00', options: {} };
    const action = await f.request('/independent74/account-api/action', { body });
    assert.equal(action.status, 503, game.id);
    const denied = await action.json();
    assert.equal(denied.error.code, 'GAME_RELEASE_NOT_READY'); assert.equal(denied.retryable, false);
    const response = await f.request('/independent74/account-api/history?game_id=' + game.id);
    assert.equal(response.status, 503);
    const history = await response.json();
    assert.equal(history.error.code, 'GAME_HISTORY_NOT_AVAILABLE'); assert.equal(history.retryable, false);
    assert.equal(Object.hasOwn(history, 'history'), false);
  }
  assert.equal(f.reads.length, 120);
  assert(f.reads.every(read => read.method === 'GET'));
  assert.deepEqual(f.external, []);
});

test('existing cookie and opaque session nonce are required; cross-origin and client-authority inputs never forward', async () => {
  const f = fixture(), game = newGames[0], state = '/independent74/account-api/state?game_id=' + game.id;
  const body = { request_id: randomUUID(), type: 'start', game_id: game.id, model_version: game.version, stake: '1.00', options: {} };
  assert.equal((await f.request(state, { cookie: '' })).status, 401);
  assert.equal((await f.request(state, { cookie: 'sw_session=a; sw_session=b' })).status, 401);
  assert.equal(f.reads.length, 0);
  assert.equal((await f.request('/independent74/account-api/action', { body, requestOrigin: 'https://other.fixture' })).status, 403);
  assert.equal((await f.request('/independent74/account-api/action', { body, sessionGuard: '0'.repeat(64) })).status, 403);
  assert.equal((await f.request('/independent74/account-api/action', { body, sessionGuard: await csrfGuard(token) })).status, 403);
  assert.equal((await f.request('/independent74/account-api/action', { body: { ...body, payoutMinor: '99999' } })).status, 400);
  for (const path of [state + '&user_id=other', state + '&game_id=' + game.id, '/independent74/account-api/state?game_id=unknown']) {
    assert.equal((await f.request(path)).status, 400);
  }
  assert.deepEqual(f.external, []);
});

test('missing or malformed existing account data never produces a balance or claims connection', async () => {
  const path = '/independent74/account-api/state?game_id=' + newGames[0].id;
  for (const changed of [{ balance: '-1.00' }, { balance: 123.45 }, { balance: '1e6' }, { balance: '123.450' }, { balance: '001.00' }, { currency: 'PTS' }, { sessionId: 'wrong' }]) {
    const f = fixture({ identityValue: { ...identity, ...changed } });
    const response = await f.request(path); assert.equal(response.status, 502);
    const value = await response.json(); assert.equal(Object.hasOwn(value, 'balance'), false); assert.equal(Object.hasOwn(value, 'accountServiceAvailable'), false);
    assert.deepEqual(f.external, []);
  }
  for (const options of [{ identityValue: { authenticated: false } }, { identityStatus: 401 }, { identityStatus: 503 }]) {
    const response = await fixture(options).request(path);
    assert.equal(response.status, 401);
    assert.equal(Object.hasOwn(await response.json(), 'balance'), false);
  }
});

test('all14 original game routes and other12 account aliases remain protected; demos delegate unchanged', async () => {
  const f = fixture();
  for (const path of Object.values(EXISTING_WALLET_ROUTES)) {
    assert.deepEqual(await (await f.request(path)).json(), { legacyPath: path, method: 'GET' });
  }
  for (const game of accountGames.filter(game => Object.hasOwn(EXISTING_WALLET_ROUTES, game.id))) {
    const value = await (await f.request('/independent74/account-api/state?game_id=' + game.id)).json();
    assert.equal(value.existingWalletReadOnly, true); assert.equal(value.accepting, false); assert.equal(value.historyAvailable, false);
  }
  assert.equal(accountGames.filter(game => Object.hasOwn(EXISTING_WALLET_ROUTES, game.id)).length, 12);
  assert.deepEqual(await (await f.request('/api/slots/games')).json(), { legacyPath: '/api/slots/games', method: 'GET' });
  assert.deepEqual(await (await f.request('/independent74/demo-api/state?game_id=' + newGames[0].id)).json(), { retainedDemo: true });
  assert.deepEqual(f.external, []);
});

test('current gateway is recoverable outside four declared changes and exact fresh-home injection is retained', async () => {
  const original = await readFile(new URL("../modules/independent74-gateway-r17.mjs", import.meta.url), 'utf8');
  const baseline = (await transform(original, { format: 'esm', minify: false, legalComments: 'inline' })).code;
  let current = await readFile(new URL("../modules/independent74-gateway-r18.mjs", import.meta.url), 'utf8');
  assert.doesNotMatch(current, /existing-library60|runtimeAccountCatalog|integratedAccountGameIds/);
  const changes = JSON.parse(await readFile(new URL("../state-connection-changes.json", import.meta.url)));
  assert.equal(changes.patches.length, 4);
  for (const [before, after] of [...changes.patches].reverse()) { assert(current.includes(after)); current = current.replace(after, before); }
  assert.equal(current, baseline);
  const response = await fixture().request('/'), html = await response.text();
  for (const name of ['lobby74.mjs', 'lobby74.css', 'fresh74-lobby.mjs', 'fresh74-lobby.css']) assert.equal(html.split('/independent74/' + name).length - 1, 1, name);
  assert(html.includes('Existing dashboard'));
  assert.match(response.headers.get('content-security-policy'), /frame-src 'self'/);
});

test('account assets retain all other baseline files and root fresh overlay plus entry chain remain intact', async () => {
  const old = await loadPreviousAssets(), connected = await loadConnectedAssets();
  assert.deepEqual(Object.keys(old).filter(path => JSON.stringify(old[path]) !== JSON.stringify(assets[path])).sort(), Object.keys(ACCOUNT_ASSET_OVERRIDES).sort());
  for (const [path, asset] of Object.entries(ACCOUNT_ASSET_OVERRIDES)) assert.deepEqual(connected[path], asset);
  for (const [path, asset] of Object.entries(FRESH_ACCOUNT_ASSETS)) assert.deepEqual(connected[path], asset);
  for (const path of Object.keys(old)) {
    if (!Object.hasOwn(ACCOUNT_ASSET_OVERRIDES, path) && !Object.hasOwn(FRESH_ACCOUNT_ASSETS, path)) assert.deepEqual(connected[path], old[path]);
  }
  assert.match(assets['/lobby74.mjs'].body, /FUR WALLET/);
  assert(assets['/lobby74.mjs'].body.includes('?mode=account#'));
  assert(assets['/lobby74.mjs'].body.includes('history-ga ciyaartan weli ma furna.'));
  assert(assets['/machine74-controller.mjs'].body.includes('t.historyAvailable===!0?'));
  assert(assets['/machine74-controller.mjs'].body.includes('mode")===\"standalone'));
  const entry = await readFile(new URL("../modules/independent74-entry-r18.mjs", import.meta.url), 'utf8');
  for (const name of ['presentation-player-entry-r23.mjs', 'independent74-catalog-r17.mjs', 'independent74-demo-r17.mjs', 'independent74-demo-gateway-r17.mjs', 'independent74-connected-assets-r18.mjs']) assert(entry.includes('./' + name));
  assert(entry.includes("accountTransport:'protected-readonly'"));
  assert(!entry.includes('account-scope-r18'));
  assert(!entry.includes('NATIVE60_GAME_IDS'));
});
