import {createExistingM20Transport} from '../../new-games90-20261123/m20/host-transport.mjs';
import {loadVerifiedAssets} from '../../new-games90-20261123/m20/native/assets.mjs';
import {CONTROL_TEXTURES,controlTextureName,createControlArt} from '../../new-games90-20261123/m20/native/control-art.mjs';
import {mountMultiHot20} from '../../new-games90-20261123/m20/main.mjs';
import {createNativeSceneRenderer} from './native-scene-adapter.mjs';
import {MultiHot20Controls} from './controls.mjs';
import {MultiHot20Controller} from './controller.mjs';
import {M20_CURRENT_MEDIA} from './current-media.mjs';

/** Continue the same M20 identity and existing host; only recovery changes. */
export async function launchExistingMultiHot20({root,manifestURL=new URL('./assets.json',globalThis.location.href),
  fetcher=globalThis.fetch,storage=globalThis.sessionStorage,onError=()=>{}}={}) {
  if(!root?.ownerDocument)throw Error('M20_ROOT_REQUIRED');
  const document=root.ownerDocument,window=document.defaultView;
  const transport=createExistingM20Transport({fetcher,storage});let resources,game;
  root.textContent='Connecting…';
  try {
    const state=await transport.connect();
    resources=await loadVerifiedAssets({manifestURL,fetcher,doc:document,imageDecoder:window.createImageBitmap.bind(window),currentMedia:M20_CURRENT_MEDIA});
    const prepareAudio=async()=>{const clips=await resources.primeAudio(),samples={spin:clips.spin,win:clips.win,button:clips.button,music:clips.music};
      for(let index=1;index<=5;index++)samples['reel-stop-'+index]=clips['reel-stop'];return samples;};
    const controlArt=(name,state)=>{const id={quick:'turbo',double:'gamble',take:'take-win'}[name]||name;
      const texture=controlTextureName(id,{...state,turbo:state.quick,soundOn:state.sound});
      return {texture,create:()=>createControlArt(texture,resources.urls.get(M20_CURRENT_MEDIA.frames[texture]?.atlas||CONTROL_TEXTURES[texture].atlas),document,{autoplay:state.autoplay,frames:M20_CURRENT_MEDIA.frames})};};
    game=mountMultiHot20({root,assets:{controlArt,panelArt:name=>resources.frame(name),symbolArt:name=>resources.images[name==='grapes'?'grape':name]},transport,prepareAudio,askSound:true,initialBet:state.betLevels[0],onError,
      controlsFactory:options=>new MultiHot20Controls(options),controllerFactory:options=>new MultiHot20Controller(options),
      rendererFactory:options=>createNativeSceneRenderer({...options,resources,document,window})});
    return Object.freeze({game,transport,resources,dispose(){game.dispose();resources.dispose();transport.disconnect();}});
  }catch(error){game?.dispose();resources?.dispose();transport.disconnect();root.textContent=error?.status===401||error?.status===403?'Sign in to play.':'Unable to open Multi Hot 20. Please try again.';onError(error);throw error;}
}
