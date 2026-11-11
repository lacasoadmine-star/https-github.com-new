import test from'node:test';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{gzipSync,gunzipSync}from'node:zlib';import{prepareProtected74LoaderReview}from'../prepare-protected74-loader-review.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
test('offline envelope repackage changesonlypayload/length/hash and retains every other originalbyte',()=>{
 const old='// ORIGINAL STRUCTURAL RUNTIME ONLY\n',candidate=old+'// boundedreadonlyaddition\n',payload=gzipSync(Buffer.from(old)).toString('base64');
 const loader="import{gunzipSync}from'node:zlib';const runtimeBytes=gunzipSync(Buffer.from('"+payload+"', 'base64'));if(runtimeBytes.length !== "+Buffer.byteLength(old)+"||hash(runtimeBytes)!=='"+hash(old)+"')throw Error();\n";
 const manifest={format:'protected74-readonly-startup-audit-only-v1',reviewOnly:true,originalSha256:hash(old),candidateSha256:hash(candidate),changedOriginalBytes:0,newEndpoints:0,newGates:0,newModelRegistryChanges:0};
 const options={loader,runtimeCandidate:candidate,changeManifest:manifest,expectedLoaderSha256:hash(loader),expectedOriginalRuntimeSha256:hash(old)},r=prepareProtected74LoaderReview(options);
 assert.equal(r.manifest.restoredOriginalFunctionSha256,hash(loader));assert.equal(r.manifest.allOtherEnvelopeBytesPreserved,true);assert.equal(r.manifest.scope,'STARTUP_READONLY_AUDIT_ONLY');assert.equal(r.manifest.remoteActionTaken,false);
 const newPayload=r.source.match(/Buffer\.from\('([A-Za-z0-9+/=]+)'/)[1];assert.equal(gunzipSync(Buffer.from(newPayload,'base64')).toString(),candidate);
 assert.throws(()=>prepareProtected74LoaderReview({...options,expectedLoaderSha256:'0'.repeat(64)}),/EXACT_PROTECTED_FUNCTION_ENVELOPE_REQUIRED/);
 assert.throws(()=>prepareProtected74LoaderReview({...options,changeManifest:{...manifest,newGates:1}}),/AUDIT_SCOPE_NOT_READONLY/);
 assert.throws(()=>prepareProtected74LoaderReview({...options,runtimeCandidate:candidate+'changed'}),/REVIEW_PRESERVATION_MANIFEST_REQUIRED/);
});
