// Read-only verification of the existing server result. This module never draws outcomes.
const assert=(condition,code)=>{if(!condition)throw Error(code);};
export function units(value,decimals=4){assert(typeof value==='string'&&/^(0|[1-9]\d{0,12})(?:\.\d{1,4})?$/.test(value),'INVALID_MONEY');const [whole,fraction='']=value.split('.');assert(fraction.length<=decimals,'MONEY_PRECISION');return BigInt(whole)*10n**BigInt(decimals)+BigInt(fraction.padEnd(decimals,'0'));}
export function decimal(value,places=2){value=BigInt(value);assert(value>=0n,'NEGATIVE_MONEY');const scale=10n**BigInt(places);return `${value/scale}.${String(value%scale).padStart(places,'0')}`;}
export function money(value){return decimal(units(value)/100n);}
export function validateModel(remote,local){
 for(const k of ['id','reels','rows','paylines','mathVersion','engineVersion','currency','maxWinMultiplier'])assert(remote[k]===local[k],'MODEL_MISMATCH_'+k);
 for(const k of ['paytable','linePaths','wheel','betLevels','rules','features'])assert(JSON.stringify(remote[k])===JSON.stringify(local[k]),'MODEL_MISMATCH_'+k);
 assert(typeof remote.enabled==='boolean','INVALID_AVAILABILITY');return remote;
}
export function gridFromStops(g,stops){assert(Array.isArray(stops)&&stops.length===g.reels,'INVALID_STOPS');stops.forEach((s,c)=>assert(Number.isInteger(s)&&s>=0&&s<g.strips[c].length,'INVALID_STOP'));return Array.from({length:g.rows},(_,r)=>g.strips.map((s,c)=>s[(stops[c]+r-Math.floor(g.rows/2)+s.length)%s.length]));}
export function evaluate(g,grid,bet,wheel,isFree=false){
 assert(Array.isArray(grid)&&grid.length===g.rows&&grid.every(row=>Array.isArray(row)&&row.length===g.reels&&row.every(s=>g.symbols.includes(s))),'INVALID_GRID');
 assert(g.wheel.values.includes(wheel),'INVALID_MULTIPLIER');const stake=units(bet),per=stake/BigInt(g.paylines);assert(stake>0n&&stake%BigInt(g.paylines)===0n,'INVALID_BET_SPLIT');
 const wins=[];
 for(let i=0;i<g.linePaths.length;i++){
  const rows=g.linePaths[i],sequence=rows.map((r,c)=>grid[r][c]);let best=null;
  for(const [symbol,pay] of Object.entries(g.paytable)){
   let count=0;while(count<sequence.length&&(sequence[count]===symbol||g.rules.wildSymbols.includes(sequence[count])))count++;
   if(count<3||!pay[count])continue;
   const base=per*BigInt(pay[count]),value=base*BigInt(wheel)*(isFree?BigInt(g.features.freeSpins.winMultiplier):1n);
   const win={line:i+1,rows,symbol,count,positions:rows.slice(0,count).map((r,c)=>[r,c]),wilds:sequence.slice(0,count).filter(s=>g.rules.wildSymbols.includes(s)).length,baseWin:decimal(base,4),win:decimal(value,4)};
   if(!best||value>units(best.win)||(value===units(best.win)&&count>best.count))best=win;
  }
  if(best)wins.push(best);
 }
 const scatterCount=grid.flat().filter(s=>s==='scatter').length;
 const scatter=stake*BigInt(scatterCount>=3?({3:2,4:10,5:50})[Math.min(5,scatterCount)]:0)*BigInt(wheel);
 const line= wins.reduce((n,w)=>n+units(w.win),0n),total=line+scatter,cap=stake*BigInt(g.maxWinMultiplier);
 return {wins,line,scatter,total,final:total>cap?cap:total,scatterCount,bonus:scatterCount>=g.features.freeSpins.trigger&&(!isFree||g.features.freeSpins.retrigger)?g.features.freeSpins.spins:0};
}
export function validateRound(result,g,bet){
 assert(result&&result.gameId===g.id&&result.currency==='ETB'&&result.bet===bet,'ROUND_IDENTITY_MISMATCH');
 assert(typeof result.roundId==='string'&&/^[a-f0-9-]{36}$/.test(result.roundId),'INVALID_ROUND_ID');
 assert(result.mathVersion===g.mathVersion&&result.engineVersion===g.engineVersion,'ROUND_VERSION_MISMATCH');
 assert(result.mathSha256==='9bc6cfaad2fa6558882bc88a3eb78514f1432ab1c11a52217a427d1f383ba8e7','INVALID_MATH_HASH');
 assert(typeof result.isFree==='boolean','INVALID_FREE_SPIN');
 const grid=gridFromStops(g,result.stops);assert(JSON.stringify(grid)===JSON.stringify(result.grid)&&JSON.stringify(grid)===JSON.stringify(result.initialGrid),'RESULT_STRIP_MISMATCH');
 const e=evaluate(g,grid,bet,result.wheelMultiplier,result.isFree);
 assert(Array.isArray(result.stages)&&result.stages.length===1,'INVALID_STAGE_COUNT');
 const s=result.stages[0];assert(JSON.stringify(s.grid)===JSON.stringify(grid),'STAGE_GRID_MISMATCH');
 assert(units(s.win)===e.total&&units(s.lineWin)===e.line&&units(s.scatterWin)===e.scatter&&units(s.jackpotWin)===0n,'PAYOUT_MISMATCH');
 for(const list of [s.winLines,result.winLines]){
  assert(Array.isArray(list)&&list.length===e.wins.length,'WIN_LINE_MISMATCH');
  e.wins.forEach((w,i)=>{for(const key of ['line','symbol','count','wilds','rows','positions'])assert(JSON.stringify(w[key])===JSON.stringify(list[i][key]),'WIN_LINE_MISMATCH');assert(units(list[i].win)===units(w.win)&&units(list[i].baseWin)===units(w.baseWin),'LINE_PAYOUT_MISMATCH');});
 }
 const receipt=result.walletReceipt;assert(receipt&&receipt.currency==='ETB','MISSING_WALLET_RECEIPT');
 const before=units(receipt.balanceBefore,2),charge=units(receipt.chargedStake,2),win=units(receipt.finalWin,2),after=units(receipt.balanceAfter,2);
 assert(charge===(result.isFree?0n:units(bet)/100n)&&win===e.final/100n&&before-charge+win===after,'WALLET_RECEIPT_MISMATCH');
 for(const k of ['balanceBefore','chargedStake','finalWin','balanceAfter'])assert(result[k]===receipt[k],'WALLET_RESULT_MISMATCH');
 assert(result.bonusSpinsAwarded===e.bonus&&Number.isInteger(result.freeSpinsRemaining)&&result.freeSpinsRemaining>=0&&result.freeSpinsRemaining<=500,'FREE_SPIN_MISMATCH');
 assert(result.maxWinCapped===(e.total>e.final),'CAP_MISMATCH');return result;
}
export class SpinState {
 constructor(){this.value='loading';}
 move(next){const allowed={loading:['ready','signedout','unavailable','error','pending'],ready:['requesting','loading','signedout','error'],requesting:['animating','pending','ready','signedout'],animating:['presenting','ready','pending','signedout'],presenting:['ready','requesting','signedout'],pending:['requesting','loading','signedout'],signedout:['loading'],unavailable:['loading'],error:['loading']};assert(allowed[this.value]?.includes(next),'INVALID_STATE_'+this.value+'_'+next);this.value=next;return next;}
 get locked(){return !['ready','presenting'].includes(this.value);}
}
