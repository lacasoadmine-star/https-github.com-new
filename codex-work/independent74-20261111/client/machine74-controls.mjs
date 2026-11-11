// UI decisions use only the published definition and authenticated snapshot.
// This module never calculates an outcome, changes a balance, or sends a wager.
const ID = /^ind74_official_[a-z0-9]+$/;
const MINOR = /^\d{1,24}$/;
const HOLD_SPIN_TITLES = new Set([
  'ind74_official_multihot10', 'ind74_official_multihot20',
  'ind74_official_multihot40', 'ind74_official_multihot100',
  'ind74_official_multihot5wild', 'ind74_official_multihot5burnwilds',
  'ind74_official_multihot5superwilds', 'ind74_official_multihotwildways',
  // The saved official English Help explicitly labels these controls
  // HOLD AND SPIN; no provider animation or sound is inferred from the label.
  'ind74_official_hotsamba', 'ind74_official_baoslot5x',
  'ind74_official_farmsfortune', 'ind74_official_draculasfortune',
]);

export function machineSignInHref(gameId) {
  if (!gameId) return '/';
  if (!ID.test(gameId)) throw new TypeError('A published machine identity is required.');
  return '/?ind74=' + encodeURIComponent(gameId);
}

export function requestPlayerSignIn(event, {gameId, embedded, hostWindow}) {
  machineSignInHref(gameId);
  if (!gameId || !embedded || hostWindow.parent === hostWindow) return false;
  event.preventDefault();
  hostWindow.parent.postMessage({type:'independent74:sign-in',gameId},hostWindow.location.origin);
  return true;
}

export function notifyPlayerWallet({gameId, embedded, demo, hostWindow}) {
  if (demo || !embedded || !gameId || hostWindow.parent === hostWindow) return false;
  machineSignInHref(gameId);
  hostWindow.parent.postMessage({type:'independent74:wallet-changed',gameId},hostWindow.location.origin);
  return true;
}

export function canStartRound(snapshot) {
  return !!snapshot && snapshot.accepting === true && snapshot.game?.launchable !== false &&
    !roundNeedsRecovery(snapshot) && !snapshot.other_active_game && !['active','pending'].includes(snapshot.round?.status);
}

export const roundNeedsRecovery=snapshot=>snapshot?.recovery_required===true||snapshot?.round?.recovery_required===true;
export const publicCurrentRound=snapshot=>roundNeedsRecovery(snapshot)||snapshot?.round?.previous_model===true?null:snapshot?.round??null;

export function activeRoundStake(snapshot){
  if(snapshot?.round?.status!=='active')return null;
  const minor=snapshot.round.totalBetMinor??snapshot.round.betMinor;
  return typeof minor==='string'&&MINOR.test(minor)&&BigInt(minor)>0n?minor:null;
}

export function startRoundOptions(definition, selected, {autoplay=false}={}) {
  const result = {...selected};
  // The published slot Help says native AUTO credits wins automatically.
  // Leaving a held win open must never cause AUTO to submit a second start.
  if (definition?.gamble?.enabled) result.holdWin = !autoplay && selected.holdWin === true;
  return result;
}

export function gamblePresentation(definition, round) {
  const pending = definition?.gamble?.enabled === true && round?.status === 'active' &&
    round.recovery_required!==true && MINOR.test(String(round.pendingWinMinor)) && BigInt(round.pendingWinMinor) > 0n;
  const rounds = Number.isSafeInteger(round?.gambleRounds) && round.gambleRounds >= 0 ? round.gambleRounds : 0;
  const maximum = round?.maxGambleRounds ?? definition?.gamble?.maxRounds;
  const maxRounds = Number.isSafeInteger(maximum) && maximum > 0 ? maximum : null;
  return {
    pending,
    canGamble:pending && round.allowedActions?.includes('gamble') === true,
    canCollect:pending && round.allowedActions?.includes('collect') === true,
    roundsPlayed:rounds,
    maxRounds,
    remaining:maxRounds === null ? null : Math.max(0,maxRounds-rounds),
  };
}

export function slotSpinLabel(definition) {
  return HOLD_SPIN_TITLES.has(definition?.id) ? 'HOLD & SPIN' : 'SPIN';
}

export function slotPaytable(definition) {
  const symbols = [...(definition?.symbols ?? [])];
  const divisor=definition?.symbolPrizeDivisor??1;
  if(!Number.isSafeInteger(divisor)||divisor<1)throw new TypeError('A positive published symbol-prize divisor is required.');
  if (definition?.wildSymbol?.pays && !symbols.some(symbol=>symbol.id===definition.wildSymbol.id)) symbols.push(definition.wildSymbol);
  const counts = [...new Set(symbols.flatMap(symbol=>Object.keys(symbol.pays ?? {}).map(Number)))].filter(n=>Number.isSafeInteger(n)&&n>0&&n<=10).sort((a,b)=>a-b);
  return {counts,rows:symbols.filter(symbol=>symbol.pays).map(symbol=>({id:symbol.id,label:symbol.label||symbol.id,awards:counts.map(count=>symbol.pays[count]===undefined?null:symbol.pays[count]/divisor)}))};
}
