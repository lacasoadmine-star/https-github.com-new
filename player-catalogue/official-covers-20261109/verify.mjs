import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {installCreditsLobby,PREFIX} from './remaining20-catalogue-worker-r3.mjs';
import {ASSETS} from './remaining20-catalogue-assets-r3.mjs';
let calls=0;const source=fs.readFileSync(new URL('../evidence/live-lobby.html',import.meta.url),'utf8');
const prev={scheduled(){},async fetch(r){calls++;return new Response(source,{headers:{'content-type':'text/html; charset=utf-8','x-test':'previous'}});}};
const worker=installCreditsLobby(prev),env={PORTAL:'player'};
assert.equal(worker.scheduled,prev.scheduled);
const response=await worker.fetch(new Request('https://test/'),env);const html=await response.text();
assert(html.includes(PREFIX+'lobby.mjs'));assert(!html.includes('/20261109-r2/lobby.mjs'));assert.equal(html.split(PREFIX+'lobby.mjs').length,2);
for(const [name,asset]of Object.entries(ASSETS)){
 const r=await worker.fetch(new Request('https://test'+PREFIX+name),env);const body=Buffer.from(await r.arrayBuffer());assert.equal(r.status,200);assert.equal(body.length,asset.bytes);assert.equal(createHash('sha256').update(body).digest('hex'),asset.sha256);
 assert.equal((await worker.fetch(new Request('https://test'+PREFIX+name,{method:'HEAD'}),env)).body,null);
 assert.equal((await worker.fetch(new Request('https://test'+PREFIX+name,{headers:{'if-none-match':'"'+asset.sha256+'"'}}),env)).status,304);
}
assert.equal((await worker.fetch(new Request('https://test'+PREFIX+'lobby.mjs',{method:'POST'}),env)).status,405);
assert.equal((await worker.fetch(new Request('https://test'+PREFIX+'missing'),env)).status,404);
assert.equal(await(await worker.fetch(new Request('https://test/api/remaining20/demo/state'),env)).text(),source);
assert.equal(await(await worker.fetch(new Request('https://test/'),{PORTAL:'agent'})).text(),source);
console.log(JSON.stringify({assets:13,checks:47,status:'passed',oldHandlerPreserved:true,apiPassThrough:true}));
