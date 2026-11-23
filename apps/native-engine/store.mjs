import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {gameById} from './catalog.mjs';
import {advanceGame,fail,formatMinor,maximumLiability,publicRound,seededRandom,stakeMinor,startGame} from './rules.mjs';

const json=value=>JSON.stringify(value);
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value;}
const hash=value=>createHash('sha256').update(value).digest('hex');
const asJSON=value=>typeof value==='string'?JSON.parse(value):value;
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
function strictObject(value,keys){if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(key=>!keys.includes(key)))fail('INVALID_REQUEST');}

export class NativeStore{
 constructor(sql,{now=Date.now,seed=()=>randomBytes(32).toString('hex'),id=randomUUID}={}){this.sql=sql;this.now=now;this.seed=seed;this.id=id;this.liveDashboardReady=false;}
 async migrate(){
  await this.sql.begin(async tx=>{
   await tx.unsafe("SET LOCAL search_path=sw_rebuild,public");
   const compatible=await tx.unsafe("SELECT to_regprocedure('sw_live_touch(text[])') IS NOT NULL AS available");
   if(!compatible[0].available)fail('CANONICAL_DASHBOARD_TRIGGER_UNAVAILABLE',503);
   await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended('superwin-native-family-migration',0))");
   const columns=await tx.unsafe("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='sw_rebuild' AND table_name='wallets'");
   if(!columns.some(c=>c.column_name==='balance'&&c.data_type==='bigint'))fail('CANONICAL_SCHEMA_MISMATCH',503);
   await tx.unsafe(`CREATE SCHEMA IF NOT EXISTS sw_native_family;
    CREATE TABLE IF NOT EXISTS sw_native_family.rounds(
     id uuid PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),game_id text NOT NULL,
     game_config jsonb NOT NULL,state jsonb NOT NULL,secret_seed text NOT NULL CHECK(length(secret_seed)=64),
     commitment text NOT NULL CHECK(length(commitment)=64),reserve_wallet text NOT NULL REFERENCES sw_rebuild.wallets(id),
     liability bigint NOT NULL CHECK(liability>0),status text NOT NULL CHECK(status IN('active','settled')),
     version integer NOT NULL CHECK(version>=0),expires_at bigint NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),settled_at timestamptz);
    CREATE UNIQUE INDEX IF NOT EXISTS native_one_active_round_per_player ON sw_native_family.rounds(user_id) WHERE status='active';
    CREATE INDEX IF NOT EXISTS native_round_expiry ON sw_native_family.rounds(expires_at) WHERE status='active';
    CREATE INDEX IF NOT EXISTS native_round_history ON sw_native_family.rounds(user_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS sw_native_family.requests(
     user_id text NOT NULL REFERENCES sw_rebuild.users(id),request_id uuid NOT NULL,request_hash text NOT NULL,
     result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,request_id));`);
  });
  this.liveDashboardReady=true;
 }
 async transaction(userId,work,{requireActive=true}={}){
  if(typeof userId!=='string'||!userId||userId.length>100)fail('INVALID_IDENTITY',401);
  return this.sql.begin(async tx=>{
   await tx.unsafe("SET LOCAL search_path=sw_rebuild,public");
   await tx.unsafe("SET LOCAL lock_timeout='5s'");await tx.unsafe("SET LOCAL statement_timeout='15s'");
   await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",['native-family:'+userId]);
   const users=await tx.unsafe('SELECT id,role,status,parent_id FROM sw_rebuild.users WHERE id=$1 FOR SHARE',[userId]);
   if(!users[0]||users[0].role!=='player')fail('PLAYER_REQUIRED',403);
   if(requireActive&&users[0].status!=='active')fail('ACCOUNT_BLOCKED',403);
   return work(tx,users[0]);
  });
 }
 async balance(tx,userId){const rows=await tx.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[userId]);if(!rows[0])fail('WALLET_NOT_FOUND',404);return BigInt(rows[0].balance);}
 async move(tx,from,to,amount,id,actor,kind,notes){
  amount=BigInt(amount);if(amount===0n)return;
  if(amount<0n||from===to)fail('INVALID_TRANSFER',500);
  const existing=await tx.unsafe('SELECT sender,recipient,amount FROM sw_rebuild.transfers WHERE id=$1',[id]);
  if(existing.length){if(existing[0].sender!==from||existing[0].recipient!==to||BigInt(existing[0].amount)!==amount)fail('TRANSFER_CONFLICT',409);return;}
  const wallets=await tx.unsafe('SELECT id,balance FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[[from,to]]);
  if(wallets.length!==2)fail('WALLET_NOT_FOUND',503);
  if(BigInt(wallets.find(w=>w.id===from).balance)<amount)fail(from==='house'?'BANKROLL_CAPACITY_UNAVAILABLE':'INSUFFICIENT_FUNDS',409);
  await tx.unsafe('INSERT INTO sw_rebuild.transfers(id,sender,recipient,amount,kind,actor,notes) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,from,to,String(amount),kind,actor,notes]);
  await tx.unsafe('UPDATE sw_rebuild.wallets SET balance=balance-$1 WHERE id=$2',[String(amount),from]);
  await tx.unsafe('UPDATE sw_rebuild.wallets SET balance=balance+$1 WHERE id=$2',[String(amount),to]);
  await tx.unsafe('INSERT INTO sw_rebuild.ledger(transfer_id,wallet_id,delta) VALUES($1,$2,$3),($1,$4,$5)',[id,from,String(-amount),to,String(amount)]);
 }
 async changed(tx,userId,event,roundId,details){
  await tx.unsafe('INSERT INTO sw_rebuild.audit(actor,event,target,details) VALUES($1,$2,$3,$4::jsonb)',[userId,event,roundId,json(details)]);
  await tx.unsafe(`WITH RECURSIVE chain AS(
   SELECT id,parent_id,0 AS depth FROM sw_rebuild.users WHERE id=$1
   UNION ALL SELECT u.id,u.parent_id,c.depth+1 FROM sw_rebuild.users u JOIN chain c ON u.id=c.parent_id WHERE c.depth<16)
   INSERT INTO sw_rebuild.live_revisions(user_id,revision) SELECT DISTINCT id,1 FROM chain
   ON CONFLICT(user_id) DO UPDATE SET revision=sw_rebuild.live_revisions.revision+1`,[userId]);
 }
 view(round,state,now){
  const game=asJSON(round.game_config);const value={...publicRound(game,state,now),round_id:round.id,game_id:round.game_id,game_version:game.version,commitment:round.commitment};
  if(state.status==='settled')value.revealed_seed=round.secret_seed;
  return value;
 }
 async finish(tx,round,state,now){
  const previous=asJSON(round.state),game=asJSON(round.game_config),payout=BigInt(state.payout_minor),stake=BigInt(state.stake_minor);
  if(payout>BigInt(round.liability))fail('PAYOUT_EXCEEDS_RESERVED_LIABILITY',500);
  await tx.unsafe('SELECT id FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[[round.user_id,'house',round.reserve_wallet]]);
  await this.move(tx,round.reserve_wallet,round.user_id,payout,'nf:'+round.id+':payout',round.user_id,state.reason==='EXPIRED_UNPLAYED_REFUND'?'casino_refund':'casino_win',game.name+' '+state.reason);
  const reserve=await this.balance(tx,round.reserve_wallet);
  await this.move(tx,round.reserve_wallet,'house',reserve,'nf:'+round.id+':release',round.user_id,'casino_reserve_release',game.name+' reserve release');
  const result=this.view(round,state,now);
  await tx.unsafe('INSERT INTO sw_rebuild.rounds(id,user_id,game,bet,payout,outcome) VALUES($1,$2,$3,$4,$5,$6::jsonb)',['native-family:'+round.id,round.user_id,'native-family:'+game.id,String(stake),String(payout),json(result)]);
  await this.changed(tx,round.user_id,'casino.native.settled',round.id,{game:game.id,family:game.family,stake_minor:String(stake),payout_minor:String(payout),previous_status:previous.status});
  await tx.unsafe("UPDATE sw_native_family.rounds SET state=$2::jsonb,status='settled',version=$3,settled_at=now() WHERE id=$1",[round.id,json(state),state.version]);
  return result;
 }
 async expire(tx,round,now){
  if(round.status!=='active')return round;
  const state=asJSON(round.state),game=asJSON(round.game_config);
  const expired=state.family==='crash'?now>=Math.min(state.crash_at,state.auto_cashout_at??Infinity):now>=state.expires_at;
  if(!expired)return round;
  const next=advanceGame(game,state,'expire',{},now,seededRandom(round.secret_seed,round.id+':'+(state.version+1)));
  await this.finish(tx,round,next,now);return {...round,status:'settled',state:next,version:next.version};
 }
 async snapshot(userId,gameId){
  gameById(gameId);
  return this.transaction(userId,async tx=>{
   const now=this.now();
   const active=await tx.unsafe("SELECT * FROM sw_native_family.rounds WHERE user_id=$1 AND status='active' FOR UPDATE",[userId]);
   let pending=active[0]?await this.expire(tx,active[0],now):null;
   const rows=await tx.unsafe('SELECT * FROM sw_native_family.rounds WHERE user_id=$1 AND game_id=$2 ORDER BY created_at DESC LIMIT 1',[userId,gameId]);
   const round=pending?.status==='active'&&pending.game_id===gameId?pending:rows[0];
   return {balance:formatMinor(await this.balance(tx,userId)),currency:'ETB',round:round?this.view(round,asJSON(round.state),now):null,other_active_game:pending?.status==='active'&&pending.game_id!==gameId?pending.game_id:null,server_now:now};
  });
 }
 async perform(userId,payload,{allowNewRounds=true,allowedGameIds=null}={}){
  strictObject(payload,['request_id','type','game_id','stake','options','round_id','expected_version','action','input']);
  if(!uuid(payload.request_id))fail('INVALID_REQUEST_ID');
  const game=gameById(payload.game_id),digest=hash(json(canonical(payload)));
  if(!['start','action'].includes(payload.type))fail('INVALID_REQUEST');
  return this.transaction(userId,async tx=>{
   const prior=await tx.unsafe('SELECT request_hash,result FROM sw_native_family.requests WHERE user_id=$1 AND request_id=$2',[userId,payload.request_id]);
   if(prior[0]){
    if(prior[0].request_hash!==digest)fail('REQUEST_ID_CONFLICT',409);
    return {...asJSON(prior[0].result),current_balance:formatMinor(await this.balance(tx,userId)),replayed:true};
   }
   const now=this.now();let round,result;
   if(payload.type==='start'){
    if(!allowNewRounds||(allowedGameIds&&!allowedGameIds.has(game.id)))fail('GAME_RETIRED_USE_DEMO_CATALOG',409);
    const stake=stakeMinor(payload.stake,game),options=payload.options??{};
    strictObject(options,game.family==='mines'?['mines']:game.family==='dice'?['target']:game.family==='plinko'?['risk']:game.family==='crash'?['auto_cashout']:[]);
    const liability=maximumLiability(game,stake,options);
    const active=await tx.unsafe("SELECT * FROM sw_native_family.rounds WHERE user_id=$1 AND status='active' FOR UPDATE",[userId]);
    if(active[0]){const pending=await this.expire(tx,active[0],now);if(pending.status==='active')fail('FINISH_ACTIVE_ROUND:'+pending.game_id,409);}
    const wallet=await this.balance(tx,userId);if(wallet<stake)fail('INSUFFICIENT_FUNDS',409);
    const limits=await tx.unsafe('SELECT max_balance FROM sw_rebuild.account_limits WHERE user_id=$1',[userId]);
    const id=this.id(),reserve='game-reserve:native-family:'+id;
    await tx.unsafe('INSERT INTO sw_rebuild.wallets(id,balance,credit_limit) VALUES($1,0,0)',[reserve]);
    const locked=await tx.unsafe('SELECT id,balance FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[[userId,'house',reserve]]);
    if(locked.length!==3)fail('BANKROLL_NOT_CONFIGURED',503);
    if(BigInt(locked.find(w=>w.id===userId).balance)<stake)fail('INSUFFICIENT_FUNDS',409);
    if(limits[0]?.max_balance!==null&&limits[0]?.max_balance!==undefined&&BigInt(locked.find(w=>w.id===userId).balance)-stake+liability>BigInt(limits[0].max_balance))fail('POTENTIAL_PAYOUT_EXCEEDS_ACCOUNT_LIMIT',409);
    if(BigInt(locked.find(w=>w.id==='house').balance)+stake<liability)fail('BANKROLL_CAPACITY_UNAVAILABLE',409);
    await this.move(tx,userId,'house',stake,'nf:'+id+':bet',userId,'casino_bet',game.name+' native stake');
    await this.move(tx,'house',reserve,liability,'nf:'+id+':reserve',userId,'casino_reserve',game.name+' maximum liability');
    const seed=this.seed(),state=startGame(game,stake,options,now,seededRandom(seed,id+':0'));
    round={id,user_id:userId,game_id:game.id,game_config:game,state,secret_seed:seed,commitment:hash(seed),reserve_wallet:reserve,liability:String(liability),status:state.status,version:0};
    const expiry=state.family==='crash'?Math.min(state.crash_at,state.auto_cashout_at??Infinity):state.expires_at;
    await tx.unsafe('INSERT INTO sw_native_family.rounds(id,user_id,game_id,game_config,state,secret_seed,commitment,reserve_wallet,liability,status,version,expires_at) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10,0,$11)',[id,userId,game.id,json(game),json(state),seed,round.commitment,reserve,String(liability),state.status,Math.floor(expiry)]);
    if(state.status==='settled')result=await this.finish(tx,round,state,now);
    else{await this.changed(tx,userId,'casino.native.started',id,{game:game.id,family:game.family,stake_minor:String(stake),reserved_minor:String(liability)});result=this.view(round,state,now);}
   }else{
    if(!uuid(payload.round_id)||!Number.isSafeInteger(payload.expected_version)||payload.expected_version<0)fail('INVALID_ROUND');
    const rows=await tx.unsafe('SELECT * FROM sw_native_family.rounds WHERE id=$1 AND user_id=$2 FOR UPDATE',[payload.round_id,userId]);
    if(!rows[0]||rows[0].game_id!==game.id)fail('ROUND_NOT_FOUND',404);round=rows[0];
    if(round.status!=='active')fail('ROUND_ALREADY_SETTLED',409);
    if(Number(round.version)!==payload.expected_version)fail('ROUND_VERSION_CHANGED',409);
    const input=payload.input??{};strictObject(input,payload.action==='pick'?['cell']:payload.action==='guess'?['choice']:[]);
    const state=asJSON(round.state),config=asJSON(round.game_config);
    const next=advanceGame(config,state,payload.action,input,now,seededRandom(round.secret_seed,round.id+':'+(state.version+1)));
    if(next.status==='settled')result=await this.finish(tx,round,next,now);
    else{
     await tx.unsafe('UPDATE sw_native_family.rounds SET state=$2::jsonb,version=$3 WHERE id=$1',[round.id,json(next),next.version]);
     result=this.view(round,next,now);
    }
   }
   const response={status:'SUCCESS',request_id:payload.request_id,round:result,balance:formatMinor(await this.balance(tx,userId)),currency:'ETB',server_now:now};
   await tx.unsafe('INSERT INTO sw_native_family.requests(user_id,request_id,request_hash,result) VALUES($1,$2,$3,$4::jsonb)',[userId,payload.request_id,digest,json(response)]);
   return response;
  });
 }
 async reconcile(limit=25){
  const candidates=await this.sql.unsafe("SELECT id,user_id FROM sw_native_family.rounds WHERE status='active' AND expires_at<=$1 ORDER BY expires_at LIMIT $2",[this.now(),Math.max(1,Math.min(100,limit))]);
  let settled=0;
  for(const candidate of candidates)await this.transaction(candidate.user_id,async tx=>{
   const rows=await tx.unsafe('SELECT * FROM sw_native_family.rounds WHERE id=$1 FOR UPDATE',[candidate.id]);
   if(rows[0]?.status==='active'){const result=await this.expire(tx,rows[0],this.now());if(result.status==='settled')settled++;}
  },{requireActive:false});
  return {examined:candidates.length,settled};
 }
}
