import {baseRound,draw,error,payout,publicBase} from './shared.mjs';
// Public target mechanics follow the publisher's rules. The uniform ticket
// distribution and 95% theoretical return are independently authored.
export function startTargetCrash(config,{betMinor,options={},rng}={}){
 const target=options.targetBps??config.defaultTargetBps;
 if(!Number.isSafeInteger(target)||target<config.minTargetBps||target>config.maxTargetBps)error('INVALID_TARGET','Choose a target from 1.05× through 10,000×.');
 const round=baseRound(config,betMinor),success=draw(rng,target)<config.returnBps;
 const multiplierBps=success?target:0;
 return {...round,status:success?'collected':'lost',step:1,multiplierBps,winMinor:payout(betMinor,multiplierBps),outcome:{kind:'target-crash',targetBps:target,success}};
}
export function publicTargetCrash(round){return {...publicBase(round),outcome:{...round.outcome},allowedActions:[],collectibleMinor:'0'};}
