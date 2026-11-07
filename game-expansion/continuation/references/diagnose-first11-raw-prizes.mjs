// Offline diagnostic only. Does not open production gates, tune probabilities or change prizes.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {evaluateSequence,sampleOutcome,evaluateDraftRound} from '../models/smartsoft-slots.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)).replace(/\/$/,'');
const models=JSON.parse(await readFile(root+'/models/smartsoft-slots.data.json','utf8'));
const gcd=(a,b)=>b?gcd(b,a%b):a;
function sfc32(seed){let a=seed>>>0,b=(seed^0x9e3779b9)>>>0,c=(seed^0x243f6a88)>>>0,d=(seed^0xb7e15162)>>>0;const next=()=>{a>>>=0;b>>>=0;c>>>=0;d>>>=0;let t=(a+b)|0;a=b^(b>>>9);b=(c+(c<<3))|0;c=((c<<21)|(c>>>11));d=(d+1)|0;t=(t+d)|0;c=(c+t)|0;return(t>>>0)/4294967296;};for(let i=0;i<20;i++)next();return next;}
const results=[];
for(let idx=0;idx<models.length;idx++){
 const m=models[idx],entry={id:m.id,launchable:false,modelVersion:m.version,payoutScale:m.scale};
 if(m.mechanic!=='freeze-respin'){
  const n=m.symbols.length,weights=m.mechanic==='super-wild'?[8,...Array(8).fill(7)]:Array(n).fill(1),den=weights.reduce((a,b)=>a+b,0),seq=Array(m.columns);
  let weighted=0n;
  for(let code=0;code<n**m.columns;code++){
   let value=code,prob=1n;
   for(let c=0;c<m.columns;c++){seq[c]=value%n;value=Math.floor(value/n);prob*=BigInt(weights[seq[c]]);}
   weighted+=BigInt(evaluateSequence(seq,m).units)*prob;
  }
  let numerator=weighted*3n*BigInt(m.paths.length),denominator=BigInt(den)**BigInt(m.columns)*10n*BigInt(m.lineStakeDivisor),factor=gcd(numerator,denominator);
  entry.analyticBeforeReferenceMaximum={method:'Exact enumeration of every symbol sequence on one path; linearity across actual lines/ways and independent mean multiplier3. No cap or outcome-support claim.',sequences:n**m.columns,effectiveSymbolWeights:weights,returnFraction:{numerator:String(numerator/factor),denominator:String(denominator/factor)},expectedReturn:Number(numerator)/Number(denominator)};
 }
 const count=50000,seed=(0x65ad0000+idx*9973)>>>0,rng=sfc32(seed),stake=m.stakeMinorValues.at(-1),absolute=Number(m.maxWin.replace('.',''))/Number(stake),ceiling=Math.min(absolute,m.winMultiplierCap===undefined?Infinity:Number(m.winMultiplierCap));
 let sum=0,squares=0,raw=0,capped=0,maximum=0;
 for(let i=0;i<count;i++){
  const out=sampleOutcome(m.id,rng,{trace:false}),rawReturn=out.rawUnits/(10*m.lineStakeDivisor),paid=Math.min(rawReturn,ceiling);
  raw+=rawReturn;sum+=paid;squares+=paid*paid;maximum=Math.max(maximum,paid);if(rawReturn>ceiling)capped++;
 }
 const mean=sum/count,sd=Math.sqrt(Math.max(0,(squares-count*mean*mean)/(count-1))),error=2.5758293035489004*sd/Math.sqrt(count);
 const bound=evaluateDraftRound(m.id,{stakeMinor:stake},sfc32(seed+1),0).maxPayoutMinor;
 entry.pilot={sampleCount:count,seed,prng:'SFC32 with20 warmup outputs',meanBeforeCeiling:raw/count,meanAfterDraftReferenceCeiling:mean,confidence99NormalApproximation:[mean-error,mean+error],sampleMaximumReturn:maximum,sourceCeilingEvents:capped,stakeMaximumMinor:stake,reserveAtMaximumMinor:bound,scope:'Uncalibrated disabled draft; confidence approximation is diagnostic, not certification. Same return applies to every listed stake because raw payouts are integral and maxima scale proportionally or remain above the raw model bound.'};
 results.push(entry);console.log(m.id,'exactPreCeiling',entry.analyticBeforeReferenceMaximum?.expectedReturn??'respin-pilot-only','pilot',mean,'CI99',entry.pilot.confidence99NormalApproximation);
}
await writeFile(root+'/references/first11-raw-prize-diagnostic.json',JSON.stringify({status:'UNCALIBRATED_DISABLED_DRAFT_DIAGNOSTIC',generatedAtLocalRuntime:new Date().toISOString(),warning:'These figures describe only current independent ZPLAY draft sampling and its interpretation of public numerical ceilings. They are not provider RTP, release readiness, or evidence for exact public cap/respins semantics. Visible coefficients and probabilities were not changed to obtain these results.',results},null,2)+'\n');
