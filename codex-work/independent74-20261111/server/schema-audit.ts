import { SQL } from 'bun';
import {createHash} from 'node:crypto';
let auditState='waiting_for_database_reference';
const emit=(kind,value)=>console.info(JSON.stringify({event:'independent74_schema_audit',kind,value}));
if(Bun.env.DATABASE_URL){
 const db=new SQL(Bun.env.DATABASE_URL,{max:1,connectionTimeout:10,idleTimeout:5});
 try{
  const schema=await db.begin(async tx=>{
   await tx`SET TRANSACTION READ ONLY`;
   await tx`SET LOCAL statement_timeout = '10s'`;
   const tables=await tx`SELECT table_schema,table_name,table_type FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_schema NOT LIKE 'pg_toast%' AND table_schema NOT LIKE 'pg_temp%' ORDER BY table_schema,table_name LIMIT 201`;
   if(tables.length>200)throw Object.assign(new Error(),{code:'SCHEMA_TOO_LARGE'});
   const columns=await tx`SELECT table_schema,table_name,ordinal_position,column_name,data_type,udt_schema,udt_name,is_nullable,column_default,character_maximum_length,numeric_precision,numeric_scale,is_identity,identity_generation,is_generated,generation_expression FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_schema NOT LIKE 'pg_toast%' AND table_schema NOT LIKE 'pg_temp%' ORDER BY table_schema,table_name,ordinal_position LIMIT 4001`;
   if(columns.length>4000)throw Object.assign(new Error(),{code:'SCHEMA_TOO_LARGE'});
   const constraints=await tx`SELECT ns.nspname AS table_schema,rel.relname AS table_name,con.conname AS constraint_name,con.contype AS constraint_type,pg_get_constraintdef(con.oid,true) AS definition,con.condeferrable AS deferrable,con.condeferred AS initially_deferred FROM pg_constraint con JOIN pg_class rel ON rel.oid=con.conrelid JOIN pg_namespace ns ON ns.oid=rel.relnamespace WHERE ns.nspname NOT IN ('pg_catalog','information_schema') AND ns.nspname NOT LIKE 'pg_toast%' AND ns.nspname NOT LIKE 'pg_temp%' ORDER BY ns.nspname,rel.relname,con.conname LIMIT 2001`;
   if(constraints.length>2000)throw Object.assign(new Error(),{code:'SCHEMA_TOO_LARGE'});
   const indexes=await tx`SELECT schemaname AS table_schema,tablename AS table_name,indexname AS index_name,indexdef AS definition FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog','information_schema') AND schemaname NOT LIKE 'pg_toast%' AND schemaname NOT LIKE 'pg_temp%' ORDER BY schemaname,tablename,indexname LIMIT 2001`;
   if(indexes.length>2000)throw Object.assign(new Error(),{code:'SCHEMA_TOO_LARGE'});
   return {readOnly:true,accountRowsRead:0,tables,columns,constraints,indexes};
  });
  const bytes=Buffer.from(JSON.stringify(schema));
  if(bytes.length>500000)throw Object.assign(new Error(),{code:'SCHEMA_TOO_LARGE'});
  const encoded=bytes.toString('base64'),chunks=Math.ceil(encoded.length/2400),sha256=createHash('sha256').update(bytes).digest('hex');
  emit('begin',{readOnly:true,accountRowsRead:0,bytes:bytes.length,chunks,sha256,tableCount:schema.tables.length});
  for(let i=0;i<chunks;i++)emit('chunk',{index:i,total:chunks,data:encoded.slice(i*2400,(i+1)*2400)});
  emit('complete',{readOnly:true,accountRowsRead:0,sha256});
  auditState='complete';
 }catch(error){auditState='failed';emit('failed',{code:typeof error?.code==='string'?error.code:'SCHEMA_AUDIT_FAILED'});}
 finally{await db.close();}
}
export default {port:Number(Bun.env.PORT||8080),fetch(request){
 if(new URL(request.url).pathname!=='/health')return new Response('Not found',{status:404});
 return Response.json({service:'superwin-independent74',auditState,readOnly:true},{headers:{'Cache-Control':'no-store'}});
}};
