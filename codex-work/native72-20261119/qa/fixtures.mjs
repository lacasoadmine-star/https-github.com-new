// Local browser QA only. No network, credentials, database, or production wallet.
import {randomBytes} from 'node:crypto';
import {extendWithNative72} from '../railway-recovery/native72-deployed.mjs';

export const core=extendWithNative72({MATH:{games:{},betLevels:[]},publicGames:()=>[]},{enabled:true,deluxeEnabled:true});
export const scenarios=['cycle','win','loss','max-wheel','reject-once','interrupted-once'];
const cents=value=>{const [whole,fraction='']=String(value).split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0').slice(0,2));};
const decimal=value=>`${value<0n?'-':''}${(value<0n?-value:value)/100n}.${String((value<0n?-value:value)%100n).padStart(2,'0')}`;
const error=(detail,status=400)=>Object.assign(Error(detail),{status});

function outcome(gameId,bet,scenario,index){
 const model=core.getGame(gameId);
 const drawResult=(stops,ticket=0)=>{const draws=[...stops,ticket];return core.spin(gameId,bet,{draw:()=>draws.shift()});};
 if(scenario==='cycle')scenario=index%3===0?'win':index%3===1?'loss':'max-wheel';
 if(scenario==='loss'){
  for(let a=0;a<model.strips[0].length;a++)for(let b=0;b<model.strips[1].length;b++)for(let c=0;c<model.strips[2].length;c++){
   const result=drawResult([a,b,c]);if(cents(result.finalWin)===0n)return result;
  }
  throw Error('NO_LOSS_FIXTURE_FOUND');
 }
 const highest=Object.entries(model.paytable).sort((a,b)=>b[1][3]-a[1][3])[0][0];
 const symbol=scenario==='max-wheel'?highest:model.symbols.find(s=>model.paytable[s]);
 const stops=model.strips.map(strip=>strip.indexOf(symbol));
 const ticket=scenario==='max-wheel'?model.wheel.weights.slice(0,-1).reduce((sum,n)=>sum+n,0):0;
 return drawResult(stops,ticket);
}

export class FixtureSession {
 constructor(contracts){this.contracts=contracts;this.scenario='cycle';this.delayMs=450;this.gambleOutcome='win';this.reset();}
 reset(){this.sessionId=randomBytes(32).toString('hex');this.authenticated=true;this.balanceMinor=100000n;this.rounds=[];this.tokens=new Map();this.gambleTokens=new Map();this.gambles=new Map();this.scenarioUsed=false;this.requests={spins:0,gambles:0,replays:0};}
 get balance(){return decimal(this.balanceMinor);}
 snapshot(){return {authenticated:this.authenticated,sessionId:this.sessionId,balance:this.balance,currency:'ETB',simulated:true,scenario:this.scenario,delayMs:this.delayMs,gambleOutcome:this.gambleOutcome,rounds:this.rounds.length,requests:{...this.requests},productionTransactions:0};}
 session(){return this.authenticated?{authenticated:true,sessionId:this.sessionId,currency:'ETB',balance:this.balance}:{authenticated:false};}
 configure({scenario,delayMs,gambleOutcome,action}={}){
  if(scenario!==undefined){if(!scenarios.includes(scenario))throw error('UNKNOWN_QA_SCENARIO');this.scenario=scenario;this.scenarioUsed=false;}
  if(delayMs!==undefined){if(!Number.isInteger(delayMs)||delayMs<0||delayMs>20000)throw error('INVALID_QA_DELAY');this.delayMs=delayMs;}
  if(gambleOutcome!==undefined){if(!['win','loss'].includes(gambleOutcome))throw error('INVALID_QA_GAMBLE_OUTCOME');this.gambleOutcome=gambleOutcome;}
  if(action==='reset')this.reset();else if(action==='expire')this.authenticated=false;else if(action==='resume')this.authenticated=true;else if(action!==undefined)throw error('INVALID_QA_ACTION');
  return this.snapshot();
 }
 assertSession(header){if(!this.authenticated)throw error('PLAYER_SESSION_EXPIRED',401);if(header!==this.sessionId)throw error('MACHINE_SESSION_CHANGED',403);}
 model(id){return core.getGame(id);}
 state(id){return {gameId:id,...core.modelIdentity(id),currentMathVersion:core.modelIdentity(id).mathVersion,freeSpinsRemaining:0};}
 history(){return {items:this.rounds.map(result=>({id:result.roundId,created_at:result.createdAt,result_json:result}))};}
 round(id){const result=this.rounds.find(row=>row.roundId===id);if(!result)throw error('ROUND_NOT_FOUND',404);return result;}
 spin(body,header){
  this.assertSession(header);this.requests.spins++;
  const {gameId,bet,roundToken,mathVersion}=body;
  if(!/^[a-f0-9-]{36}$/.test(roundToken||''))throw error('GAME_BET_OR_TOKEN_INVALID');
  const existing=this.tokens.get(roundToken);
  if(existing){if(existing.gameId!==gameId||existing.bet!==bet)throw error('GAME_BET_OR_TOKEN_INVALID');this.requests.replays++;return existing;}
  const model=this.model(gameId);
  if(!model.betLevels.includes(bet))throw error('GAME_BET_OR_TOKEN_INVALID');
  if(mathVersion!==model.mathVersion)throw error('GAME_RULES_UPDATED_RELOAD',409);
  if(cents(bet)>this.balanceMinor)throw error('INSUFFICIENT_FUNDS',402);
  if(this.scenario==='reject-once'&&!this.scenarioUsed){this.scenarioUsed=true;throw error('HOUSE_RESERVE_INSUFFICIENT',503);}
  const result=outcome(gameId,bet,this.scenario,this.rounds.length),win=cents(result.finalWin),before=this.balanceMinor,after=before-cents(bet)+win;
  const receipt={currency:'ETB',balanceBefore:decimal(before),chargedStake:bet,finalWin:decimal(win),balanceAfter:decimal(after),netChange:decimal(win-cents(bet))};
  Object.assign(result,receipt,{walletReceipt:receipt,freeSpinsRemaining:0,totalWinningLines:result.winLines.length,roundBreakdown:{winLines:result.winLines.length,stages:1,wheelMultiplier:result.wheelMultiplier,mathVersion:result.mathVersion},createdAt:new Date().toISOString(),qaSimulated:true});
  const contract=this.contracts.get(gameId);contract.validateRound(result,model,bet);
  this.balanceMinor=after;this.tokens.set(roundToken,result);this.rounds.unshift(result);this.gambles.clear();this.gambles.set(result.roundId,{attempt:0,stake:win});
  if(this.scenario==='interrupted-once'&&!this.scenarioUsed){this.scenarioUsed=true;throw error('QA_SIMULATED_RESPONSE_INTERRUPTION',503);}
  return result;
 }
 gamble(body,header){
  this.assertSession(header);this.requests.gambles++;
  const {roundId,choice,roundToken,expectedStake,expectedAttempt}=body;
  if(!/^[a-f0-9-]{36}$/.test(roundToken||'')||!['RED','BLACK'].includes(choice))throw error('INVALID_ACTION');
  const existing=this.gambleTokens.get(roundToken);
  if(existing){if(existing.roundId!==roundId||existing.choice!==choice)throw error('INVALID_ACTION');this.requests.replays++;return existing;}
  const parent=this.round(roundId),model=this.model(parent.gameId),state=this.gambles.get(roundId);
  if(!state||state.stake===0n||state.attempt>=model.features.gambleRounds)throw error('GAMBLE_NOT_AVAILABLE',409);
  if(expectedStake===undefined||expectedAttempt!==state.attempt+1||cents(expectedStake)!==state.stake)throw error('GAMBLE_STATE_CHANGED',409);
  if(model.rules.gamble.maxStake&&state.stake>cents(model.rules.gamble.maxStake))throw error('GAMBLE_STAKE_LIMIT',409);
  const won=this.gambleOutcome==='win',payout=won?state.stake*2n:0n,after=this.balanceMinor-state.stake+payout;
  const result={roundId,choice,won,cardColor:won?choice:choice==='RED'?'BLACK':'RED',attempt:state.attempt+1,maxAttempts:model.features.gambleRounds,stake:decimal(state.stake),payout:decimal(payout),balanceAfter:decimal(after),currency:'ETB',qaSimulated:true};
  this.contracts.get(parent.gameId).validateGamble(result,model,{roundId,choice,expectedStake,expectedAttempt,parentWin:parent.finalWin});
  this.balanceMinor=after;this.gambles.set(roundId,{attempt:result.attempt,stake:payout});this.gambleTokens.set(roundToken,result);return result;
 }
}
