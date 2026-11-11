import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import * as math from '../math/official72.mjs';
import {officialTitleBase,officialTitleSource,OFFICIAL_TITLE_MODULE_IDS} from '../math/official-title-modules.mjs';
import {ISOLATED_TITLE_CONFIG_IDS} from '../math/title-configurators.mjs';
import {EXISTING_WALLET_ROUTES} from '../client/existing-wallet-routes.mjs';
const newGames=math.listGameDefinitions().filter(d=>!Object.hasOwn(EXISTING_WALLET_ROUTES,d.id));

test('all new60 games bind exactly one distinct title source file without guessing by family or title similarity',async()=>{
  assert.equal(newGames.length,60);assert.equal(new Set(newGames.map(d=>officialTitleSource(d.id))).size,60);
  for(const d of newGames){
    const source=officialTitleSource(d.id);assert.equal(typeof source,'string',d.id);
    await access(new URL('../'+source,import.meta.url));
    const base=officialTitleBase(d.id);assert.equal(base.catalogName,d.catalogName,d.id);assert.notEqual(base.id,d.id);
  }
  assert.equal(OFFICIAL_TITLE_MODULE_IDS.length,72);
  for(const id of ['ind74_official_multihot5','ind74_official_foxyhot20','slots','constructor','__proto__','multihot10']){
    assert.equal(officialTitleBase(id),null);assert.equal(officialTitleSource(id),null);
  }
});

test('editing a returned title base cannot mutate that title, a neighboring title or an imported retained fixture',()=>{
  const first=officialTitleBase('ind74_official_multihot10'),neighbor=officialTitleBase('ind74_official_multihot20');
  const beforeFirst=structuredClone(first),beforeNeighbor=structuredClone(neighbor);
  first.symbols[0].pays[3]=999999;first.paylines[0][0]=999;first.catalogName='client alias';
  assert.deepEqual(officialTitleBase('ind74_official_multihot10'),beforeFirst);
  assert.deepEqual(officialTitleBase('ind74_official_multihot20'),beforeNeighbor);
});

test('isolated feature entry points reject another title and preserve the existing default fixture export',async()=>{
  assert.ok(ISOLATED_TITLE_CONFIG_IDS.length>=9);
  for(const id of ISOLATED_TITLE_CONFIG_IDS){
    const source=officialTitleSource(id),module=await import('../'+source);
    assert.equal(typeof module.configureOfficialGame,'function',id);
    const prior=structuredClone(module.default);
    for(const wrongId of ['ind74_official_multihot5','ind74_official_foxyhot20','ind74_official_unknown'])
      assert.throws(()=>module.configureOfficialGame({id:wrongId,family:'slots'}),TypeError,id);
    assert.deepEqual(module.default,prior,id);
  }
  const registry=await readFile(new URL('../math/official72.mjs',import.meta.url),'utf8');
  assert.equal(registry.includes('models.find(game => norm(game.catalogName)'),false,'A missing title must not select a similar generic model.');
});
