import test from 'node:test';
import assert from 'node:assert/strict';
import {AutoplayController, autoplayProfile} from '../client/autoplay.mjs';

const MODERN='multihot40_native', LEGACY='burningice_native', SID='session-one';
function host(gameId=MODERN, changes={}) {
  return {game:{id:gameId,version:'v1',launchable:true},sessionId:SID,connected:true,authenticated:true,
    accepting:true,busy:false,pending:false,confirming:false,recoveryBlocked:false,
    otherActiveGame:null,balanceMinor:'10000',round:null,canStart:true,animationRunning:false,...changes};
}
function receipt(id,gameId=MODERN,changes={}) {
  return {round_id:id,game_id:gameId,model_version:'v1',stakeMinor:'100',status:'settled',version:0,payoutMinor:'100',...changes};
}
function begin(gameId=MODERN,changes={}) {
  const auto=new AutoplayController();
  auto.begin({gameId,modelVersion:'v1',sessionId:SID,stakeMinor:'100',count:gameId===LEGACY?10:25,startingBalanceMinor:'10000',...changes});
  return auto;
}
function submit(auto,state) {
  assert.equal(auto.canLaunch(state),true);
  assert.equal(auto.markSubmitted(state.round?.round_id??null),true);
  auto.observe({...state,busy:true,pending:true,canStart:false});
}
function confirmed(auto,state,round,balanceMinor=state.balanceMinor) {
  const next={...state,round,balanceMinor,busy:true,pending:true,canStart:false};
  auto.observe(next);
  const idle={...next,busy:false,pending:false,canStart:round.status!=='active'};
  auto.observe(idle);
  return idle;
}

test('profiles retain the two observed control families and never advertise unfinished gamble or trigger flags',()=>{
  for(const id of [MODERN,'multihot100_native','multihotwildways_native','multihot5wild_native','multihot5superwilds_native','multihotdeluxe_native','safarisimba_native','habeshafortune5_native']) {
    const p=autoplayProfile(id);assert.equal(p.kind,'modern');assert.deepEqual(p.counts,[25,50,100,500,1000]);assert.equal(p.defaultCount,100);
    assert.equal(p.stopFlagsAvailable,false);assert.equal(p.gambleImplemented,false);assert.throws(()=>p.counts.push(1),TypeError);
  }
  for(const id of [LEGACY,'burningice10_native','burningice40_native']) {
    const p=autoplayProfile(id);assert.equal(p.kind,'legacy');assert.deepEqual(p.counts,[10,25,50,75,'continuous']);assert.equal(p.defaultCount,'continuous');
    assert.equal(p.winLimitMeaning,'session-net-gain');assert.equal(p.stopFlagsAvailable,false);
  }
  assert.equal(autoplayProfile('moonstone_native'),null);assert.equal(autoplayProfile('balloon_native'),null);
});

test('every new instance is stopped and only an explicit valid begin creates intent',()=>{
  const auto=new AutoplayController();auto.observe(host());assert.equal(auto.canLaunch(host()),false);
  assert.equal(auto.snapshot().active,false);assert.equal(auto.snapshot().reason,'idle');
  for(const bad of [0,1.5,-1,'-1','01','1.00',NaN,Infinity])assert.throws(()=>begin(MODERN,{stakeMinor:bad}),/INVALID_AUTOPLAY_MONEY/);
  assert.throws(()=>begin(MODERN,{count:10}),/INVALID_AUTOPLAY_COUNT/);
  assert.throws(()=>begin(MODERN,{count:'continuous'}),/INVALID_AUTOPLAY_COUNT/);
  assert.throws(()=>begin('balloon_native'),/AUTOPLAY_GAME_UNSUPPORTED/);
  assert.throws(()=>begin(MODERN,{stopOnBigWin:true}),/AUTOPLAY_STOP_NOT_IN_REFERENCE/);
  assert.throws(()=>begin(MODERN,{lossLimitMinor:0.1}),/INVALID_AUTOPLAY_MONEY/);
  assert.throws(()=>begin(MODERN,{startingBalanceMinor:'99'}),/AUTOPLAY_INSUFFICIENT_BALANCE/);
  const active=begin(LEGACY,{count:'infinite'});assert.equal(active.snapshot().count,'continuous');assert.equal(active.snapshot().remaining,null);
  const reloaded=new AutoplayController(active.snapshot());assert.equal(reloaded.snapshot().active,false);assert.equal(reloaded.canLaunch(host(LEGACY)),false);
});

test('old settled receipt echoes and the pre-busy persistence emission never count or unlock a second submission',()=>{
  const old=receipt('old'),auto=begin(MODERN,{previousRoundId:'old'}),state=host(MODERN,{round:old});
  assert.equal(auto.canLaunch(state),true);assert.equal(auto.markSubmitted('old'),true);
  const persistence={...state,pending:true,busy:false,canStart:false};
  auto.observe(persistence);assert.equal(auto.snapshot().active,true);assert.equal(auto.snapshot().accepted,0);
  assert.equal(auto.canLaunch(persistence),false);assert.equal(auto.markSubmitted('old'),false);
  auto.observe({...state,busy:true,pending:true,canStart:false});assert.equal(auto.snapshot().accepted,0);
  const next=confirmed(auto,state,receipt('new'));
  assert.equal(auto.snapshot().accepted,1);assert.equal(auto.snapshot().completed,1);assert.equal(auto.snapshot().remaining,24);
  auto.observe(next);auto.observe({...next,round:{...next.round,frames:[{},{}]}});
  assert.equal(auto.snapshot().accepted,1);assert.equal(auto.snapshot().completed,1);
});

test('observing the baseline before begin also excludes its later echoes',()=>{
  const auto=new AutoplayController(),state=host(MODERN,{round:receipt('baseline')});auto.observe(state);
  auto.begin({gameId:MODERN,modelVersion:'v1',sessionId:SID,stakeMinor:'100',count:25,startingBalanceMinor:'10000'});
  submit(auto,state);auto.observe({...state,busy:true,pending:true});assert.equal(auto.snapshot().accepted,0);
  assert.equal(auto.snapshot().awaitingReceipt,true);
});

test('only accepted paid round IDs consume the count; active updates and bonus frames do not',()=>{
  const auto=begin(LEGACY),state=host(LEGACY);submit(auto,state);
  auto.observe({...state,busy:true,pending:true,round:receipt('free-frame',LEGACY,{stakeMinor:'0'})});
  assert.equal(auto.snapshot().accepted,0);
  const active=receipt('paid',LEGACY,{status:'active',payoutMinor:null,frames:[{},{}]});
  auto.observe({...state,busy:true,pending:true,round:active});assert.equal(auto.snapshot().accepted,1);assert.equal(auto.snapshot().completed,0);
  for(let version=1;version<4;version++)auto.observe({...state,round:{...active,version,frames:Array(version+1).fill({})},canStart:false});
  assert.equal(auto.snapshot().accepted,1);assert.equal(auto.canLaunch({...state,round:active}),false);
  auto.observe({...state,round:{...active,status:'settled',version:4,payoutMinor:'700'},balanceMinor:'10600'});
  assert.equal(auto.snapshot().completed,1);assert.equal(auto.snapshot().netMinor,'600');assert.equal(auto.snapshot().remaining,9);
  auto.observe({...state,round:{...active,version:1},canStart:false});assert.equal(auto.snapshot().completed,1);
});

test('a finite run ends exactly after its requested accepted paid rounds',()=>{
  const auto=begin(LEGACY);let state=host(LEGACY);
  for(let n=1;n<=10;n++) {
    submit(auto,state);state=confirmed(auto,state,receipt('round-'+n,LEGACY));
    assert.equal(auto.snapshot().accepted,n);assert.equal(auto.snapshot().completed,n);
  }
  assert.equal(auto.snapshot().remaining,0);assert.equal(auto.snapshot().active,false);assert.equal(auto.snapshot().reason,'count_complete');
  assert.equal(auto.canLaunch(state),false);assert.equal(auto.markSubmitted(),false);
});

test('uncertain pending requests stop the run and later exact confirmation never resumes it',()=>{
  const auto=begin(),state=host();submit(auto,state);
  auto.observe({...state,busy:false,pending:true,error:true,canStart:false});
  assert.equal(auto.snapshot().active,false);assert.equal(auto.snapshot().reason,'pending_retry');assert.equal(auto.snapshot().inFlight,true);
  assert.throws(()=>auto.begin({}),/AUTOPLAY_ROUND_UNRESOLVED/);
  const resolved=confirmed(auto,state,receipt('retried'));
  assert.equal(auto.snapshot().completed,1);assert.equal(auto.snapshot().inFlight,false);assert.equal(auto.canLaunch(resolved),false);
});

test('disconnect and account changes cannot continue a prior autoplay intent',()=>{
  const auto=begin(),state=host();submit(auto,state);
  auto.observe({...state,connected:false,authenticated:false,sessionId:'',accepting:false});
  assert.equal(auto.snapshot().active,false);assert.equal(auto.snapshot().reason,'disconnected');
  assert.equal(auto.canLaunch(state),false);
  auto.observe({...state,sessionId:'session-two'});assert.equal(auto.snapshot().inFlight,false);assert.equal(auto.canLaunch({...state,sessionId:'session-two'}),false);
  auto.observe({...state,round:receipt('old-account-late')});assert.equal(auto.snapshot().accepted,0);
});

test('acceptance pause, confirmation/recovery and another active game stop intent without cancelling an accepted round',()=>{
  for(const [change,reason]of [[{accepting:false},'not_accepting'],[{confirming:true},'confirmation_required'],[{recoveryBlocked:true},'recovery_blocked'],[{otherActiveGame:'balloon_native'},'other_active_game'],[{game:{id:MODERN,launchable:false}},'game_unavailable']]) {
    const auto=begin(),state=host();submit(auto,state);auto.observe({...state,busy:true,pending:true,...change});
    assert.equal(auto.snapshot().active,false);assert.equal(auto.snapshot().reason,reason);assert.equal(auto.snapshot().inFlight,true);
    const resolved=confirmed(auto,state,receipt('finish-'+reason));assert.equal(auto.snapshot().completed,1);assert.equal(auto.canLaunch(resolved),false);
  }
});

test('explicit stop allows the accepted round to finish but cannot trigger another wager',()=>{
  const auto=begin(),state=host();submit(auto,state);
  const active=receipt('active',MODERN,{status:'active',payoutMinor:null});auto.observe({...state,round:active,busy:true,pending:true});
  auto.stop('user');assert.equal(auto.snapshot().inFlight,true);assert.equal(auto.snapshot().accepted,1);
  const end=confirmed(auto,state,{...active,status:'settled',version:1,payoutMinor:'250'},'10150');
  assert.equal(auto.snapshot().completed,1);assert.equal(auto.snapshot().reason,'user');assert.equal(auto.canLaunch(end),false);
});

test('round-win thresholds compare exact BigInt amounts at the inclusive boundary',()=>{
  const limit=9007199254740993n,start=90071992547409950000n,auto=begin(MODERN,{startingBalanceMinor:start,winLimitMinor:limit});
  let state=host(MODERN,{balanceMinor:String(start)});submit(auto,state);
  let balance=start-100n+limit-1n;state=confirmed(auto,state,receipt('below',MODERN,{payoutMinor:String(limit-1n)}),String(balance));
  assert.equal(auto.snapshot().active,true);submit(auto,state);balance=balance-100n+limit;
  state=confirmed(auto,state,receipt('exact',MODERN,{payoutMinor:String(limit)}),String(balance));
  assert.equal(auto.snapshot().active,false);assert.equal(auto.snapshot().reason,'win_limit');assert.equal(auto.snapshot().lastWinMinor,String(limit));
});

test('modern net gain/loss uses confirmed balance and never binary floating point',()=>{
  const gain=begin(MODERN,{gainLimitMinor:'500'}),state=host();submit(gain,state);
  confirmed(gain,state,receipt('gain',MODERN,{payoutMinor:'600'}),'10500');assert.equal(gain.snapshot().reason,'gain_limit');assert.equal(gain.snapshot().netMinor,'500');
  const loss=begin(MODERN,{lossLimitMinor:'1000'});let current=host();
  for(let n=1;n<=10;n++){submit(loss,current);current=confirmed(loss,current,receipt('loss-'+n,MODERN,{payoutMinor:'0'}),String(10000-100*n));}
  assert.equal(loss.snapshot().reason,'loss_limit');assert.equal(loss.snapshot().netMinor,'-1000');
});

test('Burning legacy win threshold means cumulative settled gain and ignores unrelated wallet deposits',()=>{
  const auto=begin(LEGACY,{winLimitMinor:'500',gainLimitMinor:'500'});let state=host(LEGACY);submit(auto,state);
  state=confirmed(auto,state,receipt('first',LEGACY,{payoutMinor:'500'}),'20000');
  assert.equal(auto.snapshot().netMinor,'400');assert.equal(auto.snapshot().active,true);
  submit(auto,state);state=confirmed(auto,state,receipt('second',LEGACY,{payoutMinor:'200'}),'20100');
  assert.equal(auto.snapshot().netMinor,'500');assert.equal(auto.snapshot().reason,'win_limit');
});

test('legacy trigger stops consume only explicit confirmed flags, not animation names or an invented big-win ratio',()=>{
  for(const [option,field,reason]of [['stopOnBonus','bonusTriggered','bonus'],['stopOnFreeSpins','freeSpinsTriggered','free_spins'],['stopOnBigWin','bigWin','big_win']]) {
    const auto=begin(LEGACY,{[option]:true});let state=host(LEGACY);submit(auto,state);
    state=confirmed(auto,state,receipt('large-'+field,LEGACY,{payoutMinor:'1000000',feature:{type:'bonus-big-win-free-spins'},frames:Array(20).fill({})}),'1009900');
    assert.equal(auto.snapshot().active,true);submit(auto,state);
    state=confirmed(auto,state,receipt('flag-'+field,LEGACY,{feature:{[field]:true}}));
    assert.equal(auto.snapshot().active,false);assert.equal(auto.snapshot().reason,reason);
  }
});

test('host canStart, animation and all in-flight guards must clear before a launch',()=>{
  const auto=begin();
  for(const extra of [{canStart:false},{animationRunning:true},{inFlight:true},{requestInFlight:true},{busy:true}])assert.equal(auto.canLaunch(host(MODERN,extra)),false);
  assert.equal(auto.snapshot().active,true);assert.equal(auto.canLaunch(host()),true);
  const money=begin();assert.equal(money.canLaunch(host(MODERN,{balanceMinor:'99'})),false);assert.equal(money.snapshot().reason,'insufficient_balance');
  const absent=begin();assert.equal(absent.canLaunch(host(MODERN,{balanceMinor:null})),false);assert.equal(absent.snapshot().reason,'balance_unconfirmed');
});

test('unexpected or mismatched paid receipts stop autoplay without counting a new wager',()=>{
  const auto=begin();auto.observe(host(MODERN,{round:receipt('external')}));assert.equal(auto.snapshot().reason,'unexpected_round');assert.equal(auto.snapshot().accepted,0);
  for(const change of [{stakeMinor:'101'},{game_id:LEGACY},{version:-1},{payoutMinor:'1.00'},{model_version:'v2'}]) {
    const a=begin(),state=host();submit(a,state);a.observe({...state,busy:true,pending:true,round:receipt('bad',MODERN,change)});
    assert.equal(a.snapshot().reason,'invalid_receipt');assert.equal(a.snapshot().accepted,0);assert.equal(a.canLaunch(state),false);
  }
});

test('an ended host request without a new confirmed paid receipt cannot silently launch again',()=>{
  const auto=begin(),state=host();submit(auto,state);auto.observe({...state,error:true});
  assert.equal(auto.snapshot().active,false);assert.equal(auto.snapshot().accepted,0);assert.equal(auto.snapshot().inFlight,false);assert.equal(auto.canLaunch(state),false);
  assert.equal(Object.isFrozen(auto.snapshot()),true);assert.equal(Object.isFrozen(auto.snapshot().limits),true);
});

test('each run pins its model version and a rules refresh cannot resume it',()=>{
  assert.throws(()=>begin(MODERN,{modelVersion:undefined}),/AUTOPLAY_MODEL_VERSION_REQUIRED/);
  const auto=begin(),state=host();submit(auto,state);
  const after=confirmed(auto,state,receipt('first'));
  const changed={...after,game:{...after.game,version:'v2'},animationRunning:true};
  auto.observe(changed);assert.equal(auto.snapshot().active,false);assert.equal(auto.snapshot().reason,'model_changed');
  assert.equal(auto.snapshot().modelVersion,'v1');assert.equal(auto.canLaunch({...changed,animationRunning:false}),false);
  assert.equal(auto.canLaunch(after),false,'returning to old rules cannot restart stopped intent');
});

test('a version refresh stops new wagers while an already accepted old-version round finishes',()=>{
  const auto=begin(),state=host();submit(auto,state);
  const active=receipt('old-version',MODERN,{status:'active',payoutMinor:null});
  auto.observe({...state,busy:true,pending:true,round:active});
  const changed={...state,game:{...state.game,version:'v2'},round:active};auto.observe(changed);
  assert.equal(auto.snapshot().reason,'model_changed');assert.equal(auto.snapshot().accepted,1);assert.equal(auto.snapshot().inFlight,true);
  auto.observe({...changed,round:{...active,status:'settled',version:1,payoutMinor:'300'},balanceMinor:'10200'});
  assert.equal(auto.snapshot().completed,1);assert.equal(auto.snapshot().inFlight,false);assert.equal(auto.snapshot().lastWinMinor,'300');
  assert.equal(auto.canLaunch({...changed,round:{...active,status:'settled',version:1,payoutMinor:'300'}}),false);
});

test('the final launch boundary rechecks modern net thresholds after balance refreshes during animation',()=>{
  for(const [limit,changedBalance,reason]of [[{lossLimitMinor:'200'},'9700','loss_limit'],[{gainLimitMinor:'200'},'10300','gain_limit']]) {
    const auto=begin(MODERN,limit),state=host();submit(auto,state);
    const settled=confirmed(auto,state,receipt('settled-'+reason,MODERN,{payoutMinor:'0'}),'9900');
    const refreshed={...settled,balanceMinor:changedBalance,animationRunning:true};auto.observe(refreshed);
    assert.equal(auto.canLaunch(refreshed),false);
    assert.equal(auto.canLaunch({...refreshed,animationRunning:false}),false);
    assert.equal(auto.snapshot().active,false);assert.equal(auto.snapshot().reason,reason);
  }
  const legacy=begin(LEGACY,{gainLimitMinor:'200',lossLimitMinor:'200'}),state=host(LEGACY);submit(legacy,state);
  const settled=confirmed(legacy,state,receipt('legacy',LEGACY));
  assert.equal(legacy.canLaunch({...settled,balanceMinor:'1000000'}),true,'legacy uses confirmed batch net, not unrelated wallet changes');
});
