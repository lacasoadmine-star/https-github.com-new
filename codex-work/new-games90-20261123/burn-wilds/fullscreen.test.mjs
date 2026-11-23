import test from 'node:test';
import assert from 'node:assert/strict';
import {toggleBurnWildsFullscreen} from './fullscreen.mjs';
test('enter and exit are strictly scoped to the Burn Wilds stage',async()=>{
 const doc={fullscreenElement:null};const view={ownerDocument:doc, async requestFullscreen(){doc.fullscreenElement=view;}};
 doc.exitFullscreen=async()=>{doc.fullscreenElement=null;};
 assert.deepEqual(await toggleBurnWildsFullscreen(view),{changed:true,active:true});
 assert.deepEqual(await toggleBurnWildsFullscreen(view),{changed:true,active:false});
});
test('denied/unsupported request never changes the game, wallet or other fullscreen',async()=>{
 const doc={fullscreenElement:null};const view={ownerDocument:doc};
 assert.deepEqual(await toggleBurnWildsFullscreen(view),{changed:false,active:false,reason:'UNAVAILABLE'});
 view.requestFullscreen=async()=>{throw new Error('denied')};
 assert.deepEqual(await toggleBurnWildsFullscreen(view),{changed:false,active:false,reason:'DENIED'});
 doc.fullscreenElement={other:true};
 assert.deepEqual(await toggleBurnWildsFullscreen(view),{changed:false,active:false,reason:'OTHER_GAME_FULLSCREEN'});
});

