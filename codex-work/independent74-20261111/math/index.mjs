import { GAME_ID, mineIslandDefinition } from './mine-island2.mjs';
import { startMineIslandRound, advanceMineIslandRound, collectMineIslandRound, publicMineIslandRound } from './mine-island2.mjs';
import popx from './games/popx.mjs';
import multihot20 from './games/multihot20.mjs';
import {startCrash,advanceCrash,collectCrash,publicCrash,crashReturn} from './engines/crash.mjs';
import {startSlot,publicSlot,calculateSlotReturn} from './engines/slots.mjs';
import {startLadder,advanceLadder,collectLadder,publicLadder} from './engines/ladder.mjs';
import {startMines,advanceMines,collectMines,publicMines,mineMultiplier} from './engines/mines.mjs';
import {startInstant,publicInstant} from './engines/instant.mjs';
import {syncCrash} from './engines/crash.mjs';
import {error,stake,payout} from './engines/shared.mjs';
import generatedDefinitions from './generated-registry.mjs';
export * from './mine-island2.mjs';
export {crashReturn,calculateSlotReturn};
const definitions=[mineIslandDefinition,popx,multihot20,...generatedDefinitions];

// Only verified, individually authored modules belong in this playable registry.
export function listGameDefinitions() { return structuredClone(definitions); }
export function getGameDefinition(gameId) {
  return structuredClone(definitions.find(x=>x.id===gameId)??null);
}
function definition(gameId){const d=definitions.find(x=>x.id===gameId);if(!d)error('INVALID_GAME','This game has no implemented math resolver.');return d;}
function roundDefinition(round){const d=definition(round?.gameId);if(round.mathVersion!==d.mathVersion)error('INVALID_ROUND','Round math version does not match its registered engine.');return d;}
function validateOptions(d,options){const allowed=d.family==='ladder'?['mode']:d.family==='dice'?['target']:[];if(!options||Array.isArray(options)||typeof options!=='object'||Object.keys(options).some(k=>!allowed.includes(k)))error('INVALID_OPTIONS','Only published game choices are accepted.');if(options.mode!==undefined&&!d.modes?.includes(options.mode))error('INVALID_MODE','This mode is not defined for the selected game.');return options;}
export function startRound({gameId,betMinor,options={},rng,now}={}){const d=definition(gameId);validateOptions(d,options);if(gameId===GAME_ID)return advanceMineIslandRound(startMineIslandRound({betMinor,mode:options.mode??'easy',...(rng?{rng}:{})}),{cell:0});if(d.family==='crash')return startCrash(d,{betMinor,rng,now});if(d.family==='slots')return startSlot(d,{betMinor,rng});if(d.family==='ladder')return startLadder(d,{betMinor,rng});if(d.family==='mines')return startMines(d,{betMinor,rng});if(['wheel','plinko','dice'].includes(d.family))return startInstant(d,{betMinor,rng,options});error('INVALID_GAME','Missing engine.');}
export function advanceRound(round,options={},now){const d=roundDefinition(round);if(round.gameId===GAME_ID)return advanceMineIslandRound(round,options);if(d.family==='crash')return advanceCrash(d,round,options,now);if(d.family==='ladder')return advanceLadder(d,round,options);if(d.family==='mines')return advanceMines(d,round,options);error('ROUND_FINISHED','This game settles when played.');}
export function collectRound(round,options={},now){const d=roundDefinition(round);if(round.gameId===GAME_ID)return collectMineIslandRound(round);if(d.family==='crash')return collectCrash(d,round,options,now);if(d.family==='ladder')return collectLadder(d,round);if(d.family==='mines')return collectMines(d,round);error('ROUND_FINISHED','This game settles when played.');}
export function publicRound(round,now){const d=roundDefinition(round);if(round.gameId===GAME_ID)return{...publicMineIslandRound(round),family:'ladder'};if(d.family==='crash')return publicCrash(d,round,now);if(d.family==='slots')return publicSlot(round);if(d.family==='ladder')return publicLadder(d,round);if(d.family==='mines')return publicMines(d,round);return publicInstant(round);}
export function reconcileRound(round,now){const d=roundDefinition(round);if(d.family!=='crash'||round.status!=='active')return round;const next=syncCrash(d,round,now);return next.status===round.status?round:next;}
export function maximumPayoutMinor({gameId,betMinor,options={}}={}){const d=definition(gameId);validateOptions(d,options);const bet=stake(betMinor,d.limits);let bps;
 if(gameId===GAME_ID){const mode=options.mode??'easy';const table=d.paytable.find(x=>x.mode===mode);if(!table)error('INVALID_MODE','Choose a supported mode.');bps=table.rows.at(-1).multiplierBps;}
 else if(d.family==='slots')bps=Math.max(...d.symbols.flatMap(s=>Object.values(s.pays)))*10000;
 else if(d.family==='crash')bps=d.maxMultiplierBps;
 else if(d.family==='ladder')bps=d.multipliersBps.at(-1);
 else if(d.family==='mines')bps=mineMultiplier(d,d.maxPicks);
 else if(d.family==='wheel')bps=Math.max(...d.sectors.map(x=>x.multiplierBps));
 else if(d.family==='plinko')bps=Math.max(...d.bucketMultipliersBps);
 else if(d.family==='dice'){const target=options.target??d.defaultTarget;if(!Number.isInteger(target)||target<d.minTarget||target>d.maxTarget)error('INVALID_TARGET','Choose a supported target.');bps=Math.floor(d.returnBps*100/target);}
 return payout(bet,bps);
}
