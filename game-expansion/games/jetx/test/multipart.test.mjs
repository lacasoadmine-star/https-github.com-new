import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMultipart} from '../multipart.mjs';
test('downloaded binary modules without filenames retain every byte',()=>{
 const binary=Uint8Array.from([0,255,254,128,13,10,45,45,0,1,2]);
 const body=Buffer.concat([Buffer.from('--boundary\r\nContent-Disposition: form-data; name="art.bin"\r\nContent-Type: application/octet-stream\r\n\r\n'),binary,Buffer.from('\r\n--boundary\r\nContent-Disposition: form-data; name="entry.mjs"\r\nContent-Type: application/javascript+module\r\n\r\nexport default {};\r\n--boundary--\r\n')]);
 const parts=parseMultipart(body);assert.equal(parts.length,2);assert.equal(parts[0].name,'art.bin');assert.deepEqual(parts[0].bytes,Buffer.from(binary));assert.equal(new TextDecoder().decode(parts[1].bytes),'export default {};');
});
test('downloaded JavaScript modules without MIME headers keep module semantics',()=>{
 const body=Buffer.from('--boundary\r\nContent-Disposition: form-data; name="entry.mjs"\r\n\r\nexport const config={};\r\n--boundary--\r\n');
 const [part]=parseMultipart(body);assert.equal(part.type,'application/javascript+module');assert.equal(new TextDecoder().decode(part.bytes),'export const config={};');
});
