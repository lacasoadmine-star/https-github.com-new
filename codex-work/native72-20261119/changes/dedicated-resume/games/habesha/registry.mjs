import {createRegistry} from '/zplay-native-shared-20261119-r1/registry-core.mjs';
import {habesha} from './habesha-model.mjs';
const registry=createRegistry(habesha,{title:'Habesha Fortune',accent:'5',skin:'habesha',x:113,y:186,w:266,h:262,titleY:115,note:261.63},'zplay-native-machines-20261119-habesha-r8');
export const {RELEASE,nativeFamilies,games,LEGACY_MATH_VERSION,resolveGame,presentationGameId,presentationConfig,modelIdentity,gameConfig,gameConfigForModel,gameConfigForReceipt,legacyGameConfig,isLegacyModel,defaultStake,allowsInfiniteAuto}=registry;
