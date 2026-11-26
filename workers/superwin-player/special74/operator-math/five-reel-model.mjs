// Server-only independent operator math. Public help supplies line paths/paytables;
// independent uniform cells and the multiplier distributions are operator choices.
export const deepFreeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;};
const integer=(value,min,max,name)=>{if(!Number.isSafeInteger(value)||value<min||value>max)throw new RangeError('Invalid '+name);return value;};
export const cryptoUint32=()=>globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
export function uniformBelow(bound,nextUint32=cryptoUint32){
 integer(bound,1,0x100000000,'random bound');const limit=Math.floor(0x100000000/bound)*bound;
 for(let attempt=0;attempt<128;attempt++){const word=integer(nextUint32(),0,0xffffffff,'random word');if(word<limit)return word%bound;}
 throw Error('Random source failed rejection sampling');
}
export function createFiveReelModel(spec){
 const model=deepFreeze({...spec,author:'Superwin operator',claimsProviderMath:false,currency:'ETB',minorUnitsPerMajor:100,columns:5,
  symbols:['seven','bell','grape','watermelon','cherry','orange','plum','lemon'],symbolDistribution:'independent-uniform-per-cell',
  multipliers:[1,2,3,4,5],theoreticalRtp:{numerator:24,denominator:25},
  gamble:{colors:['red','black'],probability:{numerator:1,denominator:2},payoutTimesAmount:2,maxAttempts:5,maxAmountMinor:50000},
  disclosure:`Independent Superwin probabilities: base RTP 96%, maximum base win ${spec.maxBaseWinTimesStake}x total stake. Uniform independent cells; longest left-to-right match pays once per line. Optional color gamble wins 2x with probability 1/2. RTP is a long-run expectation, not a promised session return. Not SmartSoft probability math.`});
 if(model.paylines.length!==model.betMinor.step||new Set(model.paylines.map(line=>JSON.stringify(line))).size!==model.paylines.length)throw Error('Invalid line allocation');
 for(const line of model.paylines){if(line.length!==5)throw Error('Invalid line length');for(let c=0;c<5;c++)integer(line[c],0,model.rows-1,'line row');}
 for(const symbol of model.symbols)for(const count of [3,4,5])integer(model.paytable[symbol]?.[count],0,100000,'line pay');
 if(Math.max(...model.symbols.flatMap(symbol=>Object.values(model.paytable[symbol])))*5!==model.maxBaseWinTimesStake)throw Error('Invalid maximum liability');
 const total=model.multiplierWeights.reduce((sum,weight)=>sum+integer(weight,1,0xffffffff,'multiplier weight'),0);
 integer(total,1,0x100000000,'multiplier total');
 function validateBetMinor(value){integer(value,model.betMinor.min,model.betMinor.max,'stake in minor units');if(value%model.betMinor.step)throw RangeError('Stake must divide exactly across all lines');return value;}
 function multiplierForTicket(ticket){integer(ticket,0,total-1,'multiplier ticket');let boundary=0;for(let index=0;index<5;index++){boundary+=model.multiplierWeights[index];if(ticket<boundary)return index+1;}throw Error('Invalid multiplier distribution');}
 function evaluate({betMinor,grid,multiplier}){
  validateBetMinor(betMinor);integer(multiplier,1,5,'multiplier');
  if(!Array.isArray(grid)||grid.length!==model.rows)throw TypeError('Expected a row-major symbol grid');
  for(let row=0;row<model.rows;row++){if(!Array.isArray(grid[row])||grid[row].length!==5)throw TypeError('Expected five cells per row');for(let col=0;col<5;col++)if(!model.symbols.includes(grid[row][col]))throw TypeError('Unknown or missing symbol');}
  const lineBet=BigInt(betMinor)/BigInt(model.paylines.length),wins=[];
  for(const [index,path]of model.paylines.entries()){
   const symbol=grid[path[0]][0];let matched=1;while(matched<5&&grid[path[matched]][matched]===symbol)matched++;
   if(matched<3)continue;
   const amount=lineBet*BigInt(model.paytable[symbol][matched])*BigInt(multiplier);
   if(amount>0n)wins.push({line:index+1,symbol,matched,cells:path.slice(0,matched).map((row,col)=>({row,col})),amountMinor:String(amount)});
  }
  return {modelId:model.id,modelVersion:model.version,betMinor:String(betMinor),grid:grid.map(row=>[...row]),multiplier,
   payoutMinor:String(wins.reduce((sum,win)=>sum+BigInt(win.amountMinor),0n)),maxBaseLiabilityMinor:String(BigInt(betMinor)*BigInt(model.maxBaseWinTimesStake)),wins};
 }
 function spin(betMinor,nextUint32=cryptoUint32){validateBetMinor(betMinor);const grid=Array.from({length:model.rows},()=>Array.from({length:5},()=>model.symbols[uniformBelow(model.symbols.length,nextUint32)]));return evaluate({betMinor,grid,multiplier:multiplierForTicket(uniformBelow(total,nextUint32))});}
 function gamble({amountMinor,attempt,choice},nextUint32=cryptoUint32){
  integer(amountMinor,1,model.gamble.maxAmountMinor,'gamble amount');integer(attempt,0,model.gamble.maxAttempts-1,'gamble attempt');if(!model.gamble.colors.includes(choice))throw TypeError('Choose red or black');
  const color=model.gamble.colors[uniformBelow(2,nextUint32)];return {modelId:model.id,modelVersion:model.version,attempt:attempt+1,choice,color,amountMinor:String(amountMinor),payoutMinor:color===choice?String(amountMinor*2):'0'};
 }
 return Object.freeze({model,validateBetMinor,multiplierForTicket,evaluate,spin,gamble});
}
