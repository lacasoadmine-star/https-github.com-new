import {randomUUID,createHash} from 'node:crypto';
import {GAME_ID,VERSION,LIMITS,IMPLEMENTATION,fail,cash,quote,newRound,phase,publicRound,coefficientAt,payout,dueResult,reachesAt} from './rules.mjs';

const json=value=>JSON.stringify(value);
const parse=value=>typeof value==='string'?JSON.parse(value):value;
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;

// The existing engine supplies canonical user authentication, transactional
// wallet moves, dashboard revisions and audit writes. JetX adds its own tables.
export class JetXService {
 constructor(shared,{now=Date.now,id=randomUUID,roundOptions={},accepting=false,autoTimers=false,setTimer=setTimeout,clearTimer=clearTimeout}={}){this.shared=shared;this.sql=shared.sql;this.now=now;this.id=id;this.roundOptions=roundOptions;this.accepting=accepting;this.ready=false;this.autoTimers=autoTimers;this.setTimer=setTimer;this.clearTimer=clearTimer;this.timers=new Map();this.scheduling=new Map();this.connected=new Map();}
 async migrate(){
  await this.sql.begin(async tx=>{
   await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended('superwin-jetx-native-migrate',0))");
   await tx.unsafe(`CREATE SCHEMA IF NOT EXISTS sw_jetx_native;
    CREATE TABLE IF NOT EXISTS sw_jetx_native.boards(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,configuration jsonb NOT NULL,opened_at bigint NOT NULL,ends_at bigint NOT NULL);
    CREATE TABLE IF NOT EXISTS sw_jetx_native.bets(id uuid PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),board_id bigint NOT NULL REFERENCES sw_jetx_native.boards(id),position smallint NOT NULL CHECK(position BETWEEN 0 AND 3),stake bigint NOT NULL CHECK(stake>0),auto integer,reserve_wallet text NOT NULL REFERENCES sw_rebuild.wallets(id),liability bigint NOT NULL CHECK(liability>0),status text NOT NULL CHECK(status IN('active','settled','cancelled')),payout bigint NOT NULL DEFAULT 0 CHECK(payout>=0),coefficient integer NOT NULL DEFAULT 0,reason text,created_at bigint NOT NULL,settled_at bigint,model_version text NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS jetx_one_bet_per_position ON sw_jetx_native.bets(user_id,board_id,position) WHERE status<>'cancelled';
    CREATE INDEX IF NOT EXISTS jetx_active_bets ON sw_jetx_native.bets(user_id,board_id) WHERE status='active';
    CREATE TABLE IF NOT EXISTS sw_jetx_native.requests(user_id text NOT NULL REFERENCES sw_rebuild.users(id),request_id uuid NOT NULL,request_hash text NOT NULL,result jsonb NOT NULL,created_at bigint NOT NULL,PRIMARY KEY(user_id,request_id));
    CREATE TABLE IF NOT EXISTS sw_jetx_native.messages(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),request_id uuid NOT NULL,message text NOT NULL CHECK(length(message) BETWEEN 1 AND 500),sent_at bigint NOT NULL,UNIQUE(user_id,request_id));`);
  });this.ready=true;
 }
 async board(tx,now){
  // Only this short board operation takes the shared lock. No other account is
  // settled while holding it; player settlement stays under its account lock.
  await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended('superwin-jetx-native-board',0))");
  let rows=await tx.unsafe('SELECT configuration FROM sw_jetx_native.boards ORDER BY id DESC LIMIT 1');
  if(rows[0]){const current=parse(rows[0].configuration);if(now<current.endsAt)return current;}
  const inserted=await tx.unsafe('INSERT INTO sw_jetx_native.boards(configuration,opened_at,ends_at) VALUES($1::jsonb,$2,$3) RETURNING id',[json({}),now,now+5000]);
  const value=newRound(inserted[0].id,now,this.roundOptions);
  await tx.unsafe('UPDATE sw_jetx_native.boards SET configuration=$2::jsonb,ends_at=$3 WHERE id=$1',[value.id,json(value),value.endsAt]);return value;
 }
 async finish(tx,bet,result,now){
  if(bet.status!=='active')return;
  const amount=BigInt(result.payout);if(amount<0n||amount>BigInt(bet.liability))fail('PAYOUT_EXCEEDS_RESERVED_LIABILITY',500);
  await tx.unsafe('SELECT id FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[[bet.user_id,'house',bet.reserve_wallet]]);
  await this.shared.move(tx,bet.reserve_wallet,bet.user_id,amount,`jx:${bet.id}:payout`,bet.user_id,result.reason==='CANCELLED'?'casino_refund':'casino_win',GAME_ID+' '+result.reason);
  await this.shared.move(tx,bet.reserve_wallet,'house',await this.shared.balance(tx,bet.reserve_wallet),`jx:${bet.id}:release`,bet.user_id,'casino_reserve_release',GAME_ID);
  const status=result.reason==='CANCELLED'?'cancelled':'settled';
  await tx.unsafe('UPDATE sw_jetx_native.bets SET status=$2,payout=$3,coefficient=$4,reason=$5,settled_at=$6 WHERE id=$1',[bet.id,status,String(amount),result.coefficient,result.reason,now]);
  if(status==='settled')await tx.unsafe('INSERT INTO sw_rebuild.rounds(id,user_id,game,bet,payout,outcome) VALUES($1,$2,$3,$4,$5,$6::jsonb)',[`jetx-native:${bet.id}`,bet.user_id,GAME_ID,String(bet.stake),String(amount),json({game_id:GAME_ID,model_version:bet.model_version,board_id:String(bet.board_id),position:bet.position,coefficient:result.coefficient,reason:result.reason})]);
  await this.shared.changed(tx,bet.user_id,'casino.jetx.'+status,bet.id,{game:GAME_ID,board_id:String(bet.board_id),position:bet.position,stake_minor:String(bet.stake),payout_minor:String(amount),reason:result.reason});
  Object.assign(bet,{status,payout:String(amount),coefficient:result.coefficient,reason:result.reason,settled_at:now});
 }
 async advance(tx,user,now){
  const rows=await tx.unsafe("SELECT b.*,r.configuration FROM sw_jetx_native.bets b JOIN sw_jetx_native.boards r ON r.id=b.board_id WHERE b.user_id=$1 AND b.status='active' ORDER BY b.created_at,b.id FOR UPDATE OF b",[user]);
  for(const bet of rows){const result=dueResult(bet,parse(bet.configuration),now);if(result)await this.finish(tx,bet,result,now);}
 }
 publicBet(b){return {id:b.id,boardId:String(b.board_id),position:Number(b.position),stake:cash(b.stake),auto:b.auto===null?null:String(Number(b.auto)/100),status:b.status,payout:cash(b.payout),coefficient:Number(b.coefficient),reason:b.reason,modelVersion:b.model_version,createdAt:Number(b.created_at),settledAt:b.settled_at===null?null:Number(b.settled_at)};}
 async snapshot(tx,user,board,now){
  const bets=await tx.unsafe('SELECT * FROM sw_jetx_native.bets WHERE user_id=$1 AND board_id=$2 ORDER BY created_at,id',[user,board.id]);
  const history=await tx.unsafe('SELECT configuration FROM sw_jetx_native.boards WHERE ends_at-$1<=$2 ORDER BY id DESC LIMIT 100',[LIMITS.aftermathMs,now]);
  const personal=await tx.unsafe("SELECT b.*,r.configuration FROM sw_jetx_native.bets b JOIN sw_jetx_native.boards r ON r.id=b.board_id WHERE b.user_id=$1 AND b.status='settled' AND r.ends_at-$2<=$3 ORDER BY b.settled_at DESC LIMIT 24",[user,LIMITS.aftermathMs,now]);
  const publicBets=await tx.unsafe("SELECT user_id,position,stake,payout,coefficient,status FROM sw_jetx_native.bets WHERE board_id=$1 AND status<>'cancelled' ORDER BY stake DESC LIMIT 300",[board.id]);
  const balance=await this.shared.balance(tx,user);
  return {gameId:GAME_ID,modelVersion:VERSION,implementation:IMPLEMENTATION,userId:user,playerName:this.playerName(user),onlinePlayers:Math.max(1,this.connected.size),publicPlayers:publicBets.map(b=>({id:b.user_id===user?user:createHash('sha256').update('jetx-public:'+b.user_id).digest('hex'),name:this.playerName(b.user_id),position:Number(b.position),stake:cash(b.stake),payout:cash(b.payout),coefficient:Number(b.coefficient),status:b.status})),currency:'ETB',balance:cash(balance),accepting:this.accepting,serverNow:now,board:publicRound(board,now),bets:bets.map(b=>this.publicBet(b)),personalHistory:personal.map(b=>({...this.publicBet(b),roundCrash:parse(b.configuration).crash,commitment:parse(b.configuration).commitment})),history:history.map(r=>{const b=parse(r.configuration);return {id:b.id,coefficient:b.crash,info:b.info,commitment:b.commitment,crashedAt:b.crashesAt};})};
 }
 async state(user){
  if(!this.ready)fail('JETX_UNAVAILABLE',503);
  return this.shared.transaction(user,async tx=>{const now=this.now(),board=await this.board(tx,now);await this.advance(tx,user,now);return this.snapshot(tx,user,board,now);});
 }
 validate(body){
  const allowed=['request_id','type','board_id','position','positions','stake','auto_cashout','model_version'];
  if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(k=>!allowed.includes(k))||!uuid(body.request_id)||!['bet','cancel','cashout','cashout_many'].includes(body.type)||typeof body.board_id!=='string'||!/^\d{1,20}$/.test(body.board_id)||body.model_version!==VERSION)fail('INVALID_JETX_REQUEST');
  const positions=body.type==='cashout_many'?body.positions:[body.position];
  if(!Array.isArray(positions)||positions.length<1||positions.length>4||new Set(positions).size!==positions.length||positions.some(p=>!Number.isInteger(p)||p<0||p>=LIMITS.positions))fail('INVALID_BET_POSITION');
  if(body.type!=='cashout_many'&&body.positions!==undefined)fail('INVALID_JETX_REQUEST');
  if(body.type!=='bet'&&(body.stake!==undefined||body.auto_cashout!==undefined))fail('INVALID_JETX_REQUEST');
  return positions;
 }
 async action(user,body){
  if(!this.ready)fail('JETX_UNAVAILABLE',503);
  const positions=this.validate(body),fingerprint=createHash('sha256').update(json(canonical(body))).digest('hex');
  return this.shared.transaction(user,async tx=>{
   const prior=await tx.unsafe('SELECT request_hash,result FROM sw_jetx_native.requests WHERE user_id=$1 AND request_id=$2',[user,body.request_id]);
   if(prior[0]){if(prior[0].request_hash!==fingerprint)fail('REQUEST_ID_CONFLICT',409);return {...parse(prior[0].result),replayed:true,currentBalance:cash(await this.shared.balance(tx,user))};}
   const now=this.now(),board=await this.board(tx,now);await this.advance(tx,user,now);
   if(body.type==='bet'){
    if(!this.accepting)fail('JETX_NEW_BETS_DISABLED',503);
    if(body.board_id!==board.id||phase(board,now)!=='betting')fail('BETTING_CLOSED',409);
    const {amount,target,liability}=quote(body.stake,body.auto_cashout??null);
    const old=await tx.unsafe("SELECT id FROM sw_jetx_native.bets WHERE user_id=$1 AND board_id=$2 AND position=$3 AND status<>'cancelled'",[user,board.id,body.position]);
    if(old.length)fail('BET_ALREADY_PLACED',409);
    const external=await tx.unsafe("SELECT id FROM sw_native_family.rounds WHERE user_id=$1 AND status='active' LIMIT 1",[user]);
    if(external.length)fail('FINISH_EXISTING_ACTIVE_ROUND',409);
    const id=this.id(),reserve=`game-reserve:jetx-native:${id}`;
    await tx.unsafe('INSERT INTO sw_rebuild.wallets(id,balance,credit_limit) VALUES($1,0,0)',[reserve]);
    const locked=await tx.unsafe('SELECT id,balance FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[[user,'house',reserve]]);
    if(locked.length!==3)fail('BANKROLL_NOT_CONFIGURED',503);
    const balance=BigInt(locked.find(w=>w.id===user).balance),house=BigInt(locked.find(w=>w.id==='house').balance);
    if(balance<amount)fail('INSUFFICIENT_FUNDS',409);
    if(house+amount<liability)fail('BANKROLL_CAPACITY_UNAVAILABLE',409);
    const limits=await tx.unsafe('SELECT max_balance FROM sw_rebuild.account_limits WHERE user_id=$1',[user]);
    const pending=await tx.unsafe("SELECT COALESCE(sum(liability),0)::text AS liability FROM sw_jetx_native.bets WHERE user_id=$1 AND status='active'",[user]);
    if(limits[0]?.max_balance!=null&&balance-amount+liability+BigInt(pending[0].liability)>BigInt(limits[0].max_balance))fail('POTENTIAL_PAYOUT_EXCEEDS_ACCOUNT_LIMIT',409);
    await this.shared.move(tx,user,'house',amount,`jx:${id}:bet`,user,'casino_bet',GAME_ID);
    await this.shared.move(tx,'house',reserve,liability,`jx:${id}:reserve`,user,'casino_reserve',GAME_ID);
    await tx.unsafe("INSERT INTO sw_jetx_native.bets(id,user_id,board_id,position,stake,auto,reserve_wallet,liability,status,created_at,model_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10)",[id,user,board.id,body.position,String(amount),target,reserve,String(liability),now,VERSION]);
    await this.shared.changed(tx,user,'casino.jetx.bet',id,{game:GAME_ID,board_id:board.id,position:body.position,stake_minor:String(amount),liability_minor:String(liability)});
   }else{
    const requested=await tx.unsafe('SELECT configuration FROM sw_jetx_native.boards WHERE id=$1',[body.board_id]);
    if(!requested[0])fail('ROUND_NOT_FOUND',404);const round=parse(requested[0].configuration);
    for(const position of positions){
     const rows=await tx.unsafe("SELECT * FROM sw_jetx_native.bets WHERE user_id=$1 AND board_id=$2 AND position=$3 AND status<>'cancelled' FOR UPDATE",[user,body.board_id,position]);
     const bet=rows[0];if(!bet)fail('BET_NOT_FOUND',404);
     if(bet.status!=='active')continue;
     if(body.type==='cancel'){
      if(phase(round,now)!=='betting')fail('BET_CANNOT_BE_CANCELLED',409);
      await this.finish(tx,bet,{payout:BigInt(bet.stake),coefficient:100,reason:'CANCELLED'},now);
     }else{
      if(phase(round,now)!=='flight')fail('CASHOUT_NOT_AVAILABLE',409);
      const coefficient=coefficientAt(round.startsAt,now);
      await this.finish(tx,bet,{payout:payout(BigInt(bet.stake),coefficient),coefficient,reason:'CASHOUT'},now);
     }
    }
   }
   const result={status:'SUCCESS',requestId:body.request_id,...await this.snapshot(tx,user,board,now)};
   await tx.unsafe('INSERT INTO sw_jetx_native.requests(user_id,request_id,request_hash,result,created_at) VALUES($1,$2,$3,$4::jsonb,$5)',[user,body.request_id,fingerprint,json(result),now]);return result;
  }).then(result=>{if(this.autoTimers)void this.schedule(user).catch(()=>console.error('jetx_timer_schedule_failed'));return result;});
 }
 async reconcile(limit=50){
  const users=await this.sql.unsafe("SELECT user_id FROM sw_jetx_native.bets WHERE status='active' GROUP BY user_id ORDER BY min(created_at) LIMIT $1",[Math.max(1,Math.min(100,limit))]);
  for(const {user_id:user} of users){await this.shared.transaction(user,tx=>this.advance(tx,user,this.now()),{requireActive:false});if(this.autoTimers)await this.schedule(user);}
  return {examinedUsers:users.length};
 }
 async schedule(user){
  const pending=(this.scheduling.get(user)||Promise.resolve()).catch(()=>{}).then(()=>this.scheduleNow(user));
  this.scheduling.set(user,pending);
  void pending.finally(()=>{if(this.scheduling.get(user)===pending)this.scheduling.delete(user);}).catch(()=>{});
  return pending;
 }
 async scheduleNow(user){
  const rows=await this.sql.unsafe("SELECT b.*,r.configuration FROM sw_jetx_native.bets b JOIN sw_jetx_native.boards r ON r.id=b.board_id WHERE b.user_id=$1 AND b.status='active'",[user]);
  if(this.timers.has(user)){this.clearTimer(this.timers.get(user));this.timers.delete(user);}
  if(!rows.length)return;
  let deadline=Infinity;
  for(const bet of rows){
   const round=parse(bet.configuration),stake=BigInt(bet.stake),cap=Number((LIMITS.maxWin*100n+stake-1n)/stake),target=Math.min(bet.auto??LIMITS.maxMultiplier,LIMITS.maxMultiplier,cap);
   deadline=Math.min(deadline,target<=round.crash?reachesAt(round.startsAt,target):round.crashesAt);
  }
  const timer=this.setTimer(async()=>{
   this.timers.delete(user);
   try{await this.shared.transaction(user,tx=>this.advance(tx,user,this.now()),{requireActive:false});await this.schedule(user);}catch{console.error('jetx_timed_settlement_failed');}
  },Math.max(1,deadline-this.now()+2));
  timer?.unref?.();this.timers.set(user,timer);
 }
 async recoverTimers(){
  const users=await this.sql.unsafe("SELECT DISTINCT user_id FROM sw_jetx_native.bets WHERE status='active' LIMIT 1000");
  for(const {user_id:user}of users)await this.schedule(user);
 }
 playerName(user){return 'Player '+createHash('sha256').update(user).digest('hex').slice(0,8);}
 async chat(user,since='0',body=null){
  if(typeof since!=='string'||!/^\d{1,20}$/.test(since))fail('INVALID_CHAT_VERSION');
  if(body&&(!uuid(body.requestId)||typeof body.message!=='string'||!body.message.trim()||body.message.length>500||Buffer.byteLength(body.message)>2000||Object.keys(body).some(k=>!['requestId','message'].includes(k))))fail('INVALID_CHAT_MESSAGE');
  return this.shared.transaction(user,async tx=>{
   if(body){
    const previous=await tx.unsafe('SELECT message FROM sw_jetx_native.messages WHERE user_id=$1 AND request_id=$2',[user,body.requestId]);
    if(previous[0]){if(previous[0].message!==body.message.trim())fail('REQUEST_ID_CONFLICT',409);}
    else{
     const latest=await tx.unsafe('SELECT sent_at FROM sw_jetx_native.messages WHERE user_id=$1 ORDER BY id DESC LIMIT 1',[user]);
     if(latest[0]&&this.now()-Number(latest[0].sent_at)<60000)fail('CHAT_RATE_LIMIT',429);
     await tx.unsafe('INSERT INTO sw_jetx_native.messages(user_id,request_id,message,sent_at) VALUES($1,$2,$3,$4)',[user,body.requestId,body.message.trim(),this.now()]);
    }
   }
   const rows=await tx.unsafe('SELECT id,user_id,message,sent_at FROM sw_jetx_native.messages WHERE id>$1 ORDER BY id DESC LIMIT 200',[since]);
   const version=rows[0]?.id||since;
   return [String(version),rows.reverse().map(r=>({SenderName:this.playerName(r.user_id),Message:r.message,SendTimeParsed:new Date(Number(r.sent_at)).toISOString()})),0];
  });
 }
 async feed(){
  const now=this.now();
  if(this.cachedRoom&&now<this.cachedRoom.endsAt)return publicRound(this.cachedRoom,now);
  if(!this.roomRefresh)this.roomRefresh=this.sql.begin(tx=>this.board(tx,now)).then(round=>{this.cachedRoom=round;return round;}).finally(()=>{this.roomRefresh=null;});
  return publicRound(await this.roomRefresh,this.now());
 }
 async eventStream(user,signal){
  // Authorize against the current account before opening a short-lived stream.
  await this.shared.transaction(user,async()=>true);
  const encoder=new TextEncoder();let timer,stop=false,controller;
  this.connected.set(user,(this.connected.get(user)||0)+1);
  const finish=()=>{if(stop)return;stop=true;clearTimeout(timer);const count=(this.connected.get(user)||1)-1;if(count)this.connected.set(user,count);else this.connected.delete(user);try{controller?.close();}catch{}};
  const body=new ReadableStream({start:c=>{
   controller=c;const until=this.now()+30000;
   const tick=async()=>{
    if(stop)return;
    try{const state=await this.feed();if(stop)return;c.enqueue(encoder.encode('data: '+json(state)+'\n\n'));}
    catch{finish();return;}
    if(this.now()>=until){finish();return;}timer=setTimeout(tick,LIMITS.stepMs);
   };
   signal?.addEventListener('abort',finish,{once:true});if(signal?.aborted){finish();return;}void tick();
  },cancel:finish});
  return new Response(body,{headers:{'content-type':'text/event-stream','cache-control':'no-store, no-transform','x-accel-buffering':'no','x-content-type-options':'nosniff'}});
 }
}
