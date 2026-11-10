import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {retainedModules, publishContent, unreachablePrune} from '../../deploy/smartsoft/publish-content.mjs';

test('size cleanup can prune only the allowlisted modules outside the complete entry graph',()=>{
 const encode=value=>new TextEncoder().encode(value);
 const old='expansion-client-assets-20261108.mjs';
 const retained=[{name:'previous.mjs',body:encode('export default {};')},{name:old,body:encode('export default {};')}];
 assert.deepEqual(unreachablePrune(retained,{'new.mjs':"import x from './previous.mjs';export default x;"},'new.mjs',[old]).map(p=>p.name),['previous.mjs']);
 assert.throws(()=>unreachablePrune(retained,{'new.mjs':"export * from './"+old+"';"},'new.mjs',[old]),/REACHABLE/);
 assert.throws(()=>unreachablePrune(retained,{'new.mjs':'export default {}'},'new.mjs',['worker.mjs']),/SCOPE/);
});

function multipart(parts) {
  const buffers = [];
  for (const part of parts) {
    buffers.push(Buffer.from('--preserved-boundary\r\nContent-Disposition: form-data; name="' + part.name + '"\r\n' + (part.type ? 'Content-Type: ' + part.type + '\r\n' : '') + '\r\n'));
    buffers.push(Buffer.from(part.body)); buffers.push(Buffer.from('\r\n'));
  }
  buffers.push(Buffer.from('--preserved-boundary--\r\n'));
  return Buffer.concat(buffers);
}

test('downloaded Worker modules preserve arbitrary binary bytes and declared MIME types', () => {
  const source = [{name:'entry.mjs', body:'export default {};'}, {name:'machine-data/presentation.mjs.bin', type:'application/octet-stream', body:new Uint8Array([0,128,255,13,10,45,45,12,0,195,40])}];
  const parts = retainedModules(multipart(source));
  assert.equal(parts.length, 2);
  assert.equal(parts[0].type, 'application/javascript+module');
  assert.equal(parts[1].type, 'application/octet-stream');
  assert.deepEqual(parts[1].body, source[1].body);
  assert.throws(() => retainedModules(new Uint8Array([1,2,3])), /INVALID_WORKER_MULTIPART/);
});

test('stale Worker heads stop before any upload', async () => {
  const calls = [];
  const cloudflare = {async request(options) { calls.push(options); return {result:[{id:'superwin-player',etag:'changed'}]}; }};
  await assert.rejects(publishContent({cloudflare, accountId:'existing',scriptName:'superwin-player',expectedEtag:'reviewed',mainModule:'account.mjs',modules:{'account.mjs':'export default {};'}}), /WORKER_CHANGED/);
  assert.equal(calls.length, 1); assert.equal(calls[0].method, 'GET');
});

test('content-only uploads retain every old module and address only the existing Worker', async () => {
  const original = [{name:'remaining20-accepted-controls-player-entry-r12.mjs',body:'export default {};'}, {name:'remaining20-worker-20261109.mjs',body:'export const transport = true;'}, {name:'old.br',body:new Uint8Array([255,0,128,195,40])}];
  const calls = [];
  const cloudflare = {async request(options) {
    calls.push(options);
    if (options.path.endsWith('/scripts')) return {result:[{id:'superwin-player',etag:'reviewed'}]};
    if (options.method === 'GET') return multipart(original);
    return {success:true};
  }};
  const result = await publishContent({cloudflare,accountId:'existing',scriptName:'superwin-player',expectedEtag:'reviewed',mainModule:'account.mjs',modules:{'account.mjs':'export default {};'}});
  assert.equal(result.retainedModuleCount, 3);
  const upload = calls.find(call => call.method === 'PUT');
  assert.equal(upload.path, '/accounts/existing/workers/scripts/superwin-player/content');
  assert.deepEqual(JSON.parse(await upload.body.get('metadata').text()), {main_module:'account.mjs'});
  for (const part of original) assert.deepEqual(new Uint8Array(await upload.body.get(part.name).arrayBuffer()), new Uint8Array(Buffer.from(part.body)));
  assert.equal(await upload.body.get('account.mjs').text(), 'export default {};');
});
test('the existing library content can grow without replacing its original assets or durable object module',async()=>{
 const original=[{name:'remaining20-accepted-controls-library-entry-r12.mjs',body:'export {RetainedObject} from "./library.mjs";'}, {name:'library.mjs',body:'export class RetainedObject{}'}, {name:'art.bin',type:'application/octet-stream',body:new Uint8Array([255,0,128])}];
 let upload;const cloudflare={async request(options){if(options.path.endsWith('/scripts'))return {result:[{id:'superwin-library-100',etag:'reviewed'}]};if(options.method==='GET')return multipart(original);upload=options;return {success:true};}};
 const result=await publishContent({cloudflare,accountId:'existing',scriptName:'superwin-library-100',expectedEtag:'reviewed',mainModule:'reference-library-entry-r14.mjs',modules:{'reference-library-entry-r14.mjs':'export * from "./remaining20-accepted-controls-library-entry-r12.mjs";'}});
 assert.equal(result.retainedModuleCount,3);assert.equal(upload.path,'/accounts/existing/workers/scripts/superwin-library-100/content');
 for(const part of original)assert.deepEqual(new Uint8Array(await upload.body.get(part.name).arrayBuffer()),new Uint8Array(Buffer.from(part.body)));
 assert.deepEqual(JSON.parse(await upload.body.get('metadata').text()),{main_module:'reference-library-entry-r14.mjs'});
});

test('only the exact reviewed account lobby module can be replaced; financial modules remain immutable', async () => {
  const lobby = 'export const LOBBY_SOURCE="old";', name = 'account-lobby-source-r13.mjs';
  const digest = createHash('sha256').update(lobby).digest('hex');
  const original = [{name:'remaining20-accepted-controls-player-entry-r12.mjs',body:'export default {};'}, {name:'remaining20-worker-20261109.mjs',body:'export const transport = true;'}, {name,body:lobby}];
  const calls = [];
  const cloudflare = {async request(options) { calls.push(options); if(options.path.endsWith('/scripts'))return {result:[{id:'superwin-player',etag:'reviewed'}]};if(options.method==='GET')return multipart(original);return {success:true}; }};
  const options = {cloudflare,accountId:'existing',scriptName:'superwin-player',expectedEtag:'reviewed',mainModule:original[0].name,modules:{[name]:'export const LOBBY_SOURCE="updated";'},replacementHashes:{[name]:digest}};
  const result = await publishContent(options);
  assert.equal(result.retainedModuleCount, 2);assert.deepEqual(result.replacedModules,[name]);assert.deepEqual(result.addedModules,[]);
  assert.equal(await calls.find(call=>call.method==='PUT').body.get(name).text(), options.modules[name]);
  calls.length=0;
  await assert.rejects(publishContent({...options,replacementHashes:{[name]:'0'.repeat(64)}}), /OWNED_MODULE_CHANGED/);
  assert.ok(calls.every(call=>call.method==='GET'));
  await assert.rejects(publishContent({...options,modules:{'remaining20-worker-20261109.mjs':'changed'},replacementHashes:{'remaining20-worker-20261109.mjs':digest}}), /MODULE_COLLISION/);
});

test('the owned size-constrained Player entry can be replaced only under its reviewed hash',async()=>{
 const name='construction-player-entry-r15.mjs',old='export default {fetch(){return new Response("retained");}};';
 const parts=[{name:'remaining20-accepted-controls-player-entry-r12.mjs',body:'export default {};'}, {name:'remaining20-worker-20261109.mjs',body:'export default {};'}, {name,body:old}];
 let writes=0;const cloudflare={async request(options){if(options.path.endsWith('/scripts'))return {result:[{id:'superwin-player',etag:'reviewed'}]};if(options.method==='GET')return multipart(parts);writes++;return {success:true};}};
 const args={cloudflare,accountId:'existing',scriptName:'superwin-player',expectedEtag:'reviewed',mainModule:name,modules:{[name]:'export default {};'}};
 await assert.rejects(publishContent(args),/MODULE_COLLISION/);assert.equal(writes,0);
 await publishContent({...args,replacementHashes:{[name]:createHash('sha256').update(old).digest('hex')}});assert.equal(writes,1);
});
