/**
 * Additive hooks for the EXISTING superwin-nine-slot-engine createSlotService.
 * Insert inside its authenticated/rate-limited fetchHandler, retaining its
 * origin, JSON body-size and content-type guards and its original json():
 *   GET /api/fresh-state -> state(req, gameId), only when handles(gameId)
 *   POST /api/spin       -> spin(req, body), only when handles(body.gameId)
 * The current handler already normalizes /api/slots/* to /api/*.
 * Other games, endpoints, sessions, ledger tables and services are untouched.
 * This module does not listen, create accounts, install profiles or enable games.
 */
import {createSwNinePgAdapter} from './sw-nine-pg-adapter.mjs';
import {GAME_REFERENCE,GameMathError,cents} from './official-math.mjs';

const fail=(code,status=503)=>{throw new GameMathError(code,status)};
const digest=/^[a-f0-9]{64}$/i;
const allowedInput=new Set(['gameId','bet','roundToken','sessionGuard','identity',
  'mathVersion','engineVersion','mathSha256','replayOnly']);
const requiredCallbacks=['authenticate','transaction','lockWallets','move','balance',
  'houseFor','hash','cash','accepting','profileForGame','sessionGuard','publicGames',
  'assertOperatorWagerEnabled','assertNoActive','assertPlayerCapacity'];
const handles=gameId=>typeof gameId==='string'&&Object.hasOwn(GAME_REFERENCE,gameId);

function candidate(profile,gameId){
  if(!profile||profile.gameId!==gameId)fail('EXISTING_OPERATOR_PROFILE_UNAVAILABLE');
  if(profile.schema!=='zplay-independent-operator-profile-v1'||
     profile.providerRngReproduced!==false||profile.providerCertified!==false)
    fail('INDEPENDENT_OPERATOR_PROFILE_REQUIRED');
  if(typeof profile.productionApproved!=='boolean'||typeof profile.probabilityModelAudited!=='boolean'||
     !digest.test(profile.mathSha256||'')||
     !['mathVersion','engineVersion'].every(key=>typeof profile[key]==='string'&&profile[key].length>0))
    fail('EXISTING_OPERATOR_PROFILE_INVALID');
  // Snapshot the server-owned object. An asynchronous storage refresh must not
  // change the model halfway through an authenticated state or settlement.
  return structuredClone(profile);
}
function configuredBets(game,ref){
  if(!Array.isArray(game.betLevels))fail('EXISTING_BET_LADDER_UNAVAILABLE');
  const denominator=BigInt(ref.paylines*ref.foundationBet);
  const result=game.betLevels.filter(bet=>{
    try{const value=cents(bet);return value>=100n&&value<=4000000n&&value%denominator===0n}
    catch{return false}
  });
  if(!result.length||new Set(result).size!==result.length)fail('EXISTING_BET_LADDER_UNAVAILABLE');
  return result;
}
function nonnegativeMinor(value){
  try{const result=BigInt(value);if(result>=0n)return result}catch{}
  fail('INVALID_EXISTING_WALLET_BALANCE');
}
function publicReturn(value){
  if(value===undefined||value===null)return null;
  const valid=part=>typeof part==='string'&&/^[1-9]\d{0,31}$/.test(part);
  if(!valid(value.numerator)||!valid(value.denominator))fail('EXISTING_OPERATOR_RETURN_INVALID');
  return {numerator:value.numerator,denominator:value.denominator};
}

export function createExistingServerRoutes(dependencies){
  for(const name of requiredCallbacks)if(typeof dependencies?.[name]!=='function')
    fail('EXISTING_RAILWAY_DEPENDENCY_REQUIRED_'+name);
  const d=dependencies;
  const catalogue=gameId=>{
    const list=d.publicGames();
    if(!Array.isArray(list))fail('EXISTING_GAME_CATALOGUE_UNAVAILABLE');
    const game=list.find(item=>item.id===gameId);
    if(!game)fail('FRESH_GAME_UNAVAILABLE',404);
    return game;
  };
  const profileForGame=async gameId=>candidate(await d.profileForGame(gameId),gameId);
  async function authenticated(request){
    if(!(request instanceof Request))fail('INVALID_EXISTING_REQUEST',400);
    const userId=await d.authenticate(request);
    if(typeof userId!=='string'||!userId)fail('PLAYER_LOGIN_REQUIRED',401);
    const guard=d.sessionGuard(request,userId);
    if(!digest.test(guard||''))fail('EXISTING_SESSION_HASH_INVALID');
    return {userId,guard};
  }
  const settle=createSwNinePgAdapter({...d,profileForGame,
    assertOperatorWagerEnabled:async(gameId,client)=>{
      if(catalogue(gameId).freshReleaseReady!==true)fail('FRESH_RELEASE_NOT_ENABLED');
      await d.assertOperatorWagerEnabled(gameId,client);
    }});

  async function state(request,gameId){
    // Authorization precedes catalogue/profile disclosure and wallet reads.
    const {userId,guard}=await authenticated(request);
    if(!handles(gameId))fail('FRESH_GAME_UNAVAILABLE',404);
    const ref=GAME_REFERENCE[gameId],registered=catalogue(gameId);
    const betLevels=configuredBets(registered,ref);
    const profile=await profileForGame(gameId);
    return d.transaction(async client=>{
      if(await d.authenticate(request,client,true)!==userId)fail('PLAYER_SESSION_CHANGED',403);
      const locked=await d.lockWallets(client,userId);
      const houseId=d.houseFor(userId);
      if(typeof houseId!=='string'||houseId===userId||!Array.isArray(locked))fail('HOUSE_WALLET_MISSING');
      const house=locked.find(wallet=>wallet.id===houseId);
      if(!house)fail('PLAYER_OR_HOUSE_WALLET_MISSING');
      const reserve=nonnegativeMinor(house.balance);
      const accountBalance=d.cash(nonnegativeMinor(await d.balance(client,userId)));
      // These are the original fresh-release read queries and ownership keys.
      const active=await client.query("SELECT game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' ORDER BY created_at,id LIMIT 1",[userId]);
      const latest=await client.query("SELECT r.round_id,r.result_json,r.created_at,r.total_win FROM sw_nine.game_rounds r LEFT JOIN sw_rebuild.rounds c ON c.id='nine:'||r.round_id::text WHERE r.user_id=$1 AND r.game_id=$2 ORDER BY c.settled_order DESC NULLS LAST,r.created_at DESC,r.round_id DESC LIMIT 1",[userId,gameId]);
      const availableBetLevels=betLevels.filter(bet=>cents(bet)*BigInt(ref.maxWinX)<=reserve);
      const profileApproved=profile.productionApproved===true&&profile.probabilityModelAudited===true;
      const releaseReady=registered.freshReleaseReady===true&&profileApproved;
      let operatorEnabled=false,disabledReason=null;
      if(releaseReady&&d.accepting()===true){
        try{await d.assertOperatorWagerEnabled(gameId,client);operatorEnabled=true}
        catch(error){if(error?.status!==503)throw error;disabledReason=error.code||'SLOT_RELEASE_NOT_ENABLED'}
      }
      const game={id:gameId,name:ref.title,currency:'ETB',reels:ref.reels,rows:ref.rows,
        paylines:ref.paylines,foundationBet:ref.foundationBet,maxWinMultiplier:ref.maxWinX,
        symbols:Object.keys(ref.paytable),paytable:structuredClone(ref.paytable),
        multiplierValues:[...ref.wheelValues],
        features:{expandingWild:gameId==='fresh_multihot5burnwilds',
          wildReels:gameId==='fresh_multihot5burnwilds'?[1,2,3]:[]},
        mathVersion:profile.mathVersion,engineVersion:profile.engineVersion,mathSha256:profile.mathSha256,
        modelKind:'independent_operator_probability_model',providerRngReproduced:false,providerCertified:false,
        productionApproved:profile.productionApproved,probabilityModelAudited:profile.probabilityModelAudited,
        offlineExactEnumerationVerified:profile.offlineExactEnumerationVerified===true,
        targetReturn:publicReturn(profile.targetReturn),
        freshReleaseReady:releaseReady,enabled:releaseReady&&operatorEnabled,
        // Keep a valid configured ladder for the existing dedicated clients,
        // even when all stakes are blocked by current house capacity.
        betLevels:availableBetLevels.length?availableBetLevels:betLevels,
        availableBetLevels,wagerAvailability:availableBetLevels.length?'available':'house_capacity',
        ...(disabledReason?{disabledReason}:{})};
      const stored=latest.rows[0];
      return {authenticated:true,currency:'ETB',sessionGuard:guard,balance:accountBalance,game,
        blockedByActiveGame:active.rows[0]?.game_id??null,
        round:stored?{result:stored.result_json,createdAt:stored.created_at}:null};
    });
  }

  async function spin(request,body){
    const {guard}=await authenticated(request);
    if(!body||typeof body!=='object'||Array.isArray(body))fail('INVALID_EXISTING_SPIN_REQUEST',400);
    if(body.sessionGuard!==guard)fail('PLAYER_SESSION_CHANGED',403);
    if(!handles(body.gameId))fail('FRESH_GAME_UNAVAILABLE',404);
    if(Object.keys(body).some(key=>!allowedInput.has(key)))fail('CLIENT_MATH_OR_PROFILE_OVERRIDE_NOT_ALLOWED',400);
    if(body.replayOnly!==undefined&&typeof body.replayOnly!=='boolean')fail('INVALID_REPLAY_FLAG',400);
    // Replay bypasses current catalogue/profile availability. The adapter still
    // authenticates and locks the existing wallet, and can only return a saved
    // matching receipt; an absent token never creates a wager.
    if(body.replayOnly!==true){
      const ref=GAME_REFERENCE[body.gameId];
      if(!configuredBets(catalogue(body.gameId),ref).includes(body.bet))fail('BET_OUTSIDE_EXISTING_LADDER',422);
    }
    const receipt=await settle(request,body);
    return {...receipt,modelKind:'independent_operator_probability_model',
      providerRngReproduced:false,providerCertified:false};
  }
  return Object.freeze({handles,state,spin});
}
