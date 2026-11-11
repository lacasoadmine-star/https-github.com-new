// PlinkoX (not Classic): observed three-risk boards and documented visible controls.
// Paths, colors and batch settlement are independent operator math; no native
// probability table or hidden outcome source is recovered or executed.
import {baseRound,draw,error,payout} from './engines/shared.mjs';
export const OBSERVED_PLINKOX_ID='ind74_official_plinkox';
const LOW=Object.freeze([200000,100000,50000,20000,15000,13000,11000,8000,5000,8000,11000,13000,15000,20000,50000,100000,200000]);
export const PLINKOX_BUCKET_TABLES=Object.freeze({low:LOW,
 medium:Object.freeze([1000000,500000,100000,50000,30000,10000,1000,2000,5000,2000,1000,10000,30000,50000,100000,500000,1000000]),
 high:Object.freeze([10000000,1000000,200000,100000,40000,20000,2000,2000,2000,2000,2000,20000,40000,100000,200000,1000000,10000000])});
const choose=(n,k)=>{let v=1n;for(let i=1;i<=k;i++)v=v*BigInt(n-i+1)/BigInt(i);return v;};
export function configureObservedPlinkoX(d) {
 if(d?.id!==OBSERVED_PLINKOX_ID||d.family!=='plinko')throw new TypeError('The observed non-Classic Plinko X definition is required.');
 d.mathVersion='official72-plinkox-r4';d.model='observed-three-risk-independent-batch-v2';d.rows=16;d.bucketMultipliersBps=[...LOW];d.bucketTablesBps=structuredClone(PLINKOX_BUCKET_TABLES);
 d.defaultRisk='low';d.riskLevels=[{id:'low',label:'LOW',implemented:true,observedMaximumMultiplier:200},{id:'medium',label:'MEDIUM',implemented:true,observedMaximumMultiplier:1000},{id:'high',label:'HIGH',implemented:true,observedMaximumMultiplier:10000}];
 d.ballAmounts=[1,5,10,25];d.defaultBallAmount=1;d.minBallStakeMinor='100';d.ballStakeStepMinor='100';d.batchTotalStake=true;
 d.ballMultipliers=[1,5,10];d.ballSelection=[{type:'pink',multiplier:1,weight:995},{type:'yellow',multiplier:5,weight:4},{type:'blue',multiplier:10,weight:1}];
 d.ballSelectionModel={selection:'server',providerProbabilitiesVerified:false,rule:'Independent per-ball server choice with authored995/4/1 pink/yellow/blue tickets; native color-selection semantics and probabilities are unverified.'};
 d.observedPegboard={rows:16,buckets:17,pegCountsByRow:Array.from({length:16},(_,i)=>i+3),source:'reports/current74-evidence/plinkox-low-ready-desktop-dpr1.png'};
 d.paytable=Object.entries(PLINKOX_BUCKET_TABLES).flatMap(([risk,table])=>table.map((multiplierBps,bucket)=>({label:risk.toUpperCase()+' bucket '+bucket,risk,bucket,multiplierBps,probabilityNumerator:choose(16,bucket).toString(),probabilityDenominator:'65536',probabilitiesIndependent:true})));
 const ideal=LOW.reduce((sum,m,k)=>sum+choose(16,k)*BigInt(m),0n);
 d.nominalReturn={numerator:(ideal*1025n).toString(),denominator:(65536n*10000n*1000n).toString(),verified:false,
  description:'DefaultLOW independent16-fair-turn path and authored995/4/1 color-ticket expectation, before per-ball integer flooring. Other risk distributions are also independent; no provider RTP claim.'};
 d.rules=[
  'The observed non-Classic Plinko X LOW board has16 peg rows and17 buckets. LOW prizes are20,10,5,2,1.5,1.3,1.1,0.8,0.5,0.8,1.1,1.3,1.5,2,5,10,20 times the per-ball stake. The static legend shows pink1x, yellow5x and blue10x balls.',
  'A subsequent read-only official DEMO inspection of rendered bucket captions verifies all17 MEDIUM and HIGH prizes. Their edge buckets are100x and1000x; the static10x color factor permits1000x and10000x maximum awards. These two risk tables were displayed and screenshotted without any additional wager; their outcomes were not sampled.',
  'Select1,5,10 or25 balls. The accepted stake is the TOTAL batch stake; it must split exactly into equal whole-ETB per-ball stakes of at least1ETB. The displayed total is per-ball stake times ball amount. One request debits and reserves that total once, and credits the sum of completed ball awards once.',
  'Each independent ball takes16 fair left/right turns. The bucket index is the number of right turns. The server independently chooses pink/yellow/blue using authored995/4/1 tickets, then pays floor(per-ball stake × bucket multiplier × ball multiplier). These operator choices are not verified provider probabilities or native color-selection semantics.',
  'The risk-specific independent upper bounds are200xTOTAL for LOW,1000xTOTAL for MEDIUM and10000xTOTAL for HIGH. Every ball result is settled by the server before animation; STOP changes presentation only. Client-supplied colors, paths, prizes and balances are rejected.',
  'Twenty official LOW single-ball rounds were observed, including an effective11x award. Native5/10/25-ball accounting, medium/high outcomes, recovery, exact artwork/audio and full provider parity were not established. This batch accounting contract is independently authored and explicitly separate from those observations.',
 ];
 d.provenance={...d.provenance,observed:'Twenty completed LOW single-ball official DEMO rounds with exact debit, gross WIN and credited-balance equations; one effective11x award. Rendered16-row/17-bucket LOW board and static three-color legend.',
  geometrySource:'reports/current74-evidence/plinkox-low-ready-desktop-dpr1.png',observationSource:'tests/evidence/official-demo-observations-plinkox20.json',
  riskTableSource:'reports/current74-evidence-nonslots/ind74_official_plinkox-rendered-buckets.json',
  designed:'Independent fair paths, color-ticket probabilities and atomic one-total-stake batch settlement; verified rendered Medium/High prize tables; no claimed native multi-ball accounting.'};
 return d;
}
export function observedPlinkoXOptions(options={}) {
 const risk=options.risk??'low',ballAmount=options.ballAmount??1;
 if(typeof risk!=='string'||!Object.hasOwn(PLINKOX_BUCKET_TABLES,risk))error('UNVERIFIED_RISK','Choose a documented LOW, MEDIUM or HIGH bucket table.');
 if(![1,5,10,25].includes(ballAmount))error('INVALID_BALL_AMOUNT','Choose1,5,10 or25 balls.');
 return {risk,ballAmount};
}
function splitStake(betMinor,options) {
 const selected=observedPlinkoXOptions(options),total=BigInt(betMinor),n=BigInt(selected.ballAmount);
 if(total%n!==0n||total/n<100n||(total/n)%100n!==0n)error('INVALID_BALL_STAKE','The total must split into whole per-ball stakes of at least1ETB.');
 return {...selected,perBallBetMinor:(total/n).toString(),totalBetMinor:betMinor};
}
export function maximumObservedPlinkoXPayout(d,betMinor,options={}) {
 const selected=splitStake(betMinor,options),prize=Math.max(...d.bucketTablesBps[selected.risk])*10;return (BigInt(betMinor)*BigInt(prize)/10000n).toString();
}
export function startObservedPlinkoX(d,{betMinor,rng,options={}}) {
 const selected=splitStake(betMinor,options),round=baseRound(d,betMinor),balls=[];
 for(let i=0;i<selected.ballAmount;i++) {
  const path=Array.from({length:16},()=>draw(rng,2)),bucket=path.reduce((a,b)=>a+b,0),ticket=draw(rng,1000);
  const color=ticket<995?d.ballSelection[0]:ticket<999?d.ballSelection[1]:d.ballSelection[2];
  const bucketMultiplierBps=d.bucketTablesBps[selected.risk][bucket],multiplierBps=bucketMultiplierBps*color.multiplier;
  balls.push({index:i,path,bucket,ballType:color.type,ballMultiplier:color.multiplier,bucketMultiplierBps,multiplierBps,winMinor:payout(selected.perBallBetMinor,multiplierBps)});
 }
 const win=balls.reduce((sum,ball)=>sum+BigInt(ball.winMinor),0n),multiplierBps=Number(win*10000n/BigInt(betMinor));
 if(win>BigInt(maximumObservedPlinkoXPayout(d,betMinor,options))||win>BigInt(d.limits.maxWinMinor))error('PAYOUT_LIMIT_EXCEEDED','The Plinko batch exceeds its accepted liability.');
 return {...round,...selected,status:win===0n?'lost':'collected',step:1,winMinor:win.toString(),multiplierBps,
  outcome:{kind:'plinko',...balls[0],...selected,balls,multiplierBps}};
}
export function validateObservedPlinkoXRound(d,round) {
 const selected=splitStake(round.betMinor,{risk:round.risk,ballAmount:round.ballAmount}),o=round.outcome;
 if(round.status!=='collected'||round.risk!==selected.risk||round.ballAmount!==selected.ballAmount||!o||o.kind!=='plinko'||o.risk!==selected.risk||o.ballAmount!==selected.ballAmount||
  round.perBallBetMinor!==selected.perBallBetMinor||round.totalBetMinor!==round.betMinor||o.perBallBetMinor!==selected.perBallBetMinor||o.totalBetMinor!==round.betMinor||
  !Array.isArray(o.balls)||o.balls.length!==selected.ballAmount)error('INVALID_ROUND','The stored Plinko batch identity is invalid.');
 let win=0n;
 for(const[index,ball]of o.balls.entries()) {
  const color=d.ballSelection.find(c=>c.type===ball.ballType),path=ball.path;
  if(!color||ball.index!==index||!Array.isArray(path)||path.length!==16||path.some(turn=>turn!==0&&turn!==1)||
   ball.bucket!==path.reduce((a,b)=>a+b,0)||ball.ballMultiplier!==color.multiplier||ball.bucketMultiplierBps!==d.bucketTablesBps[selected.risk][ball.bucket]||
   ball.multiplierBps!==ball.bucketMultiplierBps*color.multiplier||ball.winMinor!==payout(selected.perBallBetMinor,ball.multiplierBps))error('INVALID_ROUND','The stored Plinko ball result is invalid.');
  win+=BigInt(ball.winMinor);
 }
 const first=o.balls[0];
 if(JSON.stringify(o.path)!==JSON.stringify(first.path)||o.bucket!==first.bucket||o.ballType!==first.ballType||o.ballMultiplier!==first.ballMultiplier||o.bucketMultiplierBps!==first.bucketMultiplierBps||
  round.winMinor!==win.toString()||round.multiplierBps!==Number(win*10000n/BigInt(round.betMinor))||o.multiplierBps!==round.multiplierBps)error('INVALID_ROUND','The stored Plinko batch total is invalid.');
}
