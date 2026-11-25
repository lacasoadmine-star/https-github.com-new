import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildCatalogue, filterCatalogue, referenceKey, verifiedNewGameRoute, readFavourites, saveFavourites, accountViewFromMe } from './catalogue-model.mjs';

const all = JSON.parse(await readFile(new URL('./data/catalogue.json', import.meta.url)));
const smartsoft = JSON.parse(await readFile(new URL('./data/smartsoft-catalogue.json', import.meta.url)));
const games = buildCatalogue(all, smartsoft);

test('fresh captures retain every distinct record and verify SmartSoft only by its observed filter', () => {
  const expected = new Set([...all.games, ...smartsoft.games].map(referenceKey));
  assert.equal(games.length, expected.size);
  assert.equal(filterCatalogue(games, { provider: 'SmartSoft' }).length, smartsoft.games.length);
  for (const game of games.filter(game => game.provider)) assert.equal(game.providerEvidence, 'SmartSoft (72)');
  assert.ok(games.some(game => game.provider === null));
});

test('search, provider and device favourites intersect without confusing same-name games', () => {
  const smart = games.find(game => game.name === 'JetX3');
  const favourites = new Set([smart.key]);
  assert.deepEqual(filterCatalogue(games, { search: 'jetx', provider: 'SmartSoft', favourites }), [smart]);
  assert.deepEqual(filterCatalogue(games, { search: 'keno', provider: 'SmartSoft', favourites }), []);
  const kenos = games.filter(game => game.name === 'Keno');
  assert.ok(kenos.length > 1);
  assert.equal(filterCatalogue(games, { favourites: new Set([kenos[0].key]) }).length, 1);
});

test('catalogue cards cannot launch old implementations or unverified games', () => {
  const game = games[0];
  const origin = 'https://superwin-player.apdiy61.workers.dev';
  const ready = route => ({ games: { [game.key]: { newImplementation: true, liveVerified: true, route, referenceUrl: all.source } } });
  assert.equal(verifiedNewGameRoute(game, { games: {} }, origin), null);
  assert.equal(verifiedNewGameRoute(game, ready('/games/multi_hot_5_native'), origin), null);
  assert.equal(verifiedNewGameRoute(game, ready('https://outside.example/rebuild/games/a/'), origin), null);
  assert.equal(verifiedNewGameRoute(game, ready('/rebuild/games/a/?token=secret'), origin), null);
  assert.equal(verifiedNewGameRoute(game, ready('/rebuild/games/a/'), origin), '/rebuild/games/a/');
  const unverified = ready('/rebuild/games/a/');
  unverified.games[game.key].liveVerified = false;
  assert.equal(verifiedNewGameRoute(game, unverified, origin), null);
});

test('device favourites handle malformed or disabled storage without touching wallet keys', () => {
  const touched = [];
  const storage = { getItem: key => { touched.push(key); return '{broken'; }, setItem: (key, value) => touched.push([key, value]) };
  assert.equal(readFavourites(storage).size, 0);
  assert.equal(saveFavourites(storage, new Set(['game-a'])), true);
  assert.equal(touched[0], 'zplay.rebuild.favourites.v1');
  assert.deepEqual(touched[1], ['zplay.rebuild.favourites.v1', '["game-a"]']);
  assert.equal(saveFavourites({ setItem() { throw Error('disabled'); } }, new Set()), false);
});

test('account balance uses confirmed server minor units and never invents a missing balance', () => {
  assert.deepEqual(accountViewFromMe({ id: 'u', balance: 123456 }), { authenticated: true, currency: 'ETB', balance: 1234.56 });
  assert.deepEqual(accountViewFromMe({ id: 'u', balance: '0' }), { authenticated: true, currency: 'ETB', balance: 0 });
  for (const value of [{ id: 'u' }, { id: 'u', balance: null }, { id: 'u', balance: '' }, { id: 'u', balance: ' ' }, { id: 'u', balance: 1.23 }, { balance: 1000 }, { id: 'u', balance: 100, currency: 'USD' }]) assert.equal(accountViewFromMe(value), null);
});
