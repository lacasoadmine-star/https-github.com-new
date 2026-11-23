import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REQUESTED_NAMES,EXCLUDED_NAMES} from './requested.mjs';

const registry=JSON.parse(readFileSync(new URL('./registry.json',import.meta.url),'utf8'));
const games=registry.games;

test('user-requested ninety games are exactly numbered 1 through 90 in canonical order',()=>{
  assert.equal(registry.schema,'zplay/requested90-registry/v1');
  assert.equal(registry.requestedNameCount,90);
  assert.equal(REQUESTED_NAMES.length,90);
  assert.equal(games.length,90);
  assert.deepEqual(games.map(x=>x.ordinal),Array.from({length:90},(_,i)=>i+1));
  assert.deepEqual(games.map(x=>x.displayName),[...REQUESTED_NAMES]);
});

test('the queue is exactly nine contiguous batches of ten, never truncated at 72',()=>{
  const batches=Array.from({length:9},(_,i)=>games.slice(i*10,i*10+10));
  assert.equal(batches.length,9);
  for(let i=0;i<9;i++){
    assert.equal(batches[i].length,10);
    assert.equal(batches[i][0].ordinal,10*i+1);
    assert.equal(batches[i][9].ordinal,10*i+10);
  }
  assert.equal(batches[0][0].displayName,'Multi Hot 5 Burn Wilds');
  assert.equal(batches[8][9].displayName,'Fortune Catch');
});

test('the new-game identities and frontend routes are unique and old excluded titles remain excluded',()=>{
  assert.deepEqual([...EXCLUDED_NAMES],[...registry.excludedExactNames]);
  for(const title of EXCLUDED_NAMES)assert.equal(REQUESTED_NAMES.includes(title),false);
  assert.equal(new Set(games.map(x=>x.gameId)).size,90);
  assert.equal(new Set(games.map(x=>x.route)).size,90);
  for(const game of games){
    assert.ok(game.gameId&&game.route.startsWith('/new-games'));
    assert.equal(game.frontend.route,game.route);
  }
});

test('catalogue metadata cannot falsely mark unfinished games as production complete',()=>{
  assert.equal(registry.publicActivation,false);
  for(const game of games){
    assert.equal(game.release.ready,false,game.displayName);
    assert.equal(game.release.enabled,false,game.displayName);
    assert.equal(game.release.liveVerified,false,game.displayName);
    assert.equal(game.tests.financialIntegrationVerified,false,game.displayName);
  }
});
