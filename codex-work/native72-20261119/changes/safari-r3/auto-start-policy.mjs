// Safari Simba: explicit START PLAY is the only permitted AUTO launch.
// Uses the existing Player account/model; no balance, backend or settlement code.
export function canStartSafariAuto({phase,account,visible,focused,pending,busy,activeAuto,bet,count}={}){
 return phase==='ready' && !!account && visible===true && focused===true &&
 !pending && !busy && !activeAuto &&
 Array.isArray(account.game?.betLevels) && account.game.betLevels.includes(bet) &&
 Number.isInteger(count) && count>0 && count<=1000;
}
