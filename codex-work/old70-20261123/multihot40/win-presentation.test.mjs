import test from 'node:test';import assert from 'node:assert/strict';import {winPresentation} from './win-presentation.mjs';
test('win tiers follow exact integer thresholds and do not round across a tier boundary',()=>{
 assert.equal(winPresentation('0','40'),null);
 for(const [win,name]of [['399','WIN'],['400','NICE WIN'],['800','BIG WIN'],['1200','SUPER WIN'],['1600','FANTASTIC WIN']])
  assert.equal(winPresentation(win,'40').name,name);
 assert.equal(winPresentation('999','100').name,'WIN');assert.equal(winPresentation('1000','100').name,'NICE WIN');
 assert.equal(winPresentation('1999','100').name,'NICE WIN');assert.equal(winPresentation('2000','100').name,'BIG WIN');
 assert.equal(winPresentation('1.5','100'),null);
});
test('large integer win displays retain the accepted amount without Number conversion',()=>{
 const value='9007199254740990';assert.equal(winPresentation(value,'40').name,'FANTASTIC WIN');
 assert.equal(value,'9007199254740990');
});
