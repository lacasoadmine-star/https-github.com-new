// Deterministic data for local tests only. Never included in the deployed manifest.
import {games} from '../src/games.mjs';
export const guard='a'.repeat(64),hash='b'.repeat(64);
export function model(game){return {id:game.modelId,enabled:true,freshReleaseReady:true,currency:'ETB',mathVersion:'local-test-v1',mathSha256:hash,engineVersion:'local-test-engine-v1',betLevels:['0.10','0.20','0.50','1.00'],features:{gambleRounds:3},paytable:Object.fromEntries(Object.keys(game.symbols).map(s=>[s,{'3':5}]))};}
export function round(game,body,{win='0.00',before='100.00',after='99.90',isFree=false}={}){return {gameId:game.modelId,currency:'ETB',roundId:'11111111-1111-4111-8111-111111111111',bet:body.bet,mathVersion:model(game).mathVersion,engineVersion:model(game).engineVersion,mathSha256:hash,grid:game.preview,wheelMultiplier:2,winLines:[],finalWin:win,isFree,freeSpinsRemaining:0,balanceAfter:after,walletReceipt:{currency:'ETB',balanceBefore:before,chargedStake:isFree?'0.00':body.bet,finalWin:win,balanceAfter:after}};}
export function fixtures(path,body){
 const game=games.find(g=>g.modelId===body?.gameId)||games[1];
 if(path==='/api/machine-session')return {authenticated:true,currency:'ETB',sessionId:guard,balance:'100.00'};
 if(path.startsWith('/api/slots/games/'))return model(games.find(g=>path.endsWith(g.modelId)));
 if(path==='/api/slots/fresh-state')return {authenticated:true,currency:'ETB',sessionGuard:guard,balance:'100.00',game:model(games[1]),round:null,blockedByActiveGame:null};
 if(path==='/api/slots/spin')return round(game,body,{after:((10000-Math.round(Number(body.bet)*100))/100).toFixed(2)});
 if(path==='/api/slots/rounds')return {items:[]};
 return null;
}
