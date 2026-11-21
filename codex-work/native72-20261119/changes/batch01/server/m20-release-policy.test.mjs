import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
import {createM20ReleasePolicy,M20_GAME_ID,M20_RELEASE,M20_ARTIFACT_SHA256,M20_MATH_SHA256,
  EVIDENCE_KINDS,releaseSha256,sourceSnapshotSha256} from './m20-release-policy.mjs';
import {createReleaseTestFixture} from './m20-release-test-fixture.mjs';
import {createNative72Batch01Binding} from './railway-binding.mjs';
import {requireApprovedProfile,asETB} from './official-math.mjs';
import {buildRailwayPackage,loadFrozenR2,retainedBaseline} from './railway-release/build.mjs';
const burn='fresh_multihot5burnwilds',activate=f=>createM20ReleasePolicy({...f.inputs,registry:f.registry});

test('reviewed and byte-pinned policy promotes only an M20 copy without editing candidate math',async()=>{
  const f=await createReleaseTestFixture(),candidate=f.registry.profileForGame(M20_GAME_ID),policy=activate(f);
  assert.equal(policy.release,M20_RELEASE);assert.equal(policy.enabled(M20_GAME_ID),true);assert.equal(policy.enabled(burn),false);
  const active=policy.profileForGame(M20_GAME_ID);assert.equal(requireApprovedProfile(active),active);
  assert.equal(active.mathSha256,M20_MATH_SHA256);assert.equal(active.providerRngReproduced,false);assert.equal(active.providerCertified,false);
  assert.deepEqual(active.reelStrips,candidate.reelStrips);assert.deepEqual(active.wheelWeights,candidate.wheelWeights);
  assert.equal(candidate.productionApproved,false);assert.equal(candidate.probabilityModelAudited,false);
  assert.equal(policy.profileForGame(burn),f.registry.profileForGame(burn));assert.equal(policy.profileForGame(burn).productionApproved,false);
  assert.equal(releaseSha256(f.inputs.sourceBytes['server/independent-operator-audit.json']),M20_ARTIFACT_SHA256);
  assert.throws(()=>{active.reelStrips[0][0]='wild'},TypeError);
  f.record.decision='PENDING';assert.equal(active.productionApproved,true,'validated policy snapshots cannot change during a round');
});
test('a pending release record cannot activate either game',async()=>{
  const f=await createReleaseTestFixture(),draft=JSON.parse(await readFile(new URL('./m20-release-acceptance.json',import.meta.url)));
  draft.decision='PENDING';f.inputs.recordBytes=Buffer.from(JSON.stringify(draft));
  f.inputs.expectedRecordSha256=releaseSha256(f.inputs.recordBytes);
  assert.throws(()=>activate(f),/M20_RELEASE_ACCEPTANCE_PENDING/);
});
test('record, raw report, normalized evidence and source corruption all reject before approval',async()=>{
  for(const mutate of [
    f=>f.inputs.recordBytes=Buffer.concat([f.inputs.recordBytes,Buffer.from(' ')]),
    f=>f.inputs.evidenceBytes.unit=Buffer.from('{}'),
    f=>f.inputs.rawEvidenceBytes.browser=Buffer.from('wrong report'),
    f=>f.inputs.sourceBytes['multihot20/controller.mjs']=Buffer.from('changed source')]){
    const f=await createReleaseTestFixture();mutate(f);assert.throws(()=>activate(f),/M20_RELEASE_(RECORD_HASH|EVIDENCE_HASH|SOURCE_DRIFT)/);
  }
});
test('repinned record cannot broaden games, change model identity or imply provider certification',async()=>{
  for(const edit of [r=>r.enabledGames.push(burn),r=>r.gameId=burn,r=>r.mathSha256='0'.repeat(64),
    r=>r.artifactSha256='0'.repeat(64),r=>r.evaluatorSha256='0'.repeat(64),r=>r.providerCertified=true,
    r=>r.providerRngReproduced=true,r=>r.sourceCommit=null,r=>r.acceptedBy=null]){
    const f=await createReleaseTestFixture();edit(f.record);f.repinRecord();assert.throws(()=>activate(f),/M20_RELEASE_RECORD_INVALID/);
  }
});
test('every required source is pinned and an old report cannot approve newly revised source',async()=>{
  const f=await createReleaseTestFixture();delete f.record.sources['multihot20/session.mjs'];
  f.record.sourceSha256=sourceSnapshotSha256(f.record.sources);f.repinRecord();
  assert.throws(()=>activate(f),/SOURCE_MANIFEST_INCOMPLETE/);
  const changed=await createReleaseTestFixture();changed.inputs.sourceBytes['multihot20/controller.mjs']=Buffer.from('new controller');
  changed.record.sources['multihot20/controller.mjs']=releaseSha256(changed.inputs.sourceBytes['multihot20/controller.mjs']);
  changed.record.sourceSha256=sourceSnapshotSha256(changed.record.sources);changed.repinRecord();
  assert.throws(()=>activate(changed),/EVIDENCE_INCOMPLETE_unit/);
});
for(const kind of EVIDENCE_KINDS){
  test('missing or incomplete '+kind+' evidence cannot approve M20',async()=>{
    const f=await createReleaseTestFixture();delete f.inputs.evidenceBytes[kind];
    assert.throws(()=>activate(f),new RegExp('EVIDENCE_HASH_MISMATCH_'+kind));
    const incomplete=await createReleaseTestFixture();const key=Object.keys(incomplete.reports[kind].checks)[0];
    incomplete.reports[kind].checks[key]=false;incomplete.repinEvidence(kind);
    assert.throws(()=>activate(incomplete),new RegExp('EVIDENCE_INCOMPLETE_'+kind));
  });
}
test('failed, skipped or wrong-snapshot test evidence stays closed even after repinning',async()=>{
  for(const [kind,edit,pattern] of [
    ['unit',e=>e.tests.failed=1,/TESTS_NOT_PASSED/],['real-postgres',e=>e.tests.skipped=1,/TESTS_NOT_PASSED/],
    ['unit',e=>e.sourceCommit='0'.repeat(40),/EVIDENCE_INCOMPLETE/],
    ['real-postgres',e=>e.database='MockPostgreSQL',/POSTGRES_SCOPE_INVALID/],
    ['browser',e=>e.viewports=e.viewports.filter(v=>v.width<1200),/BROWSER_SCOPE_INVALID/],
    ['source',e=>e.newDatabases=1,/SOURCE_SCOPE_INVALID/],
    ['operator-policy',e=>e.gamble.takeWinAddsCredit=true,/OPERATOR_POLICY_INVALID/]]){
    const f=await createReleaseTestFixture();edit(f.reports[kind]);f.repinEvidence(kind);assert.throws(()=>activate(f),pattern);
  }
});

test('browser acceptance requires all thirteen original media files and rejects old or incomplete counts',async()=>{
  const accepted=await createReleaseTestFixture();
  assert.equal(accepted.reports.browser.mediaVerified,13);
  assert.equal(Object.keys(JSON.parse(accepted.inputs.sourceBytes['multihot20/assets.json']).files).length,13);
  assert.equal(activate(accepted).enabled(M20_GAME_ID),true);
  for(const count of [11,19,12,14,0,'13',null,undefined]){
    const f=await createReleaseTestFixture();f.reports.browser.mediaVerified=count;f.repinEvidence('browser');
    assert.throws(()=>activate(f),/M20_RELEASE_BROWSER_SCOPE_INVALID/);
    assert.equal(f.registry.profileForGame(M20_GAME_ID).productionApproved,false);
  }
});

test('repinned thirteen-file browser evidence cannot approve missing WIN sheets or a malformed source media inventory',async()=>{
  for(const edit of [
    m=>{m.files['unreviewed-atlas.png']=m.files['atlas-0.png'];delete m.files['atlas-0.png']},
    m=>{delete m.files['wins.png']},
    m=>{delete m.files['wins2.png']},
    m=>{delete m.files['wins.png'];delete m.files['wins2.png']},
    m=>{m.files['unreviewed-wins.png']=m.files['wins2.png'];delete m.files['wins2.png']},
    m=>{delete m.files['win.mp3']},
    m=>{m.files['extra.mp3']={...m.files['win.mp3']}},
    m=>{m.gameId='fresh_multihot5burnwilds'},
    m=>{m.schema='unreviewed-manifest'},
    m=>{m.files['atlas-0.png'].sha256='invalid'},
    m=>{m.files['atlas-0.png'].bytes=0},
    m=>{m.files['atlas-0.png'].contentType='audio/mpeg'},
    m=>{m.files['win.mp3']=null}
  ]){
    const f=await createReleaseTestFixture(),path='multihot20/assets.json';
    const media=JSON.parse(f.inputs.sourceBytes[path]);edit(media);
    f.inputs.sourceBytes[path]=Buffer.from(JSON.stringify(media));
    f.record.sources[path]=releaseSha256(f.inputs.sourceBytes[path]);
    f.record.sourceSha256=sourceSnapshotSha256(f.record.sources);
    for(const kind of EVIDENCE_KINDS){f.reports[kind].sourceSha256=f.record.sourceSha256;f.repinEvidence(kind)}
    assert.throws(()=>activate(f),/M20_RELEASE_MEDIA_MANIFEST_INVALID/);
    assert.equal(f.registry.profileForGame(M20_GAME_ID).productionApproved,false);
  }
});

// Isolated integer ledger, not PostgreSQL acceptance and never real funds.
function existingMemoryLedger(){
  const uid='release-policy-qa',house='release-policy-house',token='b'.repeat(64);
  const hash=s=>createHash('sha256').update(s).digest('hex'),guard=hash('fresh-account-session-v1\0'+uid+'\0'+token);
  const request=new Request('http://127.0.0.1/api/slots/spin',{headers:{cookie:'sw_session='+token}});
  let db={wallets:{[uid]:1000000n,[house]:1000000000n},rounds:new Map(),moves:[]},serial=Promise.resolve(),accepting=true;
  const original={id:'multi_hot_5_native',enabled:true};
  const source=[original,{id:'fresh_multihot10',betLevels:['0.20','1.00','2.00']},
    {id:M20_GAME_ID,freshReleaseReady:true},{id:burn,freshReleaseReady:true}];
  const transaction=fn=>{
    const work=serial.then(async()=>{
      const local=structuredClone(db),client={local,async query(sql,args){
        if(sql.startsWith('SELECT game_id FROM sw_native_library.rounds')||sql.startsWith('SELECT max_balance FROM sw_rebuild.account_limits')||
           sql.startsWith('SELECT r.round_id,r.result_json,r.created_at,r.total_win')||sql.startsWith('SELECT 1 FROM sw_nine.actions'))return{rows:[],rowCount:0};
        if(sql.startsWith('SELECT request_hash,result_json FROM sw_nine.game_rounds')){
          const row=local.rounds.get(args[0]+'|'+args[1]);return{rows:row?[row]:[],rowCount:row?1:0};
        }
        if(sql.startsWith('INSERT INTO sw_nine.game_rounds')){
          local.rounds.set(args[1]+'|'+args[7],{request_hash:args[8],result_json:JSON.parse(args[9])});return{rows:[],rowCount:1};
        }
        if(sql.startsWith('INSERT INTO sw_rebuild.rounds'))return{rows:[],rowCount:1};
        throw Error('UNEXPECTED_TEST_SQL:'+sql);
      }};
      const result=await fn(client);db=local;return result;
    });serial=work.catch(()=>{});return work;
  };
  const existing={authenticate:async req=>{assert.equal(req.headers.get('cookie'),'sw_session='+token);return uid},
    hash,cash:asETB,publicGames:()=>source,accepting:()=>accepting,transaction,
    lockWallets:async client=>Object.entries(client.local.wallets).map(([id,balance])=>({id,balance})),
    balance:async(client,id)=>client.local.wallets[id],houseFor:()=>house,
    move:async(client,user,roundId,gameId,kind,amount,from,to)=>{
      assert.equal(user,uid);assert.equal(gameId,M20_GAME_ID);assert.ok(client.local.wallets[from]>=amount);
      client.local.wallets[from]-=amount;client.local.wallets[to]+=amount;client.local.moves.push({kind,roundId,amount});
    }};
  return{existing,request,guard,original,db:()=>db,stop:()=>accepting=false};
}
test('accepted binding allows M20 through existing settlement, preserves replay and leaves Burn/global stop closed',async()=>{
  const f=await createReleaseTestFixture(),d=existingMemoryLedger();
  const b=await createNative72Batch01Binding(d.existing,{releaseAcceptance:f.inputs});
  assert.equal(b.publicGames()[0],d.original);assert.equal(b.releaseInfo().acceptanceSha256,f.inputs.expectedRecordSha256);
  const state=await b.state(d.request,M20_GAME_ID);assert.equal(state.game.enabled,true);
  assert.equal(state.game.providerCertified,false);assert.equal(state.game.providerRngReproduced,false);
  assert.equal((await b.state(d.request,burn)).game.enabled,false);
  const body={gameId:M20_GAME_ID,bet:'1.00',roundToken:randomUUID(),sessionGuard:d.guard,
    ...Object.fromEntries(['mathVersion','engineVersion','mathSha256'].map(k=>[k,state.game[k]]))};
  const receipts=await Promise.all(Array.from({length:8},()=>b.spin(d.request,body)));
  assert.ok(receipts.every(r=>r.roundId===receipts[0].roundId));assert.equal(d.db().rounds.size,1);
  assert.equal(d.db().moves.filter(m=>m.kind==='BET').length,1);
  const total=Object.values(d.db().wallets).reduce((s,v)=>s+v,0n);assert.equal(total,1001000000n);
  d.stop();assert.equal((await b.state(d.request,M20_GAME_ID)).game.enabled,false);
  await assert.rejects(b.spin(d.request,{...body,roundToken:randomUUID()}),/SLOT_RELEASE_NOT_ENABLED/);
  const replay=await b.spin(d.request,{...body,replayOnly:true});assert.equal(replay.roundId,receipts[0].roundId);
  await assert.rejects(b.spin(d.request,{...body,gameId:burn,roundToken:randomUUID(),
    ...Object.fromEntries(['mathVersion','engineVersion','mathSha256'].map(k=>[k,f.registry.profileForGame(burn)[k]]))}),/UNCERTIFIED_MATH_PROFILE/);
  assert.equal(d.db().moves.filter(m=>m.kind==='BET').length,1);
});
test('default builder reproduces exact frozen r2 and rejects pending r3 without writing a package',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'zplay-release-policy-'));
  try{
    const frozen=await loadFrozenR2(),baseline=join(temp,'baseline.mjs');await writeFile(baseline,retainedBaseline(frozen.runtime));
    const report=await buildRailwayPackage({baselinePath:baseline,outDir:join(temp,'r2')});
    assert.equal(releaseSha256(await readFile(join(temp,'r2/function.tsx'))),frozen.report.wrapperSha256);
    assert.equal(report.realMoneyEnabled,false);assert.equal(report.retainedRuntimeExact,true);
    const pending=JSON.parse(await readFile(new URL('./m20-release-acceptance.json',import.meta.url)));pending.decision='PENDING';
    await writeFile(join(temp,'pending.json'),JSON.stringify(pending));
    await assert.rejects(buildRailwayPackage({baselinePath:baseline,outDir:join(temp,'r3'),
      acceptancePath:join(temp,'pending.json'),evidenceDir:temp}),/M20_RELEASE_ACCEPTANCE_PENDING/);
    await assert.rejects(readFile(join(temp,'r3/function.tsx')),e=>e.code==='ENOENT');
  }finally{await rm(temp,{recursive:true,force:true})}
});
test('future r3 packs the reviewed source/evidence and validates its actual executable helpers at startup',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'zplay-r3-test-only-'));
  try{
    const f=await createReleaseTestFixture(),frozen=await loadFrozenR2(),baseline=join(temp,'r2-runtime.mjs');
    // A reviewer may pin extra test source as evidence. It is retained as a
    // snapshot without making that test fixture an executable runtime helper.
    const extra='server/m20-release-test-fixture.mjs';
    f.inputs.sourceBytes[extra]=await readFile(new URL('./m20-release-test-fixture.mjs',import.meta.url));
    f.record.sources[extra]=releaseSha256(f.inputs.sourceBytes[extra]);
    f.record.sourceSha256=sourceSnapshotSha256(f.record.sources);
    for(const kind of EVIDENCE_KINDS){f.reports[kind].sourceSha256=f.record.sourceSha256;f.repinEvidence(kind)}
    await writeFile(baseline,frozen.runtime);await writeFile(join(temp,'acceptance.json'),f.inputs.recordBytes);
    for(const kind of EVIDENCE_KINDS){await writeFile(join(temp,kind+'.json'),f.inputs.evidenceBytes[kind]);await writeFile(join(temp,kind+'.raw'),f.inputs.rawEvidenceBytes[kind])}
    const report=await buildRailwayPackage({baselinePath:baseline,outDir:join(temp,'r3'),acceptancePath:join(temp,'acceptance.json'),evidenceDir:temp});
    assert.deepEqual(report.enabledGamesOnDeployment,[M20_GAME_ID]);assert.equal(report.productionChangesPerformed,false);
    assert.equal(report.m20ApprovalPackaged,true);assert.equal(report.globalAcceptingGatePreserved,true);
    assert.equal(report.deployed,false);assert.equal(report.retainedRuntimeExact,true);
    const wrapper=await readFile(join(temp,'r3/function.tsx'),'utf8');
    const encoded=wrapper.match(/brotliDecompressSync\(Buffer\.from\('([A-Za-z0-9+/=]+)','base64'\)\)/)[1];
    const files=JSON.parse(brotliDecompressSync(Buffer.from(encoded,'base64')));
    for(const file of files){assert.equal(releaseSha256(file.source),file.sha256);await mkdir(join(temp,'unpacked',file.path.split('/').slice(0,-1).join('/')),{recursive:true});await writeFile(join(temp,'unpacked',file.path),file.source)}
    // Import only the new binding entry: never boot the full retained service.
    const entry=await import(pathToFileURL(join(temp,'unpacked/native72-batch01/m20-release-entry.mjs')).href);
    const d=existingMemoryLedger(),binding=await entry.createNative72Batch01Binding(d.existing);
    assert.equal((await binding.state(d.request,M20_GAME_ID)).game.enabled,true);
    assert.equal((await binding.state(d.request,burn)).game.enabled,false);
    const policyModule=await import(pathToFileURL(join(temp,'unpacked/native72-batch01/m20-release-policy.mjs')).href);
    await writeFile(join(temp,'unpacked/native72-batch01/existing-gamble.mjs'),'// altered executable');
    const drift=await policyModule.loadM20ReleaseInputs(pathToFileURL(join(temp,'unpacked/native72-batch01/m20-release-inputs.json')),f.inputs.expectedRecordSha256);
    assert.throws(()=>policyModule.createM20ReleasePolicy({...drift,registry:f.registry}),/SOURCE_DRIFT_server\/existing-gamble.mjs/);
  }finally{await rm(temp,{recursive:true,force:true})}
});
