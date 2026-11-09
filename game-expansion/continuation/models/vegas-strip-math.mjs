// Exact expectation of OUR uniform-stop Vegas review model, without payout caps.
// Public strips/paytable describe visible game data; uniform stops and the2:1
// choice of2x/3x wild factors are independent assumptions, not provider maths.
import {vegasPaylinePaths, vegasLinePaytable, vegasVisibleReels} from './remaining-reference-data.mjs';
import {vegasNativeStopWeights,VEGAS_NATIVE_STOP_VERSION} from './vegas-native-stops.mjs';

const gcd = (a,b) => { while (b) [a,b]=[b,a%b]; return a < 0n ? -a : a; };
const fraction = (n,d=1n) => {
  n=BigInt(n);d=BigInt(d);if(d===0n)throw new Error('DIVISION_BY_ZERO');
  if(d<0n){n=-n;d=-d;}const divisor=gcd(n,d);return {n:n/divisor,d:d/divisor};
};
const add=(a,b)=>fraction(a.n*b.d+b.n*a.d,a.d*b.d);
const sub=(a,b)=>fraction(a.n*b.d-b.n*a.d,a.d*b.d);
const mul=(a,b)=>fraction(a.n*b.n,a.d*b.d);
const div=(a,b)=>fraction(a.n*b.d,a.d*b.n);
const one=fraction(1),zero=fraction(0);
const sum=values=>values.reduce(add,zero);
const product=values=>values.reduce(mul,one);
const value=a=>({numerator:String(a.n),denominator:String(a.d),decimal:Number(a.n)/Number(a.d)});
const substitutes=id=>[2,12,13].includes(id);

function setExpectation(set,free,stopWeights){
  const reels=vegasVisibleReels[`reel_set${set}`];
  const weights=stopWeights?.[`reel_set${set}`]||reels.map(reel=>reel.map(()=>1));
  if(weights.length!==reels.length||weights.some((column,c)=>column.length!==reels[c].length||column.some(weight=>!Number.isSafeInteger(weight)||weight<=0)))throw new Error('INVALID_VEGAS_STOP_WEIGHTS');
  const totals=weights.map(column=>column.reduce((sum,weight)=>sum+weight,0));
  if(totals.some(total=>!Number.isSafeInteger(total)))throw new Error('INVALID_VEGAS_WEIGHT_PRECISION');
  // There is no left-edge Wild or Scatter on these four public reel sets.
  // Therefore a line has one candidate ordinary symbol, with no overlapping
  // "best of several all-wild wins" ambiguity in the linear expectation.
  if(reels[0].some(id=>id<3||id>11))throw new Error('VEGAS_LEFT_REEL_ASSUMPTION_CHANGED');
  const lineValues=vegasPaylinePaths.map(path=>sum(Object.entries(vegasLinePaytable).filter(([symbol])=>Number(symbol)>=3&&Number(symbol)<=11).map(([symbol,pays])=>{
    const matching=[],weighted=[];
    for(let column=0;column<5;column++){
      let plainCount=0,weightedThirds=0;
      for(let stop=0;stop<reels[column].length;stop++){
        const visible=reels[column][(stop+path[column])%reels[column].length];
        if(visible===Number(symbol)||substitutes(visible)){
          plainCount+=weights[column][stop];weightedThirds+=weights[column][stop]*(free&&(visible===2||visible===13)?7:3);
        }
      }
      matching.push(fraction(plainCount,totals[column]));
      weighted.push(fraction(weightedThirds,totals[column]*3));
    }
    return sum([3,4,5].map(count=>mul(fraction(pays[count]||0),mul(product(weighted.slice(0,count)),count===5?one:sub(one,matching[count])))));
  })));
  // A public paytable entry is in LINE-bet units. The paid stake buys25 lines.
  const lines=div(sum(lineValues),fraction(25));
  const scatter=product([1,2,3].map(column=>fraction(reels[column].reduce((count,_,stop)=>count+weights[column][stop]*Number([0,1,2].some(row=>reels[column][(stop+row)%reels[column].length]===1)),0),totals[column])));
  const gold=fraction(reels[4].reduce((sum,_,stop)=>sum+(reels[4][(stop+1)%reels[4].length]===13?weights[4][stop]:0),0),totals[4]);
  if(set===1||set===3){
    if(scatter.n!==0n||gold.n!==0n)throw new Error('VEGAS_EXTRA_RESPIN_ASSUMPTION_CHANGED');
  }
  return {lines,scatter,gold};
}

export function vegasStopExpectation({stopWeights,model='independent-uniform-visible-strips'}={}){
  const sets=[setExpectation(0,false,stopWeights),setExpectation(1,false,stopWeights),setExpectation(2,true,stopWeights),setExpectation(3,true,stopWeights)];
  const scatterPrize=fraction(2),freeAward=fraction(5),extraAward=fraction(3);
  const extra=sets[1].lines,freeExtra=sets[3].lines;
  const freeOffspring=mul(sets[2].scatter,freeAward);
  if(freeOffspring.n>=freeOffspring.d)throw new Error('VEGAS_FREE_SPIN_EXPECTATION_DIVERGES');
  const free=div(sum([sets[2].lines,mul(sets[2].scatter,scatterPrize),product([sets[2].gold,extraAward,freeExtra])]),sub(one,freeOffspring));
  const total=sum([sets[0].lines,mul(sets[0].scatter,scatterPrize),product([sets[0].scatter,freeAward,free]),product([sets[0].gold,extraAward,extra])]);
  return {
    model,providerReturnClaim:false,payoutCapIncluded:false,
    assumptions:{stopDistribution:stopWeights?'fixed integer weights, independent by reel':'uniform, independent by reel',wildMultiplierWeights:{2:2,3:1},freeSpinAward:5,extraWildRespins:3},
    sets:sets.map((set,index)=>({set:index,lineReturn:value(set.lines),scatterProbability:value(set.scatter),goldProbability:value(set.gold)})),
    freeSpinReturn:value(free),freeSpinOffspring:value(freeOffspring),paidRoundReturn:value(total),
  };
}

export const vegasUniformStopExpectation=()=>vegasStopExpectation();
export const vegasNativeStopExpectation=()=>vegasStopExpectation({stopWeights:vegasNativeStopWeights,model:VEGAS_NATIVE_STOP_VERSION});
