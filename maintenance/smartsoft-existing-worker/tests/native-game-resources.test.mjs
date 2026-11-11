// Real local SQLite persistence and HTTP read contracts. No production requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {NativeGameResources,NATIVE_RESOURCE_SCHEMA,NATIVE_RESOURCE_PREFIX,NATIVE_RESOURCE_CHUNK_BYTES,nativeResourceGame,nativeResourceInstance} from '../native-game-resources.mjs';

const path=NATIVE_RESOURCE_PREFIX+'multi-hot-20/assets/symbol-seven.webp';
const request=(headers={},method='GET',file=path)=>new Request('https://superwin-player.apdiy61.workers.dev'+file,{headers,method});
function context(db){return {storage:{sql:{exec(sql,...params){
 if(!params.length&&sql.includes(';')){db.exec(sql);return {toArray:()=>[]};}
 const statement=db.prepare(sql);return {toArray:()=>statement.all(...params)};
 }}},blockConcurrencyWhile(fn){return fn();}};}
function put(db,body,file=path){
 const version=createHash('sha256').update(body).digest('hex');
 const chunks=Math.ceil(body.length/NATIVE_RESOURCE_CHUNK_BYTES);
 for(let i=0;i<chunks;i++)db.prepare('INSERT OR REPLACE INTO native_game_chunks VALUES(?,?,?,?)').run(file,version,i,body.subarray(i*NATIVE_RESOURCE_CHUNK_BYTES,(i+1)*NATIVE_RESOURCE_CHUNK_BYTES).toString('base64'));
 db.prepare('INSERT OR REPLACE INTO native_game_files VALUES(?,?,?,?,?)').run(file,version,body.length,chunks,version);
 return version;
}

test('binary survives SQLite persistence and an instance restart; objects remain separate',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'native-assets-'));const disk=join(dir,'game.sqlite');
 let db=new DatabaseSync(disk),store=new NativeGameResources(context(db));
 const body=Buffer.alloc(NATIVE_RESOURCE_CHUNK_BYTES+321);for(let i=0;i<body.length;i++)body[i]=i%256;
 const digest=put(db,body);db.close();
 db=new DatabaseSync(disk);store=new NativeGameResources(context(db));
 const response=await store.fetch(request());assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/webp');
 assert.deepEqual(Buffer.from(await response.arrayBuffer()),body);assert.equal(response.headers.get('etag'),'"'+digest+'"');
 const separate=new DatabaseSync(':memory:');const isolated=new NativeGameResources(context(separate));
 assert.equal((await isolated.fetch(request())).status,404);
 assert.notEqual(nativeResourceInstance('multi-hot-20'),nativeResourceInstance('multi-hot-40'));
 separate.close();db.close();rmSync(dir,{recursive:true});
});

test('byte ranges, suffix ranges, HEAD and ETag retain the correct wire contract',async()=>{
 const db=new DatabaseSync(':memory:');const store=new NativeGameResources(context(db));
 const body=Buffer.alloc(NATIVE_RESOURCE_CHUNK_BYTES+100);for(let i=0;i<body.length;i++)body[i]=i%251;
 const digest=put(db,body);const start=NATIVE_RESOURCE_CHUNK_BYTES-5,end=start+20;
 const partial=await store.fetch(request({range:`bytes=${start}-${end}`}));
 assert.equal(partial.status,206);assert.equal(partial.headers.get('content-range'),`bytes ${start}-${end}/${body.length}`);
 assert.deepEqual(Buffer.from(await partial.arrayBuffer()),body.subarray(start,end+1));
 const suffix=await store.fetch(request({range:'bytes=-21'}));assert.deepEqual(Buffer.from(await suffix.arrayBuffer()),body.subarray(-21));
 const head=await store.fetch(request({},'HEAD'));assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),String(body.length));assert.equal((await head.arrayBuffer()).byteLength,0);
 const unchanged=await store.fetch(request({'if-none-match':'"'+digest+'"'}));assert.equal(unchanged.status,304);assert.equal((await unchanged.arrayBuffer()).byteLength,0);
 for(const range of ['bytes=4-2','bytes=0-1,8-9','bytes=-0',`bytes=${body.length}-`])assert.equal((await store.fetch(request({range}))).status,416);
 const ifRange=await store.fetch(request({range:'bytes=0-3','if-range':'"stale"'}));assert.equal(ifRange.status,200);
 db.close();
});

test('no public write, archive, reference, old-game or directory traversal route is accepted',async()=>{
 const db=new DatabaseSync(':memory:');const store=new NativeGameResources(context(db));
 assert.equal((await store.fetch(request({},'PUT'))).status,405);
 for(const file of ['/smartsoft-references','/archive/multi-hot-20.tar.gz',NATIVE_RESOURCE_PREFIX+'multi-hot-5/index.html',NATIVE_RESOURCE_PREFIX+'multi-hot-20/09-network/capture-manifest.json',NATIVE_RESOURCE_PREFIX+'multi-hot-20/assets/../../wallet.json'])assert.equal((await store.fetch(request({},'GET',file))).status,404);
 assert.equal(nativeResourceGame(path),'multi-hot-20');assert.equal(nativeResourceGame(path+'?x=1'),null);
 db.close();
});

test('uncommitted uploads cannot serve; missing or damaged chunks fail without partial content',async()=>{
 const db=new DatabaseSync(':memory:');const store=new NativeGameResources(context(db));
 const body=Buffer.from([0,255,42,9]);const version=createHash('sha256').update(body).digest('hex');
 db.prepare('INSERT INTO native_game_chunks VALUES(?,?,?,?)').run(path,version,0,body.toString('base64'));
 assert.equal((await store.fetch(request())).status,404);
 put(db,body);db.prepare('UPDATE native_game_chunks SET data=?').run('!invalid-base64!');
 assert.equal((await store.fetch(request())).status,503);
 db.prepare('DELETE FROM native_game_chunks').run();assert.equal((await store.fetch(request())).status,503);
 db.close();
});
