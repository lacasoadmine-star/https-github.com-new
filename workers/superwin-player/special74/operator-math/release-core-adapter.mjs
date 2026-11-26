// Compose the three independently proved models over the retained ledger core.
// No balance, database, session, transaction or network implementation lives here.
import {createOperatorSlotCore as createPrimary,operatorGambleDraw,OPERATOR_ID} from './retained-core-adapter.mjs';
import {createSiblingOperatorCore,siblingGambleDraw,siblingEngines} from './sibling-core-adapter.mjs';
export {operatorGambleDraw};
export const RELEASE_MODEL_IDS=Object.freeze([OPERATOR_ID,...Object.keys(siblingEngines)]);
export function createOperatorSlotCore(existing,{sha256,sources,enabled=false,...options}={}){
 if(!sources||Object.keys(sources).length!==RELEASE_MODEL_IDS.length||RELEASE_MODEL_IDS.some(id=>!Object.hasOwn(sources,id)))throw Error('EXACT_RELEASE_MODELS_REQUIRED');
 if(sources[OPERATOR_ID]!==sha256)throw Error('PRIMARY_MODEL_HASH_MISMATCH');
 const primary=createPrimary(existing,{sha256,enabled,...options});
 return createSiblingOperatorCore(primary,{sources:Object.fromEntries(Object.keys(siblingEngines).map(id=>[id,sources[id]])),enabled,...options});
}
export function releaseGambleDraw(id,choice,amount,attempt,nextUint32){
 if(id===OPERATOR_ID)return operatorGambleDraw(choice,amount,attempt,nextUint32);
 return siblingGambleDraw(id,choice,amount,attempt,nextUint32);
}
