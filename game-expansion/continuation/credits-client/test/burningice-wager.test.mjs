import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {burningIcePairWagerView as view,createBurningIcePairIntent as intent,resolveBurningIcePairIntent as resolve} from '../burningice-wager-actions.mjs';
import {remaining7ControlGeometry,remaining7WideScene,remaining7WideBinding} from '../presentation/smartsoft-remaining7-wide.mjs';

const games=JSON.parse(await readFile(new URL('../demo-games.json',import.meta.url),'utf8'));
for(const id of ['burningice10_native','burningice40_native']){
 const game=games.find(g=>g.id===id);
 const state=()=>({game,sessionId:'isolated-demo-session',connected:true,authenticated:true,accepting:true,round:null,busy:false,pending:false,error:false});
 const ready={canStart:true};
 test(id+': adjacent starts use the configured ladder and preserve its boundaries',()=>{
  for(let i=0;i<game.stakeValues.length;i++){
   const selected=game.stakeValues[i],s=state(),v=view(game,s,selected,ready);
   for(const [action,index]of [['startNext',i+1],['startPrevious',i-1]]){
    const expected=game.stakeValues[index]??null,result=resolve(intent(v,action),game,s,selected,ready);
    assert.equal(result?.stake??null,expected);
   }
  }
 });
 test(id+': locks reject pending, busy, disconnected, active and unready starts',()=>{
  const s=state(),v=view(game,s,'2.00',ready),action=intent(v,'startNext');
  for(const patch of [{busy:true},{pending:true},{confirming:true},{recoveryBlocked:true},{error:true},{otherActiveGame:'other_game'},
   {connected:false},{authenticated:false},{accepting:false},
   {round:{game_id:id,model_version:game.version,round_id:'accepted',version:0,status:'active'}}]){
   assert.equal(resolve(action,game,{...s,...patch},'2.00',ready),null,JSON.stringify(patch));
  }
  assert.equal(resolve(action,game,s,'2.00',{canStart:false}),null);
 });
 test(id+': a changed session, model, selection, ladder or receipt invalidates a displayed intent',()=>{
  const s=state(),action=intent(view(game,s,'2.00',ready),'startNext');
  for(const patch of [{sessionId:'another-session'},{round:{game_id:id,model_version:game.version,round_id:'settled',version:1,status:'settled'}}]){
   assert.equal(resolve(action,game,{...s,...patch},'2.00',ready),null);
  }
  assert.equal(resolve(action,game,s,'5.00',ready),null);
  for(const changed of [{...game,version:'different-model'},{...game,stakeValues:['1.00','2.00','3.00','5.00']}]){
   assert.equal(resolve(action,changed,{...s,game:changed},'2.00',ready),null);
  }
 });
 test(id+': malformed amounts, foreign receipts and forged actions are rejected',()=>{
  const s=state();
  for(const stake of ['0.00','2','2.001','NaN','40001.00'])assert.equal(view(game,s,stake,ready),null);
  for(const values of [['2.00','1.00'],['1.00','1.00'],['1.00','NaN']]){
   const changed={...game,stakeValues:values};assert.equal(view(changed,{...s,game:changed},'1.00',ready),null);
  }
  assert.equal(view(game,{...s,round:{game_id:'different',model_version:game.version,round_id:'foreign',version:1,status:'settled'}},'2.00',ready),null);
  assert.equal(intent(view(game,s,'2.00',ready),'__proto__'),null);
  const action=structuredClone(intent(view(game,s,'2.00',ready),'startNext'));action.pin.selected='100.00';
  assert.equal(resolve(action,game,s,'2.00',ready),null);
 });
 test(id+': source neighbor geometry replaces the modal target and paints both title-owned rows',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../presentation/manifests/'+id+'.json',import.meta.url),'utf8'));
  const binding=remaining7WideBinding({gameId:id,commands:[],boardGeometry:{x:0,y:0,width:400,height:400},gridGeometry:{x:0,y:0,width:400,height:400}},manifest,
   {remainingLegacyWager:{nextStake:'5.00',previousStake:'1.00',increaseEnabled:true,decreaseEnabled:true},stake:'2.00',balance:'1000.00',currency:'CREDITS',canStart:true},{width:1365,height:850});
  const scene=remaining7WideScene(binding,manifest),geometry=remaining7ControlGeometry(scene,manifest);
  assert.equal(geometry.bet,undefined);assert.equal(geometry.startNext.y,349);assert.equal(geometry.startPrevious.y,648);
  const neighbors=scene.commands.filter(c=>c.role==='wide-neighbor-stake');
  assert.deepEqual(neighbors.map(c=>c.text),['5.00','1.00']);
  assert.equal(scene.commands.filter(c=>c.frame==='Buttons/Bet').length,2);
  assert(binding.additionalAssetFrames.includes('Buttons/Bet'));
 });
}
test('the 5-line title retains its existing controls and is outside this pair',()=>{
 const id='burningice_native',geometry=remaining7ControlGeometry({}, {id});
 assert(geometry.bet);assert.equal(geometry.startNext,undefined);
 const game=games.find(g=>g.id===id);assert.equal(view(game,{game},'1.00',{canStart:true}),null);
});
