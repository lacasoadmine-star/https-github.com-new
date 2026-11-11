import test from'node:test';import assert from'node:assert/strict';import{createHash}from'node:crypto';
import{protected74ReadOnlyStartupAudit}from'../protected74-startup-readonly-audit.mjs';import{prepareProtected74StartupAuditSplice}from'../prepare-protected74-audit-splice.mjs';
function poolFixture({failAt}={}){
 const queries=[];let released=0;
 const client={query:async text=>{queries.push(text);if(failAt&&text.includes(failAt))throw Object.assign(new Error('PRIVATE_CONNECTION_DETAILS_MUST_NEVER_LEAK'),{code:'42P01'});
  if(text.startsWith('SELECT encode'))return{rows:[{database_identity_sha256:'a'.repeat(64)}]};
  if(text.includes('information_schema.columns'))return{rows:[{table_schema:'sw_rebuild',table_name:'wallets',column_name:'balance',data_type:'bigint'}]};
  if(text.includes('pg_catalog.pg_index'))return{rows:[{table_schema:'sw_native_library',table_name:'requests',unique_index:true,columns:['user_id','request_id']}]};
  if(text.includes('pg_catalog.pg_constraint'))return{rows:[]};if(text.includes('pg_catalog.pg_trigger'))return{rows:[]};
  if(text.includes("WHERE id='house'"))return{rows:[{house_wallets:1,available_minor:'800000000'}]};
  if(text.includes('count(max_balance)'))return{rows:[{configured_accounts:3,capped_accounts:2,minimum_cap_minor:'100000',maximum_cap_minor:'90000000'}]};
  return{rows:[]};},release(){released++;}};
 return{pool:{connect:async()=>client},queries,client,releases:()=>released};
}
test('startup audit uses DB-enforcedREADONLY andstaticboundedSELECTs, emits onlyhashedidentity/metadata/aggregates, and alwaysROLLBACKs',async()=>{
 const f=poolFixture(),r=await protected74ReadOnlyStartupAudit(f.pool);assert.equal(r.success,true);assert.equal(r.readOnly,true);assert.equal(r.writes,0);assert.equal(r.individualAccountRowsReturned,0);assert.equal(r.rollbackConfirmed,true);assert.equal(r.financialActivationVerified,false);assert.equal(r.databaseIdentitySha256,'a'.repeat(64));assert.equal(r.houseAggregate.available_minor,'800000000');assert.equal(f.releases(),1);
 assert.equal(f.queries[0],'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');assert.equal(f.queries.at(-1),'ROLLBACK');assert(f.queries.includes("SET LOCAL statement_timeout='5s'"));
 assert(f.queries.every(q=>/^(?:BEGIN|SET|SELECT|ROLLBACK)\b/.test(q)));assert(!f.queries.some(q=>/FOR UPDATE|FOR SHARE|pg_advisory|pg_get_functiondef|SELECT \*/i.test(q)));
 const caps=f.queries.find(q=>q.includes('count(max_balance)'));assert(!/user_id|username|session|token|password/.test(caps));assert.doesNotMatch(JSON.stringify(r),/PRIVATE_CONNECTION|postgres:\/\/|password|session_token/);
});
test('failedmetadata query is sanitized and releases readonlytransaction; no partial audit can declarefinancialreadiness',async()=>{
 const f=poolFixture({failAt:'account_limits'}),r=await protected74ReadOnlyStartupAudit(f.pool);assert.equal(r.success,false);assert.equal(r.rollbackConfirmed,true);assert.equal(r.failureCode,'42P01');assert.equal(r.financialActivationVerified,false);assert.equal(f.queries.at(-1),'ROLLBACK');assert.equal(f.releases(),1);assert(!JSON.stringify(r).includes('PRIVATE_CONNECTION_DETAILS'));
 const disconnected=await protected74ReadOnlyStartupAudit({connect:async()=>{throw Error('PRIVATE_CONNECTION_DETAILS_MUST_NEVER_LEAK');}});assert.equal(disconnected.success,false);assert.equal(disconnected.failedStage,'connect');assert(!JSON.stringify(disconnected).includes('PRIVATE_CONNECTION_DETAILS'));
});
test('audit-only insertion preserves every originalbyte andserverfetch, hasnoendpoint/evaluator/gate and cannotblockexistingserverstartup',async()=>{
 const original="import{createHash}from'node:crypto';const service={pool:globalThis.__protectedAuditTestPool,fetch:()=>new Response('existing')};\nBun.serve({hostname:'0.0.0.0',port:Number(process.env.PORT||3000),fetch:service.fetch});\n";
 const hash=s=>createHash('sha256').update(s).digest('hex'),patch=prepareProtected74StartupAuditSplice(original,{expectedSha256:hash(original)});assert.equal(patch.manifest.restoredOriginalSha256,hash(original));assert.equal(patch.manifest.changedOriginalBytes,0);assert.equal(patch.manifest.newEndpoints,0);assert.equal(patch.manifest.newGates,0);assert.equal(patch.manifest.newModelRegistryChanges,0);assert.equal(patch.manifest.nonblocking,true);
 const oldBun=globalThis.Bun,oldInfo=console.info;let resolveConnection,starts=0,fetch;const logs=[],f=poolFixture();globalThis.__protectedAuditTestPool={connect:()=>new Promise(resolve=>{resolveConnection=resolve;})};globalThis.Bun={serve:opts=>{starts++;fetch=opts.fetch;return{};}};console.info=value=>logs.push(JSON.parse(value));
 try{await import('data:text/javascript;base64,'+Buffer.from(patch.source).toString('base64'));assert.equal(starts,1,'Startup must complete before the readonlyconnection is available.');assert.equal(await(await fetch(new Request('http://old'))).text(),'existing');resolveConnection(f.client);await new Promise(resolve=>setTimeout(resolve,20));const summary=logs.find(x=>x.event==='protected74_readonly_audit_summary_v1');assert(summary);assert.equal(summary.writes,0);assert.equal(summary.rollbackConfirmed,true);assert.equal(summary.financialActivationVerified,false);const chunks=logs.filter(x=>x.event==='protected74_readonly_audit_chunk_v1').sort((a,b)=>a.index-b.index);const bytes=Buffer.from(chunks.map(x=>x.payloadBase64).join(''),'base64');assert.equal(hash(bytes),summary.sha256);assert.equal(JSON.parse(bytes).success,true);assert.equal(f.releases(),1);
 }finally{globalThis.Bun=oldBun;console.info=oldInfo;delete globalThis.__protectedAuditTestPool;}
 assert.throws(()=>prepareProtected74StartupAuditSplice(original),/EXACT_PROTECTED_RUNTIME_REQUIRED/);
});
test('the exact audit SELECTs execute against isolatedPostgreSQL catalogs with no individualaccountrows or balancechanges',{timeout:60000},async()=>{
 const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite();
 try{
  await db.exec("CREATE SCHEMA sw_rebuild;CREATE TABLE sw_rebuild.wallets(id text PRIMARY KEY,balance bigint);CREATE TABLE sw_rebuild.account_limits(user_id text PRIMARY KEY,max_balance bigint);INSERT INTO sw_rebuild.wallets VALUES('house',800000000);INSERT INTO sw_rebuild.account_limits VALUES('PRIVATE_USER_A_NOT_LOGGED',100000),('PRIVATE_USER_B_NOT_LOGGED',200000);");
  const queries=[];let released=false;const result=await protected74ReadOnlyStartupAudit({connect:async()=>({query:async text=>{queries.push(text);return db.query(text);},release(){released=true;}})});
  assert.equal(result.success,true,JSON.stringify({stage:result.failedStage,code:result.failureCode}));assert.equal(result.rollbackConfirmed,true);assert.equal(released,true);assert.equal(result.houseAggregate.available_minor,'800000000');assert.equal(result.accountCapAggregate.capped_accounts,2);assert(!JSON.stringify(result).includes('PRIVATE_USER_'));assert(queries.every(q=>/^(BEGIN|SET|SELECT|ROLLBACK)\b/.test(q)));
  assert.equal((await db.query("SELECT balance::text AS balance FROM sw_rebuild.wallets WHERE id='house'")).rows[0].balance,'800000000');
 }finally{await db.close();}
});
