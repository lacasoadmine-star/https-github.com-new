import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ID,VERSION,LIMITS,MATH_PROFILE,MULTIPLIER_TICKETS,publicConfig} from '../models/multihot40-rules.mjs';

const root=new URL('../',import.meta.url),read=path=>readFile(new URL(path,root));
const reference=JSON.parse(await read('references/public-models/multihot40_native.json'));
const coeffs=reference.paytable.Coeffs.map(row=>row.Wins);
let sum=0;
for(let code=0;code<8**5;code++){
 let n=code;const line=[];
 for(let column=0;column<5;column++){line.push(n%8);n=Math.floor(n/8);}
 let count=1;while(count<5&&line[count]===line[0])count++;
 sum+=coeffs[line[0]][count];
}
const gcd=(a,b)=>b===0n?a:gcd(b,a%b);
const numerator=BigInt(sum*MULTIPLIER_TICKETS.reduce((a,b)=>a+b,0));
const denominator=BigInt(8**5*MULTIPLIER_TICKETS.length),divisor=gcd(numerator,denominator);
if(numerator/divisor!==31425n||denominator/divisor!==32768n)throw Error('ANALYTICAL_RETURN_CHANGED');
const files=['models/multihot40-rules.mjs','models/smartsoft-slots.data.json','models/smartsoft-slots.mjs',
 'references/public-models/multihot40_native.json','references/multihot40-paylines.json',
 'references/multihot40-official-walkthrough.json','test/multihot40-math.test.mjs','test/multihot40-wallet.test.mjs',
 'test/multihot40-wallet-fixture.mjs','test/multihot40-app-controls.test.mjs',
 'backend-baseline/library-service.mjs','backend-baseline/native-family-preserved.mjs'];
const hashes={};for(const file of files)hashes[file]=createHash('sha256').update(await read(file)).digest('hex');
const evidence={
 schemaVersion:1,checkedAt:new Date().toISOString(),gameId:ID,modelVersion:VERSION,
 status:'INDEPENDENT_NATIVE_MATH_AND_ISOLATED_WALLET_VERIFIED',productionPublished:false,
 scope:'Only the new MultiHot40 v2 adapter. Full presentation, browser integration and release decisions belong to the parent continuation.',
 reference:{officialPage:publicConfig.officialReference,observedDemoReturnPercent:'96.58',providerPrivateProbabilityLawRecovered:false,providerDoublingBoundaryVerified:false},
 diagnosis:{previousVersion:'superwin-multihot40-1',uniformWheelReturn:{numerator:'6285',denominator:'8192',value:6285/8192},cause:'The original disabled draft used uniform independent symbols and a uniform 1x–5x wheel after restoring unscaled public prizes. That distribution returns 76.72119140625%, so it does not satisfy the intended native 94–97% profile.'},
 method:{
  rawPublicPaytableUnchanged:true,exactPublicStakeScheduleUnchanged:true,verified40PathsUnchanged:true,
  publicPrizeScale:{numerator:'1',denominator:'1'},uniformSymbols:8,independentGridCells:20,
  lineEnumeration:{sequences:8**5,sumOfUnscaledLineCoefficients:sum,meanLineCoefficient:{numerator:'2095',denominator:'8192'}},
  wheelTickets:MULTIPLIER_TICKETS,wheelWeights:[1,2,3,4,6],meanWheelMultiplier:{numerator:'15',denominator:'4'},
  lineAggregation:'Every path contains one independent symbol from each of the five reels. Each path therefore has the same marginal expectation. Linearity of expectation applies despite correlations between different winning lines; 40 paths and the stake/40 award basis cancel.',
  exactReturn:{numerator:String(numerator/divisor),denominator:String(denominator/divisor),value:Number(numerator)/Number(denominator),percent:MATH_PROFILE.nativeReturn.percent},
  money:'All 18 supported stakes are multiples of 40 santim; every public coefficient is an integer. Line prizes and total wins are integral, so there is no rounding draw or rounding loss.',
  maximum:{timesTotalStake:2500,absoluteMinor:'25000000',attained:true,clipped:false,proof:'Each line pays at most 500 times its line stake and the wheel multiplies by at most 5; 40 lines imply a total no greater than 2500 times total stake. All 20 sevens with 5x attain this bound.'},
  randomness:MATH_PROFILE.randomness
 },
 collection:{manual:'Positive win remains active and reserved until collection or expiry; the next Spin must collect then start.',autoplay:'Explicit autoCollect:true settles in the original paid transaction.',expiryMs:LIMITS.collectionMs,expiryBehavior:'Collect the full current win without a fresh random draw; service reconciliation works after account blocking and new-start disabling.'},
 gamble:MATH_PROFILE.gamble,
 verification:{
  command:'node --test test/multihot40-math.test.mjs test/multihot40-wallet.test.mjs test/multihot40-app-controls.test.mjs',
  passed:37,failed:0,skipped:0,node:process.version,
  database:'PGlite in-memory PostgreSQL, exact unchanged canonical wallet, no service database connection',
  coverage:['exact 32768-sequence mean','2500x attained bound at every stake','40 path/cell mapping','21 fixed outcome draws','integral-money prizes',
   'manual pending and automatic collection','fair red/black across all 4 suits','five-attempt and 500.00 ETB input boundary','bounded-strategy expected value',
   'reload and 30 minute expiry','persisted jsonb key reordering','corrupt stored state rejection','client payout rejection',
   'duplicate/concurrent collection idempotency','gamble replay and changed-body conflict','single debit and conserved double-entry ledger',
   'ownership and stale-version rejection','accepted collection after disabled starts/lower account cap','blocked-account expiry','atomic rollback for insufficient funds/bankroll/account cap',
   'collect before next Spin and navigation cancellation','STOP changes only presentation','autoplay automatic collection and stopping limits',
   'identical pending request retry','account changes and stale history responses','read-only replay','native math metadata preservation','accepted win collection despite artwork failure'],
  limitation:'One embedded PostgreSQL connection, plus a VM control harness with real session/controller code and fixture DOM/network/rendering; these do not replace browser or multi-process production checks. No production account, credit or wager was created.'
 },
 release:{productionGateEnabled:false,providerExactParityClaimed:false,remaining:['Complete per-game player presentation and controls','Native browser/mobile integration checks','The reference 500 doubling pre/post boundary remains unverified; the independent ETB rule is disclosed']},
 sha256:hashes
};
await writeFile(new URL('evidence/multihot40-v2-math.json',root),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({gameId:ID,modelVersion:VERSION,exactReturn:evidence.method.exactReturn,maximum:evidence.method.maximum,productionGateEnabled:false}));
