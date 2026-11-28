import {mountMultiHot100} from './browser-entry.mjs';
import {loadM100Assets} from './assets.mjs';
import {createExistingM100Transport,M100_PENDING_KEY} from './host/transport.mjs';
import {M100_PUBLIC_COEFFICIENTS} from './rules/quote.mjs';
import {createM100Motion} from './motion.mjs';
import {createM100Auto} from './auto.mjs';
import {createM100Audio} from './audio.mjs';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;
// Display-only startup art, observed in this game's current official demo on
// 27 November 2026. It is M100's own four-row cabinet, separately from M20.
// It is never a round, award, server receipt or wallet entry.
const idleArt=Object.freeze([['grapes','plum','watermelon','orange','cherry'],['grapes','plum','cherry','orange','cherry'],['grapes','seven','cherry','grapes','cherry'],['grapes','seven','cherry','grapes','cherry']].map(Object.freeze));
const paytable=({bet})=>Object.entries(M100_PUBLIC_COEFFICIENTS).map(([symbol,counts])=>({symbol,label:symbol,rows:[5,4,3].map(count=>`${count} · ${money(BigInt(bet.replace('.',''))*BigInt(counts[count])/100n)}`)}));
const localPath=value=>typeof value==='string'&&/^\/[A-Za-z0-9/_-]*$/.test(value)?value:'/';

/** Production bootstrap uses only the existing authenticated original-wire host. */
export async function startM100Page({root,status=null,assetBaseURL,assetPinsURL=new URL('./asset-pins.json',import.meta.url),audioBaseURL=null,portraitBackgroundPin=null,
 loginURL='/player/login',lobbyURL='/',fetcher=globalThis.fetch,storage=globalThis.localStorage,sessionStorage=globalThis.sessionStorage}={}){
 if(!root?.ownerDocument)throw TypeError('M100_PAGE_ROOT');const doc=root.ownerDocument,win=doc.defaultView;
 if(!status){status=doc.createElement('p');status.className='m100-page-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');root.before(status);}
 const listeners=new win.AbortController(),transport=createExistingM100Transport({fetcher,storage,sessionStorage});
 let game=null,assets=null,audio=null,motion=null,automatic=null,phase='CONNECTING',disposed=false,version=0,loading=null,assetAbort=null,choiceCleanup=null,suspended=false;
 const app={get game(){return game;},get phase(){return phase;},get transport(){return transport;},snapshot:()=>Object.freeze({phase,game:game?.snapshot()??null,audio:audio?.snapshot()??null,auto:automatic?.snapshot()??null}),reconnect:()=>queueConnect(),dispose};
 function announce(value){status.textContent=value;status.hidden=!value;}
 function stopGame(){choiceCleanup?.();choiceCleanup=null;automatic?.dispose();automatic=null;game?.destroy();game=null;motion?.dispose();motion=null;audio?.dispose();audio=null;assets?.dispose();assets=null;}
 function display(kind,text){phase=kind;announce(text);root.innerHTML=`<section class="m100-page-message"><h1>Multi Hot 100</h1><p>${escape(text)}</p>${kind==='SIGN_IN'?`<a class="m100-page-primary" href="${escape(localPath(loginURL))}">Sign in</a>`:`<button type="button" data-m100-reconnect>Try again</button>`}<a href="${escape(localPath(lobbyURL))}">Return to lobby</a></section>`;root.querySelector('[data-m100-reconnect]')?.addEventListener('click',()=>void queueConnect());}
 function fail(error){if(disposed)return;stopGame();display(error?.status===401?'SIGN_IN':'UNAVAILABLE',error?.status===401?'Sign in to play Multi Hot 100.':'Multi Hot 100 is unavailable for this session.');}
 function invalidate(kind){version++;assetAbort?.abort();stopGame();transport.disconnect();if(!disposed)display(kind,kind==='SIGN_IN'?'Sign in to continue.':'Connecting to your account…');}
 async function mount(snapshot,token){
  if(disposed||token!==version)return;
  if(snapshot.pendingIntent){phase='RECOVERY_REQUIRED';announce('Recover the unfinished action before continuing.');root.innerHTML='<section class="m100-page-message"><h1>Multi Hot 100</h1><p>An unfinished action needs recovery.</p><button type="button" class="m100-page-primary" data-m100-recover>Recover current action</button></section>';
   root.querySelector('[data-m100-recover]').addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;announce('Recovering your current action…');try{await transport.recover(snapshot.pendingIntent);if(!disposed&&token===version)await mount(transport.snapshot(),token);}catch(error){if(!disposed&&token===version){announce(error?.status===401?'Sign in to recover this action.':'Recovery could not finish. Your original action is retained.');button.disabled=false;if(error?.status===401)fail(error);}}});return;
  }
  if(snapshot.accepting!==true||snapshot.otherActiveGame||!snapshot.hostPolicy)throw Error('M100_PAGE_NOT_ACCEPTING');
  phase='LOADING';announce('Loading Multi Hot 100…');assetAbort=new win.AbortController();
  const response=await fetcher(assetPinsURL,{credentials:'omit',redirect:'error',cache:'force-cache',signal:assetAbort.signal});if(!response.ok||response.redirected)throw Error('M100_PAGE_ASSET_PINS');
  const manifest=await response.json();if(manifest.schema!=='zplay/m100-current-static-pins/v1'||!Array.isArray(manifest.pins))throw Error('M100_PAGE_ASSET_PINS');
  const loaded=await loadM100Assets({baseURL:assetBaseURL,pins:manifest.pins,fetcher,signal:assetAbort.signal,portraitBackgroundPin});if(disposed||token!==version){loaded.dispose();return;}assets=loaded;
  audio=createM100Audio({baseURL:audioBaseURL,fetcher,onUnavailable:()=>{if(!disposed&&token===version)announce('Sound is unavailable. You can continue muted.');}});
  phase='SOUND_CHOICE';announce('Choose sound before playing.');root.innerHTML=`<section class="m100-page-message m100-sound-choice"><h1>Multi Hot 100</h1><p>Play with sound?</p>${audioBaseURL?'<button type="button" class="m100-page-primary" data-m100-sound>Enable sound</button>':''}<button type="button" data-m100-muted>Play muted</button></section>`;
  let selectionStarted=false;
  const start=async enabled=>{
   if(disposed||token!==version||selectionStarted)return;selectionStarted=true;
   root.querySelectorAll('button').forEach(button=>button.disabled=true);
   if(enabled){announce('Preparing sound…');try{await audio.enable();}catch{if(!disposed&&token===version){root.querySelectorAll('button').forEach(button=>button.disabled=false);selectionStarted=false;}return;}}
   if(disposed||token!==version)return;choiceCleanup?.();choiceCleanup=null;
   try{
   motion=createM100Motion({onEvent:name=>audio?.play(name)});
   automatic=createM100Auto({getGame:()=>game,isHidden:()=>doc.hidden,onChange:()=>game?.view.update()});
   game=mountMultiHot100({root,transport,currency:'ETB',hostPolicy:snapshot.hostPolicy,betLevels:snapshot.hostPolicy.betLevels,
    selectedBet:snapshot.restoreView?.bet??snapshot.hostPolicy.betLevels[0],initialView:snapshot.restoreView??null,assets,audio,idleGrid:idleArt,
    presentationClock:motion.clock,reelOffset:motion.reelOffset,wheelAngle:motion.wheelAngle,paytable,
    rules:[{title:'Multi Hot 100',body:'100 fixed paylines. Line awards are multiplied by the wheel result. A pending win is collected with TAKE WIN or before the next round.'},{title:'Double',body:'Choose red or black. The existing host allows at most five attempts while the pending amount is within its limit.'}],
    onAutoStart:configuration=>automatic.start(configuration),onAutoStop:()=>automatic.cancel(),onExit:()=>{win.location.assign(localPath(lobbyURL));},
    onChange:state=>automatic.observe(state),onError:()=>automatic.cancel()});
   if(!enabled){game.controls.setSetting('soundEffects',false);game.controls.setSetting('music',false);}
   game.view.update();phase='PLAYING';announce('');
   }catch(error){fail(error);}
  };
  const enable=()=>void start(true),muted=()=>void start(false);root.querySelector('[data-m100-sound]')?.addEventListener('click',enable);root.querySelector('[data-m100-muted]').addEventListener('click',muted);
  choiceCleanup=()=>{root.querySelector('[data-m100-sound]')?.removeEventListener('click',enable);root.querySelector('[data-m100-muted]')?.removeEventListener('click',muted);};
 }
 async function queueConnect(){if(loading){await loading;if(disposed)return app;}return connect();}
 async function connect(){
  if(disposed)return app;if(loading)return loading;const token=++version;stopGame();phase='CONNECTING';announce('Connecting to your account…');root.replaceChildren();
  loading=(async()=>{try{await transport.connect();if(!disposed&&token===version)await mount(transport.snapshot(),token);}catch(error){if(!disposed&&token===version)fail(error);}finally{loading=null;}})();await loading;return app;
 }
 function dispose(){if(disposed)return;disposed=true;version++;assetAbort?.abort();listeners.abort();stopGame();transport.dispose();phase='DISPOSED';root.replaceChildren();announce('');}
 for(const event of ['zplay:logout','zplay:session-expired'])win.addEventListener(event,()=>invalidate('SIGN_IN'),{signal:listeners.signal});
 win.addEventListener('zplay:session-changing',()=>invalidate('CONNECTING'),{signal:listeners.signal});win.addEventListener('zplay:session-ready',()=>void queueConnect(),{signal:listeners.signal});
 win.addEventListener('pagehide',()=>{suspended=true;version++;assetAbort?.abort();stopGame();transport.disconnect();},{signal:listeners.signal});
 win.addEventListener('pageshow',event=>{if(event.persisted&&suspended){suspended=false;void queueConnect();}},{signal:listeners.signal});
 win.addEventListener('online',()=>{if(phase==='UNAVAILABLE'&&!loading)void queueConnect();},{signal:listeners.signal});
 win.addEventListener('focus',()=>{if(phase==='UNAVAILABLE'&&!loading&&!doc.hidden)void queueConnect();},{signal:listeners.signal});
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden){automatic?.cancel();void audio?.suspend();}else if(phase==='UNAVAILABLE'&&!loading)void queueConnect();},{signal:listeners.signal});
 win.addEventListener('storage',event=>{if(event.key===M100_PENDING_KEY){invalidate('UNAVAILABLE');announce('Your account changed in another tab. Reconnect to continue.');}},{signal:listeners.signal});
 root.addEventListener('change',event=>{if(game&&['music','soundEffects'].includes(event.target.name)&&event.target.checked)void audio?.enable().catch(()=>{if(!disposed&&phase==='PLAYING')announce('Sound is unavailable.');});},{capture:true,signal:listeners.signal});
 root.addEventListener('click',event=>{if(game&&event.target.closest('[data-action="sound"]')){const settings=game.snapshot().settings;if(!settings.music&&!settings.soundEffects)void audio?.enable().catch(()=>{if(!disposed&&phase==='PLAYING')announce('Sound is unavailable.');});}},{capture:true,signal:listeners.signal});
 await connect();return Object.freeze(app);
}
