// Build an isolated view of one already pinned server model. No outcome generation.
export function createRegistry(definition,visual,release){
 const pinned=structuredClone(definition),id=pinned.id;
 if(!id||!pinned.mathVersion||!pinned.engineVersion||!pinned.mathSha256)throw Error('MODEL_IDENTITY_REQUIRED');
 const nativeFamilies=Object.freeze({[id]:id});
 function resolveGame(value){return String(value||'')===id?id:null;}
 function presentationGameId(value){const candidate=typeof value==='object'&&value?value.machineId||value.id||value.gameId:value;return resolveGame(candidate);}
 function presentationConfig(model){return {...model,id:presentationGameId(model),machineId:model.machineId||model.id};}
 function modelIdentity(model){return {mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:model.mathSha256};}
 function gameConfig(value=id,identity=null){
  if(!resolveGame(value))throw Error('UNKNOWN_GAME');
  if(identity&&Object.entries(modelIdentity(pinned)).some(([key,wanted])=>identity[key]!==wanted))throw Error('UNKNOWN_GAME_MODEL');
  const model=structuredClone(pinned),symbols=model.symbols||model.symbolNames;
  return {...model,presentationGameId:id,visual:structuredClone(visual),strips:model.strips||model.stripCodes?.map(strip=>Array.from(strip,key=>symbols[key.charCodeAt(0)-65])),symbols,presentationSymbols:[...symbols]};
 }
 function gameConfigForModel(remote){if(!remote||remote.id!==id)throw Error('MODEL_IDENTITY_MISMATCH');return gameConfig(remote.id,remote);}
 function gameConfigForReceipt(receipt){if(!receipt||receipt.gameId!==id)throw Error('ROUND_IDENTITY_MISMATCH');return gameConfig(receipt.gameId,receipt);}
 function legacyGameConfig(){throw Error('UNKNOWN_LEGACY_GAME');}
 function isLegacyModel(){return false;}
 function defaultStake(model){return model.betLevels[0];}
 function allowsInfiniteAuto(){return false;}
 return Object.freeze({RELEASE:release,nativeFamilies,games:Object.freeze([id]),LEGACY_MATH_VERSION:null,resolveGame,presentationGameId,presentationConfig,modelIdentity,gameConfig,gameConfigForModel,gameConfigForReceipt,legacyGameConfig,isLegacyModel,defaultStake,allowsInfiniteAuto});
}
