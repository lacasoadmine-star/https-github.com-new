import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {autoplayVisual} from '../../deploy/smartsoft/autoplay-visual-r17.mjs';
import {installRuntimeLibrary,RUNTIME_PREFIX} from '../../deploy/smartsoft/runtime-library-r17.mjs';
import {installMobileDisplay} from '../../deploy/smartsoft/mobile-display-player-r15.mjs';
import {installConstructionPlayer} from '../../deploy/smartsoft/construction-player-r15.mjs';
import sources from '../../deploy/smartsoft/runtime-sources-r17.mjs';
import {gunzipSync} from 'node:zlib';

test('AUTO uses the title own stop sprite without changing controls geometry, receipts or math',()=>{
 const scene={modernMobileLayout:true,mobileState:{autoplayActive:true},commands:[{role:'mobile-control',control:'autoplay',frame:'idle'}],receipt:{id:'accepted'}};
 const manifest={id:'multihot5wild_native',controls:{autoPlay:{stop:'own-stop'}},frames:{'own-stop':{}}};
 const changed=autoplayVisual(scene,manifest);assert.equal(changed.commands[0].frame,'own-stop');assert.equal(changed.mobileState,scene.mobileState);assert.equal(changed.receipt,scene.receipt);assert.equal(scene.commands[0].frame,'idle');
 assert.equal(autoplayVisual(scene,{...manifest,id:'multi_hot_5_native'}),scene);
 assert.equal(autoplayVisual({...scene,mobileState:{autoplayActive:false}},manifest).commands[0].frame,'idle');
 const legacy=autoplayVisual({...scene,modernMobileLayout:false},{id:'burningice40_native',frames:{'@Mobile/Buttons/AutoPlayVertical':{}}});assert.equal(legacy.commands[0].frame,'@Mobile/Buttons/AutoPlayVertical');
});

test('only scoped immutable client resources use the existing library; financial requests retain identity',async()=>{
 const calls=[],previous={scheduled(){},fetch(req){calls.push(req);return new Response('retained');}};
 const library=installRuntimeLibrary(previous,sources);assert.equal(library.scheduled,previous.scheduled);
 const name=Object.keys(sources)[0],response=await library.fetch(new Request('https://library.test'+RUNTIME_PREFIX+name));
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'public, max-age=31536000, immutable');assert.equal(await response.text(),gunzipSync(Buffer.from(sources[name].base64,'base64')).toString());
 assert.equal((await library.fetch(new Request('https://library.test'+RUNTIME_PREFIX+name,{method:'POST'}))).status,405);
 const action=new Request('https://library.test/v2/remaining20/action',{method:'POST',body:'retained body'});await library.fetch(action);assert.equal(calls.at(-1),action);
 const forwarded=[];const app=installMobileDisplay(installConstructionPlayer(previous));
 const env={PORTAL:'player',EXPANSION100:{fetch(req){forwarded.push(req);return library.fetch(req);}}};
 const resource=new Request('https://player.test/native-library/remaining20/20261110-construction-r17/'+name,{headers:{cookie:'private',authorization:'Bearer private'}});
 assert.equal((await app.fetch(resource,env)).status,200);assert.equal(forwarded.at(-1).headers.get('cookie'),null);assert.equal(forwarded.at(-1).headers.get('authorization'),null);
});

test('source package retains versioned entry paths and only changes presentation controllers',async()=>{
 const evidence=JSON.parse(await readFile(new URL('../../deploy/smartsoft/runtime-evidence-r17.json',import.meta.url)));
 assert.equal(evidence.changedFinancialModules,0);assert.equal(evidence.originalModules.length,6);
 assert.ok(evidence.originalModules.every(r=>['app.mjs','smartsoft-startup.mjs'].includes(r.name)));
 for(const entry of Object.values(sources)){const code=gunzipSync(Buffer.from(entry.base64,'base64')).toString();assert.ok(!code.includes('fetch("/api/wallet')&&!code.includes('DATABASE_URL'));}
});
