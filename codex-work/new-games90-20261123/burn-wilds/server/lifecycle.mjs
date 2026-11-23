import {BURN_WILDS_GAME_ID,validateBurnWildsReceipt} from '../expansion.mjs';
import {auditBurnWildsPayout} from '../outcome-audit.mjs';
export const BURN_SERVER_RELEASE=Object.freeze({mounted:false,productionEnabled:false,createsWallet:false});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH=/^[a-f0-9]{64}$/i, MONEY=/^(0|[1-9]\d{0,12})\.\d{2}$/;
const identityKeys=['engineVersion','mathVersion','mathSha256'];
const gates=['legalOutcomesVerified','outcomeDistributionVerified','aggregatePayoutVerified','roundingVerified','immediateLifecycleVerified','etbPolicyVerified','assetRightsVerified'];
const methods=['authenticate','lockWallets','assertReady','withRequestOwner','findRequest','insertRequest','playerBalance','houseBalance','reservedBalance','activeRound','assertNoActiveRound','assertPlayerCapacity','debitStake','reserveWin','creditReservedWin','insertRound','registerRound'];
export class BurnServerError extends Error{constructor(code,status=503){super(code);this.code=code;this.status=status;}}
const fail=(c,s)=>{throw new BurnServerError(c,s)};
const copy=x=>structuredClone(x);
const validMinor=x=>{if(typeof x!=='bigint'||x<0n||x>9223372036854775807n)fail('BURN_SERVER_AMOUNT');return x;};
const parse=x=>{if(typeof x!=='string'||!MONEY.test(x))fail('BURN_SERVER_MONEY',400);return validMinor(BigInt(x.replace('.','')));};
const money=x=>{validMinor(x);return String(x/100n)+'.'+String(x%100n).padStart(2,'0');};
const id=x=>{if(!identityKeys.every(k=>typeof x?.[k]==='string'&&x[k].length>0)||!HASH.test(x.mathSha256))fail('BURN_SERVER_MODEL_IDENTITY');return Object.fromEntries(identityKeys.map(k=>[k,x[k]]));};
function actionBody(raw){
  if(raw?.gameId!==BURN_WILDS_GAME_ID||!UUID.test(raw.roundToken||'')||!HASH.test(raw.sessionGuard||'')||
    !MONEY.test(raw.bet||'')||parse(raw.bet)===0n||
    raw.replayOnly!==undefined&&typeof raw.replayOnly!=='boolean')fail('BURN_SERVER_ACTION',400);
  const allowed=['gameId','roundToken','sessionGuard','bet',...identityKeys,'replayOnly'];
  if(Object.keys(raw).some(k=>!allowed.includes(k)))fail('BURN_SERVER_CLIENT_AUTHORITY_REJECTED',400);
  id(raw);return Object.freeze({...copy(raw),replayOnly:raw.replayOnly===true});
}
function approved(source,action=null){
  if(source?.gameId!==BURN_WILDS_GAME_ID||source.approved!==true||
    gates.some(k=>source.verification?.[k]!==true)||
    !['sampleOutcome','maximumPayoutMinor'].every(k=>typeof source[k]==='function')||
    !Array.isArray(source.betLevels)||source.betLevels.length===0||
    new Set(source.betLevels).size!==source.betLevels.length||
    source.betLevels.some(b=>parse(b)===0n))fail('BURN_SERVER_APPROVED_MODEL_REQUIRED');
  const model=id(source);
  if(action&&identityKeys.some(k=>model[k]!==action[k]))fail('BURN_SERVER_MODEL_CHANGED',409);
  if(action&&!source.betLevels.includes(action.bet))fail('BURN_SERVER_BET_UNAVAILABLE',422);
  return {...model,betLevels:[...source.betLevels],
    sampleOutcome:source.sampleOutcome.bind(source),
    maximumPayoutMinor:source.maximumPayoutMinor.bind(source)};
}
function verifyReplay(record,action){
  if(record?.gameId!==BURN_WILDS_GAME_ID||record.clientToken!==action.roundToken||
    record.betMinor!==Number(parse(action.bet))||
    record.settlementMode!=='SERVER_IMMEDIATE'||
    identityKeys.some(k=>record[k]!==action[k]))fail('BURN_SERVER_REPLAY_CONFLICT',409);
  auditBurnWildsPayout(validateBurnWildsReceipt(record));return copy(record);
}
/** Transaction, wallet, house and model are injected from the existing server.
 * The approved server sampler must have a separately audited distribution.
 * No new credentials, RNG, balance or database is created on import.
 */
export function createBurnWildsExistingServer({authenticate,sessionGuard,transaction,hash,
  getApprovedModel=async()=>null,releaseEnabled=()=>false,uuid=()=>globalThis.crypto.randomUUID()}={}){
  for(const [name,fn] of Object.entries({authenticate,sessionGuard,transaction,hash,getApprovedModel,releaseEnabled,uuid}))
    if(typeof fn!=='function')fail('BURN_SERVER_DEPENDENCY_'+name);
  async function owner(request){
    if(!(request instanceof Request))fail('BURN_SERVER_REQUEST',400);
    const userId=await authenticate(request);
    if(typeof userId!=='string'||!userId||userId.length>128)fail('PLAYER_LOGIN_REQUIRED',401);
    const guard=await sessionGuard(request,userId);
    if(!HASH.test(guard||''))fail('BURN_SERVER_SESSION_REQUIRED',403);
    return {userId,guard};
  }
  async function locked(request,who,action,fn){
    return transaction(async tx=>{
      for(const name of methods)if(typeof tx?.[name]!=='function')fail('BURN_SERVER_HOST_MISSING_'+name);
      if(await tx.authenticate(request)!==who.userId||
        await sessionGuard(request,who.userId)!==who.guard)fail('PLAYER_SESSION_CHANGED',403);
      await tx.lockWallets(who.userId);await tx.assertReady();
      if(!action)return fn(tx);
      return tx.withRequestOwner({userId:who.userId,gameId:BURN_WILDS_GAME_ID,
        requestKey:action.roundToken,kind:'SPIN'},()=>fn(tx));
    });
  }
  async function state(request){
    const who=await owner(request);
    return locked(request,who,null,async tx=>{
      const balance=validMinor(await tx.playerBalance(who.userId));
      const raw=await getApprovedModel(BURN_WILDS_GAME_ID);
      // Keep STATE available for authenticated historical recovery when the
      // game is suspended, its approval is withdrawn or its model rotated.
      // Only an approved current model can supply bet levels or enable SPIN.
      let model=null;
      if(raw){
        try{model=approved(raw);}
        catch(error){
          if(!(error instanceof BurnServerError&&
            ['BURN_SERVER_APPROVED_MODEL_REQUIRED','BURN_SERVER_MODEL_IDENTITY'].includes(error.code)))throw error;
        }
      }
      const active=await tx.activeRound(who.userId);
      const ready=!!model&&await releaseEnabled()===true&&!active;
      return {authenticated:true,currency:'ETB',sessionGuard:who.guard,
        balance:money(balance),round:null,blockedByActiveGame:active?.gameId||false,
        game:{gameId:BURN_WILDS_GAME_ID,enabled:ready,freshReleaseReady:ready,
          productionApproved:ready,probabilityModelAudited:ready,
          assetRightsVerified:ready,settlementMode:'SERVER_IMMEDIATE',
          wagerAvailability:ready?'ready':'disabled',betLevels:model?.betLevels||[],
          ...(model?id(model):{})}};
    });
  }
  async function spin(request,input){
    const action=actionBody(input),who=await owner(request);
    if(who.guard!==action.sessionGuard)fail('PLAYER_SESSION_CHANGED',403);
    const fingerprint=await hash(JSON.stringify({userId:who.userId,kind:'SPIN',
      gameId:BURN_WILDS_GAME_ID,roundToken:action.roundToken,bet:action.bet,...id(action)}));
    if(!HASH.test(fingerprint||''))fail('BURN_SERVER_HASH_REQUIRED');
    return locked(request,who,action,async tx=>{
      const found=await tx.findRequest(who.userId,action.roundToken);
      if(found){
        if(found.kind!=='SPIN'||found.fingerprint!==fingerprint)fail('IDEMPOTENCY_PARAMETER_CONFLICT',409);
        return verifyReplay(found.receipt,action);
      }
      if(action.replayOnly)fail('ROUND_NOT_FOUND_FOR_REPLAY',404);
      if(await releaseEnabled()!==true)fail('BURN_SERVER_RELEASE_DISABLED');
      const model=approved(await getApprovedModel(BURN_WILDS_GAME_ID),action);
      const stake=parse(action.bet),before=validMinor(await tx.playerBalance(who.userId));
      // The renderer and receipt contract use integer cents as JS numbers.
      if(stake>BigInt(Number.MAX_SAFE_INTEGER))fail('BURN_SERVER_STAKE_UNSAFE',422);
      if(before<stake)fail('INSUFFICIENT_FUNDS',402);
      await tx.assertNoActiveRound(who.userId);
      const max=validMinor(await model.maximumPayoutMinor(stake));
      if(max===0n)fail('BURN_SERVER_MAXIMUM_REQUIRED');
      const house=validMinor(await tx.houseBalance(who.userId));
      const reserved=validMinor(await tx.reservedBalance(who.userId));
      if(house+stake<max)fail('BURN_SERVER_HOUSE_CAPACITY');
      await tx.assertPlayerCapacity(who.userId,before,stake,max);
      const roundId=uuid();
      if(!UUID.test(roundId||''))fail('BURN_SERVER_ROUND_ID');
      await tx.debitStake({userId:who.userId,gameId:BURN_WILDS_GAME_ID,roundId,amountMinor:stake});
      const outcome=await model.sampleOutcome(Object.freeze({gameId:BURN_WILDS_GAME_ID,roundId,betMinor:Number(stake)}));
      if(!outcome||typeof outcome!=='object')fail('BURN_SERVER_OUTCOME');
      const receipt=validateBurnWildsReceipt({...copy(outcome),gameId:BURN_WILDS_GAME_ID,
        roundId,clientToken:action.roundToken,betMinor:Number(stake)});
      const quote=auditBurnWildsPayout(receipt);
      if(quote.winMinor!==outcome.winMinor)fail('BURN_SERVER_PAYOUT_MISMATCH');
      const win=BigInt(quote.winMinor);
      if(win>max)fail('BURN_SERVER_MAXIMUM_EXCEEDED');
      if(win>0n){
        await tx.reserveWin({userId:who.userId,gameId:BURN_WILDS_GAME_ID,roundId,amountMinor:win});
        await tx.creditReservedWin({userId:who.userId,gameId:BURN_WILDS_GAME_ID,roundId,amountMinor:win});
      }
      const after=validMinor(await tx.playerBalance(who.userId));
      if(after>BigInt(Number.MAX_SAFE_INTEGER))fail('BURN_SERVER_BALANCE_UNSAFE');
      if(after!==before-stake+win||
        validMinor(await tx.houseBalance(who.userId))!==house+stake-win||
        validMinor(await tx.reservedBalance(who.userId))!==reserved)
        fail('BURN_SERVER_LEDGER_MISMATCH');
      const result={...copy(receipt),requestKey:action.roundToken,...id(action),
        settlementMode:'SERVER_IMMEDIATE',balanceMinor:Number(after),
        balance:money(after),pendingWinMinor:0,canDouble:false};
      const saved={userId:who.userId,gameId:BURN_WILDS_GAME_ID,roundId,
        requestKey:action.roundToken,bet:action.bet,winAmount:money(win),receipt:copy(result)};
      await tx.insertRound(copy(saved));await tx.registerRound(copy(saved));
      await tx.insertRequest(who.userId,action.roundToken,'SPIN',fingerprint,copy(result));
      return result;
    });
  }
  return Object.freeze({state,spin,handles:game=>game===BURN_WILDS_GAME_ID,enabledByDefault:false});
}
