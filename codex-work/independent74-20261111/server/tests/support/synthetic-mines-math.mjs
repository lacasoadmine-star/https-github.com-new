// TEST ONLY. The real Mine Island demo is a ten-platform ladder, not a mine
// grid. Preserve generic unplayed-mines refund/ledger coverage under a clearly
// synthetic identity, never presented as a provider title or deployed model.
import * as officialMath from '../../../math/official72.mjs';
export {chargingCarryBucket,emptyChargingCarry} from '../../../math/official72.mjs';
import {startMines,advanceMines,collectMines,publicMines,mineMultiplier} from '../../../math/engines/mines.mjs';
import {stake,payout,error} from '../../../math/engines/shared.mjs';
export const SYNTHETIC_MINES_ID='ind74_official_fixturemines';
const d={id:SYNTHETIC_MINES_ID,catalogName:'Synthetic refund test fixture',title:'Synthetic refund test fixture',family:'mines',mathVersion:'fixture-mines-unplayed-refund-v1',cells:25,rows:5,cols:5,mines:4,maxPicks:5,returnBps:9600,limits:{minBetMinor:'100',maxBetMinor:'5000000',betStepMinor:'100',maxWinMinor:'0'},rules:['Synthetic isolated test fixture; not a provider game.']};
d.maximumMultiplierBps=mineMultiplier(d,d.maxPicks);d.limits.maxWinMinor=payout(d.limits.maxBetMinor,d.maximumMultiplierBps);
export const syntheticMinesDefinition=()=>structuredClone(d);
const synthetic=id=>id===SYNTHETIC_MINES_ID;
const checked=r=>{const mines=r?.private?.mines;if(r?.gameId!==d.id||r.mathVersion!==d.mathVersion||!Array.isArray(mines)||mines.length!==d.mines||new Set(mines).size!==d.mines||mines.some(n=>!Number.isSafeInteger(n)||n<0||n>=d.cells))error('INVALID_ROUND','Invalid synthetic test state.');};
export function listGameDefinitions(){return [...officialMath.listGameDefinitions(),syntheticMinesDefinition()];}
export function getGameDefinition(id){return synthetic(id)?syntheticMinesDefinition():officialMath.getGameDefinition(id);}
export function startRound(args){if(!synthetic(args.gameId))return officialMath.startRound(args);if(args.options&&Object.keys(args.options).length)error('INVALID_OPTIONS','No synthetic start options.');return startMines(d,args);}
export function advanceRound(r,o={},now,rng){if(!synthetic(r.gameId))return officialMath.advanceRound(r,o,now,rng);checked(r);if(Object.keys(o).some(k=>k!=='cell'))error('INVALID_OPTIONS','Synthetic cell only.');return advanceMines(d,r,o);}
export function collectRound(r,o={},now,rng){if(!synthetic(r.gameId))return officialMath.collectRound(r,o,now,rng);checked(r);if(Object.keys(o).length)error('INVALID_OPTIONS','No synthetic collect options.');return collectMines(d,r);}
export function publicRound(r,now){if(!synthetic(r.gameId))return officialMath.publicRound(r,now);checked(r);return publicMines(d,r);}
export function reconcileRound(r,now){if(!synthetic(r.gameId))return officialMath.reconcileRound(r,now);checked(r);return r;}
export function maximumPayoutMinor(args){if(!synthetic(args.gameId))return officialMath.maximumPayoutMinor(args);return payout(stake(args.betMinor,d.limits),d.maximumMultiplierBps);}
