import {baseRound,draw,error,payout,publicBase,active} from './shared.mjs';
import {choose} from './mines.mjs';
const RED=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const terminal=(round,bps,outcome)=>({...round,status:bps?'collected':'lost',step:1,multiplierBps:bps,winMinor:payout(round.betMinor,bps),outcome});
const validateNumber=(n,min,max)=>{if(!Number.isInteger(n)||n<min||n>max)error('INVALID_OPTIONS','Number is outside the published range.');return n;};
const deck=(count)=>Array.from({length:count},(_,i)=>i);
function take(cards,rng){return cards.splice(draw(rng,cards.length),1)[0];}
const rank=card=>card%13;
const baccaratValue=card=>Math.min(rank(card)+1,10)%10;
const cardValue=card=>rank(card)===0?11:Math.min(rank(card)+1,10);
export function handTotal(cards){let total=cards.reduce((s,c)=>s+cardValue(c),0),aces=cards.filter(c=>rank(c)===0).length;while(total>21&&aces-->0)total-=10;return total;}

export function rouletteBps(pockets,pocket,{choice='red',number}={}){
 validateNumber(pocket,0,pockets-1);
 if(choice==='straight'){validateNumber(number,0,pockets-1);return pocket===number?360000:0;}
 if(!['red','black','odd','even','low','high','dozen1','dozen2','dozen3','column1','column2','column3'].includes(choice))error('INVALID_OPTIONS','Choose a published roulette bet.');
 if(pocket===0||pocket===37)return 0;
 if(choice==='red')return RED.has(pocket)?20000:0;
 if(choice==='black')return RED.has(pocket)?0:20000;
 if(choice==='odd')return pocket%2?20000:0;
 if(choice==='even')return pocket%2?0:20000;
 if(choice==='low')return pocket<=18?20000:0;
 if(choice==='high')return pocket>=19?20000:0;
 if(choice.startsWith('dozen'))return Math.ceil(pocket/12)===Number(choice.at(-1))?30000:0;
 return ((pocket-1)%3)+1===Number(choice.at(-1))?30000:0;
}
export function sicboBps(dice,{choice='small',number}={}){
 if(dice.length!==3||dice.some(n=>!Number.isInteger(n)||n<1||n>6))error('INVALID_OUTCOME','Three valid dice are required.');
 const total=dice.reduce((a,b)=>a+b,0),triple=dice.every(n=>n===dice[0]);
 if(choice==='small')return !triple&&total>=4&&total<=10?20000:0;
 if(choice==='big')return !triple&&total>=11&&total<=17?20000:0;
 if(choice==='anytriple')return triple?310000:0;
 if(choice==='triple'){validateNumber(number,1,6);return triple&&dice[0]===number?1810000:0;}
 if(choice==='face'){validateNumber(number,1,6);const matches=dice.filter(n=>n===number).length;return matches?(matches+1)*10000:0;}
 error('INVALID_OPTIONS','Choose a published Sic Bo bet.');
}
export function kenoMultiplier(count){validateNumber(count,1,5);return Number(9500n*choose(40,count)/choose(10,count));}

function blackjackFinish(round,rng){
 const next=structuredClone(round),cards=next.private.deck,dealer=next.private.dealer;
 while(handTotal(dealer)<17)dealer.push(take(cards,rng));
 const playerTotal=handTotal(next.private.player),dealerTotal=handTotal(dealer);
 const bps=playerTotal>21?0:dealerTotal>21||playerTotal>dealerTotal?20000:playerTotal===dealerTotal?10000:0;
 return terminal(next,bps,{kind:'blackjack',player:[...next.private.player],dealer:[...dealer],playerTotal,dealerTotal,choice:'stand'});
}

export function startTable(config,{betMinor,options={},rng}={}){
 const round=baseRound(config,betMinor);
 if(config.family==='roulette'){
  const pocket=draw(rng,config.pockets),bps=rouletteBps(config.pockets,pocket,options);
  return terminal(round,bps,{kind:'roulette',pocket,label:pocket===37?'00':String(pocket),color:pocket===0||pocket===37?'green':RED.has(pocket)?'red':'black',bet:{...options}});
 }
 if(config.family==='sicbo'){
  const dice=Array.from({length:3},()=>draw(rng,6)+1),bps=sicboBps(dice,options);
  return terminal(round,bps,{kind:'sicbo',dice,total:dice.reduce((a,b)=>a+b,0),bet:{...options}});
 }
 if(config.family==='keno'){
  const numbers=options.numbers??[1,2,3];
  if(!Array.isArray(numbers)||numbers.length<1||numbers.length>5||new Set(numbers).size!==numbers.length)error('INVALID_OPTIONS','Select one to five distinct numbers.');
  numbers.forEach(n=>validateNumber(n,1,40));
  const pool=Array.from({length:40},(_,i)=>i+1),drawn=Array.from({length:10},()=>take(pool,rng)),matches=numbers.filter(n=>drawn.includes(n));
  const bps=matches.length===numbers.length?kenoMultiplier(numbers.length):0;
  return terminal(round,bps,{kind:'keno',selected:[...numbers],drawn,matches,offeredMultiplierBps:kenoMultiplier(numbers.length)});
 }
 if(config.family==='baccarat'){
  const choice=options.choice??'player';if(!['player','banker','tie'].includes(choice))error('INVALID_OPTIONS','Choose Player, Banker or Tie.');
  const cards=deck(416),player=[take(cards,rng),take(cards,rng)],banker=[take(cards,rng),take(cards,rng)];
  const total=h=>h.reduce((s,c)=>s+baccaratValue(c),0)%10;
  if(total(player)<8&&total(banker)<8){
   let third=null;if(total(player)<=5){third=take(cards,rng);player.push(third);}
   const b=total(banker),p=third===null?null:baccaratValue(third);
   const draws=p===null?b<=5:b<=2||b===3&&p!==8||b===4&&p>=2&&p<=7||b===5&&p>=4&&p<=7||b===6&&p>=6&&p<=7;
   if(draws)banker.push(take(cards,rng));
  }
  const playerTotal=total(player),bankerTotal=total(banker),winner=playerTotal===bankerTotal?'tie':playerTotal>bankerTotal?'player':'banker';
  const bps=winner==='tie'?(choice==='tie'?90000:10000):winner===choice?(choice==='banker'?19500:20000):0;
  return terminal(round,bps,{kind:'baccarat',player,banker,playerTotal,bankerTotal,winner,choice});
 }
 if(config.family==='blackjack'){
  const cards=deck(312),player=[take(cards,rng),take(cards,rng)],dealer=[take(cards,rng),take(cards,rng)];
  const initial={...round,private:{deck:cards,player,dealer}};
  const p=handTotal(player),d=handTotal(dealer);
  if(p===21||d===21)return terminal(initial,p===d?10000:p===21?25000:0,{kind:'blackjack',player:[...player],dealer:[...dealer],playerTotal:p,dealerTotal:d,natural:true});
  return initial;
 }
 error('INVALID_GAME','This table game is not implemented.');
}

export function advanceTable(config,round,options={},rng){
 active(round);if(config.family!=='blackjack')error('ROUND_FINISHED','This game has settled.');
 const choice=options.choice??'hit';if(!['hit','stand'].includes(choice))error('INVALID_OPTIONS','Choose Hit or Stand.');
 const next=structuredClone(round);
 if(choice==='hit'){
  next.private.player.push(take(next.private.deck,rng));
  if(handTotal(next.private.player)>21)return terminal(next,0,{kind:'blackjack',player:[...next.private.player],dealer:[...next.private.dealer],playerTotal:handTotal(next.private.player),dealerTotal:handTotal(next.private.dealer),choice});
  if(handTotal(next.private.player)<21)return next;
 }
 return blackjackFinish(next,rng);
}
export function publicTable(round){
 const view=publicBase(round);
 if(round.family==='blackjack'&&round.status==='active')return{...view,outcome:{kind:'blackjack',player:[...round.private.player],dealer:[round.private.dealer[0],null],playerTotal:handTotal(round.private.player)},allowedActions:['reveal','collect'],collectibleMinor:'0'};
 return{...view,outcome:structuredClone(round.outcome),allowedActions:[],collectibleMinor:'0'};
}
