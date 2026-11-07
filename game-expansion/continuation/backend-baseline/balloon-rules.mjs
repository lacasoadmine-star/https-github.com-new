export const ID='balloon_native', VERSION='superwin-balloon-1';
export const LIMITS=Object.freeze({min:10n,max:10000n,win:1000000n,multiplier:2500000,leaseMs:3000,growthMs:11000});
export const definitions=Object.freeze({[ID]:{id:ID,name:'Balloon',version:VERSION,type:'crash',minStake:'0.10',maxStake:'100.00',maxWin:'10000.00',maxMultiplier:25000,officialReference:'https://www.smartsoftgaming.com/games/balloon',officialPrivateMathVerified:false,math:'Independent Superwin distribution: 97% survival return before rounding and win caps. Public demo artwork and press-and-hold interaction.'}});
const fail=(code,status=422)=>{throw Object.assign(new Error(code),{status});};
const amount=value=>{if(typeof value!=='string'||!/^(0|[1-9]\d*)$/.test(value))fail('INVALID_STAKE');return BigInt(value);};
export const coefficientAt=(startedAt,now)=>Math.min(LIMITS.multiplier,Math.floor(Math.exp(Math.max(0,now-startedAt)/LIMITS.growthMs)*100));
export const reachesAt=(startedAt,value)=>startedAt+Math.ceil(Math.log(value/100)*LIMITS.growthMs);
const payout=(stake,coefficient)=>{const n=BigInt(stake)*BigInt(coefficient)/100n;return String(n>LIMITS.win?LIMITS.win:n);};
const transition=(state,debit='0')=>({state,debitMinor:debit,maxPayoutMinor:state.liabilityMinor,payoutMinor:state.status==='settled'?state.payoutMinor:null});
function settle(s,now,reason){
 const time=Math.min(now,s.expiresAt),c=coefficientAt(s.startedAt,time),atCap=time>=s.capAt&&s.capAt<=s.popsAt,pop=!atCap&&time>=s.popsAt;
 const coefficient=pop?0:Math.min(c,s.capCoefficient);
 const value=pop?'0':payout(s.stakeMinor,coefficient);
 return transition({...s,status:'settled',settledAt:time,coefficient,payoutMinor:value,reason:pop?'POPPED':coefficient>=s.capCoefficient?'MAX_WIN':reason});
}
export function start(gameId,options,rng,now){
 if(gameId!==ID)fail('GAME_NOT_FOUND',404);
 if(Object.keys(options).some(k=>k!=='stakeMinor'))fail('INVALID_BALLOON_OPTIONS');
 const stake=amount(options.stakeMinor);if(stake<LIMITS.min||stake>LIMITS.max)fail('STAKE_OUTSIDE_LIMITS');
 const random=rng();if(!Number.isFinite(random)||random<0||random>=1)fail('INVALID_SERVER_RANDOM',500);
 const crash=Math.max(100,Math.min(LIMITS.multiplier,Math.floor(97/(1-random))));
 const capCoefficient=Math.min(LIMITS.multiplier,Number((LIMITS.win*100n+stake-1n)/stake));
 const popsAt=reachesAt(now,crash),capAt=reachesAt(now,capCoefficient);
 const s={gameId:ID,status:'active',stakeMinor:String(stake),liabilityMinor:payout(stake,capCoefficient),startedAt:now,crash,popsAt,capCoefficient,capAt,holdUntil:now+LIMITS.leaseMs,expiresAt:Math.min(now+LIMITS.leaseMs,popsAt,capAt)};
 if(popsAt<=now){const r=settle(s,now,'POPPED');r.debitMinor=String(stake);return r;}
 return transition(s,String(stake));
}
export function act(state,input,rng,now){
 if(state.status!=='active')fail('ROUND_ALREADY_SETTLED',409);
 if(Object.keys(input).some(k=>k!=='type')||!['hold','collect'].includes(input.type))fail('INVALID_BALLOON_ACTION');
 if(now>=state.expiresAt)return expire(state,rng,now);
 if(input.type==='collect')return settle(state,now,'COLLECTED');
 return transition({...state,holdUntil:now+LIMITS.leaseMs,expiresAt:Math.min(now+LIMITS.leaseMs,state.popsAt,state.capAt)});
}
export function expire(state,rng,now){
 if(state.status!=='active')return transition(state);
 if(now<state.expiresAt)fail('ROUND_NOT_EXPIRED',409);
 return settle(state,state.expiresAt,'DISCONNECTED_COLLECT');
}
export function publicState(s,now){
 // The public heartbeat lease must not reveal a nearer secret pop deadline.
 const view={gameId:s.gameId,status:s.status,stakeMinor:s.stakeMinor,startedAt:s.startedAt,expiresAt:s.holdUntil??s.startedAt+LIMITS.leaseMs,coefficient:s.status==='settled'?s.coefficient:coefficientAt(s.startedAt,Math.min(now,s.expiresAt)),maxMultiplier:LIMITS.multiplier/100};
 if(s.status==='settled')Object.assign(view,{payoutMinor:s.payoutMinor,reason:s.reason,settledAt:s.settledAt,crash:s.crash});
 return view;
}
