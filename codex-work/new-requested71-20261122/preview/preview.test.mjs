import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createVisualPreviewWorker, validateManifest, previewHTML, sha256, typeFor,
  PREVIEW_PATH, IMMUTABLE_PREFIX, REPOSITORY, MODULE_ROOT, REPOSITORY_ROOT,
  SHARED_PATH, SHARED_REPOSITORY_PATH, RUNTIME_FILES, immutableBase } from './preview-worker.mjs';
import { visualPreviewEntry, PREVIEW_DEPLOYMENT_MODULES } from './composition.mjs';
import { createAdditiveWorker } from '../integration/worker.mjs';
import new71Config from '../integration/worker-assets.mjs';
import { CATALOGUE_PATH, NEW_SECTION_PATH } from '../integration/catalogue.mjs';

const origin = 'https://preview.example';
const commit = '0123456789abcdef0123456789abcdef01234567';
const body = new TextEncoder().encode('reviewed preview source');
const digest = await sha256(body, webcrypto);
const config = {
  schema: 'zplay/m10-visual-preview/v1', repository: REPOSITORY,
  sourceCommit: commit, revision: 'a'.repeat(24),
  entry: MODULE_ROOT + 'main.mjs', visualPreviewOnly: true, financialOperations: false,
  entries: [...RUNTIME_FILES.map(name => ({ path: MODULE_ROOT + name,
    repositoryPath: REPOSITORY_ROOT + name, contentType: typeFor(name),
    bytes: body.length, sha256: digest })),
  { path: SHARED_PATH, repositoryPath: SHARED_REPOSITORY_PATH,
    contentType: typeFor(SHARED_PATH), bytes: body.length, sha256: digest }],
};
const mainPath = immutableBase(config) + MODULE_ROOT + 'main.mjs';
function request(path = PREVIEW_PATH, options) { return new Request(origin + path, options); }
function setup(options = {}) {
  const calls = [];
  const previousResponse = new Response('existing result', { status: 201, headers: { 'X-Legacy': 'unchanged', 'Set-Cookie': 'existing=untouched' } });
  const previous = { scheduled: () => 'unchanged', marker: { existing: true },
    async fetch(...args) { calls.push(args); return previousResponse; } };
  const fetches = [];
  const fetchImpl = async (url, init) => {
    fetches.push({ url, init });
    return new Response(body, { headers: { 'content-type': 'text/plain', 'set-cookie': 'remote=discarded', 'x-private': 'discarded' } });
  };
  const worker = createVisualPreviewWorker(previous, structuredClone(config), { cryptoImpl: webcrypto, fetchImpl, cache: null, ...options });
  return { worker, previous, previousResponse, calls, fetches };
}

test('manifest accepts exactly the reviewed runtime graph and rejects other game paths', () => {
  assert.equal(validateManifest(config), config);
  for (const mutate of [
    c => { c.repository = 'attacker/repo'; },
    c => { c.entry = '/new-games72/games/other/main.mjs'; },
    c => { c.visualPreviewOnly = false; },
    c => { c.financialOperations = true; },
    c => { c.sourceCommit = 'main'; },
    c => { c.entries[0].path = '/games/legacy/main.mjs'; },
    c => { c.entries[0].repositoryPath = 'secrets.txt'; },
    c => { c.entries[0].contentType = 'text/html'; },
    c => { c.entries[0].bytes = 5 * 1024 * 1024; },
    c => { c.entries[1] = c.entries[0]; },
    c => { c.entries.pop(); },
  ]) {
    const changed = structuredClone(config); mutate(changed);
    assert.throws(() => validateManifest(changed));
  }
});

test('HTML clearly labels visual preview, manually mounts previewOnly, and includes no outcomes', async () => {
  const { worker, fetches } = setup();
  const result = await worker.fetch(request()); const html = await result.text();
  assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.match(html, /Visual preview — bets disabled/);
  assert.match(html, /__M10_MANUAL_MOUNT__ = true/);
  assert.match(html, /mountMultiHot10\(\{ root, previewOnly: true \}\)/);
  assert.doesNotMatch(html, /SUPERWIN_M10_HOST|isolatedPresentation:|observed-seven-rounds|fixture|Math\.random|\/api\//);
  assert.match(html, /"\/new-games72\/games\/multi-hot-10\/":"\/_zplay\/m10-preview\//);
  assert.equal(fetches.length, 0);
});

test('CSP permits only immutable preview resources and denies finance/frame/form routes', async () => {
  const { worker } = setup(); const result = await worker.fetch(request());
  const policy = result.headers.get('content-security-policy');
  assert.ok(policy.includes(`connect-src ${origin}${immutableBase(config)}/`));
  assert.doesNotMatch(policy, /connect-src 'self'|\*|unsafe-eval/);
  assert.ok(policy.includes("form-action 'none'")); assert.ok(policy.includes("frame-ancestors 'none'"));
  assert.equal(result.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(result.headers.get('set-cookie'), null);
});

test('only GET/HEAD work inside the dedicated preview and immutable assets', async () => {
  const { worker, fetches, calls } = setup();
  for (const path of [PREVIEW_PATH, PREVIEW_PATH.slice(0, -1), mainPath]) {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      const result = await worker.fetch(request(path, { method }));
      assert.equal(result.status, 405); assert.equal(result.headers.get('allow'), 'GET, HEAD');
    }
  }
  assert.equal(fetches.length, 0); assert.equal(calls.length, 0);
  const head = await worker.fetch(request(PREVIEW_PATH, { method: 'HEAD' }));
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
});

test('canonical page redirects while unversioned game and shared routes remain untouched', async () => {
  const { worker, fetches, calls, previousResponse } = setup();
  const page = await worker.fetch(request(PREVIEW_PATH.slice(0, -1)));
  assert.equal(page.status, 308); assert.equal(page.headers.get('location'), PREVIEW_PATH);
  for (const path of [MODULE_ROOT + 'main.mjs', MODULE_ROOT + 'style.css', SHARED_PATH,
      MODULE_ROOT + 'main.mjs?token=private']) {
    const incoming = request(path);
    const response = await worker.fetch(incoming);
    assert.equal(response, previousResponse);
    assert.equal(calls.at(-1)[0], incoming);
  }
  const secret = await worker.fetch(request(mainPath + '?token=private'));
  assert.equal(secret.status, 404); assert.doesNotMatch(await secret.text(), /private/);
  assert.equal(fetches.length, 0);
});

test('pinned source fetch receives no user cookies, authorization, origin or query', async () => {
  const { worker, fetches } = setup();
  const incoming = request(mainPath, { headers: { Cookie: 'session=private', Authorization: 'Bearer private', 'X-API-Key': 'private', Referer: 'https://private.example/' } });
  const result = await worker.fetch(incoming);
  assert.equal(result.status, 200); assert.equal(await result.text(), 'reviewed preview source');
  assert.equal(fetches.length, 1);
  assert.equal(fetches[0].url, `https://raw.githubusercontent.com/${REPOSITORY}/${commit}/${REPOSITORY_ROOT}main.mjs`);
  assert.deepEqual(fetches[0].init.headers, { Accept: '*/*' });
  assert.equal(fetches[0].init.credentials, 'omit'); assert.equal(fetches[0].init.redirect, 'manual');
  assert.equal(fetches[0].init.method, 'GET');
  assert.equal(result.headers.get('set-cookie'), null); assert.equal(result.headers.get('x-private'), null);
  assert.equal(result.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.equal(result.headers.get('etag'), `"sha256-${digest}"`);
  assert.equal(result.headers.get('cache-control'), 'public, max-age=31536000, immutable');
});

test('asset HEAD verifies source bytes and hashes while returning no response body', async () => {
  const { worker, fetches } = setup();
  const result = await worker.fetch(request(mainPath, { method: 'HEAD' }));
  assert.equal(result.status, 200); assert.equal(await result.text(), '');
  assert.equal(result.headers.get('content-length'), String(body.length)); assert.equal(fetches.length, 1);
});

test('Workers-compatible manual redirects are rejected without a second origin request', async () => {
  for (const status of [301, 302, 303, 307, 308]) {
    const fetches = [];
    const { worker } = setup({ fetchImpl: async (url, init) => {
      fetches.push({url, init});
      assert.equal(init.redirect, 'manual');
      return new Response(null, {status, headers: {location: 'https://redirect.invalid/private'}});
    } });
    const response = await worker.fetch(request(mainPath));
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(fetches.length, 1);
    assert.ok(fetches[0].url.startsWith('https://raw.githubusercontent.com/' + REPOSITORY + '/' + commit + '/'));
    assert.doesNotMatch(await response.text(), /redirect.invalid|private/);
  }
});

test('wrong hash, MIME, short/long body, declared oversize and source errors fail closed', async () => {
  const variants = [
    () => new Response('x'.repeat(body.length), { headers: { 'content-type': 'text/plain' } }),
    () => new Response(body, { headers: { 'content-type': 'text/html' } }),
    () => new Response(body.slice(1), { headers: { 'content-type': 'text/plain' } }),
    () => new Response(new Uint8Array(body.length + 1), { headers: { 'content-type': 'text/plain' } }),
    () => new Response(body, { headers: { 'content-type': 'text/plain', 'content-length': '9999999' } }),
    () => new Response(body, { status: 404, headers: { 'content-type': 'text/plain' } }),
    () => new Response(body, { status: 302, headers: { location: 'https://attacker.invalid/', 'content-type': 'text/plain' } }),
    () => { throw Error('network error containing private diagnostics'); },
  ];
  for (const fetchImpl of variants) {
    const { worker, calls } = setup({ fetchImpl }); const result = await worker.fetch(request(mainPath));
    assert.equal(result.status, 502); assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(await result.text(), /private|attacker/); assert.equal(calls.length, 0);
  }
});

test('unknown, encoded, wrong-commit and financial paths inside immutable prefix never reach origin', async () => {
  const { worker, fetches, calls } = setup();
  for (const path of [IMMUTABLE_PREFIX + 'bad/main.mjs', immutableBase(config) + '/api/slots/spin',
    immutableBase(config) + MODULE_ROOT + 'fixtures/observed-seven-rounds.json',
    immutableBase(config) + '/%2f%2fprivate', mainPath + '?url=https://attacker.invalid/']) {
    assert.equal((await worker.fetch(request(path))).status, 404);
  }
  assert.equal(fetches.length, 0); assert.equal(calls.length, 0);
});

test('bad or unpublished manifest affects only the new preview scope', async () => {
  for (const bad of [null, { ...config, sourceCommit: null }, { ...config, sourceCommit: 'main' }]) {
    let priorCalls = 0;
    const worker = createVisualPreviewWorker({ fetch: () => { priorCalls++; return new Response('old'); } }, bad);
    assert.equal((await worker.fetch(request())).status, 503);
    assert.equal((await worker.fetch(request(mainPath))).status, 503);
    assert.equal(await (await worker.fetch(request(SHARED_PATH))).text(), 'old');
    assert.equal(await (await worker.fetch(request('/player'))).text(), 'old'); assert.equal(priorCalls, 2);
  }
});

test('manifest commit and entry pins cannot be changed after construction', async () => {
  const mutable = structuredClone(config); const seen = [];
  const worker = createVisualPreviewWorker({ fetch: () => new Response('old') }, mutable, { cache: null, cryptoImpl: webcrypto,
    fetchImpl: async url => { seen.push(url); return new Response(body, { headers: { 'content-type': 'text/plain' } }); } });
  mutable.sourceCommit = 'main'; mutable.entries[0].sha256 = '0'.repeat(64);
  assert.equal((await worker.fetch(request(mainPath))).status, 200); assert.ok(seen[0].includes('/' + commit + '/'));
});

test('existing routes, auth/payment methods, response identity and exports are preserved', async () => {
  const { worker, previous, previousResponse, calls, fetches } = setup();
  assert.equal(worker.scheduled, previous.scheduled); assert.equal(worker.marker, previous.marker);
  const env = { existing: true }, ctx = { existing: true };
  for (const [path, method] of [['/', 'GET'], ['/player', 'GET'], ['/api/slots/spin', 'POST'],
    ['/api/telebirr/callback', 'POST'], ['/admin', 'HEAD'], ['/games/old/assets/a.png', 'GET'],
    ['/new-games72/games/roll-x/main.mjs', 'GET'], [MODULE_ROOT + 'main.mjs', 'GET'],
    [SHARED_PATH, 'GET'], [SHARED_PATH, 'POST'], [MODULE_ROOT + 'unrelated.txt', 'GET']]) {
    const incoming = request(path, { method });
    assert.equal(await worker.fetch(incoming, env, ctx), previousResponse);
    const call = calls.at(-1); assert.equal(call[0], incoming); assert.equal(call[1], env); assert.equal(call[2], ctx);
  }
  assert.equal(fetches.length, 0); assert.equal(previousResponse.headers.get('set-cookie'), 'existing=untouched');
});

test('verified cache is reused; corrupted cache is discarded and never served', async () => {
  let stored = null, writes = 0;
  const cache = { match: async () => stored?.clone(), put: async (_key, response) => { writes++; stored = response; } };
  const { worker, fetches } = setup({ cache });
  assert.equal((await worker.fetch(request(mainPath))).status, 200);
  assert.equal((await worker.fetch(request(mainPath))).status, 200);
  assert.equal(fetches.length, 1); assert.equal(writes, 1);
  stored = new Response('x'.repeat(body.length), { headers: stored.headers });
  assert.equal(await (await worker.fetch(request(mainPath))).text(), 'reviewed preview source');
  assert.equal(fetches.length, 2); assert.equal(writes, 2);
});

test('composition preserves exact active import and Durable Object re-exports', () => {
  const source = visualPreviewEntry('entry/active.mjs');
  assert.ok(source.includes('import previous from "../entry/active.mjs";'));
  assert.ok(source.includes('export {LocalDemoWallet,NativeGameResources} from "../entry/active.mjs";'));
  assert.match(source, /createVisualPreviewWorker\(createAdditiveWorker\(previous,config\),previewManifest\)/);
  assert.deepEqual(PREVIEW_DEPLOYMENT_MODULES, ['newrequested71r1/preview-worker.mjs', 'newrequested71r1/preview-manifest.mjs']);
  assert.throws(() => visualPreviewEntry('../secrets.mjs'));
});

test('actual NEW71 worker composition preserves its catalogue and all prior requests', async () => {
  const calls = [];
  const previous = { marker: 'existing-worker', async fetch(...args) {
    calls.push(args); return new Response('unchanged existing body', { headers: { 'X-Prior': 'kept' } });
  } };
  const additive = createAdditiveWorker(previous, new71Config, undefined);
  const wrapped = createVisualPreviewWorker(additive, config, { cryptoImpl: webcrypto, cache: null });
  for (const path of [CATALOGUE_PATH, NEW_SECTION_PATH]) {
    const response = await wrapped.fetch(request(path));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-zplay-new71'), new71Config.catalogue.releaseId);
  }
  assert.equal(calls.length, 0); assert.equal(wrapped.marker, previous.marker);
  const env = { preserve: true }, ctx = { preserve: true };
  const existing = request('/api/telebirr/callback', { method: 'POST', body: 'unchanged-body' });
  const response = await wrapped.fetch(existing, env, ctx);
  assert.equal(await response.text(), 'unchanged existing body');
  assert.equal(response.headers.get('x-prior'), 'kept');
  assert.deepEqual(calls, [[existing, env, ctx]]);
  assert.equal((await wrapped.fetch(request(PREVIEW_PATH))).headers.get('x-zplay-preview'), 'multi-hot-10-visual-only');
});

test('generated local manifest contains no fixtures, screenshots, other games or secret-bearing URLs', async () => {
  const text = await readFile(new URL('./preview-manifest.mjs', import.meta.url), 'utf8');
  const manifest = JSON.parse(text.slice('export default '.length).trim().replace(/;$/, ''));
  validateManifest(manifest, { allowUnpinned: true });
  assert.equal(manifest.entries.length, 41);
  assert.doesNotMatch(text, /fixtures\/|evidence\/|\.jpg|roll-x|Token=|Authorization|Cookie/);
  assert.equal(manifest.entries.filter(entry => entry.path === SHARED_PATH).length, 1);
});
