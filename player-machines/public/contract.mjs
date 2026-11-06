// Read-only verification of the existing server result. This module never draws outcomes.
import {gameConfig,gameConfigForReceipt,isLegacyModel,presentationGameId} from './registry.mjs';
const assert=(condition,code)=>{if(!condition)throw Error(code);};
export function units(value,decimals=4){assert(typeof value==='string'&&/^(0|[1-9]\d{0,12})(?:\.\d{1,4})?$/.test(value),'INVALID_MONEY');const [whole,fraction='']=value.split('.');assert(fraction.length<=decimals,'MONEY_PRECISION');return BigInt(whole)*10n**BigInt(decimals)+BigInt(fraction.padEnd(decimals,'0'));}
export function decimal(value,places=2){value=BigInt(value);assert(value>=0n,'NEGATIVE_MONEY');const scale=10n**BigInt(places);return `${value/scale}.${String(value%scale).padStart(places,'0')}`;}
export function money(value){return decimal(units(value)/100n);}
export function presentedBalance(balance,win,pending){const available=units(balance,2),held=units(win)/100n;return pending&&held<=available?decimal(available-held):balance;}
export function gambleStakeAllowed(model,stake){const value=units(stake),cap=model.rules.gamble.maxStake;return value>0n&&(cap===undefined||value<=units(cap));}
export function spinSelectionChanged(before,after){return before.bet!==after.bet||before.freeSpinsRemaining>0&&after.freeSpinsRemaining===0||['mathVersion','engineVersion','mathSha256'].some(key=>before[key]!==after[key]);}
export function normalizeAutoOptions(value,gameId){
 const input=typeof value==='number'?{count:value}:value;assert(input&&((Number.isInteger(input.count)&&input.count>0&&input.count<=1000)||(input.count===Infinity&&presentationGameId(gameId)==='multi_hot_5_video')),'INVALID_AUTO_COUNT');
 const options={count:input.count,stopBigWin:!!input.stopBigWin};
 for(const name of ['stopWin','stopIncrease','stopDecrease']){
  const raw=input[name];if(raw===undefined||raw===null){options[name]=null;continue;}
  assert(typeof raw==='string'&&/^\d{1,13}(?:\.\d{1,2})?$/.test(raw),'INVALID_AUTO_LIMIT');const [whole,fraction='']=raw.split('.'),amount=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));assert(amount>0n,'INVALID_AUTO_LIMIT');options[name]=decimal(amount);
 }
 return options;
}
export function autoStopReason(options,startBalance,balance,result){
 const net=units(balance,2)-units(startBalance,2),win=units(result.finalWin)/100n;
 const threshold=name=>options[name]===null||options[name]===undefined?null:units(options[name],2);
 const one=threshold('stopWin'),increase=threshold('stopIncrease'),decrease=threshold('stopDecrease');
 if(one!==null&&one>0n&&win>=one)return 'win';
 if(increase!==null&&increase>0n&&net>=increase)return 'increase';
 if(decrease!==null&&decrease>0n&&-net>=decrease)return 'decrease';
 if(options.stopBigWin&&units(result.finalWin)>units(result.bet)*25n)return 'bigWin';
 return null;
}
export function validateModel(remote,local){
 for(const k of ['id','reels','rows','paylines','mathVersion','engineVersion','currency','maxWinMultiplier'])assert(remote[k]===local[k],'MODEL_MISMATCH_'+k);
 for(const k of ['paytable','linePaths','wheel','betLevels','rules','features'])assert(JSON.stringify(remote[k])===JSON.stringify(local[k]),'MODEL_MISMATCH_'+k);
 if(remote.mathSha256!==undefined||!isLegacyModel(local))assert(remote.mathSha256===local.mathSha256,'MODEL_MISMATCH_mathSha256');
 assert(typeof remote.enabled==='boolean','INVALID_AVAILABILITY');return remote;
}
export function validateGameState(remote,advertised,latest=null){
 // Before the versioned endpoint is deployed, the exact legacy model can use
 // its validated latest receipt. A new model never infers an entitlement.
 if(remote===null){assert(isLegacyModel(advertised),'MODEL_STATE_UNAVAILABLE');remote={gameId:advertised.id,freeSpinsRemaining:latest?.freeSpinsRemaining||0,bet:latest?.bet};}
 assert(remote&&remote.gameId===advertised.id,'STATE_IDENTITY_MISMATCH');
 const remaining=remote.freeSpinsRemaining;assert(Number.isInteger(remaining)&&remaining>=0&&remaining<=500,'FREE_SPIN_MISMATCH');
 let model=advertised;
 if(remote.mathVersion!==undefined||remote.engineVersion!==undefined||remote.mathSha256!==undefined)model=gameConfig(advertised.id,remote);
 else assert(isLegacyModel(advertised),'STATE_VERSION_MISSING');
 if(remaining){assert(model.features.freeSpins.spins>0&&model.betLevels.includes(remote.bet),'FREE_SPIN_MODEL_MISMATCH');}
 else assert(model.mathVersion===advertised.mathVersion&&model.engineVersion===advertised.engineVersion&&model.mathSha256===advertised.mathSha256,'STATE_MODEL_MISMATCH');
 if(remote.currentMathVersion!==undefined)assert(remote.currentMathVersion===advertised.mathVersion,'STATE_CURRENT_MODEL_MISMATCH');
 return {model,freeSpinsRemaining:remaining,bet:remaining?remote.bet:null};
}
export function validateHistory(items,gameId){
 assert(Array.isArray(items),'HISTORY_UNAVAILABLE');const models=new Map();
 return items.filter(row=>row.result_json?.gameId===gameId).map(row=>{
  const result=row.result_json,key=JSON.stringify([result.mathVersion,result.engineVersion,result.mathSha256]);
  if(!models.has(key))models.set(key,gameConfigForReceipt(result));const model=models.get(key);
  validateRound(result,model,result.bet);return {row,result,model};
 });
}
export function savedGambleParent(action,history){
 const parent=history.find(entry=>entry.result.roundId===action.roundId);assert(parent,'SAVED_GAMBLE_PARENT_UNAVAILABLE');
 assert(parent.result.gameId===action.gameId&&parent.result.bet===action.bet,'SAVED_GAMBLE_PARENT_MISMATCH');
 if(action.expectedAttempt!==undefined)assert(Number.isInteger(action.expectedAttempt)&&action.expectedAttempt>=1&&action.expectedAttempt<=parent.model.features.gambleRounds,'SAVED_GAMBLE_ATTEMPT_INVALID');
 if(action.expectedStake!==undefined){assert(action.expectedAttempt!==undefined,'SAVED_GAMBLE_ATTEMPT_INVALID');assert(units(action.expectedStake)===units(parent.result.finalWin)*2n**BigInt(action.expectedAttempt-1),'SAVED_GAMBLE_STAKE_INVALID');}
 return parent;
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
 const scatterRules=g.rules.scatter,pays=scatterRules?.pays||{},scatterPay=scatterRules&&scatterCount>=scatterRules.trigger?(pays[Math.min(5,scatterCount)]||0):0;
 const scatter=stake*BigInt(scatterPay)*BigInt(scatterRules?.multipliedByWheel?wheel:1);
 const line= wins.reduce((n,w)=>n+units(w.win),0n),total=line+scatter,cap=stake*BigInt(g.maxWinMultiplier);
 return {wins,line,scatter,total,final:total>cap?cap:total,scatterCount,bonus:scatterCount>=g.features.freeSpins.trigger&&(!isFree||g.features.freeSpins.retrigger)?g.features.freeSpins.spins:0};
}
export function validateRound(result,g,bet){
 assert(result&&result.gameId===g.id&&result.currency==='ETB'&&result.bet===bet,'ROUND_IDENTITY_MISMATCH');
 assert(typeof result.roundId==='string'&&/^[a-f0-9-]{36}$/.test(result.roundId),'INVALID_ROUND_ID');
 assert(result.mathVersion===g.mathVersion&&result.engineVersion===g.engineVersion,'ROUND_VERSION_MISMATCH');
 assert(typeof g.mathSha256==='string'&&result.mathSha256===g.mathSha256,'INVALID_MATH_HASH');
 assert(g.betLevels.includes(bet),'ROUND_BET_MODEL_MISMATCH');
 assert(typeof result.isFree==='boolean','INVALID_FREE_SPIN');
 assert(!result.isFree||g.features.freeSpins.spins>0,'INVALID_FREE_SPIN_MODEL');
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
 assert(g.features.freeSpins.spins>0||result.freeSpinsRemaining===0,'FREE_SPIN_MODEL_MISMATCH');
 assert(result.maxWinCapped===(e.total>e.final),'CAP_MISMATCH');return result;
}
export function validateGamble(result,g,expected){
 assert(result&&typeof result.won==='boolean'&&result.roundId===expected.roundId&&result.choice===expected.choice,'GAMBLE_IDENTITY_MISMATCH');
 assert(['RED','BLACK'].includes(result.cardColor)&&result.won===(result.cardColor===result.choice),'GAMBLE_COLOUR_MISMATCH');
 assert(Number.isInteger(result.attempt)&&result.attempt>=1&&result.attempt<=g.features.gambleRounds&&result.maxAttempts===g.features.gambleRounds,'GAMBLE_ATTEMPT_MISMATCH');
 const stake=units(result.stake),payout=units(result.payout);assert(stake>0n&&payout===(result.won?stake*2n:0n),'GAMBLE_PAYOUT_INVALID');
 assert(gambleStakeAllowed(g,result.stake),'GAMBLE_STAKE_LIMIT');
 if(expected.expectedStake!==undefined)assert(stake===units(expected.expectedStake),'GAMBLE_STAKE_MISMATCH');
 if(expected.parentWin!==undefined)assert(stake===units(expected.parentWin)*2n**BigInt(result.attempt-1),'GAMBLE_PARENT_STAKE_MISMATCH');
 if(expected.expectedAttempt!==undefined)assert(result.attempt===expected.expectedAttempt,'GAMBLE_ATTEMPT_MISMATCH');
 units(result.balanceAfter,2);return result;
}
export class SpinState {
 constructor(){this.value='loading';}
 move(next){const allowed={loading:['ready','signedout','unavailable','error','pending'],ready:['requesting','loading','signedout','error'],requesting:['animating','pending','ready','signedout'],animating:['presenting','ready','pending','signedout'],presenting:['ready','requesting','signedout'],pending:['requesting','loading','signedout'],signedout:['loading'],unavailable:['loading'],error:['loading']};assert(allowed[this.value]?.includes(next),'INVALID_STATE_'+this.value+'_'+next);this.value=next;return next;}
 get locked(){return !['ready','presenting'].includes(this.value);}
}
