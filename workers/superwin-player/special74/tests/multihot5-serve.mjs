// Explicit, disposable loopback account fixture. Never part of a production package.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {model,evaluate} from '../operator-math/multi-hot-5.mjs';
import {createOperatorSlotCore} from '../operator-math/retained-core-adapter.mjs';
if(process.env.SPECIAL74_FIXTURES!=='1')throw Error('Local fixture opt-in required');
const root=resolve(import.meta.dirname,'..'),guard='e'.repeat(64),mathSha256='ac71bda352d058883ac414757e03e22daedacc94855cb36c34c0bc2c8a59f34c';
const existing={MATH:{games:{},lines:{}},getGame(){},modelIdentity(){},receiptGame(){},spin(){throw Error('No legacy fixture games');},publicGames(){return [];}};
const core=createOperatorSlotCore(existing,{sha256:mathSha256,enabled:true});
const game={...core.getGame(model.id),wagerAvailability:'available'};
let balance=10000,round=null,starts=0,gambles=0,dropNext=false;const receipts=new Map();
const money=n=>(n/100).toFixed(2);
const state=()=>({authenticated:true,sessionGuard:guard,currency:'ETB',balance:money(balance),game,round,blockedByActiveGame:null});
const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost:4182');const send=(data,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};try{
 if(url.pathname==='/__fixture/reset'){balance=10000;round=null;starts=0;gambles=0;dropNext=false;receipts.clear();return send({ok:true});}
 if(url.pathname==='/__fixture/stats')return send({balance,starts,gambles,requests:[...receipts.keys()]});
 if(url.pathname==='/__fixture/drop-next'){dropNext=true;return send({ok:true});}
 if(url.pathname==='/api/slots/fresh-state')return send(state());
 if(url.pathname==='/api/slots/rounds')return send({items:round?[{round_id:round.result.roundId,game_code:model.id,charged_stake:round.result.bet,total_win:round.result.finalWin,result_json:round.result}]:[]});
 if(['/api/slots/spin','/api/slots/gamble'].includes(url.pathname)){
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);
  if(body.sessionGuard!==guard)return send({error:{code:'PLAYER_SESSION_CHANGED'}},409);
  if(receipts.has(body.roundToken))return send(receipts.get(body.roundToken));
  if(body.replayOnly)return send({error:{code:'ROUND_NOT_CONFIRMED'}},409);
  let result;
  if(url.pathname.endsWith('/spin')){
   if(body.gameId!==model.id||body.mathVersion!==game.mathVersion||body.engineVersion!==game.engineVersion||body.mathSha256!==mathSha256)return send({error:{code:'GAME_RULES_UPDATED_RELOAD'}},409);
   if(!game.betLevels.includes(body.bet))return send({error:{code:'INVALID_BET'}},422);
   const stake=Math.round(Number(body.bet)*100);if(stake>balance)return send({error:{code:'INSUFFICIENT_FUNDS'}},402);
   const proof=evaluate({betMinor:stake,multiplier:2,grid:[['plum','lemon','cherry'],['orange','orange','orange'],['grapes','777','golden_bell']]}),before=balance,payout=Number(proof.payoutMinor);balance=balance-stake+payout;starts++;
   result={roundId:randomUUID(),gameId:model.id,currency:'ETB',bet:body.bet,mathVersion:game.mathVersion,engineVersion:game.engineVersion,mathSha256,grid:proof.grid,wheelMultiplier:proof.multiplier,winLines:proof.wins.map(w=>({line:w.line,symbol:w.symbol,payout:money(Number(w.amountMinor)),positions:w.cells})),finalWin:money(payout),balanceAfter:money(balance),isFree:false,freeSpinsRemaining:0,walletReceipt:{currency:'ETB',balanceBefore:money(before),chargedStake:body.bet,finalWin:money(payout),balanceAfter:money(balance)}};
   round={result,gamble:{available:payout>0,attempt:0,maxAttempts:5,stake:money(payout)}};
  }else{
   if(body.roundId!==round?.result.roundId||!round.gamble.available||body.expectedAttempt!==round.gamble.attempt+1||body.expectedStake!==round.gamble.stake)return send({error:{code:'GAMBLE_STATE_CHANGED'}},409);
   const stake=Math.round(Number(round.gamble.stake)*100),before=balance,revealed='RED',won=body.choice===revealed,payout=won?stake*2:0;balance=balance-stake+payout;gambles++;const attempt=round.gamble.attempt+1;
   result={roundId:body.roundId,choice:body.choice,revealed,won,attempt,maxAttempts:5,payout:money(payout),balanceAfter:money(balance),walletReceipt:{currency:'ETB',balanceBefore:money(before),chargedStake:money(stake),finalWin:money(payout),balanceAfter:money(balance)}};
   round.gamble={available:won&&attempt<5,attempt,maxAttempts:5,stake:money(payout),lastResult:result};
  }
  receipts.set(body.roundToken,result);if(dropNext){dropNext=false;return send({error:{code:'RESPONSE_UNAVAILABLE_AFTER_COMMIT'}},503);}return send(result);
 }
 const suffix=decodeURIComponent(url.pathname.replace(/^\/special-games\/?/,'')),file=resolve(root,suffix.startsWith('assets/')?suffix:'src/'+(suffix===''||suffix==='001-multi-hot-5'?'game-multihot5.html':suffix));
 if(!file.startsWith(root+'/'))return send({error:'NOT_FOUND'},404);const data=await readFile(file);res.writeHead(200,{'content-type':({'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.otf':'font/otf'})[extname(file)]||'application/octet-stream'});res.end(data);
 }catch(error){res.writeHead(404);res.end('Not found');}});
server.listen(4182,'127.0.0.1',()=>console.log('Disposable Multi Hot 5 account fixture on http://127.0.0.1:4182/special-games/001-multi-hot-5'));
