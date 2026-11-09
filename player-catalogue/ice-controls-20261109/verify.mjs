import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ASSETS} from './remaining20-ice-controls-assets-r4.mjs';
import {installIceControls,PREFIX} from './remaining20-ice-controls-worker-r4.mjs';
let count=0;const calls=[];
const old='/native-library/remaining20/20261109-r5-seven-review1/';
const previous={scheduled(){return 'unchanged';},async fetch(request){calls.push(request.url);return new Response('<html><script type="module" src="'+old+'app.mjs"></script></html>',{headers:{'content-type':'text/html','set-cookie':'demo-test=preserved'}});}};
const app=installIceControls(previous),env={PORTAL:'player'};
for(const[name,item]of Object.entries(ASSETS)){
 const response=await app.fetch(new Request('https://example.test'+PREFIX+name),env,{}),bytes=new Uint8Array(await response.arrayBuffer());
 assert.equal(bytes.length,item.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);count+=2;
 const head=await app.fetch(new Request('https://example.test'+PREFIX+name,{method:'HEAD'}),env,{});assert.equal((await head.arrayBuffer()).byteLength,0);count++;
}
for(const id of ['burningice10_native','burningice40_native']){
 const response=await app.fetch(new Request('https://example.test/demo/games/'+id),env,{});
 assert.equal(response.headers.get('set-cookie'),'demo-test=preserved');assert.ok((await response.text()).includes(PREFIX+'app.mjs'));count+=2;
}
for(const path of ['/','/api/remaining20/demo/action','/games/multi_hot_5_native','/demo/games/coinminer_native','/demo/games/burningice_native']){
 const response=await app.fetch(new Request('https://example.test'+path),env,{});assert.ok((await response.text()).includes(old+'app.mjs'));assert.equal(calls.at(-1),'https://example.test'+path);count+=2;
}
assert.equal(app.scheduled(),'unchanged');count++;
const catalog=JSON.parse(ASSETS['demo-games.json'].body);
for(const id of ['burningice10_native','burningice40_native']){
 const game=catalog.find(g=>g.id===id),file='presentation/manifests/'+id+'.json',manifest=JSON.parse(ASSETS[file].body);
 assert.equal(game.referencePresentation.manifestSha256,ASSETS[file].sha256);
 assert.equal(manifest.productionLaunchEnabled,false);
 assert.equal(manifest.controls.collect.idle,'Buttons/DoubleTake');
 for(const[file,record]of Object.entries(manifest.files))if(ASSETS['art/'+file])assert.equal(record.sha256,ASSETS['art/'+file].sha256);
 count+=3;
}
console.log(JSON.stringify({checks:count,assets:Object.keys(ASSETS).length,oldRoutesPreserved:true,financialChanges:false}));
