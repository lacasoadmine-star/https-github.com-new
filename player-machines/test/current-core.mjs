// The same version dispatcher used by the new backend, kept separate from the
// historical snapshot so legacy receipts remain independently reproducible.
import {runtime,legacy,revised} from '../../server-fixes/native-rules-20261107/artifacts/versioned-core.mjs';
export const {getGame,publicGames,modelIdentity,receiptGame,gambleDraw}=runtime;
export const {visibleGrid}=legacy;
export function spin(id,bet,options={}){return options.legacy?legacy.spin(id,bet,options):runtime.spin(id,bet,options);}
export function evaluateGrid(game,...args){return (['foxy_hot_20_native','multi_hot_5_native'].includes(game.id)&&game.mathVersion===runtime.modelIdentity(game.id).mathVersion?revised:legacy).evaluateGrid(game,...args);}
