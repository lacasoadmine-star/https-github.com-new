import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseRequestedNames,reservedMachineId,readiness,validateHistoricalManifest,validateSelection,validateSequentialExecution,validateBatchExecution,hash} from './catalog.mjs';
const read=async name=>JSON.parse(await readFile(new URL(name,import.meta.url),'utf8'));
const raw=await readFile(new URL('requested-names.txt',import.meta.url));
const names=parseRequestedNames(raw.toString()),historical=await read('historical-request.json'),existing=await read('existing-identities.json');
const digest='a'.repeat(64);
const fixture=name=>{
 const original=historical.entries.find(entry=>entry.requestedName===name);
 return {...original,status:'reference-verified',reference:{provider:'SmartSoft',officialTitle:name,officialGameName:name,officialPage:'https://www.smartsoftgaming.com/games/fixture',officialDemo:'https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameName='+name+'&Token=DEMO',evidenceSha256:digest,verified:true}};
};
const selected=()=>({scope:'active-selection',count:20,entries:names.slice(0,20).map(fixture)});
const completed=entry=>({...entry,available:true,launch:'/games/'+entry.machineId,engine:{verified:true,machineId:entry.machineId,artifactSha256:digest},presentation:{verified:true,machineId:entry.machineId,artifactSha256:digest},wallet:{verified:true,financialGameId:entry.machineId,aliasesExistingGame:false,settlementAuthority:'existing-ledger'},verification:{browserPassed:true,settlementPassed:true,existingGamesPreserved:true}});

test('all398 exact requested names preserve order, punctuation, unicode and uncorrected spelling',()=>{
 assert.equal(names.length,398);assert.equal(new Set(names).size,398);
 assert.deepEqual(names.slice(0,20),['JetX','PlinkoX','Balloon','CricketCrash','Cappadocia','TowerX','SpinX','FootballX','Moonstone','BurningIce40','MagicGarden','CaribbeanHoldem','Baccarat','EuropeanRoulette','Blackjack','BookOfMagic','DarkHorus','Samurai','VegasNights','Assassins']);
 assert.equal(names[49],'ExtraJuciy');assert.equal(names[106],'Motörhead');assert.equal(names[131],'TopDawg$');assert.equal(names[259],'ExtraJuciyMegaways');assert.equal(names.at(-1),'FunkyTime');
 assert.equal(historical.requestedNamesSha256,hash(raw));assert.deepEqual(historical.entries.map(e=>e.requestedName),names);
});
test('repeated requests and normalized financial-ID collisions fail instead of dropping a game silently',()=>{
 assert.throws(()=>parseRequestedNames('JetX\nJetX\n'),/DUPLICATE_REQUEST_NAME/);
 assert.throws(()=>parseRequestedNames('Motörhead\nMotorhead\n'),/NORMALIZED_ID_COLLISION/);
 assert.throws(()=>parseRequestedNames('JetX\nJetX \n'),/UNEXPECTED_NAME_WHITESPACE/);
});
test('all59 current catalogue identities are protected; requested PlinkoX receives a distinct ID',()=>{
 assert.equal(existing.catalog.length,59);assert.deepEqual(validateHistoricalManifest(historical,names,existing),{entries:398,existingCatalogPreserved:59});
 const plinko=historical.entries.find(e=>e.requestedName==='PlinkoX');assert.equal(plinko.machineId,'plinkox_native');assert.equal(plinko.existingIdentityMatches[0].id,'plinko');
 assert.equal(reservedMachineId('Motörhead'),'motorhead_native');assert.equal(reservedMachineId('TopDawg$'),'topdawg_dollar_native');
 assert.ok(!historical.entries.some(e=>['foxy_hot_20_native','multi_hot_5_native'].includes(e.machineId)));
});
test('historical request entries cannot accidentally become playable cards',()=>{
 const changed=structuredClone(historical);changed.entries[0].available=true;
 assert.throws(()=>validateHistoricalManifest(changed,names,existing),/HISTORICAL_ENTRY_EXPOSED_AS_PLAYABLE/);
 const renamed=structuredClone(historical);renamed.entries[49].requestedName='ExtraJuicy';
 assert.throws(()=>validateHistoricalManifest(renamed,names,existing),/REQUEST_ORDER_OR_SPELLING_CHANGED/);
});
test('active selection requires exactly20 verified references from the original request',()=>{
 assert.deepEqual(validateSelection(selected(),historical,existing),{selected:20,ready:0,playable:0});
 const short=selected();short.entries.pop();assert.throws(()=>validateSelection(short,historical,existing),/ACTIVE_SELECTION_COUNT_MISMATCH/);
 const unrelated=selected();unrelated.entries[0].requestedName='MultiHot5';assert.throws(()=>validateSelection(unrelated,historical,existing),/SELECTION_NOT_FROM_HISTORICAL_REQUEST/);
});
test('an official demo reference alone does not authorize a playable wallet machine',()=>{
 const entry=fixture('JetX');assert.deepEqual(readiness(entry),{ready:false,issues:['SEPARATE_ENGINE_NOT_VERIFIED','SEPARATE_PRESENTATION_NOT_VERIFIED','WALLET_IDENTITY_NOT_VERIFIED','INTEGRATED_VERIFICATION_NOT_PASSED']});
 const exposed=selected();exposed.entries[0].available=true;exposed.entries[0].launch='/games/jetx_native';assert.throws(()=>validateSelection(exposed,historical,existing),/UNVERIFIED_MACHINE_MARKED_PLAYABLE/);
});
test('cross-game wallet aliases and external settlement authorities fail readiness',()=>{
 const entry=completed(fixture('PlinkoX'));assert.equal(readiness(entry).ready,true);
 entry.wallet.financialGameId='plinko';entry.wallet.aliasesExistingGame=true;assert.deepEqual(readiness(entry).issues,['WALLET_IDENTITY_NOT_VERIFIED']);
 entry.wallet.financialGameId=entry.machineId;entry.wallet.aliasesExistingGame=false;entry.wallet.settlementAuthority='public-demo-provider';assert.deepEqual(readiness(entry).issues,['WALLET_IDENTITY_NOT_VERIFIED']);
});
test('presentation identity and route must remain attached to the new financial machine',()=>{
 const one=selected();one.entries[0]=completed(one.entries[0]);one.entries[0].launch='/games/plinko';assert.throws(()=>validateSelection(one,historical,existing),/LAUNCH_IDENTITY_MISMATCH/);
 const entry=completed(fixture('JetX'));entry.presentation.machineId='plinko';assert.deepEqual(readiness(entry).issues,['SEPARATE_PRESENTATION_NOT_VERIFIED']);
});
test('private tokens, unsafe URLs and wrong launcher identities cannot pass source verification',()=>{
 for(const mutate of [r=>r.officialDemo=r.officialDemo.replace('Token=DEMO','Token=account-secret'),r=>r.officialPage='http://www.smartsoftgaming.com/games/jetx',r=>r.officialPage='https://unverified.example/jetx',r=>r.officialDemo=r.officialDemo.replace('GameName=JetX','GameName=Balloon'),r=>r.evidenceSha256='not-a-hash']){
  const entry=completed(fixture('JetX'));mutate(entry.reference);assert.ok(readiness(entry).issues.includes('OFFICIAL_REFERENCE_NOT_VERIFIED'));
 }
});
test('all readiness gates must pass and the availability flag must be explicit',()=>{
 const active=selected();active.entries=active.entries.map(completed);assert.deepEqual(validateSelection(active,historical,existing),{selected:20,ready:20,playable:20});
 active.entries[0].verification.existingGamesPreserved=false;assert.throws(()=>validateSelection(active,historical,existing),/UNVERIFIED_MACHINE_MARKED_PLAYABLE/);
 const missing=selected();delete missing.entries[0].available;assert.throws(()=>validateSelection(missing,historical,existing),/AVAILABILITY_MUST_BE_EXPLICIT/);
});

test('latest instruction keeps JetX outside the complete25-game batch',async()=>{
 const queue=await read('active-selection.json');
 const latest=await read('latest-requested-queue.json');
 assert.equal(queue.entries[0].requestedName,'JetX');assert.deepEqual(queue.entries.slice(1).map(e=>e.requestedName),latest.names);
 assert.equal(queue.pendingSelection,0);
 const result=validateSelection(queue,historical,existing,latest);assert.equal(result.selected,26);assert.equal(result.playable,queue.entries.filter(e=>e.available).length);
 const execution=validateBatchExecution(queue);assert.equal(execution.batchSize,25);assert.equal(execution.queued,25);
});

test('the older sequential policy still prevents advancing past an unfinished game',()=>{
 const queue={entries:names.slice(0,3).map(name=>({...fixture(name),status:'queued'})),execution:{mode:'sequential',activeMachineId:'jetx_native',maxInProgress:1,advanceAfter:'verified-live-deployment'}};
 queue.entries[0].status='in-progress';
 queue.entries[1].status='in-progress';
 assert.throws(()=>validateSequentialExecution(queue),/ONLY_ONE_GAME_MAY_BE_IN_PROGRESS/);
 queue.entries[0].status='queued';queue.execution.activeMachineId=queue.entries[1].machineId;
 assert.throws(()=>validateSequentialExecution(queue),/EARLIER_GAME_MUST_BE_PUBLISHED_FIRST/);
 queue.entries[0].status='published';
 assert.throws(()=>validateSequentialExecution(queue),/PUBLISHED_GAME_NOT_VERIFIED/);
});

test('a batch cannot expose one game early or publish unverified games',async()=>{
 const queue=await read('active-selection.json');
 queue.entries[1].status='published';assert.throws(()=>validateBatchExecution(queue),/PARTIAL_BATCH_PUBLICATION/);
 for(const entry of queue.entries.slice(1))entry.status='published';
 assert.throws(()=>validateBatchExecution(queue),/PUBLISHED_GAME_NOT_VERIFIED/);
});

test('all25 batch identities and the common verified deployment must match',async()=>{
 const queue=await read('active-selection.json');
 queue.entries=queue.entries.map((entry,i)=>i?{...completed(entry),status:'published',deployment:{verified:true,version:'batch-v1'},reference:{...fixture('JetX').reference,officialTitle:entry.requestedName,officialGameName:entry.requestedName,officialDemo:'https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameName='+entry.requestedName+'&Token=DEMO'}}:entry);
 assert.equal(validateBatchExecution(queue).batchSize,25);
 queue.entries[1].deployment.version='different-version';assert.throws(()=>validateBatchExecution(queue),/BATCH_DEPLOYMENT_MISMATCH/);
 queue.execution.batchMachineIds.reverse();assert.throws(()=>validateBatchExecution(queue),/BATCH_IDENTITY_MISMATCH/);
});
