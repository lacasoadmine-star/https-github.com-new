import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { installDedicatedReleases, validateReleasePin } from '../deployment/handler.mjs';
import { createProductionHandler } from './fixtures/native72habesha3-routes.mjs';

globalThis.crypto ??= webcrypto;
const sha256 = data => createHash('sha256').update(data).digest('hex');
function createPin(release, gameId, accountPath) {
  const bytes = new TextEncoder().encode('export const alive = true;');
  const assetSha = sha256(bytes);
  const manifest = { release, ...(gameId ? { gameId, ...(accountPath ? { accountPath } : {}), htmlTemplate: '<html><body>{{GAME}}{{PRESENTATION_GAME}}</body></html>' } : {}),
    assets: { 'controller.mjs': { type: 'application/javascript; charset=utf-8', size: bytes.length, sha256: assetSha, kvKey: 'native72/' + release + '/' + assetSha } } };
  const inlineManifest = JSON.stringify(manifest), manifestSha256 = sha256(inlineManifest);
  return { release, ...(gameId ? { gameId, ...(accountPath ? { accountPath } : {}) } : {}),
    manifestKey: 'native72/manifests/' + manifestSha256, manifestSize: Buffer.byteLength(inlineManifest), manifestSha256, inlineManifest };
}
function makeWorker(games) {
  const seen = [];
  const previous = { fetch(req) { seen.push(new URL(req.url).pathname); return new Response('previous', { status: 202 }); } };
  const worker = installDedicatedReleases(previous, { shared: createPin('native72-shared-r1'), games,
    presencePath: '/player/presence.mjs', createProductionHandler });
  return { worker, seen, env: { PORTAL: 'player' } };
}
const request = (path, method = 'GET') => new Request('https://qa.invalid' + path, { method });
test('routes dedicated games through exact catalog account paths and retains legacy entry', async () => {
  const habesha = createPin('native72-habesha-r8', 'habesha_fortune_5_native');
  const safari = createPin('native72-safari-r3', 'fresh_safarisimba', '/new74/037-safari-simba/');
  const mh10 = createPin('native72-mh10-r3', 'fresh_multihot10', '/zplay74/multi-hot-10/');
  const { worker, env, seen } = makeWorker([habesha, safari, mh10]);
  for (const [route, release] of [['/games/habesha_fortune_5_native',habesha.release],
    ['/new74/037-safari-simba/',safari.release],['/zplay74/multi-hot-10',mh10.release]]) {
    const response = await worker.fetch(request(route), env, {});
    assert.equal(response.status, 200, route);
    assert.equal(response.headers.get('X-Zplay-Release'), release, route);
    assert.match(await response.text(), /presence.mjs/);
  }
  assert.equal((await worker.fetch(request('/new74/037-safari-simba/', 'HEAD'),env,{})).status,200);
  assert.equal((await worker.fetch(request('/new74/037-safari-simba-extra/'),env,{})).status,202);
  assert.equal((await worker.fetch(request('/games/multi_hot_5_native'),env,{})).status,202);
  assert.equal((await worker.fetch(request('/api/slots/spin','POST'),env,{})).status,202);
  assert.ok(seen.includes('/api/slots/spin'));
});
test('no duplicate route, release or model ownership can bypass isolation', () => {
  const a = createPin('game-a', 'a');
  const b = createPin('game-b', 'b', '/games/a');
  assert.throws(() => makeWorker([a,b]), /DUPLICATE_RELEASE/);
  assert.throws(() => makeWorker([a,a]), /DUPLICATE_RELEASE/);
  assert.throws(() => makeWorker([a,createPin('game-a','c')]), /DUPLICATE_RELEASE/);
  assert.throws(() => makeWorker([createPin('protected','multi_hot_5_native')]), /PROTECTED_GAME/);
  assert.throws(() => makeWorker([createPin('protected-foxy','foxy_hot_20_native')]), /PROTECTED_GAME/);
  assert.throws(() => makeWorker(Array.from({length:73}, (_,i)=>createPin('release'+i, 'game'+i))), /INVALID_INSTALLATION/);
});
test('optional trailing slash does not invalidate a verified catalog launch', async () => {
  const pin = createPin('route-canonical-r1', 'fresh_safarisimba', '/new74/037-safari-simba/');
  const withoutSlash = { ...pin, accountPath: '/new74/037-safari-simba' };
  assert.equal(validateReleasePin(withoutSlash, { game: true }).accountPath, '/new74/037-safari-simba');
  const f = makeWorker([withoutSlash]);
  const response = await f.worker.fetch(request('/new74/037-safari-simba/'), f.env, {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-zplay-release'), 'route-canonical-r1');
});
test('reject forged launch route metadata and disallowed page redirects', () => {
  const a = createPin('game-c','c','/new74/037-safari-simba/');
  assert.equal(validateReleasePin(a,{game:true}).accountPath,'/new74/037-safari-simba');
  const forged = {...a, accountPath:'/games/c'};
  assert.throws(() => validateReleasePin(forged,{game:true}),/INVALID_GAME_ROUTE_PIN/);
  for (const route of ['//evil.invalid/', '/api/slots/spin','/games/../admin', '/games/c?x=1',
    '/games/multi_hot_5_native','/games/foxy_hot_20_native','/evil/path']) {
    const pin = createPin('game-other','other',route);
    assert.throws(() => validateReleasePin(pin,{game:true}),/INVALID_GAME_ROUTE|PROTECTED_GAME_ROUTE/,route);
  }
});
