import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { deal } from './round.mjs';
import { installOriginalGames } from './worker.mjs';
import prism from './games/prism-deluxe.mjs';
import savanna from './games/savanna-signals.mjs';
import tidal from './games/tidal-relay.mjs';
import canopy from './games/canopy-lanterns.mjs';
import aurora from './games/aurora-locks.mjs';
import copper from './games/copper-crossroads.mjs';

import { games } from './games/catalog.mjs';
const names = ['index.html', 'lobby.css', 'app.mjs', 'round.mjs', 'cash.mjs', 'style.css', 'games/catalog.mjs', ...games.map(game => 'games/' + game.slug + '.mjs')];
const assets = Object.fromEntries(await Promise.all(names.map(async name => [
  name, await readFile(new URL(name, import.meta.url), 'utf8'),
])));

test('distinct title rules award their own scores and bonuses', () => {
  const prismRound = deal(prism, 2, () => 0);
  const safariRound = deal(savanna, 2, () => 0);
  assert.equal(prismRound.score, 160);
  assert.equal(safariRound.score, 104);
  assert.equal(prismRound.bonus, 20);
  assert.equal(safariRound.bonus, 12);
  for (const game of games) {
    for (let index = 0; index < 80; index++) {
      const round = deal(game, 1);
      assert.ok(round.grid.length === game.columns && round.grid.every(reel => reel.length === game.rows));
      assert.ok(game.multipliers.includes(round.multiplier));
      assert.ok(Number.isSafeInteger(round.score) && round.score >= 0);
    }
  }
});

function play(game, grid, multiplier, level) {
  const draws = [...grid.flat(), game.multipliers.indexOf(multiplier)];
  const result = deal(game, level, () => draws.shift());
  assert.equal(draws.length, 0);
  return result;
}

test('Tidal Relay and Canopy Lanterns settle known wins, bonuses and misses exactly', () => {
  assert.equal(play(tidal, [[0,4,1],[2,3,0],[1,2,3],[3,4,5]], 2, 2).score, 28);
  assert.equal(play(tidal, [[0,1,2],[0,2,3],[0,3,4],[0,4,5]], 3, 1).score, 48);
  assert.equal(play(tidal, [[0,1,2],[1,2,3],[2,3,4],[3,4,5]], 1, 1).score, 0);
  assert.equal(play(canopy, [[0,1,2,0],[1,2,3,4],[2,3,4,5],[3,4,5,1],[0,5,1,0]], 4, 2).score, 56);
  assert.equal(play(canopy, [[1,0,2,3],[1,2,3,4],[1,3,4,5],[1,4,5,0],[1,5,0,2]], 2, 1).score, 20);
  assert.equal(play(canopy, [[1,1,2,3],[2,2,3,4],[3,3,4,5],[4,4,5,0],[5,5,0,1]], 1, 1).score, 0);
});

test('Aurora Locks and Copper Crossroads settle distinct bonuses and outcomes', () => {
  assert.equal(play(aurora, [[0,0,0,0],[1,2,3,4],[2,3,4,5],[3,4,5,1]], 1, 2).score, 50);
  assert.equal(play(aurora, [[1,2,3,4],[1,3,4,5],[1,4,5,2],[1,5,2,3]], 5, 1).score, 25);
  assert.equal(play(aurora, [[1,2,3,4],[2,3,4,5],[3,4,5,1],[5,5,1,2]], 2, 1).score, 0);
  assert.equal(play(copper, [[1,2,3],[1,1,4],[1,5,1]], 2, 1).score, 51);
  assert.equal(play(copper, [[4,1,2],[4,2,3],[4,3,5]], 3, 1).score, 39);
  assert.equal(play(copper, [[0,0,0],[1,1,1],[2,2,2]], 1, 1).score, 0);
});

class Rewriter {
  handlers = new Map();
  on(tag, handler) { this.handlers.set(tag, handler); return this; }
  transform(response) {
    const handlers = this.handlers;
    return new Response(new ReadableStream({
      async start(controller) {
        let html = await response.text();
        for (const [tag, handler] of handlers) {
          handler.element({ append: value => { html = html.replace('</' + tag + '>', value + '</' + tag + '>'); } });
        }
        controller.enqueue(new TextEncoder().encode(html));
        controller.close();
      },
    }), { headers: response.headers });
  }
}

const previous = {
  marker: 'retained',
  fetch(request) {
    return new Response(
      new URL(request.url).pathname === '/' ? '<html><head></head><body>existing lobby</body></html>'
        : this.marker + new URL(request.url).pathname,
      { headers: { 'Content-Type': 'text/html' } },
    );
  },
  scheduled() { return this.marker; },
};
const worker = installOriginalGames(previous, { assets, games, Rewriter });
const request = (pathname, method, portal = 'player') => worker.fetch(
  new Request('https://qa.invalid' + pathname, { method }), { PORTAL: portal, ZPLAY_ORIGINALS_QA: 'true' },
);

test('same Player Worker adds the Play Now routes and leaves account paths and scheduled work with the former handler', async () => {
  const lobby = await (await request('/', 'GET')).text();
  assert.match(lobby, /existing lobby/);
  for (const game of games) {
    const path = '/zplay-originals/' + game.slug + '/';
    assert.ok(lobby.includes('href="' + path + '"'));
    const page = await request(path, 'GET');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Score points have no cash value/);
    assert.equal(await (await request(path, 'HEAD')).text(), '');
  }
  for (const path of ['/games/multi_hot_5_native', '/games/foxy_hot_20_native', '/games/habesha_fortune_5_native', '/api/slots/spin']) {
    assert.equal(await (await request(path, 'GET')).text(), 'retained' + path);
  }
  assert.equal(await (await request('/api/slots/spin', 'POST')).text(), 'retained/api/slots/spin');
  assert.equal(await (await request('/zplay-originals/prism-deluxe/', 'GET', 'agent')).text(), 'retained/zplay-originals/prism-deluxe/');
  assert.equal(worker.scheduled(), 'retained');
});

test('production Player never exposes the local score games', async () => {
  const lobby = await worker.fetch(new Request('https://qa.invalid/'), { PORTAL: 'player' });
  assert.doesNotMatch(await lobby.text(), /zplay-original-games/);
  const path = '/zplay-originals/prism-deluxe/';
  const game = await worker.fetch(new Request('https://qa.invalid' + path), { PORTAL: 'player' });
  assert.equal(await game.text(), 'retained' + path);
});

test('the paid release shows only the titles selected for activation', async () => {
  const env = { PORTAL: 'player', ZPLAY_NEW_ORIGINALS_PAID_IDS: 'prism_deluxe,savanna_signals,tidal_relay,canopy_lanterns' };
  const get = path => worker.fetch(new Request('https://qa.invalid' + path), env);
  const lobby = await (await get('/')).text();
  assert.match(lobby, /Play Now · Prism Deluxe/);
  assert.match(lobby, /Play Now · Savanna Signals/);
  assert.doesNotMatch(lobby, /Ember Arcade|Signal Ten|Neon Circuit|Orbit Hundred/);
  assert.doesNotMatch(lobby, /Tidal Relay|Canopy Lanterns/);
  const reply = await get('/zplay-originals/prism-deluxe/');
  assert.match(reply.headers.get('Content-Security-Policy'), /connect-src 'self'/);
  const preview = await request('/zplay-originals/tidal-relay/', 'GET');
  assert.match(preview.headers.get('Content-Security-Policy'), /connect-src 'none'/);
  const page = await reply.text();
  assert.match(page, /data-mode="paid"/);
  assert.doesNotMatch(page, /Score points have no cash value/);
});

test('the ordered queue covers the 71 unprotected catalog titles once', async () => {
  const catalog = JSON.parse(await readFile(new URL('../dedicated-resume/deployment/verified-target-catalog.json', import.meta.url)));
  const candidates = catalog.games.filter(game => game.catalogId !== 'ind74_official_habeshafortune5');
  assert.equal(candidates.length, 71);
  assert.equal(new Set(candidates.map(game => game.catalogId)).size, 71);
});

class Element {
  children = [];
  dataset = {};
  callbacks = {};
  classes = new Set();
  classList = {
    add: name => this.classes.add(name),
    remove: name => this.classes.delete(name),
    contains: name => this.classes.has(name),
  };
  append(...children) { this.children.push(...children); }
  add(option) { this.append(option); this.value ??= option.value; }
  setAttribute() {}
  addEventListener(event, callback) { this.callbacks[event] = callback; }
  replaceChildren(...children) { this.children = children; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  click() { assert.ok(!this.disabled); this.callbacks.click(); }
}

test('real controls complete repeated rounds exactly once and AUTO waits for START PLAY', () => {
  const code = assets['app.mjs'].replace(/^import .+;\n/gm, '');
  for (const game of games) {
    const ids = new Map(), timers = new Map();
    let sequence = 0;
    const get = id => {
      if (!ids.has(id)) ids.set(id, new Element());
      return ids.get(id);
    };
    const document = new Element(), window = new Element();
    Object.assign(document, { body: { dataset: { game: game.slug } }, hasFocus: () => true,
      getElementById: get, createElement: () => new Element() });
    runInNewContext(code, { deal, games, document, window,
      setTimeout(callback) { timers.set(++sequence, callback); return sequence; },
      clearTimeout: id => timers.delete(id), setInterval() {}, clearInterval() {},
      Option: class { constructor(_, value) { this.value = value; } },
    });
    assert.equal(get('board').children.length, game.columns);
    assert.equal(get('board').children[0].children.length, game.rows);
    for (let round = 1; round <= 12; round++) {
      get('spin').click();
      assert.equal(get('spin').textContent, 'STOP');
      get('spin').click();
      assert.equal(get('rounds').value, round);
      assert.equal(timers.size, 0);
    }
    get('auto').click();
    assert.equal(get('rounds').value, 12);
    assert.equal(timers.size, 0);
    const start = get('dialog-content').children.at(-1);
    assert.equal(start.textContent, 'START PLAY');
    start.click();
    for (const [id, timer] of timers) { timers.delete(id); timer(); }
    assert.equal(get('rounds').value, 17);
    assert.equal(get('spin').textContent, 'SPIN');
    assert.equal(timers.size, 0);
  }
});
