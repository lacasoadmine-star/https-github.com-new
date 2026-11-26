import {test} from 'node:test';
import assert from 'node:assert/strict';
import {controlEvidence} from '../tools/control-evidence.mjs';
const entry={id:'new-game',selectedName:'Official Game',officialIdentity:{url:'https://example.test/official-game',demoUrl:'https://example.test/demo?Token=DEMO'}};
const base={id:entry.id,selectedName:entry.selectedName,officialPage:entry.officialIdentity.url,demoUrl:entry.officialIdentity.demoUrl};
test('a blocked retry preserves earlier confirmed receipts without granting coverage',()=>{
 const result=controlEvidence(entry,[{...base,status:'observed-controls',confirmedRoundIds:['10.0','10.1','10.1']},{...base,status:'provider-table-limit',confirmedRoundIds:[]}]);
 assert.deepEqual(result.confirmedRoundIds,['10.1']);
 assert.equal(result.observations.length,2);
 assert.equal('ready' in result,false);
 assert.equal('featureCoverageComplete' in result,false);
});
test('control receipts cannot silently cross official identities',()=>{
 assert.throws(()=>controlEvidence(entry,[{...base,selectedName:'Different Game',confirmedRoundIds:['10.1']}]),/identity mismatch/);
 assert.throws(()=>controlEvidence(entry,[{...base,demoUrl:'https://example.test/other-demo',confirmedRoundIds:['10.1']}]),/identity mismatch/);
 assert.deepEqual(controlEvidence(entry,[{...base,id:'other-game',confirmedRoundIds:['10.1']}]).confirmedRoundIds,[]);
});
test('the exact published public demo may upgrade HTTP to HTTPS without changing identity',()=>{
 const published='http://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameName=Vampires&Token=DEMO';
 const game={...entry,officialIdentity:{...entry.officialIdentity,demoUrl:published}};
 const observed={...base,demoUrl:published.replace('http:','https:'),confirmedRoundIds:['12.1']};
 assert.deepEqual(controlEvidence(game,[observed]).confirmedRoundIds,['12.1']);
 assert.throws(()=>controlEvidence(game,[{...observed,demoUrl:observed.demoUrl.replace('Vampires','DifferentGame')}]),/identity mismatch/);
 assert.throws(()=>controlEvidence(game,[{...observed,demoUrl:observed.demoUrl.replace('Token=DEMO','Token=not-a-demo')}]),/identity mismatch/);
});
