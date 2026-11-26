import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {inspectRelease} from '../tools/release.mjs';
import {ADDITIVE_DISPOSITION} from '../router.mjs';
const hash=data=>createHash('sha256').update(data).digest('hex');

test('release evidence cannot activate a stale replacement disposition',async()=>{
 const stale=await inspectRelease({legacyDisposition:'replace-existing-game-presentations-after-complete-74-release',entries:[]},resolve('.'));
 assert.ok(stale.issues.some(e=>/additive disposition/.test(e.message)));
 const replacement=await inspectRelease({legacyDisposition:ADDITIVE_DISPOSITION,entries:[]},resolve('.'));
 assert.ok(!replacement.issues.some(e=>/additive disposition/.test(e.message)));
 assert.equal(replacement.ready,false);assert.ok(replacement.issues.some(e=>/74/.test(e.message)));
});

test('operator math replaces private-provider-math requirement without bypassing release checks',async()=>{
 const root=resolve('.'),path='reports/special74/operator-math/multi-hot-5-proof.json';
 const proof=await readFile(path),data=JSON.parse(proof);
 const entry={id:data.gameId,position:1,backend:{modelId:data.modelId,modelVersion:data.modelVersion},
  probabilityEvidence:{verified:true,sourceType:data.sourceType,claimsProviderMath:false,disclosuresVerified:true},evidence:{math:{path,sha256:hash(proof)}}};
 const manifest={mathPolicy:{mode:'operator-authored',authorizedByUser:true},entries:[entry]};
 const result=await inspectRelease(manifest,root);
 assert.equal(result.ready,false);assert.ok(result.issues.some(e=>/74/.test(e.message)));
 assert.ok(result.issues.some(e=>/financial model/.test(e.message)));
 assert.ok(!result.issues.some(e=>/Operator math proof|Operator math requires|private provider/.test(e.message)));
 entry.backend.modelVersion='stale-version';
 assert.ok((await inspectRelease(manifest,root)).issues.some(e=>/proof identity/.test(e.message)));
 entry.backend.modelVersion=data.modelVersion;entry.probabilityEvidence.claimsProviderMath=true;
 assert.ok((await inspectRelease(manifest,root)).issues.some(e=>/independent attribution/.test(e.message)));
 entry.probabilityEvidence.claimsProviderMath=false;entry.probabilityEvidence.disclosuresVerified=false;
 assert.ok((await inspectRelease(manifest,root)).issues.some(e=>/must be disclosed/.test(e.message)));
});
test('a changed operator source invalidates its otherwise hash-pinned proof',async()=>{
 const root=await mkdtemp(join(tmpdir(),'special74-math-'));
 try{
  await writeFile(join(root,'model.mjs'),'changed');await writeFile(join(root,'spec.json'),'{}');
  const proof={gameId:'fixture',modelId:'fixture-model',modelVersion:'v1',sourceType:'operator-authored-math-specification',exactProofVerified:true,claimsProviderMath:false,
   evidence:[{path:'model.mjs',sha256:hash('original')},{path:'spec.json',sha256:hash('{}')}]};
  const text=JSON.stringify(proof);await writeFile(join(root,'proof.json'),text);
  const result=await inspectRelease({mathPolicy:{mode:'operator-authored',authorizedByUser:true},entries:[{id:'fixture',position:1,
   backend:{modelId:'fixture-model',modelVersion:'v1'},probabilityEvidence:{verified:true,sourceType:proof.sourceType,claimsProviderMath:false,disclosuresVerified:true},evidence:{math:{path:'proof.json',sha256:hash(text)}}}]},root);
  assert.ok(result.issues.some(e=>e.message==='Evidence file is missing or changed: model.mjs'));assert.equal(result.ready,false);
 }finally{await rm(root,{recursive:true,force:true});}
});
