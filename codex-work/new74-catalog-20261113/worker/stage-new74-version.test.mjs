import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {IncrementalSHA256, hashBase64, hashText, configHash, modulesPatchStream, stageNew74Version} from './stage-new74-version.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const encode=text=>Buffer.from(text).toString('base64');
const oldId='00000000-0000-4000-8000-000000000001', newId='00000000-0000-4000-8000-000000000002';

test('incremental SHA256 matches independent implementation across block boundaries',()=>{
  for (const length of [0,1,55,56,63,64,65,127,128,129,65535,65536,65537,1000000]) {
    const data=Buffer.alloc(length); for (let i=0;i<length;i++) data[i]=(i*37+13)%256;
    const hash=new IncrementalSHA256(); for(let i=0;i<data.length;i+=37) hash.update(data.subarray(i,i+37));
    assert.equal(hash.hex(),sha(data),`length ${length}`);
    assert.equal(hashBase64(data.toString('base64')).sha256,sha(data));
  }
  assert.equal(hashText('hello 😀'),sha('hello 😀'));
});

test('stream preserves all modules with chunks <=64KiB and releases sent source',async()=>{
  const modules=[{name:'entry.mjs',content_type:'application/javascript+module',content_base64:encode('export default {};')},
    {name:'binary.bin',content_type:'application/octet-stream',content_base64:Buffer.alloc(180000,203).toString('base64')}];
  const expected=structuredClone(modules), reader=modulesPatchStream(modules).getReader(), parts=[];
  for (;;) {const item=await reader.read();if(item.done)break;assert.ok(item.value.length<=65536);parts.push(item.value);}
  const parsed=JSON.parse(Buffer.concat(parts).toString());
  assert.deepEqual(Object.keys(parsed),['modules']);assert.deepEqual(parsed.modules,expected);
  assert.ok(modules.every(m=>m.content_base64===''));
});

function fixture(options={}) {
  const modules=[{name:'new74-entry-r1.mjs',content_type:'application/javascript+module',content_base64:encode('export const a=1;')},
    {name:'new74-router-r1.mjs',content_type:'application/javascript+module',content_base64:encode('export const before=1;')},
    {name:'legacy.bin',content_type:'application/octet-stream',content_base64:encode('unchanged legacy bytes')}];
  const current={id:oldId,number:404,main_module:'new74-entry-r1.mjs',compatibility_date:'2026-10-01',assets:{config:{run_worker_first:true}},
    bindings:[{name:'SECRET',type:'secret_text'},{name:'ASSETS',type:'assets'}],exports:{LocalDemoWallet:{type:'durable-object',storage:'sqlite'},default:{type:'worker'}},modules};
  const cfg={accountId:'a'.repeat(32),scriptName:'superwin-player',expectedVersion:oldId,expectedVersionNumber:404,expectedMainModule:current.main_module,
    expectedModuleCount:modules.length,expectedModules:modules.map(m=>({name:m.name,content_type:m.content_type,base64_chars:m.content_base64.length})),
    expectedConfigSha256:configHash(current),changedModule:'new74-router-r1.mjs',originalRouterSha256:hashBase64(modules[1].content_base64).sha256,
    replacementBase64:encode('export const after=2;'),replacementSha256:sha('export const after=2;'),stage:true};
  const calls=[];let staged=null, latestReads=0, deploymentReads=0, patch=null;
  const request=async args=>{
    calls.push({method:args.method,path:args.path,query:args.query,contentType:args.contentType});
    let result;
    if(args.path.endsWith('/deployments')) {
      deploymentReads++;
      result={deployments:[{id:options.deploymentDrift&&deploymentReads>1?'changed-deployment':'deployment404',versions:[{version_id:oldId,percentage:100}]}]};
    } else if(args.method==='PATCH') {
      assert.deepEqual(args.query,{deploy:false});assert.equal(args.contentType,'application/merge-patch+json');
      patch=await new Response(args.body).json();assert.deepEqual(Object.keys(patch),['modules']);
      staged={...structuredClone(current),id:newId,number:405,modules:patch.modules};
      if(options.configDrift)staged.compatibility_date='2026-11-01';
      if(options.byteDrift)staged.modules.find(m=>m.name==='legacy.bin').content_base64=encode('incorrect legacy bytes');
      result={...staged};delete result.modules;
    } else if(args.path.endsWith('/latest')) {
      latestReads++;result=structuredClone(staged || current);delete result.modules;
      if(options.latestDrift&&latestReads>1)result.id='00000000-0000-4000-8000-000000000003';
    } else if(args.path.endsWith('/'+oldId)) result=structuredClone(current);
    else if(args.path.endsWith('/'+newId)) result=structuredClone(staged);
    else throw Error('UNEXPECTED_REQUEST');
    return {success:true,result};
  };
  return {cfg,request,calls,current,get patch(){return patch;}};
}

test('dry run performs only GET requests',async()=>{
  const f=fixture();f.cfg.stage=false;const result=await stageNew74Version(f.request,f.cfg);
  assert.equal(result.dryRun,true);assert.equal(result.staged,false);assert.ok(f.calls.every(c=>c.method==='GET'));
});
test('stage replaces exactly router, preserves configuration, never deploys',async()=>{
  const f=fixture();const result=await stageNew74Version(f.request,f.cfg);
  assert.equal(result.staged,true);assert.equal(result.deployed,false);assert.equal(result.stagedVersionId,newId);
  assert.equal(result.verification.unchangedModuleCount,2);assert.equal(result.verification.configAfterSha256,f.cfg.expectedConfigSha256);
  const writes=f.calls.filter(c=>c.method!=='GET');assert.equal(writes.length,1);assert.equal(writes[0].method,'PATCH');
  for (const m of f.current.modules) if(m.name!==f.cfg.changedModule) assert.deepEqual(f.patch.modules.find(x=>x.name===m.name),m);
});
for(const [option,error] of [['latestDrift','LATEST_UPLOADED_VERSION_CHANGED'],['deploymentDrift','DEPLOYMENT_CHANGED']]) {
  test(`pre-write ${option} stops without PATCH`,async()=>{
    const f=fixture({[option]:true});await assert.rejects(stageNew74Version(f.request,f.cfg),new RegExp(error));
    assert.ok(f.calls.every(c=>c.method==='GET'));
  });
}
test('reviewed original-router hash mismatch stops before mutation',async()=>{
  const f=fixture();f.cfg.originalRouterSha256='0'.repeat(64);
  await assert.rejects(stageNew74Version(f.request,f.cfg),/ORIGINAL_ROUTER_HASH_MISMATCH/);assert.ok(f.calls.every(c=>c.method==='GET'));
});
test('module name or count loss cannot enter the stage request',async()=>{
  const f=fixture();f.cfg.expectedModules[2].name='unexpected.bin';
  await assert.rejects(stageNew74Version(f.request,f.cfg),/MODULE_NAMES_CHANGED/);assert.ok(f.calls.every(c=>c.method==='GET'));
});
for(const [option,error] of [['configDrift','CONFIGURATION_CHANGED'],['byteDrift','MODULE_(BYTES|LENGTH)_CHANGED']]) {
  test(`post-stage ${option} returns a staged id with failure and no deploy`,async()=>{
    const f=fixture({[option]:true});
    await assert.rejects(stageNew74Version(f.request,f.cfg),e=>{assert.match(e.message,new RegExp(error));assert.equal(e.stagedVersionId,newId);assert.equal(e.stageWriteAttempted,true);return true;});
    assert.equal(f.calls.filter(c=>c.method!=='GET').length,1);
  });
}
