import {BURN_WILDS_GAME_ID,validateBurnWildsReceipt} from './expansion.mjs';
import {auditBurnWildsPayout} from './outcome-audit.mjs';

export const BURN_WILDS_PENDING_KEY='zplay.player.pending.burn-wilds.new90.v1';
export const BURN_WILDS_AUTO_COUNTS=Object.freeze([25,50,100,500,1000]);
const clone=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=code=>Object.assign(new Error(code),{code});
const minor=value=>{if(!Number.isSafeInteger(value)||value<0)throw fail('BURN_WILDS_SERVER_AMOUNT');return value;};
const id=value=>typeof value==='string'&&value.length>0&&value.length<=200;

function state(source){
  if(source?.gameId!==BURN_WILDS_GAME_ID||source.authenticated!==true||source.currency!=='ETB'||!id(source.subject)||typeof source.canPlay!=='boolean')throw fail('BURN_WILDS_AUTHENTICATED_HOST_REQUIRED');
  minor(source.balanceMinor);minor(source.pendingWinMinor);
  if(!Array.isArray(source.betLevelsMinor)||(source.canPlay&&source.betLevelsMinor.length===0)||source.betLevelsMinor.some(value=>!Number.isSafeInteger(value)||value<=0)||new Set(source.betLevelsMinor).size!==source.betLevelsMinor.length)throw fail('BURN_WILDS_HOST_STAKES_REQUIRED');
  const round=source.round?validateBurnWildsReceipt(source.round):null;
  // Validate recovered financial data before treating it as an accepted host receipt.
  if(round)auditBurnWildsPayout(round);
  if(source.pendingWinMinor>0&&!round)throw fail('BURN_WILDS_PENDING_ROUND_REQUIRED');
  return freeze({...clone(source),round});
}

/** Uses only the existing authenticated host's transport. No new endpoint,
 * wallet, client RNG or starting credit is created here. The pending record
 * contains request identity/authority, never a wallet balance.
 */
export class BurnWildsController{
  constructor({transport,scene,storage=globalThis.sessionStorage,key=()=>crypto.randomUUID(),onChange=()=>{}}={}){
    if(!transport||!['state','prepare','dispatch','recover'].every(method=>typeof transport[method]==='function')||!scene||!['start','accept','stop','reject','snapshot','setFinancial'].every(method=>typeof scene[method]==='function')||!storage||!['getItem','setItem','removeItem'].every(method=>typeof storage[method]==='function'))throw fail('BURN_WILDS_EXISTING_HOST_DEPENDENCIES');
    this.transport=transport;this.scene=scene;this.storage=storage;this.key=key;this.onChange=onChange;this.host=null;this.pending=null;this.status='DISCONNECTED';this.betMinor=null;this.quick=false;this.error=null;this.auto=null;this.disposed=false;this.generation=0;
  }
  emit(){if(!this.disposed)this.onChange(this.snapshot());}
  snapshot(){return freeze({gameId:BURN_WILDS_GAME_ID,status:this.status,authenticated:!!this.host,
    canPlay:!!this.host?.canPlay&&this.status==='READY'&&!this.pending,
    balanceMinor:this.host?.balanceMinor??null,pendingWinMinor:this.host?.pendingWinMinor??0,
    betLevelsMinor:[...(this.host?.betLevelsMinor||[])],betMinor:this.betMinor,quick:this.quick,
    round:this.host?.round||null,canDouble:this.status==='READY'&&this.host?.canDouble===true&&this.host?.pendingWinMinor>0,
    auto:this.auto?clone(this.auto):null,pending:this.pending?clone(this.pending.action):null,error:this.error});}
  async connect(){
    if(this.disposed||['SENDING','PREPARING','CONNECTING'].includes(this.status))throw fail('BURN_WILDS_BUSY');
    this.stopAuto();this.status='CONNECTING';this.error=null;this.emit();const version=++this.generation;
    try{
      const next=state(await this.transport.state());if(version!==this.generation||this.disposed)return;
      const saved=this.storage.getItem(BURN_WILDS_PENDING_KEY),pending=saved?JSON.parse(saved):null;
      if(pending&&(pending.gameId!==BURN_WILDS_GAME_ID||pending.subject!==next.subject||!id(pending.action?.requestKey)||pending.action?.gameId!==BURN_WILDS_GAME_ID||!['SPIN','TAKE','DOUBLE'].includes(pending.action?.action)))throw fail('BURN_WILDS_PENDING_ACCOUNT_MISMATCH');
      if(this.scene.snapshot().phase!=='IDLE'){
        if(!pending||pending.action.action!=='SPIN'||this.scene.snapshot().requestKey!==pending.action.requestKey)throw fail('BURN_WILDS_ACTIVE_PRESENTATION_REQUIRES_RECOVERY');
      }else if(next.round)this.scene.accept(next.round);
      this.host=next;this.pending=pending?freeze(pending):null;this.betMinor=next.betLevelsMinor.includes(this.betMinor)?this.betMinor:(next.betLevelsMinor[0]??null);
      this.status=this.pending?'RECOVER':'READY';this.present();this.emit();return this.snapshot();
    }catch(error){if(version===this.generation&&!this.disposed){this.status='BLOCKED';this.error=error.code||error.message;this.emit();}throw error;}
  }
  present(){this.scene.setFinancial({balanceMinor:this.host.balanceMinor,betMinor:this.betMinor,pendingWinMinor:this.host.pendingWinMinor});}
  setBet(value){if(this.status!=='READY'||!this.host?.betLevelsMinor.includes(value))return false;this.betMinor=value;this.present();this.emit();return true;}
  setQuick(value){this.quick=!!value;this.emit();}
  spin({automatic=false}={}){
    if(this.status==='ANIMATING'||this.status==='SENDING'&&this.pending?.action.action==='SPIN'){this.stop();return Promise.resolve(false);}
    if(!automatic)this.stopAuto();
    if(this.status!=='READY'||!this.host?.canPlay||this.pending)throw fail('BURN_WILDS_NOT_READY');
    return this.submit({action:'SPIN',gameId:BURN_WILDS_GAME_ID,requestKey:this.key(),betMinor:this.betMinor,auto:automatic,
      collectRoundId:this.host.pendingWinMinor>0?this.host.round.roundId:null});
  }
  take({automatic=false}={}){
    if(!automatic)this.stopAuto();if(this.status!=='READY'||!this.host?.round||this.host.pendingWinMinor<=0||this.pending)throw fail('BURN_WILDS_NO_PENDING_WIN');
    return this.submit({action:'TAKE',gameId:BURN_WILDS_GAME_ID,requestKey:this.key(),roundId:this.host.round.roundId});
  }
  double(choice){
    this.stopAuto();if(!['RED','BLACK'].includes(choice)||!this.snapshot().canDouble)throw fail('BURN_WILDS_GAMBLE_UNAVAILABLE');
    return this.submit({action:'DOUBLE',gameId:BURN_WILDS_GAME_ID,requestKey:this.key(),roundId:this.host.round.roundId,
      choice,expectedStakeMinor:this.host.pendingWinMinor});
  }
  async submit(intent){
    if(this.disposed||this.pending||this.status!=='READY'||!id(intent.requestKey))throw fail('BURN_WILDS_BUSY');
    this.status='PREPARING';this.error=null;this.emit();const version=this.generation;let stored=false;
    try{
      const action=freeze(clone(await this.transport.prepare(intent)));if(version!==this.generation||this.disposed)throw fail('BURN_WILDS_STALE_SESSION');
      if(action.gameId!==BURN_WILDS_GAME_ID||action.action!==intent.action||action.requestKey!==intent.requestKey)throw fail('BURN_WILDS_PREPARED_IDENTITY_CHANGED');
      for(const property of ['betMinor','auto','collectRoundId','roundId','choice','expectedStakeMinor'])if(property in intent&&action[property]!==intent[property])throw fail('BURN_WILDS_PREPARED_ACTION_CHANGED');
      this.pending=freeze({gameId:BURN_WILDS_GAME_ID,subject:this.host.subject,action});
      this.storage.setItem(BURN_WILDS_PENDING_KEY,JSON.stringify(this.pending));stored=true;
      if(action.action==='SPIN')this.scene.start({requestKey:action.requestKey,quick:this.quick});
    }catch(error){this.pending=null;if(stored)this.storage.removeItem(BURN_WILDS_PENDING_KEY);this.status='READY';this.error=error.code||error.message;this.emit();throw error;}
    return this.send(false);
  }
  async send(recover){
    const saved=this.pending,action=saved?.action;if(!saved||this.disposed)throw fail('BURN_WILDS_ORIGINAL_ACTION_REQUIRED');
    this.status='SENDING';this.emit();const version=this.generation;let result;
    try{
      result=await this.transport[recover?'recover':'dispatch'](clone(action));
      if(version!==this.generation||this.disposed)throw fail('BURN_WILDS_STALE_SESSION');
      if(result?.gameId!==BURN_WILDS_GAME_ID||(result.requestKey||result.clientToken)!==action.requestKey||!id(result.roundId)||
        action.action==='SPIN'&&result.clientToken!==undefined&&result.clientToken!==action.requestKey)throw fail('BURN_WILDS_RESPONSE_IDENTITY');
      minor(result.balanceMinor);minor(result.pendingWinMinor);
      let accepted;
      if(action.action==='SPIN'){
        accepted=validateBurnWildsReceipt({...result,clientToken:action.requestKey});
        // Fail closed if a server result contradicts own payline or wheel rules.
        auditBurnWildsPayout(accepted);
        if(accepted.betMinor!==action.betMinor)throw fail('BURN_WILDS_RESPONSE_STAKE');
        if(this.scene.snapshot().phase==='IDLE')this.scene.start({requestKey:action.requestKey,quick:true});
        this.scene.accept(accepted);
      }else{
        if(result.roundId!==action.roundId)throw fail('BURN_WILDS_RESPONSE_PARENT');
        if(action.action==='TAKE'&&(result.collected!==true||result.pendingWinMinor!==0))throw fail('BURN_WILDS_COLLECTION_RECEIPT');
        if(action.action==='DOUBLE'){
          if(result.choice!==action.choice||typeof result.won!=='boolean'||!Number.isSafeInteger(result.payoutMinor)||result.payoutMinor<0||result.pendingWinMinor!==result.payoutMinor)throw fail('BURN_WILDS_GAMBLE_RECEIPT');
        }
      }
      this.storage.removeItem(BURN_WILDS_PENDING_KEY);this.pending=null;
      this.host=freeze({...clone(this.host),balanceMinor:result.balanceMinor,pendingWinMinor:result.pendingWinMinor,
        ...(accepted?{round:accepted}:{}),canDouble:result.canDouble===true});
      this.status=action.action==='SPIN'&&this.scene.snapshot().phase!=='IDLE'?'ANIMATING':'READY';
      if(action.action==='SPIN'&&this.auto?.active&&action.auto){this.auto.remaining--;this.auto.lastWinMinor=accepted.winMinor||0;}
      if(action.action==='TAKE')this.scene.setFinancial({winVisible:false});
      this.error=null;this.present();this.emit();if(this.status==='READY')this.advanceAuto();return result;
    }catch(error){
      if(version!==this.generation||this.disposed)throw error;
      this.stopAuto();
      if(error.definitiveRejection===true){
        if(action.action==='SPIN'&&this.scene.snapshot().phase==='SPINNING')this.scene.reject(action.requestKey);
        this.storage.removeItem(BURN_WILDS_PENDING_KEY);this.pending=null;this.status='READY';
      }else{this.status='RECOVER';}
      this.error=error.code||error.message;this.emit();throw error;
    }
  }
  recover(){if(this.status!=='RECOVER'||!this.pending)throw fail('BURN_WILDS_NOT_RECOVERING');return this.send(true);}
  presentationFinished(roundId){
    if(this.status!=='ANIMATING'||this.host?.round?.roundId!==roundId)return false;
    this.status='READY';this.emit();this.advanceAuto();return true;
  }
  startAuto({count=100,winAtLeastMinor=null,balanceDecreaseMinor=null,balanceIncreaseMinor=null}={}){
    if(this.status!=='READY'||!this.host?.canPlay||!BURN_WILDS_AUTO_COUNTS.includes(count))throw fail('BURN_WILDS_AUTO_UNAVAILABLE');
    for(const value of [winAtLeastMinor,balanceDecreaseMinor,balanceIncreaseMinor])if(value!==null&&(!Number.isSafeInteger(value)||value<=0))throw fail('BURN_WILDS_AUTO_CONDITION');
    this.auto={active:true,remaining:count,baselineMinor:this.host.balanceMinor,winAtLeastMinor,balanceDecreaseMinor,balanceIncreaseMinor,lastWinMinor:0};this.emit();return this.spin({automatic:true});
  }
  stopAuto(){if(this.auto){this.auto.active=false;this.emit();}}
  stop(){this.stopAuto();const stopped=this.scene.stop();this.emit();return stopped;}
  async advanceAuto(){
    if(this.disposed||!this.auto?.active||this.status!=='READY')return;
    const active=this.auto;
    try{
      if(this.host.pendingWinMinor>0){await this.take({automatic:true});return;}
      if(this.auto!==active||!active.active||this.status!=='READY')return;
      const gain=this.host.balanceMinor-active.baselineMinor;
      if(active.remaining<=0||active.winAtLeastMinor!==null&&active.lastWinMinor>=active.winAtLeastMinor||
        active.balanceDecreaseMinor!==null&&-gain>=active.balanceDecreaseMinor||active.balanceIncreaseMinor!==null&&gain>=active.balanceIncreaseMinor){this.stopAuto();return;}
      await this.spin({automatic:true});
    }catch{this.stopAuto();}
  }
  pause(){this.stopAuto();this.scene.setPaused?.(true);}
  resume(){this.scene.setPaused?.(false);}
  dispose(){if(this.disposed)return;this.stopAuto();this.disposed=true;this.generation++;this.scene.dispose?.();this.onChange=()=>{};}
}
