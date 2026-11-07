import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeNativeGames,homeGames} from '../catalog.mjs';

test('Balloon is visible on Home once and existing native and legacy identities remain',()=>{
 const legacy=[{id:'multi_hot_5_video',title:'Multi Hot 5',launch:'/games/multi_hot_5_video'},{id:'hot_foxy_20',title:'Hot Foxy 20',launch:'/games/hot_foxy_20'}];
 const existing=[...legacy,{id:'balloon_native',title:'Balloon',art:'/assets/zplay-balloon-native-v1.svg'}];
 const games=mergeNativeGames(existing,{games:[{id:'balloon_native',studio:'Superwin'}]});
 assert.deepEqual(games.map(g=>g.id),['balloon_native','jetx_native','foxy_hot_20_native','multi_hot_5_native',...legacy.map(g=>g.id)]);
 assert.equal(games.filter(g=>g.id==='balloon_native').length,1);
 assert.equal(games[0].category,'Flight');assert.equal(games[0].launch,'/games/balloon_native');
 assert.equal(homeGames(games)[0].id,'balloon_native');
 assert.deepEqual(games.slice(-2),legacy);
});
