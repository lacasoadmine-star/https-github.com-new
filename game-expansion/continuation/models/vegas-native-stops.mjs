import {vegasVisibleReels} from './remaining-reference-data.mjs';

export const VEGAS_NATIVE_STOP_VERSION = 'zplay-vegas-weighted-stops-v3';

// Independent ZPLAY stop weighting, not a recovery of Pragmatic's server RNG.
// A window receives the product of its three symbol-class weights. Every
// public stop remains possible; public symbols/prizes/feature rules stay intact.
export function createVegasStopWeights(wildWeight, featureWeight = 100) {
  if(!Number.isInteger(wildWeight)||wildWeight<1||wildWeight>1000||!Number.isInteger(featureWeight)||featureWeight<1||featureWeight>1000)throw new Error('INVALID_VEGAS_STOP_WEIGHT');
  const symbolWeight=symbol=>symbol===1||symbol===13?featureWeight:symbol===2||symbol===12?wildWeight:1000;
  return Object.fromEntries(Object.entries(vegasVisibleReels).map(([name,reels])=>[name,reels.map(reel=>reel.map((_,stop)=>[0,1,2].reduce((weight,row)=>weight*symbolWeight(reel[(stop+row)%reel.length]),1)))]));
}

// Frozen with the exact expectation audit in vegas-strip-math.mjs. Do not tune
// live or in response to a player, balance, prior outcome, or requested payout.
export const VEGAS_NATIVE_WILD_WEIGHT = 689;
export const VEGAS_NATIVE_FEATURE_WEIGHT = 100;
export const vegasNativeStopWeights = createVegasStopWeights(VEGAS_NATIVE_WILD_WEIGHT,VEGAS_NATIVE_FEATURE_WEIGHT);
for(const reels of Object.values(vegasNativeStopWeights)){for(const weights of reels)Object.freeze(weights);Object.freeze(reels);}
Object.freeze(vegasNativeStopWeights);

export function nativeVegasStop(set,column,unitRandom){
  if(!Number.isFinite(unitRandom)||unitRandom<0||unitRandom>=1)throw new Error('INVALID_ENGINE_RANDOM');
  const weights=vegasNativeStopWeights[`reel_set${set}`]?.[column];
  if(!weights)throw new Error('INVALID_VEGAS_REEL');
  let remaining=unitRandom*weights.reduce((sum,weight)=>sum+weight,0);
  for(let stop=0;stop<weights.length;stop++){remaining-=weights[stop];if(remaining<0)return stop;}
  return weights.length-1;
}

function unbiasedBelow(bound,rng){
  const limit=BigInt(bound),space=1n<<64n,accepted=space-space%limit;
  for(let attempt=0;attempt<32;attempt++){
    const high=rng(),low=rng();
    if(!Number.isFinite(high)||high<0||high>=1||!Number.isFinite(low)||low<0||low>=1)throw new Error('INVALID_ENGINE_RANDOM');
    const value=(BigInt(Math.floor(high*4294967296))<<32n)|BigInt(Math.floor(low*4294967296));
    if(value<accepted)return Number(value%limit);
  }
  // A broken constant source at the rejected tail must fail, not hang or bias
  // a wager. For independent uniform32-bit draws, this failure probability is
  // less than (51e9/2^64)^32 for the largest possible public strip.
  throw new Error('INVALID_ENGINE_RANDOM');
}

export function sampleNativeVegasStop(set,column,rng){
  const weights=vegasNativeStopWeights[`reel_set${set}`]?.[column];
  if(!weights)throw new Error('INVALID_VEGAS_REEL');
  let choice=unbiasedBelow(weights.reduce((sum,weight)=>sum+weight,0),rng);
  for(let stop=0;stop<weights.length;stop++){choice-=weights[stop];if(choice<0)return stop;}
  throw new Error('INVALID_VEGAS_WEIGHT_TOTAL');
}

export function sampleNativeVegasWildFactor(rng){
  return unbiasedBelow(3,rng)<2?2:3;
}
