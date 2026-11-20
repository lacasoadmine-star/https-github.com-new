/**
 * ZPLAY first-ten integration for the EXISTING superwin-nine-slot-engine.
 * No new worker, http API, PostgreSQL schema, accounts, or player session.
 * All dependencies are supplied by the current Railway createSlotService:
 *   authenticate(request, client, true), transaction(fn), lockWallets(client,user),
 *   move(client,user,round,game,kind,amount,from,to),
 *   balance(client,user), houseFor(user), hash(string), accepting().
 * Route ONLY after an independently signed-off production model is installed.
 */
import {GameMathError, settleExistingPlayerRound, GAME_REFERENCE} from './official-math.mjs';

const fail=(code,status=400)=>{throw new GameMathError(code,status)};
const digestId=/^[a-f0-9]{64}$/i;
function activeSessionToken(request){
  const cookie=request.headers.get('cookie')||'';
  const match=/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/i.exec(cookie);
  if(!match)fail('PLAYER_LOGIN_REQUIRED',401);
  return match[1];
}
const toCents=value=>{
  try {
    const n=BigInt(value);
    if(n<0n)throw Error('negative balance');
    return n;
  }catch {fail('INVALID_EXISTING_WALLET_BALANCE',503)}
};

/**
 * Adapter of an already running PostgreSQL connection/ledger. Supplied functions
 * refer to the original Railway closure, not a newly created account or DB.
 * profileForGame MUST ignore all Client-requested paytables, RTP and strips.
 */
export function createSwNinePgAdapter({
  authenticate, transaction, lockWallets, move, balance, houseFor,
  hash, accepting, profileForGame, assertOperatorWagerEnabled,
}) {
  for(const [k,v] of Object.entries({authenticate,transaction,lockWallets,move,balance,
    houseFor,hash,accepting,profileForGame,assertOperatorWagerEnabled})) {
    if(typeof v!=='function')fail('EXISTING_RAILWAY_DEPENDENCY_REQUIRED_'+k,503);
  }
  return async function existingZplaySpin(request,body){
    if(!(request instanceof Request)||!body||typeof body!=='object'||Array.isArray(body))
      fail('INVALID_EXISTING_SPIN_REQUEST',400);
    const userId=await authenticate(request);
    if(typeof userId!=='string'||!userId)fail('PLAYER_LOGIN_REQUIRED',401);
    const raw=activeSessionToken(request);
    const bound=hash('fresh-account-session-v1\0'+userId+'\0'+raw);
    if(!digestId.test(bound))fail('EXISTING_SESSION_HASH_INVALID',503);
    if(body.sessionGuard!==bound)fail('PLAYER_SESSION_CHANGED',403);
    if(body.identity!==undefined&&body.identity!==userId)fail('PLAYER_SESSION_CHANGED',403);
    const gameId=body.gameId;
    if(typeof gameId!=='string'||!Object.hasOwn(GAME_REFERENCE,gameId))fail('FRESH_GAME_UNAVAILABLE',404);
    // An already-settled replay must not depend on the currently active
    // probability profile (which may have been withdrawn or become unreadable).
    // It is recovered from the existing sw_nine.game_rounds ledger by token.
    const profile=body.replayOnly===true?null:await profileForGame(gameId);
    // New wagers must use the exact server-approved math presented by fresh-state.
    // Replays may refer to a prior approved model, recovered by token from DB.
    if(body.replayOnly!==true&&profile&&
       (body.mathVersion!==profile.mathVersion||
        body.engineVersion!==profile.engineVersion||
        body.mathSha256!==profile.mathSha256))
      fail('PLAYER_MATH_VERSION_STALE',409);
    const withExistingTransaction=async fn=>transaction(async client=>{
      const authenticatedAgain=await authenticate(request,client,true);
      if(authenticatedAgain!==userId)fail('PLAYER_SESSION_CHANGED',403);
      const houseId=houseFor(userId);
      if(typeof houseId!=='string'||!houseId||houseId===userId)fail('HOUSE_WALLET_MISSING',503);
      const readBalance=async uid=>toCents(await balance(client,uid));
      const tx={
        async lockExistingWallets(uid){
          if(uid!==userId)fail('PLAYER_SESSION_CHANGED',403);
          await lockWallets(client,userId);
        },
        async findExistingRound(uid,token){
          const previous=await client.query(
            'SELECT request_hash,result_json FROM sw_nine.game_rounds WHERE user_id=$1 AND request_key=$2',
            [uid,token]
          );
          const fingerprint=hash(JSON.stringify({uid,gameId,bet:body.bet,action:'SPIN'}));
          if(previous.rowCount){
            const stored=previous.rows[0];
            if(stored.request_hash!==fingerprint)fail('IDEMPOTENCY_PARAMETER_CONFLICT',409);
            const receipt=stored.result_json;
            if(!receipt||receipt.gameId!==gameId||receipt.bet!==body.bet)
              fail('STORED_ROUND_INTEGRITY_MISMATCH',503);
            return {userId:uid,gameId,bet:body.bet,receipt};
          }
          // Do not permit the same token to collide with prior GAMBLE/PICK.
          const collision=await client.query(
            'SELECT 1 FROM sw_nine.actions WHERE user_id=$1 AND request_key=$2',
            [uid,token]
          );
          if(collision.rowCount)fail('IDEMPOTENCY_PARAMETER_CONFLICT',409);
          return null;
        },
        async assertReleaseEnabled(id){
          if(accepting()!==true)fail('SLOT_RELEASE_NOT_ENABLED',503);
          await assertOperatorWagerEnabled(id,client); // server operator gate
        },
        balanceCents:()=>readBalance(userId),
        houseReserveCents:()=>readBalance(houseId),
        async applyExistingLedger({gameId:id,roundId,wagerCents,winCents}){
          const before=await readBalance(userId),houseBefore=await readBalance(houseId);
          // Existing Railway move() writes sw_rebuild.wallets, sw_rebuild.transfers,
          // sw_rebuild.ledger and sw_nine.wallet_transactions, inside SAME transaction.
          await move(client,userId,roundId,id,'BET',wagerCents,userId,houseId);
          if(winCents>0n)await move(client,userId,roundId,id,'WIN',winCents,houseId,userId);
          return {balanceBeforeCents:before,houseBeforeCents:houseBefore,
            balanceAfterCents:await readBalance(userId),houseAfterCents:await readBalance(houseId)};
        },
        async recordExistingRound({userId:uid,gameId:id,bet,roundToken,roundId,mathSha256,receipt}){
          const stake=BigInt(bet.replace('.',''));
          const win=BigInt(receipt.finalWin.replace('.',''));
          const fingerprint=hash(JSON.stringify({uid,gameId:id,bet,action:'SPIN'}));
          await client.query(
            'INSERT INTO sw_nine.game_rounds(round_id,user_id,game_id,bet,base_bet,total_win,wheel_multiplier,request_key,request_hash,result_json,math_sha256,is_free) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
            [roundId,uid,id,stake.toString(),stake.toString(),win.toString(),receipt.wheelMultiplier,
              roundToken,fingerprint,JSON.stringify(receipt),mathSha256,false]
          );
          await client.query(
            'INSERT INTO sw_rebuild.rounds(id,user_id,game,bet,payout,outcome) VALUES($1,$2,$3,$4,$5,$6)',
            ['nine:'+roundId,uid,id,stake.toString(),win.toString(),JSON.stringify(receipt)]
          );
        }
      };
      return fn(tx);
    });
    return settleExistingPlayerRound({
      userId,gameId,bet:body.bet,roundToken:body.roundToken,
      replayOnly:body.replayOnly===true,profile,withExistingTransaction
    });
  };
}
