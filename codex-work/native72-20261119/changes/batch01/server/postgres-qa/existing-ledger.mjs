// QA-only callback binding to a real disposable PostgreSQL connection.
// SQL copied from read-only deployed superwin-nine-slot-engine source, 2026-11-21.
// No HTTP server, Railway configuration, real account or probability model is created.
import {createHash} from 'node:crypto';
import {createSwNinePgAdapter} from '../sw-nine-pg-adapter.mjs';
import {OFFICIAL_LINE_PATHS} from '../official-math.mjs';

export const hash=s=>createHash('sha256').update(s).digest('hex');
export const uid='qa-player',house='house',cookie='b'.repeat(64);
export const guard=hash('fresh-account-session-v1\0'+uid+'\0'+cookie);
export const request=new Request('https://qa.invalid/api/slots/spin',{method:'POST',headers:{cookie:'sw_session='+cookie}});
export const profileFor=id=>({gameId:id,productionApproved:true,probabilityModelAudited:true,
  auditReference:'QA_ONLY_SYNTHETIC_NOT_A_PRODUCTION_CERTIFICATION',
  mathSha256:'c'.repeat(64),mathVersion:'qa-only-v1',engineVersion:'qa-only-r1',
  linePaths:OFFICIAL_LINE_PATHS[id],reelStrips:Array.from({length:5},()=>['seven','seven','seven']),
  wheelWeights:[1,1,1,1,1]});
export const dataFor=(id,roundToken)=>({gameId:id,bet:'1.00',roundToken,sessionGuard:guard,
  mathSha256:'c'.repeat(64),mathVersion:'qa-only-v1',engineVersion:'qa-only-r1'});
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code})};

export function createFixture(pool,{profileLookupFails=false,operator=true,accepting=true,
  failAfterWin=false,beforeTransaction,afterFirstAuth}={}){
  let transactions=0,authenticated=0,activeTransactions=0,maxActiveTransactions=0;
  const authenticate=async(req,c=pool,locked=false)=>{
    const raw=req.headers.get('cookie')?.match(/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    if(!raw)fail(401,'PLAYER_LOGIN_REQUIRED');
    const r=await c.query(`SELECT u.id,u.role,u.status FROM sw_rebuild.sessions s JOIN sw_rebuild.users u ON u.id=s.user_id WHERE s.token=ANY($1::text[]) AND s.expires>$2${locked?' FOR SHARE OF s,u':''}`,[[raw,hash(raw)],Date.now()]);
    if(r.rowCount!==1||r.rows[0].role!=='player'||r.rows[0].status!=='active')fail(401,'ACTIVE_PLAYER_SESSION_REQUIRED');
    authenticated++;
    if(authenticated===1)await afterFirstAuth?.();
    return r.rows[0].id;
  };
  const balance=async(c,id)=>{
    const r=await c.query('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[id]);
    if(r.rowCount!==1)fail(503,'WALLET_NOT_CONFIGURED');return r.rows[0].balance;
  };
  const fixture={
    setProfileOutage(value){profileLookupFails=value},setOperator(value){operator=value},
    metrics:()=>({transactions,authenticated,maxActiveTransactions}),
  };
  fixture.api=createSwNinePgAdapter({
    authenticate,balance,houseFor:()=>house,hash,accepting:()=>accepting,
    profileForGame:async id=>{if(profileLookupFails)throw Error('PROFILE_STORE_UNAVAILABLE');return profileFor(id)},
    assertOperatorWagerEnabled:async()=>{if(!operator)fail(503,'OPERATOR_WAGER_DISABLED')},
    assertNoActive:async(c,id)=>{
      const r=await c.query("SELECT game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' ORDER BY created_at,id LIMIT 1",[id]);
      if(r.rows[0]?.game_id)fail(409,'FINISH_ACTIVE_ROUND:'+r.rows[0].game_id);
    },
    assertPlayerCapacity:async(c,id,before,stake,maximumPayout)=>{
      const r=await c.query('SELECT max_balance FROM sw_rebuild.account_limits WHERE user_id=$1',[id]);
      const cap=r.rows[0]?.max_balance;
      if(cap!==null&&cap!==undefined&&BigInt(before)-BigInt(stake)+BigInt(maximumPayout)>BigInt(cap))fail(409,'ACCOUNT_BALANCE_LIMIT');
    },
    transaction:async fn=>{
      transactions++;await beforeTransaction?.();
      const c=await pool.connect();
      let entered=false;
      try{
        await c.query('BEGIN');await c.query('SET LOCAL search_path = pg_catalog, sw_rebuild, public');
        await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='15s'");
        entered=true;activeTransactions++;maxActiveTransactions=Math.max(maxActiveTransactions,activeTransactions);
        const value=await fn(c);await c.query('COMMIT');return value;
      }catch(e){await c.query('ROLLBACK');throw e}finally{if(entered)activeTransactions--;c.release()}
    },
    lockWallets:async(c,id)=>{
      const r=await c.query('SELECT id,balance FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[[id,house]]);
      if(r.rowCount!==2)fail(503,'PLAYER_OR_HOUSE_WALLET_MISSING');return r.rows;
    },
    move:async(c,id,round,game,kind,amount,from,to)=>{
      if(amount<=0n)throw Error('POSITIVE_TRANSFER_REQUIRED');
      const r=await c.query(`WITH d AS (
 UPDATE sw_rebuild.wallets SET balance=balance-$3::bigint WHERE id=$1 AND balance >=$3::bigint RETURNING balance),
 cr AS (UPDATE sw_rebuild.wallets SET balance=balance+$3::bigint WHERE id=$2 AND EXISTS(SELECT 1 FROM d) RETURNING balance),
 t AS (INSERT INTO sw_rebuild.transfers(id,sender,recipient,amount,kind,actor) SELECT $4,$1,$2,$3::bigint,$5,$6 WHERE EXISTS(SELECT 1 FROM cr) RETURNING id),
 l AS (INSERT INTO sw_rebuild.ledger(transfer_id,wallet_id,delta) SELECT t.id,$1,-$3::bigint FROM t UNION ALL SELECT t.id,$2,$3::bigint FROM t),
 audit AS (INSERT INTO sw_nine.wallet_transactions(user_id,round_id,game_id,type,amount,balance_after,transfer_id)
 SELECT $6,$7::uuid,$8,$9,$3::bigint,CASE WHEN $6=$1 THEN (SELECT balance FROM d) ELSE (SELECT balance FROM cr) END,t.id FROM t RETURNING id)
 SELECT (SELECT count(*) FROM d)::int debited,(SELECT count(*) FROM cr)::int credited,(SELECT count(*) FROM audit)::int recorded`,
        [from,to,amount.toString(),'nine:'+round+':'+kind,kind==='BET'?'bet':'win',id,round,game,kind]);
      if(r.rows[0].debited!==1)fail(from===id?402:503,from===id?'INSUFFICIENT_FUNDS':'HOUSE_RESERVE_INSUFFICIENT');
      if(r.rows[0].credited!==1||r.rows[0].recorded!==1)fail(503,'CREDIT_ACCOUNT_MISSING');
      if(failAfterWin&&kind==='WIN')throw Error('SIMULATED_FAILURE_AFTER_ACTUAL_WIN_SQL');
    }
  });
  return fixture;
}
