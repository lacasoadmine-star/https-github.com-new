import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkerMultipart, appendWorkerParts } from './multipart.mjs';
const encoder = new TextEncoder();
const make = (name='old.bin',body='\u0000\u00ffbinary') => encoder.encode('--fixture\r\nContent-Disposition: form-data; name="'+name+'"; filename="'+name+'"\r\nContent-Type: application/octet-stream\r\n\r\n'+body+'\r\n--fixture--\r\n');
test('parse returns exact binary views and a closing boundary',()=>{
 const bytes=make(), parsed=parseWorkerMultipart(bytes);
 assert.equal(parsed.parts.length,1); assert.equal(parsed.boundary,'fixture');
 assert.equal(parsed.parts[0].body.buffer,bytes.buffer);
 assert.deepEqual(parsed.parts[0].body,encoder.encode('\u0000\u00ffbinary'));
 assert.equal(new TextDecoder().decode(bytes.subarray(parsed.closingOffset)),'--fixture--\r\n');
});
test('stream append preserves every old module byte and adds only named parts',async()=>{
 const bytes=make(),parsed=parseWorkerMultipart(bytes);
 const result=appendWorkerParts(bytes,parsed,[{name:'fix/entry.mjs',contentType:'application/javascript+module',content:'export default {};'}, {name:'metadata',contentType:'application/json',content:'{"main_module":"fix/entry.mjs"}'}]);
 const output=new Uint8Array(await new Response(result.body).arrayBuffer());
 assert.equal(output.length,result.byteLength);
 const next=parseWorkerMultipart(output);
 assert.equal(next.parts.length,3); assert.deepEqual(next.parts[0].body,parsed.parts[0].body);
 assert.equal(new TextDecoder().decode(next.parts[2].body),'{"main_module":"fix/entry.mjs"}');
 const text=new TextDecoder().decode(output);
 assert.match(text,/name="old.bin"; filename="old.bin"/);
 assert.match(text,/name="metadata"\r\nContent-Type: application\/json/);
});
test('download parts lacking MIME and filename become typed file parts without byte changes',async()=>{
 const source=encoder.encode('--fixture\r\nContent-Disposition: form-data; name="old.mjs"\r\n\r\nexport default {};\r\n--fixture--\r\n');
 const parsed=parseWorkerMultipart(source), result=appendWorkerParts(source,parsed,[]);
 const output=new Uint8Array(await new Response(result.body).arrayBuffer()), next=parseWorkerMultipart(output);
 assert.equal(next.parts[0].contentType,'application/javascript+module');
 assert.deepEqual(next.parts[0].body,parsed.parts[0].body);
 assert.match(new TextDecoder().decode(output),/name="old.mjs"; filename="old.mjs"/);
});
test('untyped unknown extensions fail before an upload body can be used',()=>{
 const source=encoder.encode('--fixture\r\nContent-Disposition: form-data; name="unknown.ext"\r\n\r\nbytes\r\n--fixture--\r\n');
 assert.throws(()=>appendWorkerParts(source,parseWorkerMultipart(source),[]),/Unknown downloaded module type/);
});
test('parser rejects missing terminator and duplicate module names',()=>{
 assert.throws(()=>parseWorkerMultipart(make().subarray(0,make().length-6)));
 const data=new TextDecoder().decode(make());
 assert.throws(()=>parseWorkerMultipart(encoder.encode(data.replace('--fixture--\r\n',data))));
});
test('append rejects collisions and header injection before streaming',()=>{
 const bytes=make(),parsed=parseWorkerMultipart(bytes);
 assert.throws(()=>appendWorkerParts(bytes,parsed,[{name:'old.bin',contentType:'text/plain',content:'changed'}]));
 assert.throws(()=>appendWorkerParts(bytes,parsed,[{name:'bad\r\nname',contentType:'text/plain',content:'x'}]));
});
