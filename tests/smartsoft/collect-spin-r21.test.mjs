import test from 'node:test';
import assert from 'node:assert/strict';
import {patchCollectSpin,waitForCollectedPresentation} from '../../deploy/smartsoft/collect-spin-r21.mjs';
const fixture=`async function startRound({automatic=false,holding=false,stake=ui.stake.value}={}){
 const owner=currentState.sessionId,version=game.version;
 if(canActVisible('collect')){const collected=await session.act('collect');if(!collected)return false;}
 if(!canStartVisible())return false;
 return session.start(stake);
}
return startRound;`;
test('one tap waits for collection paint before starting; simultaneous taps cannot duplicate its wager',async()=>{
 let ready=false,collects=0,starts=0;
 const state={sessionId:'same',connected:true},session={async act(){collects++;setTimeout(()=>ready=true,30);return true;},async start(stake){assert.equal(stake,'1.00');starts++;return true;}};
 const run=Function('ui','session','currentState','game','canActVisible','canStartVisible','document','animation','referenceScene','pageSuspended','presentationFailed','hold','autoplay',patchCollectSpin(fixture))({stake:{value:'1.00'}},session,state,{version:'same'},()=>true,()=>ready,{visibilityState:'visible'},null,{},false,false,{active:true},{snapshot:()=>({active:false})});
 assert.deepEqual(await Promise.all([run(),run()]),[true,false]);assert.equal(collects,1);assert.equal(starts,1);
});
test('cancelled, hidden, changed-account or expired view never authorizes another wager',async()=>{
 let current=true,ready=false,time=0;
 assert.equal(await waitForCollectedPresentation({ready:()=>ready,current:()=>current,now:()=>time,wait:async()=>{current=false;ready=true;}}),false);
 current=true;ready=false;
 assert.equal(await waitForCollectedPresentation({ready:()=>ready,current:()=>current,now:()=>time,timeout:10,wait:async()=>{time+=5;}}),false);
 assert.equal(time,10);
});
test('unexpected or already patched host fails closed before bundling',()=>{
 for(const source of ['',fixture.replace("session.act('collect')","session.act('other')"),patchCollectSpin(fixture)])assert.throws(()=>patchCollectSpin(source),/CONTRACT_CHANGED/);
});
