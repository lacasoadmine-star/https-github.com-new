import * as legacy from '../source/legacy-core.mjs';
import * as revised from '../source/revised-core.mjs';
import {createVersionedCore} from '../src/version-dispatch.mjs';
export const runtime=createVersionedCore(legacy,revised);
export {legacy,revised};
export const {MATH,mathSha256,publicGames,spin,toUnits,fromUnits,gambleDraw,bonusRewards,getGame,modelIdentity,receiptGame}=runtime;
