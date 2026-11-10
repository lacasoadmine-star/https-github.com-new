import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {installRoundsPlayer,PREFIX} from '../../deploy/smartsoft/runtime-player-r21.mjs';
import sources from '../../deploy/smartsoft/runtime-sources-r21.mjs';
import {bundledResource} from '../../deploy/smartsoft/reference-resources-r14.mjs';
import {REFERENCE_SOURCES} from '../../deploy/smartsoft/reference-sources-r14.mjs';
import {createHash} from 'node:crypto';

test('failed upstream Ice assets are served as exact verified originals without account headers',async()=>{
 const calls=[],app=installRoundsPlayer({fetch:()=>assert.fail('unavailable upstream used')},Object.keys(sources));
 const env={PORTAL:'player',EXPANSION100:{fetch:async r=>{calls.push(r);return bundledResource(sources['assets/'+r.url.split('/').at(-1)],r.method);}}};
 for(const key of Object.keys(sources).filter(name=>name.startsWith('assets/'))){
  const name=key.slice(7),r=new Request('https://player.test/native-library/remaining20/20261110-reference-mobile-r14/assets/burningice_native/'+name,{headers:{cookie:'account',authorization:'secret'}});
  const response=await app.fetch(r,env),bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(response.status,200);assert.equal(createHash('sha256').update(bytes).digest('hex'),REFERENCE_SOURCES.assets[name].sha256);
  assert.equal(calls.at(-1).headers.get('cookie'),null);assert.equal(calls.at(-1).headers.get('authorization'),null);
  assert.equal((await app.fetch(new Request(r,{method:'POST'}),env)).status,405);
 }
});
test('unchanged account actions, other portals and protected games retain original request identity',async()=>{
 const calls=[],app=installRoundsPlayer({fetch:async r=>{calls.push(r);return new Response('original');}},Object.keys(sources));
 for(const path of ['/api/remaining20/action','/api/wallet/transfer','/games/foxy_hot_20_native','/games/multi_hot_5_native','/games/coinminer_native']){
  const r=new Request('https://player.test'+path,{method:'POST',body:'original',headers:{cookie:'account'}});
  assert.equal(await(await app.fetch(r,{PORTAL:'player'})).text(),'original');assert.equal(calls.at(-1),r);
 }
 const r=new Request('https://player.test'+PREFIX+'lobby.mjs');await app.fetch(r,{PORTAL:'admin'});assert.equal(calls.at(-1),r);
});
test('frame imports keep backgrounds and mobile controls in the same immutable release',async()=>{
 const seen=[],app=installRoundsPlayer({fetch:async r=>{seen.push(r.url);return new Response("import './mobile-background.mjs';",{headers:{'content-type':'application/javascript'}});}},[]);
 for(const name of ['frame.mjs','mobile-background.mjs','mobile-display-data.mjs','smartsoft-mobile.mjs','backgrounds/'+('a'.repeat(64))+'.png'])assert.equal((await app.fetch(new Request('https://player.test'+PREFIX+name),{PORTAL:'player'})).status,200);
 assert.equal(seen.length,5);
 assert.equal((await app.fetch(new Request('https://player.test'+PREFIX+'private.mjs'),{PORTAL:'player'})).status,404);
});
test('next-spin display clears the previous win without mutating accepted receipts',async()=>{
 const source=await readFile(new URL('../../deploy/smartsoft/mobile-rounds-r21.mjs',import.meta.url),'utf8'),context=vm.createContext({});
 vm.runInContext(source.replace(/^import.*\n/,'').replace('export {bindMobileScene};','').replaceAll('export function','function'),context);
 const round=Object.freeze({status:'active',currentCashoutMinor:'1234'}),state=Object.freeze({balance:'20.00',round,pending:true}),scene=Object.freeze({mobileState:state,commands:[]});
 const view=context.visibleMobileReceipt(scene);assert.equal(view.mobileState.round,null);assert.equal(view.mobileState.balance,'20.00');assert.equal(scene.mobileState.round,round);
 const stopped={...scene,mobileState:{...state,pending:false}};assert.equal(context.visibleMobileReceipt(stopped),stopped);
});
