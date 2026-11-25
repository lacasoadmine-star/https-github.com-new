import pinned from './verified-model.json' with {type:'json'};
import {M100_PAYLINES} from '../rules/paylines.mjs';
import {M100_PUBLIC_COEFFICIENTS} from '../rules/quote.mjs';

export const VIEW_GAME_ID='zplay72_multi_hot_100_v1';
export const BACKEND_GAME_ID='multihot100_native';
export const MODEL_VERSION='superwin-multihot100-2-etb1-40000-v1';
export const OPERATOR_RELEASE='remaining-native-etb-r16';
// Own compatibility metadata, not a hash claimed to be returned by the server.
export const MODEL_SHA256='76e417cd62562a8f03e5c52f4bb87027c958e12b629369be78859cf046232910';
export const NATIVE_SYMBOLS=Object.freeze(['seven','bell','grapes','watermelon','cherry','orange','plum','lemon']);
export const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const fail=(code,status)=>Object.assign(new Error(code),{code,...(status?{status}:{})});
export const frozen=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;};
export const clone=value=>structuredClone(value);
export function minor(value){if(typeof value!=='string'||!/^(0|[1-9]\d{0,11})\.\d{2}$/.test(value))throw fail('M100_HOST_MONEY');return BigInt(value.replace('.',''));}
export function integerMinor(value){if(typeof value!=='string'||!/^(0|[1-9]\d{0,13})$/.test(value))throw fail('M100_HOST_MINOR');return BigInt(value);}
export function money(value){if(typeof value!=='bigint'||value<0n)throw fail('M100_HOST_MINOR');return `${value/100n}.${String(value%100n).padStart(2,'0')}`;}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function validateHostModel(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw fail('M100_HOST_MODEL_REQUIRED');
 const model={...(raw.publicConfig??{}),...raw};
 if(model.id!==BACKEND_GAME_ID||model.version!==MODEL_VERSION||model.currency!=='ETB'||model.columns!==5||model.rows!==4||model.paylines!==100||
   model.maxWinMultiplier!==2500||!same(model.paylinePaths,M100_PAYLINES)||model.minStake!=='1.00'||model.maxStake!=='40000.00'||
   !same(model.stakeValues,pinned.stakeValues)||!same(model.stakeMinorValues,pinned.stakeMinorValues)||
   model.launchable!==true||model.published!==true||model.operatorRelease?.id!==OPERATOR_RELEASE||
   model.operatorRelease.providerPrivateMathVerified!==false||model.operatorRelease.completeReferenceParityVerified!==false)
  throw fail('M100_EXISTING_MODEL_INCOMPATIBLE');
 const math=model.math;
 if(math?.kind!=='independent-zplay'||math.version!==MODEL_VERSION||math.officialPrivateMathVerified!==false||
  math.publicPayoutCoefficientsScaled!==false||!same(math.symbolWeights,[1,1,1,1,1,1,1,1])||
  !same(math.multiplierWeights,[1,2,3,4,6])||math.multiplierWeightTotal!==16)throw fail('M100_EXISTING_MATH_INCOMPATIBLE');
 if(!Array.isArray(model.symbols)||model.symbols.length!==8||model.symbols.some((symbol,index)=>String(symbol?.id)!==String(index)))throw fail('M100_HOST_SYMBOL_MAP');
 if(!Array.isArray(model.paytable)||model.paytable.length!==8)throw fail('M100_HOST_PAYTABLE');
 const seen=new Set();
 for(const row of model.paytable){
  const index=Number(row?.symbol),name=NATIVE_SYMBOLS[index];
  if(!Number.isInteger(index)||!name||String(index)!==row.symbol||seen.has(index)||row.basis!=='stake divided by 100')throw fail('M100_HOST_PAYTABLE');
  seen.add(index);
  if(!same(Object.keys(row.counts??{}),['3','4','5']))throw fail('M100_HOST_PAYTABLE');
  for(const count of [3,4,5]){
   const coefficient=row.counts[count];
   if(typeof coefficient?.numerator!=='string'||!/^\d+$/.test(coefficient.numerator)||typeof coefficient.denominator!=='string'||!/^\d+$/.test(coefficient.denominator)||
    BigInt(coefficient.denominator)<1n||BigInt(coefficient.numerator)!==BigInt(M100_PUBLIC_COEFFICIENTS[name][count])*BigInt(coefficient.denominator)||
    coefficient.value!==M100_PUBLIC_COEFFICIENTS[name][count])throw fail('M100_HOST_PAYTABLE');
  }
 }
 if(model.gamble?.maximumAttempts!==5||model.gamble.maximumCurrentWinMinor!=='50000'||model.gamble.payoffMultiplier!==2||
   model.collection?.expiresAfterMs!==1800000||model.collection.expiryReturnsCurrentWin!==true)throw fail('M100_HOST_ACTION_POLICY');
 return frozen(clone(model));
}
export function hostPolicy(state){const model=validateHostModel(state.game);minor(state.balance);return frozen({gameId:VIEW_GAME_ID,backendGameId:BACKEND_GAME_ID,currency:'ETB',serverAuthoritative:true,
 betLevels:[...model.stakeValues],balance:state.balance,mathVersion:MODEL_VERSION,engineVersion:OPERATOR_RELEASE,mathSha256:MODEL_SHA256,
 identityHashSource:'Own pinned public compatibility metadata; not a server-reported or provider-private hash'});}
export function validateEnvelope(raw,{sessionId=null,requestId=null}={}){
 if(!raw||raw.authenticated!==true||raw.currency!=='ETB'||raw.demo===true||raw.demoCreditsOnly===true||typeof raw.sessionId!=='string'||!raw.sessionId||raw.sessionId.length>256||
  (sessionId&&raw.sessionId!==sessionId))throw fail('M100_PLAYER_SESSION_CHANGED',403);
 if(raw.other_active_game!==undefined&&raw.other_active_game!==null&&(typeof raw.other_active_game!=='string'||! /^[a-z0-9_]{1,64}$/.test(raw.other_active_game)))throw fail('M100_HOST_OTHER_ACTIVE_GAME');
 if(requestId&&(raw.status!=='SUCCESS'||raw.request_id!==requestId||raw.game_id!==BACKEND_GAME_ID))throw fail('M100_HOST_ACTION_IDENTITY');
 const model=validateHostModel(raw.game);minor(raw.balance);
 if(raw.round!==null&&(!raw.round||typeof raw.round!=='object'))throw fail('M100_HOST_ROUND');
 return frozen(clone({...raw,game:model}));
}
