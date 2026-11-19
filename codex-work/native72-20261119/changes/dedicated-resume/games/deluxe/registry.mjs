import {createRegistry} from '/zplay-native-shared-20261119-r1/registry-core.mjs';
import {mh5deluxe} from './mh5deluxe-model.mjs';
const registry=createRegistry(mh5deluxe,{title:'Multi Hot 5 Deluxe',accent:'5',skin:'mh5deluxe',x:115,y:138,w:256,h:253,titleY:70,note:261.63},'zplay-native-machines-20261119-mh5deluxe-r2');
export const {RELEASE,nativeFamilies,games,LEGACY_MATH_VERSION,resolveGame,presentationGameId,presentationConfig,modelIdentity,gameConfig,gameConfigForModel,gameConfigForReceipt,legacyGameConfig,isLegacyModel,defaultStake,allowsInfiniteAuto}=registry;
