// Exact operator proof; no production services, balances or random sampling.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as mh10 from '../operator-math/multi-hot-10.mjs';
import * as mh40 from '../operator-math/multi-hot-40.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const folder='reports/special74/operator-math',prefix='workers/superwin-player/special74/operator-math/';
const sha256=data=>createHash('sha256').update(data).digest('hex'),gcd=(a,b)=>b===0n?a:gcd(b,a%b);
await mkdir(resolve(root,folder),{recursive:true});
for(const engine of [mh10,mh40]){
 const {model,evaluate,multiplierForTicket}=engine,name=`multi-hot-${model.paylines.length}`;
 const weights=Array(5).fill(0),total=model.multiplierWeights.reduce((a,b)=>a+b,0);
 for(let ticket=0;ticket<total;ticket++)weights[multiplierForTicket(ticket)-1]++;
 if(weights.some((value,index)=>value!==model.multiplierWeights[index]))throw Error('Multiplier enumeration mismatch');
 // Set each row to the same five-symbol sequence. Every fixed path then sees
 // that sequence; all line pays must agree, including longest-match behavior.
 let linePaySum=0n;const matchCounts={3:0,4:0,5:0,none:0};
 for(let code=0;code<8**5;code++){
  let n=code;const sequence=Array.from({length:5},()=>{const symbol=model.symbols[n%8];n=Math.floor(n/8);return symbol;});
  let match=1;while(match<5&&sequence[match]===sequence[0])match++;
  const expected=match>=3?model.paytable[sequence[0]][match]:0;matchCounts[match>=3?match:'none']++;
  const result=evaluate({betMinor:model.paylines.length,multiplier:1,grid:Array.from({length:model.rows},()=>[...sequence])});
  if(BigInt(result.payoutMinor)!==BigInt(expected*model.paylines.length)||result.wins.some(win=>win.matched!==match||BigInt(win.amountMinor)!==BigInt(expected)))throw Error('Exhaustive line evaluator mismatch');
  linePaySum+=BigInt(expected);
 }
 const weightedMultiplier=weights.reduce((sum,weight,index)=>sum+BigInt(weight*(index+1)),0n);
 const numerator=linePaySum*weightedMultiplier,denominator=BigInt(8**5)*BigInt(total),divisor=gcd(numerator,denominator);
 if(numerator*25n!==denominator*24n)throw Error('Exact RTP is not 24/25');
 const maximum=evaluate({betMinor:model.betMinor.max,multiplier:5,grid:Array.from({length:model.rows},()=>Array(5).fill('seven'))});
 if(BigInt(maximum.payoutMinor)!==BigInt(model.betMinor.max)*BigInt(model.maxBaseWinTimesStake))throw Error('Maximum exposure mismatch');
 const sourceInputs=[];for(const path of [prefix+'five-reel-model.mjs',prefix+name+'.mjs'])sourceInputs.push({path,sha256:sha256(await readFile(resolve(root,path)))});
 const mathSha256=sha256(JSON.stringify(sourceInputs));
 const chart=await readFile(resolve(root,model.reference.lineChart));if(sha256(chart)!==model.reference.lineChartSha256)throw Error('Reference payline chart hash mismatch');
 const specification={...model,sourceType:'operator-authored-math-specification',mathSha256,
  provenance:{observed:'Public symbol pays, left-to-right longest-match rule, reel geometry, symbol artwork mapping and fixed line chart.',
   independentlyAuthored:'Independent uniform cells, multiplier ticket weights, 96% RTP, uncapped base liability and fair optional color gamble. No provider probabilities inferred.'},
  ledgerIntegration:{verified:false,requirements:['Retained server locks wallet and reserves worst-case liability before debit.','Persist game/model identity, request token, wager and canonical result in the existing transaction.','Replay returns existing receipt with no second debit.','Optional gamble must match latest eligible round, attempt and stake.','Show independent probabilities and actual operator maximum in rules.']}};
 const specPath=folder+'/'+name+'-specification.json',specText=JSON.stringify(specification,null,2)+'\n';await writeFile(resolve(root,specPath),specText);
 const proof={schemaVersion:1,gameId:model.reference.gameId,modelId:model.id,modelVersion:model.version,mathSha256,
  mathHashMethod:'SHA-256 of compact JSON sourceInputs array in the recorded order; includes common evaluator and model specification modules.',sourceInputs,
  sourceType:'operator-authored-math-specification',claimsProviderMath:false,exactProofVerified:true,
  method:'Exhaustive 32768 ordered five-cell sequences checked through the actual evaluator for every line; all multiplier tickets counted; linearity of expectation across equal-stake lines. Cells are independent uniform draws. Lines may be correlated; independence between lines is not assumed.',
  orderedLineOutcomes:32768,matchCounts,linePaySum:String(linePaySum),multiplierTickets:total,multiplierWeights:weights,weightedMultiplierSum:String(weightedMultiplier),
  theoreticalRtp:{numerator:String(numerator/divisor),denominator:String(denominator/divisor)},unreducedReturn:{numerator:String(numerator),denominator:String(denominator)},
  maxBaseWinTimesStake:model.maxBaseWinTimesStake,maxBaseLiabilityAtMaximumStakeMinor:maximum.payoutMinor,
  gambleExpectedReturn:{numerator:'1',denominator:'1',method:'One of two equiprobable colors wins 2x. The finite attempt/amount limits are enforced independently of the next draw.'},
  evidence:[...sourceInputs,{path:specPath,sha256:sha256(specText)},{path:model.reference.lineChart,sha256:sha256(chart)},{path:model.reference.rules,sha256:sha256(await readFile(resolve(root,model.reference.rules)))}],
  backendIntegrationVerified:false,productionEnabled:false,
  limitations:['No SmartSoft private probability certification or claim of identical outcome distribution.','Sibling retained-ledger runtime integration, reserve checks and production activation are not verified by this mathematical proof.','MH10 independent maximum is 5000x; provider help displayed 1000x. No provider maximum cap is claimed.']};
 await writeFile(resolve(root,folder+'/'+name+'-proof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify({modelId:model.id,mathSha256,rtp:'24/25',maximum:model.maxBaseWinTimesStake,exactProofVerified:true,productionEnabled:false}));
}
