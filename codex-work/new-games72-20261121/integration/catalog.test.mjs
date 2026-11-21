import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {additiveCatalog} from './catalog.mjs';

const actual = JSON.parse(readFileSync(new URL('../registry.json', import.meta.url)));
function fixture() {
  const registry = structuredClone(actual);
  for (const game of registry.games) game.backend.rulesVersion = 'test-only-rules-v1';
  const legacyGames = [
    Object.freeze({id:'multi_hot_5_native',route:'/games/multi_hot_5_native',history:'preserved',custom:{a:1}}),
    Object.freeze({id:'foxy_hot_20_native',accountPath:'/games/foxy_hot_20_native',legacyAsset:'/old/foxy.webp'}),
  ];
  const publication = {schema:'zplay/new-games72-publication/v1',state:'ACTIVE',releaseId:registry.releaseId,
    sourceCommit:'a'.repeat(40),releaseManifestSha256:'b'.repeat(64),games:registry.games.map(game=>({
      gameId:game.gameId,route:game.route,coverPath:game.assets.prefix+'test-cover.webp',coverSha256:'c'.repeat(64),
      frontendVersion:'synthetic-test-version',rulesVersion:game.backend.rulesVersion,
    }))};
  return {registry,legacyGames,publication};
}
test('preparation preserves every old card and exposes no placeholder section',()=>{
  const input=fixture();input.publication=null;const result=additiveCatalog(input);
  assert.deepEqual(result.games,input.legacyGames);assert.equal(result.newSection,null);assert.equal(result.activatedNewCount,0);
  assert.notEqual(result.games,input.legacyGames);assert.equal(result.games[0],input.legacyGames[0]);
});
test('complete reviewed-publication shape adds exactly72 without modifying old cards',()=>{
  const input=fixture(),before=JSON.stringify(input.legacyGames),result=additiveCatalog(input);
  assert.equal(result.games.length,74);assert.equal(result.activatedNewCount,72);assert.equal(result.newSection.gameIds.length,72);
  assert.equal(result.games[0],input.legacyGames[0]);assert.equal(result.games[1],input.legacyGames[1]);
  assert.equal(JSON.stringify(input.legacyGames),before);assert.equal(result.games[2].engineProvider,'ZPLAY');
});
test('71 or73 published cards cannot activate',()=>{
  for(const change of [p=>p.games.pop(),p=>p.games.push(p.games[0])]){const input=fixture();change(input.publication);assert.throws(()=>additiveCatalog(input),/COMPLETE_PUBLICATION_REQUIRED/);}
});
test('duplicate publication identity cannot inflate count',()=>{
  const input=fixture();input.publication.games[71]=input.publication.games[0];assert.throws(()=>additiveCatalog(input),/PUBLICATION_ID_MISMATCH/);
});
test('a reserved ID cannot overwrite a legacy card',()=>{
  const input=fixture();input.legacyGames.push({id:input.registry.games[0].gameId});assert.throws(()=>additiveCatalog(input),/LEGACY_COLLISION/);
});
test('a new deep link cannot shadow an existing card route',()=>{
  const input=fixture();input.legacyGames.push({id:'legacy-extra',route:input.registry.games[0].route});assert.throws(()=>additiveCatalog(input),/LEGACY_COLLISION/);
});
test('foreign/old image assets and traversal are rejected',()=>{
  for(const cover of ['/old/cover.webp','https://external.invalid/art.webp','/new-games72/../old.webp','/new-games72/%2e%2e/old.webp']){
    const input=fixture();input.publication.games[0].coverPath=cover;assert.throws(()=>additiveCatalog(input),/PINNED_NEW_GAME_ASSETS_REQUIRED/);
  }
});
test('mixed release and rules identities are rejected',()=>{
  const a=fixture();a.publication.releaseId='different-release';assert.throws(()=>additiveCatalog(a),/COMPLETE_PUBLICATION_REQUIRED/);
  const b=fixture();b.publication.games[0].rulesVersion='old-rules';assert.throws(()=>additiveCatalog(b),/PINNED_NEW_GAME_ASSETS_REQUIRED/);
});
test('altered card mapping and missing asset hashes are rejected',()=>{
  const a=fixture();a.publication.games[0].route='/new-games72/wrong/';assert.throws(()=>additiveCatalog(a),/PUBLICATION_ROUTE_MISMATCH/);
  const b=fixture();delete b.publication.games[0].coverSha256;assert.throws(()=>additiveCatalog(b),/PINNED_NEW_GAME_ASSETS_REQUIRED/);
});
