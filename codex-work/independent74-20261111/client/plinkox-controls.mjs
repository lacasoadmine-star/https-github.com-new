// Wager input formatting only. Outcomes and total-stake admission stay server-owned.
export const isPlinkoX=game=>game?.id==='ind74_official_plinkox';
const tableValid=(game,table)=>Array.isArray(table)&&table.length===game.rows+1&&table.every(value=>Number.isSafeInteger(value)&&value>=0);
export function plinkoxRiskAvailable(game,risk){
 if(!isPlinkoX(game)||!['low','medium','high'].includes(risk)||!game.riskLevels?.some(level=>level.id===risk&&level.implemented===true))return false;
 const complete=['low','medium','high'].every(name=>tableValid(game,game.bucketTablesBps?.[name]));
 return risk==='low'?tableValid(game,game.bucketTablesBps?.low??game.bucketMultipliersBps):complete;
}
export function plinkoxTable(game,risk){
 if(!plinkoxRiskAvailable(game,risk))throw Error('This risk version is not available.');
 return game.bucketTablesBps?.[risk]??game.bucketMultipliersBps;
}
export function plinkoxBatch(game,perBallStake,options={}){
 if(!isPlinkoX(game))throw new TypeError('The Plinko X definition is required.');
 if(typeof perBallStake!=='string'||!/^(?:0|[1-9][0-9]{0,12})\.[0-9]{2}$/.test(perBallStake))throw Error('Use a valid stake per ball.');
 const ballAmount=options.ballAmount??game.defaultBallAmount,risk=options.risk??game.defaultRisk;
 if(!game.ballAmounts?.includes(ballAmount))throw Error('Choose a supported ball amount.');
 if(!plinkoxRiskAvailable(game,risk))throw Error('This risk version is not available.');
 const perBall=BigInt(perBallStake.replace('.','')),step=BigInt(game.ballStakeStepMinor),minimum=BigInt(game.minBallStakeMinor);
 if(perBall<minimum||perBall%step!==0n)throw Error('Use a whole-number stake per ball within the limits.');
 const total=perBall*BigInt(ballAmount);
 return{risk,ballAmount,perBallBetMinor:String(perBall),totalBetMinor:String(total),totalStake:String(total/100n)+'.'+String(total%100n).padStart(2,'0')};
}
