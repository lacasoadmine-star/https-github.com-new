import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {constructionQueue,queuePage,LIBRARY_PREFIX} from '../../deploy/smartsoft/construction-queue-r15.mjs';
import {installConstructionPlayer} from '../../deploy/smartsoft/construction-player-r15.mjs';
import {installConstructionLibrary} from '../../deploy/smartsoft/construction-library-r15.mjs';
import {installMobileDisplay} from '../../deploy/smartsoft/mobile-display-player-r15.mjs';

const source=JSON.parse(await readFile(new URL('../../deploy/smartsoft/official-queue-1000.json',import.meta.url)));
const original=JSON.parse(await readFile(new URL('../../deploy/smartsoft/official-queue-69.json',import.meta.url)));
const queue=constructionQueue(source),PREFIX='/native-library/remaining20/20261110-construction-r15/';
const DISPLAY_PREFIX='/native-library/remaining20/20261110-construction-r17/';
const page=query=>queuePage(queue,new URL('https://player.test/?'+query));

test('1000 real references retain the original 69, unique demos, title identity and closed financial gates',()=>{
 assert.equal(queue.referenceCount,1000);
 assert.equal(new Set(queue.games.map(game=>game.queueId)).size,1000);
 assert.equal(new Set(queue.games.map(game=>game.officialDemo)).size,1000);
 for(let i=0;i<69;i++)for(const key of ['providerKey','name','officialPage','officialDemo','officialIcon'])assert.equal(queue.games[i][key],original.games[i][key]);
 assert.ok(queue.games.every(game=>game.financialRelease===false&&game.presentationVerified===false));
 assert.ok(queue.games.filter(game=>game.provider==='hacksaw').every(game=>game.launcherObserved===true&&new URL(game.officialDemo).searchParams.get('mode')==='2'));
 for(const change of [q=>q.games[0].officialDemo='javascript:alert(1)',q=>q.games[0].financialRelease=true,q=>q.games[1].queueId=q.games[0].queueId,q=>q.referenceCount--]){
  const modified=structuredClone(source);change(modified);assert.throws(()=>constructionQueue(modified));
 }
});

test('pagination visits all titles once and filters exact studios without financial or account input',()=>{
 const ids=[];let offset=0;
 for(;;){const result=page('offset='+offset+'&limit=48');ids.push(...result.items.map(game=>game.queueId));if(result.nextOffset===null)break;offset=result.nextOffset;}
 assert.equal(ids.length,1000);assert.equal(new Set(ids).size,1000);
 assert.ok(page('q=book%20of%20dead').items.some(game=>game.name==='Book of Dead'));
 assert.ok(page('studio=SmartSoft+Gaming').items.every(game=>game.provider==='smartsoft'));
 for(const query of ['offset=-1','limit=0','limit=1000','offset=1.5','offset=1&offset=2','player_id=private','studio=Unknown','q='+('a'.repeat(121))])assert.throws(()=>page(query));
 assert.equal(page('offset=1000').items.length,0);
});

test('public queue requests use the existing asset binding without credentials; every financial route remains identical',async()=>{
 const calls=[],assets=[],previous={scheduled(){return 7;},async fetch(request){calls.push(request);return new Response('retained',{headers:{'x-retained':'1'}});}};
 const app=installConstructionPlayer(previous),env={PORTAL:'player',EXPANSION100:{async fetch(request){assets.push(request);return Response.json({public:true},{headers:{'set-cookie':'must-not-leak'}});}}};
 assert.equal(app.scheduled,previous.scheduled);
 const response=await app.fetch(new Request('https://player.test/api/game-construction-queue?offset=24&limit=24',{headers:{cookie:'private',authorization:'Bearer private'}}),env);
 assert.equal(response.status,200);assert.equal(response.headers.get('set-cookie'),null);
 assert.equal(assets[0].headers.get('cookie'),null);assert.equal(assets[0].headers.get('authorization'),null);
 assert.equal(new URL(assets[0].url).pathname,LIBRARY_PREFIX+'games.json');
 assert.equal(new URL(assets[0].url).search,'?offset=24&limit=24');
 const before=assets.length;
 for(const path of ['/api/remaining20/action','/api/wallet/transfer','/games/multi_hot_5_native','/games/foxy_hot_20_native']){
  const request=new Request('https://player.test'+path,{method:path.startsWith('/api/')?'POST':'GET',headers:{cookie:'private'},...(path.startsWith('/api/')?{body:'exact original body'}:{})});
  const result=await app.fetch(request,env);assert.equal(await result.text(),'retained');assert.equal(calls.at(-1),request);
 }
 assert.equal(assets.length,before);
 assert.equal((await app.fetch(new Request('https://player.test/api/game-construction-queue',{method:'POST',body:'no'}),env)).status,405);
 assert.equal(assets.length,before);
});

test('library exposes public bounded pages only and never turns references into casino configuration',async()=>{
 const calls=[],previous={async fetch(request){calls.push(request);return new Response('original');}};
 const app=installConstructionLibrary(previous,{queue:source,resources:{}});
 const response=await app.fetch(new Request('https://library.test'+LIBRARY_PREFIX+'games.json?limit=24'),{});
 const data=await response.json();assert.equal(data.items.length,24);assert.equal(data.referenceCount,1000);
 assert.ok(data.items.every(game=>game.financialRelease===false&&!game.launchable&&!game.available));
 assert.equal((await app.fetch(new Request('https://library.test'+LIBRARY_PREFIX+'games.json?account=x'),{})).status,400);
 assert.equal((await app.fetch(new Request('https://library.test'+LIBRARY_PREFIX+'games.json',{method:'POST'}),{})).status,405);
 const request=new Request('https://library.test/v2/remaining20/action',{method:'POST',body:'retained'});
 await app.fetch(request,{});assert.equal(calls.at(-1),request);
});

test('public cover responses reject altered bytes and redirects before caching or exposing them',async()=>{
 const bytes=new Uint8Array([137,80,78,71]),modified=structuredClone(source);
 modified.games[0].cover={type:'image/png',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 const url='https://library.test'+LIBRARY_PREFIX+'covers/'+modified.games[0].queueId;
 let forwarded;
 const make=fetchImpl=>installConstructionLibrary({fetch:()=>new Response('original')},{queue:modified,resources:{}},{cache:null,fetchImpl:async(u,options)=>{forwarded={u,options};return fetchImpl();}});
 const good=await make(()=>new Response(bytes)).fetch(new Request(url),{});
 assert.equal(good.status,200);assert.deepEqual(new Uint8Array(await good.arrayBuffer()),bytes);
 assert.equal(forwarded.u,modified.games[0].officialIcon);assert.equal(forwarded.options.credentials,'omit');assert.equal(forwarded.options.redirect,'manual');
 assert.equal((await make(()=>Response.redirect('https://elsewhere.test')).fetch(new Request(url),{})).status,503);
 assert.equal((await make(()=>new Response(new Uint8Array([0,0,0,0]))).fetch(new Request(url),{})).status,503);
});

test('new display namespace preserves protected titles and changes no account request or receipt',async()=>{
 const calls=[],previous={async fetch(request){calls.push(request);const path=new URL(request.url).pathname;
  if(path==='/games/multihot100_native')return new Response('<html data-reference-frame="r14"><head><script src="/native-library/remaining20/20261110-reference-mobile-r14/5fddea498e1f0d39/app.mjs"></script></head><body>retained errors and account controls</body></html>',{headers:{'content-type':'text/html'}});
  return new Response('exact retained response');}};
 const app=installMobileDisplay(previous),env={PORTAL:'player'};
 const response=await app.fetch(new Request('https://player.test/games/multihot100_native'),env),html=await response.text();
 assert.ok(html.includes(DISPLAY_PREFIX+'5fddea498e1f0d39/app.mjs'));assert.ok(html.includes('retained errors and account controls'));assert.ok(html.includes('data-reference-display="r17"'));
 for(const path of ['/games/multi_hot_5_native','/games/foxy_hot_20_native','/api/remaining20/state?game_id=multihot100_native','/demo/games/multihot100_native']){
  const request=new Request('https://player.test'+path);assert.equal(await(await app.fetch(request,env)).text(),'exact retained response');assert.equal(calls.at(-1),request);
 }
});

test('portrait CSS backgrounds require a transparent scoped canvas and fail closed when its contract changes',async()=>{
 let call;
 const make=source=>installMobileDisplay({async fetch(request){call=request;if(request.url.includes('/runtime-r17/')&&!request.url.endsWith('mobile-runtime-r17.mjs'))return new Response('',{status:404});return new Response(source,{headers:{'content-type':'application/javascript'}});}});
 const path='https://player.test'+DISPLAY_PREFIX+'5fddea498e1f0d39/scene.mjs';
 const good=await make("export class Scene {constructor(canvas){this.ctx=canvas.getContext('2d',{alpha:false});}}").fetch(new Request(path,{headers:{cookie:'private',authorization:'Bearer private'}}),{PORTAL:'player'});
 assert.equal(good.status,200);assert.ok((await good.text()).includes("getContext('2d',{alpha:true})"));
 assert.equal(call.headers.get('cookie'),null);assert.equal(call.headers.get('authorization'),null);
 assert.equal((await make('changed canvas contract').fetch(new Request(path),{PORTAL:'player'})).status,503);
 const controls=await make('retained projection').fetch(new Request('https://player.test'+DISPLAY_PREFIX+'smartsoft-mobile.mjs',{headers:{cookie:'private',authorization:'Bearer private'}}),{PORTAL:'player'});
 assert.equal(await controls.text(),'retained projection');assert.equal(new URL(call.url).pathname,PREFIX+'runtime-r17/mobile-runtime-r17.mjs');assert.equal(call.headers.get('cookie'),null);assert.equal(call.headers.get('authorization'),null);
 for(const [namespace,file]of [['20261110-construction-r15','mobile-display.mjs'],['20261110-construction-r16','mobile-controls-r16.mjs']]){
  const publicPath='https://player.test/native-library/remaining20/'+namespace+'/';
  assert.equal((await make("canvas.getContext('2d',{alpha:false})").fetch(new Request(publicPath+'5fddea498e1f0d39/scene.mjs'),{PORTAL:'player'})).status,200);
  await make('retained earlier projection').fetch(new Request(publicPath+'smartsoft-mobile.mjs'),{PORTAL:'player'});assert.equal(new URL(call.url).pathname,PREFIX+file);
 }
});
