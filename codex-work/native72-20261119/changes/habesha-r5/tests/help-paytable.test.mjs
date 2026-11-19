import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {frontendSnapshot} from '../../../railway-recovery/qa-module-loader.mjs';
import {habesha} from '../../../live-frontend/zplay-native-machines-20261119-habesha-r4/habesha-model.mjs';

const snapshot=await frontendSnapshot(),contract=await snapshot.load('contract.mjs');
const context=vm.createContext({URL,Map,Set,BigInt,Math,Object,Array,Number,String});
const module=new vm.SourceTextModule(await readFile(new URL('../assets/official-help-presentation.mjs',import.meta.url),'utf8'),{context,initializeImportMeta(meta){meta.url='https://fixture.invalid/official-help-presentation.mjs';}});
await module.link(specifier=>{assert.equal(specifier,'./contract.mjs');return new vm.SyntheticModule(['units','decimal'],function(){this.setExport('units',contract.units);this.setExport('decimal',contract.decimal);},{context});});
await module.evaluate();const {helpPaytableRows,createHelpPreview}=module.namespace;
const plain=value=>JSON.parse(JSON.stringify(value));
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};

test('Habesha groups descending original symbols and calculates actual local payouts at0.05 ETB',()=>{
 const rows=plain(helpPaytableRows(habesha,'0.05'));
 assert.deepEqual(rows.map(row=>row.symbols),[['symbol_8'],['symbol_7'],['symbol_6'],['symbol_5','symbol_4'],['symbol_3','symbol_2','symbol_1','symbol_0']]);
 assert.deepEqual(rows.map(row=>row.entries),['0.75','0.50','0.25','0.20','0.10'].map(amount=>[{count:3,amount}]));
 assert.ok(rows.every(row=>row.basis==='line'&&!row.wild));
});

test('payout amounts scale from the current model rather than fixed reference numbers',()=>{
 const rows=plain(helpPaytableRows(habesha,'5.00'));assert.deepEqual(rows.map(row=>row.entries[0].amount),['75.00','50.00','25.00','20.00','10.00']);
 const changed=structuredClone(habesha);changed.paytable.symbol_8['3']=80;
 assert.equal(helpPaytableRows(changed,'0.05')[0].entries[0].amount,'0.80');
});

test('equal payout grouping separates a symbol when its current model payout changes',()=>{
 const changed=structuredClone(habesha);changed.paytable.symbol_4['3']=30;
 const rows=plain(helpPaytableRows(changed,'0.05'));
 assert.deepEqual(rows.map(row=>row.symbols),[['symbol_8'],['symbol_7'],['symbol_6'],['symbol_5'],['symbol_4'],['symbol_3','symbol_2','symbol_1','symbol_0']]);
 assert.equal(rows[4].entries[0].amount,'0.30');
});

test('preview stepping never mutates the supplied actual wager or frozen model',()=>{
 const model=freeze(structuredClone(habesha)),actual=freeze({model,stake:'0.05',roundId:'existing-round-id'}),before=JSON.stringify(actual),preview=createHelpPreview();
 preview.update(actual);const displayed=preview.step(1);
 assert.equal(displayed.stake,'0.10');assert.equal(displayed.roundId,actual.roundId);assert.equal(displayed.model,model);
 assert.equal(helpPaytableRows(displayed.model,displayed.stake)[0].entries[0].amount,'1.50');
 assert.equal(actual.stake,'0.05');assert.equal(JSON.stringify(actual),before);
});

test('preview bounds are local and reopening resets to the actual selected wager',()=>{
 const model=freeze(structuredClone(habesha)),preview=createHelpPreview();preview.update({model,stake:'0.05'});
 assert.equal(preview.step(-1).stake,'0.05');assert.equal(preview.step(1000).stake,'400.00');
 assert.equal(preview.update({model,stake:'0.20'}).stake,'0.20');assert.equal(preview.value().stake,'0.20');assert.equal(preview.index,2);
});

test('invalid or zero line-bet amounts are rejected by the actual money contract',()=>{
 for(const value of ['0.00','0.0001','-1.00','NaN'])assert.throws(()=>helpPaytableRows(habesha,value));
});
