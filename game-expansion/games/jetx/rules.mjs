import {createHash, randomBytes, randomUUID} from 'node:crypto';

export const GAME_ID = 'jetx_native';
export const VERSION = 'superwin-jetx-1';
export const LIMITS = Object.freeze({minStake:10n,maxStake:10000n,maxWin:1000000n,maxMultiplier:2500000,minAuto:101,maxAuto:100000,positions:4,bettingMs:5500,aftermathMs:4000,stepMs:150});
export const IMPLEMENTATION = Object.freeze({version:VERSION,officialClientReference:'SmartSoft JetX New public demo, 2026-11-07',officialPrivateMathVerified:false,math:'Independent server CSPRNG; 97% survival return before rounding and maximum-win limits.'});
export function fail(code,status=422){throw Object.assign(new Error(code),{status});}
export function cash(n){n=BigInt(n);return `${n/100n}.${String(n%100n).padStart(2,'0')}`;}
export function money(value){
 if(typeof value!=='string'||!/^(0|[1-9]\d{0,12})\.\d{2}$/.test(value))fail('INVALID_STAKE');
 const [whole,part]=value.split('.');return BigInt(whole)*100n+BigInt(part);
}
export function multiplier(value){
 if(typeof value!=='string'||!/^(0|[1-9]\d{0,5})(\.\d{1,2})?$/.test(value))fail('INVALID_AUTO_CASHOUT');
 const [whole,part='']=value.split('.');return Number(whole)*100+Number(part.padEnd(2,'0'));
}
export function quote(stake,auto=null){
 const amount=money(stake);if(amount<LIMITS.minStake||amount>LIMITS.maxStake)fail('STAKE_OUTSIDE_LIMITS');
 const target=auto===null?null:multiplier(auto);
 if(target!==null&&(target<LIMITS.minAuto||target>LIMITS.maxAuto))fail('AUTO_CASHOUT_OUTSIDE_LIMITS');
 return {amount,target,liability:payout(amount,target??LIMITS.maxMultiplier)};
}
export function payout(stake,coefficient){
 if(typeof stake!=='bigint'||stake<0n||!Number.isSafeInteger(coefficient)||coefficient<100||coefficient>LIMITS.maxMultiplier)fail('INVALID_SERVER_PAYOUT',500);
 const value=stake*BigInt(coefficient)/100n;return value>LIMITS.maxWin?LIMITS.maxWin:value;
}
export const hash=value=>createHash('sha256').update(value).digest('hex').toUpperCase();
// These are public commitment checks, not a derivation of the provider's RNG.
export function verifyCommitment(info,commitment){return typeof info==='string'&&typeof commitment==='string'&&/^[a-f0-9]{64}$/i.test(commitment)&&hash(info)===commitment.toUpperCase();}
export function coefficientAt(flightStartsAt,now){
 const step=Math.max(0,Math.floor((now-flightStartsAt)/LIMITS.stepMs));
 return Math.min(LIMITS.maxMultiplier,Math.floor(Math.exp(step/70)*100));
}
export function reachesAt(flightStartsAt,value){return flightStartsAt+Math.ceil(70*Math.log(value/100))*LIMITS.stepMs;}
export function drawCrash(bytes=randomBytes){
 // A 52-bit integer gives an exact, reviewable discrete distribution. It is
 // Superwin's own distribution and is never described as provider server code.
 const sample=BigInt(`0x${bytes(7).toString('hex')}`)&((1n<<52n)-1n);
 const value=((1n<<52n)*97n)/((sample+1n)*100n);
 return Number(value<100n?100n:value>BigInt(LIMITS.maxMultiplier)?BigInt(LIMITS.maxMultiplier):value);
}
export function newRound(id,now,{draw=drawCrash,idSource=randomUUID}={}){
 const crash=draw();if(!Number.isSafeInteger(crash)||crash<100||crash>LIMITS.maxMultiplier)fail('INVALID_SERVER_OUTCOME',500);
 const startsAt=now+LIMITS.bettingMs,crashesAt=reachesAt(startsAt,crash);
 const info=`${crash/100}_${idSource()}`;
 return {id:String(id),openedAt:now,startsAt,crashesAt,endsAt:crashesAt+LIMITS.aftermathMs,crash,info,commitment:hash(info),version:VERSION};
}
export function phase(round,now){return now<round.startsAt?'betting':now<round.crashesAt?'flight':'finished';}
export function publicRound(round,now){
 const status=phase(round,now);return {id:round.id,version:round.version,phase:status,openedAt:round.openedAt,startsAt:round.startsAt,serverNow:now,coefficient:status==='finished'?round.crash:coefficientAt(round.startsAt,now),commitment:round.commitment,...(status==='finished'?{crash:round.crash,revealedInfo:round.info,crashedAt:round.crashesAt}:{}),...(status==='betting'?{progressPercent:Math.min(100,(now-round.openedAt)/LIMITS.bettingMs*100),progressTime:LIMITS.bettingMs/1000}:{})};
}
export function dueResult(bet,round,now){
 if(bet.status!=='active')return null;
 const stake=BigInt(bet.stake),cap=Number((LIMITS.maxWin*100n+stake-1n)/stake);
 const target=Math.min(bet.auto??LIMITS.maxMultiplier,LIMITS.maxMultiplier,cap);
 if(target<=round.crash&&now>=reachesAt(round.startsAt,target))return {payout:payout(stake,target),coefficient:target,reason:target===bet.auto?'AUTO_CASHOUT':target===cap?'MAX_WIN':'MAX_MULTIPLIER'};
 if(now>=round.crashesAt)return {payout:0n,coefficient:0,reason:'CRASH'};
 return null;
}
