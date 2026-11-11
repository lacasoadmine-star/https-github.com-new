import {baseRound,draw,error,payout,publicBase} from './shared.mjs';
export function startInstant(config,{betMinor,rng,options={}}){const round=baseRound(config,betMinor);let outcome,multiplierBps=0;
 if(config.family==='wheel'){const ticket=draw(rng,config.sectors.reduce((n,s)=>n+s.weight,0));let cursor=0;let sector;for(const s of config.sectors){cursor+=s.weight;if(ticket<cursor){sector=s;break;}}multiplierBps=sector.multiplierBps;outcome={kind:'wheel',sector:sector.id,label:sector.label,multiplierBps};}
 else if(config.family==='plinko'){const path=Array.from({length:config.rows},()=>draw(rng,2));const bucket=path.reduce((n,b)=>n+b,0);multiplierBps=config.bucketMultipliersBps[bucket];outcome={kind:'plinko',path,bucket,multiplierBps};}
 else if(config.family==='dice'){const target=options.target??config.defaultTarget;if(!Number.isInteger(target)||target<config.minTarget||target>config.maxTarget)error('INVALID_TARGET','Choose a permitted integer target.');const roll=draw(rng,100);const success=roll<target;const offeredMultiplierBps=Math.floor(config.returnBps*100/target);multiplierBps=success?offeredMultiplierBps:0;outcome={kind:'dice',roll,target,success,offeredMultiplierBps,multiplierBps};}
 else error('INVALID_GAME','Unsupported instant family.');
 const winMinor=payout(round.betMinor,multiplierBps);return{...round,status:winMinor==='0'?'lost':'collected',step:1,multiplierBps,winMinor,outcome};}
export function publicInstant(round){return{...publicBase(round),outcome:structuredClone(round.outcome),collectibleMinor:'0',allowedActions:[]};}
