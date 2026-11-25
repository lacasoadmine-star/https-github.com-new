import {MultiHot20Scene} from '../../new-games90-20261123/m20/native/scene.mjs';
import {GAME_ID} from '../../new-games90-20261123/m20/presentation-quote.mjs';
import {hostMinor,nativeReceiptFor} from '../../new-games90-20261123/m20/host-presentation.mjs';

/** Adapt the already implemented own M20 native scene to the continued controls.
 * The scene retains its exact image crops, reel physics, wheel and win artwork.
 */
export function createNativeSceneRenderer({canvas,resources,onEvent=()=>{},document=globalThis.document,window=globalThis.window,
  Scene=MultiHot20Scene,clock=()=>window.performance.now()}={}) {
  if(!canvas?.getContext||!document?.createElement||!resources?.images)throw Error('M20_NATIVE_SCENE_DEPENDENCIES');
  const source=document.createElement('canvas'),backdrop=document.createElement('canvas'),ctx=canvas.getContext('2d');
  canvas.width=1363;canvas.height=766;
  let phase='IDLE',pending=null,round=null,previous=null,winVisible=false,displayWin='0.00',disposed=false,reelStop=0;
  let generation=0,acceptedView=null,presentationError=null;
  const seen=new Map(),events=new Set(),display={bet:'1.00',balance:null,currency:'ETB',quick:false};
  const emit=(name,key)=>{const id=name+':'+key;if(events.has(id))return;events.add(id);onEvent({gameId:GAME_ID,name,key});};
  const scene=new Scene({canvas:source,backdropCanvas:backdrop,symbols:resources.manifest.symbols,assets:resources.images,
    strictAssets:true,doc:document,win:window,clock,showInternalTitle:()=>false,
    audio:{play(name){const key=pending?.requestKey||round?.roundId;
      if(name==='reel-stop')emit('reel-stop-'+Math.min(5,++reelStop),pending?.roundId||round?.roundId||key);
      else if(name==='spin'||name==='win')emit(name,key);},stop(){},pauseAll(){},resumeOptedInMusic(){}}});
  function snapshot(){return {gameId:GAME_ID,phase,pending,round,grid:round?.grid??null,winVisible,
    winAmount:winVisible?displayWin:'0.00',multiplier:round?.multiplier??2,seenRoundCount:seen.size,
    presentationError:presentationError?.message??null,nativeScene:scene.inspect()};}
  function setDisplay(values={}){for(const key of ['bet','balance','currency','quick'])if(values[key]!==undefined)display[key]=values[key];}
  function begin(intent){
    if(disposed||phase!=='IDLE'||intent?.gameId!==GAME_ID||intent.action!=='SPIN')return false;
    previous={round,winVisible,displayWin};pending={...intent};phase='WAITING';winVisible=false;reelStop=0;
    generation++;acceptedView=null;presentationError=null;
    scene.dismissResultPresentation();scene.start();if(display.quick)scene.speedUp();return true;
  }
  function accept(view){
    const raw=nativeReceiptFor(view),serial=JSON.stringify(view);
    if(seen.has(view.roundId)){if(seen.get(view.roundId)!==serial)throw Error('M20_CONFLICTING_RENDER_REPLAY');return false;}
    if(disposed||!pending||pending.requestKey!==view.requestKey||pending.bet!==view.bet)throw Error('M20_NATIVE_RECEIPT_BINDING');
    seen.set(view.roundId,serial);pending={...pending,roundId:view.roundId};phase='SETTLING';acceptedView=view;
    const acceptedGeneration=generation;
    void Promise.resolve().then(()=>scene.settle(raw)).then(()=>{
      if(disposed||generation!==acceptedGeneration||phase!=='SETTLING')return;
      round=view;pending=null;phase='IDLE';displayWin=view.winAmount;winVisible=hostMinor(displayWin)>0;emit('settled',view.roundId);
    }).catch(error=>{
      if(disposed||generation!==acceptedGeneration||phase!=='SETTLING')return;
      presentationError=error instanceof Error?error:Error('M20_NATIVE_SETTLE_FAILED');phase='ERROR';
    });return true;
  }
  function requestStop(){if(disposed||!pending)return false;const changed=scene.speedUp();if(changed)emit('stop-request',pending.requestKey);return changed;}
  function cancelUnsent(key){
    if(pending?.requestKey!==key||phase!=='WAITING')throw Error('M20_CANNOT_CANCEL_RENDER');generation++;scene.reset();
    round=previous?.round??null;winVisible=previous?.winVisible??false;displayWin=previous?.displayWin??'0.00';pending=null;phase='IDLE';
    if(round)scene.restore(nativeReceiptFor(round));
  }
  function collect(roundId){if(phase!=='IDLE'||round?.roundId!==roundId)return false;winVisible=false;scene.dismissResultPresentation();emit('collect',roundId);return true;}
  function restore(view){if(disposed||phase!=='IDLE')throw Error('M20_NATIVE_RESTORE_LOCKED');scene.restore(nativeReceiptFor(view));round=view;
    displayWin=view.winAmount;winVisible=hostMinor(displayWin)>0;return true;}
  function restoreAccepted(view){
    const raw=nativeReceiptFor(view);
    if(disposed||!(pending?.requestKey===view.requestKey&&pending?.bet===view.bet||
        !pending&&round?.requestKey===view.requestKey&&round?.roundId===view.roundId)||
       (acceptedView&&JSON.stringify(acceptedView)!==JSON.stringify(view)))throw Error('M20_NATIVE_RECOVERY_BINDING');
    generation++;scene.reset();scene.restore(raw);
    round=view;acceptedView=view;pending=null;phase='IDLE';presentationError=null;
    displayWin=view.winAmount;winVisible=hostMinor(displayWin)>0;
    // A static recovery draws the same accepted round without another start,
    // settle promise, celebration or wallet operation.
    render();return true;
  }
  function applyGamble(result){if(disposed||phase!=='IDLE'||round?.roundId!==result.roundId)throw Error('M20_NATIVE_GAMBLE_ROUND');
    hostMinor(result.payout);displayWin=result.payout;winVisible=hostMinor(displayWin)>0;scene.dismissResultPresentation();if(result.won)emit('win',result.actionId);return true;}
  function label(value,x,y,size=14,color='#fff'){ctx.fillStyle=color;ctx.font=`bold ${size}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(value,x,y);}
  function footer(title,value,x){
    ctx.fillStyle='#002b1f';ctx.strokeStyle='#b7a956';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,662,166,52,13);ctx.fill();ctx.stroke();
    label(title,x+83,680,15,'#ffff75');label(value,x+83,699);
  }
  function render(){
    if(disposed)return;if(presentationError)throw presentationError;ctx.clearRect(0,0,canvas.width,canvas.height);
    const background=resources.images.__background,scale=766/background.height;
    ctx.drawImage(background,(1363-background.width*scale)/2,0,background.width*scale,766);
    const factor=134/102,dx=337-45*factor,dy=216-252*factor;
    ctx.drawImage(source,0,0,source.width,source.height,dx,dy,600*factor,600*factor);
    const title=resources.images.__title,titleScale=Math.min(300/title.width,80/title.height);ctx.drawImage(title,34,90,title.width*titleScale,title.height*titleScale);
    footer('BALANCE',`${display.balance??'—'} ${display.currency}`,378);footer('BET',`${display.bet} ${display.currency}`,806);
    if(winVisible)footer('WIN',`${displayWin} ${display.currency}`,592);return snapshot();
  }
  return Object.freeze({snapshot,setDisplay,begin,accept,requestStop,cancelUnsent,collect,restore,restoreAccepted,applyGamble,render,
    dispose(){if(disposed)return;disposed=true;generation++;scene.dispose();canvas.width=0;canvas.height=0;}});
}
