import {active,baseRound,draw,error,payout,publicBase,timestamp} from './shared.mjs';
export function startCrash(config,{betMinor,rng,now}){
 const round=baseRound(config,betMinor);const ticket=draw(rng,config.ticketCount)+1;
 const bustMultiplierBps=Math.min(config.maxMultiplierBps+1,Math.floor(config.returnBps*config.ticketCount/ticket));
 return syncCrash(config,{...round,startedAt:timestamp(now),lastObservedAt:timestamp(now),maxSteps:1,private:{bustMultiplierBps}},now);
}
export function syncCrash(config,round,now){
 if(round.status!=='active')return{...round,history:round.history.map(x=>({...x})),private:{...round.private}};
 const at=timestamp(now);if(at<round.startedAt||at<round.lastObservedAt)error('INVALID_TIME','Server time cannot move backwards within a round.');
 const multiplierBps=Math.min(config.maxMultiplierBps,10000+Math.floor((at-round.startedAt)*config.growthBpsPerSecond/1000));
 const next={...round,lastObservedAt:at,multiplierBps,history:round.history.map(x=>({...x})),private:{...round.private}};
 if(multiplierBps>=round.private.bustMultiplierBps)return{...next,status:'lost',step:1,winMinor:'0',history:[{type:'bust',multiplierBps:round.private.bustMultiplierBps}]};
 if(multiplierBps===config.maxMultiplierBps)return{...next,status:'collected',step:1,winMinor:payout(round.betMinor,multiplierBps),history:[{type:'automatic-collect',multiplierBps}]};
 return next;
}
export function advanceCrash(config,round,_options,now){active(round);return syncCrash(config,round,now);}
export function collectCrash(config,round,_options,now){active(round);const next=syncCrash(config,round,now);if(next.status!=='active')return next;return{...next,status:'collected',step:1,winMinor:payout(next.betMinor,next.multiplierBps),history:[{type:'collect',multiplierBps:next.multiplierBps}]};}
export function publicCrash(config,round,now){const view=syncCrash(config,round,now);return{...publicBase(round),multiplierBps:view.multiplierBps,startedAt:view.startedAt,serverNow:view.lastObservedAt,growthBpsPerSecond:config.growthBpsPerSecond,maxMultiplierBps:config.maxMultiplierBps,collectibleMinor:round.status==='active'&&view.status==='active'?payout(view.betMinor,view.multiplierBps):'0',pendingResolution:round.status==='active'&&view.status!=='active',allowedActions:round.status==='active'?['reveal','collect']:[],...(round.status==='lost'?{bustMultiplierBps:round.private.bustMultiplierBps}:{})};}
export function crashReturn(config,{betMinor='10',targetBps=20000}={}){if(!Number.isSafeInteger(targetBps)||targetBps<10000||targetBps>config.maxMultiplierBps)error('INVALID_TARGET','Choose a multiplier within the published range.');const bet=BigInt(baseRound(config,betMinor).betMinor);const wins=Math.floor(config.returnBps*config.ticketCount/(targetBps+1));return{survivalNumerator:String(wins),survivalDenominator:String(config.ticketCount),payoutMinor:payout(bet.toString(),targetBps),expectedReturnNumerator:(BigInt(wins)*BigInt(payout(bet.toString(),targetBps))).toString(),expectedReturnDenominator:(BigInt(config.ticketCount)*bet).toString()};}
