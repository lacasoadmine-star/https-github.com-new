import {smartSoftDialogProfile} from './smartsoft-dialog-profiles.mjs';

const minor=value=>typeof value==='string'&&/^(0|[1-9]\d{0,18})$/.test(value)?BigInt(value):null;
const cash=value=>`${value/100n}.${String(value%100n).padStart(2,'0')}`;
const suitColor=Object.freeze({clubs:'black',spades:'black',diamonds:'red',hearts:'red'});
const suitName=Object.freeze({clubs:'Clubs',spades:'Spades',diamonds:'Diamonds',hearts:'Hearts'});

// The native legacy AUTO flag is winLevel >=3. winLevel is strict >25x
// for EACH accepted frame. A series of ordinary respins does not become a
// Big Win simply by adding their payouts. Stops affect only the next paid start.
export function smartSoftAutoplayBigWin(round,gameId){
 if(smartSoftDialogProfile(gameId)?.kind!=='legacy')return false;
 if((round?.game_id??round?.gameId)!==gameId)return false;
 const stake=minor(round?.stakeMinor);if(stake===null||stake<=0n)return false;
 const frames=Array.isArray(round?.frames)&&round.frames.length?round.frames:[{payoutMinor:round?.baseWinMinor}];
 return frames.some(frame=>{const win=minor(frame?.payoutMinor);return win!==null&&win>stake*25n;});
}

// Render only canonical accepted SmartSoft state. The actual card suit is
// supplied by the server and is never drawn or randomized by this module.
export function smartSoftGambleView(state){
 const id=state?.game?.id,round=state?.round;
 if(!smartSoftDialogProfile(id)||state.connected!==true||state.authenticated!==true||!state.sessionId||!round||
  (round.game_id??round.gameId)!==id||typeof(round.model_version??round.modelVersion)!=='string'||!(round.model_version??round.modelVersion)||
  typeof round.round_id!=='string'||!round.round_id||!Number.isSafeInteger(round.version)||round.version<0||!['active','settled'].includes(round.status))return null;
 const base=minor(round.baseWinMinor),amount=minor(round.currentCashoutMinor),history=round.gambleHistory;
 if(base===null||amount===null||!Array.isArray(history)||history.length>5)return null;
 let previous=base;
 for(let i=0;i<history.length;i++){
  const card=history[i],before=minor(card?.amountBeforeMinor),after=minor(card?.amountAfterMinor);
  if(!card||card.attempt!==i+1||card.rank!=='A'||suitColor[card.suit]!==card.color||!['red','black'].includes(card.selection)||
   typeof card.won!=='boolean'||card.won!==(card.selection===card.color)||before===null||before!==previous||before<=0n||
   after===null||after!==(card.won?before*2n:0n))return null;
  previous=after;
 }
 if(previous!==amount||round.gambleAttempts!==history.length||round.status==='settled'&&minor(round.payoutMinor)!==amount)return null;
 const prefix=id.startsWith('burningice')?'Cards/':'Double/Card/',last=history.at(-1),pending=state.busy===true||state.pending===true||state.confirming===true||state.recoveryBlocked===true;
 return Object.freeze({id,roundId:round.round_id,modelVersion:round.model_version??round.modelVersion,version:round.version,attempt:history.length,pending,
  amount:cash(amount),toWin:cash(amount*2n),amountMinor:String(amount),
  card:pending||!last?prefix+'Hidden':prefix+'Ace_'+suitName[last.suit],
  cardLabel:pending||!last?'Face-down card':'Ace of '+last.suit,
  last:pending?null:last,
  history:history.slice(id.startsWith('burningice')?-5:-4).reverse().map(card=>({frame:prefix+'Ace_'+suitName[card.suit],label:'Ace of '+card.suit,attempt:card.attempt})),
  previousHistory:history.slice(0,-1).slice(-4).reverse().map(card=>({frame:prefix+'Ace_'+suitName[card.suit],label:'Ace of '+card.suit,attempt:card.attempt})),
  status:round.status,remaining:round.gambleAttemptsRemaining,
 });
}

export function nativeBetWindow(values,selected,offset=null){
 if(!Array.isArray(values)||values.length>256||values.some(value=>typeof value!=='string'||!/^\d{1,10}\.\d{2}$/.test(value))||new Set(values).size!==values.length)return null;
 const selectedIndex=values.indexOf(selected);if(selectedIndex<0)return null;
 const first=Math.max(0,Math.min(Number.isInteger(offset)?offset:selectedIndex,Math.max(0,values.length-5)));
 return{first,values:values.slice(first,first+5),canUp:first>0,canDown:first+5<values.length};
}
