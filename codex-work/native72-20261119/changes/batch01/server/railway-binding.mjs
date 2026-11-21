// Additive binding inside the EXISTING Railway createSlotService closure.
// Candidate models stay closed unless an exact M20-only acceptance package is
// explicitly supplied by the server's versioned release entry module.
import {readFile} from 'node:fs/promises';
import {createIndependentRegistry} from './independent-registry.mjs';
import {createExistingServerRoutes} from './existing-server-routes.mjs';
import {GAME_REFERENCE,GameMathError,cents} from './official-math.mjs';
import {createM20ReleasePolicy,M20_GAME_ID} from './m20-release-policy.mjs';

export const RELEASE='native72-batch01-20261121-r2';
export const ARTIFACT_SHA256='7f26851665f6a1224b6bb05400091cf8b5e3b53a4566037b544c0cdf8faf93f8';
const ids=Object.keys(GAME_REFERENCE);
const fail=(code,status=503)=>{throw new GameMathError(code,status)};

export async function createNative72Batch01Binding(existing,{releaseAcceptance=null}={}){
  const [artifactBytes,evaluatorBytes]=await Promise.all([
    readFile(new URL('./independent-operator-audit.json',import.meta.url)),
    readFile(new URL('./official-math.mjs',import.meta.url))]);
  const registry=createIndependentRegistry({artifactBytes,evaluatorBytes,expectedArtifactSha256:ARTIFACT_SHA256});
  const policy=releaseAcceptance?createM20ReleasePolicy({...releaseAcceptance,registry}):null;
  const profileForGame=id=>policy?policy.profileForGame(id):registry.profileForGame(id);
  const publicGames=()=>{
    const games=existing.publicGames();
    if(!Array.isArray(games))fail('EXISTING_GAME_CATALOGUE_UNAVAILABLE');
    // Reuse the current authenticated slot operator's numeric ETB ladder.
    // New catalogue placeholders contain no bets; no DMO conversion is made.
    const ladder=games.find(g=>g.id==='fresh_multihot10')?.betLevels;
    if(!Array.isArray(ladder))fail('EXISTING_BET_LADDER_UNAVAILABLE');
    return games.map(game=>{
      if(!ids.includes(game.id))return game;
      const ref=GAME_REFERENCE[game.id],profile=profileForGame(game.id),approved=policy?.enabled(game.id)===true;
      const betLevels=ladder.filter(amount=>{try{const n=cents(amount);return n>=100n&&n<=4000000n&&n%BigInt(ref.paylines*ref.foundationBet)===0n}catch{return false}});
      if(!betLevels.length)fail('EXISTING_BET_LADDER_UNAVAILABLE');
      return {...game,betLevels,reels:ref.reels,rows:ref.rows,paylines:ref.paylines,
        features:{...game.features,gambleRounds:5,gambleMaxStake:'500.00'},
        freshReleaseReady:approved,enabled:approved&&existing.accepting()===true,mathVersion:profile.mathVersion,
        engineVersion:profile.engineVersion,mathSha256:profile.mathSha256,
        modelKind:'independent_operator_probability_model',providerRngReproduced:false,
        providerCertified:false,productionApproved:approved,offlineExactEnumerationVerified:true};
    });
  };
  const hooks=createExistingServerRoutes({...existing,publicGames,
    profileForGame:async id=>profileForGame(id),
    sessionGuard(request,uid){
      const token=request.headers.get('cookie')?.match(/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/i)?.[1];
      if(!token)fail('PLAYER_LOGIN_REQUIRED',401);
      return existing.hash('fresh-account-session-v1\0'+uid+'\0'+token);
    },
    assertOperatorWagerEnabled:async gameId=>{
      if(policy?.enabled(gameId)!==true)fail('NATIVE72_ACCEPTANCE_PENDING');
    },
    async assertNoActive(client,uid){
      const r=await client.query("SELECT game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' ORDER BY created_at,id LIMIT 1",[uid]);
      if(r.rows[0]?.game_id)fail('FINISH_ACTIVE_ROUND:'+r.rows[0].game_id,409);
    },
    async assertPlayerCapacity(client,uid,before,stake,maximumPayout){
      const r=await client.query('SELECT max_balance FROM sw_rebuild.account_limits WHERE user_id=$1',[uid]);
      const cap=r.rows[0]?.max_balance;
      if(cap!==null&&cap!==undefined&&before-stake+maximumPayout>BigInt(cap))fail('ACCOUNT_BALANCE_LIMIT',409);
    }});
  return Object.freeze({...hooks,publicGames,releaseInfo:()=>({release:policy?.release??RELEASE,
    artifactSha256:registry.artifactSha256,evaluatorSha256:registry.evaluatorSha256,
    acceptanceSha256:policy?.recordSha256??null,acceptedSourceSha256:policy?.sourceSha256??null,
    realMoneyEnabled:policy?.enabled(M20_GAME_ID)===true&&existing.accepting()===true,providerRngReproduced:false,
    enabledGames:policy?[M20_GAME_ID]:[],
    models:Object.fromEntries(ids.map(id=>[id,{mathSha256:profileForGame(id).mathSha256,
      targetReturn:profileForGame(id).targetReturn}]))})});
}
