import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {machineMarkup,machineGeometry} from '../client/machine74-renderer.mjs';
import {startRoundOptions,gamblePresentation,slotSpinLabel,canStartRound} from '../client/machine74-controls.mjs';

const count=(markup,pattern)=>[...markup.matchAll(pattern)].length;
for(const slug of ['hotsamba','baoslot5x','farmsfortune','draculasfortune'])test(slug+' uses shared held-win controls with the actual server lifecycle',()=>{
  const id='ind74_official_'+slug,definition=publicLibrary74Definition(math.getGameDefinition(id));
  const selected={holdWin:true},input={gameId:id,betMinor:'100',now:1700000000000,rng:()=>0};
  const stored=math.startRound({...input,options:startRoundOptions(definition,selected)}),round=math.publicRound(stored);
  assert.equal(slotSpinLabel(definition),'HOLD & SPIN');
  assert.equal(round.status,'active');assert.ok(BigInt(round.pendingWinMinor)>0n);
  assert.equal(gamblePresentation(definition,round).canGamble,true);
  assert.equal(gamblePresentation(definition,round).canCollect,true);
  assert.equal(canStartRound({accepting:true,round}),false);
  const before=JSON.stringify(round),markup=machineMarkup(definition,round);
  assert.match(markup,/WIN TO COLLECT/);assert.match(markup,/Unrevealed gamble card/);
  assert.equal(JSON.stringify(round),before);
  const collected=math.publicRound(math.collectRound(stored));
  assert.equal(collected.winMinor,round.pendingWinMinor);
  assert.equal(gamblePresentation(definition,collected).pending,false);
  const auto=math.publicRound(math.startRound({...input,options:startRoundOptions(definition,selected,{autoplay:true})}));
  assert.notEqual(auto.status,'active');assert.equal(auto.winMinor,collected.winMinor);
  assert.deepEqual(selected,{holdWin:true});
  const lost=math.publicRound(math.advanceRound(stored,{color:'black'},1700000000001,()=>0));
  assert.equal(lost.gambleHistory.at(-1).revealedColor,'red');
  assert.equal(lost.gambleHistory.at(-1).color,'black');
  assert.match(machineMarkup(definition,lost),/aria-label="Revealed red card"/);
  assert.doesNotMatch(machineMarkup(definition,lost),/aria-label="Revealed black card"/);
});

for(const slug of ['hotsamba','baoslot5x'])test(slug+' side reel displays exactly the server factor and no result before a spin',()=>{
  const id='ind74_official_'+slug,full=math.getGameDefinition(id),definition=publicLibrary74Definition(full);
  assert.equal(definition.layout.multiplier.placement,'left-reel');
  const ready=machineMarkup(definition);
  assert.match(ready,/m74-multiplier-reel/);assert.doesNotMatch(ready,/m74-multiplier-arc|class="is-selected"/);
  for(const [index,value]of full.multiplierValues.entries()){
    const round=math.publicRound(math.startRound({gameId:id,betMinor:'100',now:1700000000000,rng:bound=>bound===full.multiplierValues.length?index:0}));
    assert.equal(round.outcome.reelMultiplier,value);
    const markup=machineMarkup(definition,round);
    assert.match(markup,new RegExp('<span class="is-selected">'+value+'×</span>'));
    assert.equal(count(markup,/<span class="is-selected">/g),1);
    const {rows,columns}=machineGeometry(definition);
    assert.equal(count(markup,/class="m74-symbol(?: is-winning)?"/g),rows*columns);
  }
});

for(const slug of ['dicejungle','draculasfortune'])test(slug+' displays only supplied same-reel Wild substitution without inventing multiplier values',()=>{
  const id='ind74_official_'+slug,full=math.getGameDefinition(id),definition=publicLibrary74Definition(full);
  let cell=0;
  const stored=math.startRound({gameId:id,betMinor:'100',now:1700000000000,rng:()=>cell++===2?full.symbols.length*full.wildRule.regularSymbolWeight:0});
  const round=math.publicRound(stored),before=JSON.stringify(round),markup=machineMarkup(definition,round);
  assert.deepEqual(round.outcome.expandedColumns,[2]);
  assert.equal(round.outcome.originalGrid.flat().filter(id=>id===full.wildSymbol.id).length,1);
  assert.equal(count(markup,/class="m74-wild"/g),full.rows);
  assert.equal(count(markup,/class="m74-reel-window is-expanded"/g),1);
  assert.equal(definition.multiplierValues,undefined);assert.equal(round.outcome.reelMultiplier,undefined);
  assert.doesNotMatch(markup,/m74-multiplier-reel|m74-multiplier-arc/);
  assert.match(markup,/Qiimayaasha lama xaqiijin/);
  assert.equal(JSON.stringify(round),before);
});
