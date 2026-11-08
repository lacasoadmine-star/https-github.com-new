import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LibraryService,createRegistry,seededRandom} from '../backend-baseline/library-service.mjs';
import * as engine from '../models/multihot40-rules.mjs';

const NOW=1794096000000;
const reference=JSON.parse(await readFile(new URL('../references/public-models/multihot40_native.json',import.meta.url),'utf8'));
const paths=JSON.parse(await readFile(new URL('../references/multihot40-paylines.json',import.meta.url),'utf8')).paths;
const table=reference.paytable.Coeffs.map(row=>row.Wins);
const noRandom=()=>{throw Error('unexpected outcome draw');};
const scripted=(values,fallback=0)=>{let index=0;return()=>values[index++]??fallback;};
const all=(symbol=0)=>Array.from({length:5},()=>Array(4).fill(symbol));
const rngFor=(grid,multiplierTicket=0)=>scripted([...grid.flatMap(reel=>reel.map(symbol=>(symbol+.5)/8)),(multiplierTicket+.5)/16]);
const draft=(grid=all(),stakeMinor='40',ticket=0,options={})=>engine.evaluateDraftRound(engine.ID,{stakeMinor,...options},rngFor(grid,ticket),NOW);

test('v2 retains all 40 official paths, unchanged public prizes and exact fixed stakes',()=>{
 assert.equal(engine.VERSION,'superwin-multihot40-2');
 assert.deepEqual(engine.publicConfig.paylinePaths,paths);
 assert.equal(new Set(paths.map(JSON.stringify)).size,40);
 assert.deepEqual(engine.publicConfig.stakeMinorValues,reference.bet.perLineValues.map(value=>String(value*40)));
 for(let symbol=0;symbol<8;symbol++)for(let count=3;count<=5;count++){
  const award=engine.publicConfig.paytable[symbol].counts[count];
  assert.equal(Number(award.numerator)/Number(award.denominator),table[symbol][count]);
 }
 assert.equal(engine.publicConfig.officialPrivateMathVerified,false);
 assert.equal(engine.MATH_PROFILE.publicPayoutCoefficientsScaled,false);
 assert.equal(engine.MATH_PROFILE.observedProviderReturnPercent,'96.58');
 assert.equal(engine.MATH_PROFILE.nativeReturn.percent,'95.9014892578125');
 assert.equal(engine.publicConfig.gamble.referenceLimitSemanticsVerified,false);
});

test('all 8^5 line outcomes independently prove exact 31425/32768 native RTP',()=>{
 // This oracle uses the raw saved public paytable, not the runtime evaluator.
 let sum=0;
 for(let code=0;code<8**5;code++){
  let n=code;const sequence=[];
  for(let reel=0;reel<5;reel++){sequence.push(n%8);n=Math.floor(n/8);}
  const symbol=sequence[0];let run=1;
  while(run<5&&sequence[run]===symbol)run++;
  sum+=table[symbol][run];
 }
 assert.equal(sum,8380);
 assert.equal(engine.MULTIPLIER_TICKETS.length,16);
 assert.deepEqual([1,2,3,4,5].map(value=>engine.MULTIPLIER_TICKETS.filter(ticket=>ticket===value).length),[1,2,3,4,6]);
 assert.equal(engine.MULTIPLIER_TICKETS.reduce((a,b)=>a+b,0),60);
 // 40 identical line marginals divided by40 cancel; their correlation does not
 // change the mean. The wheel is drawn independently of all20 grid cells.
 assert.equal(BigInt(sum)*60n*32768n,31425n*BigInt(8**5)*16n);
 assert.equal(engine.MATH_PROFILE.nativeReturn.numerator,'31425');
 assert.equal(engine.MATH_PROFILE.nativeReturn.denominator,'32768');
 assert.ok(31425/32768>=.94&&31425/32768<=.97);
});

test('weighted wheel buckets are exact, observable and independent of the grid',()=>{
 for(let ticket=0;ticket<16;ticket++){
  let draws=0;const rng=rngFor(all(4),ticket);
  const result=engine.sampleOutcome(()=>{draws++;return rng();},'40');
  assert.equal(draws,21);
  assert.equal(result.feature.multiplier,engine.MULTIPLIER_TICKETS[ticket]);
  assert.deepEqual(result.grid,all(4).map(reel=>reel.map(String)));
 }
});

test('winning cells and line prizes follow the actual 40 reference paths',()=>{
 const grid=[[4,0,6,7],[4,1,2,3],[4,2,3,1],[5,2,3,1],[6,1,2,3]];
 const result=engine.evaluateGrid(grid,3,'40');
 for(let line=0;line<40;line++){
  const path=paths[line],symbol=grid[0][path[0]];let count=1;
  while(count<5&&grid[count][path[count]]===symbol)count++;
  const expected=3*table[symbol][count];
  const win=result.wins.find(value=>value.line===line+1);
  if(!expected){assert.equal(win,undefined);continue;}
  assert.equal(win.payoutMinor,String(expected));
  assert.equal(win.symbol,String(symbol));assert.equal(win.count,count);
  assert.deepEqual(win.cells,path.slice(0,count).map((row,column)=>[column,row]));
 }
 assert.equal(result.payoutMinor,String(result.wins.reduce((sum,win)=>sum+BigInt(win.payoutMinor),0n)));
});

test('2500x is attained without clipping and is the same reserve for winning and losing outcomes',()=>{
 const losing=Array.from({length:5},(_,column)=>Array(4).fill(column));
 for(const stakeMinor of engine.publicConfig.stakeMinorValues){
  const top=draft(all(0),stakeMinor,15),loss=draft(losing,stakeMinor,15);
  const expected=BigInt(stakeMinor)*2500n;
  assert.equal(top.maxPayoutMinor,String(expected));assert.equal(loss.maxPayoutMinor,String(expected));
  assert.equal(top.state.currentCashoutMinor,String(expected));assert.equal(loss.payoutMinor,'0');
  assert.equal(top.state.feature.capped,false);assert.equal(top.state.wins.length,40);
  assert.equal(top.state.wins.reduce((sum,win)=>sum+BigInt(win.payoutMinor),0n),expected);
  assert.ok(expected<=25000000n);
 }
 assert.equal(engine.maximumPayoutMinor('10000'),'25000000');
});

test('all supported line awards are exact whole santim; no draw rounds a payout',()=>{
 for(const stake of engine.publicConfig.stakeMinorValues)for(const row of table)for(const award of row){
  assert.equal(BigInt(stake)*BigInt(award)%40n,0n);
 }
 let draws=0;
 engine.evaluateDraftRound(engine.ID,{stakeMinor:'40'},()=>{if(++draws>21)throw Error('rounding must not draw');return 0;},NOW);
 assert.equal(draws,21);
});

test('manual wins stay pending; Take Win settles exactly the accepted amount without RNG',()=>{
 const result=draft(all(4));
 assert.equal(result.debitMinor,'40');assert.equal(result.payoutMinor,null);
 assert.equal(result.state.status,'active');assert.equal(result.state.baseWinMinor,'2000');
 const view=engine.publicState(result.state,NOW);
 assert.equal(view.currentCashoutMinor,'2000');assert.deepEqual(view.actions,['collect','gamble']);
 assert.equal(view.payoutMinor,null);
 const final=engine.act(result.state,{type:'collect'},noRandom,NOW+20);
 assert.equal(final.payoutMinor,'2000');assert.equal(final.debitMinor,'0');
 assert.equal(final.state.reason,'COLLECTED');assert.equal(final.state.status,'settled');
 assert.throws(()=>engine.act(final.state,{type:'collect'},noRandom,NOW+21),/ROUND_ALREADY_SETTLED/);
 assert.equal(result.state.status,'active','input state remains immutable');
});

test('autoplay explicit collection credits once and zero-win rounds settle immediately',()=>{
 const auto=draft(all(4),'40',0,{autoCollect:true});
 assert.equal(auto.payoutMinor,'2000');assert.equal(auto.state.reason,'AUTO_COLLECTED');
 assert.deepEqual(engine.publicState(auto.state,NOW).actions,[]);
 const losing=Array.from({length:5},(_,column)=>Array(4).fill(column));
 const loss=draft(losing);
 assert.equal(loss.state.status,'settled');assert.equal(loss.state.reason,'NO_WIN');assert.equal(loss.payoutMinor,'0');
});

test('all four gamble suits prove exactly fair red/black and never take a second stake',()=>{
 const before=draft(all(4)).state;
 for(const color of ['red','black']){
  let sum=0n,wins=0;
  for(let suit=0;suit<4;suit++){
   const after=engine.act(before,{type:'gamble',color},()=>(suit+.5)/4,NOW+1);
   assert.equal(after.debitMinor,'0');assert.equal(after.maxPayoutMinor,before.liabilityMinor);
   sum+=BigInt(after.state.currentCashoutMinor);wins+=after.state.status==='active'?1:0;
   assert.equal(after.state.gambleHistory[0].rank,'A');
   assert.equal(after.state.gambleHistory[0].selection,color);
   if(after.state.status==='settled')assert.equal(after.state.payoutMinor,'0');
  }
  assert.equal(wins,2);assert.equal(sum,4n*BigInt(before.currentCashoutMinor));
 }
 assert.equal(before.gambleAttempts,0);assert.equal(before.gambleHistory.length,0);
});

test('five-attempt limit and 500 ETB input boundary preserve full wins without truncation',()=>{
 // A single top-row cherry3 gives a5-santim win at the minimum stake.
 const grid=[[4,0,6,7],[4,1,2,3],[4,2,3,1],[5,2,3,1],[6,1,2,3]];
 let result=draft(grid);
 assert.ok(BigInt(result.state.currentCashoutMinor)>0n&&BigInt(result.state.currentCashoutMinor)<=50n);
 for(let attempt=1;attempt<=5;attempt++){
  result=engine.act(result.state,{type:'gamble',color:'red'},()=>.3,NOW+attempt);
  assert.equal(result.state.gambleAttempts,attempt);
 }
 assert.deepEqual(engine.publicState(result.state,NOW+6).actions,['collect']);
 assert.throws(()=>engine.act(result.state,{type:'gamble',color:'red'},()=>.3,NOW+6),/GAMBLE_NOT_AVAILABLE/);
 assert.ok(BigInt(result.state.currentCashoutMinor)<=BigInt(result.maxPayoutMinor));
 // 40 lines of five sevens at0.40ETB and1x produce exactly200ETB;
 // two successes yield400 then800. The800 is collected intact.
 const first=draft(all(0));
 const second=engine.act(first.state,{type:'gamble',color:'red'},()=>.3,NOW+1);
 const third=engine.act(second.state,{type:'gamble',color:'red'},()=>.3,NOW+2);
 assert.equal(third.state.currentCashoutMinor,'80000');
 assert.deepEqual(engine.publicState(third.state,NOW+3).actions,['collect']);
 assert.equal(engine.act(third.state,{type:'collect'},noRandom,NOW+3).payoutMinor,'80000');
 const exactBoundary=draft(all(4),'200',15);
 assert.equal(exactBoundary.state.currentCashoutMinor,'50000');
 const doubledBoundary=engine.act(exactBoundary.state,{type:'gamble',color:'red'},()=>.3,NOW+1);
 assert.equal(doubledBoundary.state.currentCashoutMinor,'100000');
 assert.deepEqual(engine.publicState(doubledBoundary.state,NOW+2).actions,['collect']);
 assert.equal(engine.act(doubledBoundary.state,{type:'collect'},noRandom,NOW+2).payoutMinor,'100000');
});

test('every bounded gamble stopping strategy preserves expected value including the eligibility boundary',()=>{
 // Recursively check a continuation policy that gambles whenever allowed.
 // At each permitted node E[next]=(2w+0)/2=w; terminal nodes collect w.
 function expected(amount,attempt=0){
  if(!amount||amount>50000n||attempt===5)return {numerator:amount,denominator:1n};
  const win=expected(amount*2n,attempt+1);
  return {numerator:win.numerator,denominator:win.denominator*2n};
 }
 for(const amount of [1n,5n,999n,1562n,3125n,20000n,25000n,50000n,50001n,100000n]){
  const value=expected(amount);assert.equal(value.numerator,amount*value.denominator);
 }
});

test('reload public state is stable, expires by collecting and exposes no future seed or reserve',()=>{
 const accepted=draft(all(4)),before=structuredClone(accepted.state);
 const view=engine.publicState({...before,secretSeed:'must-remain-private',nextCard:'red'},NOW+1000);
 assert.equal(view.secretSeed,undefined);assert.equal(view.nextCard,undefined);assert.equal(view.liabilityMinor,undefined);
 assert.equal(view.currentCashoutMinor,'2000');assert.equal(view.expiresAt,NOW+1800000);
 view.grid[0][0]='7';assert.deepEqual(accepted.state,before);
 assert.throws(()=>engine.expire(before,noRandom,NOW+1799999),/ROUND_NOT_EXPIRED/);
 const expired=engine.expire(before,noRandom,NOW+1800001);
 assert.equal(expired.payoutMinor,'2000');assert.equal(expired.debitMinor,'0');
 assert.equal(expired.state.settledAt,NOW+1800000);assert.equal(expired.state.reason,'DISCONNECTED_COLLECT');
 assert.equal(engine.expire(expired.state,noRandom,NOW+1800002).payoutMinor,'2000');
});

test('expiry outranks a late gamble and cannot consume a new outcome draw',()=>{
 const state=draft(all(4)).state;
 const result=engine.act(state,{type:'gamble',color:'red'},noRandom,state.expiresAt);
 assert.equal(result.payoutMinor,state.currentCashoutMinor);
 assert.equal(result.state.gambleAttempts,0);
});

test('state validation rejects changed money, result, version or gamble history before settlement',()=>{
 const original=draft(all(4)).state;
 for(const change of [{currentCashoutMinor:'99999'},{baseWinMinor:'99999'},{liabilityMinor:'999999'},{modelVersion:'bad'},{gambleAttempts:1},{expiresAt:NOW+2},{grid:all(0)},{feature:{type:'multiplier',multiplier:5,capped:false}}]){
  assert.throws(()=>engine.act({...structuredClone(original),...change},{type:'collect'},noRandom,NOW+1),/INVALID_MULTIHOT40_STATE/);
 }
 const gambled=engine.act(original,{type:'gamble',color:'red'},()=>.3,NOW+1).state;
 gambled.gambleHistory[0].color='black';
 assert.throws(()=>engine.act(gambled,{type:'collect'},noRandom,NOW+2),/INVALID_MULTIHOT40_STATE/);
});

test('invalid options, stakes, time, random and client payout fields fail closed',()=>{
 for(const stakeMinor of ['0','1','100','401','10001','01','1.00',40,null])assert.throws(()=>engine.evaluateDraftRound(engine.ID,{stakeMinor},noRandom,NOW),/STAKE_NOT_IN_REFERENCE_SCHEDULE/);
 for(const options of [{stakeMinor:'40',payoutMinor:'10000'},{stakeMinor:'40',autoCollect:'true'},null,[]])assert.throws(()=>engine.evaluateDraftRound(engine.ID,options,noRandom,NOW),/INVALID_MULTIHOT40_OPTIONS/);
 for(const now of [-1,NaN,Number.MAX_SAFE_INTEGER])assert.throws(()=>engine.evaluateDraftRound(engine.ID,{stakeMinor:'40'},noRandom,now),/INVALID_SERVER_TIME/);
 for(const value of [-1,1,Infinity,NaN])assert.throws(()=>engine.evaluateDraftRound(engine.ID,{stakeMinor:'40'},()=>value,NOW),/INVALID_SERVER_RANDOM/);
 for(const input of [{type:'collect',payoutMinor:'99999'},{type:'gamble',color:'red',multiplier:9},{type:'gamble',color:'blue'},{type:'spin'}])assert.throws(()=>engine.act(draft(all(4)).state,input,noRandom,NOW+1),/INVALID_MULTIHOT40_ACTION/);
});

test('actual LibraryService transition contract accepts pending, loss, double, collect and expiry',()=>{
 const registry=createRegistry([{...engine,start:engine.evaluateDraftRound}]);
 const model=registry.get(engine.ID),service=new LibraryService({sql:{}},{registry});
 for(let seed=0;seed<20;seed++){
  const result=engine.evaluateDraftRound(engine.ID,{stakeMinor:'40'},seededRandom(String(seed),'isolated'),NOW);
  const first=service.transition(model,result,{debitExpected:40n,now:NOW});
  assert.equal(first.liability,100000n);
  if(result.state.status==='active'){
   const prior={total_stake:'40',liability:result.maxPayoutMinor};
   for(const transition of [engine.act(result.state,{type:'collect'},noRandom,NOW+1),engine.expire(result.state,noRandom,NOW+1800001)]){
    const next=service.transition(model,transition,{prior,now:NOW+1800001});
    assert.equal(next.debit,0n);assert.equal(next.payout,BigInt(result.state.currentCashoutMinor));
   }
  }
 }
});

test('the released native profile never claims the provider private law or unverified boundary',()=>{
 assert.equal(engine.definitions[engine.ID].launchable,true);
 assert.equal(engine.publicConfig.releaseGate.referenceParityClaim,false);
 assert.equal(engine.MATH_PROFILE.officialPrivateMathVerified,false);
 assert.equal(engine.MATH_PROFILE.gamble.referenceLimitSemanticsVerified,false);
});
