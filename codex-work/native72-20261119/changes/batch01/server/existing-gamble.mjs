/**
 * X2 for the two independent operator models, using ONLY the existing
 * sw_nine.actions and sw_rebuild/sw_nine wallet ledger callbacks.
 * No HTTP server, wallet, schema, accounts or production release is created.
 */
import {GAME_REFERENCE,GameMathError,cents,asETB,secureIndex,requireApprovedProfile} from './official-math.mjs';

export const GAMBLE_POLICY=Object.freeze({maxAttempts:5,maxStake:'500.00',expiresMs:600000,
  probability:'1/2',operatorLimit:true,providerCurrencyConverted:false});
const fail=(code,status=409)=>{throw new GameMathError(code,status)};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const digest=/^[a-f0-9]{64}$/i;
const mathKeys=['mathVersion','engineVersion','mathSha256'];
const allowed=new Set(['gameId','roundId','roundToken','choice','sessionGuard','identity',
  'expectedAttempt','expectedStake','mathVersion','engineVersion','mathSha256','replayOnly']);
const required=['authenticate','transaction','lockWallets','move','balance','houseFor','hash',
  'accepting','profileForGame','publicGames','assertOperatorWagerEnabled','assertNoActive','assertPlayerCapacity'];
const minor=value=>{try{const n=BigInt(value);if(n>=0n)return n}catch{}fail('INVALID_EXISTING_WALLET_BALANCE',503)};
const known=gameId=>typeof gameId==='string'&&Object.hasOwn(GAME_REFERENCE,gameId);

export function createExistingGamble(dependencies){
  for(const key of required)if(typeof dependencies?.[key]!=='function')fail('EXISTING_RAILWAY_DEPENDENCY_REQUIRED_'+key,503);
  const d=dependencies,now=d.now??(()=>Date.now()),draw=d.drawIndex??secureIndex,
    newActionId=d.newActionId??(()=>crypto.randomUUID());
  async function authenticate(request){
    if(!(request instanceof Request))fail('INVALID_EXISTING_REQUEST',400);
    const userId=await d.authenticate(request);
    if(typeof userId!=='string'||!userId)fail('PLAYER_LOGIN_REQUIRED',401);
    const raw=request.headers.get('cookie')?.match(/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/i)?.[1];
    if(!raw)fail('PLAYER_LOGIN_REQUIRED',401);
    const guard=d.hash('fresh-account-session-v1\0'+userId+'\0'+raw);
    if(!digest.test(guard||''))fail('EXISTING_SESSION_HASH_INVALID',503);
    return {userId,guard};
  }
  async function latest(client,userId,roundId){
    const order=await client.query('SELECT settled_order FROM sw_rebuild.rounds WHERE id=$1 AND user_id=$2',['nine:'+roundId,userId]);
    if(order.rowCount!==1||order.rows[0].settled_order===null||order.rows[0].settled_order===undefined)fail('FRESH_ROUND_ORDER_UNAVAILABLE',503);
    const newer=await client.query('SELECT 1 FROM sw_rebuild.rounds WHERE user_id=$1 AND settled_order>$2::bigint LIMIT 1',[userId,String(order.rows[0].settled_order)]);
    return newer.rowCount===0;
  }
  async function history(client,roundId){
    const r=await client.query("SELECT attempt,result_json FROM sw_nine.actions WHERE parent_id=$1 AND kind='GAMBLE' ORDER BY attempt DESC LIMIT 1",[roundId]);
    return r.rows[0]??null;
  }
  function parentIdentity(parent,gameId){
    if(!parent||parent.result_json?.gameId!==gameId||parent.game_id!==undefined&&parent.game_id!==gameId||!uuid.test(parent.round_id||''))fail('STORED_ROUND_INTEGRITY_MISMATCH',503);
    if(cents(parent.result_json.finalWin)!==minor(parent.total_win))fail('STORED_ROUND_INTEGRITY_MISMATCH',503);
    const created=new Date(parent.created_at).getTime();
    if(!Number.isFinite(created))fail('STORED_ROUND_INTEGRITY_MISMATCH',503);
    return created;
  }

  async function gamble(request,body){
    const {userId,guard}=await authenticate(request);
    if(!body||typeof body!=='object'||Array.isArray(body))fail('INVALID_ACTION',400);
    if(body.sessionGuard!==guard||body.identity!==undefined&&body.identity!==userId)fail('PLAYER_SESSION_CHANGED',403);
    if(Object.keys(body).some(key=>!allowed.has(key)))fail('CLIENT_MATH_OR_PROFILE_OVERRIDE_NOT_ALLOWED',400);
    if(!known(body.gameId)||!uuid.test(body.roundId||'')||!uuid.test(body.roundToken||''))fail('INVALID_ACTION',400);
    if(!['RED','BLACK'].includes(body.choice))fail('INVALID_CHOICE',400);
    if(body.replayOnly!==undefined&&typeof body.replayOnly!=='boolean')fail('INVALID_REPLAY_FLAG',400);
    if(!Number.isSafeInteger(body.expectedAttempt)||body.expectedAttempt<1)fail('GAMBLE_STATE_CHANGED');
    cents(body.expectedStake);
    const fingerprint=d.hash(JSON.stringify({uid:userId,kind:'GAMBLE',gameId:body.gameId,
      roundId:body.roundId,choice:body.choice,expectedAttempt:body.expectedAttempt,expectedStake:body.expectedStake}));
    return d.transaction(async client=>{
      if(await d.authenticate(request,client,true)!==userId)fail('PLAYER_SESSION_CHANGED',403);
      await d.lockWallets(client,userId);
      const old=await client.query('SELECT request_hash,result_json FROM sw_nine.actions WHERE user_id=$1 AND request_key=$2',[userId,body.roundToken]);
      if(old.rowCount){
        if(old.rows[0].request_hash!==fingerprint)fail('IDEMPOTENCY_PARAMETER_CONFLICT');
        const saved=old.rows[0].result_json;
        if(saved?.gameId!==body.gameId||saved.roundId!==body.roundId||saved.roundToken!==body.roundToken||saved.kind!=='GAMBLE'||saved.stake!==body.expectedStake||saved.attempt!==body.expectedAttempt||saved.choice!==body.choice)fail('STORED_ACTION_INTEGRITY_MISMATCH',503);
        return saved;
      }
      if((await client.query('SELECT 1 FROM sw_nine.game_rounds WHERE user_id=$1 AND request_key=$2',[userId,body.roundToken])).rowCount)fail('IDEMPOTENCY_PARAMETER_CONFLICT');
      if(body.replayOnly===true)fail('ROUND_NOT_FOUND_FOR_REPLAY',404);
      if(d.accepting()!==true)fail('SLOT_RELEASE_NOT_ENABLED',503);
      const registered=d.publicGames().find(game=>game.id===body.gameId);
      if(registered?.freshReleaseReady!==true)fail('FRESH_RELEASE_NOT_ENABLED',503);
      const parents=await client.query('SELECT * FROM sw_nine.game_rounds WHERE round_id=$1 AND user_id=$2 FOR UPDATE',[body.roundId,userId]);
      if(parents.rowCount!==1)fail('ROUND_NOT_FOUND',404);
      const parent=parents.rows[0],created=parentIdentity(parent,body.gameId);
      const profile=structuredClone(await d.profileForGame(body.gameId));
      if(profile?.gameId!==body.gameId)fail('GAME_MATH_PROFILE_MISMATCH',503);
      requireApprovedProfile(profile);
      if(mathKeys.some(key=>body[key]!==profile[key]||parent.result_json[key]!==profile[key]))fail('GAME_RULES_UPDATED_RELOAD');
      await d.assertOperatorWagerEnabled(body.gameId,client);
      await d.assertNoActive(client,userId);
      if(now()-created>GAMBLE_POLICY.expiresMs||!await latest(client,userId,body.roundId))fail('GAMBLE_EXPIRED');
      const last=await history(client,body.roundId),attempt=Number(last?.attempt??0)+1;
      const stake=last?cents(last.result_json.payout):minor(parent.total_win);
      if(body.expectedAttempt!==attempt||body.expectedStake!==asETB(stake))fail('GAMBLE_STATE_CHANGED');
      if(attempt>GAMBLE_POLICY.maxAttempts)fail('GAMBLE_LIMIT');
      if(stake<=0n)fail('NO_GAMBLE_WINNINGS');
      if(stake>cents(GAMBLE_POLICY.maxStake))fail('GAMBLE_STAKE_LIMIT');
      const houseId=d.houseFor(userId);
      if(typeof houseId!=='string'||!houseId||houseId===userId)fail('HOUSE_WALLET_MISSING',503);
      const before=minor(await d.balance(client,userId)),reserve=minor(await d.balance(client,houseId));
      if(before<stake)fail('INSUFFICIENT_FUNDS',402);
      if(reserve<stake*2n)fail('HOUSE_RESERVE_INSUFFICIENT',503);
      await d.assertPlayerCapacity(client,userId,before,stake,stake*2n);
      const selection=draw(2);
      if(!Number.isInteger(selection)||selection<0||selection>1)fail('RNG_OUT_OF_RANGE',500);
      const color=selection===0?'RED':'BLACK',won=color===body.choice,payout=won?stake*2n:0n;
      const actionId=newActionId();if(!uuid.test(actionId||''))fail('ACTION_ID_INVALID',500);
      await d.move(client,userId,actionId,body.gameId,'GAMBLE_BET',stake,userId,houseId);
      if(payout>0n)await d.move(client,userId,actionId,body.gameId,'GAMBLE_WIN',payout,houseId,userId);
      const after=minor(await d.balance(client,userId)),houseAfter=minor(await d.balance(client,houseId));
      if(after!==before-stake+payout||houseAfter!==reserve+stake-payout)fail('EXISTING_LEDGER_SETTLEMENT_MISMATCH',500);
      const walletReceipt={currency:'ETB',balanceBefore:asETB(before),chargedStake:asETB(stake),finalWin:asETB(payout),balanceAfter:asETB(after)};
      const receipt={kind:'GAMBLE',actionId,roundId:body.roundId,roundToken:body.roundToken,
        gameId:body.gameId,currency:'ETB',choice:body.choice,color,won,stake:asETB(stake),payout:asETB(payout),
        attempt,maxAttempts:GAMBLE_POLICY.maxAttempts,maxStake:GAMBLE_POLICY.maxStake,
        balanceAfter:asETB(after),walletReceipt,
        mathVersion:profile.mathVersion,engineVersion:profile.engineVersion,mathSha256:profile.mathSha256,
        modelKind:'independent_operator_probability_model',providerRngReproduced:false,providerCertified:false};
      await client.query('INSERT INTO sw_nine.actions(id,parent_id,user_id,kind,request_key,request_hash,attempt,result_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [actionId,body.roundId,userId,'GAMBLE',body.roundToken,fingerprint,attempt,JSON.stringify(receipt)]);
      return receipt;
    });
  }

  async function describe(client,userId,parent,{enabled=false,blockedByActiveGame=null,currentProfile}={}){
    const gameId=parent?.result_json?.gameId;
    if(!known(gameId))fail('STORED_ROUND_INTEGRITY_MISMATCH',503);
    const created=parentIdentity(parent,gameId),last=await history(client,parent.round_id);
    const attempt=Number(last?.attempt??0),stake=last?cents(last.result_json.payout):minor(parent.total_win);
    let reason=null;
    if(!enabled)reason='FRESH_RELEASE_NOT_ENABLED';
    else if(blockedByActiveGame)reason='FINISH_ACTIVE_ROUND:'+blockedByActiveGame;
    else if(stake===0n)reason='NO_GAMBLE_WINNINGS';
    else if(attempt>=GAMBLE_POLICY.maxAttempts)reason='GAMBLE_LIMIT';
    else if(stake>cents(GAMBLE_POLICY.maxStake))reason='GAMBLE_STAKE_LIMIT';
    else if(now()-created>GAMBLE_POLICY.expiresMs||!await latest(client,userId,parent.round_id))reason='GAMBLE_EXPIRED';
    if(reason===null){
      const profile=currentProfile??await d.profileForGame(gameId);
      if(mathKeys.some(key=>parent.result_json[key]!==profile?.[key]))reason='GAME_RULES_UPDATED_RELOAD';
      else{
        const before=minor(await d.balance(client,userId)),reserve=minor(await d.balance(client,d.houseFor(userId)));
        if(before<stake)reason='INSUFFICIENT_FUNDS';
        else if(reserve<stake*2n)reason='HOUSE_RESERVE_INSUFFICIENT';
        else try{await d.assertPlayerCapacity(client,userId,before,stake,stake*2n)}
          catch(error){if(error?.code==='ACCOUNT_BALANCE_LIMIT')reason=error.code;else throw error}
      }
    }
    return {attempt,stake:asETB(stake),available:reason===null,
      maxAttempts:GAMBLE_POLICY.maxAttempts,maxStake:GAMBLE_POLICY.maxStake,reason,
      ...(last?{lastResult:last.result_json}:{})};
  }
  return Object.freeze({gamble,describe});
}
