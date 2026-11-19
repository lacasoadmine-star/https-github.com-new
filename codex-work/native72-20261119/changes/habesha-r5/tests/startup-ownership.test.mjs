import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {extractFunction} from '../../../railway-recovery/qa-module-loader.mjs';

// Exercise the real controller boot's boundary between artwork readiness and
// authenticated API readiness. No browser, session, request or wager is made.
const source=await readFile(new URL('../assets/controller.mjs',import.meta.url),'utf8');
const bootSource=extractFunction(source,'boot');
const stalled=new Promise(()=>{});
const flush=async()=>{for(let index=0;index<8;index++)await Promise.resolve();};

for(const [machineId,ownsLoader]of [['habesha_fortune_5_native',true],['multi_hot_5_deluxe_native',false]]){
 let begin=0,removed=0,accountReads=0;
 const sandbox=vm.createContext({
  epoch:0,refreshTimer:null,signedIn:false,canGamble:false,lastRound:null,lastRoundModel:null,latestKnown:null,lastWin:'0.00',free:0,gambleValue:'0.00',displayPendingWin:false,gambleAttempt:0,
  state:{value:'loading'},disposed:false,machineId,clearTimeout(){},notice(){},setState(){},
  startupView:ownsLoader?{begin(){begin++;}}:null,gambleView:null,
  renderer:{artReady:Promise.resolve()},nativeControls:{ready:Promise.resolve()},
  $:id=>{if(id==='gamble-dialog')return{open:false};assert.equal(id,'official-startup');return{remove(){removed++;}};},
  advertisedModel:()=>{accountReads++;return stalled;},api:{session:()=>{accountReads++;return stalled;}}
 });
 vm.runInContext(bootSource+';void boot();',sandbox);await flush();
 assert.equal(accountReads,2,'Artwork readiness must reach the existing account/model reads');
 assert.equal(begin,ownsLoader?1:0);
 assert.equal(removed,ownsLoader?0:1,ownsLoader?'Startup helper must retain its adopted loader until account/model/history completion':'Legacy fallback may remove the unowned loader');
}
console.log('PASS: controller preserves startup-owned Habesha loader while API readiness is pending; legacy fallback remains.');
