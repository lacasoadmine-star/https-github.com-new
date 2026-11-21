// Additive presentation correction for the already-existing Deluxe game.
// Preserve the full v461 module graph and its named Durable Object exports.
import previous from '../native72mh40r4/entry.mjs';
export * from '../native72mh40r4/entry.mjs';
import {createProductionHandler,installProductionGame} from '../native72deluxe/routes.mjs';
import {assets as retainedAssets,htmlTemplate as retainedHTML} from '../native72deluxe/native-machine-assets.mjs';

const previousRelease='zplay-native-machines-20261119-mh5deluxe-r1';
const release='zplay-native-machines-20261121-mh5deluxe-r1';
const previousRenderer=retainedAssets['mh5deluxe-renderer.mjs'];
if(previousRenderer?.sha256!=='73c5c1150c90f604576c53eff055e369a19dba52afe9d44384d0f4a203bdc195'
  ||previousRenderer.size!==10529
  ||previousRenderer.kvKey!=='native72/zplay-native-machines-20261119-mh5deluxe-r1/73c5c1150c90f604576c53eff055e369a19dba52afe9d44384d0f4a203bdc195'){
  throw Error('DELUXE_PRESENTATION_BASELINE_MISMATCH');
}
if(typeof retainedHTML!=='string'
  ||!retainedHTML.includes('/'+previousRelease+'/controller.mjs')
  ||!retainedHTML.includes('/'+previousRelease+'/style.css')){
  throw Error('DELUXE_PRESENTATION_TEMPLATE_MISMATCH');
}
const assets={...retainedAssets,'mh5deluxe-renderer.mjs':{
  type:'application/javascript; charset=utf-8',
  size:10566,
  sha256:'8d35b7ab7fa693792c213d68ab9cf5605fd6fdcab7942297e471c85ef03768b8',
  kvKey:'native72/zplay-native-machines-20261121-mh5deluxe-r1/8d35b7ab7fa693792c213d68ab9cf5605fd6fdcab7942297e471c85ef03768b8',
}};
const htmlTemplate=retainedHTML.replaceAll('/'+previousRelease+'/', '/'+release+'/');
const page=createProductionHandler({
  assets,htmlTemplate,gameId:'multi_hot_5_deluxe_native',release,published:true,
  presencePath:'/player-v236/presence.63ed199a80b6c700.mjs',
});
export default installProductionGame(previous,page);
