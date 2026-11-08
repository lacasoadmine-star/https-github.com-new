import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as smartsoft from '../models/smartsoft-slots.mjs';
import {createIsolatedDraftAdapter, remainingPublicConfigs} from '../models/remaining-games.mjs';
import {ReferencePresentationHost, REFERENCE_PRESENTATION_IDS} from '../client/reference-presentation.mjs';
import {fitViewport} from '../presentation/machine-renderer.mjs';

// Real draft-model outputs, wrapped in the exact public LibraryService.view
// envelope. The account/session identifiers and balance below are isolated
// fixtures: there is no wallet, browser, provider session or production request.
const ROOT = new URL('../', import.meta.url), ORIGIN = 'https://zplay-contract.example';
const NOW = 1794092400000, drafts = createIsolatedDraftAdapter();
const configs = new Map([...smartsoft.publicGames, ...remainingPublicConfigs].map(game => [game.id, game]));
const groups = [
  ['smartsoft', 'presentation', 'renderer-manifest.json'],
  ['remaining-slots', 'presentation/remaining-slots', 'index.json'],
  ['arcade', 'presentation/arcade', 'index.json'],
  ['legends', 'presentation/legends', 'index.json'],
];
const unsupported = new Set(['moonstone_native', 'samurai_native', 'magicgarden_native']);
const records = new Map();
for (const [family, directory, indexFile] of groups) {
  const index = JSON.parse(await readFile(new URL(directory + '/' + indexFile, ROOT), 'utf8'));
  for (const [id, entry] of Object.entries(index.games)) {
    if (unsupported.has(id)) continue;
    const path = directory + '/' + entry.file;
    const body = await readFile(new URL(path, ROOT));
    const config = configs.get(id);
    const game = {...config, referencePresentation: {
      manifestURL: '/native-library/' + path,
      manifestSha256: createHash('sha256').update(body).digest('hex'),
      assetBaseURL: '/native-library/reference-art/r1/' + family + '/assets/',
      modelVersion: config.version,
    }};
    records.set(id, {family, game, body, manifest: JSON.parse(body)});
  }
}

function generator(seed) {
  let value = seed >>> 0;
  return () => {value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296;};
}
function scripted(values, fallback = 0) {
  let at = 0; return () => values[at++] ?? fallback;
}
function start(id, random = generator(551199), options = {}) {
  const game = configs.get(id);
  const stake = game.stakeMinorValues?.find(value => BigInt(value) >= 100n) || '100';
  return records.get(id).family === 'smartsoft'
    ? smartsoft.evaluateDraftRound(id, {stakeMinor: stake}, random, NOW)
    : drafts.start(id, {stakeMinor: stake, ...options}, random, NOW);
}
let sequence = 0;
function publicReceipt(id, state) {
  const adapter = records.get(id).family === 'smartsoft' ? smartsoft : drafts;
  return {...adapter.publicState(state, NOW),
    round_id: '70000000-0000-4000-8000-' + String(++sequence).padStart(12, '0'),
    game_id: id, model_version: configs.get(id).version, version: 0,
    status: state.status, stakeMinor: state.stakeMinor,
  };
}
function hostFixture(record) {
  const paints = [], fetches = [];
  const context = {canvas: {width: 420, height: 900}, clearRect() {}, setTransform() {}, save() {}, restore() {}, fillRect() {}};
  const host = new ReferencePresentationHost(context, {
    origin: ORIGIN,
    fetchImpl: async url => {
      const target = new URL(url, ORIGIN).href; fetches.push(target);
      assert.equal(target, new URL(record.game.referencePresentation.manifestURL, ORIGIN).href, 'only the pinned same-origin manifest may be requested');
      return new Response(record.body, {headers: {'content-type': 'application/json'}});
    },
    storeFactory: (manifest, {family, baseURL}) => {
      assert.equal(manifest.id, record.game.id); assert.equal(family, record.family);
      assert.equal(String(baseURL), new URL(record.game.referencePresentation.assetBaseURL, ORIGIN).href);
      return {prepare: async () => new Map(), dispose() {}};
    },
    painter: (_ctx, scene, manifest, _images, {width, height}) => {
      paints.push(scene);
      assert.equal(scene.gameId, manifest.id);
      return fitViewport(width, height, {referenceWidth: scene.width, referenceHeight: scene.height});
    },
  });
  host.setGame(record.game);
  return {host, paints, fetches};
}
const hostState = (game, round) => ({connected: true, authenticated: true,
  sessionId: 'isolated-art-contract', game, balance: '1000.00', currency: 'ETB',
  round, busy: false, pending: false, confirming: false, recoveryBlocked: false, error: false});
const displayId = (id, symbol) => id === 'bookofmagic_native' && symbol === 'princess' ? 'sorceress' : symbol;
function assertScene(record, scene, round, frameIndex) {
  assert.equal(scene.productionLaunchEnabled, false); assert.equal(scene.financialActions, false);
  for (const command of scene.commands) {
    if (command.type === 'sprite') assert.ok(record.manifest.frames[command.frame], command.frame);
    if (command.type === 'image') assert.ok(record.manifest.files[command.file], command.file);
  }
  if (record.family === 'arcade') {
    if (record.game.id === 'coinminer_native') {
      assert.equal(scene.revealedTileCount, round.picks.length);
      assert.equal(scene.safeTileCount, round.picks.filter(pick => pick.safe).length);
      assert.deepEqual(scene.boostedTileIndices, round.picks.filter(pick => pick.treasureBoost === true).map(pick => pick.index));
    } else {
      assert.equal(scene.totalFloorCount, round.floors.length);
      if (record.game.id === 'towerx_native') {
        const visibleCount = frameIndex === null ? round.floors.length : Math.min(round.floors.length, frameIndex + 1);
        assert.equal(scene.visibleFloorCount, visibleCount);
        assert.equal(scene.settledResultShown, round.status === 'settled' && visibleCount === round.floors.length);
      }
    }
    return;
  }
  const visible = frameIndex === null ? round : round.frames[frameIndex];
  const mapped = visible.grid.flat().map(symbol => displayId(record.game.id, symbol)).filter(symbol => record.manifest.symbols[symbol]);
  const symbolFrames = new Set(Object.values(record.manifest.symbols).map(symbol => symbol.frame));
  const rendered = scene.commands.filter(command => command.type === 'sprite' && symbolFrames.has(command.frame));
  assert.equal(rendered.length, mapped.length, record.game.id + ': exact visible-frame symbol count');
  assert.deepEqual(rendered.map(command => command.frame), mapped.map(symbol => record.manifest.symbols[symbol].frame), record.game.id + ': no transposed, replaced or future-frame symbols');
}

test('the18 presentation mappings correspond to the actual draft identities, grids and provider symbols', () => {
  assert.equal(records.size, 18);
  assert.deepEqual([...REFERENCE_PRESENTATION_IDS].sort(), [...records.keys()].sort());
  for (const [id, record] of records) {
    const {game, manifest, family} = record;
    assert.equal(game.launchable, false); assert.equal(manifest.productionLaunchEnabled, false);
    if (manifest.modelVersion) assert.equal(manifest.modelVersion, game.version);
    if (family === 'arcade') continue;
    assert.deepEqual(manifest.grid, {columns: game.columns, rows: game.rows});
    const missing = [];
    for (const symbol of game.symbols) {
      const mapped = manifest.symbols[displayId(id, symbol.id)];
      if (!mapped) {missing.push(symbol.id); continue;}
      if (symbol.providerSymbolId !== undefined) assert.equal(mapped.providerId, symbol.providerSymbolId, id + ':' + symbol.id);
    }
    assert.deepEqual(missing.sort(), (manifest.missingSymbols || []).map(symbol => symbol.id).sort());
    if (id === 'egyptianlegends_native') assert.deepEqual(missing, ['multiplier', 'scatter', 'wild']);
    else assert.deepEqual(missing, []);
  }
});

for (const [id, record] of records) {
  test(id + ': real public draft outcomes and stored frames render through the pinned host without mutation', async () => {
    const {host, fetches} = hostFixture(record);
    try {
      const states = [start(id).state];
      if (id === 'bookofmagic_native') states.push(start(id, () => .06).state); // actual princess wins require the provider9 display alias
      else if (id === 'towerx_native') states.push(start(id, () => .999999).state);
      else if (id === 'towerrush_native') {
        const frozen = drafts.act(states[0], {type: 'step'}, scripted([.89, 0]), NOW + 1).state;
        const temple = drafts.act(states[0], {type: 'step'}, scripted([.94, .9999, 0]), NOW + 1).state;
        const triple = drafts.act(states[0], {type: 'step'}, scripted([.98, 0]), NOW + 1).state;
        states.push(frozen, temple, triple, drafts.act(frozen, {type: 'step'}, () => .9, NOW + 2).state);
      } else if (id === 'coinminer_native') {
        const initial = start(id, generator(1), {mines: 10}).state;
        const rescued = drafts.act(initial, {type: 'pick', index: 4}, () => .62, NOW + 1).state;
        states.push(initial, rescued, drafts.act(rescued, {type: 'pick', index: 24}, () => .99999, NOW + 2).state);
      } else states.push(start(id, () => .999999).state);
      for (const state of states) {
        const round = publicReceipt(id, state), before = structuredClone(round);
        const frames = Array.isArray(round.frames) && round.frames.length ? [0, round.frames.length - 1] : [];
        for (const frameIndex of [...new Set([null, ...frames])]) {
          const result = await host.draw(hostState(record.game, round), {frameIndex, selectedStake: '1.00', width: 390, height: 844});
          assert.equal(result.status, 'painted', id + ': ' + JSON.stringify(result));
          assertScene(record, result.scene, round, frameIndex);
          assert.deepEqual(round, before, 'the public receipt must remain unchanged by presentation');
        }
      }
      assert.equal(fetches.length, 1, 'reuse only the same hash-pinned manifest for a stable game/version');
    } finally {host.dispose();}
  });
}
