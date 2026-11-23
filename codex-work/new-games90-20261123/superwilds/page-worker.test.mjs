import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuperWildsPageWorker, GAME_ROUTE, GAME_ID } from './page-worker.mjs';
import {createHash} from 'node:crypto';
const origin = 'https://same-player.invalid', revision = 'abc123'.repeat(4);
function mounted() {
  const received = [], old = new Response('old wallet or game response', { status: 202 }), previous = {
    retainedExport: {}, async fetch(...args) { received.push(args); return old; },
  };
  const config = { gameId: GAME_ID, route: GAME_ROUTE, assetRevision: revision, clientSource: 'export const game=1;', stylesheetSource: 'body{margin:0}' };
  return { worker: createSuperWildsPageWorker(previous, config), old, received, previous };
}
test('dashboard Play URL serves the real same-site entry with isolated game CSP and immutable assets', async () => {
  const h = mounted(), page = await h.worker.fetch(new Request(origin + GAME_ROUTE));
  assert.equal(page.status, 200); assert.equal(page.headers.get('cache-control'), 'no-store');
  const html = await page.text(); assert.match(html, /id="zplay-superwilds"/); assert.match(html, /game\.mjs/);
  assert.ok(!html.includes('iframe') && !html.includes('video'));
  assert.match(page.headers.get('content-security-policy'), /connect-src 'self'/);
  const script = await h.worker.fetch(new Request(origin + '/_zplay/superwilds/' + revision + '/game.mjs'));
  assert.equal(await script.text(), 'export const game=1;'); assert.match(script.headers.get('cache-control'), /immutable/);
  assert.equal(h.received.length, 0);
});
test('all existing dashboard/account/game/API requests keep their original objects, body and exports', async () => {
  const h = mounted(), env = {}, ctx = {};
  for (const path of ['/', '/login', '/api/slots/new-games90/superwilds/gamble', '/api/slots/spin', '/old-game/']) {
    const request = new Request(origin + path, { method: 'POST', body: 'original private body' });
    assert.equal(await h.worker.fetch(request, env, ctx), h.old); assert.equal(await request.text(), 'original private body');
    assert.deepEqual(h.received.at(-1), [request, env, ctx]);
  }
  assert.equal(h.worker.retainedExport, h.previous.retainedExport);
});
test('page HEAD is bodyless and writes to game assets cannot create a wager or fall through', async () => {
  const h = mounted();
  assert.equal(await (await h.worker.fetch(new Request(origin + GAME_ROUTE, { method: 'HEAD' }))).text(), '');
  assert.equal((await h.worker.fetch(new Request(origin + GAME_ROUTE, { method: 'POST' }))).status, 405);
  assert.equal(h.received.length, 0);
});
test('existing KV supplies pinned game assets and never substitutes missing or changed bytes',async()=>{
  const bodies=new Map([['mjs','export const mounted=true;'],['css','body{margin:0}']]);
  const assetPins=[...bodies].map(([ext,value])=>({key:`new90/superwilds/${revision}/game.${ext}`,
    bytes:Buffer.byteLength(value),sha256:createHash('sha256').update(value).digest('hex')}));
  const worker=createSuperWildsPageWorker({fetch:()=>new Response('old')},{gameId:GAME_ID,route:GAME_ROUTE,assetRevision:revision,assetPins});
  let value=bodies.get('mjs');
  const env={SSG_OFFICIAL_REFERENCES:{get:async()=>value===null?null:new TextEncoder().encode(value).buffer}};
  const request=new Request(origin+'/_zplay/superwilds/'+revision+'/game.mjs');
  assert.equal(await(await worker.fetch(request,env)).text(),value);
  value='export const mounted=false;';
  assert.equal((await worker.fetch(request,env)).status,503);
  value=null;const missing=await worker.fetch(request,env);
  assert.equal(missing.status,503);assert.equal(missing.headers.get('cache-control'),'no-store');
});
