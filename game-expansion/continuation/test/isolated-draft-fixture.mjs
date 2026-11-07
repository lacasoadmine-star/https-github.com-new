import * as slots from '../models/smartsoft-slots.mjs';
import {createIsolatedDraftAdapter} from '../models/remaining-games.mjs';

// Only isolated tests import this fixture. The production entry point instead
// passes both adapters through the mandatory release-policy.mjs checks.
export function isolatedDraftAdapters(){
 return [{...slots,start:slots.evaluateDraftRound},createIsolatedDraftAdapter()];
}

export function referenceStakes(definition){
 const values=definition.stakeMinorValues;
 if(Array.isArray(values)&&values.length){
  const middle=values[Math.floor(values.length/2)];
  return [...new Set([values[0],values.includes('100')?'100':middle,values.at(-1)])];
 }
 return ['10','100','10000'];
}

export function ordinaryStake(definition){
 const values=definition.stakeMinorValues;
 return Array.isArray(values)&&values.length&&!values.includes('100')?values[0]:'100';
}

export const cash=value=>`${BigInt(value)/100n}.${String(BigInt(value)%100n).padStart(2,'0')}`;
