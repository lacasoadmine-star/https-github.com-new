import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {mergeNativeGames,homeGames,nativeGames,PREFIX,confirmNativeFavourite} from './native-catalog.mjs';
const source=await readFile(new URL('../portal/portal.mjs',import.meta.url),'utf8');
const fixture=JSON.parse(await readFile(new URL('./live-catalog.fixture.json',import.meta.url),'utf8'));
// Run the actual untouched normalizer, not a second handwritten approximation.
const known=source.slice(source.indexOf('const known='),source.indexOf('const icon='));
const safeArt=source.slice(source.indexOf('const safeArt='),source.indexOf('let stopped='));
const normalize=source.slice(source.indexOf('function normalize('),source.indexOf('function artwork('));
const oldNormalize=vm.runInNewContext(known+safeArt+normalize+';normalize');
const old=JSON.parse(JSON.stringify(oldNormalize(fixture)));
test('actual live 57-entry catalogue becomes 59 while every legacy record is unchanged',()=>{
 assert.equal(old.length,57);const merged=mergeNativeGames(old,fixture);assert.equal(merged.length,59);
 assert.deepEqual(merged.filter(game=>!game.nativeMachine),old);
 for(const entry of old)assert.equal(merged.find(game=>game.id===entry.id),entry);
 assert.equal(new Set(merged.map(game=>game.id)).size,59);
 assert.deepEqual(merged.slice(0,2).map(game=>game.launch),['/games/foxy_hot_20_native','/games/multi_hot_5_native']);
 for(const id of ['multi_hot_5_video','hot_foxy_20','wild_multi_stars','multi_hot_100'])assert.equal(merged.find(game=>game.id===id).launch,'/games/'+id);
});
test('home adds both native machines without displacing any of the six former home entries',()=>{
 const merged=mergeNativeGames(old,fixture),home=homeGames(merged);assert.equal(home.length,8);assert.deepEqual(home.slice(2),old.slice(0,6));
 assert.equal(homeGames(merged.filter(game=>game.title.toLowerCase().includes('multi hot'))).length,3);
});
test('configured native machines are not duplicated or aliased and explicit unavailable state is respected',()=>{
 const originals=mergeNativeGames(old,fixture),configured={games:[...fixture.games,...nativeGames.map(g=>({id:g.id,name:g.title,studio:'ZPLAY'}))]};
 assert.equal(mergeNativeGames(originals,configured).length,59);
 for(const flag of ['demo','available','enabled']){
  const config={games:[...fixture.games,{id:'foxy_hot_20_native',name:'Foxy Hot 20',[flag]:flag==='demo'}]};
  const merged=mergeNativeGames(originals,config);assert.equal(merged.length,58);assert.ok(!merged.some(g=>g.id==='foxy_hot_20_native'));assert.ok(merged.some(g=>g.id==='hot_foxy_20'));
 }
 for(const game of originals.filter(g=>g.nativeMachine)){assert.equal(game.nativeId,game.id);assert.ok(game.art.startsWith(PREFIX));assert.equal(game.category,'Slots');}
});
test('identity, financial, history, favourites and account behavior remain the original source',async()=>{
 const native=await readFile(new URL('./portal.mjs',import.meta.url),'utf8');
 const current=native.replace("  let data=await response.json();","  const data=await response.json();").replace(/^  if\(game\.nativeMachine\)data=await confirmNativeFavourite[^\n]*\n/m,'');
 for(const [start,end]of [['function updateFavourite()','function decorateAuth()'],['function decorateAuth()','function currentSurface('],['function currentSurface(','function schedule()']]){
  assert.equal(current.slice(current.indexOf(start),current.indexOf(end)),source.slice(source.indexOf(start),source.indexOf(end)),start);
 }
 assert.ok(current.includes("import {coverArt} from '/player-portal-20261106-r9/cover-art.mjs'"));
});

test('new favourite state requires acknowledgement of the exact new ID; ignored writes never appear saved',async()=>{
 const id='foxy_hot_20_native',unneeded=()=>{throw Error('Unexpected read');};
 assert.deepEqual(await confirmNativeFavourite(['hot-777',id],id,true,unneeded),['hot-777',id]);
 assert.deepEqual(await confirmNativeFavourite(['hot-777'],id,false,unneeded),['hot-777']);
 await assert.rejects(confirmNativeFavourite(['foxy-20'],id,true,unneeded),/could not be updated/);
 await assert.rejects(confirmNativeFavourite([id],id,false,unneeded),/could not be updated/);
 let reads=0;assert.deepEqual(await confirmNativeFavourite({ok:true},id,true,async()=>{reads++;return [id];}),[id]);assert.equal(reads,1);
 await assert.rejects(confirmNativeFavourite({ok:true},id,true,async()=>({ok:true})),/could not be updated/);
 await assert.rejects(confirmNativeFavourite({ok:true},id,true,async()=>{throw Error('Read denied');}),/Read denied/);
});
