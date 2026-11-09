import sourceModels from './smartsoft-slots.data.json' with {type:'json'};

// Explicit independent native distributions. These weights are fixed before a
// round and never depend on stake, player, account, balance, history or input.
// Public source coefficients are not scaled and unsupported high outcomes are
// excluded by the reel support, rather than displayed and clipped afterward.
const clone=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const gcd=(a,b)=>b?gcd(b,a%b):a;
const fraction=(n,d)=>{const divisor=gcd(n,d);return {numerator:String(n/divisor),denominator:String(d/divisor),value:Number(n)/Number(d)};};
const rotate=([a,b,c])=>[[a,b,c],[b,c,a],[c,a,b]];
const repeat=(value,count)=>Array.from({length:count},()=>clone(value));
const tickets=weights=>weights.flatMap((weight,index)=>Array(weight).fill(index+1));

function wildWindows({ways=false}={}){
 const windows=[];
 for(let symbol=1;symbol<=9;symbol++)windows.push({symbols:[symbol,symbol%9+1,(symbol+1)%9+1],weight:26});
 for(let symbol=1;symbol<=9;symbol++)windows.push({symbols:[symbol,symbol,symbol],weight:symbol===1?(ways?7:8):1});
 for(const triple of [[0,1,2],[0,3,4]])for(const symbols of rotate(triple))windows.push({symbols,weight:1});
 // Two Wilds and Bell on each reel give eight all-Wild ways and nineteen
 // Bell ways: (8×5+19×1)×5 =295 times total stake, the public maximum.
 if(ways)windows.push({symbols:[0,0,7],weight:1});
 return windows;
}
function classicWindows(){
 const triples=[[0,1,2],[1,2,3],[2,3,4],[3,4,5],[4,5,6],[5,6,0],[6,0,1],[8,7,4],[8,0,2],[7,1,3]],windows=[];
 for(let index=0;index<triples.length;index++)for(const symbols of rotate(triples[index]))windows.push({symbols,weight:index===7?13:7});
 for(let symbol=0;symbol<=6;symbol++)windows.push({symbols:[symbol,symbol,symbol],weight:4});
 // The support permits full low/animal reels, including Safari expansion.
 // The greatest high-symbol window is75+50+20, yielding145x at a5x wheel.
 return windows;
}
export function burningWindows(model,bias=0,{aligned=false,extraBias=0}={}){
 if(!Number.isInteger(bias)||bias<0||bias>32)throw Error('INVALID_BURNING_WINDOW_BIAS');
 if(!Number.isInteger(extraBias)||extraBias<0||extraBias>5)throw Error('INVALID_BURNING_EXTRA_BIAS');
 const seven=model.id==='burningice40_native'?9:10;
 const build=values=>Array.from({length:model.rows},(_,row)=>values[row%values.length]);
 return Array.from({length:5},(_,column)=>{
  const windows=[];
  for(let symbol=1;symbol<=7;symbol++)windows.push({symbols:build([symbol,symbol%7+1,(symbol+1)%7+1,(symbol+2)%7+1]),weight:0});
  windows.push({symbols:build([seven,1,3,5]),weight:2});
  windows.push({symbols:build([8,2,4,6]),weight:2});
  if(model.expandingReels.includes(column)){
   windows.push({symbols:build([0,3,5,7]),weight:1});
   windows.push({symbols:build([0,8,2,4]),weight:1});
  }
  if(model.scatters.some(scatter=>scatter.symbol===9&&scatter.reels.includes(column))){
   windows.push({symbols:build([9,4,6,1]),weight:1});
   if(model.expandingReels.includes(column))windows.push({symbols:build([0,9,3,5]),weight:1});
  }
  const available=256-windows.reduce((sum,window)=>sum+window.weight,0),favorite=aligned?0:column%7;
  const regular=Math.floor(available/7)-bias;
  for(let index=0;index<7;index++)windows[index].weight=index===favorite?available-regular*6:regular;
  for(let index=0,left=extraBias;index<7&&left;index++)if(index!==favorite){windows[index].weight--;windows[favorite].weight++;left--;}
  return windows;
 });
}
function highest(sequence,model){
 let best=0;
 for(let symbol=0;symbol<model.coefficients.length;symbol++){
  if(model.scatters.some(scatter=>scatter.symbol===symbol))continue;
  let count=0;for(const actual of sequence){if(actual!==symbol&&!(model.wildSymbols.includes(actual)&&!model.wildExclusions.includes(symbol)))break;count++;}
  for(let match=2;match<=count;match++)best=Math.max(best,model.coefficients[symbol][match]??0);
 }
 return best;
}
function exactMarginalReturn(model,profile){
 const count=model.symbols.length;
 let marginals,total;
 if(profile.reelWindows){
  total=256n;marginals=profile.reelWindows.map(windows=>Array.from({length:model.rows},(_,row)=>{
   const weights=Array(count).fill(0n);for(const window of windows)weights[window.symbols[row]]+=BigInt(window.weight);return weights;
  }));
 }else{
  const base=profile.sampling[0].reduce((values,symbol)=>(values[symbol]++,values),Array(count).fill(0));
  const trigger=profile.addWildChanceDenominator,totalBase=base.reduce((sum,value)=>sum+value,0);
  const effective=base.map((weight,symbol)=>BigInt(symbol===0?weight*trigger+totalBase-weight:weight*(trigger-1)));
  total=BigInt(totalBase*trigger);marginals=Array.from({length:model.columns},()=>repeat(effective,model.rows));
 }
 let numerator=0n;const sequence=Array(model.columns);
 for(const path of model.paths){
  for(let code=0;code<count**model.columns;code++){
   let number=code,weight=1n;
   for(let column=0;column<model.columns;column++){sequence[column]=number%count;number=Math.floor(number/count);weight*=marginals[column][path[column]][sequence[column]];}
   numerator+=BigInt(highest(sequence,model))*weight;
  }
 }
 const wheelSum=BigInt(profile.multiplierTickets.reduce((sum,value)=>sum+value,0));
 const denominator=total**BigInt(model.columns)*BigInt(profile.multiplierTickets.length)*10n*BigInt(profile.payoutStakeDivisor??model.lineStakeDivisor);
 return fraction(numerator*wheelSum,denominator);
}

const wildWays=wildWindows({ways:true}),wildFive=wildWindows(),classic=classicWindows();
const initial={
 multihotwildways_native:{reelWindows:repeat(wildWays,3),multiplierTickets:tickets([1,1,5,56,1]),attainedMaximumStakeMultiplier:295},
 multihot5wild_native:{reelWindows:repeat(wildFive,3),multiplierTickets:tickets([1,1,50,11,1]),attainedMaximumStakeMultiplier:375},
 multihot5superwilds_native:{sampling:repeat([0,0,0,0,0,0,0,0,...Array.from({length:8},(_,index)=>Array(31).fill(index+1)).flat()],5),addWildChanceDenominator:256,multiplierTickets:tickets([1,1,2,6,6]),payoutStakeDivisor:10,attainedMaximumStakeMultiplier:1000},
 multihotdeluxe_native:{reelWindows:repeat(classic,3),multiplierTickets:tickets([1,1,4,57,1]),attainedMaximumStakeMultiplier:145},
 safarisimba_native:{reelWindows:repeat(classic,3),multiplierTickets:tickets([1,1,5,56,1]),attainedMaximumStakeMultiplier:145},
 habeshafortune5_native:{reelWindows:repeat(classic,3),multiplierTickets:tickets([1,1,3,58,1]),attainedMaximumStakeMultiplier:145}
};
const frozenProofs={
 burningice_native:{bias:6,extraBias:1,aligned:true,numerator:'4710564116199635057506328463',denominator:'4951760157141521099596496896',maximumStakeMultiplierBound:3080},
 burningice10_native:{bias:4,extraBias:0,aligned:false,numerator:'4683140856253802169874115779',denominator:'4951760157141521099596496896',maximumStakeMultiplierBound:5080},
 burningice40_native:{bias:10,extraBias:0,aligned:true,numerator:'36840430807585190720444581',denominator:'38685626227668133590597632',maximumStakeMultiplierBound:1100}
};
for(const [id,proof]of Object.entries(frozenProofs)){
 const model=sourceModels.find(value=>value.id===id);
 initial[id]={
  reelWindows:burningWindows(model,proof.bias,{aligned:proof.aligned,extraBias:proof.extraBias}),
  ...(model.coinChanceDenominator?{coinTickets:[...Array(256-model.coinReels.length).fill(null),...model.coinReels]}:{}),
  scatterCoefficientBasis:'line-stake',maximumStakeMultiplierBound:proof.maximumStakeMultiplierBound,
  nativeReturn:fraction(BigInt(proof.numerator),BigInt(proof.denominator)),
  frozenProof:{bias:proof.bias,extraBias:proof.extraBias,aligned:proof.aligned,source:'test/smartsoft-freeze-math.cpp',
   method:'Exact integer weighted enumeration of every initial reel-window combination and every reachable frozen-reel state. A fresh prize freezes at least one additional reel, so this is a finite acyclic recurrence. The state retains prior line/scatter maxima; future increments pay only once. Lucky coins are separate initial256-way tickets on5/10;40 has no coin draw.',
   distinction:'The public freeze/respin pattern and cash prizes are confirmed. The incremental-prize recurrence and fixed native probability weights are independently specified; this does not claim the provider-private recurrence or RNG.'}
 };
}
for(const [id,profile]of Object.entries(initial)){
 const model=sourceModels.find(value=>value.id===id);
 if(profile.reelWindows?.some(windows=>windows.reduce((sum,window)=>sum+window.weight,0)!==256))throw Error('INVALID_NATIVE_REEL_WEIGHT_TOTAL');
 profile.nativeReturn??=exactMarginalReturn(model,profile);
 profile.kind='independent-zplay';profile.version=model.version.replace(/-1$/,'-2');
 profile.officialPrivateMathVerified=false;profile.publicPayoutCoefficientsScaled=false;profile.rejectCeilingOverflow=true;
 profile.method=profile.frozenProof?.method??'Exact rational marginal enumeration on each public path, followed by linearity and the independent weighted wheel. The complete finite reel support is exhaustively checked against the public maximum; the supported payouts are never clipped.';
 profile.randomness='Every reel-stop, weighted cell, added-Wild, initial coin and wheel draw uses a power-of-two ticket count (256 or64, or16 for the SuperWild wheel), exactly dividing the canonical53-bit RNG space.';
 if(!(profile.nativeReturn.value>=.94&&profile.nativeReturn.value<=.96))throw Error(`NATIVE_RETURN_OUTSIDE_REVIEW_RANGE:${id}:${profile.nativeReturn.value}`);
}
export const NATIVE_PROFILES=freeze(initial);
export default NATIVE_PROFILES;
