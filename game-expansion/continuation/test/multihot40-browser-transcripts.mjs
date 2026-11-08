/**
 * Produce LOCAL ONLY UI transcripts through the real HTTP integration fixture.
 * No result, payout, balance, card, version, or history row is fabricated.
 *
 *   node test/multihot40-browser-transcripts.mjs
 *   node test/multihot40-browser-transcripts.mjs --out=/tmp/multihot40-ui.json
 *   node test/multihot40-browser-transcripts.mjs --asset-base=https://owned.example/native-library/reference-art/r1/smartsoft/assets/
 *
 * Browser fetch adapters should return catalogue for games.json and the EXACT
 * manifestText string for its manifest URL (the hash is over these exact bytes).
 * Select one scenario; GET state returns initialState, then the latest stateAfter.
 * Before returning an action's response, validate its request against the next
 * step's request, allowing only request_id to differ. Echo the submitted request_id
 * into a copied response. The incoming model, round ID, version, options, amount,
 * colour, and action must match. GET history returns historyAfter at that step.
 * Replay by the same request_id must use the same cached response and no next step.
 * This shim tests UI only; live financial behavior is covered separately by the
 * canonical HTTP and PostgreSQL tests. Do not connect this adapter to production.
 */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {createBrowserFixtureServer} from './multihot40-browser-server.mjs';
import * as engine from '../models/multihot40-rules.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const defaults={output:resolve(ROOT,'test/fixtures/multihot40-browser-transcripts.json')};

export async function buildBrowserTranscripts({output=defaults.output,assetBase}={}){
 const instance=await createBrowserFixtureServer({port:0});
 const sessionId='local-fixture-session',gameId=engine.ID,modelVersion=engine.VERSION;
 const statePath='/api/expansion/state?game_id='+gameId;
 const historyPath='/api/expansion/history?game_id='+gameId+'&sort=recent';
 const fetchJSON=async(path,body,fixture=false)=>{
  const response=await fetch(instance.origin+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json',[fixture?'X-Zplay-Local-Fixture':'X-Zplay-Library-Session']:fixture?'1':sessionId},body:JSON.stringify(body)});
  const data=await response.json();assert.equal(response.status,200,JSON.stringify({path,error:data}));return data;
 };
 try{
  const config=structuredClone(instance.config);
  if(assetBase){const url=new URL(assetBase);if(!['http:','https:'].includes(url.protocol)||!url.pathname.endsWith('/'))throw Error('LOCAL_UI_ASSET_BASE_MUST_BE_HTTP_DIRECTORY');config.referencePresentation.assetBaseURL=url.href;}
  const manifestText=await readFile(resolve(ROOT,'presentation/manifests/'+gameId+'.json'),'utf8');
  assert.equal(createHash('sha256').update(manifestText).digest('hex'),config.referencePresentation.manifestSha256);
  const scenarios={};
  async function scenario(name,seedMode,description,execute){
   const fixture=await fetchJSON('/__fixture/reset',{scenario:seedMode},true);
   const item={description,seedMode,initialState:await fetchJSON(statePath),initialHistory:await fetchJSON(historyPath),nextRoundPreview:fixture.nextRoundPreview,steps:[]};
   const current=()=>item.steps.at(-1)?.stateAfter??item.initialState;
   const action=async request=>{
    const submitted={request_id:randomUUID(),game_id:gameId,model_version:modelVersion,...request};
    const response=await fetchJSON('/api/expansion/action',submitted);
    assert.equal(response.status,'SUCCESS');assert.equal(response.request_id,submitted.request_id);
    const step={request:submitted,response,stateAfter:await fetchJSON(statePath),historyAfter:await fetchJSON(historyPath)};
    item.steps.push(step);return step;
   };
   const start=(options={})=>action({type:'start',stake:'0.40',options});
   const act=(name,input={})=>{
    const round=current().round;assert.equal(round?.status,'active');
    return action({type:'action',round_id:round.round_id,expected_version:round.version,action:name,input});
   };
   await execute({item,current,start,act,fixture});
   item.finalDiagnostics=await fetchJSON('/__fixture/status');
   scenarios[name]=item;
  }
  await scenario('manual_win_collect','win','One pending slot win, then Take Win.',async({start,act})=>{
   const win=await start();assert.equal(win.response.round.status,'active');
   const collect=await act('collect');assert.equal(collect.response.round.status,'settled');
  });
  await scenario('manual_loss','loss','One zero-win round settles in its paid transaction.',async({start})=>{
   const loss=await start();assert.equal(loss.response.round.payoutMinor,'0');
  });
  await scenario('gamble_win_collect','win','A slot win doubles on the actual first card, then is collected.',async({start,act,fixture})=>{
   const win=await start(),base=BigInt(win.response.round.currentCashoutMinor);
   const gamble=await act('gamble',{color:fixture.nextRoundPreview.firstGambleColor});
   assert.equal(gamble.response.round.currentCashoutMinor,String(base*2n));assert.equal(gamble.response.round.status,'active');
   await act('collect');
  });
  await scenario('gamble_loss','win','A slot win loses on the opposite of the actual first card.',async({start,act,fixture})=>{
   await start();const color=fixture.nextRoundPreview.firstGambleColor==='red'?'black':'red';
   const loss=await act('gamble',{color});assert.equal(loss.response.round.payoutMinor,'0');assert.equal(loss.response.round.status,'settled');
  });
  await scenario('auto_collect_win','win','An autoplay start credits its win in the accepted paid transaction.',async({start})=>{
   const win=await start({autoCollect:true});assert.equal(win.response.round.reason,'AUTO_COLLECTED');assert.equal(win.response.round.status,'settled');
  });
  await scenario('auto_collect_two_losses','loss','Two autoplay losses allow testing a 0.80 ETB loss stop.',async({start,current})=>{
   await start({autoCollect:true});await start({autoCollect:true});assert.equal(current().balance,'9999.20');
  });
  await scenario('collect_then_spin','win','The next Spin first collects the pending win, then creates one new paid round.',async({start,act})=>{
   await start();await act('collect');await start();
  });
  await scenario('resume_pending_win','win','Load an already accepted pending win, then collect it without another debit.',async({item,start,act})=>{
   const pending=await start();item.initialState=pending.stateAfter;item.initialHistory=pending.historyAfter;
   item.setupAcceptedRequest=pending.request;item.steps=[];await act('collect');
  });
  const result={schemaVersion:1,generatedAt:new Date().toISOString(),localFixtureOnly:true,productionConnected:false,
   gameId,modelVersion,sessionId,catalogue:[config],manifestText,
   provenance:{backend:'Unchanged canonical LibraryService and SharedWalletStore, isolated PGlite PostgreSQL',
    transport:'Actual local HTTP fixture, canonical session resolution, native state/action/history routes',
    identity:'player-a test fixture only; production Worker/HMAC login is outside this fixture',
    payoutChanges:'None: seeds selected before each accepted start; original HMAC draw/evaluator and wallet settlement remain in use'},
   adapterContract:{allowedRequestSubstitution:['request_id'],echoSubmittedRequestId:true,
    preserveAllOtherFields:true,cacheExactDuplicateReceipts:true,advanceOnlyOncePerNewRequest:true,
    state:'initialState, then the latest successfully accepted step.stateAfter',history:'initialHistory, then that step.historyAfter',
    manifest:'Serve manifestText verbatim as UTF-8; reserializing parsed JSON changes its verified hash'},
   scenarios};
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');
  return {output,scenarios:Object.fromEntries(Object.entries(scenarios).map(([name,item])=>[name,{steps:item.steps.length,
   finalBalance:item.finalDiagnostics.state.balance,acceptedRequests:item.finalDiagnostics.counts.accepted_requests,paidStarts:item.finalDiagnostics.counts.paid_starts}]))};
 }finally{await instance.close();}
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const options={};for(const arg of process.argv.slice(2)){
  const match=arg.match(/^--(out|asset-base)=(.+)$/);if(!match)throw Error('UNKNOWN_TRANSCRIPT_ARGUMENT');
  options[match[1]==='out'?'output':'assetBase']=match[1]==='out'?resolve(match[2]):match[2];
 }
 console.log(JSON.stringify(await buildBrowserTranscripts(options)));
}
