import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {accountApp, accountConfigs, GAME_GROUPS, PREFIX, PREVIOUS_PREFIX, installAccountEntry} from '../../deploy/smartsoft/account-entry-r13.mjs';

const env = {PORTAL: 'player'};
const config = id => ({id, version: id + '-v1', minStake: '1.00', maxStake: '40000.00', currency: 'CREDITS', demo: true, demoCreditsOnly: true, launchable: true, currencyAdaptation: {currency: 'CREDITS', productionLaunchable: false}, actions: ['collect', 'gamble'], stakeValues: ['1.00', '2.00', '40000.00']});
const sourceConfigs = Object.keys(GAME_GROUPS).map(config);
function fixture({override} = {}) {
  const calls = [], transported = [];
  const previous = {
    scheduled() { return 'existing scheduled handler'; },
    async fetch(request) {
      calls.push(request);
      const path = new URL(request.url).pathname;
      if (override) { const response = override(request); if (response) return response; }
      if (path.startsWith('/demo/games/')) {
        const id = path.split('/').at(-1), group = GAME_GROUPS[id];
        return new Response('<html><head><script type="module" src="' + PREVIOUS_PREFIX + group + '/app.mjs"></script></head><body><strong id="wallet">—</strong><small>CREDITS</small><select aria-label="Stake in CREDITS"><option value="0.10">0.10 CREDITS</option></select></body></html>', {headers: {'content-type': 'text/html', 'content-security-policy': "script-src 'self'", 'set-cookie': 'review_session=do-not-forward'}});
      }
      if (path.endsWith('/demo-games.json')) return Response.json(sourceConfigs, {headers: {'etag': 'demo-etag', 'set-cookie': 'review_session=do-not-forward'}});
      if (path === '/') return new Response('<html><head></head><body>retained lobby</body></html>', {headers: {'content-type': 'text/html'}});
      return new Response('retained response', {headers: {'x-retained': '1'}});
    },
  };
  const createTransport = (retained, options) => {
    assert.equal(retained, previous);
    assert.deepEqual(options.games.map(game => game.id).sort(), Object.keys(GAME_GROUPS).sort());
    assert.ok(options.games.every(game => game.published === true && game.launchable === false));
    return {async fetch(request) { transported.push(request); return Response.json({retainedTransport: true, accepting: false, balance: '47.35', currency: 'ETB'}); }};
  };
  const app = installAccountEntry(previous, {createTransport, lobbySource: 'export const accountEntry = true;'});
  return {app, previous, calls, transported};
}

test('all eight account pages contain ETB and retain per-title controls, CSP and protected routes', async () => {
  const {app, previous, calls} = fixture();
  assert.equal(app.scheduled, previous.scheduled);
  for (const [id, group] of Object.entries(GAME_GROUPS)) {
    const response = await app.fetch(new Request('https://player.test/games/' + id, {headers: {cookie: 'sw_session=private', authorization: 'Bearer private'}}), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-security-policy'), "script-src 'self'");
    assert.equal(response.headers.get('set-cookie'), null);
    const html = await response.text();
    assert.ok(html.includes(PREFIX + group + '/app.mjs'));
    assert.ok(html.includes('<strong id="wallet">—</strong><small>ETB</small>'));
    assert.ok(!html.includes('CREDITS'));
    assert.ok(html.includes('<option value="1.00">1.00 ETB</option>'));
    const assetRequest = calls.at(-1);
    assert.equal(assetRequest.headers.get('cookie'), null);
    assert.equal(assetRequest.headers.get('authorization'), null);
  }
  for (const id of ['multi_hot_5_native', 'foxy_hot_20_native', 'burningice10_native', 'burningice40_native']) {
    const request = new Request('https://player.test/games/' + id);
    const response = await app.fetch(request, env);
    assert.equal(await response.text(), 'retained response');
    assert.equal(calls.at(-1), request);
  }
});

test('account configs preserve bet schedules and versions, remove credits, and retain server release ownership', async () => {
  const {app, calls} = fixture();
  for (const group of new Set(Object.values(GAME_GROUPS))) {
    const response = await app.fetch(new Request('https://player.test' + PREFIX + group + '/games.json', {headers: {cookie: 'private', 'if-none-match': 'demo-etag'}}), env);
    const games = await response.json();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('etag'), null);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(calls.at(-1).headers.get('if-none-match'), null);
    assert.ok(games.length > 0);
    for (const game of games) {
      assert.equal(GAME_GROUPS[game.id], group);
      assert.equal(game.currency, 'ETB');
      assert.equal(game.demo, undefined);
      assert.equal(game.demoCreditsOnly, undefined);
      assert.equal(game.launchable, false);
      assert.equal(game.published, false);
      assert.equal(game.currencyAdaptation.currency, 'ETB');
      assert.equal(game.currencyAdaptation.productionLaunchable, false);
      assert.deepEqual(game.stakeValues, config(game.id).stakeValues);
      assert.equal(game.version, config(game.id).version);
    }
    const head = await app.fetch(new Request('https://player.test' + PREFIX + group + '/games.json', {method: 'HEAD'}), env);
    assert.equal(head.status, 200); assert.equal(await head.text(), '');
  }
  assert.throws(() => accountConfigs([], Object.values(GAME_GROUPS)[0]), /SCOPE_MISMATCH/);
  assert.throws(() => accountConfigs(sourceConfigs.map(game => ({...game, minStake: '0.10'})), Object.values(GAME_GROUPS)[0]), /WAGER_PROFILE_MISMATCH/);
});

test('wallet reads, actions and exact retries keep their authenticated original request and balance', async () => {
  const {app, transported} = fixture();
  for (const id of Object.keys(GAME_GROUPS)) {
    for (const operation of ['state', 'history']) {
      const request = new Request('https://player.test/api/remaining20/' + operation + '?game_id=' + id, {headers: {cookie: 'private'}});
      const response = await app.fetch(request, env);
      assert.equal(transported.at(-1), request);
      assert.deepEqual(await response.json(), {retainedTransport: true, accepting: false, balance: '47.35', currency: 'ETB'});
    }
    const body = JSON.stringify({game_id: id, request_id: 'same-request', stake: '2.00', model_version: 'historical-model'});
    for (let retry = 0; retry < 2; retry++) {
      const request = new Request('https://player.test/api/remaining20/action', {method: 'POST', headers: {'content-type': 'application/json', cookie: 'private', origin: 'https://player.test', 'X-Zplay-Library-Session': 'same-session'}, body});
      await app.fetch(request, env);
      assert.equal(transported.at(-1), request);
      assert.equal(await request.text(), body);
      assert.equal(request.headers.get('cookie'), 'private');
    }
  }
});

test('unrelated games, malformed bodies, wrong portals and asset writes keep their boundaries', async () => {
  const {app, calls, transported} = fixture();
  for (const body of ['not json', JSON.stringify({game_id: 'multi_hot_5_new'}), 'x'.repeat(8193)]) {
    const request = new Request('https://player.test/api/remaining20/action', {method: 'POST', body});
    await app.fetch(request, env);
    assert.equal(calls.at(-1), request);
    assert.equal(await request.text(), body);
  }
  assert.equal(transported.length, 0);
  const request = new Request('https://player.test/games/multihot100_native');
  await app.fetch(request, {PORTAL: 'admin'}); assert.equal(calls.at(-1), request);
  const response = await app.fetch(new Request('https://player.test' + PREFIX + '5fddea498e1f0d39/app.mjs', {method: 'POST', body: 'unchanged'}), env);
  assert.equal(response.status, 405);
  const unknown = await app.fetch(new Request('https://player.test' + PREFIX + 'ffffffffffffffff/app.mjs'), env);
  assert.equal(unknown.status, 404);
});

test('changed, oversized or redirected review shells never become account pages', async () => {
  for (const source of [() => new Response('<html>changed shell</html>', {headers: {'content-type': 'text/html'}}), () => new Response('x'.repeat(131073), {headers: {'content-type': 'text/html'}}), () => Response.redirect('https://outside.test/')]) {
    const {app} = fixture({override: request => new URL(request.url).pathname.startsWith('/demo/games/') ? source() : null});
    assert.equal((await app.fetch(new Request('https://player.test/games/multihot100_native'), env)).status, 503);
  }
});

test('gzip lobby responses retain the existing page and receive one account adapter', async () => {
  const original = '<html><head></head><body>retained lobby</body></html>';
  const compressed = gzipSync(original);
  const {app} = fixture({override: request => new URL(request.url).pathname === '/' ? new Response(compressed, {headers: {'content-type': 'text/html', 'content-encoding': 'gzip', 'content-length': String(compressed.length)}}) : null});
  const response = await app.fetch(new Request('https://player.test/'), env);
  assert.equal(response.headers.get('content-encoding'), null);
  assert.equal(response.headers.get('content-length'), null);
  const html = await response.text();
  assert.ok(html.includes('retained lobby'));
  assert.ok(html.includes(PREFIX + 'lobby.mjs?v=10'));
  assert.equal(html.split('data-zplay-account-entry-r13').length - 1, 1);
});

test('older hardcoded catalogue requests use the account config while newer relative calls retain their code', () => {
  const relative = "gameFetch(new URL('./games.json',import.meta.url).href,";
  const source = "async function boot(){ const response=await gameFetch('/native-library/remaining20/20261109-r4/games.json',{credentials:'same-origin'});session=new ExpansionSession({}); }";
  const result = accountApp(source);
  assert.equal(result, source.replace("gameFetch('/native-library/remaining20/20261109-r4/games.json',", relative));
  assert.equal(accountApp(result), result);
  assert.throws(() => accountApp(source.replace('games.json', 'unknown.json')), /CONFIG_ROUTE_CHANGED/);
  assert.throws(() => accountApp(source + source), /CONFIG_ROUTE_CHANGED/);
});
