import {randomInt,randomBytes,createHmac} from 'node:crypto';

export function fail(code,status=422){throw Object.assign(Error(code),{status});}
export function stakeMinor(value,game){
 if(typeof value!=='string'||!/^(0|[1-9]\d{0,5})\.\d{2}$/.test(value))fail('INVALID_STAKE');
 const minor=BigInt(value.replace('.',''));
 if(minor<BigInt(game.min_stake_minor)||minor>BigInt(game.max_stake_minor))fail('STAKE_OUTSIDE_LIMITS');
 return minor;
}
export function formatMinor(minor){minor=BigInt(minor);return `${minor/100n}.${String(minor%100n).padStart(2,'0')}`;}
export const secureRandom=Object.freeze({int:max=>randomInt(max),bytes:size=>randomBytes(size)});
export function seededRandom(seed,domain){
 let counter=0,pool=Buffer.alloc(0);
 const bytes=size=>{while(pool.length<size)pool=Buffer.concat([pool,createHmac('sha256',Buffer.from(seed,'hex')).update(domain+':'+counter++).digest()]);const value=pool.subarray(0,size);pool=pool.subarray(size);return value;};
 const rng={bytes};rng.int=max=>Number(randomBigInt(BigInt(max),rng));return rng;
}
export function choose(n,k){if(k<0||k>n)return 0n;let r=1n;for(let i=1;i<=Math.min(k,n-k);i++)r=r*BigInt(n-i+1)/BigInt(i);return r;}
function randomBigInt(max,rng){
 if(max<=0n)fail('INVALID_RANDOM_BOUND',500);
 const length=Math.max(1,Math.ceil(max.toString(2).length/8));const range=1n<<BigInt(length*8);const limit=range-range%max;
 for(;;){const bytes=rng.bytes(length);let value=0n;for(const byte of bytes)value=(value<<8n)+BigInt(byte);if(value<limit)return value%max;}
}
export function fractionalPayout(numerator,denominator,rng=secureRandom){
 numerator=BigInt(numerator);denominator=BigInt(denominator);
 if(numerator<0n||denominator<=0n)fail('INVALID_PAYOUT',500);
 const quotient=numerator/denominator,remainder=numerator%denominator;
 return quotient+(remainder>0n&&randomBigInt(denominator,rng)<remainder?1n:0n);
}
function integer(value,min,max,code){if(!Number.isSafeInteger(value)||value<min||value>max)fail(code);return value;}
function autoTarget(options){
 if(options.auto_cashout===undefined||options.auto_cashout==='')return null;
 const value=options.auto_cashout;
 if(typeof value!=='string'||!/^(?:[1-9]\d{0,2})\.\d{2}$/.test(value))fail('INVALID_AUTO_CASHOUT');
 return integer(Number(value.replace('.','')),101,10000,'INVALID_AUTO_CASHOUT');
}
function terminal(state,payout,reason){return {...state,status:'settled',payout_minor:String(payout),reason};}
function slots(game,stake,rng){
 const n=game.symbols,grid=Array.from({length:3},()=>Array.from({length:5},()=>rng.int(n)));
 const lines=[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2]];
 const wins=[];let raw=0;
 for(const [index,line]of lines.entries()){const symbol=grid[line[0]][0];let count=1;while(count<5&&grid[line[count]][count]===symbol)count++;if(count>=3){const factor={3:2,4:6,5:20}[count]*(symbol+1);raw+=factor;wins.push({line:index,count,symbol});}}
 const expected=BigInt(2*(n-1)*n+6*(n-1)+20)*5n*BigInt(n*(n+1)/2);
 const payout=fractionalPayout(stake*BigInt(raw)*97n*BigInt(n)**5n,100n*expected,rng);
 return {status:'settled',family:'slots',grid,winning_lines:wins,payout_minor:String(payout),reason:payout>0n?'WIN':'LOSS'};
}
function plinko(game,stake,options,rng){
 const risk=options.risk??'medium';if(!['low','medium','high'].includes(risk))fail('INVALID_RISK');
 const power={low:2,medium:3,high:4}[risk],rows=game.plinko_rows;
 const weights=Array.from({length:rows+1},(_,k)=>BigInt((Math.abs(2*k-rows)+1)**power));
 const expected=weights.reduce((sum,weight,k)=>sum+choose(rows,k)*weight,0n);
 const path=Array.from({length:rows},()=>rng.int(2)),bucket=path.reduce((sum,bit)=>sum+bit,0);
 const num=97n*(1n<<BigInt(rows));const den=100n*expected;
 return {status:'settled',family:'plinko',risk,rows,path,bucket,multipliers:weights.map(w=>(Number(w*num)/Number(den)).toFixed(3)),payout_minor:String(fractionalPayout(stake*weights[bucket]*num,den,rng)),reason:'PLINKO_RESULT'};
}
function dice(stake,options,rng){
 const target=integer(options.target??7,2,12,'INVALID_DICE_TARGET'),rolls=[1+rng.int(6),1+rng.int(6)];const sum=rolls[0]+rolls[1];
 const ways=6-Math.abs(7-target),payout=sum===target?fractionalPayout(stake*97n*36n,100n*BigInt(ways),rng):0n;
 return {status:'settled',family:'dice',target,rolls,sum,payout_minor:String(payout),reason:sum===target?'WIN':'LOSS'};
}
function wheel(stake,rng){
 const raw=[0,1,0,2,0,3,0,5,0,10,0,20],segment=rng.int(raw.length),total=raw.reduce((a,b)=>a+b,0);
 return {status:'settled',family:'wheel',segment,multipliers:raw.map(n=>(n*97*raw.length/(100*total)).toFixed(3)),payout_minor:String(fractionalPayout(stake*BigInt(raw[segment])*97n*BigInt(raw.length),100n*BigInt(total),rng)),reason:'WHEEL_RESULT'};
}
export function startGame(game,stakeValue,options={},now=Date.now(),rng=secureRandom){
 const stake=typeof stakeValue==='bigint'?stakeValue:stakeMinor(stakeValue,game);
 if(!options||Array.isArray(options)||typeof options!=='object')fail('INVALID_OPTIONS');
 let state;
 if(game.family==='slots')state=slots(game,stake,rng);
 else if(game.family==='plinko')state=plinko(game,stake,options,rng);
 else if(game.family==='dice')state=dice(stake,options,rng);
 else if(game.family==='wheel')state=wheel(stake,rng);
 else if(game.family==='crash'){
  const u=BigInt(rng.int(0x100000000)),range=1n<<32n;
  const crash=Number(97n*range/(range-u));const point=Math.min(game.max_multiplier*100,Math.max(100,crash));
  const target=autoTarget(options);
  state={status:'active',family:'crash',crash_point:point,crash_capped:crash>=game.max_multiplier*100,crash_at:now+Math.floor(Math.log(point/100)/game.crash_growth*1000),auto_cashout_target:target,auto_cashout_at:target?now+Math.ceil(Math.log(target/100)/game.crash_growth*1000):null,growth:game.crash_growth,payout_minor:'0'};
 }else if(game.family==='mines'){
  const count=integer(options.mines??3,1,10,'INVALID_MINE_COUNT');const cells=Array.from({length:25},(_,i)=>i);
  for(let i=cells.length-1;i>0;i--){const j=rng.int(i+1);[cells[i],cells[j]]=[cells[j],cells[i]];}
  state={status:'active',family:'mines',mines:cells.slice(0,count),mine_count:count,picked:[],max_picks:game.max_picks,payout_minor:'0'};
 }else if(game.family==='hilo')state={status:'active',family:'hilo',rank:1+rng.int(13),history:[],steps:0,pot_num:'1',pot_den:'1',max_steps:game.max_hilo_steps,payout_minor:'0'};
 else fail('UNSUPPORTED_GAME',500);
 return {...state,stake_minor:String(stake),started_at:now,expires_at:now+game.lease_ms,version:0};
}
function minesPot(state){const k=state.picked.length;return {num:BigInt(state.stake_minor)*97n*choose(25,k),den:100n*choose(25-state.mine_count,k)};}
function cashout(game,state,rng){
 if(state.family==='mines'){
  if(!state.picked.length)fail('PICK_A_CELL_FIRST');const pot=minesPot(state);return terminal(state,fractionalPayout(pot.num,pot.den,rng),'CASHOUT');
 }
 if(state.family==='hilo'){
  if(state.steps<1)fail('MAKE_A_GUESS_FIRST');return terminal(state,fractionalPayout(BigInt(state.stake_minor)*BigInt(state.pot_num),BigInt(state.pot_den),rng),'CASHOUT');
 }
 fail('CASHOUT_NOT_AVAILABLE');
}
export function advanceGame(game,previous,action,input={},now=Date.now(),rng=secureRandom){
 if(previous.status!=='active')fail('ROUND_ALREADY_SETTLED',409);
 const state=structuredClone(previous);state.version++;
 if(!input||Array.isArray(input)||typeof input!=='object')fail('INVALID_ACTION');
 if(state.family==='crash'){
  if(state.auto_cashout_at!==null&&now>=state.auto_cashout_at&&state.auto_cashout_at<state.crash_at)return terminal({...state,cashout_multiplier:state.auto_cashout_target},BigInt(state.stake_minor)*BigInt(state.auto_cashout_target)/100n,'AUTO_CASHOUT');
  if(now>=state.crash_at)return state.crash_capped?terminal({...state,cashout_multiplier:game.max_multiplier*100},BigInt(state.stake_minor)*BigInt(game.max_multiplier),'MAX_MULTIPLIER'):terminal(state,0n,'CRASHED');
  if(action!=='cashout')fail('INVALID_ACTION');
  const multiplier=Math.min(game.max_multiplier*100,Math.floor(Math.exp(game.crash_growth*Math.max(0,now-state.started_at)/1000)*100));
  return terminal({...state,cashout_multiplier:multiplier},BigInt(state.stake_minor)*BigInt(multiplier)/100n,'CASHOUT');
 }
 if(now>=state.expires_at){
  if(state.family==='mines'&&state.picked.length||state.family==='hilo'&&state.steps>0)return cashout(game,state,rng);
  return terminal(state,BigInt(state.stake_minor),'EXPIRED_UNPLAYED_REFUND');
 }
 if(action==='cashout')return cashout(game,state,rng);
 if(state.family==='mines'){
  if(action!=='pick')fail('INVALID_ACTION');const cell=integer(input.cell,0,24,'INVALID_CELL');
  if(state.picked.includes(cell))fail('CELL_ALREADY_PICKED',409);state.picked.push(cell);
  if(state.mines.includes(cell))return terminal(state,0n,'MINE');
  if(state.picked.length>=state.max_picks)return cashout(game,state,rng);
  return state;
 }
 if(state.family==='hilo'){
  if(action!=='guess'||!['higher','lower'].includes(input.choice))fail('INVALID_ACTION');
  const ways=input.choice==='higher'?13-state.rank:state.rank-1;if(!ways)fail('IMPOSSIBLE_GUESS');
  const next=1+rng.int(13),won=input.choice==='higher'?next>state.rank:next<state.rank;
  state.history.push({previous:state.rank,choice:input.choice,rank:next,won});state.rank=next;state.steps++;
  if(!won)return terminal(state,0n,'INCORRECT_GUESS');
  let num=BigInt(state.pot_num)*13n*97n,den=BigInt(state.pot_den)*BigInt(ways)*100n;
  if(num>den*BigInt(game.max_multiplier)){num=den*BigInt(game.max_multiplier);}
  state.pot_num=String(num);state.pot_den=String(den);
  if(state.steps>=state.max_steps||num>=den*BigInt(game.max_multiplier))return cashout(game,state,rng);
  return state;
 }
 fail('INVALID_ACTION');
}
export function publicRound(game,state,now=Date.now()){
 const view={...state};delete view.mines;delete view.crash_at;delete view.crash_point;delete view.crash_capped;delete view.pot_num;delete view.pot_den;
 view.server_now=now;view.max_multiplier=['crash','hilo'].includes(state.family)?game.max_multiplier:null;
 if(state.family==='crash'){
  if(state.status==='settled')view.crash_point=state.crash_point;
  else view.multiplier=Math.min(state.auto_cashout_target||game.max_multiplier*100,Math.floor(Math.exp(game.crash_growth*Math.max(0,now-state.started_at)/1000)*100));
 }
 if(state.family==='mines'){
  if(state.status==='settled')view.mines=state.mines;
  const pot=state.picked.length?minesPot(state):{num:0n,den:1n};view.cashout_minor=state.status==='settled'?state.payout_minor:String(pot.num/pot.den);
 }
 if(state.family==='hilo')view.cashout_minor=state.status==='settled'?state.payout_minor:state.steps?String(BigInt(state.stake_minor)*BigInt(state.pot_num)/BigInt(state.pot_den)):'0';
 return view;
}

export function maximumLiability(game,stake,options={}){
 stake=BigInt(stake);let num,den;
 const ceil=(a,b)=>(a+b-1n)/b;
 if(game.family==='slots'){
  const n=BigInt(game.symbols);num=stake*(100n*n)*97n*n**5n;
  den=100n*5n*(n*(n+1n)/2n)*(2n*(n-1n)*n+6n*(n-1n)+20n);
 }else if(game.family==='plinko'){
  const risk=options.risk??'medium';if(!['low','medium','high'].includes(risk))fail('INVALID_RISK');
  const power={low:2,medium:3,high:4}[risk],rows=game.plinko_rows;
  const weights=Array.from({length:rows+1},(_,k)=>BigInt((Math.abs(2*k-rows)+1)**power));
  const expected=weights.reduce((sum,w,k)=>sum+choose(rows,k)*w,0n);
  num=stake*weights[0]*97n*(1n<<BigInt(rows));den=100n*expected;
 }else if(game.family==='dice'){
  const target=integer(options.target??7,2,12,'INVALID_DICE_TARGET');num=stake*97n*36n;den=100n*BigInt(6-Math.abs(7-target));
 }else if(game.family==='wheel'){num=stake*20n*97n*12n;den=100n*41n;}
 else if(game.family==='mines'){
  const count=integer(options.mines??3,1,10,'INVALID_MINE_COUNT');num=stake*97n*choose(25,game.max_picks);den=100n*choose(25-count,game.max_picks);
 }else if(game.family==='crash'){const target=autoTarget(options);num=stake*BigInt(target||game.max_multiplier*100);den=100n;}
 else if(game.family==='hilo'){num=stake*BigInt(game.max_multiplier);den=1n;}
 else fail('UNSUPPORTED_GAME',500);
 const maximum=ceil(num,den);return maximum>stake?maximum:stake;
}
