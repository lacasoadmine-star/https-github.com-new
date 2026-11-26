import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {model,multiplierForTicket,evaluate} from '../operator-math/multi-hot-5.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const source='workers/superwin-player/special74/operator-math/multi-hot-5.mjs';
const sha256=data=>createHash('sha256').update(data).digest('hex');
const weights=Array.from({length:5},()=>0);
for(let ticket=0;ticket<5750;ticket++)weights[multiplierForTicket(ticket)-1]++;
let numerator=0n;
for(let a=0;a<9;a++)for(let b=0;b<9;b++)for(let c=0;c<9;c++){
 for(let m=1;m<=5;m++)if(a===b&&b===c)numerator+=BigInt(model.linePays[a]*m*weights[m-1]);
}
const denominator=729n*5750n;
const gcd=(a,b)=>b===0n?a:gcd(b,a%b),divisor=gcd(numerator,denominator);
if(numerator*25n!==denominator*24n)throw Error('Exact RTP proof failed');
const maximum=evaluate({betMinor:40000,grid:Array.from({length:3},()=>['777','777','777']),multiplier:5});
if(maximum.payoutMinor!=='15000000')throw Error('Maximum base liability proof failed');
const folder='reports/special74/operator-math';await mkdir(resolve(root,folder),{recursive:true});
const specification={...model,sourceType:'operator-authored-math-specification',gameId:'001-multi-hot-5',
 authorization:'User explicitly requested reasonable independently designed operator math on 2026-11-13.',
 ledgerIntegration:{source:'existing-superwin-server',verified:false,requirements:[
  'Server selects outcome, locks existing wallet, validates sufficient funds and house reserve.',
  'Persist model version, request ID, wager and canonical result in the existing ledger transaction.',
  'Retry returns the existing receipt; no repeated debit or independent frontend payout.',
  'Gamble debits only an eligible existing win; collect must never credit an already-settled payout twice.',
  'Keep existing model IDs unchanged; publish this additive model under its own ID.',
  'Show operator RTP, paytable, actual maximum win and gamble limits in the game rules.'
 ]}};
const specPath=folder+'/multi-hot-5-specification.json',specText=JSON.stringify(specification,null,2)+'\n';
await writeFile(resolve(root,specPath),specText);
const proof={schemaVersion:1,gameId:'001-multi-hot-5',modelId:model.id,modelVersion:model.version,
 sourceType:'operator-authored-math-specification',claimsProviderMath:false,exactProofVerified:true,
 method:'Exhaustive 729 ordered line outcomes, all 5750 multiplier tickets, and linearity of expectation across five fixed equal-stake lines. All nine grid cells are independent uniform draws.',
 theoreticalRtp:{numerator:String(numerator/divisor),denominator:String(denominator/divisor)},
 unreducedReturn:{numerator:String(numerator),denominator:String(denominator)},
 multiplierWeights:weights,maxBaseWinTimesStake:375,maxBaseLiabilityAtMaximumStakeMinor:maximum.payoutMinor,
 gambleExpectedReturn:{numerator:'1',denominator:'1',method:'One of two equiprobable colors wins 2x; valid amount and attempt limits are outcome-independent.'},
 evidence:[{path:source,sha256:sha256(await readFile(resolve(root,source)))},{path:specPath,sha256:sha256(specText)}],
 backendIntegrationVerified:false,productionEnabled:false,
 limitations:['This is not SmartSoft probability certification.','Frontend, ledger integration, liability reservation and end-to-end settlement still require verification before release.']};
await writeFile(resolve(root,folder+'/multi-hot-5-proof.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({modelId:model.id,rtp:'24/25',maxBaseWinTimesStake:375,exactProofVerified:true,backendIntegrationVerified:false,productionEnabled:false}));
