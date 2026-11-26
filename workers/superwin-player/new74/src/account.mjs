// Transport for the existing account API. There is no outcome generator here.
const UUID=/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const HASH=/^[a-f\d]{64}$/i;
export function cents(value){if(typeof value!=='string'||!/^\d{1,13}\.\d{2}$/.test(value))throw Error('INVALID_AMOUNT');return BigInt(value.replace('.',''));}
export function amount(value){const n=BigInt(value);if(n<0n)throw Error('INVALID_AMOUNT');return `${n/100n}.${String(n%100n).padStart(2,'0')}`;}
export class AccountError extends Error{constructor(code,status=0,uncertain=false){super(code);Object.assign(this,{code,status,uncertain});}}
export function receipt(result,game,pending,model){
 if(!result||result.gameId!==game.modelId||result.currency!=='ETB'||!UUID.test(result.roundId)||result.bet!==pending.body.bet||result.mathVersion!==model.mathVersion||result.engineVersion!==model.engineVersion)throw Error('INVALID_ROUND');
 if(model.mathSha256&&result.mathSha256!==model.mathSha256)throw Error('INVALID_ROUND_VERSION');
 const r=result.walletReceipt;
 if(!r||r.currency!=='ETB'||cents(r.balanceBefore)-cents(r.chargedStake)+cents(r.finalWin)!==cents(r.balanceAfter))throw Error('INVALID_RECEIPT');
 if(cents(r.chargedStake)!==(result.isFree?0n:cents(pending.body.bet))||cents(r.finalWin)!==cents(result.finalWin))throw Error('INVALID_RECEIPT');
 if(!Array.isArray(result.grid)||result.grid.length!==3||result.grid.some(row=>!Array.isArray(row)||row.length!==game.columns||row.some(s=>!Object.hasOwn(game.symbols,s))))throw Error('INVALID_REELS');
 if(![1,2,3,4,5].includes(result.wheelMultiplier)||!Array.isArray(result.winLines)||result.winLines.some(line=>!Array.isArray(line.positions)||line.positions.some(p=>{const row=Array.isArray(p)?p[0]:p.row,col=Array.isArray(p)?p[1]:p.col;return !Number.isInteger(row)||row<0||row>2||!Number.isInteger(col)||col<0||col>=game.columns;})))throw Error('INVALID_ROUND');
 if(result.balanceAfter!==undefined&&result.balanceAfter!==r.balanceAfter)throw Error('INVALID_RECEIPT');
 return {...result,balanceAfter:r.balanceAfter};
}
export class Account {
 constructor(game,{fetcher=globalThis.fetch.bind(globalThis),storage=globalThis.localStorage}={}){this.game=game;this.fetcher=fetcher;this.storage=storage;this.pending=null;this.state=null;this.busy=false;this.key=`superwin.new74.${game.id}.pending.v1`;}
 async request(path,body){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await this.fetcher(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,headers:{accept:'application/json',...(body?{'content-type':'application/json',...(this.game.transport==='classic'?{'X-Zplay-Machine-Session':this.state.guard}:{})}:{})},...(body?{body:JSON.stringify(body)}:{})});
   const data=await response.json();
   if(!response.ok)throw new AccountError(typeof data.detail==='string'?data.detail:data.error?.code||'ACCOUNT_UNAVAILABLE',response.status,!!body&&(response.status>=500||response.status===408));
   return data;
  }catch(error){if(error instanceof AccountError)throw error;throw new AccountError('CONNECTION_UNCONFIRMED',0,!!body);}
  finally{clearTimeout(timer);}
 }
 async connect(){
  let s;
  if(this.game.transport==='fresh'){
   const r=await this.request('/api/slots/fresh-state');
   if(r.authenticated!==true)throw new AccountError('SIGN_IN',401);
   s={authenticated:r.authenticated,currency:r.currency,guard:r.sessionGuard,balance:r.balance,model:r.game,round:r.round?.result||null,gamble:r.round?.gamble||null,blocked:r.blockedByActiveGame,accepting:r.game?.enabled&&r.game?.freshReleaseReady&&r.game?.wagerAvailability!=='house_capacity'&&!r.blockedByActiveGame};
  }else{
   const [session,model]=await Promise.all([this.request('/api/machine-session'),this.request('/api/slots/games/'+this.game.modelId)]);
   if(!session.authenticated)throw new AccountError('SIGN_IN',401);
   s={authenticated:session.authenticated,currency:session.currency,guard:session.sessionId,balance:session.balance,model,round:null,gamble:null,accepting:model.enabled};
  }
  if(s.authenticated!==true||s.currency!=='ETB'||!HASH.test(s.guard)||s.model?.id!==this.game.modelId||!Array.isArray(s.model.betLevels)||s.accepting&&!s.model.betLevels.length||!s.model.mathVersion||!s.model.engineVersion)throw new AccountError('INVALID_ACCOUNT_STATE');
  cents(s.balance);s.model.betLevels.forEach(v=>{if(cents(v)<=0n)throw Error('INVALID_BET');});
  if(new Set(s.model.betLevels).size!==s.model.betLevels.length)throw new AccountError('INVALID_BET_LEVELS');
  if(this.game.transport==='fresh'&&!HASH.test(s.model.mathSha256))throw new AccountError('INVALID_ACCOUNT_STATE');
  if(s.round)receipt(s.round,this.game,{body:{bet:s.round.bet}},s.model);
  if(this.state&&this.state.guard!==s.guard){this.pending=null;this.storage.removeItem(this.key);}
  if(this.game.transport==='classic'&&this.state?.guard===s.guard){s.round=this.state.round;s.gamble=this.state.gamble;}
  this.state=s;
  const saved=this.storage.getItem(this.key);
  if(saved){try{const p=JSON.parse(saved);if(p.guard===s.guard&&p.game===this.game.id&&['spin','gamble'].includes(p.kind)&&UUID.test(p.body?.roundToken))this.pending=p;else this.storage.removeItem(this.key);}catch{throw new AccountError('SAVED_ROUND_UNREADABLE');}}
  return s;
 }
 save(p){this.pending=p;p?this.storage.setItem(this.key,JSON.stringify(p)):this.storage.removeItem(this.key);}
 async spin(bet){
  if(this.busy||this.pending)throw new AccountError('PENDING_ROUND');
  if(!this.state?.accepting)throw new AccountError('GAME_UNAVAILABLE');
  if(!this.state.model.betLevels.includes(bet))throw new AccountError('INVALID_BET');
  const s=this.state,body={gameId:this.game.modelId,bet,roundToken:crypto.randomUUID()};
  if(this.game.transport==='fresh')Object.assign(body,{sessionGuard:s.guard,mathVersion:s.model.mathVersion,mathSha256:s.model.mathSha256,engineVersion:s.model.engineVersion});
  return this.submit({kind:'spin',game:this.game.id,guard:s.guard,body});
 }
 async gamble(choice){
  const r=this.state?.round,g=this.state?.gamble;
  if(this.busy||this.pending||!r||!g?.available||!['RED','BLACK'].includes(choice))throw new AccountError('GAMBLE_UNAVAILABLE');
  const body={roundId:r.roundId,choice,roundToken:crypto.randomUUID()};
  if(this.game.transport==='fresh')Object.assign(body,{sessionGuard:this.state.guard,expectedAttempt:g.attempt+1,expectedStake:g.stake});
  return this.submit({kind:'gamble',game:this.game.id,guard:this.state.guard,body,stake:g.stake,attempt:g.attempt+1});
 }
 async submit(p,{replay=false}={}){
  if(this.busy||p.guard!==this.state?.guard)throw new AccountError('PENDING_SESSION');
  this.busy=true;
  try{
   // Persist before sending: network errors may happen after the server settles.
   this.save(p);
   const result=await this.request('/api/slots/'+p.kind,replay&&this.game.transport==='fresh'?{...p.body,replayOnly:true}:p.body);
   if(p.kind==='spin'){
    receipt(result,this.game,p,this.state.model);
    this.state.round=result;
    this.state.balance=result.walletReceipt.balanceAfter;
    const features=this.state.model.features,limit=features?.gambleRounds;
    if(!Number.isInteger(limit)||limit<0)throw Error('INVALID_GAMBLE_LIMIT');
    this.state.gamble={available:limit>0&&cents(result.finalWin)>0n&&!result.freeSpinsRemaining&&(!features.gambleMaxStake||cents(result.finalWin)<=cents(features.gambleMaxStake)),attempt:0,maxAttempts:limit,stake:result.finalWin};
   }else{
    const colour=result.revealed||result.cardColor;
    if(result.roundId!==p.body.roundId||result.choice!==p.body.choice||result.attempt!==p.attempt||!['RED','BLACK'].includes(colour)||result.won!==(colour===p.body.choice)||cents(result.payout)!==(result.won?cents(p.stake)*2n:0n))throw Error('INVALID_GAMBLE_RECEIPT');
    if(!Number.isInteger(result.maxAttempts)||result.maxAttempts!==this.state.model.features?.gambleRounds||result.maxAttempts<result.attempt)throw Error('INVALID_GAMBLE_LIMIT');
    if(this.game.transport==='fresh'){
     const r=result.walletReceipt;
     if(!r||r.currency!=='ETB'||cents(r.chargedStake)!==cents(p.stake)||cents(r.finalWin)!==cents(result.payout)||r.balanceAfter!==result.balanceAfter||cents(r.balanceBefore)-cents(p.stake)+cents(result.payout)!==cents(r.balanceAfter))throw Error('INVALID_GAMBLE_RECEIPT');
    }
    cents(result.balanceAfter);this.state.balance=result.balanceAfter;
    const cap=this.state.model.features?.gambleMaxStake;
    this.state.gamble={available:result.won&&result.attempt<result.maxAttempts&&(!cap||cents(result.payout)<=cents(cap)),attempt:result.attempt,maxAttempts:result.maxAttempts,stake:result.payout};
   }
   this.save(null);
   return {kind:p.kind,result};
  }catch(error){
   if(error instanceof AccountError&&[400,402,422].includes(error.status)&&['INSUFFICIENT_FUNDS','INVALID_BET','INVALID_AMOUNT','GAME_BET_OR_TOKEN_INVALID','INVALID_CHOICE'].includes(error.code))this.save(null);
   // The existing engine checks saved results before these explicit rejections.
   // In particular, replayOnly + ROUND_NOT_CONFIRMED proves no spin was stored.
   if(error instanceof AccountError&&error.status===409&&['ROUND_NOT_CONFIRMED','GAMBLE_STATE_CHANGED','GAMBLE_EXPIRED','GAMBLE_LIMIT','NO_GAMBLE_WINNINGS','GAMBLE_STAKE_LIMIT','GAMBLE_NOT_AVAILABLE','FREE_SPIN_BET_LOCKED','ACCOUNT_BALANCE_LIMIT','PLAYER_SESSION_CHANGED','GAME_RULES_UPDATED_RELOAD'].includes(error.code))this.save(null);
   throw error instanceof AccountError?error:new AccountError(error.message,0,true);
  }finally{this.busy=false;}
 }
 retry(){if(!this.pending)throw new AccountError('NO_PENDING_ROUND');return this.submit(this.pending,{replay:true});}
 history(){return this.request('/api/slots/rounds');}
}
