import test from 'node:test';
import assert from 'node:assert/strict';
import {LibraryAccount,libraryRound} from '../src/financial/library-account.mjs';

const profile={id:'fixture-only',modelId:'burningice10_native',columns:5,rows:3,multiplier:false,symbols:{'1':1,'2':2,'3':3}};
const grid=()=>Array.from({length:5},()=>['1','2','3']);
const round=()=>({game_id:profile.modelId,gameId:profile.modelId,round_id:'e8313723-a817-44d0-99e1-3ecff849de48',status:'active',version:0,model_version:'fixture-v1',modelVersion:'fixture-v1',grid:grid(),stakeMinor:'10',baseWinMinor:'30',currentCashoutMinor:'30',actions:['collect'],wins:[{payoutMinor:'30',cells:[[0,1],[1,1],[2,1]]}],frames:[{grid:grid(),wins:[{payoutMinor:'30',cells:[[0,1],[1,1],[2,1]]}]}]});
const state=()=>({authenticated:true,currency:'ETB',sessionId:'e'.repeat(64),game_id:profile.modelId,model_version:'fixture-v1',game:{id:profile.modelId,version:'fixture-v1',stakeMinorValues:['10'],launchable:true},accepting:true,balance:'99.90',round:round()});

test('presentation preserves the server result and only transposes positions',()=>{
 const raw=round(),before=structuredClone(raw),result=libraryRound(raw,profile);
 assert.equal(result.native,raw);assert.equal(result.finalWin,'0.30');
 assert.deepEqual(result.winLines[0].positions,[[1,0],[1,1],[1,2]]);
 assert.deepEqual(raw,before);
});

test('an invalid intermediate feature frame cannot enter the renderer',()=>{
 const raw=round();raw.frames[0].wins[0].cells[0]=[5,0];
 assert.throws(()=>libraryRound(raw,profile),/INVALID_NATIVE_WIN/);
 raw.frames[0].wins[0].cells[0]=[0,0];raw.frames[0].wins[0].payoutMinor='-1';
 assert.throws(()=>libraryRound(raw,profile),/INVALID_NATIVE_AMOUNT/);
});

test('malformed successful replies keep the exact request pending for recovery',async()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 const requests=[];
 const account=new LibraryAccount(profile,{storage,fetcher:async(_url,options)=>{
  const request=JSON.parse(options.body);requests.push(request);
  const wire={...state(),status:'SUCCESS',request_id:request.request_id};
  wire.round.frames[0].wins[0].cells[0]=[99,99];
  return {ok:true,json:async()=>wire};
 }});
 account.state=account.snapshot({...state(),round:null});
 await assert.rejects(account.spin('0.10'),/INVALID_NATIVE_WIN/);
 const id=account.pending.body.request_id;
 await assert.rejects(account.retry(),/INVALID_NATIVE_WIN/);
 assert.equal(requests.length,2);assert.equal(requests[1].request_id,id);
 assert.equal(account.state.balance,'99.90');assert.ok(storage.getItem(account.key));
});
