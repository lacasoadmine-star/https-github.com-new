import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const proof=JSON.parse(await readFile(new URL('./official-online-evidence-20261123.json',import.meta.url),'utf8'));
test('official source identity is a separately opened public provider page',()=>{
  assert.equal(proof.gameName,'Multi Hot 5 Burn Wilds');
  assert.equal(proof.officialProductPage,'https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds');
  assert.equal(proof.providerPageHttpStatus,200);
  assert.deepEqual(proof.providerDescriptionObserved.multiplierValues,[1,2,3,4,5]);
});
test('static provider artwork never counts as interactive demo or licensed production media',()=>{
  assert.equal(proof.providerDemoAttempted,true);
  assert.equal(proof.gameCanvasObserved,false);
  assert.equal(proof.recordedGameplayVideoVerified,false);
  assert.equal(proof.licensedMediaUsageRightsConfirmed,false);
  assert.equal(proof.productionAssetsReady,false);
  assert.equal(proof.authenticatedRealSpinsObserved,0);
  assert.equal(proof.productionWalletSettlementVerified,false);
});
test('runtime code does not embed official demo URLs or externally link provider game loaders',async()=>{
  const runtime=['contract.mjs','game-shell.mjs','native-renderer.mjs','native-audio.mjs',
    'player-controls.mjs','same-origin-host.mjs','live-controller.mjs'];
  for(const name of runtime){
    const source=await readFile(new URL('./'+name,import.meta.url),'utf8');
    assert.equal(source.includes('eu-server.ssgportal.com'),false,name);
    assert.equal(source.includes('GameLauncher/Loader.aspx'),false,name);
  }
});
