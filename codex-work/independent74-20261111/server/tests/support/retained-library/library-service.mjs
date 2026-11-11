import {createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';

export const fail=(code,status=422)=>{throw Object.assign(new Error(code),{status});};
const json=value=>JSON.stringify(value);
const parse=value=>typeof value==='string'?JSON.parse(value):value;
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const canonical=value=>Array.isArray(value)?value.map(canonical):object(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>createHash('sha256').update(value).digest('hex');
export const cash=value=>{const n=BigInt(value);return `${n/100n}.${String(n%100n).padStart(2,'0')}`;};
export function minor(value){if(typeof value!=='string'||!/^(0|[1-9]\d{0,14})$/.test(value))fail('INVALID_ENGINE_MONEY',500);return BigInt(value);}
export function stake(value){if(typeof value!=='string'||!/^(0|[1-9]\d{0,10})\.\d{2}$/.test(value)||BigInt(value.replace('.',''))===0n)fail('INVALID_STAKE');return BigInt(value.replace('.',''));}
export function seededRandom(seed,domain){let counter=0;return ()=>{const bytes=createHmac('sha256',seed).update(domain+':'+counter++).digest();return Number(bytes.readBigUInt64BE()&((1n<<53n)-1n))/2**53;};}

// Engines are versioned independently. Retain every adapter that has accepted a
// round: recovery resolves its stored version rather than a new default model.
export function createRegistry(adapters){
 const current=new Map(),versions=new Map();
 for(const adapter of adapters){
  if(!object(adapter.definitions)||['start','act','publicState','expire'].some(key=>typeof adapter[key]!=='function'))throw new Error('INVALID_LIBRARY_ADAPTER');
  for(const [id,definition]of Object.entries(adapter.definitions)){
   if(!/^[a-z0-9_]{1,64}$/.test(id)||typeof definition.version!=='string'||!definition.version||definition.version.length>100)throw new Error('INVALID_LIBRARY_DEFINITION');
   const key=id+'@'+definition.version;if(versions.has(key))throw new Error('DUPLICATE_LIBRARY_MODEL');
   const model={adapter,definition:{...definition,id},id,version:definition.version};versions.set(key,model);current.set(id,model);
  }
 }
 return {definitions:()=>Object.fromEntries([...current].map(([id,m])=>[id,m.definition])),get(id,version){const model=version===undefined?current.get(id):versions.get(id+'@'+version);if(!model)fail('GAME_MODEL_UNAVAILABLE',409);return model;}};
}

export class LibraryService {
 constructor(shared,{registry,now=Date.now,seed=()=>randomBytes(32).toString('hex'),id=randomUUID,accepting=false,autoTimers=false,setTimer=setTimeout,clearTimer=clearTimeout}={}){
  if(!registry)throw new Error('LIBRARY_REGISTRY_REQUIRED');
  this.shared=shared;this.sql=shared.sql;this.registry=registry;this.now=now;this.seed=seed;this.id=id;this.accepting=accepting;this.ready=false;
  this.autoTimers=autoTimers;this.setTimer=setTimer;this.clearTimer=clearTimer;this.timers=new Map();this.scheduling=new Map();
 }
 async migrate(){
  await this.sql.begin(async tx=>{
   await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended('superwin-native-library-migration',0))");
   await tx.unsafe(`CREATE SCHEMA IF NOT EXISTS sw_native_library;
    CREATE TABLE IF NOT EXISTS sw_native_library.rounds(
     id uuid PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),game_id text NOT NULL,
     model_version text NOT NULL,state jsonb NOT NULL,secret_seed text NOT NULL CHECK(length(secret_seed)=64),
     commitment text NOT NULL CHECK(length(commitment)=64),reserve_wallet text NOT NULL REFERENCES sw_rebuild.wallets(id),
     liability bigint NOT NULL CHECK(liability>=0),total_stake bigint NOT NULL CHECK(total_stake>=0),
     status text NOT NULL CHECK(status IN('active','settled')),version integer NOT NULL CHECK(version>=0),
     expires_at bigint NOT NULL,created_at bigint NOT NULL,settled_at bigint);
    CREATE UNIQUE INDEX IF NOT EXISTS library_one_active_round_per_player ON sw_native_library.rounds(user_id) WHERE status='active';
    CREATE INDEX IF NOT EXISTS library_round_expiry ON sw_native_library.rounds(expires_at) WHERE status='active';
    CREATE INDEX IF NOT EXISTS library_round_history ON sw_native_library.rounds(user_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS sw_native_library.requests(user_id text NOT NULL REFERENCES sw_rebuild.users(id),
     request_id uuid NOT NULL,request_hash text NOT NULL,result jsonb NOT NULL,created_at bigint NOT NULL,
     PRIMARY KEY(user_id,request_id));`);
   // These existing schemas are needed for mutual active-round exclusion.
   const rows=await tx.unsafe("SELECT to_regclass('sw_native_family.rounds') IS NOT NULL AND to_regclass('sw_jetx_native.bets') IS NOT NULL AS available");
   if(!rows[0]?.available)fail('EXISTING_GAME_SCHEMAS_REQUIRED',503);
  });this.ready=true;
 }
 validate(body){
  if(!object(body)||Object.keys(body).some(k=>!['request_id','type','game_id','model_version','stake','options','round_id','expected_version','action','input'].includes(k))||!uuid(body.request_id)||!['start','action'].includes(body.type)||typeof body.game_id!=='string'||typeof body.model_version!=='string')fail('INVALID_LIBRARY_REQUEST');
  if(body.type==='start'){
   if(['round_id','expected_version','action','input'].some(k=>body[k]!==undefined)||!object(body.options??{}))fail('INVALID_LIBRARY_REQUEST');
   stake(body.stake);if(Object.keys(body.options??{}).some(k=>['stakeMinor','gameId','status','payoutMinor','maxPayoutMinor','expiresAt','modelVersion'].includes(k)))fail('INVALID_LIBRARY_OPTIONS');
  }else if(['stake','options'].some(k=>body[k]!==undefined)||!uuid(body.round_id)||!Number.isSafeInteger(body.expected_version)||body.expected_version<0||typeof body.action!=='string'||!object(body.input??{})||Object.hasOwn(body.input??{},'type'))fail('INVALID_LIBRARY_REQUEST');
 }
 transition(model,result,{prior=null,debitExpected=null,now}={}){
  if(!object(result)||!object(result.state))fail('INVALID_ENGINE_RESULT',500);
  const state=result.state,debit=minor(result.debitMinor),liability=minor(result.maxPayoutMinor);
  if(!['active','settled'].includes(state.status)||state.gameId!==model.id||minor(state.stakeMinor)!==(prior?BigInt(prior.total_stake):0n)+debit||!Number.isSafeInteger(state.expiresAt)||state.expiresAt<0)fail('INVALID_ENGINE_STATE',500);
  if(debitExpected!==null&&debit!==debitExpected)fail('ENGINE_STAKE_MISMATCH',500);
  const payout=state.status==='settled'?minor(result.payoutMinor):null;
  if(state.status==='active'&&(result.payoutMinor!==null||state.expiresAt<=now))fail('INVALID_ACTIVE_ENGINE_STATE',500);
  if(payout!==null&&(payout>liability||state.payoutMinor!==result.payoutMinor))fail('PAYOUT_EXCEEDS_RESERVED_LIABILITY',500);
  if(Buffer.byteLength(json(state))>128*1024)fail('ENGINE_STATE_TOO_LARGE',500);
  return {state,debit,liability,payout};
 }
 view(row,now){
  const model=this.registry.get(row.game_id,row.model_version),state=parse(row.state),view=model.adapter.publicState(structuredClone(state),now);
  if(!object(view))fail('INVALID_ENGINE_PUBLIC_STATE',500);
  return {...view,round_id:row.id,game_id:row.game_id,model_version:row.model_version,status:row.status,version:Number(row.version),stakeMinor:String(row.total_stake),commitment:row.commitment,...(row.status==='settled'?{revealed_seed:row.secret_seed}:{})};
 }
 async otherActive(tx,user){
  const legacy=await tx.unsafe("SELECT game_id FROM sw_native_family.rounds WHERE user_id=$1 AND status='active' LIMIT 1",[user]);
  if(legacy.length)return legacy[0].game_id;
  const jetx=await tx.unsafe("SELECT id FROM sw_jetx_native.bets WHERE user_id=$1 AND status='active' LIMIT 1",[user]);
  return jetx.length?'jetx_native':null;
 }
 async active(tx,user){return (await tx.unsafe("SELECT * FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' FOR UPDATE",[user]))[0]??null;}
 async reserve(tx,row,next,version){
  await tx.unsafe('SELECT id FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[[row.user_id,'house',row.reserve_wallet]]);
  const balance=await this.shared.balance(tx,row.user_id),house=await this.shared.balance(tx,'house'),reserved=await this.shared.balance(tx,row.reserve_wallet);
  if(balance<next.debit)fail('INSUFFICIENT_FUNDS',409);
  const limits=await tx.unsafe('SELECT max_balance FROM sw_rebuild.account_limits WHERE user_id=$1',[row.user_id]);
  // A lower account cap cannot cancel an already reserved cashout. Only a
  // new debit or increased liability introduces a new financial obligation.
  const increasesExposure=next.debit>0n||next.liability>BigInt(row.liability);
  if(increasesExposure&&limits[0]?.max_balance!=null&&balance-next.debit+next.liability>BigInt(limits[0].max_balance))fail('POTENTIAL_PAYOUT_EXCEEDS_ACCOUNT_LIMIT',409);
  const delta=next.liability-reserved;
  if(house+next.debit<delta)fail('BANKROLL_CAPACITY_UNAVAILABLE',409);
  const prefix=`nl:${row.id}:${version}`;
  await this.shared.move(tx,row.user_id,'house',next.debit,prefix+':stake',row.user_id,'casino_bet',row.game_id);
  if(delta>0n)await this.shared.move(tx,'house',row.reserve_wallet,delta,prefix+':reserve',row.user_id,'casino_reserve',row.game_id);
  if(delta<0n)await this.shared.move(tx,row.reserve_wallet,'house',-delta,prefix+':release',row.user_id,'casino_reserve_release',row.game_id);
 }
 async persist(tx,row,next,version,now){
  const updated={...row,state:next.state,status:next.state.status,version,liability:String(next.liability),total_stake:next.state.stakeMinor,expires_at:next.state.expiresAt,settled_at:next.state.status==='settled'?now:null};
  await tx.unsafe('UPDATE sw_native_library.rounds SET state=$2::jsonb,status=$3,version=$4,liability=$5,total_stake=$6,expires_at=$7,settled_at=$8 WHERE id=$1',[row.id,json(next.state),updated.status,version,updated.liability,updated.total_stake,updated.expires_at,updated.settled_at]);
  if(updated.status==='settled'){
   await this.shared.move(tx,row.reserve_wallet,row.user_id,next.payout,`nl:${row.id}:payout`,row.user_id,'casino_win',row.game_id);
   await this.shared.move(tx,row.reserve_wallet,'house',await this.shared.balance(tx,row.reserve_wallet),`nl:${row.id}:final-release`,row.user_id,'casino_reserve_release',row.game_id);
   await tx.unsafe('INSERT INTO sw_rebuild.rounds(id,user_id,game,bet,payout,outcome) VALUES($1,$2,$3,$4,$5,$6::jsonb)',[`native-library:${row.id}`,row.user_id,row.game_id,updated.total_stake,String(next.payout),json(this.view(updated,now))]);
  }
  await this.shared.changed(tx,row.user_id,updated.status==='settled'?'casino.library.settled':'casino.library.action',row.id,{game:row.game_id,model_version:row.model_version,version,stake_minor:updated.total_stake,payout_minor:next.payout===null?null:String(next.payout)});
  return updated;
 }
 async expire(tx,row,now){
  if(row.status!=='active'||Number(row.expires_at)>now)return row;
  const model=this.registry.get(row.game_id,row.model_version),version=Number(row.version)+1;
  const raw=model.adapter.expire(structuredClone(parse(row.state)),seededRandom(row.secret_seed,row.id+':'+version),now);
  const next=this.transition(model,raw,{prior:row,now});
  if(next.debit!==0n||next.state.status!=='settled'||next.liability>BigInt(row.liability))fail('INVALID_EXPIRY_RESULT',500);
  // Accepted obligations settle even after account blocking or a lower cap.
  await tx.unsafe('SELECT id FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[[row.user_id,'house',row.reserve_wallet]]);
  return this.persist(tx,row,next,version,now);
 }
 async assertNoActive(tx,user){const row=await this.active(tx,user);if(!row)return;const current=await this.expire(tx,row,this.now());if(current.status==='active')fail('FINISH_ACTIVE_ROUND:'+current.game_id,409);}
 async snapshot(tx,user,gameId,now){
  const model=this.registry.get(gameId),active=await this.active(tx,user),current=active?await this.expire(tx,active,now):null;
  const latest=await tx.unsafe('SELECT * FROM sw_native_library.rounds WHERE user_id=$1 AND game_id=$2 ORDER BY created_at DESC,id DESC LIMIT 1',[user,gameId]);
  const row=current?.game_id===gameId?current:latest[0];
  return {user_id:user,game:model.definition,game_id:gameId,model_version:model.version,accepting:this.accepting,balance:cash(await this.shared.balance(tx,user)),currency:'ETB',server_now:now,round:row?this.view(row,now):null,other_active_game:current?.status==='active'&&current.game_id!==gameId?current.game_id:await this.otherActive(tx,user)};
 }
 async state(user,gameId){if(!this.ready)fail('LIBRARY_UNAVAILABLE',503);this.registry.get(gameId);return this.shared.transaction(user,tx=>this.snapshot(tx,user,gameId,this.now()));}
 async action(user,body){
  if(!this.ready)fail('LIBRARY_UNAVAILABLE',503);this.validate(body);
  const requestHash=digest(json(canonical(body)));
  return this.shared.transaction(user,async tx=>{
   const receipt=await tx.unsafe('SELECT request_hash,result FROM sw_native_library.requests WHERE user_id=$1 AND request_id=$2',[user,body.request_id]);
   if(receipt[0]){if(receipt[0].request_hash!==requestHash)fail('REQUEST_ID_CONFLICT',409);return {...parse(receipt[0].result),replayed:true,current_balance:cash(await this.shared.balance(tx,user))};}
   const now=this.now();let row;
   if(body.type==='start'){
    if(!this.accepting)fail('LIBRARY_NEW_ROUNDS_DISABLED',503);
    const model=this.registry.get(body.game_id);if(body.model_version!==model.version)fail('GAME_RULES_UPDATED_RELOAD',409);
    await this.assertNoActive(tx,user);const other=await this.otherActive(tx,user);if(other)fail('FINISH_ACTIVE_ROUND:'+other,409);
    const id=this.id(),seed=this.seed();if(!/^[a-f0-9]{64}$/.test(seed))fail('INVALID_SERVER_SEED',500);
    const next=this.transition(model,model.adapter.start(model.id,{...(body.options??{}),stakeMinor:String(stake(body.stake))},seededRandom(seed,id+':0'),now),{debitExpected:stake(body.stake),now});
    row={id,user_id:user,game_id:model.id,model_version:model.version,state:next.state,secret_seed:seed,commitment:digest(seed),reserve_wallet:'game-reserve:native-library:'+id,liability:String(next.liability),total_stake:next.state.stakeMinor,status:next.state.status,version:0,expires_at:next.state.expiresAt,created_at:now};
    await tx.unsafe('INSERT INTO sw_rebuild.wallets(id,balance,credit_limit) VALUES($1,0,0)',[row.reserve_wallet]);
    await this.reserve(tx,row,next,0);
    await tx.unsafe('INSERT INTO sw_native_library.rounds(id,user_id,game_id,model_version,state,secret_seed,commitment,reserve_wallet,liability,total_stake,status,version,expires_at,created_at) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,0,$12,$13)',[id,user,model.id,model.version,json(next.state),seed,row.commitment,row.reserve_wallet,row.liability,row.total_stake,row.status,row.expires_at,now]);
    row=await this.persist(tx,row,next,0,now);
   }else{
    row=(await tx.unsafe('SELECT * FROM sw_native_library.rounds WHERE id=$1 AND user_id=$2 FOR UPDATE',[body.round_id,user]))[0];
    if(!row||row.game_id!==body.game_id)fail('ROUND_NOT_FOUND',404);
    if(body.model_version!==row.model_version)fail('GAME_RULES_UPDATED_RELOAD',409);
    if(row.status!=='active')fail('ROUND_ALREADY_SETTLED',409);
    if(Number(row.version)!==body.expected_version)fail('ROUND_VERSION_CHANGED',409);
    row=await this.expire(tx,row,now);
    if(row.status==='active'){
     const model=this.registry.get(row.game_id,row.model_version),version=Number(row.version)+1;
     const next=this.transition(model,model.adapter.act(structuredClone(parse(row.state)),{...(body.input??{}),type:body.action},seededRandom(row.secret_seed,row.id+':'+version),now),{prior:row,now});
     await this.reserve(tx,row,next,version);row=await this.persist(tx,row,next,version,now);
    }
   }
   const result={status:'SUCCESS',request_id:body.request_id,...await this.snapshot(tx,user,body.game_id,now),round:this.view(row,now)};
   await tx.unsafe('INSERT INTO sw_native_library.requests(user_id,request_id,request_hash,result,created_at) VALUES($1,$2,$3,$4::jsonb,$5)',[user,body.request_id,requestHash,json(result),now]);return result;
  }).then(result=>{if(this.autoTimers)void this.schedule(user).catch(()=>console.error('library_timer_schedule_failed'));return result;});
 }
 async reconcile(limit=50){
  const rows=await this.sql.unsafe("SELECT id,user_id FROM sw_native_library.rounds WHERE status='active' AND expires_at<=$1 ORDER BY expires_at LIMIT $2",[this.now(),Math.max(1,Math.min(100,limit))]);let settled=0;
  for(const row of rows)await this.shared.transaction(row.user_id,async tx=>{const current=(await tx.unsafe('SELECT * FROM sw_native_library.rounds WHERE id=$1 FOR UPDATE',[row.id]))[0];if(current?.status==='active'&&(await this.expire(tx,current,this.now())).status==='settled')settled++;},{requireActive:false});
  return {examined:rows.length,settled};
 }
 async schedule(user){
  const pending=(this.scheduling.get(user)||Promise.resolve()).catch(()=>{}).then(()=>this.scheduleNow(user));
  this.scheduling.set(user,pending);
  void pending.finally(()=>{if(this.scheduling.get(user)===pending)this.scheduling.delete(user);}).catch(()=>{});
  return pending;
 }
 async scheduleNow(user){
  const rows=await this.sql.unsafe("SELECT expires_at FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' LIMIT 1",[user]);
  if(this.timers.has(user)){this.clearTimer(this.timers.get(user));this.timers.delete(user);}
  if(!rows.length)return;
  const timer=this.setTimer(async()=>{
   this.timers.delete(user);
   try{await this.shared.transaction(user,async tx=>{const row=await this.active(tx,user);if(row)await this.expire(tx,row,this.now());},{requireActive:false});await this.schedule(user);}
   catch{console.error('library_timed_settlement_failed');}
  },Math.min(2147483647,Math.max(1,Number(rows[0].expires_at)-this.now()+2)));
  timer?.unref?.();this.timers.set(user,timer);
 }
 async recoverTimers(){
  const users=await this.sql.unsafe("SELECT DISTINCT user_id FROM sw_native_library.rounds WHERE status='active'");
  for(const {user_id:user}of users)await this.schedule(user);
 }
 close(){for(const timer of this.timers.values())this.clearTimer(timer);this.timers.clear();}
}
