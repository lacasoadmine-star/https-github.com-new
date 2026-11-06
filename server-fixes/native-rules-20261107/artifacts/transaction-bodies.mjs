// Exact production bodies extracted by the build. Dependencies are injected only for synthetic tests.
export function bindTransactions(deps){const {authenticate,keyOK,MATH,fail,hash,locked,transaction,lockWallets,accepting,integer,cents,balance,houseFor,getGame,spin,toUnits,move,fault,settlementReceipt,mathSha256,modelIdentity,receiptGame,randomUUID,gambleDraw,cash,bonusRewards}=deps;
async function settle(req,body){const uid=await authenticate(req),{gameId,bet,roundToken}=body;const targetGame=['hot_foxy_20','multi_hot_5_video'].includes(gameId);if(!keyOK(roundToken)||!Object.hasOwn(MATH.games,gameId)||(!targetGame&&!(MATH.games[gameId].betLevels||MATH.betLevels).includes(bet)))fail(400,'GAME_BET_OR_TOKEN_INVALID');
 const fingerprint=hash(JSON.stringify({uid,gameId,bet,action:'SPIN'}));return locked(uid,roundToken,()=>transaction(async c=>{
 await authenticate(req,c,true);await lockWallets(c,uid);
 const old=await c.query('SELECT request_hash,result_json FROM sw_nine.game_rounds WHERE user_id=$1 AND request_key=$2',[uid,roundToken]);if(old.rowCount){if(old.rows[0].request_hash!==fingerprint)fail(409,'IDEMPOTENCY_PARAMETER_CONFLICT');return old.rows[0].result_json;}
 const collision=await c.query('SELECT 1 FROM sw_nine.actions WHERE user_id=$1 AND request_key=$2',[uid,roundToken]);if(collision.rowCount)fail(409,'IDEMPOTENCY_PARAMETER_CONFLICT');if(!accepting)fail(503,'SLOT_RELEASE_NOT_ENABLED');
 const fs=await c.query('SELECT remaining,bet FROM sw_nine.free_spins WHERE user_id=$1 AND game_id=$2 FOR UPDATE',[uid,gameId]),free=Number(fs.rows[0]?.remaining||0)>0,baseBet=cents(bet);
 const modelOptions={legacy:targetGame&&free},roundModel=getGame(gameId,modelOptions),expectedModel=modelIdentity(gameId,modelOptions);
 // Replay was resolved above. New paid requests must explicitly acknowledge the current rules.
 if(targetGame&&((!free&&body.mathVersion!==expectedModel.mathVersion)||(body.mathVersion!==undefined&&body.mathVersion!==expectedModel.mathVersion)||(body.engineVersion!==undefined&&body.engineVersion!==expectedModel.engineVersion)||(body.mathSha256!==undefined&&body.mathSha256!==expectedModel.mathSha256)))fail(409,'GAME_RULES_UPDATED_RELOAD');
 if(!(roundModel.betLevels||MATH.betLevels).includes(bet))fail(400,'GAME_BET_OR_TOKEN_INVALID');
 if(free&&integer(fs.rows[0].bet)!==baseBet)fail(409,'FREE_SPIN_BET_LOCKED');const charge=free?0n:baseBet;
 const balanceBefore=integer(await balance(c,uid));if(balanceBefore<charge)fail(402,'INSUFFICIENT_FUNDS');
 const reserve=integer(await balance(c,houseFor(uid)));if(reserve<baseBet*BigInt(roundModel.maxWinMultiplier))fail(503,'HOUSE_RESERVE_INSUFFICIENT');
 const result=spin(gameId,bet,{isFree:free}),win=toUnits(result.finalWin)/100n;
 // v2188: attach accurate per-stage win counts; monetary settlement remains server-authoritative.
 result.totalWinningLines=Array.isArray(result.stages)?result.stages.reduce((n,stage)=>n+(Array.isArray(stage.winLines)?stage.winLines.length:0),0):result.winLines.length;
 result.roundBreakdown={winLines:result.totalWinningLines,stages:Array.isArray(result.stages)?result.stages.length:1,wheelMultiplier:result.wheelMultiplier,mathVersion:result.mathVersion};
 
 if(charge>0n)await move(c,uid,result.roundId,gameId,'BET',charge,uid,houseFor(uid));
 fault('after_debit');if(win>0n)await move(c,uid,result.roundId,gameId,'WIN',win,houseFor(uid),uid);fault('after_credit');
 const remaining=Math.max(0,Number(fs.rows[0]?.remaining||0)-(free?1:0))+result.bonusSpinsAwarded;if(remaining>500)fail(409,'FREE_SPIN_LIMIT');
 await c.query('INSERT INTO sw_nine.free_spins(user_id,game_id,remaining,bet) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,game_id) DO UPDATE SET remaining=excluded.remaining,bet=excluded.bet',[uid,gameId,remaining,baseBet.toString()]);
 const receipt=settlementReceipt(balanceBefore,charge,win,integer(await balance(c,uid)));
 Object.assign(result,receipt,{walletReceipt:receipt,freeSpinsRemaining:remaining});
 await c.query('INSERT INTO sw_nine.game_rounds(round_id,user_id,game_id,bet,base_bet,total_win,wheel_multiplier,request_key,request_hash,result_json,math_sha256,is_free) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[result.roundId,uid,gameId,charge.toString(),baseBet.toString(),win.toString(),result.wheelMultiplier,roundToken,fingerprint,JSON.stringify(result),result.mathSha256,free]);
 await c.query('INSERT INTO sw_rebuild.rounds(id,user_id,game,bet,payout,outcome) VALUES($1,$2,$3,$4,$5,$6)',['nine:'+result.roundId,uid,gameId,charge.toString(),win.toString(),JSON.stringify(result)]);fault('before_commit');return result;}));}
async function action(req,body,kind){const uid=await authenticate(req),{roundId,roundToken}=body;if(!keyOK(roundToken)||typeof roundId!=='string'||!/^[-a-f0-9]{36}$/.test(roundId))fail(400,'INVALID_ACTION');
 if(kind==='GAMBLE'&&!['RED','BLACK'].includes(body.choice))fail(400,'INVALID_CHOICE');if(kind==='PICK'&&![0,1,2].includes(body.index))fail(400,'INVALID_PICK');
 const fingerprint=hash(JSON.stringify({uid,kind,roundId,choice:body.choice,index:body.index}));return locked(uid,roundToken,()=>transaction(async c=>{
 await authenticate(req,c,true);await lockWallets(c,uid);
 const old=await c.query('SELECT request_hash,result_json FROM sw_nine.actions WHERE user_id=$1 AND request_key=$2',[uid,roundToken]);if(old.rowCount){if(old.rows[0].request_hash!==fingerprint)fail(409,'IDEMPOTENCY_PARAMETER_CONFLICT');return old.rows[0].result_json;}
 if(kind==='GAMBLE'&&body.replayOnly===true)fail(409,'GAMBLE_STATE_CHANGED');
 if((await c.query('SELECT 1 FROM sw_nine.game_rounds WHERE user_id=$1 AND request_key=$2',[uid,roundToken])).rowCount)fail(409,'IDEMPOTENCY_PARAMETER_CONFLICT');
 if(!accepting)fail(503,'SLOT_RELEASE_NOT_ENABLED');if(integer(await balance(c,uid))<=0n)fail(402,'INSUFFICIENT_FUNDS');const r=await c.query('SELECT * FROM sw_nine.game_rounds WHERE round_id=$1 AND user_id=$2 FOR UPDATE',[roundId,uid]);if(r.rowCount!==1)fail(404,'ROUND_NOT_FOUND');const parent=r.rows[0],g=receiptGame(parent.game_id,parent.result_json);if(!g)fail(409,'ROUND_MODEL_NOT_SUPPORTED');
 const id=randomUUID();let result,attempt=1;
 if(kind==='GAMBLE'){
 if(!g.features.gambleRounds)fail(409,'GAMBLE_NOT_AVAILABLE');if(parent.result_json.pendingBonusPick)fail(409,'COLLECT_BONUS_FIRST');
 const newer=await c.query('SELECT 1 FROM sw_nine.game_rounds WHERE user_id=$1 AND round_id<>$2::uuid AND created_at>(SELECT created_at FROM sw_nine.game_rounds WHERE round_id=$2::uuid) LIMIT 1',[uid,roundId]);if(newer.rowCount||Date.now()-new Date(parent.created_at).getTime()>600000)fail(409,'GAMBLE_EXPIRED');
 const last=await c.query("SELECT attempt,result_json FROM sw_nine.actions WHERE parent_id=$1 AND kind='GAMBLE' ORDER BY attempt DESC LIMIT 1",[roundId]);attempt=Number(last.rows[0]?.attempt||0)+1;
 const stake=last.rowCount?cents(last.rows[0].result_json.payout):integer(parent.total_win);if((body.expectedAttempt!==undefined&&(!Number.isInteger(body.expectedAttempt)||body.expectedAttempt!==attempt))||(body.expectedStake!==undefined&&(typeof body.expectedStake!=='string'||!/^(0|[1-9]\d{0,9})(?:\.\d{1,4})?$/.test(body.expectedStake)||toUnits(body.expectedStake)!==stake*100n)))fail(409,'GAMBLE_STATE_CHANGED');if(attempt>g.features.gambleRounds)fail(409,'GAMBLE_LIMIT');if(stake<=0n)fail(409,'NO_GAMBLE_WINNINGS');if(g.features.gambleMaxStake&&stake>cents(g.features.gambleMaxStake))fail(409,'GAMBLE_STAKE_LIMIT');if(integer(await balance(c,houseFor(uid)))<stake*2n)fail(503,'HOUSE_RESERVE_INSUFFICIENT');
 result=gambleDraw(body.choice,cash(stake));const payout=toUnits(result.payout)/100n;await move(c,uid,id,g.id,'GAMBLE_BET',stake,uid,houseFor(uid));if(payout)await move(c,uid,id,g.id,'GAMBLE_WIN',payout,houseFor(uid),uid);Object.assign(result,{payout:cash(payout),roundId,attempt,maxAttempts:g.features.gambleRounds});
 }else{
 if(!parent.result_json.pendingBonusPick||!g.features.bonusPick)fail(409,'BONUS_NOT_AVAILABLE');if((await c.query("SELECT 1 FROM sw_nine.actions WHERE parent_id=$1 AND kind='PICK'",[roundId])).rowCount)fail(409,'BONUS_ALREADY_COLLECTED');
 const award=bonusRewards(cash(parent.base_bet))[body.index],payout=toUnits(award)/100n;await move(c,uid,id,g.id,'BONUS_WIN',payout,houseFor(uid),uid);result={roundId,payout:cash(payout),index:body.index};}
 result.balanceAfter=cash(await balance(c,uid));await c.query('INSERT INTO sw_nine.actions(id,parent_id,user_id,kind,request_key,request_hash,attempt,result_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,roundId,uid,kind,roundToken,fingerprint,attempt,JSON.stringify(result)]);return result;}));}
return {settle,action};}
