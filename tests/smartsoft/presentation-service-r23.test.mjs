import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createPresentationService,GAME_GROUPS,PRESENTATION_PREFIX} from '../../deploy/smartsoft/presentation-service-r23.mjs';
import {installPresentationPlayer} from '../../deploy/smartsoft/presentation-player-r23.mjs';
import resources from '../../deploy/smartsoft/presentation-sources-r23.mjs';
const service=createPresentationService({release:'r23',resources});
const root='https://player.test',env={PORTAL:'player',NATIVE_PRESENTATION:service};
const page=id=>'<html data-native-shell="r22"><head><script type="module" src="/native-library/remaining20/20261110-rounds-r21/'+GAME_GROUPS[id]+'/app.mjs"></script><link rel="stylesheet" href="/native-library/remaining20/20261111-native-shell-r22/shell.css"><script src="/native-library/remaining20/20261111-native-shell-r22/shell.mjs"></script></head><body><main id="machineShell"></main></body></html>';
test('all nine existing account and demo paths use the child while preserving demo cookies',async()=>{
 const parent=installPresentationPlayer({fetch:async request=>new Response(page(new URL(request.url).pathname.split('/').at(-1)),{headers:{'content-type':'text/html','set-cookie':'demo=fixture; HttpOnly; Secure'}})});
 for(const id of Object.keys(GAME_GROUPS))for(const prefix of ['/games/','/demo/games/']){
  const response=await parent.fetch(new Request(root+prefix+id),env,{}),body=await response.text();
  assert.equal(response.headers.get('set-cookie'),'demo=fixture; HttpOnly; Secure');
  assert.ok(body.includes('/native-ui/entry/'+id+'.mjs'));assert.ok(body.includes('data-presentation-service="bound"'));
  assert.ok(!body.includes('20261111-native-shell-r22/shell'));assert.equal(response.headers.get('cache-control'),'no-store');
 }
});
test('public service binding strips original identity headers and query strings',async()=>{
 let captured;
 const parent=installPresentationPlayer({fetch(){throw Error('WRONG_UPSTREAM');}});
 const response=await parent.fetch(new Request(root+'/native-ui/status?session=private',{headers:{cookie:'account=secret',authorization:'Bearer secret','X-Zplay-Library-Session':'private'}}),{PORTAL:'player',NATIVE_PRESENTATION:{fetch(request){captured=request;return new Response('{}',{headers:{'content-type':'application/json','set-cookie':'wrong=secret'}});}}},{});
 assert.equal(captured.url,'https://native-presentation.internal/native-ui/status');
 assert.deepEqual([...captured.headers],[['accept','*/*']]);assert.equal(response.headers.get('set-cookie'),null);
});
test('APIs, protected two games, other portals and missing binding keep the original implementation',async()=>{
 const original=new Response('original');let calls=0;
 const parent=installPresentationPlayer({fetch:async()=>{calls++;return original;}});
 for(const path of ['/api/remaining20/action','/api/remaining20/demo/action','/games/multi_hot_5_native','/games/foxy_hot_20_native','/'])assert.equal(await parent.fetch(new Request(root+path),env,{}),original);
 assert.equal(await parent.fetch(new Request(root+'/games/burningice_native'),{PORTAL:'player'},{}),original);
 assert.equal(await parent.fetch(new Request(root+'/native-ui/status'),{PORTAL:'admin'},{}),original);
 assert.equal(calls,7);
 assert.equal((await parent.fetch(new Request(root+'/native-ui/status',{method:'POST'}),env,{})).status,405);
});
test('a changed retained shell remains usable rather than breaking existing gameplay',async()=>{
 const original=new Response('<html><body>existing</body></html>',{headers:{'content-type':'text/html'}});
 const parent=installPresentationPlayer({fetch:async()=>original});const log=console.error;console.error=()=>{};
 try{assert.equal(await parent.fetch(new Request(root+'/games/burningice_native'),env,{}),original);assert.equal(await original.text(),'<html><body>existing</body></html>');}finally{console.error=log;}
});
test('stable entry pointers select immutable modules for every title; HEAD is empty',async()=>{
 for(const[id,group]of Object.entries(GAME_GROUPS)){
  const response=await service.fetch(new Request(root+PRESENTATION_PREFIX+'entry/'+id+'.mjs'));
  assert.equal(response.headers.get('cache-control'),'no-store');assert.ok((await response.text()).includes('/native-ui/releases/r23/'+group+'/app.mjs'));
 }
 for(const path of ['shell.mjs','shell.css','status','releases/r23/shell.css']){
  const head=await service.fetch(new Request(root+PRESENTATION_PREFIX+path,{method:'HEAD'}));assert.equal(head.status,200);assert.equal(await head.text(),'');
 }
});
test('child is a read-only presentation service with no financial endpoints',async()=>{
 for(const path of ['/api/remaining20/action','/native-ui/unknown','/native-ui/releases/r24/shell.mjs'])assert.equal((await service.fetch(new Request(root+path))).status,404);
 assert.equal((await service.fetch(new Request(root+'/native-ui/status',{method:'POST'}))).status,405);
 const status=await(await service.fetch(new Request(root+'/native-ui/status'))).json();assert.equal(status.games.length,9);assert.equal(status.financialActions,false);
});
test('a child-only release update changes active apps and retains open clients while parent routes stay identical',async()=>{
 const next=createPresentationService({release:'r24',resources,retainedReleases:{r23:resources}});
 const parent=installPresentationPlayer({fetch:async()=>new Response(page('burningice_native'),{headers:{'content-type':'text/html'}})});
 const before=await(await parent.fetch(new Request(root+'/games/burningice_native'),env,{})).text();
 const after=await(await parent.fetch(new Request(root+'/games/burningice_native'),{...env,NATIVE_PRESENTATION:next},{})).text();
 assert.equal(before,after);
 const pointer=await parent.fetch(new Request(root+'/native-ui/entry/burningice_native.mjs'),{...env,NATIVE_PRESENTATION:next},{});
 assert.ok((await pointer.text()).includes('/releases/r24/'));assert.equal(pointer.headers.get('x-superwin-presentation-release'),'r24');
 assert.equal((await next.fetch(new Request(root+'/native-ui/releases/r23/shell.mjs'))).status,200);
});
test('a temporarily unavailable child leaves the retained game app and shell available',async()=>{
 const parent=installPresentationPlayer({fetch(){throw Error('WRONG_UPSTREAM');}});
 const failed={PORTAL:'player',NATIVE_PRESENTATION:{fetch(){throw Error('TEMPORARILY_UNAVAILABLE');}}};
 for(const path of ['/native-ui/entry/burningice_native.mjs','/native-ui/releases/r23/3d420e4fe5830b46/app.mjs','/native-ui/shell.mjs','/native-ui/shell.css']){
  const response=await parent.fetch(new Request(root+path),failed,{});assert.equal(response.status,200);assert.equal(response.headers.get('x-superwin-presentation-fallback'),'r22');assert.equal(response.headers.get('cache-control'),'no-store');
 }
 assert.equal((await parent.fetch(new Request(root+'/native-ui/status'),failed,{})).status,503);
});
test('every packed public resource matches its hash and app dependencies stay on their retained namespace',async()=>{
 for(const[name,row]of Object.entries(resources)){
  const bytes=gunzipSync(Buffer.from(row.base64,'base64'));
  assert.equal(bytes.length,row.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
  const response=await service.fetch(new Request(root+'/native-ui/releases/r23/'+name));assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
  assert.match(response.headers.get('cache-control'),/immutable/);
  if(name.endsWith('/app.mjs')){const source=bytes.toString();assert.ok(source.includes('/native-library/remaining20/20261110-rounds-r21/'));assert.ok(!source.includes('import.meta.url'));assert.ok(source.includes('location.origin'));}
 }
});
