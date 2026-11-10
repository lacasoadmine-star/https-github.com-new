// Loopback-only UI review using the retained native evaluator. No database,
// real account, production credentials, payment or outgoing POST is available.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {installConstructionPlayer} from '../../deploy/smartsoft/construction-player-r15.mjs';
import {installConstructionLibrary} from '../../deploy/smartsoft/construction-library-r15.mjs';
import {installMobileDisplay} from '../../deploy/smartsoft/mobile-display-player-r15.mjs';

const modelRoot=process.env.SMARTSOFT_REVIEW_MODELS;
if(!modelRoot)throw Error('SMARTSOFT_REVIEW_MODELS_REQUIRED');
const model=await import(pathToFileURL(resolve(modelRoot,'smartsoft-operator-rounds.mjs')));
const configRoot=process.env.SMARTSOFT_REVIEW_SOURCES||'/workspace/superwin/deploy/smartsoft';
const sourcePath=resolve(configRoot,'construction-sources-r15.mjs');
let librarySources;try{librarySources=(await import(pathToFileURL(sourcePath))).default;}catch{}
const scope=new Set(model.GAME_IDS),sessionId='local-review-'+randomUUID(),receipts=new Map(),rounds=new Map(),history=new Map();
const minor=value=>BigInt(value.replace('.',''));
const money=value=>`${value/100n}.${String(value%100n).padStart(2,'0')}`;
let simulatedBalance=1000000n,actions=0,blockedWrites=0;
const blockedWritePaths=new Set();
const rng=()=>randomBytes(4).readUInt32BE()/4294967296;
const result=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
function snapshot(id){
 const record=rounds.get(id),game=structuredClone(model.publicGameConfigs[id]);
 game.launchable=true;game.published=true;
 if(game.currencyAdaptation)game.currencyAdaptation.productionLaunchable=true;
 const round=record?{...model.publicState(record.state,Date.now()),round_id:record.id,game_id:id,
  model_version:record.state.modelVersion,version:record.version}:null;
 return {review:true,authenticated:true,sessionId,game_id:id,game,currency:'ETB',balance:money(simulatedBalance),
  round,accepting:true,otherActiveGame:null,server_now:Date.now()};
}
function applyTransition(id,transition,record){
 simulatedBalance-=BigInt(transition.debitMinor);
 if(transition.state.status==='settled')simulatedBalance+=BigInt(transition.payoutMinor);
 record.state=transition.state;rounds.set(id,record);
 if(transition.state.status==='settled'){
  const rows=history.get(id)||[];rows.unshift({createdAt:record.state.startedAt,settledAt:Date.now(),round:snapshot(id).round});history.set(id,rows);
 }
}
async function api(request){
 const url=new URL(request.url),path=url.pathname,id=url.searchParams.get('game_id');
 if(path==='/__review/status')return result({localReview:true,actions,outgoingWrites:0,blockedWrites,blockedWritePaths:[...blockedWritePaths],rounds:rounds.size,realMoneyRoundsPlaced:0});
 if(path==='/api/remaining20/state'&&request.method==='GET'&&scope.has(id))return result(snapshot(id));
 if(path==='/api/remaining20/history'&&request.method==='GET'&&scope.has(id))return result({game_id:id,currency:'ETB',rows:history.get(id)||[]});
 if(path!=='/api/remaining20/action'||request.method!=='POST')return result({error:'LOCAL_REVIEW_ENDPOINT_ONLY'},404);
 if(request.headers.get('origin')!==url.origin||request.headers.get('X-Zplay-Library-Session')!==sessionId)return result({error:'LOCAL_REVIEW_SESSION_REQUIRED'},403);
 const text=await request.text();if(text.length>8192)return result({error:'BODY_TOO_LARGE'},413);
 const body=JSON.parse(text),gameId=body.game_id;
 if(!scope.has(gameId))return result({error:'LOCAL_REVIEW_TITLE_UNAVAILABLE'},404);
 if(receipts.has(body.request_id)){
  const saved=receipts.get(body.request_id);return saved.text===text?result({...saved.result,replayed:true}):result({error:'REQUEST_ID_CONFLICT'},409);
 }
 if(body.model_version!==model.definitions[gameId].version)return result({error:'GAME_RULES_UPDATED_RELOAD'},409);
 let record=rounds.get(gameId),transition;
 if(body.type==='start'){
  if(record?.state.status==='active')return result({error:'FINISH_ACTIVE_ROUND'},409);
  if(minor(body.stake)>simulatedBalance)return result({error:'INSUFFICIENT_FUNDS'},409);
  transition=model.evaluateDraftRound(gameId,{...body.options,stakeMinor:String(minor(body.stake))},rng,Date.now());
  record={id:randomUUID(),version:0,state:null};
 }else if(body.type==='action'){
  if(record?.id!==body.round_id||record.version!==body.expected_version)return result({error:'ROUND_VERSION_CHANGED'},409);
  transition=model.act(record.state,{type:body.action,...body.input},rng,Date.now());record={...record,version:record.version+1};
 }else return result({error:'INVALID_REVIEW_ACTION'},422);
 applyTransition(gameId,transition,record);actions++;
 const response={status:'SUCCESS',request_id:body.request_id,...snapshot(gameId)};
 receipts.set(body.request_id,{text,result:response});return result(response);
}

const remote='https://superwin-player.apdiy61.workers.dev',cache=new Map();
const previous={async fetch(request){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/__review/'))return api(request);
 if(!['GET','HEAD'].includes(request.method)){blockedWrites++;blockedWritePaths.add(url.pathname);return result({error:'REMOTE_WRITES_FORBIDDEN'},405);}
 url.protocol='https:';url.host=new URL(remote).host;url.port='';
 const key=request.method+' '+url.href;
 if(cache.has(key))return cache.get(key).clone();
 const response=await fetch(url,{method:request.method,redirect:'manual',headers:{accept:request.headers.get('accept')||'*/*'}});
 const headers=new Headers(response.headers);for(const key of ['content-encoding','content-length','set-cookie'])headers.delete(key);
 let bytes=new Uint8Array(await response.arrayBuffer());
 if(headers.get('content-type')?.includes('text/html')){
  let html=new TextDecoder().decode(bytes);
  html=html.replace('</body>','<div style="position:fixed;bottom:0;left:0;right:0;z-index:9999999;text-align:center;background:#542b00;color:white;font:12px system-ui;padding:4px">LOCAL REVIEW · Simulated ETB · No real money</div></body>');
  bytes=new TextEncoder().encode(html);
 }
 const result=new Response(bytes,{status:response.status,headers});if(response.ok)cache.set(key,result.clone());return result;
}};
const library=librarySources?installConstructionLibrary(previous,librarySources):previous;
const app=installMobileDisplay(installConstructionPlayer(previous));
const port=Number(process.env.SMARTSOFT_REVIEW_PORT||8765);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('INVALID_LOOPBACK_PORT');
const server=createServer(async(req,res)=>{
 try{
  if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){res.writeHead(403);res.end();return;}
  const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>8192)throw Error('BODY_TOO_LARGE');chunks.push(chunk);}
  const request=new Request('http://127.0.0.1:'+port+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
  const response=await app.fetch(request,{PORTAL:'player',EXPANSION100:{fetch:r=>library.fetch(r,{}, {})}},{});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()));
 }catch(error){const status=Number.isInteger(error.status)?error.status:500;res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({error:error.message}));}
});
server.listen(port,'127.0.0.1',()=>console.log('Loopback review http://127.0.0.1:'+port+'; simulated money only; no database; remote writes blocked.'));
