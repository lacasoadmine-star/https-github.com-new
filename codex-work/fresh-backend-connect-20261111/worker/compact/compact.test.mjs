import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createGateway as authoredGateway } from '../modules/independent74-gateway-r18.mjs';
import { createGateway as compactGateway } from './modules/independent74-gateway-r18.mjs';
import { loadAssets as authoredAssets } from '../modules/independent74-connected-assets-r18.mjs';
import { loadAssets as compactAssets } from './modules/independent74-connected-assets-r18.mjs';
import { ACCOUNT_ASSET_OVERRIDES } from '../modules/independent74-account-assets-r18.mjs';
import { FRESH_ACCOUNT_ASSETS } from '../modules/independent74-connected-assets-r18.mjs';
import { games, accountGames } from '../modules/independent74-catalog-r17.mjs';

test('compact asset loader decodes all8 overrides byte-exact and only3 new modules are required', async () => {
  const packed = await compactAssets(), authored = await authoredAssets();
  assert.deepEqual(packed, authored);
  const overrides = { ...ACCOUNT_ASSET_OVERRIDES, ...FRESH_ACCOUNT_ASSETS };
  assert.equal(Object.keys(overrides).length, 8);
  for (const [path, asset] of Object.entries(overrides)) {
    assert.deepEqual(packed[path], asset);
    assert.equal(Buffer.compare(Buffer.from(packed[path].body), Buffer.from(asset.body)), 0, path);
  }
  const modules = JSON.parse(await readFile(new URL('./modules.json', import.meta.url)));
  const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url)));
  assert.equal(Object.keys(modules).length, 3);
  assert(manifest.addedModuleBytes < 45000);
  assert(manifest.requestEstimate.conservativeTotalBytes < 67000000);
  for (const item of manifest.modules) {
    const source = await readFile(new URL('./modules/' + item.name, import.meta.url), 'utf8');
    assert.equal(source, modules[item.name]);
    assert.equal(createHash('sha256').update(source).digest('hex'), item.sha256);
  }
  const entry = modules['independent74-entry-r18.mjs'];
  assert(entry.includes('independent74-connected-assets-r18.mjs'));
  assert(entry.includes('independent74-gateway-r18.mjs'));
  assert(!Object.values(modules).some(source => source.includes('independent74-account-assets-r18.mjs')));
  assert(modules['independent74-connected-assets-r18.mjs'].includes('independent74-assets-r17.mjs'));
  assert(modules['independent74-gateway-r18.mjs'].includes('independent74-gateway-r17.mjs'));
  for (const item of manifest.authoredInputModules) {
    const source = await readFile(new URL('../modules/' + item.name, import.meta.url));
    assert.equal(source.length, item.bytes);
    assert.equal(createHash('sha256').update(source).digest('hex'), item.sha256, 'frozen authored input ' + item.name);
  }
});

test('compiled adapter responses, headers and delegated request traces equal the frozen authored gateway', async () => {
  const assets = await compactAssets(), cookie = 'sw_session=' + 'b'.repeat(64), guard = 'c'.repeat(64);
  const identity = { authenticated: true, currency: 'ETB', sessionId: guard, balance: '123.45' };
  const make = factory => {
    const trace = [];
    return { trace, handler: factory({ assets, games, accountGames, homeEnhancement: true,
      accountTransport: 'protected-readonly',
      previous: { fetch(request) {
        trace.push({ method: request.method, url: request.url, headers: [...request.headers] });
        const path = new URL(request.url).pathname;
        if (path === '/api/machine-session') return Response.json(identity, { headers: { 'x-zplay-session': 'retained', 'set-cookie': 'retained=fixture; Secure; HttpOnly' } });
        if (path === '/') return new Response('<html><head></head><body>Retained home</body></html>', { headers: { 'content-type': 'text/html', 'content-security-policy': "default-src 'self'" } });
        return Response.json({ legacy: path });
      } },
      demoHandler: () => Response.json({ retainedDemo: true }),
      fetchImpl: () => { throw Error('No external backend request is allowed'); },
    }) };
  };
  const left = make(authoredGateway), right = make(compactGateway), cases = [];
  for (const game of accountGames) {
    cases.push({ path: '/independent74/account-api/state?game_id=' + game.id });
    cases.push({ path: '/independent74/account-api/history?game_id=' + game.id });
    cases.push({ path: '/independent74/account-api/action', body: { request_id: randomUUID(), type: 'start', game_id: game.id, model_version: game.version, stake: '1.00', options: {} } });
  }
  cases.push(...['/', '/player/chicken-road', '/independent74/account-api/catalog', '/independent74/account-api/catalog?x=1',
    '/independent74/account-api/state?game_id=unknown', '/independent74/account-api/state?game_id=' + accountGames[0].id + '&user_id=other',
    '/independent74/demo-api/state?game_id=' + accountGames[0].id, '/independent74/not-found'].map(path => ({ path })));
  cases.push({ path: '/independent74/account-api/state?game_id=' + accountGames[0].id, cookie: '' });
  cases.push({ path: '/independent74/account-api/catalog', method: 'POST' });
  for (const scenario of cases) {
    const makeRequest = () => new Request('https://player.fixture' + scenario.path, {
      method: scenario.method ?? (scenario.body ? 'POST' : 'GET'),
      headers: { cookie: scenario.cookie ?? cookie,
        ...(scenario.body ? { origin: 'https://player.fixture', 'content-type': 'application/json', 'x-independent74-session': guard } : {}) },
      ...(scenario.body ? { body: JSON.stringify(scenario.body) } : {}),
    });
    const responses = await Promise.all([left.handler(makeRequest(), {}, {}), right.handler(makeRequest(), {}, {})]);
    assert.equal(responses[0].status, responses[1].status, scenario.path);
    assert.deepEqual([...responses[0].headers], [...responses[1].headers], scenario.path + ': headers');
    const texts = await Promise.all(responses.map(response => response.text()));
    if (responses[0].headers.get('content-type')?.includes('application/json')) assert.deepEqual(JSON.parse(texts[0]), JSON.parse(texts[1]), scenario.path);
    else assert.equal(texts[0], texts[1], scenario.path);
  }
  assert.deepEqual(left.trace, right.trace);
});
