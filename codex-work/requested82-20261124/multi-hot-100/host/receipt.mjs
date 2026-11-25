import {quoteM100Grid} from '../rules/quote.mjs';
import {BACKEND_GAME_ID,VIEW_GAME_ID,MODEL_VERSION,NATIVE_SYMBOLS,UUID,minor,integerMinor,money,frozen,clone,fail} from './model.mjs';
const canonical=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const same=(a,b)=>canonical(a)===canonical(b);
const dense=(value,length)=>Array.isArray(value)&&value.length===length&&Array.from(value).every(item=>item!==undefined);
function rowMajor(raw){
 if(!dense(raw,5)||Array.from(raw).some(column=>!dense(column,4)||Array.from(column).some(symbol=>!((Number.isInteger(symbol)&&symbol>=0&&symbol<8)||(typeof symbol==='string'&&/^[0-7]$/.test(symbol))))))throw fail('M100_HOST_GRID');
 return Array.from({length:4},(_,row)=>raw.map(column=>NATIVE_SYMBOLS[Number(column[row])]));
}
export function roundFacts(raw){
 if(!raw||raw.game_id!==BACKEND_GAME_ID||raw.model_version!==MODEL_VERSION||!UUID.test(raw.round_id??'')||!Number.isSafeInteger(raw.version)||raw.version<0||!['active','settled'].includes(raw.status))throw fail('M100_HOST_ROUND_IDENTITY');
 const stake=integerMinor(raw.stakeMinor);if(stake<100n||stake>4000000n||stake%100n)throw fail('M100_HOST_ROUND_STAKE');
 const frames=raw.frames??raw.bonusFrames??[];
 if(!Array.isArray(frames)||frames.length>1||Array.from(frames).some(frame=>!frame||typeof frame!=='object')||(raw.omittedFrames??0)!==0)throw fail('M100_HOST_FRAME_SEQUENCE');
 const frame=frames.at(-1)??raw,grid=rowMajor(raw.grid??frame.grid);
 if(raw.grid&&frame.grid&&!same(grid,rowMajor(frame.grid)))throw fail('M100_HOST_GRID_CONFLICT');
 const multipliers=[raw.feature?.multiplier,raw.multiplier,frame.feature?.multiplier,frame.multiplier].filter(value=>value!==undefined);
 if(!multipliers.length||multipliers.some(value=>!Number.isInteger(value)||value<1||value>5||value!==multipliers[0]))throw fail('M100_HOST_MULTIPLIER');
 const multiplier=multipliers[0],quote=quoteM100Grid({grid,betMinor:stake,multiplier}),wins=frame.wins??raw.wins??[];
 function verifyLines(list){
  if(!Array.isArray(list)||list.length!==quote.lines.length||Array.from(list).some(line=>!line||typeof line!=='object'))throw fail('M100_HOST_WIN_LINES');
  const expected=new Map(quote.lines.map(line=>[line.lineId,line])),seen=new Set();let sum=0n;
  for(const line of list){const own=expected.get(line.line);
   if(!own||seen.has(line.line)||String(line.symbol)!==String(NATIVE_SYMBOLS.indexOf(own.symbol))||!dense(line.cells,own.count)||
    line.cells.some(cell=>!dense(cell,2)||!Number.isInteger(cell[0])||!Number.isInteger(cell[1]))||
    line.cells.slice().sort((a,b)=>a[0]-b[0]).some((cell,column)=>cell[0]!==column||cell[1]!==own.path[column])||integerMinor(line.payoutMinor)!==own.winMinor)throw fail('M100_HOST_WIN_LINE_QUOTE');
   seen.add(line.line);sum+=integerMinor(line.payoutMinor);
  }
  if(sum!==quote.winMinor)throw fail('M100_HOST_WIN_TOTAL');
 }
 verifyLines(wins);if(raw.wins&&frame.wins&&raw.wins!==frame.wins)verifyLines(raw.wins);
 const history=raw.gambleHistory??[];
 if(!Array.isArray(history)||history.length>5||Array.from(history).some(item=>!item||typeof item!=='object'))throw fail('M100_HOST_GAMBLE_HISTORY');
 let current=quote.winMinor;
 for(const entry of history){
  if(current<=0n||current>50000n||!['red','black'].includes(entry.color)||typeof entry.won!=='boolean')throw fail('M100_HOST_GAMBLE_HISTORY');
  current=entry.won?current*2n:0n;
  if(entry.payoutMinor!==undefined&&integerMinor(entry.payoutMinor)!==current)throw fail('M100_HOST_GAMBLE_AMOUNT');
 }
 if(raw.status==='active'&&(current<=0n||integerMinor(raw.currentCashoutMinor)!==current))throw fail('M100_HOST_PENDING_WIN');
 if(raw.status==='settled'&&integerMinor(raw.payoutMinor)!==current)throw fail('M100_HOST_SETTLED_WIN');
 return frozen({round:clone(raw),grid,stake,multiplier,quote,current,history:clone(history),winningLines:quote.lines.map(line=>line.lineId)});
}
function immutableRound(before,after){
 const a=roundFacts(before),b=roundFacts(after);
 if(before.round_id!==after.round_id||before.model_version!==after.model_version||before.stakeMinor!==after.stakeMinor||!same(a.grid,b.grid)||a.multiplier!==b.multiplier||!same(a.winningLines,b.winningLines))throw fail('M100_HOST_ACCEPTED_ROUND_CHANGED');
 return[a,b];
}
export function spinView(state,intent,before){
 const facts=roundFacts(state.round);
 if(facts.round.status!==(facts.quote.winMinor>0n?'active':'settled')||facts.history.length||facts.stake!==minor(intent.bet)||
  (before.round&&facts.round.round_id===before.round.round_id)||minor(state.balance)!==minor(before.balance)-facts.stake)throw fail('M100_HOST_SPIN_SETTLEMENT');
 return frozen({gameId:VIEW_GAME_ID,backendGameId:BACKEND_GAME_ID,currency:'ETB',requestKey:intent.requestKey,roundId:facts.round.round_id,bet:intent.bet,
  winAmount:money(facts.current),grid:facts.grid,multiplier:facts.multiplier,balance:state.balance,winningLines:facts.winningLines,winTier:null});
}
export function collectView(state,intent,before,{alreadySettled=false}={}){
 const[a,b]=immutableRound(before.round,state.round);
 if(a.round.round_id!==intent.roundId||b.round.status!=='settled'||!same(a.history,b.history)||b.current!==a.current||
  (!alreadySettled&&(a.round.status!=='active'||state.round.version!==before.round.version+1||minor(state.balance)!==minor(before.balance)+a.current))||
  (alreadySettled&&(a.round.status!=='settled'||minor(state.balance)!==minor(before.balance))))throw fail('M100_HOST_COLLECT_SETTLEMENT');
 return frozen({gameId:VIEW_GAME_ID,backendGameId:BACKEND_GAME_ID,currency:'ETB',requestKey:intent.requestKey,roundId:state.round.round_id,
  collected:true,collectedAmount:money(b.current),balance:state.balance,creditedByTake:!alreadySettled,settlementMode:alreadySettled?'SERVER_ALREADY_COLLECTED':'SERVER_COLLECT_ACTION'});
}
export function gambleView(state,intent,before){
 const[a,b]=immutableRound(before.round,state.round),entry=b.history.at(-1);
 if(a.round.status!=='active'||a.round.round_id!==intent.roundId||a.current<=0n||a.current>50000n||a.history.length>=5||
  state.round.version!==before.round.version+1||b.history.length!==a.history.length+1||!same(b.history.slice(0,-1),a.history)||entry.color!==intent.choice||
  minor(state.balance)!==minor(before.balance)+(state.round.status==='settled'?b.current:0n))throw fail('M100_HOST_GAMBLE_SETTLEMENT');
 const color=entry.won?intent.choice:intent.choice==='red'?'black':'red';
 // The native host settles red/black, not a suit wager. The fixed ace is only
 // the UI's color illustration; no additional random outcome is generated.
 const card=color==='red'?'Ace_Hearts':'Ace_Spades';
 return frozen({gameId:VIEW_GAME_ID,backendGameId:BACKEND_GAME_ID,currency:'ETB',requestKey:intent.requestKey,roundId:state.round.round_id,
  choice:intent.choice,correct:entry.won,card,cardSource:'Fixed illustration of confirmed red/black outcome',winAmount:money(b.current),balance:state.balance,
  attempt:b.history.length,settled:state.round.status==='settled'});
}
