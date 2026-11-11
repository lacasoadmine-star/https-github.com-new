// Additive, read-only startup inspection for the existing Railway function.
// Never selects account rows or changes balances, rounds, constraints or flags.
import {SQL as Independent74AuditSQL} from 'bun';
async function independent74ReadOnlySchemaAudit(){
 if(!Bun.env.DATABASE_URL)return;
 const db=new Independent74AuditSQL(Bun.env.DATABASE_URL,{max:1,connectionTimeout:5,idleTimeout:1});
 try{
  const schema=await db.begin(async tx=>{
   await tx`SET TRANSACTION READ ONLY`;
   await tx`SET LOCAL statement_timeout = '5s'`;
   const tables=await tx`SELECT n.nspname AS table_schema,c.relname AS table_name,c.relkind AS table_kind,c.relrowsecurity AS row_security FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%' AND c.relkind IN ('r','p','v') ORDER BY n.nspname,c.relname LIMIT 401`;
   const columns=await tx`SELECT table_schema,table_name,column_name,data_type,udt_name,is_nullable,column_default,numeric_precision,numeric_scale,is_identity,is_generated,character_maximum_length FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_schema NOT LIKE 'pg_toast%' AND table_schema NOT LIKE 'pg_temp%' ORDER BY table_schema,table_name,ordinal_position LIMIT 4001`;
   const constraints=await tx`SELECT ns.nspname AS table_schema,rel.relname AS table_name,con.conname AS constraint_name,con.contype AS constraint_type,pg_get_constraintdef(con.oid,true) AS definition FROM pg_constraint con JOIN pg_class rel ON rel.oid=con.conrelid JOIN pg_namespace ns ON ns.oid=rel.relnamespace WHERE ns.nspname NOT IN ('pg_catalog','information_schema') AND ns.nspname NOT LIKE 'pg_toast%' AND ns.nspname NOT LIKE 'pg_temp%' ORDER BY ns.nspname,rel.relname,con.conname LIMIT 2001`;
   const indexes=await tx`SELECT schemaname AS table_schema,tablename AS table_name,indexname AS index_name,indexdef AS definition FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog','information_schema') AND schemaname NOT LIKE 'pg_toast%' AND schemaname NOT LIKE 'pg_temp%' ORDER BY schemaname,tablename,indexname LIMIT 2001`;
   const triggers=await tx`SELECT n.nspname AS table_schema,c.relname AS table_name,t.tgname AS name,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND t.tgenabled<>'D' AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%' ORDER BY n.nspname,c.relname,t.tgname LIMIT 2001`;
   if(tables.length>400||columns.length>4000||constraints.length>2000||indexes.length>2000||triggers.length>2000)throw Error('SCHEMA_LIMIT');
   return {readOnly:true,accountRowsRead:0,tables,columns,constraints,triggers,indexes};
  });
  const bytes=Buffer.from(JSON.stringify(schema));if(bytes.length>400000)throw Error('SCHEMA_BYTES_LIMIT');
  const encoded=bytes.toString('base64'),total=Math.ceil(encoded.length/2000),sha256=new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
  console.info(JSON.stringify({event:'independent74_readonly_schema',kind:'begin',readOnly:true,accountRowsRead:0,bytes:bytes.length,total,sha256}));
  for(let i=0;i<total;i++)console.info(JSON.stringify({event:'independent74_readonly_schema',kind:'chunk',index:i,total,data:encoded.slice(i*2000,(i+1)*2000)}));
  console.info(JSON.stringify({event:'independent74_readonly_schema',kind:'complete',readOnly:true,accountRowsRead:0,sha256}));
 }catch(error){console.info(JSON.stringify({event:'independent74_readonly_schema',kind:'failed',code:typeof error?.code==='string'?error.code:'READONLY_SCHEMA_AUDIT_FAILED'}));}
 finally{await db.close().catch(()=>{});}
}
await independent74ReadOnlySchemaAudit();
