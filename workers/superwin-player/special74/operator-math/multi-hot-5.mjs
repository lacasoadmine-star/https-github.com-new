// Server-only operator model. Independently authored; NOT SmartSoft's private math.
// The retained account service must debit/settle atomically and persist the result
// under its request ID. This module neither accesses nor creates player balances.
const freeze = value => {
 if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
 return value;
};
export const model = freeze({
 id: 'special74_multi_hot_5_v1', version: 'operator-mh5-v1', author: 'Superwin operator',
 claimsProviderMath: false, currency: 'ETB', minorUnitsPerMajor: 100,
 rows: 3, columns: 3,
 symbols: ['orange','golden_bell','plum','lemon','watermelon','cherry','grapes','dollar','777'],
 linePays: [10,25,10,10,20,10,20,50,75],
 paylines: [[1,1,1],[0,0,0],[2,2,2],[0,1,2],[2,1,0]],
 symbolDistribution: 'independent-uniform-per-cell',
 multipliers: [1,2,3,4,5], multiplierWeights: [1027,1150,1273,1150,1150],
 betMinor: {min:5,max:40000,step:5},
 theoreticalRtp: {numerator:24,denominator:25}, maxBaseWinTimesStake:375,
 gamble: {colors:['red','black'],probability:{numerator:1,denominator:2},
  payoutTimesAmount:2,maxAttempts:5,maxAmountMinor:50000},
 disclosure: 'Independent Superwin rules: theoretical base RTP 96%, maximum base win 375x total stake. Optional color gamble wins 2x with probability 1/2. RTP is a long-run expectation, not a promised session return.'
});

function integer(value,min,max,name) {
 if (!Number.isSafeInteger(value)||value<min||value>max) throw new RangeError('Invalid '+name);
 return value;
}
export function validateBetMinor(value) {
 integer(value,model.betMinor.min,model.betMinor.max,'stake in minor units');
 if (value%model.betMinor.step) throw new RangeError('Stake must be a multiple of five minor units');
 return value;
}
export function cryptoUint32() {
 return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
}
// Reject the incomplete high tail before reducing; modulo alone biases draws.
export function uniformBelow(bound, nextUint32=cryptoUint32) {
 integer(bound,1,0x100000000,'random bound');
 const limit=Math.floor(0x100000000/bound)*bound;
 for(let attempt=0;attempt<128;attempt++) {
  const value=integer(nextUint32(),0,0xffffffff,'random word');
  if(value<limit)return value%bound;
 }
 throw new Error('Random source failed rejection sampling');
}
export function multiplierForTicket(ticket) {
 const total=model.multiplierWeights.reduce((a,b)=>a+b,0);
 integer(ticket,0,total-1,'multiplier ticket');
 let boundary=0;
 for(let i=0;i<model.multipliers.length;i++){
  boundary+=model.multiplierWeights[i];
  if(ticket<boundary)return model.multipliers[i];
 }
 throw new Error('Invalid multiplier distribution');
}
export function evaluate({betMinor,grid,multiplier}) {
 validateBetMinor(betMinor);integer(multiplier,1,5,'multiplier');
 if(!Array.isArray(grid)||grid.length!==3||Array.from({length:3},(_,r)=>grid[r]).some(row=>!Array.isArray(row)||row.length!==3||Array.from({length:3},(_,c)=>row[c]).some(symbol=>!model.symbols.includes(symbol))))throw new TypeError('Expected a 3x3 row-major symbol grid');
 const lineBet=BigInt(betMinor)/5n, wins=[];
 for(const [index,path]of model.paylines.entries()){
  const symbol=grid[path[0]][0];
  if(path.every((row,col)=>grid[row][col]===symbol)){
   const amount=lineBet*BigInt(model.linePays[model.symbols.indexOf(symbol)])*BigInt(multiplier);
   wins.push({line:index+1,cells:path.map((row,col)=>({row,col})),symbol,amountMinor:amount.toString()});
  }
 }
 const payout=wins.reduce((sum,win)=>sum+BigInt(win.amountMinor),0n);
 return {modelId:model.id,modelVersion:model.version,betMinor:String(betMinor),grid:grid.map(row=>[...row]),multiplier,
  payoutMinor:payout.toString(),maxBaseLiabilityMinor:String(betMinor*model.maxBaseWinTimesStake),wins};
}
export function spin(betMinor,nextUint32=cryptoUint32) {
 validateBetMinor(betMinor); // Reject invalid stake before consuming entropy.
 const grid=Array.from({length:3},()=>Array.from({length:3},()=>model.symbols[uniformBelow(9,nextUint32)]));
 const multiplier=multiplierForTicket(uniformBelow(5750,nextUint32));
 return evaluate({betMinor,grid,multiplier});
}
export function gamble({amountMinor,attempt,choice},nextUint32=cryptoUint32) {
 integer(amountMinor,1,model.gamble.maxAmountMinor,'gamble amount');
 integer(attempt,0,model.gamble.maxAttempts-1,'gamble attempt');
 if(!model.gamble.colors.includes(choice))throw new TypeError('Choose red or black');
 const color=model.gamble.colors[uniformBelow(2,nextUint32)];
 return {modelId:model.id,modelVersion:model.version,attempt:attempt+1,choice,color,
  amountMinor:String(amountMinor),payoutMinor:color===choice?String(amountMinor*2):'0'};
}
