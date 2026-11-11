// Account transport only. No game mathematics, random outcomes or wallet state
// are created in the browser. Pending request identity may be persisted so an
// uncertain response can be reconciled using the original idempotency key.
const MONEY = /^(?:0|[1-9][0-9]{0,12})\.[0-9]{2}$/;
const ID = /^ind74_official_[a-z0-9_]{1,60}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OBJECT = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export class AccountError extends Error {
  constructor(code, message, {status=0, ambiguous=false}={}) {super(message);this.name='AccountError';this.code=code;this.status=status;this.ambiguous=ambiguous;}
}
export function validateSnapshot(value, gameId, {mode='account'}={}) {
  if (!['account','demo'].includes(mode)) throw new TypeError('An explicit account or demo mode is required.');
  if (!OBJECT(value) || value.authenticated !== true || value.currency !== (mode==='demo'?'DEMO':'ETB') || (mode==='demo'?value.mode!=='demo':value.mode==='demo') || typeof value.balance!=='string' || !MONEY.test(value.balance) ||
      !OBJECT(value.game) || value.game.id !== gameId || typeof value.game.version !== 'string' || !value.game.version ||
      typeof value.sessionGuard !== 'string' || !/^[a-f0-9]{64}$/.test(value.sessionGuard) || typeof value.accepting !== 'boolean') {
    throw new AccountError('INVALID_ACCOUNT_RESPONSE','Jawaabta server-ka lama xaqiijin.');
  }
  if (value.current_balance !== undefined && (typeof value.current_balance!=='string'||!MONEY.test(value.current_balance))) throw new AccountError('INVALID_ACCOUNT_RESPONSE','Hadhaaga server-ka lama xaqiijin.');
  if (value.round !== null && value.round !== undefined) {
    const r=value.round;
    if (!OBJECT(r) || r.game_id !== gameId || !UUID.test(r.round_id) || typeof r.model_version !== 'string' ||
        !['active','settled'].includes(r.status) || !Number.isSafeInteger(r.version) || r.version < 0 ||
        typeof r.stakeMinor!=='string' || !/^(0|[1-9][0-9]*)$/.test(r.stakeMinor) ||
        (r.status==='settled' && (typeof (r.payoutMinor ?? r.winMinor)!=='string'||!/^(0|[1-9][0-9]*)$/.test(r.payoutMinor ?? r.winMinor)))) {
      throw new AccountError('INVALID_ROUND_RESPONSE','Wareegga server-ka lama xaqiijin.');
    }
  }
  return {...value,balance:value.current_balance ?? value.balance};
}

export class MachineAccountClient {
  constructor({fetchImpl=(...args)=>globalThis.fetch(...args),storage=globalThis.sessionStorage,base,mode='account',newId=()=>crypto.randomUUID(),timeoutMs=15000}={}) {
    if(!['account','demo'].includes(mode))throw new TypeError('An explicit account or demo mode is required.');
    Object.defineProperties(this,{mode:{value:mode,enumerable:true},currency:{value:mode==='demo'?'DEMO':'ETB',enumerable:true},base:{value:base??(mode==='demo'?'/independent74/demo-api':'/independent74/account-api'),enumerable:true}});
    this.fetchImpl=fetchImpl;this.storage=storage;this.newId=newId;this.timeoutMs=timeoutMs;
    this.snapshot=null;this.gameId=null;this.pending=null;this.busy=false;this.sequence=0;
    this.storageKey=mode==='demo'?'zplay.independent74.demo.pending.v1':'zplay.independent74.pending.v1';
  }
  async request(path,{method='GET',body,guard,signal}={}) {
    const controller=new AbortController();
    const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted)abort();
    const timer=setTimeout(abort,this.timeoutMs);
    try {
      const response=await this.fetchImpl(this.base+path,{method,credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,
        headers:{accept:'application/json',...(body?{'content-type':'application/json',[this.mode==='demo'?'x-demo-session-guard':'x-independent74-session']:guard}:{})},
        ...(body?{body:JSON.stringify(body)}:{})});
      const text=await response.text();
      if(text.length>1024*1024)throw new Error('RESPONSE_TOO_LARGE');
      let value;try{value=JSON.parse(text);}catch{throw new Error('INVALID_JSON');}
      if(!response.ok)throw new AccountError(value.error?.code||value.error||'ACCOUNT_UNAVAILABLE',value.error?.message||value.message||'Adeegga akoonku ma xaqiijin codsiga.',{status:response.status,ambiguous:method==='POST'&&response.status>=500});
      return value;
    }catch(error){
      if(error instanceof AccountError)throw error;
      throw new AccountError(method==='POST'?'ACTION_UNCONFIRMED':'CONNECTION_UNAVAILABLE',method==='POST'?'Codsigii hore weli lama xaqiijin. Dib u hubi isla codsiga.':'Xiriirka server-ka lama helin. Mar kale hubi.',{ambiguous:method==='POST'});
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  async catalog(){
    const value=await this.request('/catalog');
    if(!OBJECT(value)||!Array.isArray(value.games)||value.games.length!==72||new Set(value.games.map(g=>g?.id)).size!==72||value.games.some(g=>!ID.test(g?.id)))throw new AccountError('INVALID_CATALOG','Liiska ciyaaraha lama xaqiijin.');
    return value.games;
  }
  remember(){
    try{if(this.pending)this.storage?.setItem(this.storageKey,JSON.stringify(this.pending));else this.storage?.removeItem(this.storageKey);}catch{}
  }
  restore(guard){
    let stored;try{stored=JSON.parse(this.storage?.getItem(this.storageKey)||'null');}catch{}
    if(stored?.guard===guard&&(this.mode==='demo'?stored.mode==='demo':stored.mode!=='demo')&&OBJECT(stored.body)&&UUID.test(stored.body.request_id)&&ID.test(stored.body.game_id)&&['start','action'].includes(stored.body.type))this.pending=stored;
    else{this.pending=null;this.remember();}
  }
  async state(gameId,{signal}={}){
    if(this.busy)throw new AccountError('ACTION_IN_PROGRESS','Sug xaqiijinta codsiga socda.');
    if(!ID.test(gameId))throw new AccountError('UNKNOWN_GAME','Aqoonsiga ciyaarta lama aqoon.');
    const sequence=++this.sequence;
    const next=validateSnapshot(await this.request('/state?game_id='+encodeURIComponent(gameId),{signal}),gameId,{mode:this.mode});
    if(sequence!==this.sequence)throw new AccountError('STALE_RESPONSE','Codsigii hore waa la dhaafay.');
    if(this.snapshot?.sessionGuard!==next.sessionGuard){this.pending=null;this.restore(next.sessionGuard);}
    else if(!this.pending)this.restore(next.sessionGuard);
    this.snapshot=next;this.gameId=gameId;return next;
  }
  async history(gameId){
    if(!ID.test(gameId))throw new AccountError('UNKNOWN_GAME','Aqoonsiga ciyaarta lama aqoon.');
    const value=await this.request('/history?game_id='+encodeURIComponent(gameId));
    if(!OBJECT(value)||value.authenticated!==true||value.currency!==this.currency||(this.mode==='demo'?value.mode!=='demo':value.mode==='demo')||value.game_id!==gameId||!Array.isArray(value.history)||value.history.length>100)throw new AccountError('INVALID_HISTORY','Taariikhda lama xaqiijin.');
    return value.history;
  }
  async submit(body){
    if(this.busy)throw new AccountError('ACTION_IN_PROGRESS','Codsigu wali wuu socdaa.');
    if(!this.snapshot||body.game_id!==this.gameId)throw new AccountError('REFRESH_REQUIRED','Marka hore hubi akoonka.');
    this.busy=true;
    ++this.sequence;
    const guard=this.snapshot.sessionGuard;
    this.pending={mode:this.mode,guard,body:structuredClone(body)};this.remember();
    try{
      let next;
      try{next=validateSnapshot(await this.request('/action',{method:'POST',body,guard}),body.game_id,{mode:this.mode});}
      catch(error){if(error instanceof AccountError&&['INVALID_ACCOUNT_RESPONSE','INVALID_ROUND_RESPONSE'].includes(error.code))error.ambiguous=true;throw error;}
      if(next.sessionGuard!==guard)throw new AccountError('SESSION_CHANGED','Fadhiga akoonka wuu isbeddelay; hubi wareeggii hore.',{ambiguous:true});
      this.snapshot=next;this.pending=null;this.remember();return next;
    }catch(error){
      if(!error.ambiguous){this.pending=null;this.remember();}
      throw error;
    }finally{this.busy=false;}
  }
  async start(stake,options={}){
    if(this.pending)throw new AccountError('PENDING_ACTION','Marka hore xaqiiji codsigii hore.');
    if(!MONEY.test(stake))throw new AccountError('INVALID_STAKE','Geli sharad waafaqsan xadka akoonka iyo ciyaarta.');
    const minor=BigInt(stake.replace('.',''));
    const limits=this.snapshot?.game?.limits;
    if(!limits||!(/^[1-9][0-9]*$/.test(limits.maxBetMinor??'')))throw new AccountError('BET_LIMITS_UNVERIFIED','Xadka sharadka server-ku weli ma xaqiijin.');
    if(minor<BigInt(limits.minBetMinor)||minor>BigInt(limits.maxBetMinor)||minor%BigInt(limits.betStepMinor)!==0n)throw new AccountError('INVALID_STAKE','Geli sharad waafaqsan xadka akoonka iyo ciyaarta.');
    if(!this.snapshot?.accepting||this.snapshot.round?.status==='active'||this.snapshot.other_active_game)throw new AccountError('NEW_ROUND_UNAVAILABLE','Wareeg cusub hadda lama bilaabi karo.');
    return this.submit({request_id:this.newId(),type:'start',game_id:this.gameId,model_version:this.snapshot.game.version,stake,options});
  }
  async act(action,input={}){
    if(this.pending)throw new AccountError('PENDING_ACTION','Marka hore xaqiiji codsigii hore.');
    const round=this.snapshot?.round;
    if(round?.status!=='active')throw new AccountError('NO_ACTIVE_ROUND','Wareeg furan ma jiro.');
    return this.submit({request_id:this.newId(),type:'action',game_id:this.gameId,model_version:round.model_version,round_id:round.round_id,expected_version:round.version,action,input});
  }
  async retryPending(){
    const pending=this.pending;
    if(!pending||pending.guard!==this.snapshot?.sessionGuard||pending.body.game_id!==this.gameId)throw new AccountError('PENDING_SESSION_MISMATCH','Fur akoonkii iyo ciyaartii codsiga hore.');
    return this.submit(pending.body);
  }
}
