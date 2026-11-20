import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMultipart,verifyParts,sha256,makeUploadForm,versionMetadata} from './worker-version-transfer.mjs';
const enc=new TextEncoder();
function fixture(){
 const parts=[['entry/main.mjs',enc.encode('export default {};\n')],['images/a.bin',new Uint8Array([0,255,254,13,10,37,128,0])]],fragments=[];
 for(const [name,bytes] of parts)fragments.push(enc.encode('--b-test\r\nContent-Disposition: form-data; name="'+name+'"\r\n\r\n'),bytes,enc.encode('\r\n'));
 fragments.push(enc.encode('--b-test--\r\n'));const body=new Uint8Array(fragments.reduce((n,b)=>n+b.length,0));let offset=0;for(const b of fragments){body.set(b,offset);offset+=b.length;}return {parts,body};
}
test('multipart preserves binary and trailing newline bytes exactly',async()=>{
 const f=fixture(),actual=parseMultipart(f.body);for(const [name,bytes] of f.parts)assert.deepEqual(actual.get(name),bytes);
 const inventory=await Promise.all(f.parts.map(async([name,bytes])=>({name,size:bytes.length,sha256:await sha256(bytes)})));assert.equal(await verifyParts(actual,inventory),true);
 actual.get('images/a.bin')[0]=1;await assert.rejects(verifyParts(actual,inventory),/BASELINE_MODULE_CHANGED/);
});
test('upload adds modules and inherits all binding identities without secret values',async()=>{
 const f=fixture(),parts=parseMultipart(f.body),version={resources:{script_runtime:{compatibility_date:'2026-10-01',usage_model:'standard',exports:{LocalDemoWallet:{type:'durable-object',storage:'sqlite'},NativeGameResources:{type:'durable-object',storage:'sqlite'},default:{type:'worker'}}},bindings:Array.from({length:18},(_,i)=>({name:'binding'+i,type:'secret_text'}))}};
 const metadata=versionMetadata(version,{mainModule:'native72dedicatedr1/entry.mjs',commitSha:'a'.repeat(40),message:'test',tag:'test'});assert.equal(metadata.keep_assets,true);assert.ok(metadata.bindings.every(b=>b.type==='inherit'&&Object.keys(b).length===2));assert.deepEqual(metadata.exports,version.resources.script_runtime.exports);assert.notEqual(metadata.exports,version.resources.script_runtime.exports);
 const form=makeUploadForm(parts,[{name:'native72dedicatedr1/entry.mjs',source:'export default {};'}],metadata);assert.deepEqual(new Uint8Array(await form.get('images/a.bin').arrayBuffer()),f.parts[1][1]);
 assert.equal(form.get('entry/main.mjs').type,'application/javascript+module');assert.equal(form.get('images/a.bin').type,'application/octet-stream');
 const entry={name:metadata.main_module,source:'export default {};'};
 assert.throws(()=>makeUploadForm(parts,[entry,{name:'entry/main.mjs',source:'changed'}],metadata),/NON_ADDITIVE_MODULE/);
 assert.throws(()=>makeUploadForm(parts,[entry,entry],metadata),/NON_ADDITIVE_MODULE/);
});

test('the second deployment keeps the first deployment module bytes',async()=>{
 const previous='native72dedicatedr1/entry.mjs', next='native72dedicatedmh40r3/entry.mjs';
 const previousSource=enc.encode('export default {version:1};');
 const parts=new Map([[previous,previousSource]]);
 const form=makeUploadForm(parts,[{name:next,source:'export default {version:2};'}],{main_module:next});
 assert.deepEqual(new Uint8Array(await form.get(previous).arrayBuffer()),previousSource);
 assert.equal(await form.get(next).text(),'export default {version:2};');
 assert.throws(()=>makeUploadForm(parts,[{name:previous,source:'replacement'}],{main_module:previous}),/NON_ADDITIVE_MODULE/);
});

test('the original games upload retains the active Worker module',async()=>{
 const name='current-player/entry.mjs',main='zplayoriginals1/entry.mjs';
 const retained=enc.encode('export default {fetch(){}};');
 const parts=new Map([[name,retained]]);
 const form=makeUploadForm(parts,[{name:main,source:'import previous from "../current-player/entry.mjs";export default previous;'}],{main_module:main});
 assert.deepEqual(new Uint8Array(await form.get(name).arrayBuffer()),retained);
 assert.ok(form.has(main));
});
