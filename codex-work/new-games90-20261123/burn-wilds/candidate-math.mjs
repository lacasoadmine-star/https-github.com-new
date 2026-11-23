import {BURN_WILDS_GAME_ID} from './expansion.mjs';
import {quoteBurnWildsFinalGrid} from './outcome-audit.mjs';
import {quoteBurnWildsLine} from './rules.mjs';

// Original ZPLAY probability DRAFT, not reverse-engineered provider weights.
// None of these probabilities were inferred from seven official sample rounds.
// This sampler is not approved for cash settlement or a production release.
export const BURN_CANDIDATE_MATH_VERSION='zplay-burn-wilds-own-candidate-v1';
export const BURN_CANDIDATE_OUTER_WEIGHTS=Object.freeze([
  ['orange',150],['lemon',150],['plum',150],['cherry',150],
  ['grapes',140],['watermelon',120],['bell',95],['seven',45]
].map(Object.freeze));
export const BURN_CANDIDATE_INNER_WEIGHTS=Object.freeze([
  ['orange',147],['lemon',147],['plum',147],['cherry',147],
  ['grapes',125],['watermelon',105],['bell',85],['seven',40],['wild',57]
].map(Object.freeze));
export const BURN_CANDIDATE_WHEEL=Object.freeze([1,3,5,2,4]);

const fail=code=>{throw new TypeError('BURN_CANDIDATE_'+code);};
function validateWeights(weights){
  const sum=weights.reduce((total,[,n])=>total+n,0);
  if(sum<=0||sum>65536||!weights.every(([symbol,weight])=>
    (typeof symbol==='string'||Number.isSafeInteger(symbol))&&Number.isSafeInteger(weight)&&weight>0))fail('WEIGHTS');
  return sum;
}
validateWeights(BURN_CANDIDATE_OUTER_WEIGHTS);
validateWeights(BURN_CANDIDATE_INNER_WEIGHTS);
const wheelWeights=Object.freeze(BURN_CANDIDATE_WHEEL.map(value=>Object.freeze([value,1])));
const clone=value=>structuredClone(value);

export function createBurnWildsCandidateSampler({getEntropy=buffer=>globalThis.crypto.getRandomValues(buffer)}={}){
  if(typeof getEntropy!=='function')fail('ENTROPY_REQUIRED');

  // Cryptographic rejection sampling. No modulo bias, Math.random,
  // pre-recorded screenshot outcomes or client-generated result authority.
  function draw(weights){
    const size=validateWeights(weights);
    const limit=65536-(65536%size);
    for(let attempt=0;attempt<1024;attempt++){
      const bytes=new Uint8Array(2);
      const response=getEntropy(bytes);
      if(response!==undefined&&response!==bytes&&
        !(response instanceof Uint8Array))fail('ENTROPY_TYPE');
      const selected=response instanceof Uint8Array?response:bytes;
      if(selected.length!==2)fail('ENTROPY_LENGTH');
      const raw=(selected[0]<<8)|selected[1];
      if(raw>=limit)continue;
      let x=raw%size;
      for(const [value,weight] of weights){
        if(x<weight)return value;
        x-=weight;
      }
      fail('PICK_RANGE');
    }
    fail('ENTROPY_EXHAUSTED');
  }
  function sampleOutcome({gameId,roundId,betMinor}={}){
    if(gameId!==BURN_WILDS_GAME_ID||typeof roundId!=='string'||
      !roundId||roundId.length>200||!Number.isSafeInteger(betMinor)||
      betMinor<10||betMinor%10!==0)fail('INPUT');
    const originalGrid=Array.from({length:5},(_,column)=>
      Array.from({length:3},()=>draw(
        column===0||column===4?BURN_CANDIDATE_OUTER_WEIGHTS:BURN_CANDIDATE_INNER_WEIGHTS
      )));
    const multiplier=draw(wheelWeights);
    const initial=quoteBurnWildsFinalGrid({finalGrid:originalGrid,betMinor,multiplier});
    const expandedColumns=[1,2,3].filter(column=>
      initial.winLines.some(line=>originalGrid[column][line.rows[column]]==='wild'));
    const finalGrid=clone(originalGrid);
    for(const column of expandedColumns)finalGrid[column]=['wild','wild','wild'];
    const finalQuote=quoteBurnWildsFinalGrid({finalGrid,betMinor,multiplier});
    const winLines=finalQuote.winLines.map(({id,rows,winMinor})=>({id,rows:[...rows],winMinor}));
    return {
      originalGrid,finalGrid,expandedColumns,winLines,
      multiplier,winMinor:finalQuote.totalWinMinor
    };
  }
  function maximumPayoutMinor(stakeMinor){
    if(typeof stakeMinor!=='bigint'||stakeMinor<10n||
      stakeMinor%10n!==0n||stakeMinor>BigInt(Number.MAX_SAFE_INTEGER))fail('STAKE');
    return BigInt(quoteBurnWildsLine('seven',5,Number(stakeMinor),5))*5n;
  }
  return Object.freeze({
    gameId:BURN_WILDS_GAME_ID,
    mathVersion:BURN_CANDIDATE_MATH_VERSION,
    approved:false,
    verification:Object.freeze({
      legalOutcomesVerified:false,outcomeDistributionVerified:false,
      aggregatePayoutVerified:false,roundingVerified:false,
      immediateLifecycleVerified:false,etbPolicyVerified:false,
      assetRightsVerified:false
    }),
    sampleOutcome,maximumPayoutMinor,
    // Explicitly no probability-to-RTP claim or operator sign-off.
    verifiedRtp:null,licensedArtwork:false,cashReleaseReady:false
  });
}

