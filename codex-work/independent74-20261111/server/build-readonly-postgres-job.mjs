// A one-shot diagnostic script, not an HTTP or financial service. Credentials
// stay in Railway's existing Postgres reference; no URL is embedded or logged.
import {createHash} from 'node:crypto';
import {protected74ReadOnlyStartupAudit} from './protected74-startup-readonly-audit.mjs';
export async function runReadOnlyPostgresJob({Pool,env,emit,audit=protected74ReadOnlyStartupAudit}){
 let pool;
 if(typeof env?.DATABASE_URL!=='string'||!env.DATABASE_URL){emit({event:'superwin_readonly_job_not_configured',readOnly:true,writes:0,queriesExecuted:false});return;}
 try{
  pool=new Pool({connectionString:env.DATABASE_URL,max:1,connectionTimeoutMillis:5000,idleTimeoutMillis:1000,application_name:'superwin_readonly_audit_once'});
  pool.on?.('error',()=>emit({event:'superwin_readonly_job_pool_error',readOnly:true,writes:0}));
  const result=await audit(pool),bytes=Buffer.from(JSON.stringify(result));
  if(bytes.length>131072)throw Object.assign(new Error(),{code:'RESULT_TOO_LARGE'});
  const sha256=createHash('sha256').update(bytes).digest('hex'),payload=bytes.toString('base64'),chunks=Math.ceil(payload.length/4096);
  emit({event:'superwin_readonly_job_summary',success:result.success,readOnly:true,writes:0,individualAccountRowsReturned:0,rollbackConfirmed:result.rollbackConfirmed,bytes:bytes.length,sha256,chunks,financialActivationVerified:false});
  for(let index=0;index<chunks;index++)emit({event:'superwin_readonly_job_chunk',index,total:chunks,sha256,payloadBase64:payload.slice(index*4096,(index+1)*4096)});
 }catch(error){emit({event:'superwin_readonly_job_failed',code:typeof error.code==='string'&&/^[A-Z0-9_]{5,60}$/.test(error.code)?error.code:'READONLY_JOB_FAILED',readOnly:true,writes:0});}
 finally{if(pool)try{await pool.end();}catch{emit({event:'superwin_readonly_job_close_failed',readOnly:true,writes:0});}}
}
export function buildReadOnlyPostgresJob(){
 return `import pg from 'pg';\nimport{createHash}from'node:crypto';\n${protected74ReadOnlyStartupAudit.toString()}\n${runReadOnlyPostgresJob.toString()}\nawait runReadOnlyPostgresJob({Pool:pg.Pool,env:process.env,emit:value=>console.info(JSON.stringify(value))});\n`;
}
