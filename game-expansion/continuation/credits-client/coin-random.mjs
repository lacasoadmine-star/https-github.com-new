import {getRoundActions} from './session.mjs';

// Chooses a UI position among confirmed closed cells only. It does not draw a
// safe/mine result, know any hidden board, create a wager or submit a request.
const ID='coinminer_native',EMPTY=Object.freeze([]),SPACE=0x100000000;
export function availableCoinTiles(state,{autoplayActive=false,instantWin=false}={}){
 const round=state?.round,game=state?.game;
 if(autoplayActive||instantWin||game?.isInstantWin===true||game?.controls?.instantWin?.enabled===true||
   state?.connected!==true||state.authenticated!==true||typeof state.sessionId!=='string'||!state.sessionId||
   state.confirmed===false||state.busy||state.pending||state.confirming||state.recoveryBlocked||state.error||
   game?.id!==ID||typeof game.version!=='string'||!game.version||round?.game_id!==ID||
   round.model_version!==game.version||typeof round.round_id!=='string'||!round.round_id||
   !Number.isSafeInteger(round.version)||round.version<0||round.status!=='active'||
   round.columns!==5||round.rows!==5||!Number.isInteger(round.mines)||round.mines<1||round.mines>24||
   !getRoundActions(round,game).includes('pick')||!Array.isArray(round.picks)||round.picks.length>=25-round.mines)return EMPTY;
 const used=new Set();
 for(const pick of round.picks){
  if(!pick||!Number.isInteger(pick.index)||pick.index<0||pick.index>=25||pick.safe!==true||used.has(pick.index))return EMPTY;
  used.add(pick.index);
 }
 return Object.freeze(Array.from({length:25},(_,index)=>index).filter(index=>!used.has(index)));
}

export function selectCoinRandomTile(state,options={}){
 const candidates=availableCoinTiles(state,options);
 if(!candidates.length)return null;
 const round=state.round,pin={sessionId:state.sessionId,roundId:round.round_id,modelVersion:round.model_version,
  version:round.version,unpickedSignature:candidates.join(',')};
 const fill=options.fillRandom??(words=>globalThis.crypto.getRandomValues(words));
 if(typeof fill!=='function')throw Error('UI_RANDOM_UNAVAILABLE');
 const words=new Uint32Array(1),limit=SPACE-SPACE%candidates.length;
 // Rejection avoids modulo bias. The bound is at most25, so normal crypto
 // rejects fewer than25 values out of2^32. A broken source fails closed.
 for(let attempt=0;attempt<32;attempt++){
  fill(words);const value=words[0];
  if(value<limit)return Object.freeze({...pin,index:candidates[value%candidates.length]});
 }
 throw Error('UI_RANDOM_UNAVAILABLE');
}

export function isCoinRandomSelectionCurrent(selection,state,options={}){
 if(!selection)return false;
 const candidates=availableCoinTiles(state,options),round=state?.round;
 return candidates.length>0&&selection.sessionId===state.sessionId&&selection.roundId===round.round_id&&
  selection.modelVersion===round.model_version&&selection.version===round.version&&
  selection.unpickedSignature===candidates.join(',')&&candidates.includes(selection.index);
}
