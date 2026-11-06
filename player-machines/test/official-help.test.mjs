import test from 'node:test';
import assert from 'node:assert/strict';
import {gameConfig,presentationConfig} from '../public/registry.mjs';
import {createOfficialHelpPresentation,helpPaytableRows} from '../public/official-help-presentation.mjs';

test('native help amounts follow selected model and stake using wallet cent flooring',()=>{
 const mh5=presentationConfig(gameConfig('multi_hot_5_native')),foxy=presentationConfig(gameConfig('foxy_hot_20_native'));
 assert.equal(helpPaytableRows(mh5,'0.05')[0].entries[0].amount,'0.75');
 assert.equal(helpPaytableRows(mh5,'0.10')[0].entries[0].amount,'1.50');
 const star=helpPaytableRows(foxy,'0.20').find(row=>row.symbols.includes('big_star'));
 assert.deepEqual(star.entries,[{count:5,amount:'10.00'},{count:4,amount:'2.00'},{count:3,amount:'1.00'}]);
 const small={...mh5,paytable:{777:{3:75},dollar:{3:76}},symbols:['777','dollar']};
 const rows=helpPaytableRows(small,'0.0005');assert.equal(rows.length,2);assert.equal(rows[0].entries[0].amount,'0.00');
});

test('native help retains current wild and legacy scatter behavior from supplied rules',()=>{
 const g=presentationConfig(gameConfig('foxy_hot_20_native')),legacy={...g,rules:{...g.rules,scatter:{pays:{3:2,4:10,5:50}}}};
 assert.equal(helpPaytableRows(g,'0.20')[0].wild,true);
 assert(!helpPaytableRows(g,'0.20').some(row=>row.symbols.includes('scatter')));
 const row=helpPaytableRows(legacy,'0.20').at(-1);assert.equal(row.basis,'total bet');assert.equal(row.entries[0].amount,'10.00');
});

test('native help rejects malformed or non-divisible stakes instead of showing invented payouts',()=>{
 const g=presentationConfig(gameConfig('foxy_hot_20_native'));for(const stake of [undefined,'NaN','-1','0.00','0.0001'])assert.throws(()=>helpPaytableRows(g,stake));
});

test('native help never inspects or decorates other-game DOM',()=>{
 const document={getElementById(){throw Error('unexpected other-game mutation');}};
 for(const gameId of ['multi_hot_100','wild_multi_stars','unknown'])assert.equal(createOfficialHelpPresentation({document,gameId}),null);
});
