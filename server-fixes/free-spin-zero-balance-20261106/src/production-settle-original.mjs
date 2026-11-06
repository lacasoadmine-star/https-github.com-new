// Exact extracted production settle body; only dependencies injected for synthetic tests.
export function bindSettle(deps){const {authenticate,keyOK,MATH,fail,hash,locked,transaction,lockWallets,accepting,integer,cents,balance,houseFor,getGame,spin,toUnits,move,fault,settlementReceipt,mathSha256}=deps;return async function settle(req,body){const uid=await authenticate(req),{gameId,bet,roundToken}=body;if(!keyOK(roundToken)||!Object.hasOwn(MATH.games,gameId)||!(MATH.games[gameId].betLevels||MATH.betLevels).includes(bet))fail(400,'GAME_BET_OR_TOKEN_INVALID');
 const fingerprint=hash(JSON.stringify({uid,gameId,bet,action:'SPIN'}));return locked(uid,roundToken,()=>transaction(async c=>{
 await authenticate(req,c,true);await lockWallets(c,uid);
 const old=await c.query('SELECT request_hash,result_json FROM sw_nine.game_rounds WHERE user_id=$1 AND request_key=$2',[uid,roundToken]);if(old.rowCount){if(old.rows[0].request_hash!==fingerprint)fail(409,'IDEMPOTENCY_PARAMETER_CONFLICT');return old.rows[0].result_json;}
 const collision=await c.query('SELECT 1 FROM sw_nine.actions WHERE user_id=$1 AND request_key=$2',[uid,roundToken]);if(collision.rowCount)fail(409,'IDEMPOTENCY_PARAMETER_CONFLICT');if(!accepting)fail(503,'SLOT_RELEASE_NOT_ENABLED');
 const fs=await c.query('SELECT remaining,bet FROM sw_nine.free_spins WHERE user_id=$1 AND game_id=$2 FOR UPDATE',[uid,gameId]),free=Number(fs.rows[0]?.remaining||0)>0,baseBet=cents(bet);
 if(free&&integer(fs.rows[0].bet)!==baseBet)fail(409,'FREE_SPIN_BET_LOCKED');const charge=free?0n:baseBet;
 const balanceBefore=integer(await balance(c,uid));if(balanceBefore<=0n||balanceBefore<charge)fail(402,'INSUFFICIENT_FUNDS');
 const reserve=integer(await balance(c,houseFor(uid)));if(reserve<baseBet*BigInt(getGame(gameId).maxWinMultiplier))fail(503,'HOUSE_RESERVE_INSUFFICIENT');
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
 await c.query('INSERT INTO sw_nine.game_rounds(round_id,user_id,game_id,bet,base_bet,total_win,wheel_multiplier,request_key,request_hash,result_json,math_sha256,is_free) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[result.roundId,uid,gameId,charge.toString(),baseBet.toString(),win.toString(),result.wheelMultiplier,roundToken,fingerprint,JSON.stringify(result),mathSha256,free]);
 await c.query('INSERT INTO sw_rebuild.rounds(id,user_id,game,bet,payout,outcome) VALUES($1,$2,$3,$4,$5,$6)',['nine:'+result.roundId,uid,gameId,charge.toString(),win.toString(),JSON.stringify(result)]);fault('before_commit');return result;}));};}
