// Presentation and new-start compatibility only. Accepted receipts are never rewritten.
export const WAGER_PROFILE_ID="existing-new-etb1-40000-v1";
export const STAKE_VALUES=Object.freeze(["1.00","2.00","5.00","10.00","20.00","50.00","100.00","200.00","500.00","1000.00","2000.00","5000.00","10000.00","20000.00","40000.00"]);
export const EXPECTED_MODELS=Object.freeze({"multihot40_native":"superwin-multihot40-2-etb1-40000-v1","balloon_native":"superwin-balloon-1-etb1-40000-v1"});
export function supportsWagerProfile(game,id){
 if(!game||game.id!==id)return false;
 const value={...game.publicConfig,...game},profile=value.operatorWagerProfile;
 return value.version===EXPECTED_MODELS[id]&&value.launchable===true&&value.minStake==='1.00'&&value.maxStake==='40000.00'&&profile?.id===WAGER_PROFILE_ID&&profile.currency==='ETB'&&Array.isArray(value.stakeValues)&&value.stakeValues.length===STAKE_VALUES.length&&value.stakeValues.every((stake,index)=>stake===STAKE_VALUES[index]);
}
export function acceptedBetMinor(round,selected){
 return round?.status==='active'&&typeof round.stakeMinor==='string'&&/^(0|[1-9]\d*)$/.test(round.stakeMinor)?round.stakeMinor:selected;
}
export function wagerMathSummary(config){
 const before=config.math?.nativeReturnBeforeCurrencyRounding?.percent;
 return typeof before==='string'&&/^\d+(?:\.\d+)?$/.test(before)?'ZPLAY native game · theoretical return before currency rounding '+before+'%. Whole-santim settlement follows the rules above. This is an independent probability model; the reference provider model is separate.':'The independent probability model and currency rounding are described in the rules above.';
}
