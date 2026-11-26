// Explicit synthetic loopback fixtures. This module is never included in a Worker release.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {randomUUID} from 'node:crypto';
if(process.env.SPECIAL74_FIXTURES!=='1')throw Error('Local fixture opt-in required');
const root=resolve(import.meta.dirname,'..'),guard='d'.repeat(64),version='synthetic-ui-fixture-v1';
let model='burningice10_native';
const rows=()=>model==='burningice40_native'?4:3;
const stakes=()=>model==='burningice40_native'?[40,80,120]:[10,20,30];
let balance=10000,round=null,starts=0,failNext=false;const receipts=new Map();
const money=n=>(n/100).toFixed(2);
const grid=()=>Array.from({length:5},(_,c)=>Array.from({length:rows()},(_,r)=>r===0?'1':String((c+r)%8+1)));
function state(){return {authenticated:true,sessionId:guard,currency:'ETB',game_id:model,model_version:version,accepting:true,balance:money(balance),other_active_game:null,round,game:{id:model,version,launchable:true,stakeMinorValues:stakes().map(String)}};}
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost:4181'),send=(d,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(d));};
 if(url.pathname==='/__fixture/reset'){const requested=url.searchParams.get('game')||'burningice10_native';if(!['burningice10_native','burningice40_native'].includes(requested))return send({error:'INVALID_FIXTURE'},400);model=requested;balance=10000;round=null;starts=0;receipts.clear();failNext=false;return send({ok:true});}
 if(url.pathname==='/__fixture/drop-next'){failNext=true;return send({ok:true});}
 if(url.pathname==='/__fixture/stats')return send({starts,balance,gameId:model,rows:rows(),requests:[...receipts.keys()]});
 if(url.pathname==='/api/remaining20/state')return send(state());
 if(url.pathname==='/api/remaining20/action'){
  if(req.headers['x-zplay-library-session']!==guard)return send({error:'INVALID_SESSION'},403);
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);
  if(receipts.has(body.request_id))return send(receipts.get(body.request_id));
  if(body.game_id!==model||body.model_version!==version)return send({error:'INVALID_MODEL'},400);
  if(body.type==='start'){
   if(round?.status==='active')return send({error:'ROUND_ACTIVE'},409);
   const stake=Math.round(Number(body.stake)*100);if(!stakes().includes(stake))return send({error:'INVALID_STAKE'},422);
   starts++;balance-=stake;
   round={round_id:randomUUID(),game_id:model,gameId:model,model_version:version,modelVersion:version,status:'active',version:0,stakeMinor:String(stake),baseWinMinor:'100',currentCashoutMinor:'100',payoutMinor:null,grid:grid(),wins:[{payoutMinor:'100',cells:[[0,0],[1,0],[2,0]]}],frames:[{grid:grid(),wins:[],feature:{}}],feature:{},actions:['collect'],gambleAvailable:false,gambleAttempts:0,gambleAttemptsRemaining:0,gambleHistory:[]};
  }else if(body.action==='collect'){
   if(body.round_id!==round?.round_id||body.expected_version!==round.version||round.status!=='active')return send({error:'ROUND_ALREADY_SETTLED'},409);
   balance+=Number(round.currentCashoutMinor);round={...round,status:'settled',version:round.version+1,payoutMinor:round.currentCashoutMinor,actions:[]};
  }else return send({error:'INVALID_ACTION'},400);
  const result={...state(),status:'SUCCESS',request_id:body.request_id};receipts.set(body.request_id,result);
  if(failNext){failNext=false;return send({error:'RESPONSE_UNAVAILABLE_AFTER_COMMIT'},503);}
  return send(result);
 }
 const suffix=decodeURIComponent(url.pathname.replace(/^\/special-games\/?/,''));
 const path=resolve(root,suffix.startsWith('assets/')?suffix:'src/'+(suffix===''||suffix==='007-burning-ice-10'?'game.html':suffix==='008-burning-ice-40'?'game40.html':suffix));
 if(!path.startsWith(root+'/'))return send({error:'NOT_FOUND'},404);
 const data=await readFile(path);res.writeHead(200,{'content-type':({'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.otf':'font/otf'})[extname(path)]||'application/octet-stream'});res.end(data);
 }catch(error){res.writeHead(404);res.end('Not found');}});
server.listen(4181,'127.0.0.1',()=>console.log('Explicit synthetic Special Games fixtures on http://127.0.0.1:4181'));
