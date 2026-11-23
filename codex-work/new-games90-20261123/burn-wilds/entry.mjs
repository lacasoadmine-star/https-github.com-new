import {mountBurnWilds} from './mount.mjs';
import {createBurnWildsOwnArtwork} from './own-artwork.mjs';
import {createBurnWildsSimulationTransport} from './simulation-transport.mjs';

const root=document.querySelector('#burn-wilds-root');
const start=document.querySelector('#burn-start-server-test');
const status=document.querySelector('#burn-test-status');
const historyOutput=document.querySelector('#burn-history-output');
const refreshHistory=document.querySelector('#burn-refresh-history');
const transport=createBurnWildsSimulationTransport();
let mounted=null;

function explain(error){
  if(error?.status===401||error?.status===410)return 'The server test session has expired. Open a new test tab to begin another simulation. No Player funds were used.';
  if(error?.name==='AbortError')return 'The test server did not answer in time. Reconnect to recover the same request.';
  return 'The server test is temporarily unavailable. Please retry. No Player funds were used.';
}
async function launch(create){
  start.disabled=true;status.textContent=create?'Starting the server test…':'Resuming this server test…';
  try{
    if(create)await transport.createSession();
    mounted?.dispose();root.hidden=false;
    mounted=await mountBurnWilds({root,transport,artwork:createBurnWildsOwnArtwork({doc:document}),storage:sessionStorage});
    if(mounted.controller.snapshot().status==='BLOCKED')throw new Error('BURN_TEST_CONNECT_FAILED');
    start.hidden=true;status.textContent='Server test active · TEST ETB only · no Player funds';
  }catch(error){status.textContent=explain(error);start.disabled=false;start.textContent='Retry server test';}
}
start.addEventListener('click',()=>launch(!transport.hasSession()));
refreshHistory?.addEventListener('click',async()=>{
  refreshHistory.disabled=true;
  try{
    const response=await transport.history();
    const history=response.history??response.rounds??response.events??[];
    historyOutput.textContent=JSON.stringify({mode:response.mode,cashEnabled:response.cashEnabled,history},null,2);
  }catch(error){historyOutput.textContent=explain(error);}
  finally{refreshHistory.disabled=false;}
});
window.addEventListener('pagehide',()=>{mounted?.dispose();mounted=null;});
window.addEventListener('pageshow',event=>{if(event.persisted&&transport.hasSession())void launch(false);});
if(transport.hasSession())void launch(false);
