// Covers the EXACT current Multi Hot 40 renderer, patched from the live route.
// No Player credentials, network access or wallet API required.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {join} from 'node:path';
import {installDedicatedReleases} from '../dedicated-resume/deployment/handler.mjs';
import {createProductionHandler} from '../dedicated-resume/tests/fixtures/native72habesha3-routes.mjs';
import {
  MultiHot40Motion,multiHot40Layout,MULTIHOT40_INITIAL_GRID,
  isMultiHot40Grid,winTier
} from './multihot40-motion.mjs';

const sampleResult={
  grid:[[0,1,2,3],[1,2,3,4],[2,3,4,5],[3,4,5,6],[4,5,6,7]],
  multiplier:3,lines:[],roundId:'qa-visual-only',
  winMinor:'0',betMinor:'100'
};
test('official 5x4 grid is kept distinct from every 3x3 / other title engine',()=>{
  assert.ok(isMultiHot40Grid(MULTIHOT40_INITIAL_GRID));
  assert.ok(isMultiHot40Grid(sampleResult.grid));
  assert.equal(isMultiHot40Grid(Array.from({length:4},()=>[0,1,2,3,4])),false);
  assert.equal(isMultiHot40Grid([[1,1,1],[1,1,1],[1,1,1]]),false);
});
test('phone portrait layout places the bet and touch targets below the board',()=>{
  const h=multiHot40Layout(390,844);
  assert.equal(h.portrait,true);
  assert.ok(h.controls.spin.width>100);
  assert.ok(h.board.width>360);
  assert.ok(h.controls.bet.y>h.board.y+h.board.height);
  assert.ok(h.controls.menu.width>=44 && h.controls.menu.height>=44);
  assert.ok(h.controls.sound.width>=44 && h.controls.sound.height>=44);
  assert.ok(h.controls.menu.x>=0 && h.controls.sound.x+h.controls.sound.width<=h.width+0.5);
});
test('a backend result does not immediately complete reels before the stop sequence',()=>{
  const m=new MultiHot40Motion({clock:()=>0});
  m.begin({},0);
  assert.equal(m.phase,'spinning');
  m.accept(sampleResult,70);
  assert.equal(m.phase,'settling');
  const before=m.sample(300);
  assert.equal(before.phase,'settling');
  assert.ok(before.columns.every(c=>c.stopped===false));
  const final=m.sample(4000);
  assert.equal(final.phase,'idle');
  assert.deepEqual(final.grid,sampleResult.grid);
  assert.equal(final.multiplier,3);
  assert.equal(m.busy,false);
});
test('rejected response cancels the animation without showing a fake receipt or win',()=>{
  const m=new MultiHot40Motion({clock:()=>0});
  m.begin({},0);m.sample(190);
  m.cancel('server-rejected');
  assert.equal(m.busy,false);
  assert.equal(m.phase,'idle');
  assert.equal(m.receipt,null);
  assert.equal(m.sample(250).phase,'idle');
  assert.deepEqual(m.grid,MULTIHOT40_INITIAL_GRID.map(c=>c.map(Number)));
});
test('win presentation timing does not change the backend receipt amount',()=>{
  assert.equal(winTier('0','100'),null);
  assert.equal(winTier('1500','100').name,'Nice Win');
  assert.equal(winTier('2500','100').name,'Big Win');
  assert.equal(winTier('3500','100').name,'Super Win');
  assert.equal(winTier('4500','100').name,'Fantastic Win');
});
test('presentation has no overlapping screenshot layer or hidden payout computation, and mutes on blur',async()=>{
 const s=await readFile(new URL('./multihot40-presentation.mjs',import.meta.url),'utf8');
 assert.match(s,/addEventListener\('blur', this.blurHandler\)/);
 assert.match(s,/addEventListener\('focus', this.focusHandler\)/);
 assert.match(s,/this\.audioHidden\(\)/);
 assert.match(s,/const landing = motion\.target !== null/);
 assert.match(s,/this\.motion\.previousGrid/);
 assert.doesNotMatch(s,/\bMath\.random\s*\(/);
 assert.doesNotMatch(s,/\b(?:fetch|XMLHttpRequest)\s*\([^)]*\/api\/slots\/spin/);
 assert.doesNotMatch(s,/document\.createElement\(['"]img['"]\)/);
});

test('actual live app fails closed after Player logout while retaining STOP on rolling reels',async()=>{
 const app=await readFile(new URL('./multihot40-app.mjs',import.meta.url),'utf8');
 assert.match(app,/nodes\.spin\.disabled=!entered\|\|!ready\|\|\(!visualBusy&&/);
 assert.match(app,/!state\.authenticated\|\|!state\.connected\|\|automatic\.active/);
 assert.ok(app.includes("visualBusy?'Stop animation':requiresSignIn?'Sign in to play':!state.connected?'Game connection unavailable'"));
 assert.match(app,/nodes\.signIn\.hidden=!requiresSignIn/);
 assert.match(app,/if\(!state\?\.authenticated\|\|!state\.connected\)return false/);
 assert.match(app,/if\(visualBusy\)\{presenter\.speedUp\(\);return false;\}/);
 assert.match(app,/supportsWagerProfile\(state\?\.game,ID\)/);
 assert.doesNotMatch(app,/nodes\.spin\.disabled=.*!state\.authenticated&&!available/);
});

test('mobile hitbox regression: Menu, Sound and TURBO reach 44px and avoid SPIN/BET',async()=>{
 const app=await readFile(new URL('./multihot40-app.mjs',import.meta.url),'utf8');
 assert.match(app,/window\.innerWidth<=600/);
 assert.match(app,/\['menu','sound','turbo'\]\.includes\(name\)/);
 assert.match(app,/const minTouch=44/);
 assert.ok(app.includes('spin.x+spin.width+5'));
 assert.ok(app.includes('bet.y-height-6'));
 assert.ok(app.includes('Math.max(0,rect.width-width)'));
 assert.ok(app.includes('Math.max(0,rect.height-height)'));
});

test('a thrown wager request releases SPIN without retrying the wager', async () => {
  const app = await readFile(new URL('./multihot40-app.mjs', import.meta.url), 'utf8');
  const start = app.slice(app.indexOf('async function doStart('), app.indexOf('async function collectWin('));
  const phases = [], attempts = [], stopReasons = [];
  const context = {
    document: {visibilityState:'visible'}, ready:true, entered:true, disposed:false,
    operation:'', visualBusy:false, visualRound:'', selectedStake:'1.00',
    state:{authenticated:true, connected:true, sessionId:'qa-session', game:{version:'qa-model'}, balance:'10.00'},
    session:{canAct:()=>false, start:async () => {attempts.push('start'); throw Error('transport');},
      refresh:async () => {attempts.push('refresh');}},
    auto:{snapshot:()=>({active:false}), stop:reason=>stopReasons.push(reason), observe:()=>{}},
    presenter:{setState:({phase})=>phases.push(phase)}, presenterState:()=>({}),
    canStart:()=>true, moneyMinor:value=>BigInt(value.replace('.', '')), hostState:()=>({}),
    closeDialogs:()=>{}, syncControls:()=>{}, queueAutomatic:()=>{},
  };
  assert.equal(await runInNewContext(`${start}\ndoStart()`, context), false);
  assert.equal(context.operation, '');
  assert.equal(context.visualBusy, false);
  assert.deepEqual(attempts, ['start', 'refresh']);
  assert.deepEqual(phases, ['spinning', 'error']);
  assert.deepEqual(stopReasons, ['unconfirmed-round']);
});

const stage = process.env.MULTIHOT40_QA_STAGE;
test('staged Worker serves the dedicated page and assets and leaves wallet routes to the existing handler', {skip: !stage}, async () => {
  const {releasePins} = await import(join(stage, 'worker', 'release-pins.mjs'));
  const game = releasePins.games.find(pin => pin.gameId === 'multihot40_native');
  const {assets} = JSON.parse(game.inlineManifest);
  const keys = new Map(Object.entries(assets).map(([name, asset]) => [asset.kvKey, name]));
  const worker = installDedicatedReleases({fetch: request => new Response(new URL(request.url).pathname, {status: 202})},
    {...releasePins, createProductionHandler});
  const env = {PORTAL: 'player', SSG_OFFICIAL_REFERENCES: {get: key => readFile(join(stage, 'multihot40', keys.get(key)))}};
  const request = (path, method = 'GET') => worker.fetch(new Request('https://qa.invalid' + path, {method}), env, {});
  const page = await request(game.accountPath);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('X-Zplay-Release'), game.release);
  const html = await page.text();
  assert.match(html, /type="submit">START PLAY<\/button>/);
  assert.ok(html.includes(`/${game.release}/multihot40-app.mjs`));
  assert.equal(html.match(/presence\.[a-z0-9]+\.mjs/g).length, 1);
  for (const [filename, asset] of Object.entries(assets)) {
    const response = await request(`/${game.release}/${filename}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('ETag'), `"${asset.sha256}"`);
    const source = await response.text();
    for (const [, relative] of source.matchAll(/from '\.\/([^']+)'/g)) assert.ok(assets[relative], relative);
  }
  for (const [path, method] of [['/api/expansion/state', 'GET'], ['/api/expansion/action', 'POST'],
    ['/games/multi_hot_5_native', 'GET'], ['/games/foxy_hot_20_native', 'GET']]) {
    const response = await request(path, method);
    assert.equal(response.status, 202);
    assert.equal(await response.text(), path);
  }
});
