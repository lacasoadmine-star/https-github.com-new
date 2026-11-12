// Independently authored adapter for the retained /api/remaining20 contract.
// It formats server results for presentation and never samples or prices a round.
import {AccountError,cents,amount} from './account.mjs';
const ID=/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i,HASH=/^[a-f\d]{64}$/i;
const minor=value=>{if(typeof value!=='string'||!/^(0|[1-9]\d{0,14})$/.test(value))throw Error('INVALID_NATIVE_AMOUNT');return BigInt(value);};
export function libraryRound(raw,game){
 if(!raw||raw.game_id!==game.modelId||raw.gameId!==game.modelId||!ID.test(raw.round_id)||!['active','settled'].includes(raw.status)||!Number.isSafeInteger(raw.version)||raw.version<0||raw.model_version!==raw.modelVersion)throw Error('INVALID_NATIVE_ROUND');
 const rows=game.rows||3;
 if(!Array.isArray(raw.grid)||raw.grid.length!==game.columns||raw.grid.some(col=>!Array.isArray(col)||col.length!==rows||col.some(symbol=>!Object.hasOwn(game.symbols,symbol))))throw Error('INVALID_NATIVE_GRID');
 minor(raw.stakeMinor);minor(raw.baseWinMinor);minor(raw.currentCashoutMinor);
 if(raw.status==='settled'&&minor(raw.payoutMinor)!==minor(raw.currentCashoutMinor))throw Error('INVALID_NATIVE_PAYOUT');
 if(!Array.isArray(raw.actions)||raw.actions.some(x=>!['collect','gamble'].includes(x))||raw.status==='settled'&&raw.actions.length)throw Error('INVALID_NATIVE_ACTIONS');
 if(!Array.isArray(raw.wins)||!Array.isArray(raw.frames))throw Error('INVALID_NATIVE_FRAMES');
 const wins=value=>{if(!Array.isArray(value))throw Error('INVALID_NATIVE_WIN');return value.map(win=>{if(!win)throw Error('INVALID_NATIVE_WIN');minor(win.payoutMinor);if(!Array.isArray(win.cells)||win.cells.some(p=>!Array.isArray(p)||p.length!==2||!Number.isInteger(p[0])||p[0]<0||p[0]>=game.columns||!Number.isInteger(p[1])||p[1]<0||p[1]>=rows))throw Error('INVALID_NATIVE_WIN');return {positions:win.cells.map(([col,row])=>[row,col])};});};
 for(const frame of raw.frames){if(!frame||!Array.isArray(frame.grid)||frame.grid.length!==game.columns||frame.grid.some(col=>!Array.isArray(col)||col.length!==rows||col.some(symbol=>!Object.hasOwn(game.symbols,symbol))))throw Error('INVALID_NATIVE_GRID');wins(frame.wins);}
 const positions=wins(raw.wins);
 const multiplier=raw.feature?.multiplier;
 if(game.multiplier!==false&&![1,2,3,4,5].includes(multiplier))throw Error('INVALID_NATIVE_MULTIPLIER');
 return {roundId:raw.round_id,gameId:raw.game_id,grid:Array.from({length:rows},(_,row)=>raw.grid.map(col=>col[row])),winLines:positions,wheelMultiplier:multiplier??1,finalWin:amount(minor(raw.currentCashoutMinor)),bet:amount(minor(raw.stakeMinor)),freeSpinsRemaining:0,native:raw,awaitingCollection:raw.status==='active'};
}
export class LibraryAccount{
 constructor(game,{fetcher=globalThis.fetch.bind(globalThis),storage=globalThis.localStorage}={}){this.game=game;this.fetcher=fetcher;this.storage=storage;this.state=null;this.pending=null;this.busy=false;this.key=`superwin.special74.${game.id}.library-pending.v1`;}
 async request(path,body){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{
  const r=await this.fetcher('/api/remaining20/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,headers:{accept:'application/json',...(body?{'content-type':'application/json','X-Zplay-Library-Session':this.state.guard}:{})},...(body?{body:JSON.stringify(body)}:{})}),data=await r.json();
  if(!r.ok)throw new AccountError(data.error||data.detail||'NATIVE_ACCOUNT_UNAVAILABLE',r.status,!!body&&r.status>=500);return data;
 }catch(error){throw error instanceof AccountError?error:new AccountError('CONNECTION_UNCONFIRMED',0,!!body);}finally{clearTimeout(timer);}}
 snapshot(data){
  if(data.authenticated!==true||data.currency!=='ETB'||!HASH.test(data.sessionId)||data.game_id!==this.game.modelId||data.game?.id!==this.game.modelId||typeof data.model_version!=='string'||!data.model_version||data.game.version!==data.model_version||typeof data.accepting!=='boolean')throw Error('INVALID_NATIVE_ACCOUNT_STATE');
  cents(data.balance);const levels=data.game.stakeMinorValues;
  if(!Array.isArray(levels)||!levels.length||levels.some(v=>minor(v)<=0n)||new Set(levels).size!==levels.length)throw Error('INVALID_NATIVE_BETS');
  const round=data.round?libraryRound(data.round,this.game):null;
  return {authenticated:true,currency:'ETB',guard:data.sessionId,balance:data.balance,model:{...data.game,betLevels:levels.map(v=>amount(minor(v)))},nativeRound:data.round,round,gamble:data.round?{available:data.round.gambleAvailable===true&&data.round.actions.includes('gamble'),attempt:data.round.gambleAttempts,maxAttempts:data.round.gambleAttempts+data.round.gambleAttemptsRemaining,stake:round.finalWin}:null,accepting:data.accepting&&data.game.launchable===true&&!data.other_active_game,blocked:data.other_active_game};
 }
 async connect(){const next=this.snapshot(await this.request('state?game_id='+encodeURIComponent(this.game.modelId)));
  if(this.state&&this.state.guard!==next.guard){this.pending=null;this.storage.removeItem(this.key);}this.state=next;
  const saved=this.storage.getItem(this.key);if(saved){const p=JSON.parse(saved);if(p.guard===next.guard&&p.game===this.game.id&&ID.test(p.body?.request_id)&&p.body.game_id===this.game.modelId&&['start','collect','gamble'].includes(p.kind))this.pending=p;else this.storage.removeItem(this.key);}return next;
 }
 save(p){this.pending=p;p?this.storage.setItem(this.key,JSON.stringify(p)):this.storage.removeItem(this.key);}
 async spin(bet){
  if(this.busy||this.pending)throw new AccountError('PENDING_ROUND');if(!this.state?.accepting)throw new AccountError('GAME_UNAVAILABLE');if(!this.state.model.betLevels.includes(bet))throw new AccountError('INVALID_BET');
  if(this.state.nativeRound?.status==='active')await this.collect();
  return this.submit({kind:'start',game:this.game.id,guard:this.state.guard,before:this.state.balance,body:{request_id:crypto.randomUUID(),type:'start',game_id:this.game.modelId,model_version:this.state.model.version,stake:bet,options:{autoCollect:false}}});
 }
 action(kind,input={}){if(this.busy||this.pending)throw new AccountError('PENDING_ROUND');const r=this.state?.nativeRound;if(!r||r.status!=='active'||!r.actions.includes(kind))throw new AccountError('NATIVE_ACTION_UNAVAILABLE');return this.submit({kind,game:this.game.id,guard:this.state.guard,before:this.state.balance,parent:structuredClone(r),body:{request_id:crypto.randomUUID(),type:'action',game_id:this.game.modelId,model_version:r.model_version,round_id:r.round_id,expected_version:r.version,action:kind,input}});}
 collect(){return this.action('collect');}
 gamble(choice){if(!['RED','BLACK'].includes(choice))throw new AccountError('INVALID_CHOICE');return this.action('gamble',{color:choice.toLowerCase()});}
 async submit(p){if(this.busy||p.guard!==this.state?.guard)throw new AccountError('PENDING_SESSION');this.busy=true;try{
  this.save(p);const wire=await this.request('action',p.body);
  if(wire.status!=='SUCCESS'||wire.request_id!==p.body.request_id||wire.sessionId!==p.guard)throw Error('INVALID_NATIVE_RESPONSE');
  const next=this.snapshot(wire),raw=next.nativeRound;if(!raw||raw.model_version!==p.body.model_version)throw Error('INVALID_NATIVE_RESPONSE');
  if(p.kind==='start'){if(raw.version!==0||minor(raw.stakeMinor)!==cents(p.body.stake))throw Error('INVALID_NATIVE_STAKE');}
  else if(raw.round_id!==p.body.round_id||raw.version!==p.body.expected_version+1)throw Error('INVALID_NATIVE_ACTION_VERSION');
  // This contract supplies a canonical balance, not a per-action wallet receipt.
  // Deposits and other shared-wallet transactions can occur after the last read.
  cents(wire.balance);
  if(p.kind==='collect'&&raw.status!=='settled')throw Error('INVALID_NATIVE_COLLECTION');
  let result=next.round;
  if(p.kind==='gamble'){
   if(raw.status==='settled'&&raw.reason==='DISCONNECTED_COLLECT'&&raw.gambleAttempts===p.parent.gambleAttempts&&raw.currentCashoutMinor===p.parent.currentCashoutMinor){this.state=next;this.save(null);return {kind:'collect',result};}
   const last=raw.gambleHistory?.at(-1),expected=minor(p.parent.currentCashoutMinor);
   if(!last||last.attempt!==p.parent.gambleAttempts+1||last.selection!==p.body.input.color||!['red','black'].includes(last.color)||last.won!==(last.selection===last.color)||minor(last.amountBeforeMinor)!==expected||minor(last.amountAfterMinor)!==(last.won?expected*2n:0n))throw Error('INVALID_NATIVE_GAMBLE');
   result={...result,payout:amount(minor(raw.currentCashoutMinor)),choice:p.body.input.color.toUpperCase(),revealed:last.color.toUpperCase(),won:last.won,attempt:last.attempt};
  }
  this.state=next;this.save(null);return {kind:p.kind==='start'?'spin':p.kind,result};
 }catch(error){if(error instanceof AccountError&&[400,402,409,422].includes(error.status)&&['INVALID_STAKE','STAKE_NOT_IN_REFERENCE_SCHEDULE','INSUFFICIENT_FUNDS','ROUND_ALREADY_SETTLED','ROUND_VERSION_CHANGED','GAMBLE_NOT_AVAILABLE','GAME_RULES_UPDATED_RELOAD'].includes(error.code))this.save(null);throw error instanceof AccountError?error:new AccountError(error.message,0,true);}finally{this.busy=false;}}
 retry(){if(!this.pending)throw new AccountError('NO_PENDING_ROUND');return this.submit(this.pending);}
 history(){return this.request('history?game_id='+encodeURIComponent(this.game.modelId)+'&sort=recent');}
}
