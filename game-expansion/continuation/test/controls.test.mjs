import test from 'node:test';
import assert from 'node:assert/strict';
import {stakeChoices,mineChoices,selectedChoice} from '../client/controls.mjs';
import {publicGames as slots,evaluateDraftRound} from '../models/smartsoft-slots.mjs';
import {remainingPublicConfigs as remaining} from '../models/remaining-games.mjs';

test('every first11 stake menu contains the complete official schedule and only accepted wagers',()=>{
 assert.equal(slots.length,11);
 for(const config of slots){
  const choices=stakeChoices(config);
  assert.deepEqual(choices,config.stakeValues,config.id);
  for(const stake of choices){
   const amount=stake.replace('.','').replace(/^0+(?=\d)/,'');
   assert.equal(evaluateDraftRound(config.id,{stakeMinor:amount},()=>0.999,1700000000000).debitMinor,amount);
  }
 }
});

test('a fixed schedule does not acquire generic amounts or an unlisted minimum or maximum',()=>{
 assert.deepEqual(stakeChoices({minStake:'0.10',maxStake:'3.00',stakeValues:['0.40','0.80','1.20','2.00']}),['0.40','0.80','1.20','2.00']);
 assert.deepEqual(stakeChoices({minStake:'0.10',maxStake:'3.00',stakeValues:[]}),[]);
 assert.equal(selectedChoice(['0.40','0.80'],'1.00','0.80'),'0.80');
});

test('CoinMiner offers exactly the verified selectable mine counts and rejects obsolete selections',()=>{
 const config=remaining.find(game=>game.id==='coinminer_native');
 const choices=mineChoices(config.controls.mines);
 assert.deepEqual(choices,['1','2','3','5','7','10','17','20','24']);
 assert.equal(selectedChoice(choices,'4',3),'3');
 assert.equal(selectedChoice(choices,'17',3),'17');
 assert.deepEqual(mineChoices({min:1,max:24,values:[]}),[]);
});
