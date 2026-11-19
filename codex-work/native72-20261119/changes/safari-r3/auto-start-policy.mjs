// Safari Simba: the existing Player model is the only source of available ETB bets.
// The existing Worker enforces >= 1.00 ETB for this title. The client must not
// advertise smaller amounts even if an older cached model still contains them.
export function playableSafariBets(account){
 const levels=account?.game?.betLevels;
 if(!Array.isArray(levels))return [];
 return levels.filter(value=>typeof value==='string'&&/^(0|[1-9][0-9]*)\.[0-9]{2}$/.test(value)&&BigInt(value.replace('.',''))>=100n);
}
// Selecting an AUTO count never creates a wager. Only START PLAY calls this gate.
export function canStartSafariAuto({phase,account,visible,focused,pending,busy,activeAuto,bet,count}={}){
 return phase==='ready' && !!account && visible===true && focused===true &&
 !pending && !busy && !activeAuto && playableSafariBets(account).includes(bet) &&
 Number.isInteger(count) && count>0 && count<=1000;
}
