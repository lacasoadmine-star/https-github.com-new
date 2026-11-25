import assert from 'node:assert/strict';
import model from './verified-model.json' with {type:'json'};
import {createExistingM100Transport,M100_STATE_PATH,M100_ACTION_PATH} from './transport.mjs';
import {VIEW_GAME_ID,BACKEND_GAME_ID,MODEL_VERSION,OPERATOR_RELEASE,clone,NATIVE_SYMBOLS,money} from './model.mjs';
import {quoteM100Grid} from '../rules/quote.mjs';

// Explicit disposable test data. This module is never imported by production.
const key=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const board=[['orange','orange','orange','watermelon','bell'],['orange','orange','orange','orange','bell'],['lemon','orange','orange','orange','bell'],['lemon','orange','cherry','orange','plum']];
const loss=Array.from({length:4},()=>['seven','bell','orange','orange','orange']);
const spin=(n,collectRoundId=null)=>({kind:'SPIN',gameId:VIEW_GAME_ID,currency:'ETB',requestKey:key(n),bet:'1.00',collectRoundId});
const take=(n,id)=>({kind:'TAKE_WIN',gameId:VIEW_GAME_ID,currency:'ETB',requestKey:key(n),roundId:id});
const gamble=(n,id,choice='red')=>({kind:'GAMBLE',gameId:VIEW_GAME_ID,currency:'ETB',requestKey:key(n),roundId:id,choice});
function storage(){const map=new Map();return{map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};}
export function createM100NativeFixture({winning=true,mutateModel=null,storageImpl=storage()}={}){
 const game={...clone(model),published:true,launchable:true,operatorRelease:{id:OPERATOR_RELEASE,providerPrivateMathVerified:false,completeReferenceParityVerified:false}};
 mutateModel?.(game);
 let state={authenticated:true,currency:'ETB',sessionId:'isolated-player-session-a',balance:'100.00',game,round:null,accepting:true,other_active_game:null};
 let counter=1,dropAction=null,pauseResponse=null,corruptReply=null,postCount=0,drawCount=0;const cache=new Map(),requests=[],bodies=new Map();
 function rawRound(stake){const grid=winning?board:loss,quote=quoteM100Grid({grid,betMinor:stake,multiplier:3});
  return{game_id:BACKEND_GAME_ID,model_version:MODEL_VERSION,round_id:key(10000+counter++),version:0,status:quote.winMinor>0n?'active':'settled',stakeMinor:String(stake),
   grid:Array.from({length:5},(_,column)=>grid.map(row=>NATIVE_SYMBOLS.indexOf(row[column]))),feature:{multiplier:3},
   wins:quote.lines.map(line=>({line:line.lineId,symbol:String(NATIVE_SYMBOLS.indexOf(line.symbol)),cells:Array.from({length:line.count},(_,column)=>[column,line.path[column]]),payoutMinor:String(line.winMinor)})),
   currentCashoutMinor:String(quote.winMinor),payoutMinor:'0',gambleHistory:[]};}
 const fetcher=async(path,options)=>{
  requests.push({path,options:clone({...options,signal:undefined})});assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');
  if(path===M100_STATE_PATH){assert.equal(options.method,'GET');return Response.json(clone(state));}
  assert.equal(path,M100_ACTION_PATH);assert.equal(options.method,'POST');assert.equal(options.headers['X-Zplay-Library-Session'],state.sessionId);
  const body=JSON.parse(options.body);postCount++;
  assert.equal(body.game_id,BACKEND_GAME_ID);assert.equal(body.model_version,MODEL_VERSION);
  if(cache.has(body.request_id)){assert.deepEqual(body,bodies.get(body.request_id));return Response.json({...clone(cache.get(body.request_id)),replayed:true});}
  const balance=BigInt(state.balance.replace('.',''));
  if(body.type==='start'){
   assert.notEqual(state.round?.status,'active','host requires separate collection');assert.deepEqual(body.options,{autoCollect:false});drawCount++;
   const stake=BigInt(body.stake.replace('.',''));state={...state,balance:money(balance-stake),round:rawRound(stake)};
  }else{
   assert.equal(body.round_id,state.round.round_id);assert.equal(body.expected_version,state.round.version);assert.equal(state.round.status,'active');
   const round=clone(state.round),amount=BigInt(round.currentCashoutMinor);round.version++;
   if(body.action==='collect'){round.status='settled';round.payoutMinor=String(amount);state={...state,balance:money(balance+amount),round};}
   else{assert.equal(body.action,'gamble');assert.deepEqual(Object.keys(body.input),['color']);const next=amount*2n;
    round.gambleHistory.push({color:body.input.color,won:true,payoutMinor:String(next)});round.currentCashoutMinor=String(next);state={...state,round};}
  }
  const reply={...clone(state),status:'SUCCESS',request_id:body.request_id,game_id:BACKEND_GAME_ID};
  cache.set(body.request_id,clone(reply));bodies.set(body.request_id,clone(body));
  if(dropAction===body.action||dropAction===body.type){dropAction=null;throw new TypeError('isolated lost response after commit');}
  if(pauseResponse){const pause=pauseResponse;pauseResponse=null;await pause;}
  if(corruptReply){const transform=corruptReply;corruptReply=null;return Response.json(transform(clone(reply)));}
  return Response.json(reply);
 };
 const make=()=>createExistingM100Transport({fetcher,storage:storageImpl,sessionStorage:storage(),keyFactory:()=>key(9000+counter++)});
 return{make,fetcher,storage:storageImpl,requests,cache,get state(){return state},set state(value){state=value},get posts(){return postCount},get draws(){return drawCount},drop(action){dropAction=action},pause(promise){pauseResponse=promise},corrupt(fn){corruptReply=fn}};
}


export {key,board,loss,spin,take,gamble,storage};
