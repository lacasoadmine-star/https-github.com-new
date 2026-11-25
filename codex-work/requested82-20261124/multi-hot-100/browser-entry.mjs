import { MultiHot100Controls } from './controls.mjs';
import { MultiHot100Presentation } from './presentation.mjs';
import { MultiHot100Controller } from './controller.mjs';
import { mountMultiHot100View } from './view.mjs';

/** Mount against an explicitly supplied authoritative host; never generates outcomes or balances. */
export function mountMultiHot100({root,transport,keyFactory,betLevels,selectedBet='1.00',currency='DMO',hostPolicy,assets=null,drawScene=null,presentationClock=null,audio=null,onChange=()=>{},onError=()=>{},...viewOptions}={}) {
  const controls=new MultiHot100Controls({...(betLevels?{betLevels}:{}),selectedBet,currency,...(hostPolicy===undefined?{}:{hostPolicy})});
  const presentation=new MultiHot100Presentation();
  let view;
  const controller=new MultiHot100Controller({controls,presentation,transport,...(keyFactory?{keyFactory}:{}),onChange(state){view?.update();onChange(state);},onError(error){view?.reportError(error);onError(error);}});
  view=mountMultiHot100View({root,controller,assets,drawScene,presentationClock,audio,...viewOptions});
  return Object.freeze({controls,presentation,controller,view,snapshot:()=>controller.snapshot(),frame:input=>view.frame(input),destroy:()=>view.destroy()});
}
