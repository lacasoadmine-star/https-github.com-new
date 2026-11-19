import * as registry from './registry.mjs';
import {createContract} from '/zplay-native-shared-20261119-r1/contract-core.mjs';
const contract=createContract(registry);
export const {units,decimal,money,presentedBalance,gambleStakeAllowed,spinSelectionChanged,normalizeAutoOptions,autoStopReason,validateModel,validateGameState,validateHistory,savedGambleParent,gridFromStops,evaluate,validateRound,validateGamble,SpinState}=contract;
