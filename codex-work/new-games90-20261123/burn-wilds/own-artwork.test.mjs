import test from 'node:test';
import assert from 'node:assert/strict';
import {BURN_WILDS_SYMBOLS,BURN_WILDS_GAME_ID} from './expansion.mjs';
import {createBurnWildsOwnArtwork} from './own-artwork.mjs';

function canvasFactory(){
  const calls=[];
  const methods=new Set(['beginPath','moveTo','lineTo','closePath','ellipse','fill','stroke',
    'save','restore','translate','rotate','strokeText','fillText','clearRect',
    'fillRect','strokeRect','setTransform','quadraticCurveTo']);
  const context=new Proxy({},{
    get(target,key){
      if(key==='createLinearGradient'||key==='createRadialGradient')
        return (...args)=>{calls.push([key,...args]);return {addColorStop(...args){calls.push(['colorStop',...args]);}}};
      if(methods.has(key))return (...args)=>calls.push([key,...args]);
      return target[key];
    },
    set(target,key,value){target[key]=value;return true;}
  });
  const elements=[];
  const doc={createElement(type){
    assert.equal(type,'canvas');
    const element={width:0,height:0,getContext(kind){
      assert.equal(kind,'2d');return context;
    }};
    elements.push(element);return element;
  }};
  return {doc,elements,calls};
}
test('original ZPLAY artwork is generated from code for exactly 9 game-specific symbols',()=>{
 const {doc,elements,calls}=canvasFactory();
 const artwork=createBurnWildsOwnArtwork({doc,size:256});
 assert.equal(artwork.gameId,BURN_WILDS_GAME_ID);
 assert.equal(artwork.thirdPartyAssets,false);
 assert.equal(artwork.providerParityVerified,false);
 assert.equal(artwork.source,'ZPLAY_ORIGINAL_CANVAS_V2');
 assert.deepEqual(Object.keys(artwork.symbols),[...BURN_WILDS_SYMBOLS]);
 assert.equal(elements.length,BURN_WILDS_SYMBOLS.length);
 assert.equal(new Set(Object.values(artwork.symbols)).size,BURN_WILDS_SYMBOLS.length);
 assert.ok(elements.every(x=>x.width===256&&x.height===256));
 assert.ok(calls.filter(x=>x[0]==='ellipse').length>10);
 assert.ok(calls.filter(x=>x[0]==='fillText').length>=2);
 assert.equal(calls.filter(x=>x[0]==='fillRect'||x[0]==='strokeRect').length,0,'symbols leave their backgrounds transparent');
 assert.equal(Object.isFrozen(artwork.symbols),true);
});
test('artwork requires a real canvas context, never silently falls back to a screenshot',()=>{
 assert.throws(()=>createBurnWildsOwnArtwork(),/CANVAS_FACTORY_REQUIRED/);
 assert.throws(()=>createBurnWildsOwnArtwork({doc:{createElement(){}},size:10}),/CANVAS_FACTORY_REQUIRED/);
 assert.throws(()=>createBurnWildsOwnArtwork({doc:{createElement:()=>({})}}),/CANVAS_MISSING/);
 assert.throws(()=>createBurnWildsOwnArtwork({doc:{createElement:()=>({getContext:()=>null})}}),/2D_UNAVAILABLE/);
});

