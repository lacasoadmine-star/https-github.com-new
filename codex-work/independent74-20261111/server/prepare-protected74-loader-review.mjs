// Offline only: repack one exact decoded-runtime review candidate inside the
// existing function envelope. No remote API, deploy, configuration or DB calls.
import{createHash}from'node:crypto';import{gzipSync,gunzipSync}from'node:zlib';import{readFile,writeFile}from'node:fs/promises';import{resolve}from'node:path';import{fileURLToPath}from'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');
const LOADER='83755318696124ce3566dd80d44c723288f14d79f4d45b761b821234662bd738',RUNTIME='c434a085e736326db5f9c8822bf1feb8212073495174889527a0655e9a5b5c91';
export function prepareProtected74LoaderReview({loader,runtimeCandidate,changeManifest,expectedLoaderSha256=LOADER,expectedOriginalRuntimeSha256=RUNTIME}={}){
 if(hash(loader)!==expectedLoaderSha256)throw Error('EXACT_PROTECTED_FUNCTION_ENVELOPE_REQUIRED');
 const matches=[...loader.matchAll(/Buffer\.from\('([A-Za-z0-9+/=]+)',\s*'base64'\)/g)];if(matches.length!==1)throw Error('EXACT_SINGLE_RUNTIME_PAYLOAD_REQUIRED');
 const oldPayload=matches[0][1],original=gunzipSync(Buffer.from(oldPayload,'base64'),{maxOutputLength:2000000});if(hash(original)!==expectedOriginalRuntimeSha256)throw Error('EXACT_ORIGINAL_RUNTIME_REQUIRED');
 const before=changeManifest?.originalSha256??changeManifest?.originalRuntimeSha256,after=changeManifest?.candidateSha256??changeManifest?.candidateRuntimeSha256;
 if(before!==hash(original)||after!==hash(runtimeCandidate)||changeManifest.reviewOnly!==true)throw Error('REVIEW_PRESERVATION_MANIFEST_REQUIRED');
 const audit=changeManifest.format==='protected74-readonly-startup-audit-only-v1',closed=changeManifest.format==='protected74-in-factory-review-v1';
 if(!audit&&!closed)throw Error('UNKNOWN_REVIEW_SCOPE');
 if(audit&&(changeManifest.changedOriginalBytes!==0||changeManifest.newEndpoints!==0||changeManifest.newGates!==0||changeManifest.newModelRegistryChanges!==0))throw Error('AUDIT_SCOPE_NOT_READONLY');
 if(closed&&(changeManifest.newWagerActions!=='HARD503'||changeManifest.newFinancialClassesConstructed!==0))throw Error('NAMESPACE_FINANCIAL_GATE_NOT_CLOSED');
 const oldHash=hash(original),newHash=hash(runtimeCandidate),oldLength='runtimeBytes.length !== '+original.length,newLength='runtimeBytes.length !== '+Buffer.byteLength(runtimeCandidate);
 if(loader.split(oldHash).length!==2||loader.split(oldLength).length!==2)throw Error('EXACT_ENVELOPE_INTEGRITY_GUARDS_REQUIRED');
 const newPayload=gzipSync(Buffer.from(runtimeCandidate),{level:9}).toString('base64');
 const source=loader.replace(oldPayload,newPayload).replace(oldHash,newHash).replace(oldLength,newLength);
 const restored=source.replace(newPayload,oldPayload).replace(newHash,oldHash).replace(newLength,oldLength);if(restored!==loader)throw Error('ORIGINAL_ENVELOPE_NOT_PRESERVED');
 return{source,manifest:{format:'protected74-offline-function-envelope-review-v1',reviewOnly:true,scope:audit?'STARTUP_READONLY_AUDIT_ONLY':'CLOSED_NAMESPACE_REVIEW_ONLY',originalFunctionSha256:hash(loader),candidateFunctionSha256:hash(source),restoredOriginalFunctionSha256:hash(restored),originalRuntimeSha256:oldHash,candidateRuntimeSha256:newHash,originalFunctionBytes:Buffer.byteLength(loader),candidateFunctionBytes:Buffer.byteLength(source),changedEnvelopeFields:['gzip runtime payload literal','runtime length integrity literal','runtime SHA256 integrity literal'],allOtherEnvelopeBytesPreserved:true,financialChanges:audit?0:'NONE; all new actions hard503',remoteActionTaken:false,sourcePreservationManifest:changeManifest}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const[loaderPath,runtimePath,manifestPath,outputPath]=process.argv.slice(2);if(!outputPath)throw Error('Usage: node server/prepare-protected74-loader-review.mjs PRIVATE_OLD_LOADER PRIVATE_RUNTIME_CANDIDATE PRESERVATION_MANIFEST PRIVATE_FUNCTION_CANDIDATE');
 const r=prepareProtected74LoaderReview({loader:await readFile(loaderPath,'utf8'),runtimeCandidate:await readFile(runtimePath,'utf8'),changeManifest:JSON.parse(await readFile(manifestPath,'utf8'))});await writeFile(outputPath,r.source,{mode:0o600});await writeFile(outputPath+'.manifest.json',JSON.stringify(r.manifest,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({candidate:outputPath,scope:r.manifest.scope,originalSha256:r.manifest.originalFunctionSha256,candidateSha256:r.manifest.candidateFunctionSha256,bytes:r.manifest.candidateFunctionBytes,remoteActionTaken:false}));
}
