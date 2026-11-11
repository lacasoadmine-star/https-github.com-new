import { randomInt } from 'node:crypto';
export function error(code,message){const e=new Error(message);e.code=code;throw e;}
export function draw(rng,bound){const n=(rng??randomInt)(bound);if(!Number.isSafeInteger(n)||n<0||n>=bound)error('INVALID_RNG','RNG must return an integer in the requested half-open range.');return n;}
export function stake(value,limits){if(typeof value==='number'&&Number.isSafeInteger(value))value=String(value);if(typeof value!=='string'||!/^(0|[1-9][0-9]*)$/.test(value))error('INVALID_BET','Use a canonical integer minor-unit stake.');const n=BigInt(value);if(n<BigInt(limits.minBetMinor)||n>BigInt(limits.maxBetMinor)||n%BigInt(limits.betStepMinor))error('INVALID_BET','Stake is outside the game limits or increments.');return n.toString();}
export const payout=(bet,bps)=>(BigInt(bet)*BigInt(bps)/10000n).toString();
export function timestamp(now){const n=now instanceof Date?now.getTime():now??Date.now();if(!Number.isSafeInteger(n)||n<0)error('INVALID_TIME','Use a valid server timestamp.');return n;}
export function active(round){if(round.status!=='active')error('ROUND_FINISHED','The round has already ended.');}
export function baseRound(config,betMinor){return{gameId:config.id,mathVersion:config.mathVersion,family:config.family,betMinor:stake(betMinor,config.limits),status:'active',winMinor:'0',step:0,multiplierBps:0,history:[]};}
export function publicBase(round){return{gameId:round.gameId,mathVersion:round.mathVersion,family:round.family,betMinor:round.betMinor,status:round.status,winMinor:round.winMinor,step:round.step,multiplierBps:round.multiplierBps,history:round.history.map(x=>({...x})),maxSteps:round.maxSteps??1};}
