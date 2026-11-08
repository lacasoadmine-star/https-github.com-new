import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {LibraryService,createRegistry,seededRandom} from '../backend-baseline/library-service.mjs';
import {JetXService} from '../backend-baseline/jetx-service.mjs';
import {installCrossActiveGuards} from '../backend-baseline/library-backend.mjs';
import * as engine from '../models/multihot40-rules.mjs';

export const FIXTURE_NOW=1794096000000;
export const FIRST_ROUND='00000000-0000-4000-8000-000000000002';
export function fixtureSeed(predicate){
 for(let index=0;index<1000;index++){
  const seed=createHash('sha256').update('isolated-multihot40:'+index).digest('hex');
  const result=engine.evaluateDraftRound(engine.ID,{stakeMinor:'40'},seededRandom(seed,FIRST_ROUND+':0'),FIXTURE_NOW);
  if(predicate(result,seed))return seed;
 }
 throw Error('ISOLATED_FIXTURE_SEED_NOT_FOUND');
}
export const WINNING_SEED=fixtureSeed(result=>result.state.status==='active'&&BigInt(result.state.currentCashoutMinor)<=50000n);
export const firstCardColor=seed=>[0,3].includes(Math.floor(seededRandom(seed,FIRST_ROUND+':1')()*4))?'black':'red';

// Import a temporary copy solely to export the exact existing wallet class.
// This guard rejects an accidental service-database constructor even when an
// unrelated DATABASE_URL happens to exist in the execution environment.
async function walletFixture(){
 const source=await readFile(new URL('../backend-baseline/native-family-preserved.mjs',import.meta.url),'utf8');
 const manifest=JSON.parse(await readFile(new URL('../evidence/backend-baseline-manifest.json',import.meta.url),'utf8'));
 assert.equal(createHash('sha256').update(source).digest('hex'),manifest['native-family-preserved.mjs']);
 const directory=await mkdtemp(join(tmpdir(),'zplay-multihot40-wallet-'));
 const filename=join(directory,'wallet.mjs');
 await writeFile(filename,source+'\nexport {q as SharedWalletStore};\n');
 const previous=globalThis.Bun;
 globalThis.Bun={SQL:class{constructor(){throw Error('ISOLATED_TEST_REJECTED_SERVICE_DATABASE');}}};
 try{return {SharedWalletStore:(await import(pathToFileURL(filename))).SharedWalletStore,directory};}
 catch(error){await rm(directory,{recursive:true,force:true});throw error;}
 finally{if(previous===undefined)delete globalThis.Bun;else globalThis.Bun=previous;}
}
function sqlAdapter(db){
 return {
  async unsafe(statement,parameters=[]){
   if(parameters.length)return (await db.query(statement,parameters)).rows;
   const result=await db.exec(statement);return result.at(-1)?.rows??[];
  },
  begin:callback=>db.transaction(transaction=>callback(sqlAdapter(transaction)))
 };
}

/**
 * A private, disposable PostgreSQL fixture for financial and browser tests.
 * No production connection, user or credit is created. `setup()` resets only
 * this newly created in-memory database. Browser callers can pass {now:Date.now}.
 * The production module remains launchable:false; only this test registry opens.
 */
export async function createFixture({now,seed:seedProvider,startingTime=FIXTURE_NOW}={}){
 const db=await PGlite.create(),sql=sqlAdapter(db);
 let service,jetx,directory;
 const clock={now:startingTime,roundSequence:1,seed:WINNING_SEED};
 const getTime=typeof now==='function'?now:()=>clock.now;
 const registry=createRegistry([{
  ...engine,start:engine.evaluateDraftRound,
  definitions:{[engine.ID]:{...engine.definitions[engine.ID],launchable:true,fixtureOnly:true}}
 }]);
 const cleanup=async()=>{
  service?.close();await db.close();
  if(directory)await rm(directory,{recursive:true,force:true});
 };
 try{
  const imported=await walletFixture();directory=imported.directory;
  const shared=new imported.SharedWalletStore(sql,{now:getTime});
  service=new LibraryService(shared,{registry,now:getTime,seed:typeof seedProvider==='function'?seedProvider:()=>clock.seed,
   id:()=>`00000000-0000-4000-8000-${String(++clock.roundSequence).padStart(12,'0')}`,accepting:true});
  jetx=new JetXService(shared,{now:getTime,roundOptions:{draw:()=>400},accepting:true});
  await sql.unsafe(`CREATE SCHEMA sw_rebuild;
   CREATE TABLE sw_rebuild.users(id text PRIMARY KEY,role text NOT NULL,status text NOT NULL,parent_id text);
   CREATE TABLE sw_rebuild.wallets(id text PRIMARY KEY,balance bigint NOT NULL CHECK(balance>=0),credit_limit bigint NOT NULL DEFAULT 0);
   CREATE TABLE sw_rebuild.sessions(token text PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),expires bigint NOT NULL);
   CREATE TABLE sw_rebuild.transfers(id text PRIMARY KEY,sender text NOT NULL,recipient text NOT NULL,amount bigint NOT NULL CHECK(amount>0),kind text,actor text,notes text);
   CREATE TABLE sw_rebuild.ledger(transfer_id text NOT NULL,wallet_id text NOT NULL,delta bigint NOT NULL,PRIMARY KEY(transfer_id,wallet_id));
   CREATE TABLE sw_rebuild.audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor text,event text,target text,details jsonb);
   CREATE TABLE sw_rebuild.account_limits(user_id text PRIMARY KEY,max_balance bigint);
   CREATE TABLE sw_rebuild.live_revisions(user_id text PRIMARY KEY,revision bigint NOT NULL);
   CREATE TABLE sw_rebuild.rounds(id text PRIMARY KEY,user_id text,game text,bet bigint,payout bigint,outcome jsonb);
   CREATE FUNCTION sw_rebuild.sw_live_touch(text[]) RETURNS void LANGUAGE sql AS 'SELECT NULL::void';`);
  await shared.migrate();await jetx.migrate();await service.migrate();
  installCrossActiveGuards(shared,service,{jetx});
  const setup=async()=>{
   clock.now=startingTime;clock.roundSequence=1;clock.seed=WINNING_SEED;service.accepting=true;
   await sql.unsafe('TRUNCATE sw_native_library.requests,sw_native_library.rounds,sw_jetx_native.requests,sw_jetx_native.bets,sw_jetx_native.boards,sw_native_family.requests,sw_native_family.rounds,sw_rebuild.ledger,sw_rebuild.transfers,sw_rebuild.rounds,sw_rebuild.audit,sw_rebuild.account_limits,sw_rebuild.live_revisions,sw_rebuild.wallets,sw_rebuild.users CASCADE');
   await sql.unsafe("INSERT INTO sw_rebuild.users(id,role,status,parent_id) VALUES('player-a','player','active','agent-a'),('player-b','player','active',null),('blocked','player','blocked',null),('agent-a','agent','active',null)");
   await sql.unsafe("INSERT INTO sw_rebuild.wallets(id,balance) VALUES('player-a',1000000),('player-b',1000000),('blocked',1000000),('house',10000000000)");
  };
  await setup();
  return {service,registry,shared,sql,db,jetx,clock,setup,cleanup,
   playerId:'player-a',otherPlayerId:'player-b',blockedPlayerId:'blocked',now:getTime};
 }catch(error){await cleanup();throw error;}
}
