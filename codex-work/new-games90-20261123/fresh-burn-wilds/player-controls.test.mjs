import test from 'node:test';
import assert from 'node:assert/strict';
import {BurnWildsPlayerControls} from './player-controls.mjs';
const setup=({approved=true,renderComplete=true}={})=>{
  const calls=[],notifications=[];
  let phase='READY',betLevelsMinor=[100,200,400],round=0;
  const controller={
    snapshot:()=>({phase,betLevelsMinor,balanceMinor:1000,canSpin:phase==='READY'&&approved,
      roundId:phase==='ANIMATING'?'round-'+round:null,needsRecovery:phase==='RECOVERY'}),
    connect:async()=>({betLevelsMinor}),
    spin:async n=>{calls.push(['spin',n]);phase='ANIMATING';round+=1;return {roundId:'round-'+round};},
    stop:()=>{calls.push(['stop']);return phase==='ANIMATING';},
    presentationFinished:id=>{
      calls.push(['finish',id]);
      if(!renderComplete||id!=='round-'+round)return false;
      phase='READY';return true;
    }
  };
  const host={getWallet:async()=>({type:'wallet',balanceMinor:1000}),
    getHistory:async()=>({type:'history',items:[]}),
    getDashboard:async()=>({type:'dashboard',gameRounds:0})};
  const audio={setMuted:v=>calls.push(['mute',v])};
  const ctr=new BurnWildsPlayerControls({controller,host,audio,
    referenceControls:{autoplayCounts:[25,50,100,500,1000]},
    randomKey:()=> 'unused-key',notify:v=>notifications.push(v)});
  return {ctr,calls,controller,notifications,setPhase:x=>{phase=x;}};
};
test('BET choices come only from verified server ladder',async()=>{
  const {ctr}=setup();await ctr.connect();
  assert.equal(ctr.view().betMinor,100);
  ctr.setBet(400);assert.equal(ctr.view().betMinor,400);
  assert.throws(()=>ctr.setBet(500),/BURN_BET_CHANGE_LOCKED/);
});
test('SPIN input lock denies duplicates and lets renderer STOP without second wager',async()=>{
  const {ctr,calls}=setup();await ctr.connect();
  await ctr.spin();assert.equal(ctr.view().canSpin,false);
  await assert.rejects(ctr.spin(),/BURN_SPIN_INPUT_LOCK/);
  assert.equal(ctr.stop(),true);
  assert.equal(calls.filter(x=>x[0]==='spin').length,1);
  assert.equal(await ctr.onRoundFinished('round-1'),true);
  assert.equal(ctr.view().canSpin,true);
});
test('server blocks SPIN when release is not approved',async()=>{
  const {ctr,calls}=setup({approved:false});await ctr.connect();
  await assert.rejects(ctr.spin(),/BURN_SPIN_INPUT_LOCK/);
  assert.equal(calls.length,0);
});
test('autoplay counts are reference-validated and only continue on actual round finish',async()=>{
  const {ctr,calls}=setup();await ctr.connect();
  await ctr.startAutoplay(25);
  assert.equal(calls.filter(x=>x[0]==='spin').length,1);
  assert.equal(ctr.view().autoplayRemaining,25);
  await ctr.onRoundFinished('round-1');
  assert.equal(calls.filter(x=>x[0]==='spin').length,2);
  assert.equal(ctr.view().autoplayRemaining,24);
  ctr.cancelAutoplay();
  await ctr.onRoundFinished('round-2');
  assert.equal(calls.filter(x=>x[0]==='spin').length,2);
});
test('wrong round callback cannot silently trigger another wager',async()=>{
  const {ctr,calls}=setup();await ctr.connect();await ctr.startAutoplay(50);
  assert.equal(await ctr.onRoundFinished('other-round'),false);
  assert.equal(calls.filter(x=>x[0]==='spin').length,1);
});
test('sound and panel controls work without any balance mutation',async()=>{
  const {ctr,calls}=setup();await ctr.connect();
  assert.equal(ctr.toggleMute(),false);
  assert.equal(ctr.toggleMute(),true);
  ctr.openPanel('settings');assert.equal(ctr.view().settingsOpen,true);
  ctr.openPanel('paytable');assert.equal(ctr.view().paytableOpen,true);
  ctr.closePanel();assert.equal(ctr.view().paytableOpen,false);
  assert.deepEqual(calls,[['mute',false],['mute',true]]);
});
test('account data comes from host dashboard, wallet and history',async()=>{
  const {ctr}=setup();await ctr.connect();
  const account=await ctr.refreshAccount();
  assert.equal(account.wallet.balanceMinor,1000);
  assert.equal(account.dashboard.type,'dashboard');
  assert.equal(account.history.type,'history');
});
test('keyboard ignores typing, repeats, browser shortcut and focused buttons',async()=>{
  const {ctr,calls}=setup();await ctr.connect();
  const mk=(code,target={},other={})=>({code,target,preventDefault(){this.prevented=true;},...other});
  assert.equal(ctr.keyboard(mk('Space',{tagName:'INPUT'})),false);
  assert.equal(ctr.keyboard(mk('Space',{}, {repeat:true})),false);
  assert.equal(ctr.keyboard(mk('Enter',{}, {ctrlKey:true})),false);
  const valid=mk('Space',{tagName:'DIV'});
  assert.equal(ctr.keyboard(valid),true);
  assert.equal(valid.prevented,true);
  assert.equal(calls.filter(x=>x[0]==='spin').length,1);
});
test('keyboard STOP accelerates and does not send second bet',async()=>{
  const {ctr,calls}=setup();await ctr.connect();await ctr.spin();
  const event={code:'Space',target:{tagName:'DIV'},preventDefault(){}};
  assert.equal(ctr.keyboard(event),true);
  assert.equal(calls.filter(x=>x[0]==='spin').length,1);
  assert.equal(calls.filter(x=>x[0]==='stop').length,1);
});
test('disposing stops auto requests and blocks new wagers',async()=>{
  const {ctr}=setup();await ctr.connect();ctr.dispose();
  await assert.rejects(ctr.spin(),/BURN_SPIN_INPUT_LOCK/);
  assert.equal(ctr.view().autoplayRemaining,0);
});
