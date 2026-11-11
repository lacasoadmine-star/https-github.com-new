import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {coinsAtlantisStakeTerms} from '../math/coins-of-atlantis.mjs';
import {hasPaidFeatureModes,paidFeatureDefinition,featureStakePreview,featureModeTotal} from '../client/paid74-feature.mjs';
import {machineMarkup} from '../client/machine74-renderer.mjs';
import {coinsPresentationFixture} from './support/coins-presentation-fixtures.mjs';
const full=math.getGameDefinition('ind74_official_coinsofatlantis'),definition=publicLibrary74Definition(full);

test('Coins mode previews match the exact retained debit and whole-base server terms',()=>{
 assert.equal(hasPaidFeatureModes(definition),true);assert.deepEqual(paidFeatureDefinition(definition).modes,['base','ante','buy60']);
 for(const [mode,total]of [['base','1.00'],['ante','3.00'],['buy60','60.00']]){
  const preview=featureStakePreview(definition,total,mode),terms=coinsAtlantisStakeTerms(full,preview.totalBetMinor,{mode});
  assert.equal(preview.totalBetMinor,terms.totalBetMinor);assert.equal(preview.baseBetMinor,terms.baseBetMinor);assert.equal(preview.costBps,terms.costBps);
 }
 assert.equal(featureModeTotal(definition,'1.00','base','ante'),'3.00');
 assert.equal(featureModeTotal(definition,'3.00','ante','buy60'),'120.00');
 assert.equal(featureModeTotal(definition,'60.00','buy60','base'),'1.00');
 for(const [mode,total]of [['ante','1.50'],['ante','2.00'],['buy60','59.00'],['buy100','100.00'],['base','0.00']])assert.throws(()=>featureStakePreview(definition,total,mode));
});

test('Coins final maximum stops respins and displays the clipped server award',()=>{
 const{definition,round}=coinsPresentationFixture('expanded'),last=round.outcome.bonusFrames.at(-1);
 assert.equal(round.outcome.featureFinishedReason,'maximum-award');assert.equal(last.capReached,true);assert.equal(last.respinsRemaining,0);
 assert.ok(BigInt(last.uncappedAwardMinor)>BigInt(last.displayedAwardMinor));
 const markup=machineMarkup(definition,round);assert.match(markup,/data-maximum-award="true"/);assert.match(markup,/MAXIMUM REACHED/);
 const bad=structuredClone(round);bad.outcome.bonusFrames.at(-1).displayedAwardMinor=(BigInt(last.uncappedAwardMinor)+1n).toString();assert.throws(()=>machineMarkup(definition,bad),/coin prize/);
});

test('An unconfigured title cannot gain paid purchase modes from client defaults',()=>{
 const game=publicLibrary74Definition(math.getGameDefinition('ind74_official_multihot10'));
 assert.equal(hasPaidFeatureModes(game),false);assert.throws(()=>featureStakePreview(game,'60.00','buy60'));
});
