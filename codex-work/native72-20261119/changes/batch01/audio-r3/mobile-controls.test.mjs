import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// These are five different game sources. The mobile coordinates are preserved
// per game; desktop 925/924px cabinet coordinates and financial routes are not changed.
const cases=[
 {name:'multihot100',expected:'this.rect(this.buttons.quick,e?378:925,e?u-48:u-8,35,44)',old:'this.rect(this.buttons.quick,e?344:925,u-8,35,44)'},
 {name:'multihot5wild',expected:'this.rect(this.buttons.quick,e?385:925,e?o-43:o+4,35,44)',old:'this.rect(this.buttons.quick,e?349:925,o+4,35,44)'},
 {name:'multihot5deluxe',expected:'this.rect(this.buttons.quick,e?383:924,e?i-50:i-5,36,46)',old:'this.rect(this.buttons.quick,e?342:924,i-5,36,46)'},
 {name:'multihot5superwilds',expected:'this.rect(this.buttons.quick,e?378:925,e?o-50:o-8,35,45)',old:'this.rect(this.buttons.quick,e?344:925,o-8,35,45)'},
 {name:'multihotwildways',expected:'this.rect(this.buttons.quick,e?385:925,e?o-43:o+4,35,44)',old:'this.rect(this.buttons.quick,e?349:925,o+4,35,44)'}
];
for(const {name,expected,old} of cases){
 test(name+' has a separated Samsung Turbo hit zone, unchanged desktop and server account adapter',async()=>{
  const source=await readFile(new URL('./'+name+'/game.mjs',import.meta.url),'utf8');
  assert.ok(source.includes(expected),name+' dedicated TURBO coordinates');
  assert.ok(!source.includes(old),name+' overlapping hit region removed');
  assert.ok(source.includes('44*c.width/Math.max(n,1)'),name+' minimum 44 CSS px');
  assert.ok(source.includes('/api/remaining20'),name+' existing authenticated Worker routes');
  assert.ok(source.includes('ExpansionSession'),name+' existing Player session adapter');
  assert.ok(!/newDetachedWallet|createFakeSettlement|localRandomPayout/.test(source),name+' must not invent a wallet or math server');
 });
}
