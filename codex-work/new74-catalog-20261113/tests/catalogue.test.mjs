import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../public/lobby.mjs',import.meta.url),'utf8');
const games=JSON.parse(source.match(/^const games = Object\.freeze\((\[.*\])\);/m)[1]);
const approved=new Map([
  [14,'/games/multihot5wild_native'],
  [19,'/new74/002-multi-hot-10'],
  [20,'/games/multihot40_native'],
  [22,'/games/multihot100_native'],
  [23,'/games/multihotwildways_native'],
  [27,'/games/multihotdeluxe_native'],
  [32,'/games/multihot5superwilds_native'],
  [33,'/games/balloon_native'],
  [36,'/new74/001-multi-hot-5'],
  [37,'/games/safarisimba_fresh'],
  [41,'/games/hot_foxy_20'],
  [42,'/games/burningice40_native'],
  [44,'/games/habeshafortune5_native'],
  [47,'/games/burningice_native'],
  [50,'/games/wild_multi_stars'],
  [71,'/games/burningice10_native'],
]);

test('74 unique titles retain exactly the approved 16 routes and 59 poster references',()=>{
  assert.equal(games.length,74);
  assert.deepEqual(games.map(game=>game.index),Array.from({length:74},(_,i)=>i+1));
  assert.equal(new Set(games.map(game=>game.name)).size,74);
  assert.equal(games.filter(game=>game.href===null).length,58);
  assert.deepEqual(new Map(games.filter(game=>game.href).map(game=>[game.index,game.href])),approved);
  assert.equal(games[2].href,null); // A different JetX identity is not an approved substitute.
  const images=games.filter(game=>game.image).map(game=>game.image);
  assert.equal(images.length,59);
  assert.equal(new Set(images).size,59);
  for(const image of images) assert.match(image,/^\/new74\/assets\/fresh74\/[a-f0-9]{64}\.jpg$/);
  for(const game of games) assert.deepEqual(Object.keys(game),['index','name','image','href']);
});
