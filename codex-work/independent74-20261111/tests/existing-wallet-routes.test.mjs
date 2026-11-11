import test from 'node:test';import assert from 'node:assert/strict';
import scope from '../scope/official74.json' with {type:'json'};
import {EXISTING_WALLET_ROUTES,existingWalletRoute} from '../client/existing-wallet-routes.mjs';
test('14 exact existing account identities map to preserved routes;60 catalogue entries remain unmapped',()=>{
 assert.equal(Object.keys(EXISTING_WALLET_ROUTES).length,14);
 assert.equal(scope.entries.filter(e=>existingWalletRoute(e.gameId)).length,14);
 assert.equal(scope.entries.filter(e=>!existingWalletRoute(e.gameId)).length,60);
 for(const [id,route]of Object.entries(EXISTING_WALLET_ROUTES)){assert(scope.entries.some(e=>e.gameId===id));assert.match(route,/^\/games\/[a-z0-9_]+$/);}
 assert.equal(existingWalletRoute('ind74_official_wildmultistars'),'/games/wild_multi_stars');
 assert.equal(existingWalletRoute('ind74_official_balloon'),'/games/balloon_native');
 assert.equal(existingWalletRoute('ind74_official_multihot5deluxe'),'/games/multihotdeluxe_native');
 assert.equal(existingWalletRoute('ind74_official_multihot5'),'/games/multi_hot_5_video');
 assert.equal(existingWalletRoute('ind74_official_foxyhot20'),'/games/hot_foxy_20');
});
test('similar names and same families never alias an unconfigured game to a playable existing engine',()=>{
 for(const id of ['ind74_official_balloonx','ind74_official_multihot5burnwilds','ind74_official_multihot20','ind74_official_multihot10','ind74_official_neweraofjetx','ind74_official_mineisland','ind74_official_mineisland2','ind74_official_popx','ind74_official_plinkoxclassic','ind74_official_safarisimba','__proto__','constructor',null,undefined])assert.equal(existingWalletRoute(id),null,String(id));
});
