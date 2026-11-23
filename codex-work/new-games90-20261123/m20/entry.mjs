import {createExistingM20Transport} from './host-transport.mjs';
import {loadVerifiedAssets} from './native/assets.mjs';
import {createNativeSceneRenderer} from './native-scene-adapter.mjs';
import {CONTROL_TEXTURES,controlTextureName,createControlArt} from './native/control-art.mjs';
import {mountMultiHot20} from './main.mjs';

/** Launch the existing M20 on the existing Player origin and wallet. */
export async function launchExistingMultiHot20({root,manifestURL=new URL('./assets.json',globalThis.location.href),
  fetcher=globalThis.fetch,storage=globalThis.sessionStorage,onError=()=>{}}={}) {
  if(!root?.ownerDocument)throw Error('M20_ROOT_REQUIRED');
  const document=root.ownerDocument,window=document.defaultView;
  const transport=createExistingM20Transport({fetcher,storage});let resources,game;
  root.textContent='Connecting…';
  try {
    const state=await transport.connect();
    resources=await loadVerifiedAssets({manifestURL,fetcher,doc:document,imageDecoder:window.createImageBitmap.bind(window)});
    const clips=await resources.primeAudio(),samples={spin:clips.spin,win:clips.win,button:clips.button,music:clips.music};
    for(let index=1;index<=5;index++)samples['reel-stop-'+index]=clips['reel-stop'];
    const controlArt=(name,state)=>{const id={quick:'turbo',double:'gamble',take:'take-win'}[name]||name;
      const texture=controlTextureName(id,{...state,turbo:state.quick,soundOn:state.sound});
      return {texture,create:()=>createControlArt(texture,resources.urls.get(CONTROL_TEXTURES[texture].atlas),document,{autoplay:state.autoplay})};};
    game=mountMultiHot20({root,assets:{controlArt},transport,samples,askSound:true,initialBet:state.betLevels[0],onError,
      rendererFactory:options=>createNativeSceneRenderer({...options,resources,document,window})});
    return Object.freeze({game,transport,resources,dispose(){game.dispose();resources.dispose();transport.disconnect();}});
  }catch(error){game?.dispose();resources?.dispose();transport.disconnect();root.textContent=error?.status===401||error?.status===403?'Sign in to play.':'Unable to open Multi Hot 20. Please try again.';onError(error);throw error;}
}
