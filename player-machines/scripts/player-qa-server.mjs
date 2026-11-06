// Disposable localhost-only Superwin QA server. Never connects to a production wallet.
// Run: node scripts/player-qa-server.mjs --qa [--port=8767]
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID,randomInt} from 'node:crypto';
import {spin,publicGames,getGame,gambleDraw} from '../test/server-core-snapshot.mjs';
import {decimal,units,validateRound,validateGamble} from '../public/contract.mjs';
import {gameConfig,RELEASE} from '../public/registry.mjs';

if(!process.argv.includes('--qa'))throw Error('QA is opt-in: pass --qa. This server is local and uses invented balances only.');
const port=Number(process.argv.find(x=>x.startsWith('--port='))?.split('=')[1]||8767);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local QA port');
const host='127.0.0.1',origin=`http://${host}:${port}`,root=fileURLToPath(new URL('../public/',import.meta.url)).replace(/\/$/,'');
const games=new Set(['multi_hot_5_video','hot_foxy_20','wild_multi_stars','multi_hot_100']),sessions=new Map(),requests=[];
const cents=s=>units(s)/100n,cash=n=>decimal(n),cookieName='superwin_local_qa';
const fail=(status,detail)=>Object.assign(Error(detail),{status,detail});
const check=(condition,status,detail)=>{if(!condition)throw fail(status,detail);};
const publicModel=id=>({...publicGames().find(g=>g.id===id),enabled:true});
function ledger(s,delta,kind,roundId){const before=s.balance;s.balance+=delta;s.house-=delta;check(s.balance>=0n,500,'QA_NEGATIVE_BALANCE');s.ledger.push({sequence:s.ledger.length+1,kind,roundId,playerDelta:String(delta),houseDelta:String(-delta),balanceBefore:cash(before),balanceAfter:cash(s.balance)});}
function parseCookie(req){const value=String(req.headers.cookie||'').split(';').find(x=>x.trim().startsWith(cookieName+'='))?.trim().slice(cookieName.length+1);return value?sessions.get(value):null;}
function newSession(balance='100000.00'){const s={key:randomBytes(24).toString('hex'),sessionId:randomBytes(32).toString('hex'),balance:0n,house:0n,ledger:[],rounds:new Map(),roundIds:new Map(),actions:new Map(),free:new Map(),plans:new Map(),spinPosts:0,gamblePosts:0,roundSettlements:0,gambleSettlements:0,opening:balance};ledger(s,cents(balance),'synthetic_opening',null);sessions.set(s.key,s);return s;}
function gameState(s,id){if(!s.free.has(id))s.free.set(id,{remaining:0,bet:'2.00'});return s.free.get(id);}
function queuedPlan(s,id){if(!s.plans.has(id))s.plans.set(id,{});return s.plans.get(id);}
function idempotent(map,token,parameters,make){const prior=map.get(token);if(prior){check(prior.parameters===parameters,409,'IDEMPOTENCY_PARAMETER_CONFLICT');return {result:prior.result,replayed:true};}const result=make();map.set(token,{parameters,result});return {result,replayed:false};}
function tokenValid(v){return typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);}
function resultFor(id,bet,isFree,desired){
 if(desired==='scatter'){
  const g=getGame(id),stops=g.reelStrips.map((strip,c)=>c<3?strip.indexOf('scatter'):randomInt(strip.length));
  check(stops.every(x=>x>=0),400,'QA_SCATTER_UNAVAILABLE');let n=0;
  return spin(id,bet,{isFree,draw:max=>n<stops.length?stops[n++]:randomInt(max)});
 }
 for(let i=0;i<30000;i++){const r=spin(id,bet,{isFree});if(!desired||desired==='random'||desired==='win'&&cents(r.finalWin)>0n&&!r.bonusSpinsAwarded||desired==='loss'&&cents(r.finalWin)===0n&&!r.bonusSpinsAwarded)return r;}
 throw fail(500,'QA_OUTCOME_SEARCH_EXHAUSTED');
}
function settleSpin(s,req){
 const {gameId:id,bet,roundToken}=req;check(games.has(id)&&tokenValid(roundToken)&&publicModel(id).betLevels.includes(bet),422,'GAME_BET_OR_TOKEN_INVALID');
 s.spinPosts++;
 return idempotent(s.rounds,roundToken,JSON.stringify({gameId:id,bet}),()=>{
  const free=gameState(s,id),plan=queuedPlan(s,id);check(!free.remaining||free.bet===bet,409,'FREE_SPIN_BET_LOCKED');const isFree=free.remaining>0,stake=isFree?0n:cents(bet);check(s.balance>=stake,402,'INSUFFICIENT_FUNDS');
  const r=resultFor(id,bet,isFree,plan.nextOutcome);delete plan.nextOutcome;const before=s.balance,pay=cents(r.finalWin);
  ledger(s,-stake,'spin_stake',r.roundId);ledger(s,pay,'spin_win',r.roundId);if(isFree)free.remaining--;free.remaining+=r.bonusSpinsAwarded;free.bet=bet;
  const receipt={currency:'ETB',balanceBefore:cash(before),chargedStake:cash(stake),finalWin:cash(pay),balanceAfter:cash(s.balance)};
  Object.assign(r,receipt,{walletReceipt:receipt,freeSpinsRemaining:free.remaining});validateRound(r,gameConfig(id),bet);
  s.roundIds.set(r.roundId,{result:r,created_at:new Date().toISOString(),gambleAttempt:0,gambleValue:r.finalWin,consumed:false});s.roundSettlements++;return r;
 });
}
function settleGamble(s,req){
 const {roundId,choice,roundToken}=req;check(tokenValid(roundToken)&&['RED','BLACK'].includes(choice),422,'INVALID_CHOICE');s.gamblePosts++;
 return idempotent(s.actions,roundToken,JSON.stringify({roundId,choice}),()=>{
  const item=s.roundIds.get(roundId);check(item,404,'ROUND_NOT_FOUND');const g=getGame(item.result.gameId),plan=queuedPlan(s,g.id),free=gameState(s,g.id);
  check(!free.remaining,409,'COLLECT_BONUS_FIRST');check(item.gambleAttempt<g.features.gambleRounds,409,'GAMBLE_LIMIT');check(!item.consumed&&cents(item.gambleValue)>0n,409,'NO_GAMBLE_WINNINGS');const before=s.balance,stake=cents(item.gambleValue);check(before>=stake,402,'INSUFFICIENT_FUNDS');
  const draw=plan.nextGamble==='win'?()=>0:plan.nextGamble==='lose'?()=>9999:undefined;delete plan.nextGamble;const core=gambleDraw(choice,item.gambleValue,draw),pay=cents(core.payout);ledger(s,-stake,'gamble_stake',roundId);ledger(s,pay,'gamble_win',roundId);item.gambleAttempt++;item.gambleValue=cash(pay);item.consumed=!core.won;
  const r={...core,roundId,attempt:item.gambleAttempt,maxAttempts:g.features.gambleRounds,balanceAfter:cash(s.balance)};validateGamble(r,gameConfig(g.id),{roundId,choice,expectedStake:cash(stake),expectedAttempt:item.gambleAttempt});s.gambleSettlements++;return r;
 });
}
function sessionReport(s){const ledgerSum=s.ledger.reduce((n,e)=>n+BigInt(e.playerDelta),0n),balanced=s.ledger.every(e=>BigInt(e.playerDelta)+BigInt(e.houseDelta)===0n);return {synthetic:true,opening:s.opening,balance:cash(s.balance),houseBalance:String(s.house),spinPosts:s.spinPosts,roundSettlements:s.roundSettlements,gamblePosts:s.gamblePosts,gambleSettlements:s.gambleSettlements,ledgerEntries:s.ledger.length,ledgerBalanced:balanced&&ledgerSum===s.balance&&s.balance+s.house===0n,free:Object.fromEntries(s.free),rounds:[...s.roundIds.values()].map(x=>({roundId:x.result.roundId,gameId:x.result.gameId,bet:x.result.bet,chargedStake:x.result.chargedStake,finalWin:x.result.finalWin,freeSpinsRemaining:x.result.freeSpinsRemaining,stops:x.result.stops,wheelMultiplier:x.result.wheelMultiplier})),ledger:s.ledger};}
async function jsonBody(req){let chunks=[],size=0;for await(const b of req){size+=b.length;check(size<=16384,413,'QA_BODY_TOO_LARGE');chunks.push(b);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{throw fail(400,'QA_INVALID_JSON');}}
function json(res,status,body,headers={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-superwin-qa':'synthetic-local-only',...headers});res.end(JSON.stringify(body));}
const server=http.createServer(async(req,res)=>{
 const start=Date.now(),url=new URL(req.url,origin);let code=200;
 try{
  check(req.headers.host===`${host}:${port}`,403,'QA_LOOPBACK_HOST_REQUIRED');if(!['GET','HEAD'].includes(req.method))check(!req.headers.origin||req.headers.origin===origin,403,'QA_ORIGIN_MISMATCH');
  if(url.pathname==='/qa/session'&&req.method==='POST'){const body=await jsonBody(req);const opening=body.balance||'100000.00';check(cents(opening)<=100000000000n,400,'QA_BALANCE_LIMIT');const s=newSession(opening);json(res,200,{synthetic:true,authenticated:true,currency:'ETB',balance:cash(s.balance)},{'set-cookie':`${cookieName}=${s.key}; Path=/; HttpOnly; SameSite=Strict`});return;}
  const s=parseCookie(req);
  if(url.pathname==='/health'){json(res,200,{synthetic:true,productionConnected:false,status:'ready'});return;}
  if(url.pathname==='/api/machine-session'){json(res,200,s?{authenticated:true,synthetic:true,sessionId:s.sessionId,currency:'ETB',balance:cash(s.balance)}:{authenticated:false,synthetic:true});return;}
  if(url.pathname.startsWith('/api/slots/games/')){const id=url.pathname.split('/').at(-1);check(games.has(id),404,'GAME_NOT_FOUND');json(res,200,publicModel(id));return;}
  if(url.pathname.startsWith('/qa/')||url.pathname.startsWith('/api/slots/')){
   check(s,401,'QA_SESSION_REQUIRED');
   if(url.pathname==='/qa/report'){json(res,200,sessionReport(s));return;}
   if(url.pathname==='/qa/plan'&&req.method==='POST'){
    const body=await jsonBody(req);check(games.has(body.gameId),400,'QA_GAME_REQUIRED');const plan=queuedPlan(s,body.gameId);if(body.nextOutcome)check(['win','loss','scatter','random'].includes(body.nextOutcome),400,'QA_OUTCOME_INVALID');if(body.nextGamble)check(['win','lose'].includes(body.nextGamble),400,'QA_GAMBLE_INVALID');
    for(const k of ['nextOutcome','nextGamble','dropNextSpinResponse','delayNextSpinMs'])if(body[k]!==undefined)plan[k]=body[k];
    if(body.seedFreeAtZero){check(getGame(body.gameId).features.freeSpins.spins>0,400,'QA_FREE_GAME_INVALID');ledger(s,-s.balance,'synthetic_zero_balance_seed',null);const r=resultFor(body.gameId,body.bet||'2.00',true,'loss'),receipt={currency:'ETB',balanceBefore:'0.00',chargedStake:'0.00',finalWin:'0.00',balanceAfter:'0.00'};Object.assign(r,receipt,{walletReceipt:receipt,freeSpinsRemaining:2});validateRound(r,gameConfig(body.gameId),r.bet);s.roundIds.set(r.roundId,{result:r,created_at:new Date().toISOString(),gambleAttempt:0,gambleValue:'0.00',consumed:true});Object.assign(gameState(s,body.gameId),{remaining:2,bet:r.bet});}
    json(res,200,{synthetic:true,planned:true});return;
   }
   if(url.pathname==='/api/slots/balance'){json(res,200,{currency:'ETB',balance:cash(s.balance),synthetic:true});return;}
   if(url.pathname==='/api/slots/rounds'){json(res,200,{items:[...s.roundIds.values()].reverse().map(x=>({result_json:x.result,round_id:x.result.roundId,created_at:x.created_at}))});return;}
   check(req.method==='POST',405,'METHOD_NOT_ALLOWED');check(req.headers['x-zplay-machine-session']===s.sessionId,403,'MACHINE_SESSION_CHANGED');const body=await jsonBody(req);
   if(url.pathname==='/api/slots/spin'){const plan=queuedPlan(s,body.gameId),drop=!!plan.dropNextSpinResponse,delay=Math.min(10000,Math.max(0,Number(plan.delayNextSpinMs)||0));delete plan.dropNextSpinResponse;delete plan.delayNextSpinMs;const result=settleSpin(s,body);if(delay)await new Promise(r=>setTimeout(r,delay));if(drop){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store','x-superwin-qa':'synthetic-local-only'});res.write('{"interrupted":');await new Promise(r=>setTimeout(r,40));res.destroy();return;}json(res,200,result.result);return;}
   if(url.pathname==='/api/slots/gamble'){json(res,200,settleGamble(s,body).result);return;}
   throw fail(404,'QA_ROUTE_NOT_FOUND');
  }
  let file;if(url.pathname.startsWith('/games/')){const id=url.pathname.split('/').at(-1);check(games.has(id),404,'GAME_NOT_FOUND');const body=(await readFile(resolve(root,'index.html'),'utf8')).replace('{{GAME}}',id);res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-superwin-qa':'synthetic-local-only','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'"});res.end(req.method==='HEAD'?undefined:body);return;}
  if(url.pathname.startsWith('/'+RELEASE+'/')&&url.pathname.split('/').length===3)file=resolve(root,basename(url.pathname));
  else if(url.pathname==='/') {res.writeHead(302,{location:'/games/multi_hot_5_video'});res.end();return;}
  else throw fail(404,'QA_ROUTE_NOT_FOUND');
  check(file.startsWith(root+'/'),403,'QA_PATH_DENIED');await stat(file);const type=file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.mjs')?'application/javascript':file.endsWith('.webp')?'image/webp':'application/octet-stream';res.writeHead(200,{'content-type':type,'cache-control':'no-store','x-superwin-qa':'synthetic-local-only'});res.end(req.method==='HEAD'?undefined:await readFile(file));
 }catch(e){code=e.status||500;json(res,code,{detail:e.detail||e.message,synthetic:true});}
 finally{requests.push({method:req.method,path:url.pathname,status:code,ms:Date.now()-start});if(requests.length>10000)requests.shift();}
});
server.listen(port,host,()=>console.log(JSON.stringify({synthetic:true,productionConnected:false,url:origin,host,port,storage:'disposable in-memory double-entry ledger',authorization:'explicit --qa flag',assets:root})));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
