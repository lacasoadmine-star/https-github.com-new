import {createHash} from 'node:crypto';

export const HISTORICAL_REQUEST_COUNT = 398;
export const ACTIVE_SELECTION_COUNT = 20;
export const SHA256 = /^[a-f0-9]{64}$/;
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const compareName = name => name.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');

// Financial identity never comes from an existing launch alias or display title.
// The exact requested spelling remains separately available in every record.
export function reservedMachineId(requestedName) {
 const value=requestedName.normalize('NFKD').replace(/\p{M}/gu,'').replace(/\$/g,'_dollar').toLowerCase().replace(/[^a-z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');
 if(!value)throw new Error('EMPTY_MACHINE_ID');
 const id=value+'_native';
 if(id.length>64)throw new Error('MACHINE_ID_TOO_LONG');
 return id;
}

export function parseRequestedNames(text) {
 const names=text.split(/\r?\n/).filter(Boolean);
 if(names.some(name=>name!==name.trim()))throw new Error('UNEXPECTED_NAME_WHITESPACE');
 if(new Set(names).size!==names.length)throw new Error('DUPLICATE_REQUEST_NAME');
 const ids=names.map(reservedMachineId);
 if(new Set(ids).size!==ids.length)throw new Error('NORMALIZED_ID_COLLISION');
 return names;
}

export function protectedIds(snapshot) {
 return new Set([...snapshot.catalog.flatMap(g=>[g.id,g.sourceId]),...snapshot.backendGameIds,...snapshot.providerMetadata.map(g=>g.id)]);
}

export function validateHistoricalManifest(manifest,names,snapshot) {
 if(manifest.scope!=='historical-request'||manifest.count!==HISTORICAL_REQUEST_COUNT||manifest.entries.length!==HISTORICAL_REQUEST_COUNT)throw new Error('HISTORICAL_SCOPE_OR_COUNT');
 const protectedSet=protectedIds(snapshot),seen=new Set();
 manifest.entries.forEach((entry,index)=>{
  if(entry.requestOrdinal!==index+1||entry.requestedName!==names[index])throw new Error('REQUEST_ORDER_OR_SPELLING_CHANGED');
  if(entry.machineId!==reservedMachineId(entry.requestedName)||seen.has(entry.machineId)||protectedSet.has(entry.machineId))throw new Error('FINANCIAL_ID_COLLISION');
  if(entry.available!==false||entry.launch!==null||entry.status!=='historical-request')throw new Error('HISTORICAL_ENTRY_EXPOSED_AS_PLAYABLE');
  seen.add(entry.machineId);
 });
 return {entries:seen.size,existingCatalogPreserved:snapshot.catalog.length};
}

function verifiedSource(source) {
 if(!source||source.verified!==true||!source.provider||!source.officialTitle||!source.officialGameName||!SHA256.test(source.evidenceSha256||''))return false;
 try {
  const page=new URL(source.officialPage),demo=new URL(source.officialDemo);
  if(page.protocol!=='https:'||demo.protocol!=='https:'||page.username||page.password||demo.username||demo.password)return false;
  if(source.provider==='SmartSoft'){
   if(page.hostname!=='www.smartsoftgaming.com'||demo.hostname!=='eu-server.ssgportal.com')return false;
   if(demo.searchParams.get('GameName')!==source.officialGameName||!['DEMO','DEMO_EXH'].includes(demo.searchParams.get('Token')))return false;
  }else if(source.provider==='Pragmatic Play'){
   if(!['pragmaticplay.com','www.pragmaticplay.com'].includes(page.hostname))return false;
   if(!(demo.hostname==='pragmaticplay.net'||demo.hostname.endsWith('.pragmaticplay.net')))return false;
   if(demo.searchParams.get('gameSymbol')!==source.officialGameName)return false;
  }else return false;
  return true;
 } catch { return false; }
}

// This gates a real playable machine, not a provider-demo link or a renamed old game.
// A complete reference alone cannot open a wagering route.
export function readiness(entry) {
 const issues=[];
 if(!verifiedSource(entry.reference))issues.push('OFFICIAL_REFERENCE_NOT_VERIFIED');
 if(entry.engine?.verified!==true||entry.engine?.machineId!==entry.machineId||!SHA256.test(entry.engine?.artifactSha256||''))issues.push('SEPARATE_ENGINE_NOT_VERIFIED');
 if(entry.presentation?.verified!==true||entry.presentation?.machineId!==entry.machineId||!SHA256.test(entry.presentation?.artifactSha256||''))issues.push('SEPARATE_PRESENTATION_NOT_VERIFIED');
 if(entry.wallet?.verified!==true||entry.wallet?.financialGameId!==entry.machineId||entry.wallet?.aliasesExistingGame!==false||entry.wallet?.settlementAuthority!=='existing-ledger')issues.push('WALLET_IDENTITY_NOT_VERIFIED');
 if(entry.verification?.browserPassed!==true||entry.verification?.settlementPassed!==true||entry.verification?.existingGamesPreserved!==true)issues.push('INTEGRATED_VERIFICATION_NOT_PASSED');
 return {ready:issues.length===0,issues};
}

export function validateSelection(manifest,historical,snapshot,latestQueue=null) {
 const pending=manifest.pendingSelection??0;
 const target=latestQueue?latestQueue.names.length+1:ACTIVE_SELECTION_COUNT;
 if(manifest.scope!=='active-selection'||!Number.isInteger(pending)||pending<0||manifest.count+pending!==target||manifest.entries.length!==manifest.count)throw new Error('ACTIVE_SELECTION_COUNT_MISMATCH');
 const originals=new Map(historical.entries.map(entry=>[entry.requestedName,entry]));
 const protectedSet=protectedIds(snapshot),seen=new Set();
 for(const entry of manifest.entries){
  const latest=entry.requestSource==='latest-requested-queue.json';
  const requested=originals.get(entry.requestedName);
  if(latest){
   if(!latestQueue||latestQueue.names[entry.requestOrdinal-1]!==entry.requestedName||entry.machineId!==reservedMachineId(entry.requestedName))throw new Error('SELECTION_NOT_FROM_LATEST_REQUEST');
  }else if(!requested||entry.requestOrdinal!==requested.requestOrdinal||entry.machineId!==requested.machineId)throw new Error('SELECTION_NOT_FROM_HISTORICAL_REQUEST');
  if(protectedSet.has(entry.machineId)||seen.has(entry.machineId))throw new Error('SELECTION_ID_COLLISION');
  if(entry.reference?.verified!==false&&!verifiedSource(entry.reference))throw new Error('SELECTION_REFERENCE_NOT_VERIFIED');
  if(typeof entry.available!=='boolean')throw new Error('AVAILABILITY_MUST_BE_EXPLICIT');
  const state=readiness(entry);
  if(entry.available===true&&!state.ready)throw new Error('UNVERIFIED_MACHINE_MARKED_PLAYABLE');
  if(entry.available!==true&&entry.launch!==null)throw new Error('UNREADY_MACHINE_HAS_LAUNCH');
  if(entry.available===true&&entry.launch!=='/games/'+entry.machineId)throw new Error('LAUNCH_IDENTITY_MISMATCH');
  seen.add(entry.machineId);
 }
 if(latestQueue&&(manifest.entries[0].requestedName!==latestQueue.currentGame||manifest.entries.slice(1).some((e,i)=>e.requestedName!==latestQueue.names[i])))throw new Error('LATEST_QUEUE_ORDER_CHANGED');
 return {selected:seen.size,ready:manifest.entries.filter(entry=>readiness(entry).ready).length,playable:manifest.entries.filter(entry=>entry.available===true).length};
}

// The user's release order is serial: finish and verify one live deployment
// before starting another. Queue entries do not create routes or start builds.
export function validateSequentialExecution(manifest) {
 const policy=manifest.execution;
 if(policy?.mode!=='sequential'||policy.maxInProgress!==1||policy.advanceAfter!=='verified-live-deployment')throw new Error('SEQUENTIAL_EXECUTION_REQUIRED');
 const active=manifest.entries.filter(entry=>entry.status==='in-progress');
 if(active.length>1)throw new Error('ONLY_ONE_GAME_MAY_BE_IN_PROGRESS');
 if((active[0]?.machineId??null)!==policy.activeMachineId)throw new Error('ACTIVE_GAME_MISMATCH');
 if(policy.publicationLimit!==undefined){
  if(!Number.isInteger(policy.publicationLimit)||policy.publicationLimit<1)throw new Error('INVALID_PUBLICATION_LIMIT');
  if(manifest.entries.filter(e=>e.status==='published').length>policy.publicationLimit||manifest.entries.findIndex(e=>e.status==='in-progress')>=policy.publicationLimit)throw new Error('PUBLICATION_LIMIT_REACHED');
 }
 let incompleteSeen=false;
 for(const entry of manifest.entries){
  if(!['queued','in-progress','published'].includes(entry.status))throw new Error('INVALID_SEQUENTIAL_STATUS');
  if(entry.status==='published'){
   if(incompleteSeen||!entry.available||!readiness(entry).ready||entry.deployment?.verified!==true||!entry.deployment?.version)throw new Error('PUBLISHED_GAME_NOT_VERIFIED');
  }else{
   if(entry.status==='in-progress'&&incompleteSeen)throw new Error('EARLIER_GAME_MUST_BE_PUBLISHED_FIRST');
   incompleteSeen=true;
   if(entry.available||entry.launch!==null)throw new Error('UNPUBLISHED_GAME_EXPOSED');
  }
 }
 return {mode:policy.mode,active:policy.activeMachineId,published:manifest.entries.filter(e=>e.status==='published').length,queued:manifest.entries.filter(e=>e.status==='queued').length};
}

// The latest instruction replaces the sequential queue with one complete batch.
// JetX was already being released and is explicitly outside that batch.
export function validateBatchExecution(manifest) {
 const policy=manifest.execution,ids=policy?.batchMachineIds;
 if(policy?.mode!=='batch'||policy.publishTogether!==true||policy.currentGameOutsideBatch!==true||policy.batchSize!==25||!Array.isArray(ids)||ids.length!==25||new Set(ids).size!==25)throw new Error('COMPLETE_BATCH_REQUIRED');
 const current=manifest.entries[0],batch=manifest.entries.slice(1);
 if(current?.requestedName!=='JetX'||batch.length!==25||batch.some((entry,i)=>entry.machineId!==ids[i])||ids.includes(current.machineId))throw new Error('BATCH_IDENTITY_MISMATCH');
 if((current.status==='in-progress'?current.machineId:null)!==policy.activeMachineId)throw new Error('ACTIVE_GAME_MISMATCH');
 const published=batch.filter(entry=>entry.status==='published');
 if(published.length!==0&&published.length!==25)throw new Error('PARTIAL_BATCH_PUBLICATION');
 for(const entry of manifest.entries){
  if(!['queued','in-progress','ready','published'].includes(entry.status))throw new Error('INVALID_BATCH_STATUS');
  if(entry.status==='published'){
   if(!entry.available||!readiness(entry).ready||entry.deployment?.verified!==true||!entry.deployment?.version)throw new Error('PUBLISHED_GAME_NOT_VERIFIED');
  }else if(entry.available||entry.launch!==null)throw new Error('UNPUBLISHED_GAME_EXPOSED');
  if(entry.status==='ready'&&!readiness(entry).ready)throw new Error('READY_GAME_NOT_VERIFIED');
 }
 if(published.length&&new Set(published.map(entry=>entry.deployment.version)).size!==1)throw new Error('BATCH_DEPLOYMENT_MISMATCH');
 return {mode:'batch',active:policy.activeMachineId,batchSize:25,published:manifest.entries.filter(e=>e.status==='published').length,queued:manifest.entries.filter(e=>e.status==='queued').length};
}

export const validateExecution=manifest=>manifest.execution?.mode==='batch'?validateBatchExecution(manifest):validateSequentialExecution(manifest);
