import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {publicLibrary74Definitions} from '../server/existing-library74-adapter.mjs';
import {officialTitleSource} from '../math/official-title-modules.mjs';
import {EXISTING_WALLET_ROUTES} from '../client/existing-wallet-routes.mjs';

const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const write=(path,value)=>{const temporary=path+'.tmp-'+process.pid;fs.writeFileSync(temporary,value);fs.renameSync(temporary,path);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const scope=read('scope/current60-work-order.json'),progress=read('tests/evidence/official-demo-progress.json');
const coverage=read('reports/current60-engineering-feature-coverage.json'),verification=read('reports/current60-code-verification.json');
const boundary=read('reports/current60-release-boundary.json'),built=read('reports/current60-build-report.json');
const publication=fs.existsSync('reports/current60-publication-status.json')?read('reports/current60-publication-status.json'):null;
const candidateRelease=Object.keys(built.modules).find(name=>/^independent74-entry-r\d+\.mjs$/.test(name))?.match(/-(r\d+)\.mjs$/)?.[1];
if(!candidateRelease)throw Error('Generated release identity required.');
const native=read('server/artifacts/native60-five-rounds.json'),demo=read('server/artifacts/demo60-five-rounds.json');
const definitions=publicLibrary74Definitions().filter(game=>!Object.hasOwn(EXISTING_WALLET_ROUTES,game.id));
if(definitions.length!==60||scope.groups.flatMap(group=>group.games).length!==60)throw Error('Exact60 scope required.');
const changedCode=verification.codeInputs.filter(input=>!fs.existsSync(input.path)||hash(fs.readFileSync(input.path))!==input.sha256).map(input=>input.path);
if(changedCode.length)throw Error('Completed test log does not describe current code: '+changedCode.join(','));

function fiveRoundProof(report,game){
 const row=report.games?.find(item=>item.id===game.id);
 const consistent=report.isolated===true&&report.productionDatabaseConnected===false&&report.realPlayerFundsUsed===false&&
  row?.modelVersion===game.version&&row.rounds?.length===5&&row.rounds.every((round,index)=>round.spin===index+1&&round.status==='settled'&&round.replayDebitedAgain===false&&
   BigInt(round.beforeMinor)-BigInt(round.debitMinor)+BigInt(round.payoutMinor)===BigInt(round.afterMinor)&&
   (index===0||row.rounds[index-1].afterMinor===round.beforeMinor));
 return {verified:consistent,completedRounds:consistent?5:0,modelVersion:row?.modelVersion??null,isolated:true,productionVerified:false};
}
const rows=[];
for(const group of scope.groups)for(const item of group.games){
 const game=definitions.find(g=>g.id===item.gameId),p=progress.games.find(g=>g.gameId===item.gameId),c=coverage.rows.find(g=>g.gameId===item.gameId);
 if(!game||!p||!c||typeof c.mathVersion!=='string'||game.version!=='library74-v1:'+c.mathVersion)throw Error('Current exact model coverage required: '+item.gameId);
 item.modelVersion=game.version;item.module=officialTitleSource(game.id);
 const retained=fiveRoundProof(native,game),free=fiveRoundProof(demo,game);
 if(!retained.verified||!free.verified)throw Error('Fresh same-model five-round proof missing: '+game.id);
 rows.push({order:item.order,batch:group.batch,gameId:game.id,name:game.name,modelVersion:game.version,module:item.module,
  officialPage:item.officialUrl,officialDemo:item.demoUrl,existingPlayUrl:item.existingPlayUrl,
  officialReference:{verifiedCompletedRounds:p.verifiedCompletedRounds,target:5,remaining:Math.max(0,5-p.verifiedCompletedRounds),targetMet:p.verifiedCompletedRounds>=5,evidenceFiles:p.evidenceFiles,historicalCountsPreserved:true},
  construction:{status:c.engineeringStatus,implemented:c.implemented,knownMissingPublicFeatures:c.knownMissingPublicFeatures,unverifiedInterpretations:c.unverifiedRuleInterpretations,complete:false},
  comparison:{geometry:c.geometry,fullArtworkAndSoundVerified:false,completeReferenceParityVerified:false,current60fpsMeasurement:false},
  money:{retainedLedgerFixture:retained,operatorDemoFixture:free,realPlayerWagers:0,productionWalletVerified:false,newLiveMoneyActionsEnabled:false,releaseReview:c.releaseReview,promotionalWalletLinked:false},
  tests:{sharedSuite:verification.suite,sourceFingerprint:verification.codeInputsSha256,perTitleProofTests:c.proofTests},
  deployment:{newCandidateActivated:false,existingDeploymentUnchanged:boundary.worker.existingDeploymentUnchanged===true,candidateRelease,existingPlayUrl:item.existingPlayUrl}});
}
write('scope/current60-work-order.json',JSON.stringify(scope,null,2)+'\n');
const priority=read('scope/current10-priority.json');
for(const item of priority.games){
 const row=rows.find(row=>row.gameId===item.gameId);
 if(!row)throw Error('Priority title absent from exact60 scope: '+item.gameId);
 item.officialDemoFiveRoundStatus=row.officialReference.targetMet?'verified-in-canonical-journal':'remaining-official-rounds-required';
 item.officialDemoVerifiedCompletedRounds=row.officialReference.verifiedCompletedRounds;
 item.officialDemoRemainingRounds=row.officialReference.remaining;
 item.officialDemoEvidenceSource='tests/evidence/official-demo-progress.json';
 item.modelVersion=row.modelVersion;item.implementationComplete=false;item.releaseVerified=false;
}
priority.statusUpdatedAt=new Date().toISOString();
write('scope/current10-priority.json',JSON.stringify(priority,null,2)+'\n');
const report={format:'current60-completion-evidence-v1',generatedAt:new Date().toISOString(),sourceBaseline:scope.sourceBaseline,website:scope.website,
 all60Complete:false,newReleaseActivated:false,newPlayerWagers:0,officialTargetPerTitle:5,
 officialEvidence:{actualCompletedAcrossThese60:rows.reduce((n,r)=>n+r.officialReference.verifiedCompletedRounds,0),titlesMeetingFive:rows.filter(r=>r.officialReference.targetMet).length,targetCredits:rows.reduce((n,r)=>n+Math.min(5,r.officialReference.verifiedCompletedRounds),0),targetTotal:300,remainingTargetRounds:rows.reduce((n,r)=>n+r.officialReference.remaining,0),historicalCountsPreserved:true},
 verification:{suite:verification.suite,codeInputsSha256:verification.codeInputsSha256,sourceMatchesCompletedSuite:true,retainedLedgerFixtureRounds:300,operatorDemoFixtureRounds:300,officialRoundsNotAddedToFixtureRounds:true},
 build:{candidate:candidateRelease,ownModules:built.modules,ownModuleBytes:built.ownModuleBytes,defaultAccountTransport:built.accountTransport,deploymentPerformed:false},
 originalInfrastructure:boundary,publicEvidenceAvailability:publication,rows};
write('reports/current60-status.json',JSON.stringify(report,null,2)+'\n');
let md='# Xaaladda dhismaha60-ka ciyaarood\n\n';
md+=`Koodhka hadda: **${verification.suite.pass} tijaabo gudubtay, ${verification.suite.fail} fashil**. Ciyaar kasta waxay leedahay5wareeg oo ledger tijaabo ah iyo5wareeg oo DEMO ah, model-keeda hadda;300+300wareeg guud ahaan. Kuwani ma aha wareegyo demo rasmi ah ama tijaabooyin lacag ciyaartoy.\n\n`;
md+=`Demo rasmi ah: **${report.officialEvidence.titlesMeetingFive}/60ciyaarood** ayaa haysta ugu yaraan5wareeg oo la xaqiijiyey, oo ay ku jiraan diiwaannadii hore. ${report.officialEvidence.targetCredits}/300ayaa ka buuxa bartilmaameedka hadda; ${report.officialEvidence.remainingTargetRounds}ayaa hadhay. Wareegyada taariikhiga ah ee ka badan5lama tirin si ay uga buuxiyaan ciyaar kale.\n\n`;
md+='Dhammaan60-ka weli ma dhammaan. Jadwalkani wuxuu kala caddeynayaa source-ka la dhisay, xaqiijinta tijaabada, iyo qaybaha tixraaca ee hadhay. '+candidateRelease+' waa candidate la dhisay; website-ka hadda ma adeegsanayo candidate-kaas. Faahfaahinta xannibaadda daabacaadda: `reports/current60-release-boundary.json`.\n\n';
if(publication?.publicEvidenceComplete===false)md+='Qaar ka mid ah sawirrada tixraaca waxay ku kaydsan yihiin goobta shaqada, balse daabacaaddooda dadweynaha ee GitHub wali lama oggolaan. Tirooyinka tijaabada waxay tilmaamayaan koodhka iyo caddaynta goobta shaqada; kaydka GitHub ma wato dhammaan sawirradaas. Eeg `reports/current60-publication-status.json`.\n\n';
md+='| # | Ciyaar | Wareeg rasmi ah | Ledger / DEMO tijaabo | Xaaladda dhismaha | Qaybaha hadhay | Live cusub |\n|---:|---|---:|---|---|---|---|\n';
const escape=value=>String(value).replaceAll('|','\\|').replaceAll('\n',' ');
for(const r of rows){const open=[...r.construction.knownMissingPublicFeatures,...r.construction.unverifiedInterpretations];md+=`| ${r.order} | ${escape(r.name)} | ${r.officialReference.verifiedCompletedRounds} / bartilmaameed5 | 5 / 5 · gudbay | ${r.construction.status} | ${escape(open.join('; ')||'Full artwork, sound and reference parity remain unverified.')} | Lama daabicin |\n`;}
md+='\nCiyaar kasta game ID-geeda, version-keeda, URL-keeda rasmiga ah iyo caddaynteeda waxay ku jiraan `current60-status.json`. Afarta hubin—demo rasmi ah, xisaabta fixture-ka, muuqaalka iyo deployment—isku mid ma aha. Lacag ciyaartoy laguma tijaabin; akoon/database/website cusub lama samayn.\n';
write('reports/current60-status.md',md);
console.log(JSON.stringify({games:rows.length,suite:verification.suite,officialEvidence:report.officialEvidence,candidateDeployed:false}));
