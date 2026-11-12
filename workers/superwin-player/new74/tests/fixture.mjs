// Deterministic data for local tests only. Never included in the deployed manifest.
import {games} from '../src/games.mjs';
export const guard='a'.repeat(64),hash='b'.repeat(64);
let nativeFixtureRound=null,nativeFixtureBalance=10000;
function nativeFixture(body){const game=games.find(g=>g.transport==='library'),id=game.modelId;
 if(body?.type==='start'){const stake=Math.round(Number(body.stake)*100);nativeFixtureBalance-=stake;nativeFixtureRound={round_id:crypto.randomUUID(),game_id:id,gameId:id,model_version:'fixture-native-v1',modelVersion:'fixture-native-v1',status:'active',version:0,stakeMinor:String(stake),baseWinMinor:'200',currentCashoutMinor:'200',payoutMinor:null,grid:Array.from({length:5},(_,c)=>game.preview.map(r=>r[c])),wins:[],frames:[],feature:{multiplier:2},actions:['collect','gamble'],gambleAvailable:true,gambleAttempts:0,gambleAttemptsRemaining:5,gambleHistory:[]};}
 if(body?.action==='collect'){nativeFixtureBalance+=Number(nativeFixtureRound.currentCashoutMinor);Object.assign(nativeFixtureRound,{status:'settled',version:nativeFixtureRound.version+1,payoutMinor:nativeFixtureRound.currentCashoutMinor,actions:[],gambleAvailable:false});}
 return {...(body?{status:'SUCCESS',request_id:body.request_id}:{}),authenticated:true,sessionId:guard,currency:'ETB',game_id:id,model_version:'fixture-native-v1',game:{id,version:'fixture-native-v1',launchable:true,stakeMinorValues:['40','80','120']},accepting:true,other_active_game:null,balance:(nativeFixtureBalance/100).toFixed(2),round:nativeFixtureRound};
}
export function model(game){return {id:game.modelId,enabled:true,freshReleaseReady:true,currency:'ETB',mathVersion:'local-test-v1',mathSha256:hash,engineVersion:'local-test-engine-v1',betLevels:['0.10','0.20','0.50','1.00'],features:{gambleRounds:3},paytable:Object.fromEntries(Object.keys(game.symbols).map(s=>[s,{'3':5}]))};}
export function round(game,body,{win='0.00',before='100.00',after='99.90',isFree=false}={}){return {gameId:game.modelId,currency:'ETB',roundId:'11111111-1111-4111-8111-111111111111',bet:body.bet,mathVersion:model(game).mathVersion,engineVersion:model(game).engineVersion,mathSha256:hash,grid:game.preview,wheelMultiplier:2,winLines:[],finalWin:win,isFree,freeSpinsRemaining:0,balanceAfter:after,walletReceipt:{currency:'ETB',balanceBefore:before,chargedStake:isFree?'0.00':body.bet,finalWin:win,balanceAfter:after}};}
export function fixtures(path,body){
 if(path==='/api/fixtures/reset'){nativeFixtureRound=null;nativeFixtureBalance=10000;return {reset:true};}
 if(path.startsWith('/api/remaining20/'))return nativeFixture(body);
 const game=games.find(g=>g.modelId===body?.gameId)||games[1];
 if(path==='/api/machine-session')return {authenticated:true,currency:'ETB',sessionId:guard,balance:'100.00'};
 if(path.startsWith('/api/slots/games/'))return model(games.find(g=>path.endsWith(g.modelId)));
 if(path==='/api/slots/fresh-state')return {authenticated:true,currency:'ETB',sessionGuard:guard,balance:'100.00',game:model(games[1]),round:null,blockedByActiveGame:null};
 if(path==='/api/slots/spin')return round(game,body,{after:((10000-Math.round(Number(body.bet)*100))/100).toFixed(2)});
 if(path==='/api/slots/rounds')return {items:[]};
 return null;
}
