const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const template=fs.readFileSync(path.join(__dirname,'cloudflare-upload-template.js'),'utf8');
const verifier=fs.readFileSync(path.join(__dirname,'cloudflare-verify-template.js'),'utf8');
const accountId='test-account';
const expected='3ae79dd2-afba-4dcd-bd20-a071ada030a7';
const next='00000000-0000-4000-8000-000000000001';
const oldParts=[{name:'old.mjs',type:'application/javascript+module',body:Buffer.from('export default {fetch(){return new Response("legacy")}};'.padEnd(1600,' '))},{name:'binary.bin',type:'application/octet-stream',body:Buffer.from([0,255,13,10,42])}];
function multipart(parts,boundary='test-boundary'){
  const chunks=[];
  for(const p of parts)chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"; filename="${p.name}"\r\nContent-Type: ${p.type}\r\n\r\n`),p.body,Buffer.from('\r\n'));
  chunks.push(Buffer.from(`--${boundary}--\r\n`));return new Uint8Array(Buffer.concat(chunks));
}
const current={id:expected,number:373,main_module:'old.mjs',compatibility_date:'2026-10-01',bindings:[{name:'SECRET',type:'secret_text'},{name:'LOCAL_DEMO_WALLETS',type:'durable_object_namespace',class_name:'LocalDemoWallet',namespace_id:'same-namespace'},{name:'ASSETS',type:'assets'}],assets:{config:{html_handling:'none',not_found_handling:'none',run_worker_first:true,base_path:'/'}},exports:{LocalDemoWallet:{type:'durable-object',storage:'sqlite'},default:{type:'worker'}},usage_model:'standard'};
const modules=[{name:'independent74-entry-r1.mjs',type:'application/javascript+module',source:'import previous from "./old.mjs"; export * from "./old.mjs"; export default previous;'}];
async function run(dryRun){
  let posts=0,latest=expected,source=multipart(oldParts),after;
  const cloudflare={request:async o=>{
    if(o.method==='GET'&&o.path.endsWith('/deployments'))return {success:true,result:{deployments:[{versions:[{version_id:expected,percentage:100}]}]}};
    if(o.method==='GET'&&o.path.endsWith('/latest'))return {success:true,result:latest===expected?current:after};
    if(o.method==='GET'&&o.path.endsWith('/content/v2'))return source;
    if(o.method==='POST'){
      posts++;assert.equal(o.query.bindings_inherit,'strict');
      const bytes=new Uint8Array(await new Response(o.body).arrayBuffer());
      assert.deepEqual(bytes.subarray(bytes.length-source.length),source,'original multipart remains byte-for-byte tail');
      const form=await new Response(bytes,{headers:{'Content-Type':o.contentType}}).formData();
      const metadata=JSON.parse(form.get('metadata'));
      assert.equal(metadata.keep_assets,true);
      assert.deepEqual(metadata.exports,current.exports);
      assert.deepEqual(metadata.bindings,current.bindings.map(b=>({name:b.name,type:'inherit',version_id:'latest'})));
      const nextParts=[];
      for(const [name,file]of form){if(name==='metadata')continue;nextParts.push({name,type:file.type,body:Buffer.from(await file.arrayBuffer())});}
      for(const p of oldParts){const f=nextParts.find(a=>a.name===p.name);assert.equal(f.type,p.type);assert.deepEqual(f.body,p.body);}
      source=multipart(nextParts,'new-test-boundary');latest=next;
      after={...current,id:next,number:374,main_module:modules[0].name};
      return {success:true,result:{id:next}};
    }
    if(o.method==='GET'&&o.path.endsWith('/'+next))return {success:true,result:after};
    throw Error('unexpected request '+o.method+' '+o.path);
  }};
  const cfg={dryRun,modules,expectedVersion:expected};
  const fn=eval('('+template.replace('__UPLOAD_CONFIG__',JSON.stringify(cfg))+')');
  const result=await fn();assert.equal(posts,dryRun?0:1);
  if(dryRun){assert.equal(result.originalManifest.length,2);return;}
  assert.equal(result.deployed,false);assert.equal(result.id,next);
  const check=eval('('+verifier.replace('__VERIFY_CONFIG__',JSON.stringify({expectedVersion:next,originalManifest:result.originalManifest,newModuleNames:modules.map(m=>m.name)}))+')');
  const verified=await check();assert.equal(verified.originalModulesPreserved,2);assert.equal(verified.totalModules,3);
}
(async()=>{await run(true);await run(false);console.log('PASS: dry run sends no mutation; streamed multipart preserves binary and JS bytes/MIME; metadata keeps bindings/assets/DO exports; version verification passes.');})().catch(e=>{console.error(e);process.exitCode=1});
