// Offline audit primitive. Calling it is an explicit operator action; importing
// this module does nothing. No endpoint, driver, financial class or money write.
export async function protected74ReadOnlyStartupAudit(pool){
 const result={schemaVersion:1,readOnly:true,writes:0,individualAccountRowsReturned:0,success:false,stages:[],rollbackConfirmed:false};
 let client,stage='connect';
 try{
  client=await pool.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL statement_timeout='5s'");
  await client.query("SET LOCAL idle_in_transaction_session_timeout='5s'");
  stage='database_identity';
  const identity=await client.query("SELECT encode(sha256(convert_to(current_database()||':'||(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database())||':'||COALESCE(inet_server_addr()::text,'local')||':'||COALESCE(inet_server_port()::text,''),'UTF8')),'hex') AS database_identity_sha256");
  const fingerprint=identity.rows[0]?.database_identity_sha256;if(typeof fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(fingerprint))throw Object.assign(new Error(),{code:'IDENTITY_HASH_INVALID'});
  result.databaseIdentitySha256=fingerprint;result.databaseIdentityMethod='database-name/OID/server-address/port hash; raw fields never selected or emitted';result.stages.push(stage);
  // Only structural metadata for the existing protected/canonical/library
  // schemas; defaults, source function bodies and row data are never selected.
  stage='columns';
  result.columns=(await client.query("SELECT table_schema,table_name,column_name,data_type,udt_name,is_nullable,character_maximum_length FROM information_schema.columns WHERE (table_schema='sw_rebuild' AND table_name IN ('users','sessions','wallets','transfers','ledger','rounds','account_limits')) OR (table_schema='sw_nine' AND table_name IN ('game_rounds','actions','free_spins','wallet_transactions')) OR (table_schema='sw_native_library' AND table_name IN ('rounds','requests')) ORDER BY table_schema,table_name,ordinal_position LIMIT 256")).rows;result.stages.push(stage);
  stage='indexes';
  result.indexes=(await client.query("SELECT ns.nspname AS table_schema,t.relname AS table_name,i.relname AS index_name,x.indisunique AS unique_index,x.indisprimary AS primary_index,(x.indpred IS NOT NULL) AS partial_index,ARRAY(SELECT a.attname FROM unnest(x.indkey) WITH ORDINALITY AS k(attnum,ord) JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum ORDER BY k.ord) AS columns FROM pg_catalog.pg_index x JOIN pg_catalog.pg_class t ON t.oid=x.indrelid JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace JOIN pg_catalog.pg_class i ON i.oid=x.indexrelid WHERE ns.nspname IN ('sw_rebuild','sw_nine','sw_native_library') AND t.relname IN ('users','sessions','wallets','transfers','ledger','rounds','account_limits','game_rounds','actions','free_spins','wallet_transactions','requests') ORDER BY ns.nspname,t.relname,i.relname LIMIT 128")).rows;result.stages.push(stage);
  stage='constraints_and_trigger_types';
  result.constraints=(await client.query("SELECT ns.nspname AS table_schema,t.relname AS table_name,c.conname AS name,c.contype AS type,c.condeferrable AS deferrable,c.convalidated AS validated FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_class t ON t.oid=c.conrelid JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace WHERE ns.nspname IN ('sw_rebuild','sw_nine','sw_native_library') AND t.relname IN ('users','sessions','wallets','transfers','ledger','rounds','account_limits','game_rounds','actions','free_spins','wallet_transactions','requests') ORDER BY ns.nspname,t.relname,c.conname LIMIT 128")).rows;
  result.triggers=(await client.query("SELECT ns.nspname AS table_schema,t.relname AS table_name,g.tgname AS name,g.tgtype AS type_bits,g.tgenabled AS enabled,pn.nspname AS function_schema,p.proname AS function_name FROM pg_catalog.pg_trigger g JOIN pg_catalog.pg_class t ON t.oid=g.tgrelid JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace JOIN pg_catalog.pg_proc p ON p.oid=g.tgfoid JOIN pg_catalog.pg_namespace pn ON pn.oid=p.pronamespace WHERE ns.nspname IN ('sw_rebuild','sw_nine','sw_native_library') AND t.relname IN ('users','sessions','wallets','transfers','ledger','rounds','account_limits','game_rounds','actions','free_spins','wallet_transactions','requests') AND NOT g.tgisinternal ORDER BY ns.nspname,t.relname,g.tgname LIMIT 128")).rows;result.stages.push(stage);
  stage='house_aggregate';
  result.houseAggregate=(await client.query("SELECT count(*)::int AS house_wallets,COALESCE(sum(balance),0)::text AS available_minor FROM sw_rebuild.wallets WHERE id='house'")).rows[0];result.stages.push(stage);
  stage='account_cap_aggregate';
  result.accountCapAggregate=(await client.query('SELECT count(*)::int AS configured_accounts,count(max_balance)::int AS capped_accounts,min(max_balance)::text AS minimum_cap_minor,max(max_balance)::text AS maximum_cap_minor FROM sw_rebuild.account_limits')).rows[0];result.stages.push(stage);
  result.success=true;
 }catch(error){result.success=false;result.failedStage=stage;result.failureCode=typeof error.code==='string'&&/^[A-Z0-9_]{5,60}$/.test(error.code)?error.code:'READONLY_AUDIT_FAILED';}
 finally{if(client){try{await client.query('ROLLBACK');result.rollbackConfirmed=true;}catch{result.success=false;result.failureCode='ROLLBACK_UNCONFIRMED';}finally{client.release();}}}
 // Reaching a LIMIT is recorded as incomplete instead of silently asserting a
 // full audit. Trigger types do not prove trigger function financial behavior.
 result.metadataLimitsReached=Boolean(result.columns?.length===256||result.indexes?.length===128||result.constraints?.length===128||result.triggers?.length===128);
 result.financialActivationVerified=false;
 return result;
}
