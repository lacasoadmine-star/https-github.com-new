import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {operationalGames,installOperationalLibrary,OPERATIONS,RELEASE_ID,HEALTH_URL,UI_PATH} from '../../deploy/smartsoft/operator-status-r16.mjs';
import {constructionQueue,queuePage,LIBRARY_PREFIX} from '../../deploy/smartsoft/construction-queue-r15.mjs';
import {installConstructionPlayer} from '../../deploy/smartsoft/construction-player-r15.mjs';
import {UI_SOURCE} from '../../deploy/smartsoft/operator-ui-source-r16.mjs';
const policy=JSON.parse(await readFile(new URL('../../deploy/smartsoft/operator-policy-r16.json',import.meta.url)));
const queue=constructionQueue(JSON.parse(await readFile(new URL('../../deploy/smartsoft/official-queue-1000.json',import.meta.url))));
const health=()=>({ready:true,accepting:true,games:OPERATIONS.map(game=>({...game,currency:'ETB',minStake:'1.00',maxStake:'40000.00',launchable:true,accepting:true,operatorRelease:{id:RELEASE_ID,providerPrivateMathVerified:false,completeReferenceParityVerified:false}}))});
const request=(query='')=>new Request('https://library.test'+LIBRARY_PREFIX+'games.json'+query,{headers:{cookie:'private',authorization:'Bearer private'}});

test('operational Play requires the exact existing versions, scope and live native status',()=>{
 const data=health();assert.equal(operationalGames(data).length,9);
 for(const game of OPERATIONS){assert.equal(game.version,policy.versions[game.id]);assert.equal(operationalGames(data).find(g=>g.id===game.id).href,'/games/'+game.id);}
 for(const mutate of [d=>d.ready=false,d=>d.accepting=false,d=>d.games[0].accepting=false,d=>d.games[0].launchable=false,d=>d.games[0].version='different',d=>d.games[0].operatorRelease.id='wrong',d=>d.games[0].currency='DMO',d=>d.games[0].operatorRelease.providerPrivateMathVerified=true,d=>d.games.push({...d.games[0]})]){
  const modified=structuredClone(data);mutate(modified);assert.ok(!operationalGames(modified).some(g=>g.id===OPERATIONS[0].id));
 }
 data.games.push({id:'coinminer_native',accepting:true,launchable:true});assert.equal(operationalGames(data).length,9);
});

test('same-origin queue status exposes only seven already built references and preserves all other evidence',async()=>{
 const calls=[],retained=[];
 const previous={scheduled(){},async fetch(req){retained.push(req);return Response.json(queuePage(queue,new URL(req.url)));}};
 const app=installOperationalLibrary(previous,{uiSource:UI_SOURCE,fetchImpl:async(url,options)=>{calls.push({url,options});return Response.json(health());}});
 assert.equal(app.scheduled,previous.scheduled);
 const response=await app.fetch(request('?limit=48&studio=SmartSoft+Gaming')),page=await response.json();
 assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('set-cookie'),null);
 assert.equal(page.operationalGames.length,9);assert.equal(page.referenceCount,1000);
 const all=await(await app.fetch(request('?offset=48&limit=48&studio=SmartSoft+Gaming'))).json();
 const active=[...page.items,...all.items].filter(g=>g.financialRelease);assert.equal(active.length,7);
 for(const game of active){assert.equal(game.playHref,'/games/'+game.nativeId);assert.equal(game.presentationVerified,false);assert.equal(game.status,'operator_live_reference_review_in_progress');}
 assert.equal(calls.length,1);assert.equal(calls[0].url,HEALTH_URL);assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.redirect,'manual');assert.deepEqual(calls[0].options.headers,{accept:'application/json'});
 const financial=new Request('https://library.test/v2/remaining20/action',{method:'POST',body:'exact retained transaction'});
 await app.fetch(financial);assert.equal(retained.at(-1),financial);assert.equal(calls.length,1);
});

test('fresh status failure removes Play; invalid queries do not reach the native engine',async()=>{
 let time=0,reads=0,healthy=true;
 const previous={async fetch(req){try{return Response.json(queuePage(queue,new URL(req.url)));}catch{return Response.json({error:'invalid'},{status:400});}}};
 const app=installOperationalLibrary(previous,{uiSource:UI_SOURCE,now:()=>time,fetchImpl:async()=>{reads++;return healthy?Response.json(health()):Response.redirect('https://different.test');}});
 assert.equal((await app.fetch(request('?account_id=private'))).status,400);assert.equal(reads,0);
 assert.equal((await(await app.fetch(request())).json()).operationalGames.length,9);assert.equal(reads,1);
 healthy=false;time=10001;
 const page=await(await app.fetch(request())).json();assert.deepEqual(page.operationalGames,[]);assert.ok(page.items.every(g=>g.financialRelease===false&&!g.playHref));
 assert.equal((await app.fetch(new Request('https://library.test'+UI_PATH,{method:'POST'}))).status,405);
 const head=await app.fetch(new Request(request().url,{method:'HEAD'}));assert.equal(await head.text(),'');
});

test('current browser code is shared once, and the Player sends no account credentials to it',async()=>{
 assert.equal(UI_SOURCE,await readFile(new URL('../../deploy/smartsoft/operator-ui-r16.mjs',import.meta.url),'utf8'));
 let forwarded;
 const app=installConstructionPlayer({async fetch(){return new Response('<html><head></head></html>',{headers:{'content-type':'text/html'}});}});
 const env={PORTAL:'player',EXPANSION100:{fetch:async req=>{forwarded=req;return new Response(UI_SOURCE);}}};
 await app.fetch(new Request('https://player.test/native-library/remaining20/20261110-construction-r15/queue-ui-r16.mjs',{headers:{cookie:'private'}}),env);
 assert.equal(new URL(forwarded.url).pathname,UI_PATH);assert.equal(forwarded.headers.get('cookie'),null);
 assert.ok((await(await app.fetch(new Request('https://player.test/'),env)).text()).includes('/queue-ui-r16.mjs'));
});
