import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ASSETS} from './remaining20-ice-controls-assets-r5.mjs';
import {ASSETS as OLD} from './remaining20-ice-controls-assets-r4.mjs';
import {installIceControlsR5,PREFIX} from './remaining20-ice-controls-worker-r5.mjs';
import {installIceControlsR5Assets} from './remaining20-ice-controls-library-r5.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(await fs.readFile(new URL('asset-manifest.json',import.meta.url),'utf8'));
const oldPrefix='/native-library/remaining20/20261109-ice-controls-r4/';
const calls=[],serviceCalls=[],checks=[];
const previous={scheduled(){return 'retained';},async fetch(request,env,ctx){calls.push({request,env,ctx});return new Response('<html><script type="module" src="'+oldPrefix+'app.mjs"></script></html>',{headers:{'content-type':'text/html','set-cookie':'original-session=kept'}});}};
const library=installIceControlsR5Assets(previous),player=installIceControlsR5(previous);
const env={PORTAL:'player',EXPANSION100:{fetch:request=>{serviceCalls.push(request);return library.fetch(request,{},{});}}};
for(const[name,asset]of Object.entries(ASSETS)){
 const req=new Request('https://example.test'+PREFIX+name,{headers:{cookie:'PRIVATE',authorization:'PRIVATE'}});
 const response=await player.fetch(req,env,{}),bytes=new Uint8Array(await response.arrayBuffer());
 assert.equal(response.status,200);assert.equal(bytes.length,manifest.assets[name].bytes);assert.equal(hash(bytes),manifest.assets[name].sha256);
 assert.equal(asset.bytes,bytes.length);assert.equal(asset.sha256,hash(bytes));
 assert.equal(serviceCalls.at(-1).headers.has('cookie'),false);assert.equal(serviceCalls.at(-1).headers.has('authorization'),false);
 assert.equal((await player.fetch(new Request(req.url,{method:'HEAD'}),env,{})).body,null);
 assert.equal((await player.fetch(new Request(req.url,{headers:{'if-none-match':'"'+asset.sha256+'"'}}),env,{})).status,304);
 assert.equal((await player.fetch(new Request(req.url,{method:'POST'}),env,{})).status,405);
 checks.push('immutable-body-hash-head-etag-method-and-credential-boundary:'+name);
}
const games=JSON.parse(ASSETS['demo-games.json'].body),oldGames=JSON.parse(OLD['demo-games.json'].body);
for(const id of ['burningice10_native','burningice40_native']){
 const name='presentation/manifests/'+id+'.json',current=JSON.parse(ASSETS[name].body),old=JSON.parse(OLD[name].body);
 assert.equal(old.audio['Start/WinToBalance.mp3'],undefined);
 const cue=current.audio['Start/WinToBalance.mp3'];assert.equal(ASSETS['art/'+cue.file].sha256,cue.sha256);
 const stripped=structuredClone(current);delete stripped.audio['Start/WinToBalance.mp3'];delete stripped.files[cue.file];assert.deepEqual(stripped,old);
 const game=games.find(g=>g.id===id),oldGame=oldGames.find(g=>g.id===id);
 assert.equal(game.referencePresentation.manifestSha256,ASSETS[name].sha256);assert.equal(game.referencePresentation.manifestURL,PREFIX+name);
 assert.deepEqual({...game,referencePresentation:oldGame.referencePresentation},oldGame);assert.equal(current.productionLaunchEnabled,false);
 const response=await player.fetch(new Request('https://example.test/demo/games/'+id),env,{}),html=await response.text();
 assert.equal(response.headers.get('set-cookie'),'original-session=kept');assert.equal(html.split(PREFIX+'app.mjs').length-1,1);assert.equal(html.includes(oldPrefix+'app.mjs'),false);
 checks.push('only-source-audio-added-and-one-client-entry:'+id);
}
for(const game of oldGames.filter(g=>!manifest.scope.includes(g.id)))assert.deepEqual(games.find(g=>g.id===game.id),game);
checks.push('all-other-game-configurations-unchanged');
for(const path of ['/','/games/multi_hot_5_native','/demo/games/coinminer_native','/demo/games/burningice_native','/api/remaining20/action','/api/remaining20/demo/action']){
 const request=new Request('https://example.test'+path,{method:path.startsWith('/api/')?'POST':'GET',...(path.startsWith('/api/')?{body:'unchanged-local-sentinel'}:{})}),ctx={};
 await player.fetch(request,env,ctx);assert.equal(calls.at(-1).request,request);assert.equal(calls.at(-1).ctx,ctx);
}
checks.push('all-other-pages-and-financial-requests-delegate-unchanged');
for(const name of ['reference-audio.mjs','controls.mjs','art/c8af5ebf42bc3402bcbfcd0e5348900b008697023eac255499271712c742fa24.webp']){
 await player.fetch(new Request('https://example.test'+PREFIX+name),env,{});assert.equal(calls.at(-1).request.url,'https://example.test'+oldPrefix+name);
}
checks.push('unmodified-client-and-art-fallback-to-r4');
assert.equal(player.scheduled(),'retained');checks.push('scheduled-handler-retained');
assert.equal(hash(ASSETS['app.mjs'].body),manifest.appSha256);
const reviewedApp=await fs.readFile(new URL('client/app.mjs',import.meta.url),'utf8');
assert.equal(ASSETS['app.mjs'].body,reviewedApp);
const outsideControlLayout=source=>source.replace(/function positionNativeControls\(result\)\{[\s\S]*?\nfunction syncNativeControls\(/,'function positionNativeControls(/* reviewed layout */){}\nfunction syncNativeControls(').replace("gameFetch('/native-library/remaining20/20261109-ice-controls-r4/games.json'","gameFetch(new URL('./games.json',import.meta.url).href");
assert.equal(outsideControlLayout(reviewedApp),outsideControlLayout(OLD['app.mjs'].body));
assert.equal(new URL('./games.json','https://example.test'+PREFIX+'app.mjs').pathname,PREFIX+'games.json');
assert.equal(ASSETS['app.mjs'].body.includes("gameFetch('/native-library/remaining20/20261109-ice-controls-r4/games.json'"),false);
checks.push('reviewed-mobile-client-binds-active-prefix-catalog');
const result={passed:checks.length,checks,assets:Object.keys(ASSETS).length,financialChanges:false,fullOfficialParity:false};
await fs.writeFile(new URL('verification-r5.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
