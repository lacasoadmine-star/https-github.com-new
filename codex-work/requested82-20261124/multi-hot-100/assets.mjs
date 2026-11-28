import {createNativeFrames} from '../../continue71-20261122/multi-hot-100-component/render/atlas.mjs';
import {createM100SpineRegions,createM100Logo} from '../../continue71-20261122/multi-hot-100-component/render/spine-assets.mjs';

const LOGO='Spine/Logo/multi hot 100 logo';
export const M100_REQUIRED_ASSETS=Object.freeze([
  ...Array.from({length:8},(_,i)=>[`Sprites/Images-${i}.json`,`Sprites/Images-${i}.png`]).flat(),
  LOGO+'.json',LOGO+'.atlas.txt',LOGO+'.png','background.png',
]);
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');

/** Load only this game's current static media. No provider program is loaded.
 * The host supplies its asset origin and byte pins; there is no guessed public
 * runtime URL, account token, session URL or fallback to another game's art.
 */
export async function loadM100Assets({baseURL,pins,fetcher=globalThis.fetch,
  canvasFactory=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},
  decodeImage=async bytes=>createImageBitmap(new Blob([bytes])),signal,portraitBackgroundPin=null,portrait=(globalThis.innerWidth||1000)<700}={}) {
  const base=new URL(baseURL);
  if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash||!base.pathname.endsWith('/')) throw Error('M100_ASSET_ORIGIN');
  if(!Array.isArray(pins)||pins.length!==M100_REQUIRED_ASSETS.length||new Set(pins.map(x=>x.path)).size!==pins.length||
    !M100_REQUIRED_ASSETS.every(path=>pins.some(x=>x.path===path))||pins.some(x=>!Number.isSafeInteger(x.bytes)||x.bytes<1||x.bytes>8*1024*1024||!/^\w{64}$/.test(x.sha256)||!/^[a-f0-9]{64}$/.test(x.sha256))) throw Error('M100_ASSET_PINS');
  const cancel=new AbortController(),relay=()=>cancel.abort(signal?.reason);
  if(signal?.aborted)relay();else signal?.addEventListener('abort',relay,{once:true});
  if(portraitBackgroundPin&&(!/^[a-f0-9]{64}$/.test(portraitBackgroundPin.sha256||'')||!Number.isSafeInteger(portraitBackgroundPin.bytes)||portraitBackgroundPin.bytes<1||portraitBackgroundPin.bytes>8*1024*1024||portraitBackgroundPin.path!==`/_zplay/requested82-m20/media/${portraitBackgroundPin.sha256}/background-vertical.png`))throw Error('M100_PORTRAIT_PIN');
  const images=[];let disposed=false;
  try {
    async function load(pin){
      const response=await fetcher(new URL(pin.path,base),{credentials:'omit',redirect:'error',signal:cancel.signal,cache:'force-cache'});
      if(!response.ok||response.redirected)throw Error('M100_ASSET_HTTP');
      const declared=response.headers.get('content-length');
      if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)!==pin.bytes))throw Error('M100_ASSET_LENGTH');
      const body=await response.arrayBuffer();
      if(body.byteLength!==pin.bytes||await digest(body)!==pin.sha256)throw Error('M100_ASSET_HASH');
      let value;
      if(pin.path.endsWith('.png')) {value=await decodeImage(body);if(disposed){value.close?.();throw Error('M100_ASSETS_DISPOSED');}images.push(value);}
      else {const text=new TextDecoder('utf-8',{fatal:true}).decode(body);value=pin.path.endsWith('.json')?JSON.parse(text):text;}
      return value;
    }
    const initialPortrait=Boolean(portrait&&portraitBackgroundPin);
    const results=await Promise.all(pins.map(async pin=>[pin.path,await load(pin.path==='background.png'&&initialPortrait?portraitBackgroundPin:pin)]));
    const loaded=new Map(results),metadata=[],textures=[];
    for(let i=0;i<8;i++){metadata.push(loaded.get(`Sprites/Images-${i}.json`));textures.push(loaded.get(`Sprites/Images-${i}.png`));}
    const regions=createM100SpineRegions({atlasText:loaded.get(LOGO+'.atlas.txt'),pages:{'multi hot 100 logo.png':loaded.get(LOGO+'.png')},canvasFactory});
    let background=loaded.get('background.png'),selectedPortrait=initialPortrait;const backgrounds=new Map([[initialPortrait,Promise.resolve(background)]]);
    const useBackground=value=>{const selected=Boolean(value&&portraitBackgroundPin);selectedPortrait=selected;
      if(!backgrounds.has(selected))backgrounds.set(selected,load(selected?portraitBackgroundPin:pins.find(p=>p.path==='background.png')).catch(error=>{backgrounds.delete(selected);throw error}));
      return backgrounds.get(selected).then(image=>{if(!disposed&&selectedPortrait===selected)background=image;return image;});};
    const assets={frames:createNativeFrames({metadata,textures,canvasFactory}),get background(){return background;},useBackground,portraitBackgroundAvailable:!!portraitBackgroundPin,
      logo:createM100Logo({skeleton:loaded.get(LOGO+'.json'),regions,canvasFactory}),canvasFactory,
      sourceVerified:true,providerProgramLoaded:false,dispose(){disposed=true;cancel.abort();for(const image of images)image.close?.();}};
    return Object.freeze(assets);
  }catch(error){cancel.abort();for(const image of images)image.close?.();throw error;}
  finally{signal?.removeEventListener('abort',relay);}
}
