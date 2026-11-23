import test from 'node:test';
import assert from 'node:assert/strict';
import {BURN_WILDS_GAME_ID} from './expansion.mjs';
import {mountBurnWildsExistingPlayer} from './player-entry.mjs';

const root={ownerDocument:{}};
const artwork={gameId:BURN_WILDS_GAME_ID,symbols:{}};
const stub={state(){},prepare(){},dispatch(){},recover(){}};
test('one existing-Player entry shares the same transport across Canvas, controls and backend',async()=>{
  const calls=[];
  const fetcher=async()=>{};
  const storage={getItem(){},setItem(){},removeItem(){}};
  const win={};
  const mounted={dispose(){}};
  const result=await mountBurnWildsExistingPlayer({root,artwork,fetcher,storage,win,
    transportFactory:opts=>{calls.push({kind:'transport',opts});return stub;},
    mount:opts=>{calls.push({kind:'mount',opts});return mounted;}
  });
  assert.equal(result,mounted);
  assert.equal(calls.length,2);
  assert.equal(calls[0].opts.fetcher,fetcher);
  assert.equal(calls[1].opts.transport,stub);
  assert.equal(calls[1].opts.artwork,artwork);
  assert.equal(calls[1].opts.storage,storage);
  assert.equal(calls[1].opts.win,win);
  assert.equal(calls[1].opts.root,root);
});
test('missing own rights-cleared artwork, real root, or backend adapter cannot mount',async()=>{
 const bad=[{}, {root,artwork:{gameId:'foreign'}},{root,artwork,fetcher:null}];
 let calls=0;
 for(const options of bad)await assert.rejects(mountBurnWildsExistingPlayer({
   transportFactory:()=>{calls++;return stub;},mount:()=>{calls++;return null;},...options
 }),/EXISTING_PLAYER_DEPENDENCIES/);
 assert.equal(calls,0);
 // With no explicit artwork, a real DOM Canvas is required to draw the
 // ZPLAY-owned symbols. A fake document must not silently create placeholders.
 await assert.rejects(mountBurnWildsExistingPlayer({root,
   transportFactory:()=>{calls++;return stub;},mount:()=>{calls++;return null;}
 }),/OWN_ART_CANVAS_FACTORY_REQUIRED/);
 assert.equal(calls,0);
 await assert.rejects(mountBurnWildsExistingPlayer({root,artwork,
   transportFactory:()=>({state(){},dispatch(){},prepare(){}}),
   mount:()=>{calls++;return null;}
 }),/EXISTING_PLAYER_TRANSPORT/);
 assert.equal(calls,0);
});

