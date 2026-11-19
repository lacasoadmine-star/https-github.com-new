import test from 'node:test';
import assert from 'node:assert/strict';
import {MultiHot40Live,GAME_ID,validateRound} from './live-controller.mjs';
import {WalletAdapter} from '../dedicated-resume/shared/wallet.mjs';
const model={id:GAME_ID,enabled:true,mathVersion:'mh40.v1',engineVersion:'existing.v1',mathSha256:'a'.repeat(64),betLevels:['1.00','2.00']};
const session={authenticated:true,currency:'ETB',balance:'100.00',sessionId:'f'.repeat(64)};
const receipt={gameId:GAME_ID,roundId:'round-1',mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:model.mathSha256,bet:'1.00',finalWin:'0.00',balance:'99.00',grid:Array.from({length:5},()=>[1,2,3,4]),wheelMultiplier:3};
const make=({error=null,requests}={})=>{
 const storage=new Map(),calls=[],flags={};
 const memory={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const scene={start:()=>calls.push('start'),stop:()=>calls.push('stop'),reset:()=>calls.push('reset'),reveal:async r=>{calls.push('reveal');assert.equal(r.roundId,'round-1');},pause:()=>calls.push('pause'),resume:()=>calls.push('resume'),dispose:()=>calls.push('dispose')};
 let spins=0;
 const fetcher=async (url,options)=>{calls.push(url);const body=options.body?JSON.parse(options.body):null;
  let data=url==='/api/machine-session'?session:url==='/api/slots/games/'+GAME_ID?model:null;
  if(url==='/api/slots/spin'){spins++;requests?.push(body);if(error){return {ok:false,status:error.status,json:async()=>({detail:error.code})}}data=receipt;}
  assert.ok(data,'unexpected endpoint: '+url);
  return {ok:true,status:200,json:async()=>data};
 };
 const api=new WalletAdapter({fetcher,storage:memory});
 return {game:new MultiHot40Live({api,scene}),calls,storage,get spins(){return spins},scene};
};
test('boot stays on the existing ETB session and model routes; never uses a detached API',async()=>{const h=make();assert.equal(await h.game.boot(),true);assert.equal(h.game.phase,'ready');assert.equal(h.game.stake,'1.00');assert.equal(h.calls.includes('/api/slots/games/'+GAME_ID),true);assert.equal(h.game.bet('3.00'),false);h.game.dispose();});
test('SPIN uses existing saved-token wallet adapter and server receipt to land reels',async()=>{const requests=[];const h=make({requests});await h.game.boot();assert.equal(await h.game.spin(),true);assert.equal(h.spins,1);assert.equal(requests[0].gameId,GAME_ID);assert.equal(requests[0].bet,'1.00');assert.equal(h.game.snapshot().balance,'99.00');assert.equal(h.storage.size,0);assert.equal(h.game.phase,'ready');assert.ok(h.calls.includes('reveal'));h.game.dispose();});
test('definite rejected request resets the scene, never leaves CONFIRM stuck',async()=>{const h=make({error:{status:402,code:'INSUFFICIENT_FUNDS'}});await h.game.boot();assert.equal(await h.game.spin(),false);assert.equal(h.game.phase,'ready');assert.equal(h.game.active,false);assert.equal(h.storage.size,0);assert.ok(h.calls.includes('reset'));h.game.dispose();});
test('ambiguous server errors retain exact request for safe confirmation',async()=>{const h=make({error:{status:503,code:'TEMPORARY_ERROR'}});await h.game.boot();assert.equal(await h.game.spin(),false);assert.equal(h.game.phase,'confirm');assert.equal(h.storage.size,1);assert.equal(h.game.snapshot().error,'TEMPORARY_ERROR');h.game.dispose();});
test('AUTO selection never starts without START PLAY',async()=>{const h=make();await h.game.boot();assert.equal(h.game.armAuto(5),true);assert.equal(h.spins,0);assert.equal(h.game.autoArmed,5);h.game.stopAuto();assert.equal(h.spins,0);h.game.dispose();});
test('hidden and blur suspend animation/audio and stop autoplay',async()=>{const h=make();await h.game.boot();h.game.armAuto(4);h.game.visibility(true);assert.ok(h.calls.includes('pause'));assert.equal(h.game.autoArmed,0);assert.equal(await h.game.spin(),false);h.game.visibility(false);h.game.focus(false);assert.equal(await h.game.spin(),false);h.game.focus(true);assert.ok(h.calls.includes('resume'));h.game.dispose();});
test('reject swapped receipts, grid, and broken multiplier',()=>{assert.throws(()=>validateRound({...receipt,gameId:'foxy_hot_20_native'},{model,bet:'1.00'}),/WRONG_GAME_RECEIPT/);assert.throws(()=>validateRound({...receipt,grid:[[1]]},{model,bet:'1.00'}),/MH40_GRID_INVALID/);assert.throws(()=>validateRound({...receipt,wheelMultiplier:99},{model,bet:'1.00'}),/MH40_MULTIPLIER_INVALID/);});

test('401/403 session rejection fails closed and clears CONFIRM without replay',async()=>{const h=make({error:{status:403,code:'MACHINE_SESSION_CHANGED'}});await h.game.boot();assert.equal(await h.game.spin(),false);assert.equal(h.game.phase,'error');assert.equal(h.game.active,false);assert.equal(h.storage.size,0);h.game.dispose();});

test('balanceAfter is authoritative; the renderer never calculates a local ETB debit',async()=>{
 const storage=new Map(),calls=[];
 const api=new WalletAdapter({
  storage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  fetcher:async (path,options={})=>{
   calls.push(path);
   const data=path==='/api/machine-session'?session:
    path==='/api/slots/games/'+GAME_ID?{...model,reels:5,rows:4,paylines:40,symbolNames:['a','b','c','d','e','f','g','h']}:
    path==='/api/slots/spin'?{...receipt,grid:Array.from({length:5},()=>['a','b','c','d']),balance:undefined,balanceAfter:'102.00',finalWin:'3.00'}:
    null;
   assert.ok(data,'unknown endpoint '+path);
   return {ok:true,status:200,json:async()=>data};
  }
 });
 const scene={start(){},stop(){},reset(){},pause(){},resume(){},dispose(){},setSymbolNames(names){assert.equal(names.length,8);},async reveal(r){assert.equal(r.balance,'102.00');}};
 const game=new MultiHot40Live({api,scene});
 assert.equal(await game.boot(),true);
 assert.equal(await game.spin(),true);
 assert.equal(game.snapshot().balance,'102.00');
 assert.equal(game.snapshot().lastReceipt.finalWin,'3.00');
 assert.equal(calls.filter(x=>x==='/api/slots/spin').length,1);
 game.dispose();
});
test('settled receipt with failed client presentation never triggers CONFIRM or another debit',async()=>{
 const h=make();await h.game.boot();
 h.game.scene.reveal=async()=>{throw Error('CANVAS_PRESENTATION_FAILED');};
 assert.equal(await h.game.spin(),true);
 assert.equal(h.game.phase,'ready');
 assert.equal(h.game.snapshot().error,'ROUND_SETTLED_PRESENTATION_ERROR');
 assert.equal(h.storage.size,0);
 assert.equal(h.spins,1);
 assert.ok(h.calls.includes('reset'));
 h.game.dispose();
});
test('rejects foreign payline and 5x3 layouts before any wager',()=>{
 assert.throws(()=>validateRound({...receipt,grid:[[0,1,2,3,4]]},{model,bet:'1.00'}),/MH40_GRID_INVALID/);
 assert.throws(()=>validateRound({...receipt,grid:Array.from({length:5},()=>[0,1,2,8])},{model,bet:'1.00'}),/MH40_SYMBOL_INVALID/);
});

test('accepts the existing engine column-major receipt and refuses a transposed one',()=>{
 assert.equal(validateRound(receipt,{model,bet:'1.00'}).grid.length,5);
 const transposed=Array.from({length:4},(_,row)=>Array.from({length:5},(_,col)=>receipt.grid[col][row]));
 assert.throws(()=>validateRound({...receipt,grid:transposed},{model,bet:'1.00'}),/MH40_GRID_INVALID/);
});
