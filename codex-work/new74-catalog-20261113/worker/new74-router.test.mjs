import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const lobbySource=await readFile(new URL('../public/lobby.mjs',import.meta.url),'utf8');
const gameData=JSON.parse(lobbySource.match(/^const games = Object\.freeze\((\[.*\])\);/m)[1]);
const freshFiles=['index.html','lobby.mjs','lobby.css','entry-link.mjs',...gameData.filter(game=>game.image).map(game=>game.image.replace(/^\/new74\//,''))];
const {new74}=await import('./new74-router-r1.mjs');
const hash='b'.repeat(64), bytes=Uint8Array.from([0,1,2,3,4,5,6,7,8,9]);
function fixture({fail=false,missing=false}={}) {
  const keys=[];
  return {keys,env:{SSG_OFFICIAL_REFERENCES:{async getWithMetadata(key,options){keys.push(key);assert.deepEqual(options,{type:'arrayBuffer'});if(fail)throw Error('sample failure');return {value:missing?null:bytes.buffer.slice(0),metadata:{sha256:hash}};}}}};
}
const request=(path,options={})=>new Request('https://example.test'+path,options);

test('four lobby files and exact fresh poster use only new revision',async()=>{
  const f=fixture();
  assert.equal(freshFiles.length,63);
  for(const name of freshFiles){const result=await new74(request('/new74/'+name),f.env);assert.equal(result.status,200);assert.equal(f.keys.at(-1),'new74/20261113-all74-r1/'+name);}
  assert.equal((await new74(request('/new74/'),f.env)).status,200);assert.equal(f.keys.at(-1),'new74/20261113-all74-r1/index.html');
});
test('both existing games, support files and assets retain old revision',async()=>{
  const f=fixture();
  for(const game of ['001-multi-hot-5','002-multi-hot-10']){assert.equal((await new74(request('/new74/'+game),f.env)).status,200);assert.equal(f.keys.at(-1),'new74/20261113-pair01-r1/game.html');}
  for(const path of ['game.html','style.css','app.mjs','account.mjs','art.mjs','games.mjs','sprites.json','assets/multihot5/symbol.png','assets/multihot10/sound.mp3','assets/fonts/font.otf']){
    assert.equal((await new74(request('/new74/'+path),f.env)).status,200);assert.equal(f.keys.at(-1),'new74/20261113-pair01-r1/'+path);
  }
});
test('outside routes pass through, unknown files and unmapped game slugs do not read KV',async()=>{
  const f=fixture();
  for(const path of ['/','/api/player/casino/play','/api/machine-session','/new740/foo']) assert.equal(await new74(request(path),f.env),null);
  for(const path of ['private.json','003-invented-engine','assets/fresh74/'+'c'.repeat(64)+'.jpg','assets/fresh74/example.jpg','manifest-74.json']) assert.equal((await new74(request('/new74/'+path),f.env)).status,404);
  assert.deepEqual(f.keys,[]);
});
test('writes are rejected and canonical GET redirects without KV',async()=>{
  const f=fixture();assert.equal((await new74(request('/new74/',{method:'POST'}),f.env)).status,405);
  assert.equal((await new74(request('/new74'),f.env)).status,308);assert.deepEqual(f.keys,[]);
});
test('valid suffix and open-ended ranges have correct bytes and headers',async()=>{
  const f=fixture();
  for(const [range,body,contentRange] of [['bytes=-3',[7,8,9],'bytes 7-9/10'],['bytes=8-',[8,9],'bytes 8-9/10'],['bytes=2-4',[2,3,4],'bytes 2-4/10']]) {
    const response=await new74(request('/new74/assets/multihot10/sound.mp3',{headers:{Range:range}}),f.env);
    assert.equal(response.status,206);assert.equal(response.headers.get('Content-Range'),contentRange);assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],body);
  }
});
test('HEAD ignores Range and stale If-Range returns the complete representation',async()=>{
  const f=fixture();const head=await new74(request('/new74/assets/multihot10/sound.mp3',{method:'HEAD',headers:{Range:'bytes=2-4'}}),f.env);
  assert.equal(head.status,200);assert.equal(head.headers.get('Content-Length'),'10');assert.equal((await head.arrayBuffer()).byteLength,0);
  const stale=await new74(request('/new74/assets/multihot10/sound.mp3',{headers:{Range:'bytes=2-4','If-Range':'"old"'}}),f.env);
  assert.equal(stale.status,200);assert.equal((await stale.arrayBuffer()).byteLength,10);
  const fresh=await new74(request('/new74/assets/multihot10/sound.mp3',{headers:{Range:'bytes=2-4','If-Range':'"'+hash+'"'}}),f.env);
  assert.equal(fresh.status,206);
});
test('unsatisfiable range is416; multipart is ignored; cache validation is304',async()=>{
  const f=fixture();
  const bad=await new74(request('/new74/game.html',{headers:{Range:'bytes=10-'}}),f.env);assert.equal(bad.status,416);assert.equal(bad.headers.get('Content-Range'),'bytes */10');
  assert.equal((await new74(request('/new74/game.html',{headers:{Range:'bytes=0-1,3-4'}}),f.env)).status,200);
  assert.equal((await new74(request('/new74/game.html',{headers:{'If-None-Match':'"'+hash+'"'}}),f.env)).status,304);
});
test('KV missing/read failure returns bounded503 and exposes no diagnostic payload',async()=>{
  for(const option of [{fail:true},{missing:true}]){const f=fixture(option),response=await new74(request('/new74/'),f.env);assert.equal(response.status,503);assert.equal(response.headers.get('Retry-After'),'60');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.doesNotMatch(await response.text(),/sample failure/);}
});
