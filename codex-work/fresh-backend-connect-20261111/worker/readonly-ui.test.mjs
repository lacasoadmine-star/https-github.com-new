import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { accountGames } from './modules/independent74-catalog-r17.mjs';
import { EXISTING_WALLET_ROUTES } from '../../independent74-20261111/client/existing-wallet-routes.mjs';
const NATIVE60_GAME_IDS = accountGames.filter(game => !Object.hasOwn(EXISTING_WALLET_ROUTES, game.id)).map(game => game.id);

const root = import.meta.dirname;
const html = await readFile(new URL('./assets/machines74.html', import.meta.url), 'utf8');
const mocks = {
  'machine74-api.mjs': `export class MachineAccountClient {
    get pending(){return window.fixture.pending;}
    catalog(){return Promise.resolve(structuredClone(window.fixture.games));}
    state(id){window.fixture.stateCalls.push(id);return Promise.resolve(window.fixture.state(id));}
    history(){return Promise.resolve(window.fixture.history);}
    start(){window.fixture.actionCalls.push('start');throw Error('Unexpected wager');}
    act(type){window.fixture.actionCalls.push(type);throw Error('Unexpected action');}
    retryPending(){window.fixture.actionCalls.push('retry');throw Error('Unexpected retry');}
  }`,
  'machine74-renderer.mjs': `export function renderMachine(stage,game,round,options){
    window.fixture.renders.push({game:game.id,round,disabled:options.disabled});
    stage.textContent='Stored game display';return {dispose(){}};
  }
  export function animateRound(){throw Error('Unexpected animation');}`,
  'machine74-audio.mjs': `export class MachineAudio {
    setMuted(){} setVolume(){} unlock(){} startSpin(){} stopSpin(){} cue(){} dispose(){}
  }`,
  'standalone74-api.mjs': `export class StandaloneMachineClient {constructor(){throw Error('Wrong route');}}`,
};
const bundled = await build({
  entryPoints: [resolve(import.meta.dirname, 'assets/machine74-controller.mjs')],
  bundle: true, format: 'esm', platform: 'browser', write: false, logLevel: 'silent',
  plugins: [{ name: 'isolated-controller-dependencies', setup(build) {
    build.onResolve({ filter: /^\.\// }, args => {
      const name = args.path.split('/').at(-1).split('?')[0];
      if (mocks[name]) return { path: name, namespace: 'readonly-test' };
      return { path: resolve(root, 'private-retained-assets', name) };
    });
    build.onLoad({ filter: /.*/, namespace: 'readonly-test' }, args => ({ contents: mocks[args.path], loader: 'js' }));
  } }],
});

test('actual account controller shows readonly stored summaries, disables every action and permits browsing', async () => {
  for (const family of ['crash', 'ladder', 'plinko', 'slots', 'wheel', 'dice']) {
    const original = accountGames.find(game => game.family === family && NATIVE60_GAME_IDS.includes(game.id));
    assert(original, family);
    const other = accountGames.find(game => NATIVE60_GAME_IDS.includes(game.id) && game.id !== original.id);
    const games = [original, other].map(game => ({ ...game, readOnly: true, accepting: false, launchable: false, controls: { actions: [] } }));
    const dom = new JSDOM(html, { url: 'https://player.fixture/independent74/machines74.html?mode=account#' + original.id,
      pretendToBeVisual: true, runScripts: 'outside-only' });
    const { window } = dom, document = window.document;
    window.structuredClone = structuredClone;
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    window.HTMLElement.prototype.scrollIntoView = function() {};
    window.HTMLDialogElement.prototype.showModal = function() { this.open = true; };
    window.HTMLDialogElement.prototype.close = function() { this.open = false; this.dispatchEvent(new window.Event('close')); };
    const active = { round_id: '90000000-0000-4000-8000-000000000001', status: 'active', stakeMinor: '100', payoutMinor: null,
      allowedActions: [], actions: [], readOnly: true, summaryOnly: true };
    window.fixture = {
      games, pending: { body: { game_id: original.id } }, stateCalls: [], actionCalls: [], renders: [], history: [],
      state(id) { return { authenticated: true, currency: 'ETB', balance: '123.45', game_id: id, game: games.find(game => game.id === id),
        accepting: false, readOnly: true, modelInstalled: false, accountServiceAvailable: true,
        historyAvailable: true, sessionGuard: 'fixture', round: { ...active, game_id: id } }; },
    };
    try {
      await window.eval('(async()=>{' + bundled.outputFiles[0].text + '\n})()');
      assert.equal(document.querySelector('#balance').textContent, '123.45', family);
      assert.match(document.querySelector('#mode-status').textContent, /Wallet-ka Player-ka waa ku xidhan yahay/);
      assert.match(document.querySelector('#message').textContent, /akhris keliya/);
      assert.match(document.querySelector('#round-status').textContent, /Akhris keliya/);
      assert.equal(document.querySelector('#game-select').disabled, false, family + ': browsing remains available');
      for (const id of ['play', 'next', 'collect', 'gamble-red', 'gamble-black', 'auto', 'retry', 'bet', 'bet-less', 'bet-more']) {
        assert.equal(document.getElementById(id).disabled, true, family + ':' + id);
      }
      assert(window.fixture.renders.every(render => render.disabled === true && render.round === null));
      for (const id of ['play', 'next', 'collect', 'gamble-red', 'gamble-black', 'retry', 'auto']) {
        document.getElementById(id).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      }
      await Promise.resolve();
      assert.deepEqual(window.fixture.actionCalls, []);
      window.fixture.pending = null;
      const select = document.getElementById('game-select');
      select.value = other.id;
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
      await new Promise(resolve => window.requestAnimationFrame(resolve));
      assert.equal(window.fixture.stateCalls.at(-1), other.id, family + ': stored active summary does not trap navigation');
      const storedState = window.fixture.state;
      window.fixture.state = id => ({ ...storedState(id), round: null, historyAvailable: false });
      document.getElementById('refresh').click();
      await new Promise(resolve => window.requestAnimationFrame(resolve));
      assert.match(document.querySelector('#message').textContent, /Wallet-ka ETB waa ku xidhan yahay/);
      assert.match(document.querySelector('#message').textContent, /SPIN-ka iyo history-ga ciyaartan weli ma furna/);
      assert(!document.querySelector('#message').textContent.includes('history-gu waa ku xidhan yihiin'));
      document.querySelector('.history').open = true;
      document.querySelector('.history').dispatchEvent(new window.Event('toggle'));
      await Promise.resolve();
      assert.match(document.querySelector('#history-status').textContent, /History-ga ciyaartan weli backend-ka laguma xaqiijin/);
    } finally { window.dispatchEvent(new window.Event('pagehide')); window.close(); }
  }
});
