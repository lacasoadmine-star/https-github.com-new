import {OPERATOR_GAME_IDS,OPERATOR_WAGER_PROFILE_ID,OPERATOR_VERSION_SUFFIX} from '../models/operator-wager-profile.mjs';
import {COIN_ID,COIN_BASE_VERSION,COIN_INITIAL_PICK_VERSION} from '../models/coinminer-initial-pick.mjs';

// Build-time binding only. The captured manifest remains untouched. A new
// operator model can reuse its own exact presentation, never another title or
// a different mathematical base version. Runtime receipt checks stay strict.
export function bindOperatorManifest(source,game){
 const manifest=typeof source==='string'?JSON.parse(source):structuredClone(source);
 if(!manifest||manifest.id!==game?.id)throw Error('PRESENTATION_ID_MISMATCH');
 if(manifest.modelVersion===undefined||manifest.modelVersion===game.version)return manifest;
 const profile=game.operatorWagerProfile;
 const coinFirstPick=game.id===COIN_ID&&manifest.modelVersion===COIN_BASE_VERSION&&game.version===COIN_INITIAL_PICK_VERSION;
 if(!OPERATOR_GAME_IDS.includes(game.id)||profile?.id!==OPERATOR_WAGER_PROFILE_ID||
   (!coinFirstPick&&game.version!==manifest.modelVersion+OPERATOR_VERSION_SUFFIX))throw Error('PRESENTATION_MODEL_VERSION_MISMATCH:'+game.id);
 return {...manifest,sourceModelVersion:manifest.modelVersion,modelVersion:game.version,
  operatorWagerProfileId:OPERATOR_WAGER_PROFILE_ID};
}
