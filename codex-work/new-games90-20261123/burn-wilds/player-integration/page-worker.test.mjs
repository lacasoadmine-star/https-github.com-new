import test from 'node:test';
import assert from 'node:assert/strict';
import {BURN_TEST_CLIENT_FILES, BURN_TEST_PAGE, createBurnWildsTestPageWorker, burnTestViewport} from './page-worker.mjs';
import {assertClientImportClosure} from './build.mjs';

const config = () => ({revision: '1234567890abcdef12345678', assets: Object.fromEntries(BURN_TEST_CLIENT_FILES.map(name => [name, name.endsWith('.css') ? '.test{}' : 'export const ready = true;']))});
const request = (path, options) => new Request('https://superwin-player.apdiy61.workers.dev' + path, options);

test('new page exposes explicit server test entry without enabling cash or starting a session', async () => {
  const worker = createBurnWildsTestPageWorker({fetch: () => new Response('old')}, config());
  const response = await worker.fetch(request(BURN_TEST_PAGE), {}, {}), html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-zplay-game-mode'), 'SIMULATION');
  assert.match(html, /id="burn-start-server-test"/);
  assert.match(html, /id="burn-wilds-root" hidden/);
  assert.match(html, /TEST ETB/);
  assert.match(html, /id="burn-test-history"/);
  assert.match(html, /Cash play is not enabled/);
  assert.doesNotMatch(html, /<iframe|<script[^>]*>[^<]+<\/script>|balanceMinor|sw_session/i);
  assert.match(response.headers.get('content-security-policy'), /connect-src 'self'/);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('existing presentation and API requests retain exact delegation and handler identity', async () => {
  const seen = [], originalResponse = new Response('retained', {headers: {'x-old': 'yes'}}), scheduled = () => 7;
  const previous = {fetch(req, env, ctx) { assert.equal(this, previous); seen.push([req, env, ctx]); return originalResponse; }, scheduled};
  const worker = createBurnWildsTestPageWorker(previous, config());
  for (const path of ['/native-ui/shell.css', '/api/slots/new-games90/burn-wilds/test/spin', '/']) {
    const req = request(path), env = {existing: true}, ctx = {};
    assert.equal(await worker.fetch(req, env, ctx), originalResponse);
    assert.deepEqual(seen.at(-1), [req, env, ctx]);
  }
  assert.equal(worker.scheduled, scheduled);
});

test('static map cannot publish server code, candidate RNG, tests or unlisted paths', async () => {
  const worker = createBurnWildsTestPageWorker({fetch: () => { throw Error('Must not delegate an owned unknown path'); }}, config());
  for (const path of ['server/lifecycle.mjs', 'candidate-math.mjs', 'runtime.test.mjs', 'current-reference.json', 'private.env', '%2e%2e%2fserver.mjs']) {
    const response = await worker.fetch(request(BURN_TEST_PAGE + path), {}, {});
    assert.equal(response.status, 404, path);
  }
  const leaked = config(); leaked.assets['candidate-math.mjs'] = 'secret sampler';
  assert.throws(() => createBurnWildsTestPageWorker({fetch() {}}, leaked), /CLIENT_ASSETS_INVALID/);
  assert.throws(() => assertClientImportClosure({'entry.mjs': "import './candidate-math.mjs';"}), /IMPORT_NOT_PACKAGED/);
  assert.throws(() => assertClientImportClosure({'entry.mjs': "import '../server/lifecycle.mjs';"}), /IMPORT_NOT_PACKAGED/);
  assert.throws(() => assertClientImportClosure({'entry.mjs': "import 'https:\/\/example.com/loader.mjs';"}), /IMPORT_NOT_PACKAGED/);
});

test('source asset requests are exact and read-only, including HEAD and unsupported methods', async () => {
  const worker = createBurnWildsTestPageWorker({fetch: () => new Response('old')}, config());
  for (const name of BURN_TEST_CLIENT_FILES) {
    const response = await worker.fetch(request(BURN_TEST_PAGE + name), {}, {});
    assert.equal(response.status, 200);
    assert.equal(await response.text(), config().assets[name]);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(await (await worker.fetch(request(BURN_TEST_PAGE + 'entry.mjs', {method: 'HEAD'}), {}, {})).text(), '');
  const denied = await worker.fetch(request(BURN_TEST_PAGE, {method: 'POST', body: '{}'}), {}, {});
  assert.equal(denied.status, 405); assert.equal(denied.headers.get('allow'), 'GET, HEAD');
});

test('three controlled layout widths and a safe canonical redirect use only allowlisted values', async () => {
  const worker = createBurnWildsTestPageWorker({fetch: () => new Response('old')}, config());
  for (const width of [360, 390, 430]) {
    const html = await (await worker.fetch(request(BURN_TEST_PAGE + '?viewport=' + width), {}, {})).text();
    assert.match(html, new RegExp('data-viewport="' + width + '"'));
  }
  assert.equal(burnTestViewport('?viewport=390%22%20onload%3Dalert(1)'), null);
  assert.equal(burnTestViewport('?viewport=0380'), null);
  const redirected = await worker.fetch(request(BURN_TEST_PAGE.slice(0, -1) + '?viewport=390'), {}, {});
  assert.equal(redirected.status, 308);
  assert.equal(redirected.headers.get('location'), BURN_TEST_PAGE + '?viewport=390');
});
