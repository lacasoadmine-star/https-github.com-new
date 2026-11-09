import {remainingPublicConfigs} from './remaining-games.mjs';
import {createRemainingEngine} from './remaining-engine.mjs';
import {OPERATOR_GAME_IDS,OPERATOR_WAGER_PROFILE} from './operator-wager-profile.mjs';
import {legacyCoinOperatorAdapter,withCoinInitialPick} from './coinminer-initial-pick.mjs';

// Additive model versions only. Closed reference/paytable gates stay closed;
// historical adapters retain their original definitions and saved-state math.
const configs=remainingPublicConfigs.filter(config=>OPERATOR_GAME_IDS.includes(config.id));
const engine=createRemainingEngine(configs,{operatorWagerProfile:OPERATOR_WAGER_PROFILE});
const legacy=engine.createRecoveryAdapter();
export const legacyOperatorCoinGames=legacyCoinOperatorAdapter(legacy);
export const operatorRemainingGames=withCoinInitialPick(legacy);
export const definitions=operatorRemainingGames.definitions;
export const createIsolatedOperatorAdapter=()=>withCoinInitialPick(engine.createIsolatedDraftAdapter());
export const evaluateDraftGrid=engine.evaluateDraftGrid;
export default operatorRemainingGames;
