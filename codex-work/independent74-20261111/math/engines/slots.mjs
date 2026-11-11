import {baseRound,draw,error,publicBase} from './shared.mjs';
export function calculateSlotReturn(config){
 if(config.symbols.length!==8||config.symbols.some(x=>x.weight!==1))error('INVALID_MODEL','This analytic model requires8uniformsymbols.');
 const numerator=config.symbols.reduce((n,s)=>n+56n*BigInt(s.pays[3])+7n*BigInt(s.pays[4])+BigInt(s.pays[5]),0n);
 const wheel=config.multiplierValues||[1];
 return{numerator:(numerator*BigInt(wheel.reduce((a,b)=>a+b,0))).toString(),denominator:(32768n*BigInt(wheel.length)).toString()};
}
export function evaluateSlotGrid(config,betMinor,grid){
 if(!Array.isArray(grid)||grid.length!==(config.rows||3)||grid.some(row=>!Array.isArray(row)||row.length!==5||row.some(id=>!config.symbols.some(s=>s.id===id))))error('INVALID_GRID','Invalid server reel grid.');
 const stakePerLine=BigInt(betMinor)/BigInt(config.paylines.length);let total=0n;const lineWins=[];
 for(let lineIndex=0;lineIndex<config.paylines.length;lineIndex++){
  const line=config.paylines[lineIndex];const id=grid[line[0]][0];let matches=1;
  while(matches<5&&grid[line[matches]][matches]===id)matches++;
  if(matches>=3){const symbol=config.symbols.find(x=>x.id===id);const prize=symbol.pays[matches];const win=config.proratedStake===true?BigInt(betMinor)*BigInt(prize)/BigInt(config.paylines.length):stakePerLine*BigInt(prize);total+=win;lineWins.push({lineIndex,payline:[...line],symbolId:id,matches,multiplier:prize,winMinor:win.toString(),positions:line.slice(0,matches).map((row,col)=>({row,col}))});}
 }
 return{winMinor:total.toString(),lineWins};
}
export function startSlot(config,{betMinor,rng}){
 const round=baseRound(config,betMinor);
 const preSpinMultiplier=config.multiplierSelectionTiming==='before-symbol-grid'&&config.multiplierValues?config.multiplierValues[draw(rng,config.multiplierValues.length)]:undefined;
 const grid=Array.from({length:config.rows||3},()=>Array.from({length:5},()=>config.symbols[draw(rng,8)].id));
 const result=evaluateSlotGrid(config,round.betMinor,grid);
 const wheel=config.multiplierValues;
 const reelMultiplier=preSpinMultiplier??(wheel?wheel[draw(rng,wheel.length)]:1);
 result.winMinor=(BigInt(result.winMinor)*BigInt(reelMultiplier)).toString();
 if(wheel)for(const line of result.lineWins)line.winMinor=(BigInt(line.winMinor)*BigInt(reelMultiplier)).toString();
 if(BigInt(result.winMinor)>BigInt(config.limits.maxWinMinor))error('PAYOUT_LIMIT_EXCEEDED','Configured slot prize exceeds its cap.');
 return{...round,status:result.winMinor==='0'?'lost':'collected',step:1,winMinor:result.winMinor,multiplierBps:Number(BigInt(result.winMinor)*10000n/BigInt(round.betMinor)),outcome:{kind:'slots',grid,lineWins:result.lineWins,...(wheel?{reelMultiplier}:{})},history:[]};
}
export function publicSlot(round){return{...publicBase(round),outcome:structuredClone(round.outcome),collectibleMinor:'0',allowedActions:[]};}
